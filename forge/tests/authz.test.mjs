import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const workdir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startServer(port, stateDir) {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: workdir,
    env: { ...process.env, FORGE_PORT: String(port), FORGE_STATE_DIR: stateDir, FORGE_AUTH_REQUIRED: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (buf) => (output += String(buf)));
  child.stderr.on('data', (buf) => (output += String(buf)));
  const base = `http://127.0.0.1:${port}`;

  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try {
      const res = await fetch(`${base}/api/forge/health`);
      if (res.ok) return { child, base };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill();
  throw new Error(`Server did not become healthy: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}

function client(base) {
  let csrf = '';
  let cookie = '';
  async function init() {
    const html = await (await fetch(base + '/')).text();
    const match = html.match(/name="forge-csrf" content="([a-f0-9]+)"/);
    if (!match) throw new Error('Missing csrf');
    csrf = match[1];
  }
  async function request(method, route, body) {
    const headers = method === 'POST' ? { 'Content-Type': 'application/json', 'X-Forge-CSRF': csrf } : {};
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(base + route, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    let data = {};
    try {
      data = await res.json();
    } catch {}
    return { status: res.status, data };
  }
  return { init, request };
}

test('role-based access controls and cross-account mission isolation', async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'forge-authz-'));
  const port = await availablePort();
  let running;
  try {
    running = await startServer(port, stateDir);
    const base = running.base;

    const admin = client(base);
    await admin.init();
    assert.equal(
      (await admin.request('POST', '/api/forge/auth/register', { email: 'admin@forge.local', password: 'AdminPass-1234', role: 'ADMIN' })).status,
      201
    );
    assert.equal((await admin.request('POST', '/api/forge/auth/login', { email: 'admin@forge.local', password: 'AdminPass-1234' })).status, 200);

    assert.equal(
      (await admin.request('POST', '/api/forge/auth/register', { email: 'c1@forge.local', password: 'CustomerPass-1234', role: 'CUSTOMER' })).status,
      201
    );
    assert.equal(
      (await admin.request('POST', '/api/forge/auth/register', { email: 'c2@forge.local', password: 'CustomerPass-1234', role: 'CUSTOMER' })).status,
      201
    );
    assert.equal(
      (await admin.request('POST', '/api/forge/auth/register', { email: 'p1@forge.local', password: 'ParticipantPass-1234', role: 'PARTICIPANT' })).status,
      201
    );

    const customerA = client(base);
    await customerA.init();
    assert.equal(
      (await customerA.request('POST', '/api/forge/auth/login', { email: 'c1@forge.local', password: 'CustomerPass-1234' })).status,
      200
    );

    const customerB = client(base);
    await customerB.init();
    assert.equal(
      (await customerB.request('POST', '/api/forge/auth/login', { email: 'c2@forge.local', password: 'CustomerPass-1234' })).status,
      200
    );

    const participant = client(base);
    await participant.init();
    assert.equal(
      (await participant.request('POST', '/api/forge/auth/login', { email: 'p1@forge.local', password: 'ParticipantPass-1234' })).status,
      200
    );

    const missionCreate = await customerA.request('POST', '/api/forge/missions', {
      title: 'Prepare 12 product descriptions for ecommerce launch',
      description: 'Write and format twelve product descriptions from provided catalog notes.',
      buyer: 'Sample Buyer',
      city: 'Rutherford, NJ',
      category: 'Content & Copy',
      schedule: 'Flexible',
      skills: ['Copywriting'],
      priceUSD: 300,
    });
    assert.equal(missionCreate.status, 201);
    const missionId = missionCreate.data.mission.id;

    const participantMissionCreate = await participant.request('POST', '/api/forge/missions', {
      title: 'Should fail',
      description: 'Participant cannot create customer missions.',
      buyer: 'Nope',
      city: 'Rutherford, NJ',
      category: 'Content & Copy',
      schedule: 'Flexible',
      skills: ['Copywriting'],
      priceUSD: 100,
    });
    assert.equal(participantMissionCreate.status, 403);

    const participantWorker = await participant.request('POST', '/api/forge/workers', {
      name: 'Participant One',
      city: 'Rutherford, NJ',
      schedule: 'Flexible',
      skills: ['Copywriting'],
      minPayUSD: 75,
      age18Confirmed: true,
      remoteAvailable: true,
    });
    assert.equal(participantWorker.status, 201);

    const customerWorkerCreate = await customerA.request('POST', '/api/forge/workers', {
      name: 'Bad Worker',
      city: 'Rutherford, NJ',
      schedule: 'Flexible',
      skills: ['Copywriting'],
      minPayUSD: 70,
      age18Confirmed: true,
    });
    assert.equal(customerWorkerCreate.status, 403);

    const crossRead = await customerB.request('GET', `/api/forge/missions/${missionId}/analysis`);
    assert.equal(crossRead.status, 403);

    const ownerRead = await customerA.request('GET', `/api/forge/missions/${missionId}/analysis`);
    assert.equal(ownerRead.status, 200);

    const customerSafety = await customerA.request('GET', '/api/forge/safety');
    assert.equal(customerSafety.status, 403);

    const adminSafety = await admin.request('GET', '/api/forge/safety');
    assert.equal(adminSafety.status, 200);
  } finally {
    if (running) await stopServer(running.child);
    await rm(stateDir, { recursive: true, force: true });
  }
});


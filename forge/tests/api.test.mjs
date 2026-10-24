import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
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

function buildClient(base) {
  let csrf = '';
  let cookie = '';

  async function loadCsrf() {
    const html = await (await fetch(base + '/')).text();
    const match = html.match(/name="forge-csrf" content="([a-f0-9]+)"/);
    if (!match) throw new Error('CSRF token missing');
    csrf = match[1];
  }

  async function call(method, route, body, headers = {}) {
    const requestHeaders = {
      ...(method === 'POST' ? { 'Content-Type': 'application/json', 'X-Forge-CSRF': csrf } : {}),
      ...headers,
    };
    if (cookie) requestHeaders.Cookie = cookie;
    const res = await fetch(base + route, {
      method,
      headers: requestHeaders,
      body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    let data = {};
    try {
      data = await res.json();
    } catch {}
    return { status: res.status, data, headers: res.headers };
  }

  return { loadCsrf, call };
}

test('API end-to-end lifecycle with auth, RBAC gates and persistence', async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'forge-api-'));
  const port = await availablePort();
  let running;

  try {
    running = await startServer(port, stateDir);
    const base = running.base;

    const healthResponse = await fetch(base + '/api/forge/health');
    const health = await healthResponse.json();
    assert.equal(health.authRequired, true);
    assert.equal(health.realPayments, false);
    assert.equal(health.realDispatch, false);
    assert.equal(health.publicLaunchReady, false);
    assert.equal(healthResponse.headers.get('x-frame-options'), 'DENY');

    const hostCode = await new Promise((resolve, reject) => {
      const rq = http.request(
        { hostname: '127.0.0.1', port, path: '/api/forge/health', headers: { Host: 'untrusted.example' } },
        (rs) => {
          rs.resume();
          resolve(rs.statusCode);
        }
      );
      rq.once('error', reject);
      rq.end();
    });
    assert.equal(hostCode, 403);

    const admin = buildClient(base);
    await admin.loadCsrf();

    const register = await admin.call('POST', '/api/forge/auth/register', {
      email: 'admin@forge.local',
      password: 'AdminPass-1234',
      role: 'ADMIN',
    });
    assert.equal(register.status, 201);

    const login = await admin.call('POST', '/api/forge/auth/login', {
      email: 'admin@forge.local',
      password: 'AdminPass-1234',
    });
    assert.equal(login.status, 200);

    const me = await admin.call('GET', '/api/forge/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.data.authenticated, true);
    assert.equal(me.data.user.role, 'ADMIN');

    const tooLarge = await admin.call('POST', '/api/forge/reset', { notes: 'x'.repeat(17000) });
    assert.equal(tooLarge.status, 413);

    const bad = await admin.call('POST', '/api/forge/missions', { title: 'short' });
    assert.equal(bad.status, 422);

    const rejected = await admin.call('POST', '/api/forge/missions', {
      title: 'Clean asbestos from the commercial basement',
      description: 'Clean asbestos waste safely from the building basement.',
      buyer: 'Demo Customer',
      city: 'Rutherford, NJ',
      category: 'Local Admin',
      schedule: 'Weekend',
      skills: ['Asbestos'],
      priceUSD: 240,
    });
    assert.equal(rejected.status, 422);

    const request = await admin.call('POST', '/api/forge/missions', {
      title: 'Photograph a local shop for launch',
      description: 'Produce twelve well lit photos for approval by the fictional buyer.',
      buyer: 'Sample Customer',
      city: 'Rutherford, NJ',
      category: 'Business Photos',
      schedule: 'Weekend',
      skills: ['Photography'],
      priceUSD: 240,
    });
    assert.equal(request.status, 201);
    const id = request.data.mission.id;

    const readiness = await admin.call('GET', `/api/forge/missions/${id}/analysis`);
    assert.equal(readiness.status, 200);
    assert.equal(readiness.data.requiresHumanVerification, true);
    assert.ok(readiness.data.eligibleCount >= 1);

    const approve = await admin.call('POST', `/api/forge/missions/${id}/transition`, {
      status: 'APPROVED',
      safetyReviewed: true,
      reviewNote: 'Sandbox scope review only; no real work authorization.',
    });
    assert.equal(approve.status, 200);

    const matches = await admin.call('GET', `/api/forge/missions/${id}/matches`);
    const worker = matches.data.matches.find((x) => x.eligible);
    assert.ok(worker);

    const assign = await admin.call('POST', `/api/forge/missions/${id}/transition`, {
      status: 'ASSIGNED',
      workerId: worker.workerId,
    });
    assert.equal(assign.status, 200);

    const illegal = await admin.call('POST', `/api/forge/missions/${id}/transition`, {
      status: 'COMPLETED',
      buyerAccepted: true,
    });
    assert.equal(illegal.status, 400);

    const submit = await admin.call('POST', `/api/forge/missions/${id}/transition`, {
      status: 'SUBMITTED',
      proofNote: 'Photographs and organized gallery uploaded for customer review.',
    });
    assert.equal(submit.status, 200);

    const finish = await admin.call('POST', `/api/forge/missions/${id}/transition`, {
      status: 'COMPLETED',
      buyerAccepted: true,
    });
    assert.equal(finish.status, 200);

    const snapshot = await admin.call('GET', '/api/forge');
    assert.equal(snapshot.status, 200);
    assert.ok(snapshot.data.summary.completedMissions >= 1);

    const approvedMission = snapshot.data.missions.find((x) => x.status === 'APPROVED');
    const issue = await admin.call('POST', `/api/forge/missions/${approvedMission.id}/incident`, {
      severity: 'CRITICAL',
      note: 'A serious simulated safety concern was reported',
    });
    assert.equal(issue.status, 200);
    assert.equal(issue.data.safetyHold, true);

    const frozen = await admin.call('POST', `/api/forge/missions/${issue.data.mission.id}/transition`, {
      status: 'ASSIGNED',
    });
    assert.equal(frozen.status, 400);
    assert.match(frozen.data.error, /SAFETY_HOLD/);

    await stopServer(running.child);
    running = await startServer(port, stateDir);

    const admin2 = buildClient(base);
    await admin2.loadCsrf();
    await admin2.call('POST', '/api/forge/auth/login', { email: 'admin@forge.local', password: 'AdminPass-1234' });
    const restored = await admin2.call('GET', '/api/forge');
    assert.equal(restored.status, 200);
    assert.equal(restored.data.missions.find((x) => x.id === id).status, 'COMPLETED');

    const audit = await admin2.call('GET', '/api/forge/admin/audit');
    assert.equal(audit.status, 200);
    assert.ok(Array.isArray(audit.data.events));
    assert.ok(audit.data.events.length > 0);
  } finally {
    if (running) await stopServer(running.child);
    await rm(stateDir, { force: true, recursive: true });
  }
});

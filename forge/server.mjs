import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { seed } from './fixtures.mjs';
import {
  validateMission,
  validateWorker,
  matchWorkers,
  changeMission,
  reportIncident,
  aggregate,
  splitPayment,
  analyzeDemand,
  missionReadiness,
} from './core.mjs';
import {
  ROLES,
  validateEmail,
  validatePassword,
  validateRole,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  createSessionToken,
  hashSessionToken,
} from './auth.mjs';
import { createForgeStorage } from './storage.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const statePath = path.join(path.resolve(process.env.FORGE_STATE_DIR || path.join(dir, '.local')), 'demo-state.json');
const host = process.env.FORGE_HOST || '127.0.0.1';
const port = Number(process.env.FORGE_PORT || 5100);
const sessionTtlMs = Number(process.env.FORGE_SESSION_TTL_MS || 24 * 60 * 60 * 1000);
const authRequired = process.env.FORGE_AUTH_REQUIRED !== 'false';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local port');
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error('Sandbox must bind to localhost only. Add authentication before public hosting.');
}

const csrfToken = randomBytes(32).toString('hex');
const attempts = new Map();
const storage = await createForgeStorage({
  statePath,
  seedFactory: seed,
  databaseUrl: process.env.DATABASE_URL,
});
await storage.init();
await storage.deleteExpiredSessions();

let state = await storage.loadState();

function headers(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
  );
}

function respond(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function permittedHost(req) {
  return ['127.0.0.1', 'localhost'].some((h) => req.headers.host === `${h}:${port}`);
}

function checkToken(value) {
  if (typeof value !== 'string') return false;
  const v = Buffer.from(value, 'utf8');
  const expected = Buffer.from(csrfToken, 'utf8');
  return v.length === expected.length && timingSafeEqual(v, expected);
}

function rejectFlood() {
  const now = Date.now();
  for (const [k, v] of attempts) if (now - v.start > 60_000) attempts.delete(k);
  const key = 'demo-local';
  const r = attempts.get(key) || { start: now, count: 0 };
  r.count++;
  attempts.set(key, r);
  return r.count > 90;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function persistState() {
  await storage.saveState(state);
}

async function appendAuditEvent(actor, action, targetType, targetId, metadata = {}) {
  await storage.appendAuditEvent({
    actorUserId: actor?.id || null,
    action,
    targetType,
    targetId,
    metadata,
  });
}

async function log(message, actor) {
  state.activity.unshift({ id: randomUUID(), time: new Date().toISOString(), message });
  state.activity = state.activity.slice(0, 60);
  await persistState();
  await appendAuditEvent(actor, 'activity.log', 'activity', null, { message });
}

async function getBody(req) {
  const max = 16_000;
  if (Number(req.headers['content-length']) > max) throw new HttpError(413, 'Request is too large');
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new HttpError(413, 'Request is too large');
    parts.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new HttpError(400, 'JSON object required');
  return body;
}

function parseCookies(req) {
  const cookies = {};
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.split('=');
    if (!name || rest.length === 0) continue;
    cookies[name.trim()] = decodeURIComponent(rest.join('=').trim());
  }
  return cookies;
}

function getSessionTokenFromRequest(req) {
  const cookies = parseCookies(req);
  if (cookies.forge_session) return cookies.forge_session;
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) return authHeader.slice('Bearer '.length).trim();
  return null;
}

function setSessionCookie(res, token) {
  const secure = process.env.FORGE_SECURE_COOKIE === 'true';
  const maxAgeSec = Math.max(60, Math.floor(sessionTtlMs / 1000));
  const parts = [
    `forge_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  const secure = process.env.FORGE_SECURE_COOKIE === 'true';
  const parts = ['forge_session=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

async function authenticate(req) {
  if (!authRequired) {
    return { id: 'demo-admin', role: ROLES.ADMIN, email: 'demo-admin@local', isActive: true, bypass: true };
  }
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const session = await storage.findSessionByTokenHash(tokenHash);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await storage.deleteSessionByTokenHash(tokenHash);
    return null;
  }
  const user = await storage.findUserById(session.userId);
  if (!user || user.isActive === false) return null;
  await storage.touchSession(session.id);
  return user;
}

function requireAuth(user) {
  if (!user) throw new HttpError(401, 'Authentication required');
}

function requireRole(user, allowed) {
  requireAuth(user);
  if (!allowed.includes(user.role)) throw new HttpError(403, 'Insufficient permission');
}

function canViewMission(user, mission) {
  if (!user || !mission) return false;
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.CUSTOMER && mission.customerUserId === user.id) return true;
  if (user.role === ROLES.PARTICIPANT) {
    const ownedWorkerIds = new Set(state.workers.filter((w) => w.userId === user.id).map((w) => w.id));
    return mission.workerId && ownedWorkerIds.has(mission.workerId);
  }
  return false;
}

function scopedSnapshot(user) {
  if (user.role === ROLES.ADMIN) {
    return {
      missions: state.missions,
      workers: state.workers,
      activity: state.activity,
      summary: aggregate(state.missions, state.workers),
    };
  }

  if (user.role === ROLES.CUSTOMER) {
    const missions = state.missions.filter((m) => m.customerUserId === user.id);
    return {
      missions,
      workers: [],
      activity: [],
      summary: aggregate(missions, []),
    };
  }

  const workers = state.workers.filter((w) => w.userId === user.id);
  const workerIds = new Set(workers.map((w) => w.id));
  const missions = state.missions.filter((m) => m.workerId && workerIds.has(m.workerId));
  return {
    missions,
    workers,
    activity: [],
    summary: aggregate(missions, workers),
  };
}

async function maybeBootstrapAdmin() {
  const users = await storage.listUsers();
  if (users.length > 0) return;
  const email = normalizeEmail(process.env.FORGE_BOOTSTRAP_ADMIN_EMAIL || '');
  const password = String(process.env.FORGE_BOOTSTRAP_ADMIN_PASSWORD || '');
  if (!email || !password) return;
  if (!validateEmail(email) || validatePassword(password)) return;
  await storage.createUser({
    email,
    passwordHash: hashPassword(password),
    role: ROLES.ADMIN,
  });
  await storage.appendAuditEvent({
    actorUserId: null,
    action: 'auth.bootstrap_admin',
    targetType: 'user',
    targetId: email,
    metadata: { source: 'env' },
  });
}

await maybeBootstrapAdmin();

const route = async (req, res) => {
  headers(res);
  try {
    if (!permittedHost(req)) return respond(res, 403, { error: 'Unexpected host; local access only' });
    if (!['GET', 'POST'].includes(req.method)) return respond(res, 405, { error: 'Method not allowed' });

    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    let body = {};
    const actor = await authenticate(req);

    if (req.method === 'GET' && (pathname === '/' || pathname === '/forge')) {
      const file = fs.readFileSync(path.join(dir, 'public', 'index.html'), 'utf8');
      const html = file
        .replace('</head>', `<meta name="forge-csrf" content="${csrfToken}"></head>`)
        .replace('</head>', `<meta name="forge-auth-required" content="${authRequired ? 'true' : 'false'}"></head>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (req.method === 'GET' && pathname === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(path.join(dir, 'public', 'app.js')));
      return;
    }
    if (req.method === 'GET' && pathname === '/style.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(path.join(dir, 'public', 'style.css')));
      return;
    }

    if (req.method === 'POST') {
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
        return respond(res, 415, { error: 'POST requests require application/json' });
      }
      const origin = req.headers.origin;
      if (origin) {
        let trusted = false;
        try {
          const o = new URL(origin);
          trusted = (o.hostname === '127.0.0.1' || o.hostname === 'localhost') && Number(o.port || 80) === port;
        } catch {}
        if (!trusted) return respond(res, 403, { error: 'Cross-origin demo writes are forbidden' });
      }
      if (!checkToken(req.headers['x-forge-csrf'])) {
        return respond(res, 403, { error: 'Invalid local session token. Reload this page.' });
      }
      if (rejectFlood()) return respond(res, 429, { error: 'Rate limit reached. Try again shortly.' });
      body = await getBody(req);
    }

    if (req.method === 'GET' && pathname === '/api/forge/health') {
      return respond(res, 200, {
        status: 'ok',
        sandbox: true,
        realPayments: false,
        realDispatch: false,
        publicLaunchReady: false,
        authRequired,
        storageBackend: await storage.backendName(),
      });
    }

    if (req.method === 'GET' && pathname === '/api/forge/auth/me') {
      if (!actor) return respond(res, 200, { authenticated: false, authRequired });
      return respond(res, 200, {
        authenticated: true,
        authRequired,
        user: { id: actor.id, email: actor.email, role: actor.role },
      });
    }

    if (req.method === 'POST' && pathname === '/api/forge/auth/register') {
      const users = await storage.listUsers();
      const isBootstrap = users.length === 0;
      if (!isBootstrap) requireRole(actor, [ROLES.ADMIN]);

      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      const requestedRole = String(body.role || '');
      const role = isBootstrap ? ROLES.ADMIN : requestedRole;
      if (!validateEmail(email)) return respond(res, 422, { error: 'A valid email is required.' });
      const passwordError = validatePassword(password);
      if (passwordError) return respond(res, 422, { error: passwordError });
      if (!validateRole(role)) return respond(res, 422, { error: 'Invalid role.' });
      if (await storage.findUserByEmail(email)) return respond(res, 409, { error: 'Email is already registered.' });

      const created = await storage.createUser({
        email,
        passwordHash: hashPassword(password),
        role,
      });
      await appendAuditEvent(actor, 'auth.register', 'user', created.id, { email: created.email, role: created.role });
      return respond(res, 201, {
        user: { id: created.id, email: created.email, role: created.role, isActive: created.isActive },
      });
    }

    if (req.method === 'POST' && pathname === '/api/forge/auth/login') {
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      const user = await storage.findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash) || user.isActive === false) {
        await appendAuditEvent(null, 'auth.login_failed', 'user', null, { email });
        return respond(res, 401, { error: 'Invalid credentials.' });
      }
      const token = createSessionToken();
      await storage.createSession({
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + sessionTtlMs),
      });
      setSessionCookie(res, token);
      await appendAuditEvent(user, 'auth.login', 'session', null, { role: user.role });
      return respond(res, 200, {
        authenticated: true,
        user: { id: user.id, email: user.email, role: user.role },
      });
    }

    if (req.method === 'POST' && pathname === '/api/forge/auth/logout') {
      const token = getSessionTokenFromRequest(req);
      if (token) await storage.deleteSessionByTokenHash(hashSessionToken(token));
      clearSessionCookie(res);
      await appendAuditEvent(actor, 'auth.logout', 'session', null, {});
      return respond(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/forge') {
      requireAuth(actor);
      const snapshot = scopedSnapshot(actor);
      return respond(res, 200, {
        sandbox: true,
        authRequired,
        role: actor.role,
        summary: snapshot.summary,
        missions: snapshot.missions,
        workers: snapshot.workers,
        activity: snapshot.activity,
      });
    }

    if (req.method === 'GET' && pathname === '/api/forge/safety') {
      requireRole(actor, [ROLES.ADMIN]);
      return respond(res, 200, {
        sandbox: true,
        publicLaunchReady: false,
        localOnly: true,
        realDispatch: false,
        realPayments: false,
        identityVerification: false,
        scopeFilter: 'heuristic_only',
        safetyHolds: state.missions
          .filter((x) => x.safetyHold)
          .map((m) => ({ id: m.id, title: m.title, severity: m.lastIncident?.severity || 'UNSPECIFIED' })),
        launchBlockers: [
          'Independent security testing and role-based authentication',
          'Identity and business verification',
          'Industry-appropriate insurance and licenses',
          'Worker classification and written legal agreements',
          'Incident response staffing and emergency escalation',
          'Payment-provider onboarding, disputes and reconciliation',
          'Privacy impact assessment and retention policy',
          'Independent review of physical work hazards',
        ],
      });
    }

    if (req.method === 'GET' && pathname === '/api/forge/intelligence') {
      requireRole(actor, [ROLES.ADMIN]);
      return respond(res, 200, analyzeDemand(state.missions, state.workers));
    }

    if (req.method === 'GET' && pathname === '/api/forge/admin/audit') {
      requireRole(actor, [ROLES.ADMIN]);
      const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') || 100), 500));
      return respond(res, 200, { events: await storage.getAuditEvents(limit) });
    }

    const analysis = pathname.match(/^\/api\/forge\/missions\/([^/]+)\/analysis$/);
    if (req.method === 'GET' && analysis) {
      requireAuth(actor);
      const mission = state.missions.find((x) => x.id === analysis[1]);
      if (!mission) return respond(res, 404, { error: 'Mission not found' });
      if (!canViewMission(actor, mission)) return respond(res, 403, { error: 'Mission access denied' });
      return respond(res, 200, missionReadiness(mission, state.workers));
    }

    const matches = pathname.match(/^\/api\/forge\/missions\/([^/]+)\/matches$/);
    if (req.method === 'GET' && matches) {
      requireAuth(actor);
      const mission = state.missions.find((x) => x.id === matches[1]);
      if (!mission) return respond(res, 404, { error: 'Mission not found' });
      if (!canViewMission(actor, mission)) return respond(res, 403, { error: 'Mission access denied' });
      return respond(res, 200, { matches: matchWorkers(mission, state.workers), split: splitPayment(mission.priceCents), sandbox: true });
    }

    if (req.method === 'POST' && pathname === '/api/forge/missions') {
      requireRole(actor, [ROLES.ADMIN, ROLES.CUSTOMER]);
      const result = validateMission(body);
      if (!result.ok) return respond(res, 422, { errors: result.errors });
      const mission = {
        ...result.value,
        customerUserId: actor.id,
      };
      state.missions.unshift(mission);
      await log(`New demo request created: ${mission.title}`, actor);
      await appendAuditEvent(actor, 'mission.create', 'mission', mission.id, { category: mission.category });
      return respond(res, 201, { mission });
    }

    if (req.method === 'POST' && pathname === '/api/forge/workers') {
      requireRole(actor, [ROLES.ADMIN, ROLES.PARTICIPANT]);
      const result = validateWorker(body);
      if (!result.ok) return respond(res, 422, { errors: result.errors });
      const worker = {
        ...result.value,
        userId: actor.id,
      };
      state.workers.push(worker);
      await log(`Demo participant added: ${worker.name}`, actor);
      await appendAuditEvent(actor, 'worker.create', 'worker', worker.id, { city: worker.city });
      return respond(res, 201, { worker });
    }

    const transition = pathname.match(/^\/api\/forge\/missions\/([^/]+)\/transition$/);
    if (req.method === 'POST' && transition) {
      requireRole(actor, [ROLES.ADMIN]);
      const index = state.missions.findIndex((x) => x.id === transition[1]);
      if (index < 0) return respond(res, 404, { error: 'Mission not found' });
      const original = state.missions[index];
      const next = changeMission(original, body.status, body, state.workers);
      state.missions[index] = next;
      await log(`Demo mission moved to ${next.status}: ${next.title}`, actor);
      await appendAuditEvent(actor, 'mission.transition', 'mission', next.id, {
        from: original.status,
        to: next.status,
      });
      return respond(res, 200, { mission: next });
    }

    const incident = pathname.match(/^\/api\/forge\/missions\/([^/]+)\/incident$/);
    if (req.method === 'POST' && incident) {
      requireRole(actor, [ROLES.ADMIN]);
      const index = state.missions.findIndex((x) => x.id === incident[1]);
      if (index < 0) return respond(res, 404, { error: 'Mission not found' });
      state.missions[index] = reportIncident(state.missions[index], body.note, body.severity || 'HIGH');
      await log(`SAFETY HOLD (${body.severity || 'HIGH'}): demo mission ${incident[1]} — no dispatch available`, actor);
      await appendAuditEvent(actor, 'mission.incident', 'mission', state.missions[index].id, {
        severity: body.severity || 'HIGH',
      });
      return respond(res, 200, {
        mission: state.missions[index],
        safetyHold: true,
        emergencyContacted: false,
        message: 'Demo hold recorded. This application does NOT contact emergency services.',
      });
    }

    if (req.method === 'POST' && pathname === '/api/forge/reset') {
      requireRole(actor, [ROLES.ADMIN]);
      state = seed();
      await persistState();
      await appendAuditEvent(actor, 'state.reset', 'state', 'forge', { sandbox: true });
      return respond(res, 200, { ok: true, sandbox: true });
    }

    return respond(res, 404, { error: 'Not found' });
  } catch (e) {
    if (!res.headersSent) {
      respond(res, e instanceof HttpError ? e.status : 400, {
        error: e instanceof Error ? e.message : 'Request error',
      });
    }
  }
};

const server = http.createServer(route);
server.listen(port, host, async () => {
  const backend = await storage.backendName();
  console.log(
    `SniperX Forge demo: http://${host}:${port}\nSANDBOX ONLY — simulated buyers, participants, missions and payment figures. No real payments.\nAuth required: ${authRequired}\nStorage backend: ${backend}`
  );
});

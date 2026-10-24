import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function ensureStateShape(value, seedFactory) {
  const seeded = seedFactory();
  const next = value && typeof value === 'object' ? value : {};
  const state = {
    version: Number(next.version) || 2,
    sandbox: next.sandbox !== false,
    missions: Array.isArray(next.missions) ? next.missions : seeded.missions,
    workers: Array.isArray(next.workers) ? next.workers : seeded.workers,
    activity: Array.isArray(next.activity) ? next.activity : seeded.activity,
  };
  return state;
}

export async function createForgeStorage({ statePath, seedFactory, databaseUrl }) {
  if (databaseUrl) {
    return new PostgresForgeStorage({ databaseUrl, seedFactory });
  }
  return new LocalJsonForgeStorage({ statePath, seedFactory });
}

class LocalJsonForgeStorage {
  constructor({ statePath, seedFactory }) {
    this.statePath = statePath;
    this.seedFactory = seedFactory;
    this.state = ensureStateShape(null, this.seedFactory);
    this.meta = { users: [], sessions: [], auditEvents: [] };
    this.writeQueue = Promise.resolve();
  }

  async init() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      this.state = ensureStateShape(parsed?.state || parsed, this.seedFactory);
      this.meta = {
        users: Array.isArray(parsed?.meta?.users) ? parsed.meta.users : [],
        sessions: Array.isArray(parsed?.meta?.sessions) ? parsed.meta.sessions : [],
        auditEvents: Array.isArray(parsed?.meta?.auditEvents) ? parsed.meta.auditEvents : [],
      };
    } catch {
      this.state = ensureStateShape(null, this.seedFactory);
      this.meta = { users: [], sessions: [], auditEvents: [] };
      await this.persist();
    }
  }

  async loadState() {
    return structuredClone(this.state);
  }

  async saveState(nextState) {
    this.state = ensureStateShape(nextState, this.seedFactory);
    await this.persist();
  }

  async listUsers() {
    return [...this.meta.users];
  }

  async findUserByEmail(email) {
    return this.meta.users.find((user) => user.email === email) || null;
  }

  async findUserById(id) {
    return this.meta.users.find((user) => user.id === id) || null;
  }

  async createUser({ email, passwordHash, role }) {
    const now = new Date().toISOString();
    const user = { id: randomUUID(), email, passwordHash, role, isActive: true, createdAt: now };
    this.meta.users.push(user);
    await this.persist();
    return user;
  }

  async createSession({ userId, tokenHash, expiresAt }) {
    const now = new Date().toISOString();
    const session = {
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      lastSeenAt: now,
    };
    this.meta.sessions.push(session);
    await this.persist();
    return session;
  }

  async findSessionByTokenHash(tokenHash) {
    return this.meta.sessions.find((session) => session.tokenHash === tokenHash) || null;
  }

  async deleteSessionByTokenHash(tokenHash) {
    this.meta.sessions = this.meta.sessions.filter((session) => session.tokenHash !== tokenHash);
    await this.persist();
  }

  async touchSession(sessionId) {
    const session = this.meta.sessions.find((item) => item.id === sessionId);
    if (!session) return;
    session.lastSeenAt = new Date().toISOString();
    await this.persist();
  }

  async deleteExpiredSessions(now = new Date()) {
    const cutoff = now.getTime();
    this.meta.sessions = this.meta.sessions.filter((session) => new Date(session.expiresAt).getTime() > cutoff);
    await this.persist();
  }

  async appendAuditEvent(event) {
    this.meta.auditEvents.unshift({
      ...event,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    });
    this.meta.auditEvents = this.meta.auditEvents.slice(0, 2000);
    await this.persist();
  }

  async getAuditEvents(limit = 100) {
    return this.meta.auditEvents.slice(0, Math.max(1, Math.min(limit, 500)));
  }

  async backendName() {
    return 'local-json';
  }

  async persist() {
    this.writeQueue = this.writeQueue.then(async () => {
      const stateDir = path.dirname(this.statePath);
      fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
      const tmpPath = `${this.statePath}.${process.pid}.${randomUUID()}.tmp`;
      const payload = { version: 2, state: this.state, meta: this.meta };
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), { mode: 0o600, flag: 'wx' });
      fs.renameSync(tmpPath, this.statePath);
      fs.chmodSync(this.statePath, 0o600);
      try {
        fs.unlinkSync(tmpPath);
      } catch {}
    });
    await this.writeQueue;
  }
}

class PostgresForgeStorage {
  constructor({ databaseUrl, seedFactory }) {
    this.databaseUrl = databaseUrl;
    this.seedFactory = seedFactory;
    this.pool = null;
  }

  async init() {
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.databaseUrl });
    await this.ensureBootstrapState();
  }

  async ensureBootstrapState() {
    const seeded = ensureStateShape(null, this.seedFactory);
    const existing = await this.pool.query('SELECT state_json FROM forge_state WHERE id = 1');
    if (existing.rowCount === 0) {
      await this.pool.query(
        'INSERT INTO forge_state (id, state_json, updated_at) VALUES (1, $1::jsonb, NOW())',
        [JSON.stringify(seeded)]
      );
    }
  }

  async loadState() {
    const result = await this.pool.query('SELECT state_json FROM forge_state WHERE id = 1');
    const value = result.rows[0]?.state_json || null;
    return ensureStateShape(value, this.seedFactory);
  }

  async saveState(nextState) {
    const state = ensureStateShape(nextState, this.seedFactory);
    await this.pool.query('UPDATE forge_state SET state_json = $1::jsonb, updated_at = NOW() WHERE id = 1', [
      JSON.stringify(state),
    ]);
  }

  async listUsers() {
    const result = await this.pool.query(
      'SELECT id, email, password_hash AS "passwordHash", role, is_active AS "isActive", created_at AS "createdAt" FROM forge_users ORDER BY created_at ASC'
    );
    return result.rows;
  }

  async findUserByEmail(email) {
    const result = await this.pool.query(
      'SELECT id, email, password_hash AS "passwordHash", role, is_active AS "isActive", created_at AS "createdAt" FROM forge_users WHERE email = $1 LIMIT 1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findUserById(id) {
    const result = await this.pool.query(
      'SELECT id, email, password_hash AS "passwordHash", role, is_active AS "isActive", created_at AS "createdAt" FROM forge_users WHERE id = $1 LIMIT 1',
      [id]
    );
    return result.rows[0] || null;
  }

  async createUser({ email, passwordHash, role }) {
    const result = await this.pool.query(
      `INSERT INTO forge_users (id, email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       RETURNING id, email, password_hash AS "passwordHash", role, is_active AS "isActive", created_at AS "createdAt"`,
      [randomUUID(), email, passwordHash, role]
    );
    return result.rows[0];
  }

  async createSession({ userId, tokenHash, expiresAt }) {
    const result = await this.pool.query(
      `INSERT INTO forge_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, user_id AS "userId", token_hash AS "tokenHash", expires_at AS "expiresAt", created_at AS "createdAt", last_seen_at AS "lastSeenAt"`,
      [randomUUID(), userId, tokenHash, expiresAt.toISOString()]
    );
    return result.rows[0];
  }

  async findSessionByTokenHash(tokenHash) {
    const result = await this.pool.query(
      `SELECT id, user_id AS "userId", token_hash AS "tokenHash", expires_at AS "expiresAt", created_at AS "createdAt", last_seen_at AS "lastSeenAt"
       FROM forge_sessions WHERE token_hash = $1 LIMIT 1`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  async deleteSessionByTokenHash(tokenHash) {
    await this.pool.query('DELETE FROM forge_sessions WHERE token_hash = $1', [tokenHash]);
  }

  async touchSession(sessionId) {
    await this.pool.query('UPDATE forge_sessions SET last_seen_at = NOW() WHERE id = $1', [sessionId]);
  }

  async deleteExpiredSessions(now = new Date()) {
    await this.pool.query('DELETE FROM forge_sessions WHERE expires_at <= $1', [now.toISOString()]);
  }

  async appendAuditEvent(event) {
    await this.pool.query(
      `INSERT INTO forge_audit_events (id, actor_user_id, action, target_type, target_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
      [
        randomUUID(),
        event.actorUserId || null,
        event.action,
        event.targetType || null,
        event.targetId || null,
        JSON.stringify(event.metadata || {}),
      ]
    );
  }

  async getAuditEvents(limit = 100) {
    const bounded = Math.max(1, Math.min(limit, 500));
    const result = await this.pool.query(
      `SELECT id, actor_user_id AS "actorUserId", action, target_type AS "targetType", target_id AS "targetId",
              metadata, created_at AS "createdAt"
       FROM forge_audit_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [bounded]
    );
    return result.rows;
  }

  async backendName() {
    return 'postgres';
  }
}


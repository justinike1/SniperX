-- SniperX Forge Stage 2 foundation schema
-- Run with: npm run migrate (from forge/)

CREATE TABLE IF NOT EXISTS forge_state (
  id INTEGER PRIMARY KEY,
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forge_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CUSTOMER', 'PARTICIPANT')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forge_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES forge_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forge_sessions_user_id_idx ON forge_sessions(user_id);
CREATE INDEX IF NOT EXISTS forge_sessions_expires_at_idx ON forge_sessions(expires_at);

CREATE TABLE IF NOT EXISTS forge_audit_events (
  id UUID PRIMARY KEY,
  actor_user_id UUID REFERENCES forge_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forge_audit_created_idx ON forge_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS forge_audit_action_idx ON forge_audit_events(action);


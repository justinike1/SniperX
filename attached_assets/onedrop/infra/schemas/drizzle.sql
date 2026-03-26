-- See full schema in earlier kits; concise form included
CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT,
  decimals INTEGER DEFAULT 9,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  tx_sig TEXT UNIQUE,
  token_address TEXT NOT NULL,
  side TEXT NOT NULL,
  in_amount NUMERIC(30,9),
  out_amount NUMERIC(30,9),
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trades_token_time_idx ON trades(token_address, created_at);
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  token_address TEXT UNIQUE NOT NULL,
  qty NUMERIC(30,9) NOT NULL DEFAULT 0,
  avg_cost_usd NUMERIC(18,9) NOT NULL DEFAULT 0,
  realized_pnl_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

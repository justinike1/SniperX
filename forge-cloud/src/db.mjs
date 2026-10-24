import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';

export function openStore(filename) {
  const absolute=path.resolve(filename);
  fs.mkdirSync(path.dirname(absolute),{recursive:true,mode:0o700});
  const db=new DatabaseSync(absolute,{enableForeignKeyConstraints:true});
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','buyer','worker')),
      display_name TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invitations (
      token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('buyer','worker')),
      expires_at INTEGER NOT NULL, redeemed_at TEXT, created_by TEXT NOT NULL REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY, buyer_user_id TEXT NOT NULL REFERENCES users(id), worker_user_id TEXT REFERENCES users(id),
      data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workers (
      user_id TEXT PRIMARY KEY REFERENCES users(id), data TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES missions(id),
      reporter_user_id TEXT NOT NULL REFERENCES users(id), severity TEXT NOT NULL,
      note TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, actor_user_id TEXT REFERENCES users(id), action TEXT NOT NULL,
      resource_type TEXT NOT NULL, resource_id TEXT, detail TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verification_cases (
      id TEXT PRIMARY KEY,
      subject_user_id TEXT NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL CHECK(kind IN ('IDENTITY','BACKGROUND','LICENSE','BUSINESS')),
      purpose TEXT NOT NULL, jurisdiction TEXT NOT NULL DEFAULT '',
      license_type TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('AWAITING_ACKNOWLEDGEMENT','AWAITING_PROVIDER','REVIEW_REQUIRED','REJECTED','CANCELLED','MANUAL_EVIDENCE_RECORDED')),
      created_by TEXT NOT NULL REFERENCES users(id),
      acknowledged_at TEXT, reviewer_note TEXT, registry_url TEXT,
      expires_at TEXT, reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_verification_subject ON verification_cases(subject_user_id,created_at);
    CREATE INDEX IF NOT EXISTS idx_verification_kind ON verification_cases(kind,status);
    CREATE TABLE IF NOT EXISTS mission_interests (
      id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      worker_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('INTERESTED','WITHDRAWN')),
      created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
      UNIQUE(mission_id,worker_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_mission_interests_worker ON mission_interests(worker_user_id,status);
    CREATE TABLE IF NOT EXISTS employment_shift_intakes (
      id TEXT PRIMARY KEY,
      buyer_user_id TEXT NOT NULL REFERENCES users(id),
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shift_intakes_buyer ON employment_shift_intakes(buyer_user_id,created_at);
    CREATE TABLE IF NOT EXISTS earn_availability (
      worker_user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('ON','OFF')),
      expires_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_earn_availability_active ON earn_availability(status,expires_at);
    CREATE TABLE IF NOT EXISTS external_jobs (
      source_key TEXT PRIMARY KEY, source TEXT NOT NULL, employer TEXT NOT NULL,
      title TEXT NOT NULL, location TEXT NOT NULL, apply_url TEXT NOT NULL,
      posting_updated_at TEXT, expires_at TEXT, last_verified_at TEXT NOT NULL,
      source_board TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_external_jobs_freshness ON external_jobs(last_verified_at);
    CREATE INDEX IF NOT EXISTS idx_missions_buyer ON missions(buyer_user_id);
    CREATE INDEX IF NOT EXISTS idx_missions_worker ON missions(worker_user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
    CREATE TABLE IF NOT EXISTS sandbox_mission_funding (
      mission_id TEXT PRIMARY KEY REFERENCES missions(id) ON DELETE RESTRICT,
      amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 100 AND 1000000),
      worker_cents INTEGER NOT NULL CHECK(worker_cents>0),
      platform_fee_cents INTEGER NOT NULL CHECK(platform_fee_cents>=0),
      status TEXT NOT NULL CHECK(status IN ('RESERVED','RELEASED','VOIDED_SIMULATED')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL, released_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sandbox_payouts (
      id TEXT PRIMARY KEY,
      worker_user_id TEXT NOT NULL REFERENCES users(id),
      idempotency_key TEXT NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('STANDARD','INSTANT')),
      amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 500 AND 1000000),
      fee_cents INTEGER NOT NULL CHECK(fee_cents>=0),
      net_cents INTEGER NOT NULL CHECK(net_cents>0),
      status TEXT NOT NULL CHECK(status IN ('REQUESTED_SIMULATED','PAID_SIMULATED','FAILED_SIMULATED')),
      requested_at TEXT NOT NULL,completed_at TEXT,
      UNIQUE(worker_user_id,idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS idx_sandbox_payouts_worker ON sandbox_payouts(worker_user_id,requested_at);
    CREATE TABLE IF NOT EXISTS sandbox_wallet_ledger (
      id TEXT PRIMARY KEY,worker_user_id TEXT NOT NULL REFERENCES users(id),
      mission_id TEXT REFERENCES missions(id),payout_id TEXT REFERENCES sandbox_payouts(id),
      kind TEXT NOT NULL CHECK(kind IN ('MISSION_RELEASE','PAYOUT_RESERVED','PAYOUT_REFUNDED')),
      amount_cents INTEGER NOT NULL CHECK(amount_cents!=0),
      event_key TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sandbox_wallet_worker ON sandbox_wallet_ledger(worker_user_id,created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);
  try{fs.chmodSync(absolute,0o600)}catch{}
  const one=(sql,...a)=>db.prepare(sql).get(...a);
  const all=(sql,...a)=>db.prepare(sql).all(...a);
  const run=(sql,...a)=>db.prepare(sql).run(...a);
  const transaction=(fn)=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}};
  const audit=(actor,action,type,id,detail={})=>run(
    'INSERT INTO audit_events VALUES(?,?,?,?,?,?,?)',randomUUID(),actor,action,type,id,JSON.stringify(detail),new Date().toISOString());
  const missionFromRow=row=>row&&{...JSON.parse(row.data),buyerUserId:row.buyer_user_id,workerUserId:row.worker_user_id};
  const workerFromRow=row=>row&&{...JSON.parse(row.data),userId:row.user_id};
  const getMission=id=>missionFromRow(one('SELECT * FROM missions WHERE id=?',id));
  const saveMission=(m)=>run('UPDATE missions SET data=?,worker_user_id=?,updated_at=? WHERE id=?',JSON.stringify(stripRelations(m)),m.workerUserId||null,new Date().toISOString(),m.id);
  const listWorkers=()=>all('SELECT * FROM workers').map(workerFromRow);
  function stripRelations(m){const {buyerUserId,workerUserId,...data}=m;return data;}
  return {db,one,all,run,transaction,audit,getMission,saveMission,listWorkers,workerFromRow,missionFromRow,stripRelations,close:()=>db.close()};
}

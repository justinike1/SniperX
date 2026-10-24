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

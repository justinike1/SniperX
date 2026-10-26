#!/usr/bin/env node
/** Safe, read-only restore drill. Validate a backup as an operational SQLite DB. */
import path from 'node:path';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
export function verifySqlite({filename,expectedTables=['users','missions','audit_events','sandbox_wallet_ledger','stripe_test_checkout_sessions']}){
  const full=path.resolve(filename||'');
  if(!filename||!fs.statSync(full,{throwIfNoEntry:false})?.isFile())throw Error('Backup file not found');
  const db=new DatabaseSync(full,{readOnly:true});
  try{
    const problems=db.prepare('PRAGMA integrity_check').all().map(x=>x.integrity_check).filter(x=>x!=='ok');
    if(problems.length)throw Error(`Database integrity failures: ${problems.slice(0,2).join('; ')}`);
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
    const missing=expectedTables.filter(x=>!tables.includes(x));
    if(missing.length)throw Error(`Missing required tables: ${missing.join(', ')}`);
    const missionCount=db.prepare('SELECT COUNT(*) AS n FROM missions').get().n;
    const usersCount=db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    return {ok:true,filename:full,users:usersCount,missions:missionCount,integrity:'ok',requiredTablesPresent:true};
  }finally{db.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(verifySqlite({filename:process.argv[2]}),null,2))}
  catch(e){console.error('RESTORE DRILL FAILED:',e.message);process.exitCode=1}
}

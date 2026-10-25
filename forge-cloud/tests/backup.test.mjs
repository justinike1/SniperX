import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openStore} from '../src/db.mjs';
import {createDatabaseBackup} from '../tools/backup-sqlite.mjs';
import {verifySqlite} from '../tools/verify-sqlite.mjs';
const setup=()=>fs.mkdtempSync(path.join(os.tmpdir(),'forge-backup-'));
test('backup copies live WAL SQLite database safely, validates schema and refuses overwrite',async()=>{
 const dir=setup();try{
  const source=path.join(dir,'forge.sqlite'),destination=path.join(dir,'safe-backup.sqlite');
  const store=openStore(source);
  const a=store.one('SELECT COUNT(*) AS n FROM sqlite_master').n;
  const result=await createDatabaseBackup({source,destination});
  assert.equal(result.integrity,'ok');assert.equal(result.encrypted,false);
  assert.match(result.sha256,/^[a-f0-9]{64}$/);
  const verify=verifySqlite({filename:destination});assert.equal(verify.ok,true);
  const copy=new DatabaseSync(destination,{readOnly:true});
  assert.equal(copy.prepare('SELECT COUNT(*) AS n FROM sqlite_master').get().n,a);copy.close();
  await assert.rejects(()=>createDatabaseBackup({source,destination}),/already exists/);
  store.close();
 }finally{fs.rmSync(dir,{force:true,recursive:true})}
});
test('restore drill rejects missing backup',()=>assert.throws(()=>verifySqlite({filename:'/nonexistent/forge-missing.sqlite'}),/not found/));

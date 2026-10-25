#!/usr/bin/env node
/**
 * Forge operational SQLite backup. Creates a CONSISTENT snapshot even if WAL is active.
 * Refuses to create a missing source, overwrite a destination, or treat the backup as encrypted.
 * Node >=22.16. No side effects on the source database.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync,backup} from 'node:sqlite';

export async function createDatabaseBackup({source,destination}){
  if(!source||!destination)throw Error('Usage: node tools/backup-sqlite.mjs SOURCE_DB DESTINATION_DB');
  const src=path.resolve(source),dst=path.resolve(destination);
  if(src===dst)throw Error('Source and destination must be different');
  const srcStat=fs.statSync(src,{throwIfNoEntry:false});
  if(!srcStat?.isFile())throw Error('Source database does not exist');
  if(fs.existsSync(dst))throw Error('Destination already exists; refusing overwrite');
  if(!fs.existsSync(path.dirname(dst)))throw Error('Destination directory does not exist');
  const db=new DatabaseSync(src,{readOnly:true});
  try{
    const result=await backup(db,dst);
    fs.chmodSync(dst,0o600);
    const verify=new DatabaseSync(dst,{readOnly:true});
    try{
      const check=verify.prepare('PRAGMA integrity_check').all();
      if(check.length!==1||check[0].integrity_check!=='ok')throw Error('SQLite backup integrity_check failed');
      const orig= db.prepare('SELECT COUNT(*) AS c FROM sqlite_master').get().c;
      const copy= verify.prepare('SELECT COUNT(*) AS c FROM sqlite_master').get().c;
      if(orig!==copy)throw Error('Backup schema count mismatch');
    }finally{verify.close();}
    const bytes=fs.readFileSync(dst);
    return {destination:dst,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),pagesCopied:result,integrity:'ok',encrypted:false};
  }catch(error){if(fs.existsSync(dst))fs.rmSync(dst,{force:true});throw error}
  finally{db.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {console.log(JSON.stringify(await createDatabaseBackup({source:process.argv[2],destination:process.argv[3]}),null,2))}
  catch(e){console.error('BACKUP FAILED:',e.message);process.exitCode=1}
}

import {openStore} from './db.mjs';
import {normalizeEmail,displayName,hashPassword} from './security.mjs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
const pathToDb=process.env.FORGE_DB_PATH||path.resolve('data/forge.sqlite');
const store=openStore(pathToDb);
try{
  const existing=store.one("SELECT count(*) n FROM users WHERE role='admin'").n;
  if(existing)throw Error('An administrator already exists. Admin bootstrap is intentionally one-time only.');
  const email=normalizeEmail(process.env.FORGE_ADMIN_EMAIL);
  const password=process.env.FORGE_ADMIN_PASSWORD;
  const name=displayName(process.env.FORGE_ADMIN_NAME||'Forge Administrator');
  const id=randomUUID(),now=new Date().toISOString();
  store.transaction(()=>{
    store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',id,email,hashPassword(password),'admin',name,now);
    store.audit(id,'ADMIN_BOOTSTRAP','user',id,{email});
  });
  console.log(`Admin account created for ${email}. Remove the bootstrap password from your shell environment.`);
}catch(e){console.error('Admin bootstrap failed:',e.message);process.exitCode=1}finally{store.close()}

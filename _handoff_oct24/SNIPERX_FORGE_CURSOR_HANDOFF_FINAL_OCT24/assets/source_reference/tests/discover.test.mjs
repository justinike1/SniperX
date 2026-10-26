import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openStore} from '../src/db.mjs';
import {validateMission,changeMission,validateWorker} from '../src/core.mjs';
import {discover,readySnapshot,setWorkerReady} from '../src/discover.mjs';
import {saveJobBatch} from '../src/jobs.mjs';
import {createForgeServer} from '../src/server.mjs';
import {hashPassword} from '../src/security.mjs';

const dir=mkdtempSync(path.join(os.tmpdir(),'forge-fastlane-'));
const store=openStore(path.join(dir,'test.sqlite'));
const now=Date.now();
const created=new Date(now).toISOString();
const ids={};
for(const role of ['admin','buyer','worker']){
 ids[role]=randomUUID();
 store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',ids[role],`${role}@example.invalid`,hashPassword('long-test-password-123456'),role,`${role} tester`,created);
}
function addApproved(title,urgency,category='Content & Copy',scope='Write accessible copy for a fictional demo customer.'){
 const v=validateMission({title,description:scope,category,city:'Dover',buyer:'Example Client',schedule:'Flexible',skills:['Writing'],priceUSD:100});
 assert.equal(v.ok,true,JSON.stringify(v.errors));
 const m=changeMission({...v.value,urgency,estimatedMinutes:60,buyerUserId:ids.buyer,workerUserId:null},'APPROVED',{safetyReviewed:true,reviewNote:'Manually reviewed the simulated test request only.'});
 store.run('INSERT INTO missions VALUES(?,?,?,?,?,?)',m.id,ids.buyer,null,JSON.stringify(store.stripRelations(m)),created,created);
 return m;
}
try{
 await test('empty Fast Lane does not fabricate paying work or career ads',()=>{
  const d=discover(store,{user:{id:ids.worker,role:'worker'}});
  assert.deepEqual(d.missions,[]);assert.deepEqual(d.careers,[]);
  assert.equal(d.inventory.paidToday,0);assert.equal(d.guarantees.sameDayPayment,false);
 });
 const urgent=addApproved('Create copy for a store today','TODAY');
 const soon=addApproved('Prepare draft descriptions soon','NEXT_48H');
 const flexible=addApproved('Draft an online business brochure','FLEXIBLE');
 saveJobBatch(store,[{sourceKey:'greenhouse:sample:17',source:'GREENHOUSE',employer:'Example Company',title:'Marketing Associate',location:'New Jersey',applyURL:'https://job-boards.greenhouse.io/sample/jobs/17',postingUpdatedAt:created,expiresAt:null,sourceBoard:'sample'}],created);
 await test('Today filter shows only buyer-marked demo urgent work, never external career postings',()=>{
  const d=discover(store,{user:{id:ids.worker,role:'worker'},mode:'TODAY',now});
  assert.deepEqual(d.missions.map(x=>x.id),[urgent.id]);assert.equal(d.careers.length,0);
  assert.equal(d.missions[0].realStartPossible,false);assert.equal(d.missions[0].earnTodayGuaranteed,false);
  assert.equal(d.missions[0].fundsCollected,false);assert.equal(d.missions[0].estimatedTimeToPayment,null);
  assert.equal(d.missions[0].opportunityLabel,'TEST MISSION · NOT A PAID JOB');
 });
 await test('Next 48h and All respect urgency without inventing start or payout speeds',()=>{
  const d=discover(store,{user:{id:ids.admin,role:'admin'},mode:'NEXT_48H',now});
  assert.equal(d.missions.length,2);assert.deepEqual(new Set(d.missions.map(x=>x.id)),new Set([urgent.id,soon.id]));
  assert.equal(d.careers.length,0);
  const all=discover(store,{user:{id:ids.buyer,role:'buyer'},mode:'ALL',now});
  assert.equal(all.missions.length,3);assert.equal(all.careers.length,1);
  assert.equal(all.inventory.realForgeMissions,0);
 });
 await test('Sourced careers remain separate and never claim a Forge payment',()=>{
  const d=discover(store,{user:{id:ids.admin,role:'admin'},mode:'CAREERS',now});
  assert.equal(d.missions.length,0);assert.equal(d.careers.length,1);
  const j=d.careers[0];assert.equal(j.kind,'EXTERNAL_CAREER_JOB');
  assert.equal(j.forgePaid,false);assert.equal(j.payAvailable,false);
  assert.equal(j.applicationRequired,true);assert.equal(j.earnTodayGuaranteed,false);
 });
 await test('Search filters only source-backed entries; no fabricated results',()=>{
  const d=discover(store,{user:{id:ids.buyer,role:'buyer'},mode:'ALL',query:'marketing',now});
  assert.equal(d.missions.length,0);assert.equal(d.careers.length,1);
  const z=discover(store,{user:{id:ids.buyer,role:'buyer'},mode:'ALL',query:'this-does-not-exist',now});
  assert.equal(z.careers.length,0);assert.equal(z.missions.length,0);
  assert.throws(()=>discover(store,{user:{id:ids.buyer,role:'buyer'},mode:'INVALID',now}),{status:422});
  assert.throws(()=>discover(store,{user:null,now}),{status:401});
 });
 await test('Self-reported worker availability expires; cannot grant jobs or be set by buyer',()=>{
  const worker={id:ids.worker,role:'worker'},buyer={id:ids.buyer,role:'buyer'};
  assert.throws(()=>setWorkerReady(store,worker,{action:'ON',hours:4},now),{status:409});
  const raw=validateWorker({name:'Example Worker',city:'Dover',schedule:'Flexible',skills:['Writing'],minPayUSD:10,remoteAvailable:true,age18Confirmed:true});
  assert.equal(raw.ok,true);raw.value.verification='DEMO_REVIEWED';
  store.run('INSERT INTO workers VALUES(?,?,?)',worker.id,JSON.stringify({...raw.value,userId:worker.id}),created);
  assert.throws(()=>setWorkerReady(store,buyer,{action:'ON',hours:4},now),{status:403});
  assert.throws(()=>setWorkerReady(store,worker,{action:'ON',hours:999},now),{status:422});
  const active=setWorkerReady(store,worker,{action:'ON',hours:4},now);
  assert.equal(active.active,true);assert.equal(active.independentlyVerified,false);
  assert.equal(readySnapshot(store,worker,now+4*60*60*1000-1).active,true);
  assert.equal(readySnapshot(store,worker,now+4*60*60*1000).active,false);
  const d=discover(store,{user:worker,mode:'TODAY',now});
  assert.equal(d.workerAvailability.active,true);assert.equal(d.missions[0].fit.eligible,true);
  assert.equal(d.missions[0].earnTodayGuaranteed,false);
  assert.equal(setWorkerReady(store,worker,{action:'OFF'},now).active,false);
  assert.equal(readySnapshot(store,worker,now).active,false);
 });
 await test('Fast Lane HTTP routes require authentication and CSRF on availability changes',async()=>{
  const app=createForgeServer({store,dbPath:path.join(dir,'unused.sqlite'),publicOrigin:'http://127.0.0.1:5200'});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${app.server.address().port}`;
  try{
   let r=await fetch(base+'/api/earn/discover?mode=TODAY');assert.equal(r.status,401);
   r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'worker@example.invalid',password:'long-test-password-123456'})});
   assert.equal(r.status,200);const login=await r.json();const cookie=r.headers.get('set-cookie').split(';')[0];
   r=await fetch(base+'/api/earn/discover?mode=TODAY',{headers:{cookie}});assert.equal(r.status,200);
   const feed=await r.json();assert.equal(feed.missions.length,1);
   r=await fetch(base+'/api/earn/availability',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({action:'ON',hours:12})});assert.equal(r.status,403);
   r=await fetch(base+'/api/earn/availability',{method:'POST',headers:{cookie,'content-type':'application/json','x-forge-csrf':login.csrf},body:JSON.stringify({action:'ON',hours:12})});assert.equal(r.status,200);assert.equal((await r.json()).availability.active,true);
   r=await fetch(base+'/api/earn/availability/me',{headers:{cookie}});assert.equal(r.status,200);assert.equal((await r.json()).availability.active,true);
  }finally{await new Promise(resolve=>app.server.close(resolve));/* same store */}
 });
}finally{store.close();rmSync(dir,{recursive:true,force:true});}

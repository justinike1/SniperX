import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openStore} from '../src/db.mjs';
import {quickPost,listMyShiftIntakes} from '../src/quickpost.mjs';
import {discover} from '../src/discover.mjs';
import {createForgeServer} from '../src/server.mjs';
import {hashPassword} from '../src/security.mjs';

const dir=mkdtempSync(path.join(os.tmpdir(),'forge-quickpost-'));
const store=openStore(path.join(dir,'intake.sqlite'));
const users={};const now=new Date().toISOString();
for(const role of ['buyer','worker','admin']){
 const user={id:randomUUID(),role,display_name:`${role} demo`};
 users[role]=user;
 store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',user.id,`${role}@example.invalid`,hashPassword('test-password-really-long!'),role,user.display_name,now);
}
const service={requestType:'SERVICE_PROJECT',title:'Write store inventory descriptions',
 description:'Create a clear document describing eight products using information supplied by the store.',
 city:'Dover, NJ',category:'Content & Copy',urgency:'TODAY',budgetUSD:150,estimatedMinutes:60};
const shift={requestType:'EMPLOYEE_SHIFT',title:'Weekend event check-in assistant',
 description:'Attend a training and help guests check in at a temporary event location.',
 city:'Dover, NJ',employerName:'Test Event Company',urgency:'TODAY',hourlyRateUSD:21,shiftHours:4};
try{
 await test('buyer can fast-post a real-shaped project intake, but nothing is paid or automatically approved',()=>{
  const r=quickPost(store,users.buyer,service);
  assert.equal(r.status,'NEW');assert.equal(r.fundsCollected,false);
  assert.equal(r.visibleInPublicFeed,false);assert.equal(r.laborClassification,'NOT_DETERMINED');
  const m=store.getMission(r.id);
  assert.equal(m.status,'NEW');assert.equal(m.buyerUserId,users.buyer.id);
  assert.equal(m.urgency,'TODAY');assert.equal(m.engagementIntent,'SERVICE_PROJECT');
  assert.equal(m.laborClassification,'NOT_DETERMINED');
  assert.deepEqual(m.skills,['Writing']);
  const feed=discover(store,{user:users.worker,mode:'TODAY'});
  assert.equal(feed.missions.length,0);assert.equal(feed.inventory.paidToday,0);
 });
 await test('buyer can create W-2 shift inquiry, without payroll or public listing',()=>{
  const r=quickPost(store,users.buyer,shift);
  assert.equal(r.status,'LEGAL_AND_PAYROLL_REVIEW');assert.equal(r.withdrawalFeeAvailable,false);
  assert.equal(r.visibleInPublicFeed,false);assert.equal(r.payrollEnabled,false);
  const own=listMyShiftIntakes(store,users.buyer).intakes;
  assert.equal(own.length,1);assert.equal(own[0].status,'LEGAL_AND_PAYROLL_REVIEW');
  assert.equal(own[0].expectedWorkerType,'EMPLOYEE_W2_PROPOSED_NOT_VERIFIED');
  assert.equal(own[0].workerWithdrawalFeesDisabled,true);
  assert.equal(own[0].hourlyRateCents,2100);
  assert.equal(own[0].availableForMatching,false);
  assert.equal(store.one('SELECT count(*) n FROM missions').n,1);
 });
 await test('a worker cannot create customer intake or read private shift inquiries',()=>{
  assert.throws(()=>quickPost(store,users.worker,service),{status:403});
  assert.throws(()=>listMyShiftIntakes(store,users.worker),{status:403});
 });
 await test('service and shift input validation reject missing/unsafe/fake data',()=>{
  assert.throws(()=>quickPost(store,users.buyer,{...service,requestType:'CONTRACTOR_BY_DEFAULT'}),{status:422});
  assert.throws(()=>quickPost(store,users.buyer,{...service,description:'steal account passwords for my store'}),{status:422});
  assert.throws(()=>quickPost(store,users.buyer,{...service,category:'Delivery Driver'}),{status:422});
  assert.throws(()=>quickPost(store,users.buyer,{...shift,shiftHours:25}),{status:422});
  assert.throws(()=>quickPost(store,users.buyer,{...shift,hourlyRateUSD:-10}),{status:422});
  assert.throws(()=>quickPost(store,users.buyer,{...shift,employerName:''}),{status:422});
  assert.throws(()=>quickPost(store,users.buyer,{...shift,urgency:'INSTANT_GUARANTEED'}),{status:422});
 });
 await test('different customers cannot see other customers W-2 shift inquiries',()=>{
  const id=randomUUID();const other={id,role:'buyer',display_name:'Other Company'};
  store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',id,'other@example.invalid',hashPassword('test-password-really-long!'),'buyer',other.display_name,now);
  assert.equal(listMyShiftIntakes(store,other).intakes.length,0);
  assert.equal(listMyShiftIntakes(store,users.admin).intakes.length,1);
 });
 await test('quick-post routes require authenticated session and CSRF; W-2 shifts remain off the board',async()=>{
  const app=createForgeServer({store,publicOrigin:'http://127.0.0.1:5200'});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${app.server.address().port}`;
  try{
   let r=await fetch(url+'/api/earn/shift-intakes');assert.equal(r.status,401);
   r=await fetch(url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'buyer@example.invalid',password:'test-password-really-long!'})});
   assert.equal(r.status,200);const auth=await r.json();const cookie=r.headers.get('set-cookie').split(';')[0];
   r=await fetch(url+'/api/earn/quick-post',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(shift)});assert.equal(r.status,403);
   r=await fetch(url+'/api/earn/quick-post',{method:'POST',headers:{'content-type':'application/json',cookie,'x-forge-csrf':auth.csrf},body:JSON.stringify(shift)});assert.equal(r.status,200);
   const created=await r.json();assert.equal(created.status,'LEGAL_AND_PAYROLL_REVIEW');
   r=await fetch(url+'/api/earn/discover?mode=TODAY',{headers:{cookie}});assert.equal(r.status,200);
   const board=await r.json();assert.equal(board.missions.length,0);
   r=await fetch(url+'/api/earn/shift-intakes',{headers:{cookie}});assert.equal(r.status,200);
   assert.equal((await r.json()).intakes.length,2);
  }finally{await new Promise(resolve=>app.server.close(resolve))}
 });
}finally{store.close();rmSync(dir,{recursive:true,force:true});}

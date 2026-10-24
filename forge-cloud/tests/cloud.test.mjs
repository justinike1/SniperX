import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createForgeServer} from '../src/server.mjs';
import {hashPassword} from '../src/security.mjs';
import {changeMission,validateMission,matchWorkers,reportIncident,splitPayment} from '../src/core.mjs';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'forge-cloud-test-'));
const app=createForgeServer({dbPath:path.join(temporary,'test.sqlite'),publicOrigin:'http://127.0.0.1:5200'});
const now=new Date().toISOString();
const adminId=randomUUID();
app.store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',adminId,'admin@example.invalid',hashPassword('very-long-test-password-123'),'admin','Founder Admin',now);
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const root=`http://127.0.0.1:${app.server.address().port}`;
const clients={};
async function request(p,{as,method='GET',body,csrf=true,origin,headers={}}={}){
 const c=clients[as];
 const h={...headers};if(c)h.Cookie=c.cookie;
 if(body!==undefined)h['Content-Type']='application/json';
 if(csrf&&c&&method==='POST')h['X-Forge-CSRF']=c.csrf;
 if(origin)h.Origin=origin;
 const response=await fetch(root+'/api'+p,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
 let payload=await response.json();return {status:response.status,body:payload,cookie:response.headers.get('set-cookie')};
}
async function login(name,email,password){const r=await request('/auth/login',{method:'POST',body:{email,password}});assert.equal(r.status,200,JSON.stringify(r.body));clients[name]={cookie:r.cookie.split(';')[0],csrf:r.body.csrf};return r}
async function invite(role,email){const r=await request('/admin/invitations',{as:'admin',method:'POST',body:{role,email}});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.invitation}
async function register(role,name){const email=`${name}@example.invalid`,token=await invite(role,email);const r=await request('/auth/register',{method:'POST',body:{invitation:token,email,name:'Test '+name,password:'very-long-test-password-123'}});assert.equal(r.status,200,JSON.stringify(r.body));await login(name,email,'very-long-test-password-123');return r}

try{
 await test('security: session, CSRF, origin, role isolation',async()=>{
  let r=await request('/missions');assert.equal(r.status,401);
  await login('admin','admin@example.invalid','very-long-test-password-123');
  r=await request('/admin/invitations',{as:'admin',method:'POST',body:{role:'buyer',email:'test@example.invalid'},csrf:false});assert.equal(r.status,403);
  r=await request('/admin/invitations',{as:'admin',method:'POST',origin:'https://attacker.invalid',body:{role:'buyer',email:'test@example.invalid'}});assert.equal(r.status,403);
  const asset=await fetch(root+'/app.js');assert.equal(asset.status,200);assert.match(asset.headers.get('content-type'),/javascript/);
  assert.match(asset.headers.get('content-security-policy'),/default-src/);
  const denied=await request('/admin/overview');assert.equal(denied.status,401);
  await register('buyer','buyer1');await register('buyer','buyer2');await register('worker','worker1');
  r=await request('/admin/overview',{as:'buyer1'});assert.equal(r.status,403);
 });
 await test('workflow: authenticated buyer request, administrative review, qualified demo participant, acceptance',async()=>{
  const payload={title:'Prepare short product descriptions',description:'Provide accurate, accessible descriptions for ten customer-provided products.',category:'Content & Copy',city:'Newark',schedule:'Flexible',skills:['Copywriting'],priceUSD:200};
  let r=await request('/missions',{as:'buyer1',method:'POST',body:payload});assert.equal(r.status,200,JSON.stringify(r.body));const id=r.body.mission.id;
  r=await request(`/missions/${id}`,{as:'buyer2'});assert.equal(r.status,404);
  r=await request('/missions',{as:'buyer2'});assert.equal(r.body.missions.length,0);
  r=await request(`/missions/${id}/approve`,{as:'buyer1',method:'POST',body:{note:'I reviewed this thoroughly'}});assert.equal(r.status,403);
  r=await request(`/missions/${id}/approve`,{as:'admin',method:'POST',body:{note:'Content-only remote deliverables. No sensitive data.'}});assert.equal(r.status,200,JSON.stringify(r.body));
  r=await request('/workers/me',{as:'worker1',method:'POST',body:{city:'Hoboken',schedule:'Flexible',skills:['Copywriting'],remoteAvailable:true,minPayUSD:75,age18Confirmed:true}});assert.equal(r.status,200,JSON.stringify(r.body));
  const wid=r.body.worker.userId;
  r=await request(`/missions/${id}/matches`,{as:'admin'});assert.equal(r.status,200);assert.equal(r.body.matches[0].eligible,false);
  r=await request(`/admin/workers/${wid}/review`,{as:'admin',method:'POST',body:{notes:'Reviewed sample work and confirmed that only simulation is allowed.'}});assert.equal(r.status,200);
  r=await request(`/missions/${id}/matches`,{as:'admin'});assert.equal(r.status,200);assert.equal(r.body.matches[0].eligible,true);
  r=await request(`/missions/${id}/assign`,{as:'admin',method:'POST',body:{workerUserId:wid}});assert.equal(r.status,200,JSON.stringify(r.body));
  r=await request(`/missions/${id}/accept`,{as:'buyer1',method:'POST',body:{}});assert.notEqual(r.status,200);
  r=await request(`/missions/${id}/submit`,{as:'worker1',method:'POST',body:{proof:'Delivered all ten product descriptions for review.'}});assert.equal(r.status,200,JSON.stringify(r.body));
  r=await request(`/missions/${id}/accept`,{as:'buyer2',method:'POST',body:{}});assert.equal(r.status,404);
  r=await request(`/missions/${id}/accept`,{as:'buyer1',method:'POST',body:{}});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.paymentCaptured,false);
  const overview=await request('/admin/overview',{as:'admin'});assert.equal(overview.body.summary.completedMissions,1);assert.equal(overview.body.summary.completedGrossCents,20000);
  const audit=await request('/admin/audit',{as:'admin'});assert.ok(audit.body.events.some(x=>x.action==='BUYER_ACCEPTED_SIMULATED'));
 });
 await test('safety hold prevents progression after report, and requests are screened',async()=>{
  const unsafe=await request('/missions',{as:'buyer1',method:'POST',body:{title:'Repair electrical wiring',description:'Use a ladder and handle live electrical wiring in a house.',category:'Content & Copy',city:'Newark',schedule:'Flexible',skills:['Electrician'],priceUSD:350}});assert.equal(unsafe.status,422);
  let r=await request('/missions',{as:'buyer1',method:'POST',body:{title:'Summarize marketing brochure',description:'Rewrite copy from a publicly provided marketing brochure.',category:'Content & Copy',city:'Newark',schedule:'Flexible',skills:['Editing'],priceUSD:60}});assert.equal(r.status,200);const id=r.body.mission.id;
  r=await request(`/missions/${id}/incident`,{as:'buyer1',method:'POST',body:{note:'Customer believes the provided materials are not authorized for reuse.',severity:'HIGH'}});assert.equal(r.status,200);assert.equal(r.body.safetyHold,true);
  r=await request(`/missions/${id}/approve`,{as:'admin',method:'POST',body:{note:'Reviewed and okay for simulation purposes'}});assert.notEqual(r.status,200);
  const denied=await request(`/missions/${id}/incident`,{as:'buyer2',method:'POST',body:{note:'Attempted cross-account interference should fail.',severity:'HIGH'}});assert.equal(denied.status,404);
 });
 await test('validation prevents monetary and eligibility distortions',()=>{
  assert.deepEqual(splitPayment(24900),{totalCents:24900,platformFeeCents:6972,workerPayCents:17928});
  assert.equal(validateMission({}).ok,false);
  const mock=validateMission({title:'Proofread digital documents',description:'Proofread a set of nonconfidential business documents.',buyer:'Demo Customer',city:'Newark',category:'Content & Copy',schedule:'Flexible',skills:['Editing','Copywriting'],priceUSD:125});
  assert.equal(mock.ok,true);
  const eligible=matchWorkers(mock.value,[{id:'x',name:'Worker',city:'Newark',skills:['Editing'],schedule:'Flexible',minPayCents:2000,completedJobs:0}]);assert.equal(eligible[0].eligible,false);
 });
}finally{
 await new Promise(resolve=>app.server.close(resolve));app.store.close();fs.rmSync(temporary,{recursive:true,force:true});
}

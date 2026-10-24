import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createForgeServer} from '../src/server.mjs';
import {hashPassword} from '../src/security.mjs';
import {verificationEligibility} from '../src/verification.mjs';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'forge-verification-'));
const app=createForgeServer({dbPath:path.join(tmp,'tests.sqlite'),publicOrigin:'http://127.0.0.1:5200'});
const ids={admin:randomUUID(),worker:randomUUID(),other:randomUUID(),buyer:randomUUID()};
for(const [k,id] of Object.entries(ids)){
 app.store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',id,k+'@example.invalid',hashPassword('secure-test-passphrase-123'),k==='admin'?'admin':k==='buyer'?'buyer':'worker',k,new Date().toISOString());
}
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+app.server.address().port;
const sessions={};
async function req(endpoint,{user,method='GET',body,csrf=true}={}){
 const h={};if(body!==undefined)h['Content-Type']='application/json';
 if(user){h.Cookie=sessions[user].cookie;if(method==='POST'&&csrf)h['X-Forge-CSRF']=sessions[user].csrf}
 const result=await fetch(base+'/api'+endpoint,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
 return {code:result.status,json:await result.json(),cookie:result.headers.get('set-cookie')};
}
async function logIn(who){const result=await req('/auth/login',{method:'POST',body:{email:who+'@example.invalid',password:'secure-test-passphrase-123'}});assert.equal(result.code,200);sessions[who]={cookie:result.cookie.split(';')[0],csrf:result.json.csrf}}
try{
 await test('login establishes separated admin/participant/buyer sessions',async()=>{
  await Promise.all(Object.keys(ids).map(logIn));
  assert.notEqual(sessions.admin.cookie,sessions.worker.cookie);
 });
 let licenseID,identityID,backgroundID;
 await test('only admin can create verification cases and no client may claim VERIFIED',async()=>{
  let r=await req('/admin/verification/cases',{user:'worker',method:'POST',body:{subjectUserId:ids.worker,kind:'LICENSE',jurisdiction:'NJ',licenseType:'Electrician'}});assert.equal(r.code,403);
  r=await req('/admin/verification/cases',{user:'admin',method:'POST',csrf:false,body:{subjectUserId:ids.worker,kind:'LICENSE',jurisdiction:'NJ',licenseType:'Electrician'}});assert.equal(r.code,403);
  r=await req('/admin/verification/cases',{user:'admin',method:'POST',body:{subjectUserId:ids.worker,kind:'LICENSE',jurisdiction:'NJ',licenseType:'Electrician',status:'VERIFIED'}});assert.equal(r.code,422);
  r=await req('/admin/verification/cases',{user:'admin',method:'POST',body:{subjectUserId:ids.worker,kind:'LICENSE',jurisdiction:'NJ',licenseType:'Electrician'}});
  assert.equal(r.code,200,JSON.stringify(r.json));licenseID=r.json.case.id;
  assert.equal(r.json.case.status,'AWAITING_ACKNOWLEDGEMENT');assert.equal(r.json.case.externallyVerified,false);
 });
 await test('other users never see a participant\'s case',async()=>{
  let r=await req('/verification/me',{user:'other'});assert.equal(r.code,200);assert.equal(r.json.cases.length,0);
  r=await req('/verification/me',{user:'buyer'});assert.equal(r.json.cases.length,0);
  r=await req('/verification/me',{user:'worker'});assert.equal(r.json.cases.length,1);
  r=await req(`/verification/cases/${licenseID}/acknowledge`,{user:'other',method:'POST',body:{acknowledge:true}});assert.equal(r.code,404);
  r=await req('/admin/verification/cases',{user:'worker'});assert.equal(r.code,403);
 });
 await test('acknowledgement is explicitly NOT background-screening authorization',async()=>{
  let r=await req(`/verification/cases/${licenseID}/acknowledge`,{user:'worker',method:'POST',body:{acknowledge:false}});assert.equal(r.code,422);
  r=await req(`/verification/cases/${licenseID}/acknowledge`,{user:'worker',method:'POST',body:{acknowledge:true}});assert.equal(r.code,200);assert.equal(r.json.legalConsent,false);assert.equal(r.json.case.status,'AWAITING_PROVIDER');
  r=await req(`/verification/cases/${licenseID}/acknowledge`,{user:'worker',method:'POST',body:{acknowledge:true}});assert.equal(r.code,409);
 });
 await test('registry URL must be HTTPS and official allowlisted; manual recording never verifies a license',async()=>{
  const future=new Date(Date.now()+365*86400000).toISOString();
  const data={decision:'MANUAL_EVIDENCE_RECORDED',note:'Operator manually inspected the linked New Jersey registry reference.',expiresAt:future};
  let r=await req(`/admin/verification/cases/${licenseID}/review`,{user:'admin',method:'POST',body:{...data,registryURL:'https://nj.gov.evil.example/license'}});assert.equal(r.code,422);
  r=await req(`/admin/verification/cases/${licenseID}/review`,{user:'admin',method:'POST',body:{...data,registryURL:'http://www.nj.gov/check'}});assert.equal(r.code,422);
  r=await req(`/admin/verification/cases/${licenseID}/review`,{user:'worker',method:'POST',body:{...data,registryURL:'https://www.nj.gov/check'}});assert.equal(r.code,403);
  r=await req(`/admin/verification/cases/${licenseID}/review`,{user:'admin',method:'POST',body:{...data,registryURL:'https://www.nj.gov/check'}});assert.equal(r.code,200,JSON.stringify(r.json));assert.equal(r.json.case.status,'MANUAL_EVIDENCE_RECORDED');assert.equal(r.json.externallyVerified,false);assert.equal(r.json.eligibleForRegulatedWork,false);
 });
 await test('cannot forge provider outcomes via operator review payload',async()=>{
  const r=await req(`/admin/verification/cases/${licenseID}/review`,{user:'admin',method:'POST',body:{decision:'VERIFIED',note:'Claimed this is verified by the provider'}});assert.equal(r.code,422);
 });
 await test('background workflow cannot store reports or be manually cleared',async()=>{
  let r=await req('/admin/verification/cases',{user:'admin',method:'POST',body:{subjectUserId:ids.worker,kind:'BACKGROUND',backgroundReport:{arrests:[]}}});assert.equal(r.code,422);
  r=await req('/admin/verification/cases',{user:'admin',method:'POST',body:{subjectUserId:ids.worker,kind:'BACKGROUND'}});assert.equal(r.code,200);backgroundID=r.json.case.id;
  r=await req(`/admin/verification/cases/${backgroundID}/review`,{user:'admin',method:'POST',body:{decision:'MANUAL_EVIDENCE_RECORDED',note:'Never clear a background check based on these notes.',registryURL:'https://www.nj.gov/check',expiresAt:new Date(Date.now()+86400000).toISOString()}});assert.equal(r.code,422);
  r=await req(`/verification/cases/${backgroundID}/acknowledge`,{user:'worker',method:'POST',body:{acknowledge:true}});assert.equal(r.code,200);assert.equal(r.json.legalConsent,false);
  r=await req(`/admin/verification/cases/${backgroundID}/review`,{user:'admin',method:'POST',body:{decision:'REVIEW_REQUIRED',note:'External accredited provider onboarding remains outstanding.'}});assert.equal(r.code,200);assert.equal(r.json.case.status,'REVIEW_REQUIRED');
 });
 await test('identity remains unverified without provider and must be scoped by user',async()=>{
  const r=await req('/admin/verification/cases',{user:'admin',method:'POST',body:{subjectUserId:ids.worker,kind:'IDENTITY'}});
  assert.equal(r.code,200);identityID=r.json.case.id;
  const list=await req('/verification/me',{user:'worker'});assert.equal(list.json.cases.length,3);
  assert.ok(list.json.cases.every(x=>x.externallyVerified===false&&x.consentLegalStatus==='NOT_LEGALLY_AUTHORIZED'));
  assert.equal(list.json.cases.some(x=>'reviewerNote' in x||'registryURL' in x),false);
 });
 await test('regulated-work eligibility remains blocked even after recorded manual evidence',async()=>{
  let r=await req('/verification/me/eligibility',{user:'worker'});assert.equal(r.code,200);assert.equal(r.json.eligibleForRegulatedWork,false);assert.equal(r.json.reasons.length,3);
  assert.equal(verificationEligibility([],{needsIdentity:true,needsLicense:true}).eligibleForRegulatedWork,false);
 });
 await test('audit records exist without retaining background report content',async()=>{
  const audit=await req('/admin/audit',{user:'admin'});assert.equal(audit.code,200);
  assert.ok(audit.json.events.some(x=>x.action==='VERIFICATION_CASE_CREATED'));
  assert.ok(audit.json.events.some(x=>x.action==='VERIFICATION_CASE_REVIEWED'));
  const full=JSON.stringify(audit.json.events);assert.equal(full.includes('arrests'),false);
 });
 await test('verification case states persist across reopening SQLite database',async()=>{
  const stored=app.store.one('SELECT * FROM verification_cases WHERE id=?',licenseID);assert.equal(stored.status,'MANUAL_EVIDENCE_RECORDED');
  assert.ok(stored.acknowledged_at);assert.ok(stored.reviewed_by);
 });
}finally{
 await new Promise(resolve=>app.server.close(resolve));app.store.close();fs.rmSync(tmp,{recursive:true,force:true});
}

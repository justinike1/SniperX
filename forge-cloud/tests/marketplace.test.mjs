import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {INDUSTRIES,SERVICES,serviceById,catalogSummary,searchIndustries,serviceEligibility} from '../src/marketplace.mjs';
import {createForgeServer} from '../src/server.mjs';
import {hashPassword} from '../src/security.mjs';
import {validateMission} from '../src/core.mjs';

test('taxonomy: every industry has unique stable id and actual professions',()=>{
 const ids=INDUSTRIES.map(x=>x.id);
 assert.equal(new Set(ids).size,INDUSTRIES.length);
 assert.ok(INDUSTRIES.length>=25);
 for(const i of INDUSTRIES){assert.ok(i.description.length>12);assert.ok(i.roles.length>=3);assert.equal(i.directForgeAssignmentAllowed,false);}
});
test('taxonomy covers diverse professions, not just digital work',()=>{
 for(const q of ['attorney','pilot','registered nurse','aircraft maintenance','CDL','dentist','teacher','electrician','delivery driver','tutor','software engineer']){
  assert.ok(searchIndustries(q).length>0,`Missing ${q}`);
 }
});
test('search is case-insensitive, capped and no open job claims',()=>{
 assert.ok(searchIndustries('PiLoT').some(x=>x.id==='aviation'));
 assert.equal(searchIndustries('').length,INDUSTRIES.length);
 assert.equal(searchIndustries('',{max:5}).length,5);
 assert.equal(searchIndustries('<script>').length,0);
 assert.equal(catalogSummary().liveForgeMissions,0);
 assert.equal(catalogSummary().worldwideLaunch,false);
});
test('services are explicitly simulated and limited to supported low-risk categories',()=>{
 assert.ok(SERVICES.length>=8);
 assert.equal(new Set(SERVICES.map(s=>s.id)).size,SERVICES.length);
 for(const s of SERVICES){
  assert.ok(['Content & Copy','Digital Setup'].includes(s.category));
  assert.equal(s.acceptingRealOrders,false);assert.equal(s.estimatedPayout,null);
  assert.equal(s.availability,'DEMO_TEMPLATE_ONLY');
  assert.equal(s.regulatedWork,false);assert.ok(s.skills.length>=1);
  assert.equal(s.realPaymentEnabled,false);
 }
});
test('every proposed template passes mission safety input validation',()=>{
 for(const t of SERVICES){
  const v=validateMission({title:t.title,description:t.exampleBrief,category:t.category,city:'Newark',schedule:'Flexible',skills:[...t.skills],priceUSD:125,buyer:'Example buyer'});
  assert.equal(v.ok,true,`${t.id}: ${JSON.stringify(v.errors)}`);
 }
});
test('eligibility never grants regulated or live assignments',()=>{
 assert.equal(serviceEligibility('unknown').eligible,false);
 assert.equal(serviceEligibility('product-copy',{kind:'regulated',verified:true}).eligible,false);
 assert.equal(serviceEligibility('product-copy',{kind:'digital',verified:true}).reason,'LIVE_DISPATCH_NOT_LAUNCHED');
 assert.equal(serviceEligibility('product-copy',{kind:'digital',verified:false}).eligible,false);
 assert.equal(serviceById('data-cleanup').category,'Digital Setup');
});
test('API endpoints require login and never claim live payouts or vacancies',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'forge-marketplace-'));
 const app=createForgeServer({dbPath:path.join(tmp,'app.sqlite'),publicOrigin:'http://127.0.0.1:5200'});
 try{
  const email='founder@example.invalid',pwd='v08-long-unique-testing-password';
  app.store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',randomUUID(),email,hashPassword(pwd),'admin','Test Founder',new Date().toISOString());
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const root=`http://127.0.0.1:${app.server.address().port}`;
  let r=await fetch(root+'/api/catalog');assert.equal(r.status,401);
  r=await fetch(root+'/api/services');assert.equal(r.status,401);
  const auth=await fetch(root+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pwd})});
  assert.equal(auth.status,200);const cookie=auth.headers.get('set-cookie').split(';')[0];
  r=await fetch(root+'/api/catalog',{headers:{Cookie:cookie}});assert.equal(r.status,200);
  const industryData=await r.json();assert.equal(industryData.industries.length,INDUSTRIES.length);
  assert.equal(industryData.summary.liveForgeMissions,0);
  assert.equal(industryData.allCareerListingsExternal,true);
  r=await fetch(root+'/api/services',{headers:{Cookie:cookie}});assert.equal(r.status,200);
  const serviceData=await r.json();assert.equal(serviceData.services.length,SERVICES.length);
  assert.equal(serviceData.realOrdersAccepted,false);
  r=await fetch(root+'/api/jobs',{headers:{Cookie:cookie}});assert.equal(r.status,200);
  assert.equal((await r.json()).jobs.length,0);
 }finally{
  if(app.server.listening)await new Promise(resolve=>app.server.close(resolve));
  app.store.close();fs.rmSync(tmp,{recursive:true,force:true});
 }
});

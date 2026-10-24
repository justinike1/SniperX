import test from 'node:test';
import assert from 'node:assert/strict';
import {getGreenhouseJobs,getUSAJobs,saveJobBatch,listCurrentJobs,refreshJobs} from '../src/jobs.mjs';
import {openStore} from '../src/db.mjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'forge-jobs-'));const store=openStore(path.join(dir,'jobs.sqlite'));
try{
 await test('Greenhouse official feed returns provenance-linked jobs and rejects untrusted destinations',async()=>{
  const fetchImpl=async uri=>({ok:true,json:async()=>uri.endsWith('/jobs')?{jobs:[{id:42,title:'Remote Content Editor',location:{name:'Remote'},updated_at:'2026-10-23T12:00:00Z',absolute_url:'https://job-boards.greenhouse.io/exampleorg/jobs/42'},{id:43,title:'Suspicious link',absolute_url:'javascript:alert(1)'},{id:44,title:'Phishing lookalike',absolute_url:'https://job-boards.greenhouse.io.evil.example/jobs/44'}]}:{name:'Example Employer'}});
  const jobs=await getGreenhouseJobs('exampleorg',fetchImpl);assert.equal(jobs.length,1);assert.equal(jobs[0].employer,'Example Employer');assert.equal(jobs[0].sourceKey,'greenhouse:exampleorg:42');
  assert.equal(saveJobBatch(store,jobs),1);
  const results=listCurrentJobs(store);assert.equal(results.length,1);assert.equal(results[0].verification,'SOURCE_RETRIEVED_NOT_EMPLOYER_VERIFIED');
  assert.equal(results[0].forgePaid,false);
 });
 await test('USAJOBS requires official credentialed source and stores direct official listings',async()=>{
  const fetchImpl=async(url,opts)=>{assert.equal(opts.headers['Authorization-Key'],'test-key');return {ok:true,json:async()=>({SearchResult:{SearchResultItems:[{MatchedObjectDescriptor:{PositionID:'J001',PositionTitle:'Program Assistant',OrganizationName:'Example Agency',PositionLocationDisplay:'NJ',PositionURI:'https://www.usajobs.gov/job/123',PublicationStartDate:'2026-10-22',ApplicationCloseDate:'2026-11-05'}}]}})}};
  const jobs=await getUSAJobs({apiKey:'test-key',userAgent:'user@example.invalid'},fetchImpl);assert.equal(jobs.length,1);assert.equal(jobs[0].source,'USAJOBS');saveJobBatch(store,jobs);assert.equal(listCurrentJobs(store).length,2);
 });
 await test('stale jobs and expired jobs are never shown as active',()=>{
  const past='2025-01-01T00:00:00Z';saveJobBatch(store,[{sourceKey:'test:expired',source:'USAJOBS',employer:'Example',title:'Expired opening',location:'NJ',applyURL:'https://example.org/expired',postingUpdatedAt:past,expiresAt:past,sourceBoard:'test'}]);
  assert.equal(listCurrentJobs(store).some(x=>x.title==='Expired opening'),false);
  assert.equal(listCurrentJobs(store,{now:Date.parse('2027-02-01T00:00:00Z')}).length,0);
 });
 await test('unconfigured external feeds return zero jobs rather than invented data',async()=>{
  const r=await refreshJobs(store,{env:{},fetchImpl:()=>{throw Error('Should not fetch')}});assert.equal(r.configuredSources,0);assert.equal(r.count,0);
 });
}finally{store.close();fs.rmSync(dir,{recursive:true,force:true})}

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const workdir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function availablePort(){
 const server=net.createServer();await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}
async function startServer(port,stateDir){
 const child=spawn(process.execPath,['server.mjs'],{cwd:workdir,env:{...process.env,FORGE_PORT:String(port),FORGE_STATE_DIR:stateDir},stdio:['ignore','pipe','pipe']});
 let output=''; child.stdout.on('data',buf=>output+=String(buf));child.stderr.on('data',buf=>output+=String(buf));
 const base=`http://127.0.0.1:${port}`;
 for(let attempt=0;attempt<80;attempt++){
  if(child.exitCode!==null)throw new Error(`Server exited: ${output}`);
  try{const res=await fetch(`${base}/api/forge/health`);if(res.ok)return {child,base};}catch{}
  await new Promise(resolve=>setTimeout(resolve,60));
 }
 child.kill();throw new Error(`Server did not become healthy: ${output}`);
}
async function stopServer(child){
 if(child.exitCode!==null)return;
 child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,2000))]);
}
let token='';
async function getToken(base){const html=await (await fetch(base+'/')).text();const m=html.match(/name=\"forge-csrf\" content=\"([a-f0-9]+)\"/);if(!m)throw Error('CSRF token missing');return m[1]}
async function post(base,route,body){const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Forge-CSRF':token},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}

test('API end-to-end creation, matching, state progression, persistence and readiness',async()=>{
 const stateDir=await mkdtemp(path.join(os.tmpdir(),'forge-api-'));
 const port=await availablePort();let running;
 try{
  running=await startServer(port,stateDir);
  const base=running.base;token=await getToken(base);
  const healthResponse=await fetch(base+'/api/forge/health');
  const health=await healthResponse.json();
  assert.equal(health.realPayments,false);
  assert.equal(health.realDispatch,false);
  assert.equal(health.publicLaunchReady,false);
  assert.equal(healthResponse.headers.get('x-frame-options'),'DENY');
  const safety=await (await fetch(base+'/api/forge/safety')).json();
  assert.equal(safety.identityVerification,false);
  assert.equal(safety.publicLaunchReady,false);
  assert.ok(safety.launchBlockers.length>=7);
  const hostCode=await new Promise((resolve,reject)=>{const rq=http.request({hostname:'127.0.0.1',port,path:'/api/forge/health',headers:{Host:'untrusted.example'}},rs=>{rs.resume();resolve(rs.statusCode)});rq.once('error',reject);rq.end()});
  assert.equal(hostCode,403);
  const tooLarge=await fetch(base+'/api/forge/reset',{method:'POST',headers:{'Content-Type':'application/json','X-Forge-CSRF':token},body:JSON.stringify({notes:'x'.repeat(17000)})});
  assert.equal(tooLarge.status,413);

  const intel=await (await fetch(base+'/api/forge/intelligence')).json();
  assert.equal(intel.sandbox,true);assert.ok(intel.activeRequests>=1);
  const bad=await post(base,'/api/forge/missions',{title:'short'});assert.equal(bad.status,422);
  const csrf=await fetch(base+'/api/forge/reset',{method:'POST',headers:{'Content-Type':'application/json','X-Forge-CSRF':token,'Origin':'https://unrelated.example'},body:'{}'});assert.equal(csrf.status,403);
  const invalidType=await fetch(base+'/api/forge/reset',{method:'POST',headers:{'Content-Type':'text/plain','X-Forge-CSRF':token},body:'{}'});assert.equal(invalidType.status,415);
  const unauth=await fetch(base+'/api/forge/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(unauth.status,403);
  const rejected=await post(base,'/api/forge/missions',{title:'Clean asbestos from the commercial basement',description:'Clean asbestos waste safely from the building basement.',buyer:'Demo Customer',city:'Rutherford, NJ',category:'Local Admin',schedule:'Weekend',skills:['Asbestos'],priceUSD:240});assert.equal(rejected.status,422);
  const request=await post(base,'/api/forge/missions',{title:'Photograph a local shop for launch',description:'Produce twelve well lit photos for approval by the fictional buyer.',buyer:'Sample Customer',city:'Rutherford, NJ',category:'Business Photos',schedule:'Weekend',skills:['Photography'],priceUSD:240});
  assert.equal(request.status,201);const id=request.data.mission.id;
  const readiness=await (await fetch(`${base}/api/forge/missions/${id}/analysis`)).json();
  assert.equal(readiness.requiresHumanVerification,true);
  assert.ok(readiness.eligibleCount>=1);
  const approve=await post(base,`/api/forge/missions/${id}/transition`,{status:'APPROVED',safetyReviewed:true,reviewNote:'Sandbox scope review only; no real work authorization.'});assert.equal(approve.status,200);
  const matches=await (await fetch(`${base}/api/forge/missions/${id}/matches`)).json();
  const worker=matches.matches.find(x=>x.eligible);assert.ok(worker);
  const assign=await post(base,`/api/forge/missions/${id}/transition`,{status:'ASSIGNED',workerId:worker.workerId});assert.equal(assign.status,200);
  const illegal=await post(base,`/api/forge/missions/${id}/transition`,{status:'COMPLETED',buyerAccepted:true});assert.equal(illegal.status,400);
  const submit=await post(base,`/api/forge/missions/${id}/transition`,{status:'SUBMITTED',proofNote:'Photographs and organized gallery uploaded for customer review.'});assert.equal(submit.status,200);
  const finish=await post(base,`/api/forge/missions/${id}/transition`,{status:'COMPLETED',buyerAccepted:true});assert.equal(finish.status,200);
  const snapshot=await (await fetch(base+'/api/forge')).json();assert.ok(snapshot.summary.completedMissions>=1);
  const issue=await post(base,`/api/forge/missions/${snapshot.missions.find(x=>x.status==='APPROVED').id}/incident`,{severity:'CRITICAL',note:'A serious simulated safety concern was reported'});assert.equal(issue.status,200);assert.equal(issue.data.safetyHold,true);
  const frozen=await post(base,`/api/forge/missions/${issue.data.mission.id}/transition`,{status:'ASSIGNED'});assert.equal(frozen.status,400);
  assert.match(frozen.data.error,/SAFETY_HOLD/);
  await stopServer(running.child);
  running=await startServer(port,stateDir);
  const restored=await (await fetch(base+'/api/forge')).json();assert.equal(restored.missions.find(x=>x.id===id).status,'COMPLETED');
 }finally{if(running)await stopServer(running.child);await rm(stateDir,{force:true,recursive:true});}
});

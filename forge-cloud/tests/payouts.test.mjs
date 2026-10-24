import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createForgeServer} from '../src/server.mjs';
import {hashPassword} from '../src/security.mjs';
import {payoutQuote} from '../src/payouts.mjs';

const password='a-well-protected-test-account-password';
async function scenario(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'forge-payouts-test-'));
  const dbPath=path.join(dir,'test.sqlite');
  const app=createForgeServer({dbPath,publicOrigin:'http://127.0.0.1:5200'});
  const adminId=randomUUID();
  app.store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',adminId,'admin@example.invalid',hashPassword(password),'admin','Demo Operator',new Date().toISOString());
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const root=`http://127.0.0.1:${app.server.address().port}`;
  const clients=new Map();
  async function api(path,{as,body,method='GET',csrf=true}={}){
    const client=clients.get(as),headers={};if(client)headers.cookie=client.cookie;
    if(body!==undefined)headers['content-type']='application/json';
    if(client&&method==='POST'&&csrf)headers['x-forge-csrf']=client.csrf;
    const response=await fetch(root+'/api'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};
  }
  async function login(alias,email){const r=await api('/auth/login',{method:'POST',body:{email,password}});assert.equal(r.status,200,JSON.stringify(r.body));clients.set(alias,{csrf:r.body.csrf,cookie:r.cookie.split(';')[0]});}
  async function register(role,alias){
    const email=`${alias}@example.invalid`;
    const invited=await api('/admin/invitations',{as:'admin',method:'POST',body:{email,role}});
    assert.equal(invited.status,200,JSON.stringify(invited.body));
    const created=await api('/auth/register',{method:'POST',body:{invitation:invited.body.invitation,name:`Test ${alias}`,email,password}});
    assert.equal(created.status,200,JSON.stringify(created.body));await login(alias,email);
  }
  async function postMission(priceUSD=100){
    const r=await api('/missions',{as:'buyer',method:'POST',body:{title:'Proofread marketing product descriptions',description:'Proofread the provided marketing text in a shared business document, checking typos and clarity.',category:'Content & Copy',city:'Newark',schedule:'Flexible',skills:['Editing'],priceUSD}});
    assert.equal(r.status,200,JSON.stringify(r.body));return r.body.mission.id;
  }
  async function completeMission(id,workerAlias='worker',fund=true){
    if(fund){const f=await api(`/admin/sandbox/missions/${id}/fund`,{as:'admin',method:'POST',body:{}});assert.equal(f.status,200,JSON.stringify(f.body));}
    const a=await api(`/missions/${id}/approve`,{as:'admin',method:'POST',body:{note:'Reviewed the sample text and accept only safe demo workflows.'}});assert.equal(a.status,200,JSON.stringify(a.body));
    const workerProfile=await api('/workers/me',{as:workerAlias,method:'GET'});
    if(!workerProfile.body.worker){
      const w=await api('/workers/me',{as:workerAlias,method:'POST',body:{city:'Newark',schedule:'Flexible',skills:['Editing'],remoteAvailable:true,minPayUSD:10,age18Confirmed:true}});assert.equal(w.status,200,JSON.stringify(w.body));
      const v=await api(`/admin/workers/${w.body.worker.userId}/review`,{as:'admin',method:'POST',body:{notes:'Review of sandbox test profile; no real identity confirmation.'}});assert.equal(v.status,200,JSON.stringify(v.body));
    }
    const p=await api('/workers/me',{as:workerAlias});
    const assigned=await api(`/missions/${id}/assign`,{as:'admin',method:'POST',body:{workerUserId:p.body.worker.userId}});assert.equal(assigned.status,200,JSON.stringify(assigned.body));
    const submitted=await api(`/missions/${id}/submit`,{as:workerAlias,method:'POST',body:{proof:'Finished editing the entire demo document with clear corrections.'}});assert.equal(submitted.status,200,JSON.stringify(submitted.body));
    return api(`/missions/${id}/accept`,{as:'buyer',method:'POST',body:{}});
  }
  try{
    await test('quote is exact integer money, with standard zero and clearly disclosed instant fee',()=>{
      assert.deepEqual(payoutQuote(10000,'STANDARD').feeCents,0);
      const quote=payoutQuote(10000,'INSTANT');assert.equal(quote.feeCents,150);assert.equal(quote.netCents,9850);assert.equal(quote.liveTransferPossible,false);
      assert.equal(payoutQuote(500,'INSTANT').feeCents,50);
      assert.throws(()=>payoutQuote(1,'INSTANT'));assert.throws(()=>payoutQuote(500.1,'STANDARD'));assert.throws(()=>payoutQuote(500,'WIRE'));
    });
    await login('admin','admin@example.invalid');await register('buyer','buyer');await register('worker','worker');await register('worker','other');
    await test('wallet routes require worker role and CSRF; no funds exist initially',async()=>{
      assert.equal((await api('/wallet/me')).status,401);
      assert.equal((await api('/wallet/me',{as:'buyer'})).status,403);
      assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,0);
      assert.equal((await api('/wallet/payouts',{as:'worker',method:'POST',csrf:false,body:{amountCents:500,method:'STANDARD',idempotencyKey:'test-request-000001'}})).status,403);
      assert.equal((await api('/wallet/payouts',{as:'worker',method:'POST',body:{amountCents:500,method:'STANDARD',idempotencyKey:'test-request-000001'}})).status,409);
    });
    await test('unfunded completed test job earns NO simulated wallet credit',async()=>{
      const id=await postMission(100);const done=await completeMission(id,'worker',false);assert.equal(done.status,200,JSON.stringify(done.body));
      assert.equal(done.body.sandboxEarnings.released,false);assert.equal(done.body.paymentCaptured,false);
      assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,0);
    });
    await test('admin alone records test funding; price cannot be changed or funded twice',async()=>{
      const id=await postMission(100);
      assert.equal((await api(`/admin/sandbox/missions/${id}/fund`,{as:'buyer',method:'POST',body:{}})).status,403);
      const f=await api(`/admin/sandbox/missions/${id}/fund`,{as:'admin',method:'POST',body:{amountCents:999999}});
      assert.equal(f.status,200,JSON.stringify(f.body));assert.equal(f.body.totalCents,10000);
      assert.equal(f.body.workerPayCents,7200);assert.equal(f.body.realFundsReceived,false);
      assert.equal((await api(`/admin/sandbox/missions/${id}/fund`,{as:'admin',method:'POST',body:{}})).status,409);
      const r=await completeMission(id,'worker',false);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.sandboxEarnings.released,true);
      const wallet=await api('/wallet/me',{as:'worker'});assert.equal(wallet.body.balanceCents,7200);
      assert.equal(wallet.body.ledger.length,1);
      assert.equal((await api('/wallet/me',{as:'other'})).body.balanceCents,0);
      const again=await api(`/missions/${id}/accept`,{as:'buyer',method:'POST',body:{}});
      assert.equal(again.status,409);assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,7200);
    });
    await test('idempotent instant payout deducts only once, quote includes fee and no bank transfer',async()=>{
      const key='instant-req-abc-00001';
      const quote=await api('/wallet/quote',{as:'worker',method:'POST',body:{method:'INSTANT',amountCents:7000}});
      assert.equal(quote.status,200);assert.equal(quote.body.feeCents,105);assert.equal(quote.body.netCents,6895);
      const data={amountCents:7000,method:'INSTANT',idempotencyKey:key};
      const sent=await api('/wallet/payouts',{as:'worker',method:'POST',body:data});
      assert.equal(sent.status,200,JSON.stringify(sent.body));assert.equal(sent.body.bankTransferInitiated,false);assert.equal(sent.body.payout.status,'REQUESTED_SIMULATED');
      const repeated=await api('/wallet/payouts',{as:'worker',method:'POST',body:data});assert.equal(repeated.status,200);assert.equal(repeated.body.duplicate,true);
      assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,200);
      assert.equal((await api('/wallet/payouts',{as:'worker',method:'POST',body:{amountCents:600,method:'STANDARD',idempotencyKey:'standard-req-abc-00001'}})).status,409);
      assert.equal((await api('/wallet/payouts',{as:'worker',method:'POST',body:{amountCents:6500,method:'INSTANT',idempotencyKey:key}})).status,409);
      assert.equal((await api('/wallet/me',{as:'other'})).body.payouts.length,0);
      const noBuyer=await api(`/admin/sandbox/payouts/${sent.body.payout.id}/settle`,{as:'buyer',method:'POST',body:{outcome:'PAID_SIMULATED'}});assert.equal(noBuyer.status,403);
      const paid=await api(`/admin/sandbox/payouts/${sent.body.payout.id}/settle`,{as:'admin',method:'POST',body:{outcome:'PAID_SIMULATED'}});assert.equal(paid.status,200);assert.equal(paid.body.bankTransferCompleted,false);
      assert.equal((await api(`/admin/sandbox/payouts/${sent.body.payout.id}/settle`,{as:'admin',method:'POST',body:{outcome:'FAILED_SIMULATED'}})).status,409);
      assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,200);
    });
    await test('standard payout has no speed fee; simulated failure restores precisely once',async()=>{
      const id=await postMission(50);await completeMission(id,'worker',true);
      assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,3800); // 200 remainder + 3600
      const data={amountCents:3000,method:'STANDARD',idempotencyKey:'standard-req-abc-00002'};
      const requested=await api('/wallet/payouts',{as:'worker',method:'POST',body:data});assert.equal(requested.status,200);assert.equal(requested.body.payout.netCents,3000);assert.equal(requested.body.payout.feeCents,0);
      assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,800);
      const failPayout=await api(`/admin/sandbox/payouts/${requested.body.payout.id}/settle`,{as:'admin',method:'POST',body:{outcome:'FAILED_SIMULATED'}});
      assert.equal(failPayout.status,200);assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,3800);
      assert.equal((await api(`/admin/sandbox/payouts/${requested.body.payout.id}/settle`,{as:'admin',method:'POST',body:{outcome:'FAILED_SIMULATED'}})).status,409);
      assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,3800);
    });
    await test('cancelling a funded mission voids the test allocation without crediting any worker',async()=>{
      const id=await postMission(25);
      const f=await api(`/admin/sandbox/missions/${id}/fund`,{as:'admin',method:'POST',body:{}});
      assert.equal(f.status,200);
      const previous=(await api('/wallet/me',{as:'worker'})).body.balanceCents;
      const cancelled=await api(`/missions/${id}/cancel`,{as:'buyer',method:'POST',body:{reason:'The sample work was no longer needed.'}});
      assert.equal(cancelled.status,200,JSON.stringify(cancelled.body));
      assert.equal(cancelled.body.sandboxFunding.voided,true);
      assert.equal(cancelled.body.sandboxFunding.realRefundIssued,false);
      assert.equal((await api('/wallet/me',{as:'worker'})).body.balanceCents,previous);
      assert.equal((await api(`/admin/sandbox/missions/${id}/fund`,{as:'admin',method:'POST',body:{}})).status,409);
      assert.equal(app.store.one('SELECT status FROM sandbox_mission_funding WHERE mission_id=?',id).status,'VOIDED_SIMULATED');
    });
    await test('safety holds prevent test funding and earnings release',async()=>{
      const id=await postMission(100);
      const hold=await api(`/missions/${id}/incident`,{as:'buyer',method:'POST',body:{note:'Found that this description may involve confidential customer data.',severity:'HIGH'}});
      assert.equal(hold.status,200);
      assert.equal((await api(`/admin/sandbox/missions/${id}/fund`,{as:'admin',method:'POST',body:{}})).status,409);
    });
    await test('test wallet is durable and accounting sums to ledger balances',async()=>{
      const w=await api('/wallet/me',{as:'worker'});
      const balance=w.body.ledger.reduce((a,e)=>a+e.amount_cents,0);assert.equal(w.body.balanceCents,balance);
      assert.equal(w.body.payouts.length,2);
      const count=app.store.one('SELECT COUNT(*) AS n FROM sandbox_wallet_ledger WHERE worker_user_id=(SELECT id FROM users WHERE email=?)','worker@example.invalid').n;
      assert.equal(count,w.body.ledger.length);
      const persisted=app.store.one('SELECT COUNT(*) AS n FROM sandbox_payouts').n;assert.equal(persisted,2);
      assert.equal((await api('/admin/audit',{as:'admin'})).body.events.some(e=>e.action==='SANDBOX_PAYOUT_REQUESTED'),true);
    });
  }finally{
    await new Promise(resolve=>app.server.close(resolve));app.store.close();fs.rmSync(dir,{recursive:true,force:true});
  }
}
await scenario();

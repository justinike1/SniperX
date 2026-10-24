import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHmac} from 'node:crypto';
import {createForgeServer} from '../src/server.mjs';
import {hashPassword} from '../src/security.mjs';
import {makeStripeTestClient,verifyStripeTestEvent,applyStripeTestEvent} from '../src/stripe_test.mjs';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'forge-stripe-test-'));
const password='extremely-secure-private-test-password';
const webhookSecret='whsec_test_dummy_signature_signing_secret';
const customerId=randomUUID();
const fakeCheckoutID='cs_test_1234567890example';
let checkoutCalls=0;
let mockShouldFail=false;
const fakeFetch=async (url,opts)=>{
  checkoutCalls++;
  assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
  assert.match(opts.headers.Authorization,/^Bearer sk_test_/);
  const parsed=new URLSearchParams(opts.body);
  assert.equal(parsed.get('mode'),'payment');
  assert.equal(parsed.get('payment_method_types[0]'),'card');
  assert.equal(parsed.get('metadata[forge_test_mission_id]'),parsed.get('client_reference_id'));
  assert.ok(parsed.get('success_url').includes('{CHECKOUT_SESSION_ID}'));
  assert.equal(opts.headers['Idempotency-Key'],`forge-test-checkout-${parsed.get('client_reference_id')}`);
  if(mockShouldFail)return {ok:false,json:async()=>({error:{message:'Simulated temporary failure'}})};
  return {ok:true,json:async()=>({id:fakeCheckoutID,url:`https://checkout.stripe.com/c/pay/${fakeCheckoutID}`,livemode:false,currency:'usd',amount_total:9000})};
};
const client=makeStripeTestClient({secretKey:'sk_test_not_a_real_key',fetchImpl:fakeFetch});
const app=createForgeServer({dbPath:path.join(tmp,'test.sqlite'),publicOrigin:'http://127.0.0.1:5200',stripeTestClient:client,stripeWebhookSecret:webhookSecret});
const userId=randomUUID(),adminId=randomUUID();
app.store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',userId,'buyer@example.invalid',hashPassword(password),'buyer','Forge Test Buyer',new Date().toISOString());
app.store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',customerId,'worker@example.invalid',hashPassword(password),'worker','Forge Test Worker',new Date().toISOString());
app.store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',adminId,'admin@example.invalid',hashPassword(password),'admin','Forge Test Admin',new Date().toISOString());
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const root=`http://127.0.0.1:${app.server.address().port}`;
let buyer={};let missionId;
async function api(url,{as,method='GET',data,headers={}}={}){
  let h={...headers};if(as?.cookie)h.Cookie=as.cookie;
  if(data!==undefined){h['Content-Type']='application/json';}
  if(as?.csrf&&method==='POST'&&!('X-Forge-CSRF' in h))h['X-Forge-CSRF']=as.csrf;
  const res=await fetch(root+'/api'+url,{method,headers:h,body:data===undefined?undefined:JSON.stringify(data)});
  return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')};
}
function sign(raw,{timestamp=Math.floor(Date.now()/1000),secret=webhookSecret}={}){
  const signature=createHmac('sha256',secret).update(`${timestamp}.`).update(raw).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
async function webhook(event,{signature,raw}={}){
  const payload=raw||JSON.stringify(event);
  const res=await fetch(root+'/api/webhooks/stripe-test',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':signature||sign(payload)},body:payload});
  return {status:res.status,body:await res.json()};
}
function event({id='evt_test_event_123456',type='checkout.session.completed',amount=9000,paid='paid',live=false,sessionId=fakeCheckoutID,mission=missionId}={}){
  return {id,type,livemode:live,data:{object:{id:sessionId,object:'checkout.session',livemode:live,client_reference_id:mission,metadata:{forge_test_mission_id:mission},amount_total:amount,currency:'usd',payment_status:paid}}};
}
try{
  await test('rejects all live-mode Stripe API keys and nonofficial endpoints',()=>{
    assert.throws(()=>makeStripeTestClient({secretKey:'sk_live_DANGER'}),/Only sk_test_/);
    assert.throws(()=>makeStripeTestClient({secretKey:'sk_test_valid',apiBase:'http://localhost:1'}),/official/);
  });
  await test('checks signature timestamp, signature and live-mode webhook bans',()=>{
    const raw=Buffer.from(JSON.stringify(event({mission:'test-mission-id'})));
    assert.equal(verifyStripeTestEvent(raw,sign(raw),webhookSecret).livemode,false);
    assert.throws(()=>verifyStripeTestEvent(raw,sign(raw,{timestamp:Math.floor(Date.now()/1000)-1000}),webhookSecret),/timestamp/);
    assert.throws(()=>verifyStripeTestEvent(Buffer.from('changed'),sign(raw),webhookSecret),/signature/);
    const live=Buffer.from(JSON.stringify(event({mission:'test-mission-id',live:true})));
    assert.throws(()=>verifyStripeTestEvent(live,sign(live),webhookSecret),/Live Stripe events/);
  });
  await test('buyer creates a test-only mission; unauthorized buyer cannot checkout',async()=>{
    const login=await api('/auth/login',{method:'POST',data:{email:'buyer@example.invalid',password}});
    assert.equal(login.status,200);buyer={cookie:login.cookie.split(';')[0],csrf:login.body.csrf};
    const created=await api('/missions',{as:buyer,method:'POST',data:{title:'Proofread draft product descriptions',description:'Proofread twenty short product descriptions for clarity and typos only.',category:'Content & Copy',city:'Newark',schedule:'Flexible',skills:['Editing'],priceUSD:90}});
    assert.equal(created.status,200,JSON.stringify(created.body));missionId=created.body.mission.id;
    assert.equal((await api(`/missions/${missionId}/test-checkout`,{method:'POST',data:{}})).status,401);
    assert.equal((await api(`/missions/${missionId}/test-checkout`,{as:buyer,method:'POST',data:{},headers:{'X-Forge-CSRF':'bad'}})).status,403);
    assert.equal((await api('/admin/stripe-test/summary',{as:buyer})).status,403);
  });
  await test('test checkout fails closed, then safely retries with same Stripe idempotency key',async()=>{
    mockShouldFail=true;
    const bad=await api(`/missions/${missionId}/test-checkout`,{as:buyer,method:'POST',data:{}});
    assert.equal(bad.status,503);
    assert.equal(app.store.one('SELECT status FROM stripe_test_checkout_sessions WHERE mission_id=?',missionId).status,'CREATE_FAILED_TEST');
    mockShouldFail=false;
    const good=await api(`/missions/${missionId}/test-checkout`,{as:buyer,method:'POST',data:{}});
    assert.equal(good.status,200,JSON.stringify(good.body));
    assert.equal(good.body.mode,'STRIPE_TEST_ONLY');
    assert.equal(good.body.realPaymentCollected,false);
    assert.equal(good.body.workerPayoutEnabled,false);
    assert.equal(good.body.amountCents,9000);
    assert.ok(good.body.url.startsWith('https://checkout.stripe.com/'));
    assert.equal(checkoutCalls,2);
    const duplicate=await api(`/missions/${missionId}/test-checkout`,{as:buyer,method:'POST',data:{}});
    assert.equal(duplicate.status,200);
    assert.equal(duplicate.body.duplicate,true);
    assert.equal(checkoutCalls,2);
    const status=await api(`/missions/${missionId}/test-checkout/status`,{as:buyer});
    assert.equal(status.status,200);
    assert.equal(status.body.checkout.status,'OPEN_TEST');
  });
  await test('webhook authentication is mandatory; modified signatures fail',async()=>{
    const evt=event();const raw=JSON.stringify(evt);
    const bad=await webhook(evt,{signature:sign(raw,{secret:'whsec_wrong_secret'})});
    assert.equal(bad.status,400);
    const live=await webhook(event({live:true}));assert.equal(live.status,400);
    assert.equal(app.store.one('SELECT status FROM stripe_test_checkout_sessions WHERE mission_id=?',missionId).status,'OPEN_TEST');
  });
  await test('paid webhook must match session ID, mission, currency, and amount',async()=>{
    const invalid=await webhook(event({id:'evt_wrong_amount_456',amount:8999}));
    assert.equal(invalid.status,200);
    assert.equal(invalid.body.accepted,false);
    const wrong=await webhook(event({id:'evt_wrong_id_456',sessionId:'cs_test_different'}));
    assert.equal(wrong.status,200);
    assert.equal(wrong.body.accepted,false);
    assert.equal(app.store.one('SELECT status FROM stripe_test_checkout_sessions WHERE mission_id=?',missionId).status,'OPEN_TEST');
    const unpaid=await webhook(event({id:'evt_not_paid_456',paid:'unpaid'}));
    assert.equal(unpaid.body.accepted,false);
    assert.equal(app.store.one('SELECT status FROM stripe_test_checkout_sessions WHERE mission_id=?',missionId).status,'OPEN_TEST');
  });
  await test('valid Stripe TEST webhook confirms test checkout, but never funds a worker',async()=>{
    const evt=event();
    const first=await webhook(evt);assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(first.body.accepted,true);
    const replay=await webhook(evt);assert.equal(replay.status,200);assert.equal(replay.body.duplicate,true);
    assert.equal(app.store.one('SELECT status FROM stripe_test_checkout_sessions WHERE mission_id=?',missionId).status,'PAID_TEST');
    assert.equal(app.store.one('SELECT COUNT(*) n FROM sandbox_wallet_ledger').n,0);
    assert.equal(app.store.one('SELECT COUNT(*) n FROM sandbox_mission_funding').n,0);
    const status=await api(`/missions/${missionId}/test-checkout/status`,{as:buyer});
    assert.equal(status.body.realFundsCollected,false);assert.equal(status.body.workerPayoutEnabled,false);
    const workerLogin=await api('/auth/login',{method:'POST',data:{email:'worker@example.invalid',password}});
    assert.equal(workerLogin.status,200);
    const worker={cookie:workerLogin.cookie.split(';')[0],csrf:workerLogin.body.csrf};
    const wallet=await api('/wallet/me',{as:worker});assert.equal(wallet.status,200);assert.equal(wallet.body.balanceCents,0);
  });
  await test('only admins can view readiness; healthy test ledger does not mark production ready',async()=>{
    assert.equal((await api('/admin/launch-audit',{as:buyer})).status,403);
    const login=await api('/auth/login',{method:'POST',data:{email:'admin@example.invalid',password}});
    assert.equal(login.status,200);
    const admin={cookie:login.cookie.split(';')[0],csrf:login.body.csrf};
    const audit=await api('/admin/launch-audit',{as:admin});
    assert.equal(audit.status,200,JSON.stringify(audit.body));
    assert.equal(audit.body.publicLaunchAllowed,false);
    assert.equal(audit.body.realPayoutsEnabled,false);
    assert.equal(audit.body.ledger.ok,true);
    assert.equal(audit.body.stripeTestConfigured,true);
    assert.ok(audit.body.blockers.some(x=>x.id==='provider_live'));
    const stripeSummary=await api('/admin/stripe-test/summary',{as:admin});
    assert.equal(stripeSummary.status,200);
    assert.ok(stripeSummary.body.webhooks.received>=1);
    assert.equal(stripeSummary.body.liveMode,false);
  });
  await test('webhook status is monotonic; expiry cannot undo paid test event',async()=>{
    const expired=await webhook(event({id:'evt_expire_after_paid_456',type:'checkout.session.expired',paid:'unpaid'}));
    assert.equal(expired.status,200);assert.equal(expired.body.accepted,false);
    assert.equal(app.store.one('SELECT status FROM stripe_test_checkout_sessions WHERE mission_id=?',missionId).status,'PAID_TEST');
  });
  await test('test checkout rejects unknown missions and does not accept client-chosen prices',async()=>{
    assert.equal((await api('/missions/nonexistent/test-checkout',{as:buyer,method:'POST',data:{amountCents:1}})).status,404);
    assert.equal(app.store.one('SELECT amount_cents FROM stripe_test_checkout_sessions WHERE mission_id=?',missionId).amount_cents,9000);
  });
}finally{
  await app.close();fs.rmSync(tmp,{recursive:true,force:true});
}

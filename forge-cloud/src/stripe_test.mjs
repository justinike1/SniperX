/**
 * Stripe Checkout TEST-MODE ONLY integration for Forge pilot development.
 * No live charges, worker payouts, Stripe Connect transfers, or wage payments.
 * Test checkout events are segregated from the simulated worker wallet.
 * NEVER add automatic wallet credits on the strength of these events.
 */
import {createHmac, timingSafeEqual} from 'node:crypto';
import {fail} from './security.mjs';

const NOW=()=>new Date().toISOString();
const TEST_API='https://api.stripe.com';
const SUPPORTED_EVENTS=new Set(['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded']);
const stripeError=(message)=>Object.assign(new Error(message),{status:503});
const role=(ctx,...roles)=>{if(!ctx.user)fail(401,'Authentication required');if(!roles.includes(ctx.user.role))fail(403,'Access denied');};

export function stripeTestConfigured(key){return typeof key==='string'&&key.startsWith('sk_test_')&&key.length>8;}

/** Client constructor refuses ALL live-mode secret keys and untrusted API endpoints. */
export function makeStripeTestClient({secretKey,fetchImpl=fetch,apiBase=TEST_API}={}){
  if(!stripeTestConfigured(secretKey))throw new Error('Only sk_test_ keys are accepted for Forge checkout test mode');
  if(apiBase!==TEST_API)throw new Error('Stripe API endpoint must be official');
  return {
    async createSession({mission,origin}){
      const url=new URL(origin);
      if(!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash)throw new Error('Invalid Forge origin');
      const form=new URLSearchParams({
        mode:'payment',
        'payment_method_types[0]':'card',
        'line_items[0][price_data][currency]':'usd',
        'line_items[0][price_data][unit_amount]':String(mission.priceCents),
        'line_items[0][price_data][product_data][name]':`Forge TEST mission: ${mission.title.slice(0,100)}`,
        'line_items[0][quantity]':'1',
        'metadata[forge_test_mission_id]':mission.id,
        'client_reference_id':mission.id,
        success_url:`${origin.replace(/\/$/,'')}/?stripe_test=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:`${origin.replace(/\/$/,'')}/?stripe_test=cancel`,
      });
      const res=await fetchImpl(`${TEST_API}/v1/checkout/sessions`,{
        method:'POST',
        headers:{Authorization:`Bearer ${secretKey}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':`forge-test-checkout-${mission.id}`},
        body:form.toString(),
        signal:AbortSignal.timeout(12000)
      });
      let payload;try{payload=await res.json()}catch{throw stripeError('Stripe test API returned unreadable response')}
      if(!res.ok)throw stripeError('Stripe test API request was unsuccessful');
      if(!payload||payload.livemode!==false||typeof payload.id!=='string'||!payload.id.startsWith('cs_test_')||
        typeof payload.url!=='string'||!payload.url.startsWith('https://checkout.stripe.com/')){
        throw stripeError('Stripe did not return a valid TEST Checkout Session');
      }
      if(payload.amount_total!==undefined && payload.amount_total!==mission.priceCents)throw stripeError('Stripe test session amount mismatch');
      if(payload.currency!==undefined && payload.currency!=='usd')throw stripeError('Stripe test session currency mismatch');
      return {id:payload.id,url:payload.url,livemode:false};
    }
  };
}

/** Stripe-signature validation uses the EXACT raw body; protects against tampering and replay. */
export function verifyStripeTestEvent(raw,signatureHeader,webhookSecret,{currentSeconds=Math.floor(Date.now()/1000)}={}){
  if(typeof webhookSecret!=='string'||!webhookSecret.startsWith('whsec_')||webhookSecret.length<=6)fail(503,'Stripe test webhook is not configured');
  if(!Buffer.isBuffer(raw)||raw.length===0||raw.length>65536)fail(400,'Invalid webhook payload');
  if(typeof signatureHeader!=='string'||signatureHeader.length>2000)fail(400,'Missing valid webhook signature');
  const parts=signatureHeader.split(',').map(p=>p.trim().split('='));
  const timestamp=parts.find(p=>p[0]==='t')?.[1];
  const sigs=parts.filter(p=>p[0]==='v1').map(p=>p[1]);
  if(!/^\d{10}$/.test(timestamp||'')||Math.abs(currentSeconds-Number(timestamp))>300)fail(400,'Webhook timestamp outside accepted window');
  const expected=createHmac('sha256',webhookSecret).update(`${timestamp}.`).update(raw).digest();
  const valid=sigs.some(sig=>{
    if(typeof sig!=='string'||! /^[0-9a-f]{64}$/i.test(sig))return false;
    return timingSafeEqual(expected,Buffer.from(sig,'hex'));
  });
  if(!valid)fail(400,'Invalid Stripe webhook signature');
  let event;try{event=JSON.parse(raw.toString('utf8'))}catch{fail(400,'Invalid JSON webhook')}
  if(!event||typeof event!=='object'||Array.isArray(event)||typeof event.id!=='string'||!/^evt_[a-zA-Z0-9_]{3,150}$/.test(event.id))fail(400,'Invalid Stripe event');
  if(event.livemode!==false)fail(400,'Live Stripe events are prohibited in test mode');
  return event;
}

/** Incoming TEST events are idempotent. They do not fund missions or wallet balances. */
export function applyStripeTestEvent(store,event){
  return store.transaction(()=>{
    const prior=store.one('SELECT id FROM stripe_test_webhook_events WHERE id=?',event.id);
    if(prior)return {received:true,duplicate:true,mode:'TEST_ONLY'};
    const type=typeof event.type==='string'?event.type.slice(0,100):'unknown';
    const session=event.data?.object;
    let accepted=false,reason='EVENT_NOT_APPLICABLE';
    if(SUPPORTED_EVENTS.has(type)&&session&&typeof session==='object'&&session.livemode===false&&
        typeof session.id==='string'&&session.id.startsWith('cs_test_')){
      const stored=store.one('SELECT * FROM stripe_test_checkout_sessions WHERE session_id=?',session.id);
      if(stored && session.metadata?.forge_test_mission_id===stored.mission_id && session.client_reference_id===stored.mission_id &&
          session.currency==='usd' && session.amount_total===stored.amount_cents){
        if(type==='checkout.session.expired'){
          if(stored.status==='OPEN_TEST'){
            store.run('UPDATE stripe_test_checkout_sessions SET status=?,updated_at=? WHERE mission_id=?','EXPIRED_TEST',NOW(),stored.mission_id);
            accepted=true;reason='SESSION_EXPIRED_TEST';
          }else reason='STATUS_NOT_APPLICABLE';
        }else if(session.payment_status==='paid'){
          if(stored.status==='OPEN_TEST'){
            store.run('UPDATE stripe_test_checkout_sessions SET status=?,updated_at=? WHERE mission_id=?','PAID_TEST',NOW(),stored.mission_id);
            accepted=true;reason='TEST_PAYMENT_CONFIRMED_NO_WALLET_CREDIT';
          }else reason='STATUS_NOT_APPLICABLE';
        }else reason='NOT_PAID';
      }else reason='SESSION_NOT_MATCHED';
    }
    store.run('INSERT INTO stripe_test_webhook_events(id,event_type,accepted,reason,received_at) VALUES(?,?,?,?,?)',event.id,type,accepted?1:0,reason,NOW());
    // Don't let untrusted webhook events cause financial ledger writes.
    store.audit(null,'STRIPE_TEST_WEBHOOK','stripe_test_event',event.id,{type,accepted,reason});
    return {received:true,duplicate:false,accepted,mode:'TEST_ONLY'};
  });
}

export async function handleStripeTest(ctx){
  const {store,method,path,publicOrigin,stripeTestClient}=ctx;
  const start=path.match(/^\/api\/missions\/([^/]+)\/test-checkout$/);
  if(method==='POST'&&start){
    role(ctx,'buyer');
    if(!stripeTestClient)fail(503,'Stripe Checkout test mode is not configured');
    const mission=store.getMission(start[1]);
    if(!mission||mission.buyerUserId!==ctx.user.id)fail(404,'Mission not found');
    if(mission.safetyHold||!['NEW','APPROVED'].includes(mission.status))fail(409,'Mission not eligible for test checkout');
    if(!Number.isSafeInteger(mission.priceCents)||mission.priceCents<100||mission.priceCents>1_000_000)fail(409,'Invalid mission price');
    const existing=store.transaction(()=>{
      const old=store.one('SELECT * FROM stripe_test_checkout_sessions WHERE mission_id=?',mission.id);
      if(old){
        if(old.status==='CREATE_FAILED_TEST' || old.status==='CREATING_TEST' && Date.now()-Date.parse(old.updated_at)>60000){
          store.run('UPDATE stripe_test_checkout_sessions SET status=?,updated_at=? WHERE mission_id=?','CREATING_TEST',NOW(),mission.id);
          return null;
        }
        return old;
      }
      store.run('INSERT INTO stripe_test_checkout_sessions(mission_id,session_id,checkout_url,amount_cents,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',mission.id,null,null,mission.priceCents,'CREATING_TEST',NOW(),NOW());
      return null;
    });
    if(existing){
      if(existing.status==='OPEN_TEST' && existing.checkout_url)return {
        mode:'STRIPE_TEST_ONLY',url:existing.checkout_url,sessionId:existing.session_id,amountCents:existing.amount_cents,
        duplicate:true,realPaymentCollected:false,workerPayoutEnabled:false
      };
      fail(409,`Existing test checkout status: ${existing.status}`);
    }
    try{
      const session=await stripeTestClient.createSession({mission,origin:publicOrigin});
      store.transaction(()=>{
        store.run('UPDATE stripe_test_checkout_sessions SET session_id=?,checkout_url=?,status=?,updated_at=? WHERE mission_id=?',session.id,session.url,'OPEN_TEST',NOW(),mission.id);
        store.audit(ctx.user.id,'STRIPE_TEST_CHECKOUT_CREATED','mission',mission.id,{sessionId:session.id,amountCents:mission.priceCents,live:false});
      });
      return {mode:'STRIPE_TEST_ONLY',url:session.url,sessionId:session.id,amountCents:mission.priceCents,realPaymentCollected:false,workerPayoutEnabled:false};
    }catch(error){
      store.transaction(()=>store.run('UPDATE stripe_test_checkout_sessions SET status=?,updated_at=? WHERE mission_id=? AND status=?','CREATE_FAILED_TEST',NOW(),mission.id,'CREATING_TEST'));
      throw error;
    }
  }
  const status=path.match(/^\/api\/missions\/([^/]+)\/test-checkout\/status$/);
  if(method==='GET'&&status){
    role(ctx,'buyer','admin');
    const mission=store.getMission(status[1]);
    if(!mission||ctx.user.role!=='admin'&&mission.buyerUserId!==ctx.user.id)fail(404,'Mission not found');
    const record=store.one('SELECT session_id,status,amount_cents,updated_at FROM stripe_test_checkout_sessions WHERE mission_id=?',mission.id);
    return {mode:'TEST_ONLY',checkout:record||null,realFundsCollected:false,workerPayoutEnabled:false};
  }
  if(method==='GET'&&path==='/api/admin/stripe-test/summary'){
    role(ctx,'admin');
    const counts=store.all('SELECT status,COUNT(*) AS count FROM stripe_test_checkout_sessions GROUP BY status');
    const webhooks=store.one('SELECT COUNT(*) AS received,COALESCE(SUM(accepted),0) AS accepted FROM stripe_test_webhook_events');
    return {configured:!!stripeTestClient,liveMode:false,workerBankPayoutsEnabled:false,checkoutCounts:counts,webhooks};
  }
  return undefined;
}

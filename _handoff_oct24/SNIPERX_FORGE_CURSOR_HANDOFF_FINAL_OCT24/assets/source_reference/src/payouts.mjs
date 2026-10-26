/**
 * Forge payout safety prototype. ZERO banking or processor connectivity.
 * Every financial record created here is SIMULATED and cannot represent legal tender.
 * Never enable public paid operation by changing a single environment variable.
 */
import {randomUUID} from 'node:crypto';
import {splitPayment} from './core.mjs';
import {fail} from './security.mjs';

const MAX_PAYOUT_CENTS=1_000_000;
const MIN_PAYOUT_CENTS=500;
const DEMO_INSTANT_FEE_BPS=150; // Illustrative 1.5%, not a live Stripe Connect quote.
const DEMO_INSTANT_FEE_MIN_CENTS=50;
const DEMO_CURRENCY='usd';
const now=()=>new Date().toISOString();
const requireRole=(ctx,...roles)=>{
  if(!ctx.user)fail(401,'Authentication required');
  if(!roles.includes(ctx.user.role))fail(403,'Access denied');
};

export function payoutQuote(amountCents,method){
  if(!Number.isSafeInteger(amountCents)||amountCents<MIN_PAYOUT_CENTS||amountCents>MAX_PAYOUT_CENTS)
    fail(422,`Enter an amount between $${(MIN_PAYOUT_CENTS/100).toFixed(2)} and $${(MAX_PAYOUT_CENTS/100).toFixed(2)} in cents`);
  if(!['STANDARD','INSTANT'].includes(method))fail(422,'Select standard or faster payout');
  const feeCents=method==='INSTANT'?Math.max(DEMO_INSTANT_FEE_MIN_CENTS,Math.round(amountCents*DEMO_INSTANT_FEE_BPS/10000)):0;
  const netCents=amountCents-feeCents;
  if(netCents<=0)fail(422,'Payout amount must exceed applicable fee');
  return {
    method,amountCents,feeCents,netCents,currency:DEMO_CURRENCY,
    feeRateBps:method==='INSTANT'?DEMO_INSTANT_FEE_BPS:0,
    feeMinimumCents:method==='INSTANT'?DEMO_INSTANT_FEE_MIN_CENTS:0,
    providerEligibilityVerified:false,
    destinationConfigured:false,
    liveTransferPossible:false,
    timing:method==='INSTANT'?'Only eligible accounts with available provider funds can receive faster transfers; timing not guaranteed.':'Standard bank transfers typically require processing days; timing not guaranteed.',
    disclaimer:'SIMULATION ONLY — no bank transfer, account balance, or live charge exists.'
  };
}

function walletBalance(store,workerUserId){
  return store.one('SELECT COALESCE(SUM(amount_cents),0) AS cents FROM sandbox_wallet_ledger WHERE worker_user_id=?',workerUserId).cents;
}

function walletSnapshot(store,workerUserId){
  return {
    currency:DEMO_CURRENCY,
    mode:'SIMULATED_TEST_FUNDS',
    balanceCents:walletBalance(store,workerUserId),
    hasRealFunds:false,
    realPayoutsEnabled:false,
    canConfigureRealBank:false,
    providerConnected:false,
    feesAreIllustrative:true,
    ledger:store.all('SELECT id,mission_id,payout_id,kind,amount_cents,created_at FROM sandbox_wallet_ledger WHERE worker_user_id=? ORDER BY created_at DESC,id DESC LIMIT 100',workerUserId),
    payouts:store.all('SELECT id,method,amount_cents,fee_cents,net_cents,status,requested_at,completed_at FROM sandbox_payouts WHERE worker_user_id=? ORDER BY requested_at DESC LIMIT 100',workerUserId)
  };
}

function appendLedger(store,{workerUserId,missionId=null,payoutId=null,kind,amountCents,eventKey}){
  store.run(`INSERT INTO sandbox_wallet_ledger
    (id,worker_user_id,mission_id,payout_id,kind,amount_cents,event_key,created_at)
    VALUES(?,?,?,?,?,?,?,?)`,randomUUID(),workerUserId,missionId,payoutId,kind,amountCents,eventKey,now());
}

/** Must be called INSIDE caller's SQLite transaction on buyer acceptance. */
export function releaseSandboxEarnings(store,mission){
  if(!mission||mission.status!=='COMPLETED'||!mission.buyerAccepted||mission.safetyHold||!mission.workerUserId)
    return {released:false,reason:'Mission not safely completed by an assigned participant'};
  const funding=store.one('SELECT * FROM sandbox_mission_funding WHERE mission_id=?',mission.id);
  if(!funding||funding.status!=='RESERVED')return {released:false,reason:'No pre-recorded simulated funds available'};
  const expected=splitPayment(mission.priceCents);
  if(expected.totalCents!==funding.amount_cents||expected.workerPayCents!==funding.worker_cents||expected.platformFeeCents!==funding.platform_fee_cents)
    throw new Error('Sandbox funding does not reconcile with mission price');
  appendLedger(store,{workerUserId:mission.workerUserId,missionId:mission.id,kind:'MISSION_RELEASE',amountCents:funding.worker_cents,eventKey:`mission-release:${mission.id}`});
  store.run('UPDATE sandbox_mission_funding SET status=?,released_at=? WHERE mission_id=?','RELEASED',now(),mission.id);
  return {released:true,workerCreditCents:funding.worker_cents,mode:'SIMULATED_TEST_FUNDS'};
}

/** Caller must hold SQLite transaction; no real card refund occurs. */
export function voidSandboxFunding(store,mission){
  const funding=store.one('SELECT status FROM sandbox_mission_funding WHERE mission_id=?',mission.id);
  if(!funding||funding.status!=='RESERVED')return {voided:false};
  if(mission.status!=='CANCELLED')throw new Error('Only cancelled mission funding may be voided');
  store.run('UPDATE sandbox_mission_funding SET status=?,released_at=? WHERE mission_id=?','VOIDED_SIMULATED',now(),mission.id);
  return {voided:true,realRefundIssued:false};
}

/** All routes are private-beta simulation. No real bank, debit card, or payout API. */
export function handlePayouts(ctx){
  const {store,method,path,body}=ctx;
  if(method==='GET'&&path==='/api/wallet/me'){
    requireRole(ctx,'worker');return walletSnapshot(store,ctx.user.id);
  }
  if(method==='POST'&&path==='/api/wallet/quote'){
    requireRole(ctx,'worker');
    const quote=payoutQuote(body.amountCents,body.method);
    return {...quote,availableTestCents:walletBalance(store,ctx.user.id)};
  }
  if(method==='POST'&&path==='/api/wallet/payouts'){
    requireRole(ctx,'worker');
    const {idempotencyKey,amountCents,method}=body;
    if(typeof idempotencyKey!=='string'||!(/^[a-zA-Z0-9_-]{16,100}$/).test(idempotencyKey))
      fail(422,'A unique request key is required');
    const quote=payoutQuote(amountCents,method);
    return store.transaction(()=>{
      const prior=store.one('SELECT * FROM sandbox_payouts WHERE worker_user_id=? AND idempotency_key=?',ctx.user.id,idempotencyKey);
      if(prior){
        if(prior.amount_cents!==amountCents||prior.method!==method)fail(409,'Request key was already used for different payout details');
        return {payout:{id:prior.id,method:prior.method,amountCents:prior.amount_cents,feeCents:prior.fee_cents,netCents:prior.net_cents,status:prior.status},duplicate:true,mode:'SIMULATED_ONLY',bankTransferInitiated:false};
      }
      const available=walletBalance(store,ctx.user.id);
      if(available<amountCents)fail(409,'Insufficient simulated available balance');
      const id=randomUUID();
      store.run(`INSERT INTO sandbox_payouts
       (id,worker_user_id,idempotency_key,method,amount_cents,fee_cents,net_cents,status,requested_at,completed_at)
       VALUES(?,?,?,?,?,?,?,?,?,NULL)`,id,ctx.user.id,idempotencyKey,method,amountCents,quote.feeCents,quote.netCents,'REQUESTED_SIMULATED',now());
      appendLedger(store,{workerUserId:ctx.user.id,payoutId:id,kind:'PAYOUT_RESERVED',amountCents:-amountCents,eventKey:`payout-reserve:${id}`});
      store.audit(ctx.user.id,'SANDBOX_PAYOUT_REQUESTED','sandbox_payout',id,{method,amountCents,feeCents:quote.feeCents,netCents:quote.netCents});
      return {payout:{id,method,amountCents,feeCents:quote.feeCents,netCents:quote.netCents,status:'REQUESTED_SIMULATED'},duplicate:false,mode:'SIMULATED_ONLY',bankTransferInitiated:false};
    });
  }
  const fund=path.match(/^\/api\/admin\/sandbox\/missions\/([^/]+)\/fund$/);
  if(method==='POST'&&fund){
    requireRole(ctx,'admin');
    return store.transaction(()=>{
      const mission=store.getMission(fund[1]);
      if(!mission)fail(404,'Mission not found');
      if(mission.safetyHold||!['NEW','APPROVED','ASSIGNED','SUBMITTED'].includes(mission.status))fail(409,'Mission cannot be sandbox funded in this state');
      if(store.one('SELECT mission_id FROM sandbox_mission_funding WHERE mission_id=?',mission.id))fail(409,'Mission already has simulated funding');
      // NEVER accepts amount from the request body: immutable price determines exact test record.
      const split=splitPayment(mission.priceCents);
      store.run(`INSERT INTO sandbox_mission_funding
        (mission_id,amount_cents,worker_cents,platform_fee_cents,status,created_by,created_at,released_at)
        VALUES(?,?,?,?,?,?,?,NULL)`,mission.id,split.totalCents,split.workerPayCents,split.platformFeeCents,'RESERVED',ctx.user.id,now());
      store.audit(ctx.user.id,'SANDBOX_MISSION_FUNDED','mission',mission.id,{amountCents:split.totalCents,realCharge:false});
      return {missionId:mission.id,status:'RESERVED_SIMULATED',...split,realCharge:false,realFundsReceived:false};
    });
  }
  const settle=path.match(/^\/api\/admin\/sandbox\/payouts\/([^/]+)\/settle$/);
  if(method==='POST'&&settle){
    requireRole(ctx,'admin');
    if(!['PAID_SIMULATED','FAILED_SIMULATED'].includes(body.outcome))fail(422,'Choose PAID_SIMULATED or FAILED_SIMULATED');
    return store.transaction(()=>{
      const payout=store.one('SELECT * FROM sandbox_payouts WHERE id=?',settle[1]);
      if(!payout)fail(404,'Payout not found');
      if(payout.status!=='REQUESTED_SIMULATED')fail(409,'This payout was already finalized');
      store.run('UPDATE sandbox_payouts SET status=?,completed_at=? WHERE id=?',body.outcome,now(),payout.id);
      if(body.outcome==='FAILED_SIMULATED'){
        appendLedger(store,{workerUserId:payout.worker_user_id,payoutId:payout.id,kind:'PAYOUT_REFUNDED',amountCents:payout.amount_cents,eventKey:`payout-refund:${payout.id}`});
      }
      store.audit(ctx.user.id,'SANDBOX_PAYOUT_SETTLED','sandbox_payout',payout.id,{outcome:body.outcome,realBankTransfer:false});
      return {payoutId:payout.id,status:body.outcome,bankTransferCompleted:false};
    });
  }
  if(method==='GET'&&path==='/api/admin/sandbox/payouts'){
    requireRole(ctx,'admin');
    return {payouts:store.all('SELECT id,worker_user_id,method,amount_cents,fee_cents,net_cents,status,requested_at FROM sandbox_payouts ORDER BY requested_at DESC LIMIT 100'),mode:'SIMULATED_ONLY'};
  }
  return undefined;
}

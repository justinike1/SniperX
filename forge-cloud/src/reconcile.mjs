/**
 * Read-only operator audit for the sandbox monetary ledger.
 * Never treats these sums as real funds or as proof of a completed bank payout.
 */
import {splitPayment} from './core.mjs';

export function auditSandboxLedger(store){
  const issues=[];
  const add=(code,details)=>issues.push({code,details:String(details).slice(0,220)});
  const funding=store.all('SELECT * FROM sandbox_mission_funding');
  const payouts=store.all('SELECT * FROM sandbox_payouts');
  const ledger=store.all('SELECT rowid,* FROM sandbox_wallet_ledger ORDER BY rowid ASC');
  const missionById=new Map(store.all('SELECT * FROM missions').map(row=>[row.id,store.missionFromRow(row)]));
  const wallet=new Map();
  const ledgerByEvent=new Map();
  const byMission=new Map();
  const byPayout=new Map();
  const remember=(map,id,row)=>{const list=map.get(id)||[];list.push(row);map.set(id,list);};
  for(const item of ledger){
    ledgerByEvent.set(item.event_key,item);
    if(item.mission_id)remember(byMission,item.mission_id,item);
    if(item.payout_id)remember(byPayout,item.payout_id,item);
    const next=(wallet.get(item.worker_user_id)||0)+item.amount_cents;
    wallet.set(item.worker_user_id,next);
    if(next<0)add('NEGATIVE_RUNNING_BALANCE',`worker=${item.worker_user_id} ledger=${item.id}`);
  }
  for(const fund of funding){
    const m=missionById.get(fund.mission_id);
    if(!m){add('ORPHAN_FUNDING',fund.mission_id);continue;}
    const expected=splitPayment(m.priceCents);
    if(expected.totalCents!==fund.amount_cents||expected.workerPayCents!==fund.worker_cents||expected.platformFeeCents!==fund.platform_fee_cents)
      add('INCORRECT_SPLIT',fund.mission_id);
    const credits=(byMission.get(fund.mission_id)||[]).filter(item=>item.kind==='MISSION_RELEASE');
    if(fund.status==='RELEASED'){
      if(m.status!=='COMPLETED'||!m.buyerAccepted||m.safetyHold)add('UNSAFE_FUNDING_RELEASE',fund.mission_id);
      if(credits.length!==1||credits[0].amount_cents!==fund.worker_cents||credits[0].worker_user_id!==m.workerUserId)
        add('MISSING_OR_WRONG_WORKER_CREDIT',fund.mission_id);
    }else if(credits.length)add('CREDIT_WITHOUT_RELEASED_FUNDING',fund.mission_id);
    if(fund.status==='VOIDED_SIMULATED'&&m.status!=='CANCELLED')add('VOIDED_NOT_CANCELLED',fund.mission_id);
  }
  for(const row of ledger.filter(x=>x.kind==='MISSION_RELEASE')){
    if(!funding.some(x=>x.mission_id===row.mission_id &&x.status==='RELEASED'))add('ORPHAN_RELEASE_CREDIT',row.id);
  }
  for(const payout of payouts){
    const entries=byPayout.get(payout.id)||[];
    const debits=entries.filter(x=>x.kind==='PAYOUT_RESERVED');
    const refunds=entries.filter(x=>x.kind==='PAYOUT_REFUNDED');
    const expectedFee=payout.method==='INSTANT'?Math.max(50,Math.round(payout.amount_cents*150/10000)):0;
    if(payout.fee_cents!==expectedFee||payout.net_cents!==payout.amount_cents-payout.fee_cents)
      add('PAYOUT_MATH_MISMATCH',payout.id);
    if(debits.length!==1||debits[0].amount_cents!==-payout.amount_cents||debits[0].worker_user_id!==payout.worker_user_id)
      add('MISSING_OR_WRONG_PAYOUT_RESERVATION',payout.id);
    if(payout.status==='FAILED_SIMULATED'){
      if(refunds.length!==1||refunds[0].amount_cents!==payout.amount_cents||refunds[0].worker_user_id!==payout.worker_user_id)
        add('FAILED_PAYOUT_NOT_RESTORED',payout.id);
    }else if(refunds.length)add('UNEXPECTED_PAYOUT_REFUND',payout.id);
  }
  for(const [workerId,cents] of wallet){if(cents<0)add('NEGATIVE_WALLET_BALANCE',workerId);}
  return {
    ok:issues.length===0,
    mode:'SIMULATED_ONLY',
    liveFundsAudited:false,
    counts:{missions:missionById.size,sandboxFundings:funding.length,workerLedgerEntries:ledger.length,sandboxPayouts:payouts.length,testCheckoutSessions:store.one('SELECT COUNT(*) AS n FROM stripe_test_checkout_sessions').n},
    issues
  };
}

export function launchReadiness(store,{stripeTestConfigured=false}={}){
  const ledger=auditSandboxLedger(store);
  // Invariant: product cannot be marked public-ready just by toggling a configuration value.
  const blockers=[
    {id:'verified_buyers',label:'Verified, genuinely paying customers and validated demand'},
    {id:'identity_verification',label:'Independent identity/business verification and eligible worker onboarding'},
    {id:'employment_law',label:'Worker classification, staffing/payroll and wage rules reviewed for every jurisdiction'},
    {id:'provider_live',label:'Regulated payment provider approved for the business model, with live authorization'},
    {id:'payouts',label:'Connected-account payout eligibility, settlement and reconciliation'},
    {id:'disputes',label:'Chargebacks, refunds, incident response and disputes workflows'},
    {id:'insurance',label:'Appropriate insurance and contracts reviewed'},
    {id:'independent_security',label:'Independent penetration testing, backups and monitoring'},
    {id:'real_paid_pilot',label:'Successful independently verified real paid pilot'}
  ];
  if(!ledger.ok)blockers.unshift({id:'sandbox_integrity',label:'Resolve sandbox financial ledger discrepancies'});
  return {publicLaunchAllowed:false,realPayoutsEnabled:false,stripeTestConfigured,ledger,blockers,note:'All real-money and public-release gates remain blocked; TEST checkout is not real funding.'};
}

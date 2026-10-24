/**
 * Earn Now: safe invitation-only mission discovery and interest tracking.
 * Demonstration only. Neither expressing interest nor an operator review
 * constitutes a real assignment, contract, payment commitment or dispatch.
 */
import {randomUUID} from 'node:crypto';
import {matchWorkers,splitPayment} from './core.mjs';
import {assessScope} from './safety.mjs';
import {fail} from './security.mjs';

const allowedCategories=new Set(['Digital Setup','Content & Copy']);
const OPEN='APPROVED';

export function isFeedCandidate(m){
 return !!m && m.status===OPEN && m.safetyHold!==true && m.demo===true &&
  allowedCategories.has(m.category) && assessScope(m).status!=='BLOCKED' &&
  !m.workerUserId;
}

export function publicOpportunity(m){
 if(!isFeedCandidate(m))return null;
 const split=splitPayment(m.priceCents);
 return {
  id:m.id,title:m.title,category:m.category,skills:[...m.skills],
  locationLabel:m.city,schedule:m.schedule,urgency:m.urgency||'FLEXIBLE',
  estimatedMinutes:m.estimatedMinutes||60,
  illustrativeBudgetCents:m.priceCents,
  illustrativeWorkerPayCents:split.workerPayCents,
  illustrativePlatformFeeCents:split.platformFeeCents,
  createdAt:m.createdAt,
  demonstrationOnly:true,
  liveAssignmentAvailable:false,
  paymentEnabled:false,
  payoutTiming:'NOT_CONFIGURED',
  // Public feed intentionally excludes detailed project brief, buyer identity,
  // project notes, deliverables, private contact data and payment details.
 };
}
const roles=['worker','admin','buyer'];
const requireRole=(ctx,accepted)=>{
 if(!ctx.user)fail(401,'Authentication required');
 if(!accepted.includes(ctx.user.role))fail(403,'Access denied');
};
function workerFit(m,worker){
 if(!worker)return {eligible:false,reasons:['Create a participant profile first.']};
 const ranked=matchWorkers(m,[worker])[0];
 if(!ranked?.eligible)return {eligible:false,reasons:ranked?.reasons||['Mission requirements do not match your profile.']};
 if(worker.verification!=='DEMO_REVIEWED')return {eligible:false,reasons:['Your test profile needs an operator review before you can express interest.']};
 return {eligible:true,reasons:ranked.reasons};
}
export function handleEarn(ctx){
 const {method,path,store}=ctx;
 if(method==='GET'&&path==='/api/earn/feed'){
  requireRole(ctx,roles);
  const workerRow=ctx.user.role==='worker'?store.one('SELECT * FROM workers WHERE user_id=?',ctx.user.id):null;
  const worker=workerRow?store.workerFromRow(workerRow):null;
  const owned=ctx.user.role==='worker'?new Set(store.all('SELECT mission_id FROM mission_interests WHERE worker_user_id=? AND status=?',ctx.user.id,'INTERESTED').map(x=>x.mission_id)):new Set();
  const missions=store.all('SELECT * FROM missions WHERE worker_user_id IS NULL ORDER BY created_at DESC LIMIT 300').map(store.missionFromRow);
  const opportunities=missions.filter(isFeedCandidate).map(m=>({
   ...publicOpportunity(m),
   ...(ctx.user.role==='worker'?{fit:workerFit(m,worker),expressedInterest:owned.has(m.id)}:{})
  }));
  return {opportunities,mode:'DEMONSTRATION_ONLY',realListings:0,livePayments:false,realDispatch:false,
   emptyMessage:'No approved test missions yet. We will never fabricate an available paid assignment.'};
 }
 if(method==='GET'&&path==='/api/earn/interests/me'){
  requireRole(ctx,['worker']);
  const interests=store.all('SELECT mission_id,status,created_at,updated_at FROM mission_interests WHERE worker_user_id=? ORDER BY created_at DESC LIMIT 100',ctx.user.id);
  return {interests,demonstrationOnly:true};
 }
 if(method==='GET'&&path==='/api/admin/earn/interests'){
  requireRole(ctx,['admin']);
  const interests=store.all(`SELECT i.mission_id,i.worker_user_id,i.status,i.created_at,i.updated_at,m.data as mission_data,u.display_name as worker_name
    FROM mission_interests i JOIN missions m ON m.id=i.mission_id JOIN users u ON u.id=i.worker_user_id ORDER BY i.created_at DESC LIMIT 200`);
  return {interests:interests.map(({mission_data,...r})=>({...r,missionTitle:JSON.parse(mission_data).title})),demonstrationOnly:true};
 }
 const interestRoute=path.match(/^\/api\/earn\/missions\/([a-f0-9-]{36})\/interest$/i);
 if(method==='POST'&&interestRoute){
  requireRole(ctx,['worker']);
  const missionId=interestRoute[1];
  const workerRow=store.one('SELECT * FROM workers WHERE user_id=?',ctx.user.id);
  if(!workerRow)fail(409,'Create your skills profile before expressing interest');
  const worker=store.workerFromRow(workerRow);
  const raw=ctx.body?.action;
  if(!['EXPRESS','WITHDRAW'].includes(raw))fail(422,'Choose EXPRESS or WITHDRAW');
  return store.transaction(()=>{
   const row=store.one('SELECT * FROM missions WHERE id=?',missionId);
   const m=row?store.missionFromRow(row):null;
   if(!m||!isFeedCandidate(m))fail(404,'This mission is no longer available in the test feed');
   if(raw==='EXPRESS'){
    const fit=workerFit(m,worker);
    if(!fit.eligible)fail(409,fit.reasons.join('; '));
   }
   const previous=store.one('SELECT status FROM mission_interests WHERE mission_id=? AND worker_user_id=?',missionId,ctx.user.id);
   if(raw==='WITHDRAW'&&(!previous||previous.status==='WITHDRAWN'))return {status:'WITHDRAWN',demonstrationOnly:true,changed:false};
   if(raw==='EXPRESS'&&previous?.status==='INTERESTED')return {status:'INTERESTED',demonstrationOnly:true,changed:false};
   const now=new Date().toISOString(), next=raw==='EXPRESS'?'INTERESTED':'WITHDRAWN';
   store.run(`INSERT INTO mission_interests(id,mission_id,worker_user_id,status,created_at,updated_at)
     VALUES(?,?,?,?,?,?) ON CONFLICT(mission_id,worker_user_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at`,
     randomUUID(),missionId,ctx.user.id,next,now,now);
   store.audit(ctx.user.id,next==='INTERESTED'?'DEMO_MISSION_INTERESTED':'DEMO_MISSION_INTEREST_WITHDRAWN','mission',missionId,{workerUserId:ctx.user.id});
   return {status:next,demonstrationOnly:true,changed:true,assignmentCreated:false,paymentInitiated:false};
  });
 }
 return undefined;
}

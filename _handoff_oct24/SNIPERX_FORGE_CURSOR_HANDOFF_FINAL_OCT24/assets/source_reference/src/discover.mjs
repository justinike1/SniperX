/**
 * Forge Fast Lane — provenance-first discovery and voluntary availability.
 *
 * IMPORTANT: This is a PRIVATE-BETA demonstration. A mission being marked TODAY
 * is a buyer's requested urgency, not a validated same-day start, funded gig,
 * completed worker verification, or guaranteed payout. External employment
 * advertisements are a separate application path, never Forge-paid missions.
 */
import {isFeedCandidate,publicOpportunity} from './earn.mjs';
import {listCurrentJobs} from './jobs.mjs';
import {matchWorkers} from './core.mjs';
import {fail} from './security.mjs';

const MODES=new Set(['TODAY','NEXT_48H','ALL','CAREERS']);
const HOUR=60*60*1000;
const VALID_HOURS=new Set([4,12,24]);
const cleanSearch=x=>typeof x==='string'?x.trim().toLowerCase().slice(0,80):'';
const visible=(row,search,fields)=>!search||fields.some(value=>String(value||'').toLowerCase().includes(search));
function workerContext(store,user){
 if(user.role!=='worker')return {profile:null,ready:null};
 const row=store.one('SELECT * FROM workers WHERE user_id=?',user.id);
 const ready=store.one('SELECT status,expires_at,updated_at FROM earn_availability WHERE worker_user_id=?',user.id);
 return {profile:row?store.workerFromRow(row):null,ready};
}
export function readySnapshot(store,user,now=Date.now()){
 if(!user||user.role!=='worker')return null;
 const r=store.one('SELECT status,expires_at,updated_at FROM earn_availability WHERE worker_user_id=?',user.id);
 const active=!!(r&&r.status==='ON'&&r.expires_at>now);
 return {active,expiresAt:active?new Date(r.expires_at).toISOString():null,
  declaredByWorker:true,independentlyVerified:false,doesNotGuaranteeBooking:true};
}
export function setWorkerReady(store,user,{action,hours}={},now=Date.now()){
 if(!user)fail(401,'Authentication required');
 if(user.role!=='worker')fail(403,'Only participants can set availability');
 const profile=store.one('SELECT user_id FROM workers WHERE user_id=?',user.id);
 if(!profile)fail(409,'Create your work profile before setting availability');
 if(!['ON','OFF'].includes(action))fail(422,'Choose ON or OFF');
 if(action==='ON'&&!VALID_HOURS.has(hours))fail(422,'Availability must be 4, 12, or 24 hours');
 const expires=action==='ON'?now+hours*HOUR:now;
 return store.transaction(()=>{
  store.run(`INSERT INTO earn_availability(worker_user_id,status,expires_at,updated_at)
    VALUES(?,?,?,?) ON CONFLICT(worker_user_id) DO UPDATE SET
    status=excluded.status,expires_at=excluded.expires_at,updated_at=excluded.updated_at`,
   user.id,action,expires,new Date(now).toISOString());
  store.audit(user.id,action==='ON'?'WORKER_AVAILABLE_SELF_DECLARED':'WORKER_AVAILABILITY_OFF',
   'worker',user.id,{hours:action==='ON'?hours:null,expiresAt:new Date(expires).toISOString(),demo:true});
  return {active:action==='ON',expiresAt:action==='ON'?new Date(expires).toISOString():null,
   declaredByWorker:true,independentlyVerified:false,doesNotGuaranteeBooking:true,demonstrationOnly:true};
 });
}

function rankDemo(m,profile,ready,now){
 const preview=publicOpportunity(m);
 const match=profile?matchWorkers(m,[profile])[0]:null;
 const fit=profile?{
  eligible:match?.eligible===true&&profile.verification==='DEMO_REVIEWED',
  reasons:match?.reasons||[],
  profileReviewOnly:profile.verification==='DEMO_REVIEWED',
  identityVerified:false
 }:null;
 // Scores order beta suggestions, NOT likelihood of hiring, actual pay, or availability.
 const urgencyBoost=m.urgency==='TODAY'?35:m.urgency==='NEXT_48H'?20:0;
 const suitabilityBoost=fit?.eligible?40:0;
 const readyBoost=ready?.active?10:0;
 const freshHours=Math.max(0,(now-Date.parse(m.createdAt||0))/HOUR);
 const freshnessBoost=Number.isFinite(freshHours)?Math.max(0,12-Math.floor(freshHours/12)):0;
 const score=urgencyBoost+suitabilityBoost+readyBoost+freshnessBoost;
 const reason=[m.urgency==='TODAY'?'Buyer requested today':m.urgency==='NEXT_48H'?'Buyer requested next 48 hours':'Flexible request'];
 if(fit?.eligible)reason.push('Skills, demo schedule and pay match your profile');
 if(ready?.active)reason.push('You marked yourself available');
 return {...preview,kind:'FORGE_MISSION_DEMO',requestedUrgency:m.urgency||'FLEXIBLE',
  fit,matchScore:score,matchReasons:reason,startDateVerified:false,realStartPossible:false,
  verifiedBuyer:false,fundsCollected:false,earnTodayGuaranteed:false,
  estimatedTimeToPayment:null,paymentLabel:'No real payment in private beta',
  engagementIntent:'SERVICE_PROJECT',laborClassification:'NOT_DETERMINED',
  employmentRelationshipVerified:false,
  opportunityLabel:'TEST MISSION · NOT A PAID JOB',
  externalApplication:false};
}
function careerPreview(job){
 return {kind:'EXTERNAL_CAREER_JOB',sourceKey:job.sourceKey,source:job.source,title:job.title,
  employer:job.employer,locationLabel:job.location,applyURL:job.applyURL,
  postingUpdatedAt:job.postingUpdatedAt,lastVerifiedAt:job.lastVerifiedAt,
  opportunityLabel:'EXTERNAL JOB AD',externalApplication:true,forgePaid:false,
  payAvailable:false,payCents:null,paymentLabel:'Pay not verified by Forge',
  startDateVerified:false,earnTodayGuaranteed:false,estimatedTimeToPayment:null,
  buyerVerified:false,applicationRequired:true};
}
export function discover(store,{user,mode='ALL',query='',now=Date.now(),limit=60}={}){
 if(!user)fail(401,'Authentication required');
 if(!['admin','buyer','worker'].includes(user.role))fail(403,'Access denied');
 if(!MODES.has(mode))fail(422,'Unknown discovery mode');
 const safeQuery=cleanSearch(query);
 const max=Math.min(100,Math.max(1,Number.isInteger(limit)?limit:60));
 const {profile}=workerContext(store,user);
 const ready=readySnapshot(store,user,now);
 const missions=mode==='CAREERS'?[]:store.all('SELECT * FROM missions WHERE worker_user_id IS NULL ORDER BY created_at DESC LIMIT 300')
  .map(store.missionFromRow).filter(isFeedCandidate)
  .filter(m=>mode==='TODAY'?m.urgency==='TODAY':mode==='NEXT_48H'?['TODAY','NEXT_48H'].includes(m.urgency):true)
  .filter(m=>visible(m,safeQuery,[m.title,m.category,m.city,...(m.skills||[])]))
  .map(m=>rankDemo(m,profile,ready,now))
  .sort((a,b)=>b.matchScore-a.matchScore||String(b.createdAt).localeCompare(String(a.createdAt)))
  .slice(0,max);
 const careers=(mode==='CAREERS'||mode==='ALL'?listCurrentJobs(store,{limit:100,now}):[])
  .filter(j=>visible(j,safeQuery,[j.title,j.employer,j.location,j.source]))
  .map(careerPreview).slice(0,max);
 return {mode,query:safeQuery,missions,careers,workerAvailability:ready,
  inventory:{paidToday:0,realForgeMissions:0,simulatedMissions:missions.length,
   sourcedCareerAds:careers.length},
  guarantees:{sameDayStart:false,sameDayPayment:false,realPayouts:false},
  important:'Urgency is a buyer request, not verified start time or guaranteed payment. Mission examples are simulated. External jobs require separate applications and are not same-day earning promises.',
  sources:['FORGE_TEST_REQUESTS','EXTERNAL_AUTHORIZED_FEEDS'],
  fundedLiveOpportunities:0};
}
export function handleDiscover(ctx){
 const {method,path,store,user}=ctx;
 if(method==='GET'&&path==='/api/earn/discover')return discover(store,{
  user,mode:ctx.query?.get('mode')||'ALL',query:ctx.query?.get('q')||''});
 if(method==='GET'&&path==='/api/earn/availability/me'){
  if(!user)fail(401,'Authentication required');if(user.role!=='worker')fail(403,'Only participants can view their availability');
  return {availability:readySnapshot(store,user)};
 }
 if(method==='POST'&&path==='/api/earn/availability')return {
  availability:setWorkerReady(store,user,{action:ctx.body?.action,hours:ctx.body?.hours})};
 return undefined;
}

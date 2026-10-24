import { randomUUID } from 'node:crypto';
import { assessScope } from './safety.mjs';

export const STATUS = Object.freeze({ NEW: 'NEW', APPROVED: 'APPROVED', ASSIGNED: 'ASSIGNED', SUBMITTED: 'SUBMITTED', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' });
export const NEXT = Object.freeze({ NEW: ['APPROVED','CANCELLED'], APPROVED: ['ASSIGNED','CANCELLED'], ASSIGNED: ['SUBMITTED','CANCELLED'], SUBMITTED: ['COMPLETED','ASSIGNED','CANCELLED'], COMPLETED: [], CANCELLED: [] });
export const categories = Object.freeze(['Business Photos','Digital Setup','Content & Copy','Local Admin']);
const clean = (v,max=120) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').trim().slice(0,max) : '';
const validMoney = n => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 10_000;
export function dollars(cents) { return (cents/100).toFixed(2); }
export function splitPayment(totalCents, percent=28) {
  if (!Number.isInteger(totalCents) || totalCents < 100 || totalCents > 1_000_000) throw new Error('Invalid amount');
  const platformFeeCents = Math.round(totalCents * percent / 100);
  return {totalCents, platformFeeCents, workerPayCents:totalCents-platformFeeCents};
}
export function validateMission(body={}) {
  const title=clean(body.title,90), description=clean(body.description,500), buyer=clean(body.buyer,90), city=clean(body.city,75);
  const category=clean(body.category,60), schedule=clean(body.schedule,20), skills = Array.isArray(body.skills) ? [...new Set(body.skills.map(x=>clean(x,36)).filter(Boolean))].slice(0,6) : [];
  const price=Number(body.priceUSD), errors=[];
  if(title.length<8) errors.push('Mission title must be at least 8 characters');
  if(description.length<20) errors.push('Describe the deliverable in at least 20 characters');
  if(buyer.length<3) errors.push('Buyer name is required');
  if(city.length<2) errors.push('City is required');
  if(!categories.includes(category)) errors.push('Choose a supported category');
  if(!['Weekday','Weekend','Flexible'].includes(schedule)) errors.push('Choose a schedule');
  if(!validMoney(price)) errors.push('Price must be between $1 and $10,000');
  if(skills.length===0) errors.push('At least one skill is required');
  const safety = assessScope({title:body.title,description:body.description,skills:body.skills,category});
  if(safety.status==='BLOCKED') errors.push(`Unsafe or disallowed scope (${safety.flags.join(', ')}).`);
  if(errors.length) return {ok:false,errors};
  const priceCents = Math.round(price*100);
  return {ok:true,value:{ id: randomUUID(),title,description,buyer,city,category,schedule,skills,priceCents,status:STATUS.NEW,workerId:null,proofNote:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),demo:true, paymentState:'SIMULATED_NOT_CHARGED', buyerAccepted:false,safetyReview:safety,incidentCount:0,safetyHold:false}};
}
export function validateWorker(body={}) {
  const name=clean(body.name,80),city=clean(body.city,75),schedule=clean(body.schedule,20);
  const skills=Array.isArray(body.skills) ? [...new Set(body.skills.map(x=>clean(x,36)).filter(Boolean))].slice(0,8) : [];
  const minPay=Number(body.minPayUSD), remoteAvailable=body.remoteAvailable === true, errors=[];
  if(name.length<3)errors.push('Name is required');
  if(city.length<2)errors.push('City is required');
  if(!['Weekday','Weekend','Flexible'].includes(schedule))errors.push('Select availability');
  if(!validMoney(minPay))errors.push('Minimum pay must be between $1 and $10,000');
  if(skills.length<1)errors.push('Enter at least one skill');
  if(body.age18Confirmed!==true)errors.push('Participant must confirm they are at least 18 (not independently verified)');
  if(errors.length)return {ok:false,errors};
  return {ok:true,value:{id:randomUUID(),name,city,schedule,skills,remoteAvailable,minPayCents:Math.round(minPay*100),completedJobs:0,rating:null,verification:'DEMO_UNVERIFIED',createdAt:new Date().toISOString(),demo:true,age18SelfAttested:true}};
}
export const REMOTE_CATEGORIES = Object.freeze(['Digital Setup', 'Content & Copy']);
export function matchWorkers(mission,workers) {
  if(!mission || !Array.isArray(workers)) return [];
  const {workerPayCents}=splitPayment(mission.priceCents);
  return workers.map(worker=>{
    const required = mission.skills.map(x=>x.toLowerCase());
    const owned = worker.skills.map(x=>x.toLowerCase());
    const matching = required.filter(x=>owned.includes(x));
    const skillRatio=matching.length/Math.max(required.length,1);
    const scheduled = mission.schedule==='Flexible'||worker.schedule==='Flexible'||mission.schedule===worker.schedule;
    const exactCity = worker.city.trim().toLowerCase() === mission.city.trim().toLowerCase();
    const remoteCovered = !exactCity && REMOTE_CATEGORIES.includes(mission.category) && worker.remoteAvailable === true;
    const locationCovered = exactCity || remoteCovered;
    const affordable = worker.minPayCents<=workerPayCents;
    // Do not auto-qualify a different-city worker for on-site service without travel verification.
    const eligible=matching.length===required.length && scheduled && affordable && locationCovered && !mission.safetyHold && !assessScope(mission).flags.some(f=>f!=='HUMAN_SCOPE_REVIEW'&&f!=='POTENTIAL_ON_SITE_WORK');
    const score=Math.round(42*skillRatio +18*(scheduled?1:0)+14*(locationCovered?1:0)+16*(affordable?1:0)+10*Math.min((worker.completedJobs||0)/10,1));
    const reasons=[`${matching.length}/${required.length} required skills`,scheduled?'Schedule fits':'Schedule conflict',exactCity?'Same city':remoteCovered?'Remote delivery accepted':'Location not confirmed',affordable?'Minimum pay fits':'Below required pay'];
    return {workerId:worker.id,name:worker.name,score,eligible,matchingSkills:matching,reasons,verification:worker.verification};
  }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score);
}
export function missionReadiness(mission, workers) {
  const allMatches=matchWorkers(mission,workers);
  const eligible=allMatches.filter(x=>x.eligible);
  const split=splitPayment(mission.priceCents);
  const flags=[];
  if(mission.safetyHold) flags.push({code:'SAFETY_HOLD',severity:'critical',message:'Incident reported. All progression is blocked except cancellation. This demo does not contact emergency services.'});
  flags.push({code:'NO_REAL_DISPATCH',severity:'high',message:'No real-world work may be dispatched, even if the simulated match is eligible.'});
  if(!eligible.length) flags.push({code:'NO_ELIGIBLE_PARTICIPANTS',severity:'high',message:'No currently eligible participant meets the location, schedule, pay and skill requirements.'});
  if(mission.skills.length>3) flags.push({code:'COMPLEX_SCOPE',severity:'info',message:'Multiple specialized skills may be easier to fulfill through separate assignments.'});
  if(mission.description.length<40) flags.push({code:'SCOPE_DETAIL',severity:'medium',message:'Add clearer acceptance criteria before assigning a real project.'});
  flags.push({code:'DEMO_NOT_VERIFIED',severity:'info',message:'Buyer, participants and demand are fictional until independently verified.'});
  return {missionId:mission.id,safetyReview:mission.safetyReview||assessScope(mission),safetyHold:!!mission.safetyHold,eligibleCount:eligible.length,bestMatch:eligible[0]||null,workerPayCents:split.workerPayCents,platformFeeCents:split.platformFeeCents,flags,readyForDemoAssignment:mission.status==='APPROVED'&&eligible.length>0,requiresHumanVerification:true};
}
export function analyzeDemand(missions, workers) {
  const active=missions.filter(m=>!['COMPLETED','CANCELLED'].includes(m.status));
  const byCategory=categories.map(category=>{
    const candidates=active.filter(m=>m.category===category);
    const eligibleCoverage=candidates.filter(m=>matchWorkers(m,workers).some(x=>x.eligible)).length;
    return {category,openRequests:candidates.length,coveredRequests:eligibleCoverage,uncoveredRequests:candidates.length-eligibleCoverage,
      requestedValueCents:candidates.reduce((a,m)=>a+m.priceCents,0)};
  }).sort((a,b)=>b.uncoveredRequests-a.uncoveredRequests||b.requestedValueCents-a.requestedValueCents);
  const gaps=new Map();
  const uncovered=active.filter(m=>!matchWorkers(m,workers).some(x=>x.eligible));
  for(const mission of uncovered) for(const skill of mission.skills){
    const k=skill.trim().toLowerCase();const entry=gaps.get(k)||{skill,count:0};entry.count++;gaps.set(k,entry);
  }
  const count=status=>missions.filter(m=>m.status===status).length;
  const potential=active.reduce((a,m)=>a+splitPayment(m.priceCents).workerPayCents,0);
  const completed=missions.filter(m=>m.status==='COMPLETED');
  return {sandbox:true,note:'All opportunity figures are fictional, not validated market demand or actual earnings.',
    pipeline:{new:count('NEW'),approved:count('APPROVED'),assigned:count('ASSIGNED'),submitted:count('SUBMITTED'),completed:count('COMPLETED'),cancelled:count('CANCELLED')},
    potentialWorkerPayCents:potential,
    completedWorkerPayCents:completed.reduce((a,m)=>a+splitPayment(m.priceCents).workerPayCents,0),
    activeRequests:active.length,uncoveredCount:uncovered.length,
    byCategory,uncoveredMissions:uncovered.map(m=>({id:m.id,title:m.title,category:m.category,city:m.city,skills:m.skills})),
    skillGaps:[...gaps.values()].sort((a,b)=>b.count-a.count).slice(0,8)
  };
}
export function changeMission(mission,next,opts={},workers=[]) {
  if(!NEXT[mission.status]?.includes(next))throw new Error(`Cannot move ${mission.status} to ${next}`);
  if(mission.safetyHold && next!==STATUS.CANCELLED)throw new Error('SAFETY_HOLD: Cancel this demo mission; it cannot resume.');
  const scope=assessScope(mission);
  if(scope.status==='BLOCKED' && next!==STATUS.CANCELLED)throw new Error('UNSAFE_SCOPE: Mission is blocked.');
  if(next===STATUS.APPROVED && !(opts.safetyReviewed===true && clean(opts.reviewNote,240).length>=15))throw new Error('Operator must attest to a simulated scope review and provide notes (15+ characters). This does not authorize real work.');
  const updated={...mission,status:next,updatedAt:new Date().toISOString()};
  if(next===STATUS.APPROVED)updated.safetyReview={...scope,reviewedAt:updated.updatedAt,reviewNote:clean(opts.reviewNote,240),demoOnly:true};
  if(next===STATUS.ASSIGNED){
    if(!mission.safetyReview?.demoOnly)throw new Error('Simulated scope review required before assignment');
    const worker=workers.find(x=>x.id===(opts.workerId||mission.workerId));
    if(!worker)throw new Error('Choose a valid worker');
    const match=matchWorkers(mission,[worker])[0];
    if(!match.eligible)throw new Error(`Worker is not eligible: ${match.reasons.join(', ')}`);
    updated.workerId=worker.id;
    updated.buyerAccepted=false;
  }
  if(next===STATUS.SUBMITTED){
    if(!mission.workerId)throw new Error('Assign a participant first');
    if(clean(opts.proofNote,600).length<12)throw new Error('Completion notes must be at least 12 characters');
    updated.proofNote=clean(opts.proofNote,600);
  }
  if(next===STATUS.COMPLETED){
    if(!mission.proofNote)throw new Error('Completion proof is missing');
    if(opts.buyerAccepted!==true)throw new Error('Customer approval must be explicitly recorded');
    updated.buyerAccepted=true;
  }
  if(next===STATUS.CANCELLED)updated.cancelReason=clean(opts.reason,160)||'Cancelled in demo';
  return updated;
}
export function reportIncident(mission,note,severity='HIGH') {
  if(!['LOW','HIGH','CRITICAL'].includes(severity))throw new Error('Invalid incident severity');
  const summary=clean(note,900);
  if(summary.length<20)throw new Error('Describe the safety concern in at least 20 characters');
  if(['COMPLETED','CANCELLED'].includes(mission.status))throw new Error('Mission is already closed; use a dedicated production incident channel when available');
  return {...mission,safetyHold:true,incidentCount:(mission.incidentCount||0)+1,lastIncident:{id:randomUUID(),severity,note:summary,createdAt:new Date().toISOString(),demo:true},updatedAt:new Date().toISOString()};
}
export function aggregate(missions,workers){
  const completed=missions.filter(x=>x.status===STATUS.COMPLETED);
  const completedGrossCents=completed.reduce((sum,x)=>sum+x.priceCents,0);
  const platformFeeCents=completed.reduce((sum,x)=>sum+splitPayment(x.priceCents).platformFeeCents,0);
  const workerPayCents=completed.reduce((sum,x)=>sum+splitPayment(x.priceCents).workerPayCents,0);
  return { safetyHolds:missions.filter(x=>x.safetyHold).length,totalMissions:missions.length,openMissions:missions.filter(x=>['NEW','APPROVED'].includes(x.status)).length,activeMissions:missions.filter(x=>['ASSIGNED','SUBMITTED'].includes(x.status)).length,completedMissions:completed.length,participants:workers.length,completedGrossCents,platformFeeCents,workerPayCents,demo:true};
}

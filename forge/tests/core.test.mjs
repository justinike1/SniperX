import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMission,validateWorker,matchWorkers,changeMission,splitPayment,aggregate} from '../core.mjs';
const make=()=>validateMission({title:'Photograph local store and prepare ten listings',description:'Photograph products and prepare deliverable gallery for the business owner.',buyer:'Example Buyer',city:'Rutherford, NJ',category:'Business Photos',schedule:'Weekend',skills:['Photography'],priceUSD:249}).value;
const worker=(over={})=>validateWorker({name:'Sample Worker',city:'Rutherford, NJ',schedule:'Weekend',skills:['Photography'],minPayUSD:90,age18Confirmed:true,...over}).value;
test('missions require real descriptions and positive price',()=>{assert.equal(validateMission({title:'Hello',priceUSD:-50}).ok,false);assert.equal(make().status,'NEW')});
test('payment split preserves integer cents',()=>{const r=splitPayment(24900);assert.equal(r.platformFeeCents,6972);assert.equal(r.workerPayCents,17928);assert.equal(r.platformFeeCents+r.workerPayCents,24900)});
test('matching requires a shared skill, availability and pay fit',()=>{const m=make();const a=worker();const b=worker({skills:['Guitar'],name:'Another Worker'});const c=worker({minPayUSD:500,name:'Unaffordable Worker'});const d=worker({schedule:'Weekday',name:'Unavailable Worker'});const r=matchWorkers(m,[a,b,c,d]);assert.equal(r.filter(x=>x.eligible).length,1);assert.equal(r[0].workerId,a.id)});
test('cannot assign a worker who fails qualification',()=>{const m=changeMission(make(),'APPROVED',{safetyReviewed:true,reviewNote:'Human reviewed this fictional demo assignment.'});assert.throws(()=>changeMission(m,'ASSIGNED',{workerId:worker({skills:['Guitar']}).id},[worker()]))});
test('approval then assignment then proof then acceptance',()=>{const w=worker();let m=make();m=changeMission(m,'APPROVED',{safetyReviewed:true,reviewNote:'Human reviewed this fictional demo assignment.'});m=changeMission(m,'ASSIGNED',{workerId:w.id},[w]);assert.throws(()=>changeMission(m,'COMPLETED'));assert.throws(()=>changeMission(m,'SUBMITTED',{proofNote:'short'}));m=changeMission(m,'SUBMITTED',{proofNote:'Ten gallery photos delivered.'});assert.throws(()=>changeMission(m,'COMPLETED',{buyerAccepted:false}));m=changeMission(m,'COMPLETED',{buyerAccepted:true});assert.equal(m.buyerAccepted,true);const sum=aggregate([m],[w]);assert.equal(sum.workerPayCents,17928);assert.equal(sum.completedMissions,1)});
test('bad transition and invalid amount cannot inflate earnings',()=>{const m=make();assert.throws(()=>changeMission(m,'COMPLETED'));assert.throws(()=>splitPayment(-100));assert.equal(aggregate([m],[]).workerPayCents,0)});
test('input sanitization truncates long strings',()=>{const m=make();assert.equal(m.title.length<91,true);const val=validateWorker({name:'A',city:'Rutherford',skills:['Photography'],minPayUSD:50,schedule:'Weekend'});assert.equal(val.ok,false)});
test('returned delivery preserves worker assignment during rework',()=>{const w=worker();let m=changeMission(make(),'APPROVED',{safetyReviewed:true,reviewNote:'Human reviewed this fictional demo assignment.'});m=changeMission(m,'ASSIGNED',{workerId:w.id},[w]);m=changeMission(m,'SUBMITTED',{proofNote:'Photos delivered to the buyer.'});m=changeMission(m,'ASSIGNED',{},[w]);assert.equal(m.workerId,w.id);assert.equal(m.status,'ASSIGNED')});

import { analyzeDemand, missionReadiness, REMOTE_CATEGORIES, reportIncident } from '../core.mjs';
import {assessScope} from '../safety.mjs';

test('in-person assignments in another city are ineligible without verified travel coverage', () => {
  const job = make();
  const outOfTown = worker({city:'Hackensack, NJ',remoteAvailable:true});
  const match = matchWorkers(job,[outOfTown])[0];
  assert.equal(match.eligible,false);
  assert.ok(match.reasons.includes('Location not confirmed'));
});

test('explicitly remote digital assignments can match across cities', () => {
  const job = {...make(),category:REMOTE_CATEGORIES[0]};
  const remoteWorker = worker({city:'Hackensack, NJ',remoteAvailable:true});
  const noRemoteWorker = worker({city:'Hackensack, NJ',remoteAvailable:false,name:'Not Remote'});
  const matches = matchWorkers(job,[remoteWorker,noRemoteWorker]);
  assert.equal(matches.find(x=>x.workerId===remoteWorker.id).eligible,true);
  assert.equal(matches.find(x=>x.workerId===noRemoteWorker.id).eligible,false);
});

test('demand intelligence counts uncovered requests and never calls them verified', () => {
  const mission = make();
  const outOfTown = worker({city:'Far Away, NJ'});
  const signal = analyzeDemand([mission],[outOfTown]);
  assert.equal(signal.uncoveredCount,1);
  assert.equal(signal.activeRequests,1);
  assert.equal(signal.uncoveredMissions[0].id,mission.id);
  assert.equal(signal.potentialWorkerPayCents,17928);
  assert.equal(signal.completedWorkerPayCents,0);
  assert.equal(signal.sandbox,true);
  const readiness = missionReadiness(mission,[outOfTown]);
  assert.equal(readiness.eligibleCount,0);
  assert.equal(readiness.requiresHumanVerification,true);
});

test('cancelled or completed missions are excluded from unmet demand', () => {
  const m = make();
  const cancellation = changeMission(m,'CANCELLED');
  const signal = analyzeDemand([cancellation],[]);
  assert.equal(signal.activeRequests,0);
  assert.equal(signal.potentialWorkerPayCents,0);
  assert.equal(signal.uncoveredCount,0);
});

test('single-worker assignments require ALL requested skills, not a partial overlap',()=>{
 const mission={...make(),skills:['Photography','Copywriting']};
 const partial=worker();
 const full=worker({skills:['Photography','Copywriting'],name:'Full Skill Match'});
 const matches=matchWorkers(mission,[partial,full]);
 assert.equal(matches.find(x=>x.workerId===partial.id).eligible,false);
 assert.equal(matches.find(x=>x.workerId===full.id).eligible,true);
});


test('forbidden hazardous, vulnerable-person and fraudulent scopes are blocked at intake',()=>{
  for(const description of [
    'Replace live electrical wiring while working in the electrical cabinet.',
    'Transporting children to private medical appointments in a car.',
    'Create fake reviews for our online shop to improve its ranking.',
    'We require a crypto deposit to unlock the next job assignment.'
  ]) {
    const bad=validateMission({title:'Some useful work in the local community',description,buyer:'Example Buyer',city:'Rutherford, NJ',category:'Content & Copy',schedule:'Weekend',skills:['Copywriting'],priceUSD:200});
    assert.equal(bad.ok,false,description);
  }
  assert.equal(assessScope({title:'Roofing repair',description:'Please do the roofing work',category:'Local Admin'}).status,'BLOCKED');
});
test('human-attested review required even in sandbox',()=>{
  const m=make();assert.throws(()=>changeMission(m,'APPROVED'));
  assert.throws(()=>changeMission(m,'APPROVED',{safetyReviewed:true,reviewNote:'ok'}));
  const approved=changeMission(m,'APPROVED',{safetyReviewed:true,reviewNote:'Demo scope review only, not approved for real work.'});
  assert.equal(approved.safetyReview.demoOnly,true);
});
test('age self-attestation is required and never claims independent verification',()=>{
  const no=validateWorker({name:'Example Worker',city:'Rutherford, NJ',schedule:'Flexible',skills:['Copywriting'],minPayUSD:50});
  assert.equal(no.ok,false);
  assert.equal(worker().verification,'DEMO_UNVERIFIED');
});
test('incident report blocks all progression and further matching until terminal cancellation',()=>{
  const w=worker();let m=changeMission(make(),'APPROVED',{safetyReviewed:true,reviewNote:'Fictional review only; no real dispatch.'});
  assert.equal(matchWorkers(m,[w])[0].eligible,true);
  m=reportIncident(m,'Buyer reported an unsafe working condition','CRITICAL');
  assert.equal(m.safetyHold,true);
  assert.equal(matchWorkers(m,[w])[0].eligible,false);
  assert.throws(()=>changeMission(m,'ASSIGNED',{workerId:w.id},[w]),/SAFETY_HOLD/);
  assert.throws(()=>reportIncident(m,'short','HIGH'),/at least 20/);
  m=changeMission(m,'CANCELLED');
  assert.equal(m.status,'CANCELLED');
});

import {randomUUID} from 'node:crypto';
import {validateMission,validateWorker,changeMission as rawChangeMission,matchWorkers,aggregate,analyzeDemand,splitPayment,reportIncident as rawReportIncident} from './core.mjs';
import {fail,secret,hashSecret,hashPassword,normalizeEmail,verifyPassword,displayName,publicUser,safeEqual} from './security.mjs';
import {listCurrentJobs,refreshJobs} from './jobs.mjs';
import {handleVerification} from './verification.mjs';
import {handleEarn} from './earn.mjs';
import {handleDiscover} from './discover.mjs';
import {handleQuickPost} from './quickpost.mjs';
import {handlePayouts,releaseSandboxEarnings,voidSandboxFunding} from './payouts.mjs';
import {handleStripeTest} from './stripe_test.mjs';
import {launchReadiness} from './reconcile.mjs';
import {INDUSTRIES,SERVICES,catalogSummary,searchIndustries} from './marketplace.mjs';

// Return expected state-machine violations as conflicts, not internal server failures.
function changeMission(...args){
  try{return rawChangeMission(...args)}catch(error){
    const message=String(error?.message||'Invalid transition');
    const expected=/^(Cannot move|SAFETY_HOLD:|UNSAFE_SCOPE:|Operator must|Simulated scope|Choose a valid worker|Worker is not eligible|Assign a participant|Completion notes|Completion proof|Customer approval)/;
    if(expected.test(message))fail(409,message);
    throw error;
  }
}
function reportIncident(...args){try{return rawReportIncident(...args)}catch(error){
 const message=String(error?.message||'Invalid incident');
 if(/^(Invalid incident severity|Describe the safety concern|Mission is already closed)/.test(message))fail(422,message);
 throw error;
}}
const DAY=86400000, SESSION_LIFE=7*DAY;
const json=x=>JSON.stringify(x);
function requireRole(ctx,...roles){if(!ctx.user)fail(401,'Authentication required');if(!roles.includes(ctx.user.role))fail(403,'Access denied')}
function actorMission(ctx,id){requireRole(ctx,'admin','buyer','worker');const m=ctx.store.getMission(id);if(!m)fail(404,'Mission not found');if(ctx.user.role!=='admin'&&m.buyerUserId!==ctx.user.id&&m.workerUserId!==ctx.user.id)fail(404,'Mission not found');return m}
const userById=(s,id)=>s.one('SELECT * FROM users WHERE id=?',id);
function saveWithAudit(ctx,m,action,detail){ctx.store.transaction(()=>{ctx.store.saveMission(m);ctx.store.audit(ctx.user.id,action,'mission',m.id,detail)})}
function publicMission(m){const {buyerUserId,workerUserId,...data}=m;return {...data,buyerUserId,workerUserId,realPayments:false,realDispatch:false};}
function cleanNote(x,min=10,max=600){if(typeof x!=='string')fail(422,'Description required');const t=x.trim().slice(0,max);if(t.length<min)fail(422,`At least ${min} characters required`);return t;}
export function currentSession(ctx){
 const cookie=ctx.cookies.forge_session;
 if(!cookie||typeof cookie!=='string'||cookie.length>100)return null;
 const sess=ctx.store.one('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?',hashSecret(cookie),Date.now());
 if(!sess)return null;const user=userById(ctx.store,sess.user_id);
 return user?{user,csrf:sess.csrf,session:sess,token:cookie}:null;
}
export async function handle(ctx){const {store,method,path,body,res,secure}=ctx;
 const stripeTestResponse=await handleStripeTest(ctx);
 if(stripeTestResponse!==undefined)return stripeTestResponse;
 if(method==='GET'&&path==='/api/admin/launch-audit'){
  requireRole(ctx,'admin');return launchReadiness(store,{stripeTestConfigured:!!ctx.stripeTestClient});
 }
 const payoutResponse=handlePayouts(ctx);
 if(payoutResponse!==undefined)return payoutResponse;
 const quickPostResponse=handleQuickPost(ctx);
 if(quickPostResponse!==undefined)return quickPostResponse;
 const discoveryResponse=handleDiscover(ctx);
 if(discoveryResponse!==undefined)return discoveryResponse;
 const earnResponse=handleEarn(ctx);
 if(earnResponse!==undefined)return earnResponse;
 const verificationResponse=handleVerification(ctx);
 if(verificationResponse!==undefined)return verificationResponse;
 if(method==='GET'&&path==='/api/health')return {status:'ok',mode:'private-beta',realPayments:false,realDispatch:false,publicLaunchReady:false};
 if(method==='GET'&&path==='/api/session')return {authenticated:!!ctx.user,user:ctx.user?publicUser(ctx.user):null,csrf:ctx.session?.csrf||null,launchMode:'PRIVATE_INVITE_ONLY',realPayments:false,realDispatch:false};
 if(method==='POST'&&path==='/api/auth/login'){
  const email=normalizeEmail(body.email);const candidate=store.one('SELECT * FROM users WHERE email=?',email);
  // Constant-work dummy hash for unknown accounts avoids an obvious user-enumeration timing signal.
  const DUMMY='scrypt$0123456789abcdef0123456789abcdef$'+ '0'.repeat(128);
  const valid=verifyPassword(body.password,candidate?.password_hash||DUMMY);
  if(!candidate||!valid)fail(401,'Invalid email or password');
  const token=secret(),csrf=secret(),now=new Date().toISOString();
  store.transaction(()=>{
   store.run('DELETE FROM sessions WHERE expires_at<=?',Date.now());
   store.run('INSERT INTO sessions VALUES(?,?,?,?,?)',hashSecret(token),candidate.id,csrf,Date.now()+SESSION_LIFE,now);
   store.audit(candidate.id,'LOGIN','session',null,{});
  });
  res.setHeader('Set-Cookie',ctx.sessionCookie(token));
  return {authenticated:true,user:publicUser(candidate),csrf};
 }
 if(method==='POST'&&path==='/api/auth/register'){
  const email=normalizeEmail(body.email),name=displayName(body.name),passwordHash=hashPassword(body.password);
  if(typeof body.invitation!=='string'||body.invitation.length<20)fail(422,'Valid invitation required');
  const tokenHash=hashSecret(body.invitation);
  const inv=store.one('SELECT * FROM invitations WHERE token_hash=?',tokenHash);
  if(!inv||inv.expires_at<Date.now()||inv.redeemed_at||inv.email!==email)fail(403,'Invalid or expired invitation');
  if(store.one('SELECT id FROM users WHERE email=?',email))fail(409,'Registration not available for this email');
  const id=randomUUID(),now=new Date().toISOString();
  store.transaction(()=>{
   const change=store.run('UPDATE invitations SET redeemed_at=? WHERE token_hash=? AND redeemed_at IS NULL AND expires_at>?',now,tokenHash,Date.now());
   if(change.changes!==1)fail(409,'Invitation no longer available');
   store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',id,email,passwordHash,inv.role,name,now);
   store.audit(id,'ACCOUNT_CREATED','user',id,{role:inv.role});
  });
  return {created:true,message:'Account created. Sign in to continue.'};
 }
 if(method==='POST'&&path==='/api/auth/logout'){
  requireRole(ctx,'admin','buyer','worker');
  store.transaction(()=>{store.run('DELETE FROM sessions WHERE token_hash=?',hashSecret(ctx.sessionToken));store.audit(ctx.user.id,'LOGOUT','session',null,{})});
  res.setHeader('Set-Cookie',ctx.clearCookie());return {ok:true};
 }
 if(method==='POST'&&path==='/api/admin/invitations'){
  requireRole(ctx,'admin');const email=normalizeEmail(body.email),role=body.role;
  if(!['buyer','worker'].includes(role))fail(422,'Role must be buyer or worker');
  const invitation=secret(),now=new Date().toISOString();const expiresAt=Date.now()+48*60*60*1000;
  store.transaction(()=>{store.run('INSERT INTO invitations VALUES(?,?,?,?,?,?)',hashSecret(invitation),email,role,expiresAt,null,ctx.user.id);store.audit(ctx.user.id,'INVITATION_CREATED','invitation',null,{email,role})});
  return {invitation,role,email,expiresAt:new Date(expiresAt).toISOString(),message:'Copy now: invitation tokens are not stored in plaintext.'};
 }
 if(method==='GET'&&path==='/api/admin/release-gates'){
  requireRole(ctx,'admin');
  return {publicLaunchApproved:false,realDispatchAllowed:false,realPaymentsAllowed:false,
    gates:[
      {id:'identity',label:'Independent identity verification provider',complete:false},
      {id:'licenses',label:'Authoritative occupation- and jurisdiction-specific licenses',complete:false},
      {id:'background',label:'Lawfully configured background screening and adverse action procedure',complete:false},
      {id:'business',label:'Buyer and employer identity/business vetting',complete:false},
      {id:'payments',label:'Approved payment provider and reconciled ledger',complete:false},
      {id:'legal',label:'Jurisdiction-specific legal review and worker classification',complete:false},
      {id:'insurance',label:'Coverage appropriate to actual categories and locations',complete:false},
      {id:'security',label:'Independent application penetration test and risk review',complete:false},
      {id:'operations',label:'Staffed incident response and dispute procedures',complete:false},
      {id:'infra',label:'Managed database, backups, disaster recovery and monitoring',complete:false}
    ]};
 }
 if(method==='GET'&&path==='/api/catalog'){
  requireRole(ctx,'admin','buyer','worker');
  return {industries:INDUSTRIES,summary:catalogSummary(),allCareerListingsExternal:true};
 }
 if(method==='GET'&&path==='/api/services'){
  requireRole(ctx,'admin','buyer','worker');
  return {services:SERVICES,realOrdersAccepted:false,allExamplesOnly:true};
 }
 if(method==='GET'&&path==='/api/jobs'){
  requireRole(ctx,'admin','buyer','worker');
  return {jobs:listCurrentJobs(store),note:'External employment listings only. Retrieved from named sources; employers and qualifications are not independently verified. Apply via official publisher links.'};
 }
 if(method==='POST'&&path==='/api/admin/jobs/refresh'){
  requireRole(ctx,'admin');
  const result=await refreshJobs(store);
  store.audit(ctx.user.id,'EXTERNAL_JOBS_REFRESH','jobs',null,{count:result.count,reports:result.reports.map(({source,count,ok})=>({source,count,ok}))});
  return result;
 }
 if(method==='GET'&&path==='/api/admin/audit'){
  requireRole(ctx,'admin');return {events:store.all('SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 150').map(e=>({...e,detail:JSON.parse(e.detail)}))};
 }
 if(method==='POST'&&path==='/api/workers/me'){
  requireRole(ctx,'worker');if(store.one('SELECT user_id FROM workers WHERE user_id=?',ctx.user.id))fail(409,'Profile already exists');
  const raw=validateWorker({...body,name:ctx.user.display_name});if(!raw.ok)fail(422,raw.errors.join('; '));
  const worker={...raw.value,verification:'DEMO_UNVERIFIED',userId:ctx.user.id};
  store.transaction(()=>{store.run('INSERT INTO workers VALUES(?,?,?)',ctx.user.id,json(worker),new Date().toISOString());store.audit(ctx.user.id,'WORKER_PROFILE_CREATED','worker',ctx.user.id,{})});
  return {worker,realDispatch:false};
 }
 if(method==='GET'&&path==='/api/workers/me'){
  requireRole(ctx,'worker');const w=store.one('SELECT * FROM workers WHERE user_id=?',ctx.user.id);return {worker:w?store.workerFromRow(w):null};
 }
 if(method==='GET'&&path==='/api/admin/workers'){
  requireRole(ctx,'admin');return {workers:store.listWorkers()};
 }
 const workerReview=path.match(/^\/api\/admin\/workers\/([^/]+)\/review$/);
 if(method==='POST'&&workerReview){
  requireRole(ctx,'admin');const row=store.one('SELECT * FROM workers WHERE user_id=?',workerReview[1]);if(!row)fail(404,'Worker profile not found');
  const notes=cleanNote(body.notes,20,700);
  // Human review here is a simulated onboarding marker, NOT identity or license verification.
  const worker={...store.workerFromRow(row),verification:'DEMO_REVIEWED',reviewNote:notes,reviewedAt:new Date().toISOString(),reviewedBy:ctx.user.id};
  store.transaction(()=>{store.run('UPDATE workers SET data=?,updated_at=? WHERE user_id=?',json(worker),new Date().toISOString(),row.user_id);store.audit(ctx.user.id,'DEMO_WORKER_REVIEW','worker',row.user_id,{notes})});
  return {worker,identityVerified:false};
 }
 if(method==='POST'&&path==='/api/missions'){
  requireRole(ctx,'buyer');
  // Beta currently accepts only remote/low-risk categories; safety keyword rules are not enough for public work.
  if(!['Content & Copy','Digital Setup'].includes(body.category))fail(422,'Private beta accepts remote digital services only');
  const outcome=validateMission({...body,buyer:ctx.user.display_name});if(!outcome.ok)fail(422,outcome.errors.join('; '));
  const urgency=body.urgency||'FLEXIBLE';
  if(!['TODAY','NEXT_48H','FLEXIBLE'].includes(urgency))fail(422,'Choose a valid urgency');
  const estimatedMinutes=body.estimatedMinutes===undefined?60:Number(body.estimatedMinutes);
  if(!Number.isInteger(estimatedMinutes)||estimatedMinutes<15||estimatedMinutes>480)fail(422,'Estimated duration must be between 15 and 480 minutes');
  const mission={...outcome.value,urgency,estimatedMinutes,buyerUserId:ctx.user.id,workerUserId:null,
   engagementIntent:'SERVICE_PROJECT',laborClassification:'NOT_DETERMINED',classificationReviewRequired:true,fundsCollected:false};
  store.transaction(()=>{store.run('INSERT INTO missions VALUES(?,?,?,?,?,?)',mission.id,ctx.user.id,null,json(store.stripRelations(mission)),mission.createdAt,mission.updatedAt);store.audit(ctx.user.id,'MISSION_CREATED','mission',mission.id,{category:mission.category})});
  return {mission:publicMission(mission)};
 }
 if(method==='GET'&&path==='/api/missions'){
  requireRole(ctx,'admin','buyer','worker');
  const filter=ctx.user.role==='admin'?'':ctx.user.role==='buyer'?' WHERE buyer_user_id=?':' WHERE worker_user_id=?';
  const args=ctx.user.role==='admin'?[]:[ctx.user.id];
  const missions=store.all(`SELECT * FROM missions${filter} ORDER BY created_at DESC LIMIT 250`,...args).map(store.missionFromRow).map(publicMission);
  return {missions,role:ctx.user.role,simulated:true};
 }
 const detail=path.match(/^\/api\/missions\/([^/]+)$/);
 if(method==='GET'&&detail)return {mission:publicMission(actorMission(ctx,detail[1]))};
 const matches=path.match(/^\/api\/missions\/([^/]+)\/matches$/);
 if(method==='GET'&&matches){requireRole(ctx,'admin');const m=actorMission(ctx,matches[1]);
  const available=store.listWorkers();return {matches:matchWorkers(m,available).map(result=>({...result,workerUserId:available.find(w=>w.id===result.workerId)?.userId,eligible:result.eligible&&available.some(w=>w.id===result.workerId&&w.verification==='DEMO_REVIEWED')})),simulated:true};
 }
 const approve=path.match(/^\/api\/missions\/([^/]+)\/approve$/);
 if(method==='POST'&&approve){requireRole(ctx,'admin');const m=actorMission(ctx,approve[1]);
  const note=cleanNote(body.note,20,600);const changed=changeMission(m,'APPROVED',{safetyReviewed:true,reviewNote:note});saveWithAudit(ctx,changed,'MISSION_APPROVED',{note});return {mission:publicMission(changed)};
 }
 const assign=path.match(/^\/api\/missions\/([^/]+)\/assign$/);
 if(method==='POST'&&assign){requireRole(ctx,'admin');const m=actorMission(ctx,assign[1]);
  const target=store.one('SELECT * FROM workers WHERE user_id=?',body.workerUserId);
  if(!target)fail(422,'Worker profile not found');const worker=store.workerFromRow(target);
  if(worker.verification!=='DEMO_REVIEWED')fail(422,'Participant has not passed even simulated onboarding review');
  const changed=changeMission(m,'ASSIGNED',{workerId:worker.id},[worker]);changed.workerUserId=worker.userId;
  saveWithAudit(ctx,changed,'MISSION_ASSIGNED_SIMULATED',{workerUserId:worker.userId});return {mission:publicMission(changed),realDispatch:false};
 }
 const submit=path.match(/^\/api\/missions\/([^/]+)\/submit$/);
 if(method==='POST'&&submit){requireRole(ctx,'worker');const m=actorMission(ctx,submit[1]);if(m.workerUserId!==ctx.user.id)fail(403,'Not assigned to you');
  const changed=changeMission(m,'SUBMITTED',{proofNote:cleanNote(body.proof,12,500)});saveWithAudit(ctx,changed,'MISSION_SUBMITTED_SIMULATED',{});return {mission:publicMission(changed)};
 }
 const accept=path.match(/^\/api\/missions\/([^/]+)\/accept$/);
 if(method==='POST'&&accept){requireRole(ctx,'buyer');const m=actorMission(ctx,accept[1]);if(m.buyerUserId!==ctx.user.id)fail(403,'Not your request');
  const changed=changeMission(m,'COMPLETED',{buyerAccepted:true});
  const payoutTest=store.transaction(()=>{
    store.saveMission(changed);
    const release=releaseSandboxEarnings(store,changed);
    store.audit(ctx.user.id,'BUYER_ACCEPTED_SIMULATED','mission',m.id,{sandboxCreditReleased:release.released});
    return release;
  });
  return {mission:publicMission(changed),sandboxEarnings:payoutTest,paymentCaptured:false,payoutSent:false};
 }
 const cancel=path.match(/^\/api\/missions\/([^/]+)\/cancel$/);
 if(method==='POST'&&cancel){requireRole(ctx,'admin','buyer');const m=actorMission(ctx,cancel[1]);
  if(ctx.user.role==='buyer'&&m.buyerUserId!==ctx.user.id)fail(403,'Not your request');
  const changed=changeMission(m,'CANCELLED',{reason:cleanNote(body.reason,8,250)});
  const funding=store.transaction(()=>{
    store.saveMission(changed);
    const result=voidSandboxFunding(store,changed);
    store.audit(ctx.user.id,'MISSION_CANCELLED','mission',m.id,{sandboxFundsVoided:result.voided});
    return result;
  });
  return {mission:publicMission(changed),sandboxFunding:funding};
 }
 const incident=path.match(/^\/api\/missions\/([^/]+)\/incident$/);
 if(method==='POST'&&incident){const m=actorMission(ctx,incident[1]);const note=cleanNote(body.note,20,800);
  const changed=reportIncident(m,note,body.severity||'HIGH');
  store.transaction(()=>{store.saveMission(changed);store.run('INSERT INTO incidents VALUES(?,?,?,?,?,?)',randomUUID(),m.id,ctx.user.id,body.severity||'HIGH',note,new Date().toISOString());store.audit(ctx.user.id,'SAFETY_HOLD','mission',m.id,{severity:body.severity||'HIGH'})});
  return {mission:publicMission(changed),safetyHold:true,emergencyServicesContacted:false};
 }
 if(method==='GET'&&path==='/api/admin/overview'){
  requireRole(ctx,'admin');const missions=store.all('SELECT * FROM missions').map(store.missionFromRow),workers=store.listWorkers();
  return {summary:aggregate(missions,workers),intelligence:analyzeDemand(missions,workers),accountCount:store.one('SELECT count(*) n FROM users').n,holds:missions.filter(x=>x.safetyHold).map(x=>({id:x.id,title:x.title})),simulated:true};
 }
 fail(404,'Not found');
}

/**
 * Privacy-minimized verification CASE TRACKING for an invite-only private beta.
 * This module performs NO identity checks, background searches or license lookups.
 * In particular, MANUAL_EVIDENCE_RECORDED != VERIFIED or eligible for regulated work.
 */
import {randomUUID} from 'node:crypto';
import {fail} from './security.mjs';

export const VERIFICATION_KINDS=Object.freeze(['IDENTITY','BACKGROUND','LICENSE','BUSINESS']);
const ACTIONS=Object.freeze(['REVIEW_REQUIRED','REJECTED','CANCELLED','MANUAL_EVIDENCE_RECORDED']);
const MAX_CASES=100;
const MAX_NOTE=500;
const MAX_PURPOSE=180;
const MAX_JURISDICTION=40;
const MAX_LICENSE_TYPE=90;
const MAX_SOURCE_REF=300;

function safeText(s,max,{required=false}={}){
  if(typeof s!=='string')fail(422,'Expected text');
  const clean=s.trim();
  if((required&&!clean)||clean.length>max||/[\u0000-\u001f\u007f]/.test(clean))fail(422,'Invalid text');
  return clean;
}
function sourceURL(raw){
  const str=safeText(raw,MAX_SOURCE_REF,{required:true});let u;
  try{u=new URL(str)}catch{fail(422,'Official registry URL required')}
  const host=u.hostname.toLowerCase();
  // This is a conservative beta allowlist, NOT a guarantee that a page is authentic.
  // Add authorities only after legal/security review of each registry.
  const approved=host==='nj.gov'||host.endsWith('.nj.gov')||host==='newjersey.mylicense.com';
  if(u.protocol!=='https:'||!approved||u.username||u.password||u.port||u.hash)fail(422,'An allowed HTTPS registry URL is required');
  return u.href;
}
function mapped(r){
  if(!r)return null;
  return {id:r.id,subjectUserId:r.subject_user_id,kind:r.kind,purpose:r.purpose,
   jurisdiction:r.jurisdiction,licenseType:r.license_type,status:r.status,
   acknowledgedAt:r.acknowledged_at,consentLegalStatus:'NOT_LEGALLY_AUTHORIZED',
   reviewerNote:r.reviewer_note||null,registryURL:r.registry_url||null,reviewedAt:r.reviewed_at,
   expiresAt:r.expires_at,createdAt:r.created_at,updatedAt:r.updated_at,
   externallyVerified:false};
}
function getCase(store,id){return store.one('SELECT * FROM verification_cases WHERE id=?',id)}
function requireAdmin(ctx){if(ctx.user?.role!=='admin')fail(ctx.user?403:401,'Access denied')}
function requireOwnCase(ctx,id){
  if(!ctx.user)fail(401,'Authentication required');
  const c=getCase(ctx.store,id);
  if(!c||c.subject_user_id!==ctx.user.id)fail(404,'Case not found');
  return c;
}
function caseIsExpired(c,at=Date.now()){return !!(c.expires_at&&Date.parse(c.expires_at)<=at)}
function publicCase(row,{includeInternal=false}={}){
  const c=mapped(row);if(!c)return null;
  if(!includeInternal){delete c.reviewerNote;delete c.registryURL}
  return {...c,status:caseIsExpired(row)&&!['REJECTED','CANCELLED'].includes(row.status)?'EXPIRED':row.status};
}
function casePurpose(kind){return {
  IDENTITY:'Prepare for optional third-party identity verification after vendor onboarding',
  BACKGROUND:'Planning record only; screening forbidden until compliant notice and authorization',
  LICENSE:'Record need for an official, jurisdiction-specific professional credential check',
  BUSINESS:'Prepare business verification review for marketplace participation',
 }[kind];}
function createCase(ctx){
  requireAdmin(ctx);
  const b=ctx.body;
  if(typeof b.subjectUserId!=='string'||b.subjectUserId.length>80)fail(422,'Valid subject user ID required');
  const subject=ctx.store.one('SELECT id,role FROM users WHERE id=?',b.subjectUserId);
  if(!subject)fail(404,'Subject account not found');
  if(!VERIFICATION_KINDS.includes(b.kind))fail(422,'Unsupported verification kind');
  if(b.kind==='LICENSE'&&subject.role!=='worker')fail(422,'License reviews apply to participant accounts');
  if(b.kind==='BACKGROUND'&&subject.role!=='worker')fail(422,'Background screening workflow is for participants only');
  const jurisdiction=b.jurisdiction==null?'':safeText(b.jurisdiction,MAX_JURISDICTION);
  const licenseType=b.licenseType==null?'':safeText(b.licenseType,MAX_LICENSE_TYPE);
  if(b.kind==='LICENSE'&&(!jurisdiction||!licenseType))fail(422,'License jurisdiction and type required');
  if(b.kind!=='LICENSE'&&licenseType)fail(422,'License type only applies to license reviews');
  if(b.status||b.verified||b.providerResult||b.backgroundReport||b.identityDocument)fail(422,'Client may not supply a verification decision or sensitive report');
  const now=new Date().toISOString(),id=randomUUID(),purpose=casePurpose(b.kind);
  ctx.store.transaction(()=>{
    ctx.store.run(`INSERT INTO verification_cases
      (id,subject_user_id,kind,purpose,jurisdiction,license_type,status,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,id,subject.id,b.kind,purpose,jurisdiction,licenseType,'AWAITING_ACKNOWLEDGEMENT',ctx.user.id,now,now);
    ctx.store.audit(ctx.user.id,'VERIFICATION_CASE_CREATED','verification_case',id,{kind:b.kind,subjectUserId:subject.id});
  });
  return {case:publicCase(getCase(ctx.store,id),{includeInternal:true}),note:'Administrative tracking only. No check ordered or vendor connected.'};
}
function acknowledge(ctx,id){
  const row=requireOwnCase(ctx,id),b=ctx.body;
  if(b.acknowledge!==true)fail(422,'Explicit acknowledgement required');
  if(row.acknowledged_at)fail(409,'Already acknowledged');
  if(row.status!=='AWAITING_ACKNOWLEDGEMENT')fail(409,'Case is not awaiting acknowledgement');
  const now=new Date().toISOString();
  ctx.store.transaction(()=>{
    ctx.store.run('UPDATE verification_cases SET acknowledged_at=?,status=?,updated_at=? WHERE id=?',now,'AWAITING_PROVIDER',now,id);
    ctx.store.audit(ctx.user.id,'VERIFICATION_WORKFLOW_ACKNOWLEDGED','verification_case',id,{kind:row.kind,legalConsent:false});
  });
  return {case:publicCase(getCase(ctx.store,id)),legalConsent:false,message:'Acknowledgement recorded. This is NOT consent to order a background check or identity verification.'};
}
function reviewCase(ctx,id){
  requireAdmin(ctx);const row=getCase(ctx.store,id),b=ctx.body;
  if(!row)fail(404,'Case not found');
  if(!ACTIONS.includes(b.decision))fail(422,'Unsupported review decision');
  if(['REJECTED','CANCELLED'].includes(row.status))fail(409,'Case is closed');
  const note=safeText(b.note,MAX_NOTE,{required:true});
  if(note.length<20)fail(422,'Detailed reviewer note required');
  let registryURL=null;
  if(b.decision==='MANUAL_EVIDENCE_RECORDED'){
    if(row.kind!=='LICENSE')fail(422,'Manual registry evidence applies only to license cases');
    if(!row.acknowledged_at)fail(409,'Subject has not acknowledged the case');
    if(!['NJ','NEW JERSEY'].includes(row.jurisdiction.trim().toUpperCase()))fail(422,'Only New Jersey manual registry references are supported');
    registryURL=sourceURL(b.registryURL);
    if(typeof b.expiresAt!=='string'||!Number.isFinite(Date.parse(b.expiresAt))||Date.parse(b.expiresAt)<=Date.now())fail(422,'A future license expiry is required');
  }else if(b.registryURL||b.expiresAt)fail(422,'Evidence URL and expiry only allowed for manual license evidence');
  if(b.verified===true||b.status==='VERIFIED'||b.providerResult)fail(422,'Manual review cannot grant external verification');
  const now=new Date().toISOString();
  ctx.store.transaction(()=>{
    ctx.store.run(`UPDATE verification_cases SET status=?,reviewer_note=?,registry_url=?,expires_at=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?`,
      b.decision,note,registryURL,b.decision==='MANUAL_EVIDENCE_RECORDED'?new Date(b.expiresAt).toISOString():null,ctx.user.id,now,now,id);
    ctx.store.audit(ctx.user.id,'VERIFICATION_CASE_REVIEWED','verification_case',id,{kind:row.kind,decision:b.decision,registryURL});
  });
  return {case:publicCase(getCase(ctx.store,id),{includeInternal:true}),externallyVerified:false,eligibleForRegulatedWork:false};
}
export function verificationEligibility(cases,{needsIdentity=true,needsLicense=false,needsBackground=false}={}){
  const reasons=[];
  // No live verification provider has been integrated. Manual recorded evidence is insufficient.
  if(needsIdentity)reasons.push('Independent identity verification unavailable');
  if(needsLicense)reasons.push('Authoritative license verification provider unavailable');
  if(needsBackground)reasons.push('Legally configured background-screening provider unavailable');
  return {eligibleForRegulatedWork:false,reasons,caseCount:Array.isArray(cases)?cases.length:0,realVerificationEnabled:false};
}
export function handleVerification(ctx){
  const {method,path,store}=ctx;
  if(method==='GET'&&path==='/api/verification/me'){
    if(!ctx.user)fail(401,'Authentication required');
    return {cases:store.all('SELECT * FROM verification_cases WHERE subject_user_id=? ORDER BY created_at DESC LIMIT ?',ctx.user.id,MAX_CASES).map(publicCase),realVerificationEnabled:false};
  }
  const ownAck=path.match(/^\/api\/verification\/cases\/([0-9a-f-]{36})\/acknowledge$/);
  if(method==='POST'&&ownAck)return acknowledge(ctx,ownAck[1]);
  if(method==='GET'&&path==='/api/verification/me/eligibility'){
    if(!ctx.user)fail(401,'Authentication required');
    const cases=store.all('SELECT * FROM verification_cases WHERE subject_user_id=?',ctx.user.id);
    return verificationEligibility(cases,{needsIdentity:true,needsLicense:true,needsBackground:true});
  }
  if(method==='GET'&&path==='/api/admin/verification/cases'){
    requireAdmin(ctx);
    return {cases:store.all('SELECT * FROM verification_cases ORDER BY created_at DESC LIMIT ?',MAX_CASES).map(row=>publicCase(row,{includeInternal:true})),realVerificationEnabled:false};
  }
  if(method==='POST'&&path==='/api/admin/verification/cases')return createCase(ctx);
  const review=path.match(/^\/api\/admin\/verification\/cases\/([0-9a-f-]{36})\/review$/);
  if(method==='POST'&&review)return reviewCase(ctx,review[1]);
  return undefined;
}

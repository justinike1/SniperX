/**
 * Buyer quick intake: two legally distinct pathways.
 * A service PROJECT is a request for a deliverable; its worker classification
 * is NOT established by selecting the path. A W-2 SHIFT is an intake inquiry
 * that must remain offline until a lawful employer/payroll partner is in place.
 * Nothing here creates funded work, an employer, a staffing placement, wages,
 * or a legal independent-contractor determination.
 */
import {randomUUID} from 'node:crypto';
import {validateMission} from './core.mjs';
import {fail} from './security.mjs';

const urgencyOptions=new Set(['TODAY','NEXT_48H','FLEXIBLE']);
const clean=(x,max)=>typeof x==='string'?x.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').trim().slice(0,max):'';
const money=x=>typeof x==='number'&&Number.isFinite(x)&&x>=1&&x<=10000&&Math.abs(Math.round(x*100)-x*100)<0.000001;
const safeUrgency=x=>urgencyOptions.has(x)?x:'INVALID';
const defaultSkill={'Content & Copy':'Writing','Digital Setup':'Digital Setup'};

export function quickPost(store,user,body={}){
 if(!user)fail(401,'Authentication required');
 if(user.role!=='buyer')fail(403,'Only customers can create a quick request');
 if(!body||typeof body!=='object'||Array.isArray(body))fail(422,'Request must be an object');
 const requestType=body.requestType;
 const urgency=safeUrgency(body.urgency||'FLEXIBLE');
 if(urgency==='INVALID')fail(422,'Choose Today, Next 48 Hours, or Flexible');
 const title=clean(body.title,90),description=clean(body.description,500),city=clean(body.city,75);
 if(title.length<8||description.length<20||city.length<2)fail(422,'Title (8+), scope (20+), and city are required');
 const now=new Date().toISOString();
 if(requestType==='SERVICE_PROJECT'){
  // The only supported sandbox scope is low-risk, remote digital deliverables.
  const category=clean(body.category,60);
  if(!Object.hasOwn(defaultSkill,category))fail(422,'Sandbox only supports Content & Copy or Digital Setup projects');
  if(!money(body.budgetUSD))fail(422,'Project budget must be between $1 and $10,000, with at most two decimals');
  const mins=body.estimatedMinutes===undefined?60:body.estimatedMinutes;
  if(!Number.isInteger(mins)||mins<15||mins>480)fail(422,'Duration must be 15 to 480 minutes');
  const skills=Array.isArray(body.skills)&&body.skills.length?body.skills:[defaultSkill[category]];
  const validated=validateMission({title,description,city,category,skills,
   buyer:user.display_name,schedule:'Flexible',priceUSD:body.budgetUSD});
  if(!validated.ok)fail(422,validated.errors.join('; '));
  const mission={...validated.value,urgency,estimatedMinutes:mins,
   buyerUserId:user.id,workerUserId:null,engagementIntent:'SERVICE_PROJECT',
   laborClassification:'NOT_DETERMINED',classificationReviewRequired:true,
   fundsCollected:false,independentlyVerified:false};
  store.transaction(()=>{
   store.run('INSERT INTO missions VALUES(?,?,?,?,?,?)',mission.id,user.id,null,
    JSON.stringify(store.stripRelations(mission)),mission.createdAt,mission.updatedAt);
   store.audit(user.id,'QUICK_SERVICE_REQUEST_CREATED_SIMULATED','mission',mission.id,
    {requestType,urgency,classification:'NOT_DETERMINED',liveDispatch:false});
  });
  return {requestType,id:mission.id,status:'NEW',visibleInPublicFeed:false,
   requiresOperatorReview:true,laborClassification:'NOT_DETERMINED',
   legalClassificationMustBeReviewed:true,workerEmploymentNotDetermined:true,
   fundsCollected:false,realPayment:false,realDispatch:false,
   note:'Sandbox-only project intake. Posting a project does NOT make a participant an independent contractor.'};
 }
 if(requestType==='EMPLOYEE_SHIFT'){
  const employerName=clean(body.employerName,90);
  const hourlyRateUSD=body.hourlyRateUSD;
  const shiftHours=body.shiftHours;
  if(employerName.length<3)fail(422,'Employer name is required for an employment shift');
  if(!money(hourlyRateUSD)||hourlyRateUSD>1000)fail(422,'Enter a valid illustrative hourly wage');
  if(typeof shiftHours!=='number'||!Number.isFinite(shiftHours)||shiftHours<1||shiftHours>16||Math.round(shiftHours*4)!==shiftHours*4)
   fail(422,'Shift length must be between 1 and 16 hours in quarter-hour increments');
  const id=randomUUID();
  const data={id,requestType,title,description,city,employerName,urgency,shiftHours,
   hourlyRateCents:Math.round(hourlyRateUSD*100),status:'LEGAL_AND_PAYROLL_REVIEW',
   expectedWorkerType:'EMPLOYEE_W2_PROPOSED_NOT_VERIFIED',
   staffingReviewRequired:true,employmentRelationshipConfirmed:false,
   payrollPartnerVerified:false,workerIncomeTaxWithheld:false,
   employerResponsibilitiesUnverified:true,platformPayoutsDisabled:true,
   workerWithdrawalFeesDisabled:true,availableForMatching:false,
   createdAt:now};
  store.transaction(()=>{
   store.run('INSERT INTO employment_shift_intakes (id,buyer_user_id,data,created_at) VALUES (?,?,?,?)',
    id,user.id,JSON.stringify(data),now);
   store.audit(user.id,'W2_SHIFT_INTAKE_CREATED_NOT_DISPATCHED','employment_shift_intake',id,
    {urgency,wageIsIllustrative:true,matchingDisabled:true});
  });
  return {requestType,id,status:data.status,visibleInPublicFeed:false,
   requiresEmployerAndPayrollPartner:true,staffingReviewRequired:true,
   payrollEnabled:false,wagesPaid:false,withdrawalFeeAvailable:false,
   realDispatch:false,realPayment:false,
   note:'Employment shift is an intake inquiry, NOT a verified W-2 job, scheduled placement, or payroll obligation.'};
 }
 fail(422,'Choose SERVICE_PROJECT or EMPLOYEE_SHIFT');
}

export function listMyShiftIntakes(store,user){
 if(!user)fail(401,'Authentication required');
 if(user.role!=='buyer'&&user.role!=='admin')fail(403,'Access denied');
 const rows=user.role==='admin'
  ?store.all('SELECT * FROM employment_shift_intakes ORDER BY created_at DESC LIMIT 100')
  :store.all('SELECT * FROM employment_shift_intakes WHERE buyer_user_id=? ORDER BY created_at DESC LIMIT 100',user.id);
 return {intakes:rows.map(r=>JSON.parse(r.data)),livePlacements:0,registeredStaffingPartner:false};
}

export function handleQuickPost(ctx){
 if(ctx.method==='POST'&&ctx.path==='/api/earn/quick-post')return quickPost(ctx.store,ctx.user,ctx.body);
 if(ctx.method==='GET'&&ctx.path==='/api/earn/shift-intakes')return listMyShiftIntakes(ctx.store,ctx.user);
 return undefined;
}

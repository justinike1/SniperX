/**
 * Conservative *demo* scope screen. This is not identity vetting, credential
 * verification, occupational safety assessment, or a substitute for review.
 * Never rely on a keyword filter alone to approve a real-world assignment.
 */
export const PROHIBITED_SCOPE = Object.freeze([
  {code:'DANGEROUS_WORK', pattern:/\b(roof(?:ing)?|ladder|scaffold|height work|tree removal|chainsaw|demolition|excavat(?:ion|ing)|power line|live electrical|electrical wir(?:e|ing)|gas line|gas pipe|hazardous waste|asbestos|lead paint|pesticide|explosives?|firearms?|weapons?)\b/i},
  {code:'REGULATED_PERSONAL_CARE', pattern:/\b(childcare|child care|babysit(?:ting)?|elder(?:ly)? care|nursing|patient care|medical (?:care|treatment|procedure)|administer (?:medication|injections?)|therapy session|transport(?:ing)? (?:patients?|children|people)|driv(?:e|ing) passengers?)\b/i},
  {code:'ILLEGAL_OR_DECEPTIVE', pattern:/\b(fake reviews?|fraudulent reviews?|buy reviews|fake identity|identity theft|reship(?:ping)? packages?|money mule|launder(?:ing)? money|counterfeit|illegal drugs?|steal|hacking accounts?|phishing|stalk(?:ing)?|surveil(?:lance)? (?:a person|someone))\b/i},
  {code:'SENSITIVE_ACCESS', pattern:/\b(share (?:passwords?|one.time codes?|login credentials)|request (?:passwords?|two.factor codes?)|access (?:bank account|private medical records)|collect (?:social security numbers?|ssns?|credit card numbers?))\b/i},
  {code:'PAY_TO_WORK_SCAM', pattern:/\b(pay (?:a |an )?(?:deposit|fee) to (?:unlock|start|work|withdraw)|crypto deposit to unlock|guaranteed (?:daily |weekly )?(?:profit|income)|click for commission|product boosting)\b/i}
]);

export const HUMAN_REVIEW_CATEGORIES = Object.freeze(['Business Photos', 'Local Admin']);
export function assessScope(input={}) {
  const text=[input.title,input.description,...(Array.isArray(input.skills)?input.skills:[])].filter(v=>typeof v==='string').join(' ');
  const flags=PROHIBITED_SCOPE.filter(rule=>rule.pattern.test(text)).map(rule=>rule.code);
  if(flags.length) return {status:'BLOCKED',flags,reason:'The requested work may be dangerous, regulated, deceptive, or require sensitive access. This prototype cannot accept it.'};
  if(HUMAN_REVIEW_CATEGORIES.includes(input.category)) return {status:'REVIEW_REQUIRED',flags:['POTENTIAL_ON_SITE_WORK'],reason:'The service may involve physical attendance or workplace hazards; demo review is required. Never dispatch through the prototype.'};
  return {status:'REVIEW_REQUIRED',flags:['HUMAN_SCOPE_REVIEW'],reason:'A person must review customer scope before even a simulated assignment. No real-world deployment permitted.'};
}

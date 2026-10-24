/**
 * Forge marketplace product catalog v0.8.
 * This is a capability taxonomy and a collection of DEMO service templates.
 * It is not an employment registry, a set of open jobs, proof of verification,
 * or authorization to dispatch regulated work in any jurisdiction.
 */
const INDUSTRY_DEFINITIONS = [
  ['digital','Digital & online services','Writing, design, data organization, websites and virtual support','digital', ['Copywriter','Virtual assistant','Spreadsheet specialist','Web content editor','Graphic designer','Video editor','Translator']],
  ['software','Technology & software','Software engineering, IT, cybersecurity, data and AI','career', ['Software engineer','Data analyst','IT support specialist','Cybersecurity analyst','Cloud engineer','AI researcher']],
  ['health','Medicine & nursing','Physicians, nurses, allied healthcare and clinical operations','regulated', ['Physician','Registered nurse','Licensed practical nurse','Medical assistant','Physical therapist','Radiologic technologist','Pharmacist']],
  ['dental','Dental & oral health','Dentistry, oral care, laboratories and office operations','regulated', ['Dentist','Dental hygienist','Dental assistant','Dental laboratory technician','Orthodontist']],
  ['legal','Law & legal services','Legal professionals, courts and compliance','regulated', ['Attorney','Paralegal','Legal secretary','Court reporter','Compliance specialist','Mediator']],
  ['aviation','Aviation & aerospace','Commercial aviation, maintenance, airports and aerospace','regulated', ['Airline pilot','Aircraft maintenance technician','Air traffic controller','Avionics technician','Aircraft dispatcher','Airport operations specialist']],
  ['transport','Trucking, CDL & logistics','Freight, driving, dispatch, warehouse and fleet operations','regulated', ['CDL truck driver','Delivery driver','Fleet coordinator','Freight dispatcher','Forklift operator','Logistics manager']],
  ['education','Education & academics','Schools, research, training and academic support','regulated', ['Teacher','University professor','Tutor','Teaching assistant','Research assistant','Instructional designer']],
  ['trades','Construction & skilled trades','Building, electrical, mechanical and field services','regulated', ['Electrician','Plumber','HVAC technician','Carpenter','Welder','General contractor','Equipment operator']],
  ['finance','Finance & insurance','Banking, underwriting, lending, tax and insurance','regulated', ['Accountant','Financial analyst','Loan officer','Insurance agent','Tax preparer','Bookkeeper']],
  ['science','Science & laboratories','Research, biotechnology, pharmaceutical and laboratory work','regulated', ['Laboratory technician','Chemist','Biologist','Clinical research coordinator','Environmental scientist']],
  ['manufacture','Manufacturing & industrial','Production, plant maintenance and quality assurance','career', ['Machinist','Assembler','Quality inspector','Manufacturing engineer','Production supervisor']],
  ['energy','Utilities, energy & infrastructure','Power, water, renewables and network operations','regulated', ['Lineworker','Water treatment operator','Solar installer','Utility technician','Power plant operator']],
  ['hospitality','Hospitality, food & events','Restaurants, hotels, catering and events','career', ['Chef','Server','Hotel manager','Event coordinator','Food service worker']],
  ['retail','Retail & customer service','Stores, ecommerce, frontline support and merchandising','career', ['Retail associate','Store manager','Customer support agent','Merchandiser','Inventory specialist']],
  ['media','Creative, media & entertainment','Film, photography, digital media and production','career', ['Photographer','Animator','Producer','Sound engineer','Social media coordinator']],
  ['government','Government & public safety','Public administration, fire, emergency and civil service','regulated', ['Firefighter','Police officer','Emergency dispatcher','Public administrator','Inspector']],
  ['property','Real estate & property','Leasing, housing, valuation and property operations','regulated', ['Real estate agent','Property manager','Appraiser','Leasing agent','Facilities coordinator']],
  ['agri','Agriculture & environment','Food systems, conservation, landscaping and land management','career', ['Farm manager','Agricultural technician','Landscape designer','Conservation worker']],
  ['wellness','Personal services & wellness','Barbering, beauty, fitness and personal care','regulated', ['Barber','Cosmetologist','Personal trainer','Massage therapist']],
  ['nonprofit','Social services & nonprofits','Community services, casework and nonprofit operations','regulated', ['Social worker','Case manager','Program coordinator','Fundraising specialist']],
  ['business','Business, sales & operations','Commercial operations, sales, recruiting and administration','career', ['Sales manager','Operations manager','Recruiter','Executive assistant','Project coordinator']],
  ['marine','Maritime & ports','Ships, ports, cargo and marine trades','regulated', ['Merchant mariner','Marine engineer','Port operator','Ship mechanic']],
  ['sports','Sports & recreation','Coaching, recreation, facilities and athletics','regulated', ['Athletic trainer','Coach','Recreation director','Sports official']],
  ['other','Emerging & specialized fields','Additional professions and new categories as qualified sources are added','career', ['Accessibility specialist','Sustainability consultant','Technical writer']]
];

export const INDUSTRIES = Object.freeze(INDUSTRY_DEFINITIONS.map(([id,name,description,route,roles])=>Object.freeze({
  id,name,description,route,roles:Object.freeze([...roles]),
  directForgeAssignmentAllowed:false,
  requirements:'Requirements depend on job, activity, employer and jurisdiction. External applications stay with the publisher.'
})));

const SERVICE_TEMPLATES = [
  ['product-copy','Write product descriptions','Content & Copy','Writing','Editing','Write product descriptions using information provided by the buyer. No fabricated claims, testimonials or regulated advice.','Prepare 10 accurate product descriptions using my supplied product details. Deliver an editable document with separate descriptions and a final review checklist.'],
  ['document-edit','Edit and format documents','Content & Copy','Editing','Formatting','Clean up spelling, clarity and layout of non-sensitive, non-legal documents.','Edit and format 6 pages of non-sensitive business copy for clarity and consistent headings. Deliver the updated editable file plus a change summary.'],
  ['website-copy','Update website text','Content & Copy','Writing','Web content','Draft or revise approved public website text for the business owner to publish.','Draft updated text for our homepage and services section using the brand brief we provide. Deliver editable copy for our review, with no direct site access.'],
  ['email-draft','Draft customer email templates','Content & Copy','Writing','Customer support','Create non-deceptive, opt-in customer communication drafts.','Create five clear customer-service email templates for routine order questions using the business policies I provide. Deliver an editable document.'],
  ['data-cleanup','Organize a spreadsheet','Digital Setup','Spreadsheets','Data cleanup','Format and organize buyer-provided non-sensitive spreadsheet data.','Organize 150 non-sensitive product inventory rows into a consistent spreadsheet, flag duplicates and supply a summary of any unclear entries.'],
  ['presentation','Format a business presentation','Digital Setup','Presentations','Formatting','Improve structure and formatting of a non-regulated presentation.','Clean up the formatting of a 12-slide business presentation using the content and design guidelines we provide. Return an editable version.'],
  ['menu-digitize','Turn a menu into a digital document','Digital Setup','Data entry','Formatting','Convert public menu or catalog text to an accessible editable format.','Convert the public menu we own into an organized, editable digital document, preserving prices, category names and item descriptions exactly.'],
  ['file-organize','Organize digital business files','Digital Setup','File organization','Documentation','Create a suggested file structure using non-sensitive sample data; avoid unverified account access.','Design an organized folder structure and naming guide for our public marketing assets. Deliver the folder plan and step-by-step instructions.']
];
export const SERVICES=Object.freeze(SERVICE_TEMPLATES.map(([id,title,category,skill,secondarySkill,description,exampleBrief])=>Object.freeze({
 id,title,category,skills:Object.freeze([skill,secondarySkill]),description,exampleBrief,
 availability:'DEMO_TEMPLATE_ONLY',acceptingRealOrders:false,estimatedPayout:null,completedOrders:0,
 remote:true,realPaymentEnabled:false,regulatedWork:false
})));
const INDEX=new Map(SERVICES.map(s=>[s.id,s]));
export function serviceById(id){return INDEX.get(id)||null}
export function catalogSummary(){return {
 industries:INDUSTRIES.length,professionExamples:INDUSTRIES.reduce((x,i)=>x+i.roles.length,0),
 serviceTemplates:SERVICES.length,liveForgeMissions:0,
 worldwideLaunch:false,regulatedDispatch:false,
 note:'Taxonomy and demo service templates only; not open jobs, verified credentials or available paid assignments.'
}}
export function searchIndustries(query='',{max=100}={}){
 const text=String(query).toLowerCase().trim().slice(0,100);
 return INDUSTRIES.filter(i=>!text||[i.name,i.description,...i.roles].join(' ').toLowerCase().includes(text)).slice(0,Math.max(1,Math.min(max,100)));
}
/** Advisory only; cannot clear legal, identity, professional or payment gates. */
export function serviceEligibility(serviceId,{kind='digital',verified=false}={}){
 const template=serviceById(serviceId);
 if(!template)return {eligible:false,reason:'UNKNOWN_SERVICE'};
 if(kind!=='digital')return {eligible:false,reason:'UNSUPPORTED_SERVICE_TYPE'};
 if(!verified)return {eligible:false,reason:'REAL_OPERATIONS_DISABLED'};
 return {eligible:false,reason:'LIVE_DISPATCH_NOT_LAUNCHED'};
}

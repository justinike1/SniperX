const $=id=>document.getElementById(id);
const state={user:null,csrf:null,view:'home',catalog:null,services:null,selectedTemplate:null};
const statusNames={NEW:'Awaiting review',APPROVED:'Approved · finding a match',ASSIGNED:'Assigned',SUBMITTED:'Work submitted',COMPLETED:'Completed (demo)',CANCELLED:'Cancelled'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((Number(cents)||0)/100);
const friendlyDate=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d):'Date not provided'};
function msg(text,error=false){$('alerts').textContent=text;$('alerts').style.color=error?'#ffb3b3':'#8be8c8';$('alerts').setAttribute('role',error?'alert':'status');}
async function api(endpoint,{method='GET',data}={}){
 const headers={};if(data!==undefined)headers['Content-Type']='application/json';
 if(method!=='GET'&&state.csrf)headers['X-Forge-CSRF']=state.csrf;
 let r;try{r=await fetch(`/api${endpoint}`,{method,headers,credentials:'same-origin',body:data===undefined?undefined:JSON.stringify(data)})}catch{throw Error('We couldn’t connect to Forge. Check your connection and try again.')}
 let j;try{j=await r.json()}catch{throw Error('Something went wrong loading this page. Try refreshing.')}
 if(!r.ok)throw Error(j.error||`We couldn’t finish your request (${r.status}). Please try again.`);return j;
}
function fields(form){const data=Object.fromEntries(new FormData(form));return data;}


// The public-facing career universe and service catalog come from authenticated
// server endpoints. Client data never grants eligibility or authorizes payments.
async function getCatalog(){
 if(!state.catalog)state.catalog=(await api('/catalog')).industries;
 return state.catalog;
}
async function getServices(){
 if(!state.services)state.services=(await api('/services')).services;
 return state.services;
}
function focusHero(){
 const role=state.user.role;
 const copy=role==='buyer'
 ? {eyebrow:'POST THE NEED. FIND THE PEOPLE.',headline:'You need it done.\nWe make it happen.',body:'Give your next project a clear scope. Find the right skills, keep everything organized, and see progress in one place.',primary:['new','Post a request'],secondary:['missions','My projects']}
 :role==='admin'
 ? {eyebrow:'BUILT ON TRUST',headline:'A better way\nto work.',body:'Manage the invite-only marketplace, review requests and keep the platform safe while we build toward a real launch.',primary:['admin','Operations'],secondary:['verification','Review cases']}
 : {eyebrow:'DO WORK THAT MATTERS',headline:'Make your move.\nMake it count.',body:'Explore the first Forge mission categories, build your skills profile and prepare for our customer-funded pilot.',primary:['earn','Discover missions'],secondary:['worker','My work profile']};
 return `<section class="forge-hero"><div class="hero-copy"><span class="hero-eyebrow"><span class="beta-dot"></span> ${esc(copy.eyebrow)} · PRIVATE PREVIEW</span><h2>${copy.headline.split('\n').map(esc).join('<br>')}</h2><p>${esc(copy.body)}</p><div class="hero-buttons"><button type="button" class="hero-cta" data-go="${copy.primary[0]}">${esc(copy.primary[1])} <span aria-hidden="true">↗</span></button><button type="button" class="hero-alt" data-go="${copy.secondary[0]}">${esc(copy.secondary[1])} <span aria-hidden="true">→</span></button></div></div><div class="hero-art" aria-hidden="true"><div class="hero-graphic-ring"></div><div class="hero-graphic-type">DO<br>MORE<span>.</span></div><div class="hero-graphic-caption">GOOD WORK / REAL PEOPLE / BETTER OUTCOMES</div></div></section>`;
}
function homeHighlights(){
 const role=state.user.role;
 const fields=role==='buyer'?[['new','Write & content','Turn your brief into clear deliverables','01'],['new','Digital setup','Organize an online project from the start','02'],['missions','Keep projects moving','Review the work already in progress','03']]
 :role==='admin'?[['missions','Mission review','Review clear scopes and assignments','01'],['verification','Trust & eligibility','Track consent and review requirements','02'],['admin','Operational visibility','Review activity and outstanding issues','03']]
 :[['earn','Digital services','See the first work categories being prepared','01'],['worker','Tell us your skills','Build a profile for the Forge mission pilot','02'],['catalog','Explore every field','Find your profession in the broader network','03']];
 return `<div class="section-head"><div><span class="eyebrow">THE NEXT MOVE</span><h2>Start where you are.</h2></div><p>One clear step at a time.</p></div><div class="focus-grid">${fields.map(([v,title,desc,n])=>`<button type="button" class="focus-tile" data-go="${v}"><span>${n} / EXPLORE</span><strong>${esc(title)}</strong><small>${esc(desc)}</small><b aria-hidden="true">↗</b></button>`).join('')}</div>`;
}

function categorySymbol(label){
 const key=String(label||'').toLowerCase();
 if(key.includes('content'))return 'CC';
 if(key.includes('digital'))return 'DS';
 if(key.includes('local'))return 'LC';
 return 'FX';
}
function heroMissionTile(m){
 return `<article class="hero-mission-tile"><div><p>${esc(m.title)}</p><small>${esc(m.category)} · ${esc(m.locationLabel||'Remote-friendly')}</small></div><strong>${money(m.illustrativeWorkerPayCents)}</strong></article>`;
}
function missionMapPins(items){
 return items.slice(0,6).map((m,idx)=>`<span class="map-pin pin-${idx+1}" title="${esc(m.title)}">${idx+1}</span>`).join('');
}

function earnOpportunityCard(m){
 const eligibility=m.fit;
 const canExpress=state.user.role==='worker'&&eligibility?.eligible;
 const inList=!!m.expressedInterest;
 const reasons=eligibility?.reasons?.filter(Boolean)||[];
 const skills=(m.skills||[]).slice(0,3);
 return `<article class="opportunity-card">
  <div class="opportunity-top"><span class="opportunity-type">${esc(m.category)}</span><span class="opportunity-demo">TEST MISSION</span></div>
  <h3>${esc(m.title)}</h3>
  <p class="opportunity-location">${esc(m.locationLabel||'Location not supplied')} · ${esc(m.schedule||'Flexible')}</p>
  <div class="opportunity-skills">${skills.map(skill=>`<span>${esc(skill)}</span>`).join('')}</div>
  <div class="opportunity-bottom"><div><span class="money-caption">ILLUSTRATIVE WORKER SHARE</span><strong class="opportunity-pay">${money(m.illustrativeWorkerPayCents)}</strong><small>Not payable in beta</small></div>
  ${state.user.role==='worker'?`<button type="button" class="${inList?'interest-btn is-interested':'interest-btn'}" data-earn-interest="${esc(m.id)}" data-interest-action="${inList?'WITHDRAW':'EXPRESS'}" ${(!inList&&!canExpress)?'disabled':''}>${inList?'Interest saved ✓':'Express interest ↗'}</button>`:`<span class="opportunity-readonly">Preview only</span>`}
  </div>${state.user.role==='worker'&&!canExpress&&!inList?`<p class="fit-message">${esc(reasons.slice(0,2).join(' · ')||'A reviewed profile is required.')}</p>`:''}
 </article>`;
}

function earnContent(feed,services){
 const demos=feed.opportunities||[];
 const worker=state.user.role==='worker';
 const roleAction=worker
  ? '<button type="button" data-go="worker" class="hero-primary">Get profile ready ↗</button>'
  : state.user.role==='buyer'
   ? '<button type="button" data-go="new" class="hero-primary">Post a mission ↗</button>'
   : '<button type="button" data-go="admin" class="hero-primary">Open operations ↗</button>';
 const teaserMarkup=demos.length
  ? demos.slice(0,3).map(heroMissionTile).join('')
  : '<div class="hero-empty">No live missions yet</div>';
 const mapPreview=demos[0] ? `<article class="map-preview-card"><p>${esc(demos[0].title)}</p><small>${money(demos[0].illustrativeWorkerPayCents)} · demo only</small></article>` : '<article class="map-preview-card"><p>No live missions yet</p><small>Coming soon after launch gates</small></article>';
 return `<section class="earn-showcase"><div class="earn-showcase-copy"><p class="showcase-brand">SNIPERX FORGE · PRIVATE BETA</p><h2>Make Money <span>Today.</span></h2><p>Find unique missions near you or online. Do the work. Get paid after launch approval — never with fake inventory.</p><div class="showcase-actions">${roleAction}<button type="button" data-go="missions" class="hero-secondary">My missions →</button></div><ul class="showcase-points"><li>Local & remote missions</li><li>Instant opportunities preview</li><li>Safe and verified beta workflows</li><li>No real payouts active yet</li></ul></div><div class="earn-showcase-ui"><article class="phone-frame mission-preview"><header><strong>Featured Missions</strong><span>LIVE PAID 0</span></header><div class="hero-mission-list">${teaserMarkup}</div></article><article class="phone-frame map-preview"><header><strong>Explore Missions</strong><span>Radar view</span></header><div class="map-canvas">${missionMapPins(demos)}</div>${mapPreview}</article></div></section>
 <section class="mission-market" aria-labelledby="market-title"><div class="market-section-head"><div><div class="kicker">DISCOVER MISSIONS</div><h2 id="market-title">Explore mission feed</h2><p>Only approved test requests appear here. We do not fabricate paid work.</p></div><div class="market-status"><strong>0</strong><span>LIVE PAID<br>MISSIONS</span></div></div>
 <div class="market-search"><label class="search-wrap"><span class="sr-only">Search mission requests</span><input id="earnSearch" type="search" placeholder="Search missions, skills, or city…" autocomplete="off"></label><label class="sort-wrap"><span class="sr-only">Sort test missions</span><select id="earnSort"><option value="newest">Newest first</option><option value="pay">Illustrative pay</option></select></label></div>
 <div class="market-filters" role="group" aria-label="Mission category filters"><button type="button" data-earn-filter="all" class="filter-chip active" aria-pressed="true">All</button><button type="button" data-earn-filter="Content & Copy" class="filter-chip" aria-pressed="false">Creative</button><button type="button" data-earn-filter="Digital Setup" class="filter-chip" aria-pressed="false">Digital setup</button><span id="earnCount" class="market-count" role="status" aria-live="polite"></span></div>
 <div id="earnResults" class="earn-results">${demos.length?'':emptyEarnMarkup()}</div></section>
 <section class="earn-category-grid" aria-labelledby="services-title"><div class="market-section-head"><div><div class="kicker">CATEGORY SPOTLIGHT</div><h2 id="services-title">Unique missions. <span>Real money later.</span></h2><p>Service templates show where Forge starts. These are not active paid listings.</p></div></div><div class="category-rail">${services.map((s,i)=>`<article class="category-card"><span class="category-icon">${categorySymbol(s.category)}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p><small>${esc(s.category)} · ${(s.skills||[]).slice(0,2).map(esc).join(' / ')}</small></div><button type="button" data-template="${esc(s.id)}" aria-label="Learn about ${esc(s.title)}">↗</button></article>`).join('')}</div></section>
 <section class="earn-trust"><span class="earn-trust-mark">✳</span><div><strong>Real people. Real work. No false promises.</strong><p>This is a private beta. Interest buttons are demonstrations; there are no live payouts, assignments, instant transfers, or independent verifications yet.</p></div><button type="button" data-go="safety" class="earn-trust-link">How trust works ↗</button></section>`;
}
function bindEarn(feed){
 const opportunities=feed.opportunities||[];
 let selected='all';
 const filterButtons=[...document.querySelectorAll('[data-earn-filter]')];
 const update=()=>{
  const query=$('earnSearch').value.trim().toLowerCase();
  const filtered=opportunities.filter(m=>(selected==='all'||m.category===selected)&&(!query||[m.title,m.category,m.locationLabel,...(m.skills||[])].join(' ').toLowerCase().includes(query)));
  const sorted=filtered.slice().sort((a,b)=>$('earnSort').value==='pay'?(b.illustrativeWorkerPayCents-a.illustrativeWorkerPayCents):String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  $('earnCount').textContent=`${sorted.length} test ${sorted.length===1?'request':'requests'}`;
  const target=$('earnResults');
  if(sorted.length) target.innerHTML=`<div class="test-feed-disclaimer"><strong>DEMO FEED</strong> These are simulated requests. Expressing interest does not reserve paid work, create an assignment, or initiate payment.</div><div class="opportunity-grid">${sorted.map(earnOpportunityCard).join('')}</div>`;
  else if(opportunities.length&&query)target.innerHTML='<div class="no-matches"><h3>No matching requests</h3><p>Try another keyword or choose a different category.</p><button type="button" id="clearEarnFilters" class="secondary">Clear search</button></div>';
  else if(opportunities.length&&selected!=='all')target.innerHTML='<div class="no-matches"><h3>No requests in this category</h3><p>Other test categories may have opportunities.</p><button type="button" id="clearEarnFilters" class="secondary">Show all</button></div>';
  // If there is no inventory, retain the original, honest empty-state.
  else target.innerHTML=emptyEarnMarkup();
  target.querySelector('#clearEarnFilters')?.addEventListener('click',()=>{$('earnSearch').value='';selected='all';filterButtons.forEach(b=>{b.classList.toggle('active',b.dataset.earnFilter==='all');b.setAttribute('aria-pressed',String(b.dataset.earnFilter==='all'))});update()});
  target.querySelectorAll('[data-earn-interest]').forEach(btn=>btn.addEventListener('click',async()=>{
   if(btn.disabled)return;
   const action=btn.dataset.interestAction;
   try{const answer=await openDialog({title:action==='EXPRESS'?'Express test interest?':'Withdraw test interest?',description:'This is a demonstration only. No real customer contact, work assignment, or payment will follow.',submitLabel:action==='EXPRESS'?'Save demo interest':'Withdraw interest'});if(!answer)return;await api(`/earn/missions/${encodeURIComponent(btn.dataset.earnInterest)}/interest`,{method:'POST',data:{action}});msg(action==='EXPRESS'?'Demo interest recorded — this is not a paid booking.':'Demo interest withdrawn.');await render()}catch(err){msg(err.message,true)}
  }));
 };
 filterButtons.forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.earnFilter;filterButtons.forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});update()}));
 $('earnSearch').addEventListener('input',update);$('earnSort').addEventListener('change',update);update();
}

function emptyEarnMarkup(){
 const worker=state.user.role==='worker';
 return `<div class="empty-radar"><span class="empty-label">THE BOARD IS GETTING READY</span><h3>No live missions yet.</h3><p>We won’t post fake jobs or promise instant cash. As customers fund real assignments and Forge passes launch checks, opportunities will appear here.</p><div class="empty-actions">${worker?'<button type="button" data-go="worker" class="primary">Get your profile ready ↗</button>':state.user.role==='buyer'?'<button type="button" data-go="new" class="primary">Explore posting a request ↗</button>':'<button type="button" data-go="admin" class="primary">Review pilot readiness ↗</button>'}<span>COMING SOON · NO MONEY MOVES TODAY</span></div></div>`;
}
function catalogContent(industries){
 return `<div class="catalog-intro"><span class="eyebrow">THE FUTURE OF FORGE</span><h2>Every industry. One intelligent network.</h2><p>Explore professions from aviation and medicine to transportation, trades and digital work. These are <strong>industry categories, not live assignments</strong>. Actual qualifications depend on jurisdiction and employer.</p><label class="catalog-search-label">What type of work interests you?<input id="catalogSearch" type="search" placeholder="Try pilot, RN, dental, CDL, tutor…" autocomplete="off"></label><div class="catalog-controls"><label class="catalog-filter-label">Show<select id="catalogFilter"><option value="">All industries</option><option value="digital">Digital services</option><option value="regulated">Regulated / credential-sensitive</option><option value="career">Other career fields</option></select></label></div><div id="catalogCount" role="status" class="filter-results" aria-live="polite"></div></div><div id="catalogResults" class="catalog-grid"></div>`;
}
function bindCatalog(industries){
 const update=()=>{
  const q=$('catalogSearch').value.trim().toLowerCase();const route=$('catalogFilter').value;
  const rows=industries.filter(f=>(!route||f.route===route)&&(!q||[f.name,f.description,...f.roles].join(' ').toLowerCase().includes(q)));
  $('catalogCount').textContent=`${rows.length} of ${industries.length} industry groups`;
  $('catalogResults').innerHTML=rows.length?rows.map((field,i)=>`<article class="catalog-card"><div class="catalog-icon" aria-hidden="true">${String(industries.indexOf(field)+1).padStart(2,'0')}</div><span class="catalog-status">${field.route==='regulated'?'LICENSES MAY APPLY':field.route==='digital'?'PILOT FOCUS':'CAREER PATHS'}</span><h3>${esc(field.name)}</h3><p>${esc(field.description)}</p><p class="catalog-roles"><strong>Examples:</strong> ${esc(field.roles.slice(0,4).join(', '))}</p><button type="button" class="catalog-link" data-go="${field.route==='digital'?'earn':'jobs'}">${field.route==='digital'?'Explore service templates':'Explore external jobs'} <span aria-hidden="true">↗</span></button></article>`).join(''):'<div class="empty-state"><h2>No matching fields</h2><p>Try a different profession or clear the filters.</p></div>';
 };
 $('catalogSearch').addEventListener('input',update);$('catalogFilter').addEventListener('change',update);update();
}
function bindServiceTemplates(services){
 document.querySelectorAll('[data-template]').forEach(button=>button.addEventListener('click',async()=>{
  const template=services.find(s=>s.id===button.dataset.template);if(!template)return;
  const role=state.user.role;
  const result=await openDialog({title:template.title,description:`${template.description}\n\nExample brief: ${template.exampleBrief}\n\nRequired skills: ${template.skills.join(', ')}\n\nPrivate-beta template only. No paid projects are currently available.`,submitLabel:role==='buyer'?'Use this for a test request':'Got it'});
  if(result&&role==='buyer'){state.selectedTemplate=template;await navigate('new')}
 }));
}
function nextActions(){
 const role=state.user?.role;
 const cards=role==='admin'?[['missions','Review requests','See work requests and approve safe demo projects.','▤'],['verification','Verification cases','Review tracking cases without claiming anyone is verified.','✓'],['jobs','Browse jobs','See employer-published listings and refresh approved sources.','⌕'],['admin','Manage test access','Invite participants and view activity records.','◉']]
 :role==='buyer'?[['new','Request a service','Describe the project you need done in a few simple steps.','＋'],['missions','Track my requests','See what is awaiting review and what happens next.','▤'],['jobs','Explore job openings','Browse sourced listings and apply with the original publisher.','⌕']]
 :[['jobs','Find a job','Look through sourced openings and visit the original listing.','⌕'],['worker','Set up my profile','Tell us which digital tasks you can do.','◉'],['missions','My assigned projects','Check simulated assignments and delivery updates.','▤'],['verification','My verification status','See what has been requested and what is still pending.','✓']];
 return `<div class="quick-actions">${cards.map(([target,title,subtitle,icon])=>`<button type="button" class="quick-action" data-go="${target}"><span class="action-mark" aria-hidden="true">${icon}</span><strong>${title}</strong><small>${subtitle}</small></button>`).join('')}</div>`;
}
function onboardingGuide(){
 const steps=state.user.role==='buyer'?[['Tell us what you need','Use the request form to describe the work.'],['We review the request','An operator checks this test request before assignment.'],['Track the result','Watch progress from your projects page; no real payments.']]
 :state.user.role==='worker'?[['Explore real job listings','Follow original employers’ application links.'],['Create a work profile','Choose skills and availability for demo projects.'],['Check your projects','Track any test assignments and verification cases.']]
 :[['Review incoming work','Check scope and safety before approval.'],['Track qualification cases','A tracking case is not independent verification.'],['Monitor the pilot','Review audits, flagged work, and deployment blockers.']];
 return `<h2 class="section-title">How it works</h2><div class="guide-steps">${steps.map(([title,detail],i)=>`<div class="guide-step"><span class="step-number">${i+1}</span><strong>${title}</strong><p>${detail}</p></div>`).join('')}</div>`;
}
async function navigate(view){
 const btn=document.querySelector(`#nav [data-view="${view}"]`);
 if(!btn||btn.hidden)return;
 if(state.view==='new'&&view!=='new'&&$('missionForm')?.dataset.dirty==='true'){const answer=await openDialog({title:'Leave this request?',description:'You have unsaved information. If you leave, you will need to enter it again.',submitLabel:'Leave without saving',danger:true});if(!answer)return}
 state.view=view;
 document.querySelectorAll('[data-view]').forEach(x=>{x.classList.toggle('active',x===btn);if(x===btn)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});
 msg('');render();
 if(window.matchMedia('(max-width:850px)').matches)document.querySelector('#dashboard')?.scrollIntoView({block:'start',behavior:'auto'});
}
function setBusy(button,busy){if(!button)return;button.disabled=busy;button.dataset.originalLabel??=button.textContent;if(busy)button.textContent='Working…';else button.textContent=button.dataset.originalLabel}

function missionCard(m){
 const label=esc(m.title);
 const humanStatus=statusNames[m.status]||m.status;
 const controls=[];
 if(state.user.role==='admin'&&m.status==='NEW'&&!m.safetyHold)controls.push(`<button data-action="approve" data-id="${esc(m.id)}" class="secondary">Approve after review</button>`);
 if(state.user.role==='admin'&&m.status==='APPROVED'&&!m.safetyHold)controls.push(`<button data-action="match" data-id="${esc(m.id)}" class="secondary">See eligible participants</button>`);
 if(state.user.role==='worker'&&m.status==='ASSIGNED'&&!m.safetyHold)controls.push(`<button data-action="submit" data-id="${esc(m.id)}" class="secondary">Submit completed work</button>`);
 if(state.user.role==='buyer'&&m.status==='SUBMITTED'&&!m.safetyHold)controls.push(`<button data-action="accept" data-id="${esc(m.id)}" class="secondary">Accept submitted work</button>`);
 if(!['COMPLETED','CANCELLED'].includes(m.status)){
  controls.push(`<button data-action="incident" data-id="${esc(m.id)}" class="danger">Report a concern</button>`);
  if(state.user.role!=='worker')controls.push(`<button data-action="cancel" data-id="${esc(m.id)}" class="ghost">Cancel project</button>`);
 }
 return `<article class="mission"><div><div class="mission-status"><span class="tag">${esc(humanStatus)}${m.safetyHold?' · SAFETY HOLD':''}</span><small class="status-info">${m.safetyHold?'Paused for safety review':'Demo project — no real payment'}</small></div><h3>${label}</h3><p>${esc(m.description)}</p><p>${esc(m.category)} · ${esc(m.city)} · ${esc(m.schedule)} · Test price ${money(m.priceCents)} (not charged)</p><p>Skills requested: ${esc((m.skills||[]).join(', '))}</p>${m.proofNote?`<p class="check">Delivery note: ${esc(m.proofNote)}</p>`:''}</div><div class="actions">${controls.join('')}</div></article>`;
}
function bindActions(){document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>missionAction(btn.dataset.action,btn.dataset.id)))}
function missionForm(){return `<form id="missionForm" class="panel stack step-wizard" novalidate>
 <div class="wizard-topline"><span id="stepName">Step 1 of 3</span><span>About 2 minutes</span></div><div class="progress-track" id="stepTrack" role="progressbar" aria-label="Request form progress" aria-valuemin="0" aria-valuemax="3" aria-valuenow="1"><div class="progress-bar" id="stepProgress"></div></div>
 <p class="muted">Only low-risk digital services are supported in this test. No real assignments or charges will occur.</p>
 <fieldset class="wizard-step" data-step="1"><legend>What do you need help with?</legend>
 <label>Give your project a short name<input name="title" required minlength="8" maxlength="90" placeholder="Write descriptions for my online store"><span class="form-tip">A clear title helps others understand the work.</span></label>
 <label>Describe the result you want<textarea name="description" required minlength="20" maxlength="500" placeholder="Write descriptions for 10 products using details I'll provide. Each description should be 80–100 words."></textarea><span class="form-tip">Include what should be delivered and how you will know it's finished.</span></label>
 <label>Type of service<select name="category"><option>Content & Copy</option><option>Digital Setup</option></select></label></fieldset>
 <fieldset class="wizard-step" data-step="2" hidden><legend>When and where will it happen?</legend>
 <label>City or region<input name="city" value="New Jersey" required placeholder="Example: Newark, NJ"></label>
 <label>Preferred timing<select name="schedule"><option>Flexible</option><option>Weekday</option><option>Weekend</option></select></label>
 <label>Skills needed<input name="skills" placeholder="Writing, Editing" required><span class="form-tip">Separate multiple skills with commas.</span></label></fieldset>
 <fieldset class="wizard-step" data-step="3" hidden><legend>Review your request</legend>
 <label>Illustrative project budget (USD)<input type="number" name="priceUSD" min="1" max="10000" step=".01" value="249" required><span class="form-tip">This is only a test budget. Forge will not collect money.</span></label>
 <div class="form-review" id="missionReview" aria-live="polite"></div>
 <div class="review-warning">Submitting sends this request to a simulated review workflow. It does not hire or pay anyone.</div>
 </fieldset>
 <div class="wizard-actions"><button type="button" id="wizardBack" class="ghost" hidden>← Back</button><button type="button" id="wizardNext" class="primary">Continue →</button><button type="submit" id="wizardSubmit" class="primary" hidden>Submit test request</button></div>
 </form>`}
function setupMissionWizard(){
 const form=$('missionForm');if(!form)return;form.addEventListener('input',()=>{form.dataset.dirty='true'});
 let step=1;const steps=[...form.querySelectorAll('.wizard-step')];
 const paint=()=>{steps.forEach((el,i)=>el.hidden=i+1!==step);$('stepName').textContent=`Step ${step} of 3`;$('stepProgress').style.width=`${step/3*100}%`;$('stepTrack').setAttribute('aria-valuenow',String(step));$('wizardBack').hidden=step===1;$('wizardNext').hidden=step===3;$('wizardSubmit').hidden=step!==3;
 if(step===3){const f=fields(form);$('missionReview').innerHTML=[['Project',f.title],['Service',f.category],['Delivery',f.description],['Location & timing',`${f.city} · ${f.schedule}`],['Skills',f.skills],['Illustrative budget',`$${Number(f.priceUSD).toFixed(2)} (not charged)`]].map(([k,v])=>`<div><strong>${esc(k)}</strong><span>${esc(v)}</span></div>`).join('')}};
 $('wizardNext').addEventListener('click',()=>{const active=steps[step-1];const invalid=[...active.querySelectorAll('input,textarea,select')].find(el=>!el.checkValidity());if(invalid){invalid.reportValidity();invalid.focus();return}step=Math.min(3,step+1);paint()});
 $('wizardBack').addEventListener('click',()=>{step=Math.max(1,step-1);paint()});
 form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'&&step!==3){e.preventDefault();$('wizardNext').click()}});
 paint();
}
function workerForm(){return `<form id="workerForm" class="panel stack"><h2>Create your work profile</h2><p class="section-lead">Choose the digital work you feel comfortable doing. You can browse external job listings even if you do not complete this profile.</p><p class="muted">Forge does not screen you or determine eligibility for external job openings. You must apply directly with each employer.</p><label>City<input name="city" required value="New Jersey"></label><label>Availability<select name="schedule"><option>Flexible</option><option>Weekday</option><option>Weekend</option></select></label><label>Skills (comma-separated)<input name="skills" placeholder="Copywriting, Editing" required></label><label>Minimum payment you would consider (test only), USD<input name="minPayUSD" type="number" min="1" max="10000" step=".01" value="50" required></label><label><input type="checkbox" name="remoteAvailable"> Available for remote projects</label><label><input type="checkbox" name="age18Confirmed" required> I confirm I am at least 18 (self-attestation, not verified)</label><button class="primary">Save my test profile</button></form>`}
async function render(){
 const titles={home:['YOUR HOME','Your workspace','Everything in one place.'],earn:['THE MISSION BOARD','Earn now','Browse approved test requests. Real paid assignments are not available yet.'],catalog:['WORK UNIVERSE','Explore work fields','A place for every field, built responsibly.'],missions:['YOUR PROJECTS','My projects','Track service requests and demo assignments, step by step.'],jobs:['EXPLORE OPPORTUNITIES','Find jobs','Browse sourced job openings and apply on the original publisher website.'],new:['REQUEST A SERVICE','Tell us what you need','Create a test service request in three simple steps.'],worker:['YOUR PROFILE','My work profile','Tell us what skills you have. Independent verification is not active yet.'],verification:['CHECK YOUR STATUS','Verification status','See your case tracking history. These are not completed background or identity checks.'],admin:['ADMINISTRATION','Admin workspace','Manage test accounts, requests, and audit activity.'],safety:['SUPPORT','Help & safety','How the private beta works and how to report unsafe activity.']};
 const [k,t,d]=titles[state.view];document.body.dataset.activeView=state.view;$('viewkicker').textContent=k;$('viewtitle').textContent=t;$('viewdesc').textContent=d;$('refresh').hidden=state.view==='new';
 const content=$('viewcontent');content.innerHTML='<p class="muted" role="status">Loading your workspace…</p>';
 try{
 if(state.view==='home'){
  if(state.user.role==='worker'){
   const [feed,services]=await Promise.all([api('/earn/feed'),getServices()]);content.innerHTML=earnContent(feed,services);bindEarn(feed);bindServiceTemplates(services);
  }else if(state.user.role==='admin'){
   const r=await api('/admin/overview');const s=r.summary;content.innerHTML=`${focusHero()}${homeHighlights()}<div class="notice">PRE-PRODUCTION: Account review is not identity verification; mission totals and financials are simulated.</div><div class="grid"><div class="tile"><div class="label">Customer requests</div><div class="value">${s.totalMissions}</div><div class="hint">Simulated missions only</div></div><div class="tile"><div class="label">Participant profiles</div><div class="value">${s.participants}</div><div class="hint">Unverified identities</div></div><div class="tile"><div class="label">Safety holds</div><div class="value">${s.safetyHolds}</div><div class="hint">Frozen demo operations</div></div><div class="tile"><div class="label">Simulated completed value</div><div class="value">${money(s.completedGrossCents)}</div></div><div class="tile"><div class="label">Simulated participant allocation</div><div class="value">${money(s.workerPayCents)}</div></div><div class="tile"><div class="label">Uncovered requests</div><div class="value">${r.intelligence.uncoveredCount}</div></div></div><h2 class="section-title">Demand gaps (demo only)</h2><div class="panel">${r.intelligence.skillGaps.length?r.intelligence.skillGaps.map(g=>`<p>${esc(g.skill)} · ${g.count} uncovered request(s)</p>`).join(''):'No unmatched requests yet'}</div>`;
  }else{
   const r=await api('/missions');content.innerHTML=`${focusHero()}${homeHighlights()}<div class="notice">No real funds or work assignments occur in this private beta.</div><div class="grid"><div class="tile"><div class="label">Your visible missions</div><div class="value">${r.missions.length}</div></div><div class="tile"><div class="label">Completed demos</div><div class="value">${r.missions.filter(x=>x.status==='COMPLETED').length}</div></div><div class="tile"><div class="label">Open safety holds</div><div class="value">${r.missions.filter(x=>x.safetyHold).length}</div></div></div><h2 class="section-title">Recent activity</h2>${r.missions.slice(0,4).map(missionCard).join('')||'<p class="muted">No missions yet.</p>'}`;bindActions();
  }
 }else if(state.view==='earn'){
  const [feed,services]=await Promise.all([api('/earn/feed'),getServices()]);content.innerHTML=earnContent(feed,services);bindEarn(feed);bindServiceTemplates(services);
 }else if(state.view==='catalog'){
  const industries=await getCatalog();content.innerHTML=catalogContent(industries);bindCatalog(industries);
 }else if(state.view==='missions'){
  const r=await api('/missions');
  content.innerHTML=`<div class="panel filter-panel"><div class="filter-grid"><label>Search your projects<input id="missionSearch" type="search" placeholder="Search by name or skill" autocomplete="off"></label><label>Project status<select id="missionStatus"><option value="">All statuses</option>${Object.entries(statusNames).map(([key,value])=>`<option value="${key}">${esc(value)}</option>`).join('')}</select></label></div><div id="missionCount" class="filter-results"></div></div><div id="missionResults"></div>`;
  const update=()=>{const q=$('missionSearch').value.trim().toLowerCase(),status=$('missionStatus').value;const filtered=r.missions.filter(m=>(!status||m.status===status)&&(!q||[m.title,m.description,m.category,...(m.skills||[])].join(' ').toLowerCase().includes(q)));$('missionCount').textContent=`Showing ${filtered.length} of ${r.missions.length} test project(s)`;$('missionResults').innerHTML=filtered.map(missionCard).join('')||`<div class="empty-state"><h2>No projects found</h2><p>${r.missions.length?'Try clearing your search or choosing a different status.':'No test projects are assigned to this account yet.'}</p>${state.user.role==='buyer'?'<button type="button" class="primary" data-go="new">Create a test request</button>':''}</div>`;bindActions()};
  $('missionSearch').addEventListener('input',update);$('missionStatus').addEventListener('change',update);update();
 }else if(state.view==='jobs'){
  const r=await api('/jobs');
  content.innerHTML=`<div class="notice"><strong>About these listings:</strong> Jobs come from third-party publishers. Forge does not independently verify employers, promise openings, or process applications. Check requirements on the official publisher website.</div>
  ${state.user.role==='admin'?'<p><button id="refreshJobs" type="button" class="secondary">↻ Refresh approved job feeds</button></p>':''}
  <div class="panel filter-panel"><h2>Search openings</h2><div class="filter-grid"><label>Job title, company, or city<input id="jobSearch" type="search" placeholder="Example: customer service, Newark" autocomplete="off"></label><label>Publisher<select id="jobSource"><option value="">All publishers</option>${[...new Set(r.jobs.map(j=>j.source))].sort().map(source=>`<option value="${esc(source)}">${esc(source)}</option>`).join('')}</select></label></div><div class="filter-results" id="jobCount" role="status" aria-live="polite"></div></div><div id="jobResults"></div>`;
  const updateJobs=()=>{const q=$('jobSearch').value.trim().toLowerCase(),source=$('jobSource').value;const matching=r.jobs.filter(j=>(!source||j.source===source)&&(!q||[j.title,j.employer,j.location].join(' ').toLowerCase().includes(q)));$('jobCount').textContent=`${matching.length} of ${r.jobs.length} sourced listing(s)`;$('jobResults').innerHTML=matching.map(j=>`<article class="mission"><div><span class="tag">${esc(j.source)}</span><h3>${esc(j.title)}</h3><p><strong>${esc(j.employer)}</strong> · ${esc(j.location)}</p><p class="muted">Source last retrieved: ${esc(friendlyDate(j.lastVerifiedAt))} · Employer not independently verified</p></div><div class="actions"><a class="secondary" target="_blank" rel="noopener noreferrer" href="${esc(j.applyURL)}" aria-label="View ${esc(j.title)} on original publisher website">View original listing ↗</a></div></article>`).join('')||`<div class="empty-state"><h2>${r.jobs.length?'No matching jobs':'No job listings available yet'}</h2><p>${r.jobs.length?'Try searching a different keyword or selecting all publishers.':'Administrators must configure and refresh permitted job feeds before listings appear. Forge never invents openings.'}</p>${r.jobs.length?'<button type="button" id="clearJobFilters" class="secondary">Clear filters</button>':''}</div>`;$('clearJobFilters')?.addEventListener('click',()=>{$('jobSearch').value='';$('jobSource').value='';updateJobs()})};
  $('jobSearch').addEventListener('input',updateJobs);$('jobSource').addEventListener('change',updateJobs);updateJobs();
  $('refreshJobs')?.addEventListener('click',async()=>{try{const result=await api('/admin/jobs/refresh',{method:'POST',data:{}});msg(`Refreshed ${result.count} listings from ${result.configuredSources} configured sources.`);await render()}catch(e){msg(e.message,true)}});
 }else if(state.view==='new'){
  content.innerHTML=state.user.role==='buyer'?missionForm():'<div class="notice">Only buyer accounts may create service requests.</div>';
  setupMissionWizard();
  if(state.selectedTemplate&&$('missionForm')){const t=state.selectedTemplate;const f=$('missionForm');f.elements.title.value=t.title;f.elements.description.value=t.exampleBrief;f.elements.category.value=t.category;f.elements.skills.value=t.skills.join(', ');state.selectedTemplate=null;}
  $('missionForm')?.addEventListener('submit',async e=>{e.preventDefault();const x=fields(e.target),btn=$('wizardSubmit');if(!e.target.checkValidity()){e.target.reportValidity();return}setBusy(btn,true);try{await api('/missions',{method:'POST',data:{...x,skills:x.skills.split(',').map(s=>s.trim()).filter(Boolean),priceUSD:Number(x.priceUSD)}});e.target.dataset.dirty='false';navigate('missions');msg('Your test request was submitted for review. No payment was taken.')}catch(err){msg(err.message,true)}finally{setBusy(btn,false)}});
 }else if(state.view==='worker'){
  if(state.user.role!=='worker'){content.innerHTML='<div class="notice">Only participant accounts manage skill profiles.</div>';return}
  const r=await api('/workers/me');content.innerHTML=r.worker?`<div class="panel"><h2>${esc(r.worker.name)}</h2><p>${esc(r.worker.city)} · ${esc(r.worker.skills.join(', '))}</p><p><span class="tag">${esc(r.worker.verification)}</span></p><p class="muted">Worker verification is a demo label; real identity and licensing remain unavailable.</p></div>`:workerForm();
  $('workerForm')?.addEventListener('submit',async e=>{e.preventDefault();const x=fields(e.target);try{await api('/workers/me',{method:'POST',data:{...x,skills:x.skills.split(',').map(s=>s.trim()).filter(Boolean),minPayUSD:Number(x.minPayUSD),age18Confirmed:!!e.target.elements.age18Confirmed.checked,remoteAvailable:!!e.target.elements.remoteAvailable.checked}});msg('Profile stored. Human review is required.');await render()}catch(err){msg(err.message,true)}});
 }else if(state.view==='verification'){
  if(state.user.role==='admin'){
   const [cases,workers]=await Promise.all([api('/admin/verification/cases'),api('/admin/workers')]);
   const options=workers.workers.map(w=>`<option value="${esc(w.userId)}">${esc(w.name)} (${esc(w.userId.slice(0,8))}…)</option>`).join('');
   content.innerHTML=`<div class="notice"><strong>No identity, license, or background check runs here.</strong> This tracks future provider workflows only. A manual registry note is NOT professional license verification.</div><div class="grid grid-two"><form class="panel stack" id="caseForm"><h2>Open a verification tracking case</h2><label>Participant<select name="subjectUserId" required>${options}</select></label><label>Type<select name="kind"><option>IDENTITY</option><option>LICENSE</option><option>BACKGROUND</option><option>BUSINESS</option></select></label><label>Jurisdiction (for licenses)<input name="jurisdiction" placeholder="NJ" maxlength="40"></label><label>License category (for licenses)<input name="licenseType" placeholder="Electrician" maxlength="90"></label><button class="primary" ${options?'':'disabled'}>Create tracking case</button></form><div class="panel"><h2>Important limitations</h2><p class="muted">Background checks require legally compliant disclosures and authorization that this beta does NOT provide. No screening or identity provider is connected. Do not upload identity documents or background reports.</p></div></div><h2 class="section-title">Review cases</h2><div class="panel">${cases.cases.map(c=>`<div class="mission"><div><span class="tag">${esc(c.kind)} · ${esc(c.status)}</span><p>Participant ${esc(c.subjectUserId.slice(0,8))}…</p><p>${esc(c.licenseType||c.purpose)}</p>${c.registryURL?`<p>Registry evidence URL on record</p>`:''}</div>${!['CANCELLED','REJECTED'].includes(c.status)?`<button class="secondary" data-review-case="${esc(c.id)}" data-kind="${esc(c.kind)}">Record review</button>`:''}</div>`).join('')||'<p class="muted">No cases yet.</p>'}</div>`;
   $('caseForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const f=fields(e.target);await api('/admin/verification/cases',{method:'POST',data:{subjectUserId:f.subjectUserId,kind:f.kind,jurisdiction:f.jurisdiction,licenseType:f.kind==='LICENSE'?f.licenseType:''}});msg('Tracking case created. No real check ordered.');await render()}catch(err){msg(err.message,true)}});
   document.querySelectorAll('[data-review-case]').forEach(b=>b.addEventListener('click',async()=>{try{
    const kind=b.dataset.kind,allowed=kind==='LICENSE'?['REVIEW_REQUIRED','REJECTED','CANCELLED','MANUAL_EVIDENCE_RECORDED']:['REVIEW_REQUIRED','REJECTED','CANCELLED'];
    const inputs=`<label>Review outcome<select name="decision" required>${allowed.map(value=>`<option value="${value}">${esc(value.replaceAll('_',' ').toLowerCase())}</option>`).join('')}</select></label>${dialogNote('Reviewer notes (do not include sensitive reports)',20,700)}${kind==='LICENSE'?'<div class="manual-evidence-fields" hidden><label>Official NJ license registry URL<input type="url" name="registryURL" placeholder="https://..."></label><label>Actual license expiration date<input type="date" name="expiresAt"></label></div>':''}`;
    const modalPromise=openDialog({title:'Record a case review',description:'Manual review does not establish independent verification. Do not upload identity documents or background reports.',inputs,submitLabel:'Save review outcome'});
    const dialog=document.querySelector('dialog.forge-dialog');
    const select=dialog.querySelector('select[name="decision"]');
    const update=()=>{const fields=dialog.querySelector('.manual-evidence-fields');if(!fields)return;const needed=select.value==='MANUAL_EVIDENCE_RECORDED';fields.hidden=!needed;fields.querySelectorAll('input').forEach(input=>input.required=needed)};
    select.addEventListener('change',update);update();
    const form=await modalPromise;if(!form)return;
    const payload={decision:form.decision,note:form.note};
    if(form.decision==='MANUAL_EVIDENCE_RECORDED'&&kind==='LICENSE'){payload.registryURL=form.registryURL;payload.expiresAt=form.expiresAt}
    await api(`/admin/verification/cases/${encodeURIComponent(b.dataset.reviewCase)}/review`,{method:'POST',data:payload});await render();msg('Review recorded. Independent verification has not occurred.');
   }catch(err){msg(err.message,true)}}));
  }else{
   const [result,eligibility]=await Promise.all([api('/verification/me'),api('/verification/me/eligibility')]);
   content.innerHTML=`<div class="notice"><strong>Real checks are not active.</strong> These records do not verify identity, background history or professional licenses. Clicking acknowledge is NOT authorization for screening.</div><div class="panel"><h2>Your verification updates</h2><p class="muted">You do not need these cases to browse external job listings.</p>${result.cases.map(c=>`<div class="mission"><div><span class="tag">${esc(c.kind)} · ${esc(c.status)}</span><p>${esc(c.purpose)}</p>${c.licenseType?`<p>${esc(c.licenseType)} · ${esc(c.jurisdiction)}</p>`:''}</div>${c.status==='AWAITING_ACKNOWLEDGEMENT'?`<button class="secondary" data-ack-case="${esc(c.id)}">Confirm you saw this notice</button>`:''}</div>`).join('')||'<p class="muted">No verification cases assigned.</p>'}</div><div class="panel"><h2>Can I take regulated assignments?</h2><p class="muted">${eligibility.eligibleForRegulatedWork?'Eligible':'Not enabled'}. ${esc(eligibility.reasons.join('; '))}</p></div>`;
   document.querySelectorAll('[data-ack-case]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Acknowledge that this is only a tracking record, NOT legal consent to any screening?'))return;try{await api(`/verification/cases/${encodeURIComponent(b.dataset.ackCase)}/acknowledge`,{method:'POST',data:{acknowledge:true}});msg('Acknowledgement saved; no screening ordered.');await render()}catch(err){msg(err.message,true)}}));
  }
 }else if(state.view==='admin'){
  if(state.user.role!=='admin'){content.innerHTML='<div class="notice">Administrator access only.</div>';return}
  const [workers,audit]=await Promise.all([api('/admin/workers'),api('/admin/audit')]);
  content.innerHTML=`<div class="grid grid-two"><form class="panel stack" id="inviteForm"><h2>Private beta invitation</h2><label>Email<input type="email" name="email" required></label><label>Account role<select name="role"><option value="buyer">Customer</option><option value="worker">Participant</option></select></label><button class="primary">Generate invitation</button><p class="muted">Invitation tokens are shown once. Send them privately.</p></form><div class="panel"><h2>Participant onboarding</h2>${workers.workers.map(w=>`<div class="mission"><div><strong>${esc(w.name)}</strong><p>${esc(w.skills.join(', '))}</p><p>${esc(w.verification)}</p></div>${w.verification!=='DEMO_REVIEWED'?`<button class="secondary" data-worker="${esc(w.userId)}">Demo review</button>`:''}</div>`).join('')||'<p class="muted">No participants enrolled.</p>'}</div></div><div class="panel" id="invitationOut" hidden></div><h2 class="section-title">Recent audit events</h2><div class="panel"><table><thead><tr><th>Time</th><th>Action</th><th>Resource</th></tr></thead><tbody>${audit.events.slice(0,60).map(x=>`<tr><td>${esc(x.created_at)}</td><td>${esc(x.action)}</td><td>${esc(x.resource_type)}</td></tr>`).join('')}</tbody></table></div>`;
  $('inviteForm').addEventListener('submit',async e=>{e.preventDefault();try{const r=await api('/admin/invitations',{method:'POST',data:fields(e.target)});$('invitationOut').hidden=false;$('invitationOut').textContent=`Copy invitation token now for ${r.email} (${r.role}): ${r.invitation}`;msg('Invitation created. Copy securely.') }catch(err){msg(err.message,true)}});
  document.querySelectorAll('[data-worker]').forEach(b=>b.addEventListener('click',async()=>{try{const answer=await openDialog({title:'Review test participant profile',description:'This is a simulated onboarding review, not identity or licensing verification.',inputs:dialogNote('What did you review?',20,700),submitLabel:'Record demo review'});if(!answer)return;await api(`/admin/workers/${encodeURIComponent(b.dataset.worker)}/review`,{method:'POST',data:{notes:answer.note}});await render();msg('Demo profile review recorded. Real identity remains unverified.')}catch(err){msg(err.message,true)}}));
 }else if(state.view==='safety'){
  content.innerHTML=`<div class="notice"><strong>Important:</strong> SniperX Forge is a private beta. No real marketplace payments, background checks, identity checks, license approvals, or assignments are active.</div>
  <div class="panel help-section"><h2>Frequently asked questions</h2>
   <details><summary>Are the jobs on Forge real?</summary><p>Listings come from external publishers when configured. Forge does not independently verify that each employer or opening is legitimate. Use the original publisher link, confirm details with the employer and never pay anyone to apply for a job.</p></details>
   <details><summary>Can I earn money from Forge projects today?</summary><p>No. Project assignments and financial amounts are simulations. Forge is testing the process before allowing paid work.</p></details>
   <details><summary>Why does the platform show verification cases?</summary><p>These cases record administrative workflow steps only. They are not completed identity checks, official license verification or background screening. Do not upload sensitive reports or identity documents into beta project descriptions.</p></details>
   <details><summary>How do I report unsafe or suspicious work?</summary><p>Open <strong>My projects</strong>, locate the applicable test project and select <strong>Report a concern</strong>. This pauses that project. For external job listings, report suspicious postings to the original publisher. If anyone is in immediate danger, contact local emergency services.</p></details>
   <details><summary>Is my application submitted when I click a job?</summary><p>No. Job links open the original publisher's website. Follow the employer's instructions to apply. Forge does not submit applications on your behalf.</p></details>
  </div>
  ${state.user.role==='admin'?`<div class="panel spaced"><h2>Before any public launch</h2><p class="section-lead">Launch remains disabled until identity and background screening vendors, license checks, applicable legal and insurance reviews, secure payments, independent security assessments, monitoring and incident operations are in place.</p><button type="button" class="secondary" data-go="verification">View verification workflows →</button></div>`:''}
  <div class="panel spaced"><h2>Need help navigating?</h2><p class="muted">Use <strong>Home</strong> to choose your next step, <strong>Find jobs</strong> for sourced listings, and <strong>My projects</strong> for test service requests.</p><button type="button" class="secondary" data-go="home">Back to Home →</button></div>`;

 }
 }catch(err){content.innerHTML='';msg(err.message,true)}
}
function openDialog({title,description='',inputs='',submitLabel='Continue',danger=false}){
 return new Promise(resolve=>{
  const modal=document.createElement('dialog');modal.className='forge-dialog';
  modal.innerHTML=`<form class="dialog-form"><h2>${esc(title)}</h2><p class="muted">${esc(description)}</p>${inputs}<div class="dialog-actions"><button class="ghost" type="button" data-dismiss>Go back</button><button class="${danger?'danger':'primary'}" type="submit">${esc(submitLabel)}</button></div></form>`;
  document.body.append(modal);
  const finish=value=>{modal.close();modal.remove();resolve(value)};
  modal.addEventListener('cancel',event=>{event.preventDefault();finish(null)});
  modal.querySelector('[data-dismiss]').addEventListener('click',()=>finish(null));
  modal.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;finish(fields(form))});
  modal.showModal();
 });
}
function dialogNote(label,min,max=700){return `<label>${esc(label)}<textarea name="note" required minlength="${min}" maxlength="${max}" placeholder="Write at least ${min} characters"></textarea></label>`}
async function missionAction(action,id){try{
 if(action==='match'){
  const r=await api(`/missions/${encodeURIComponent(id)}/matches`),eligible=r.matches.filter(x=>x.eligible);
  if(!eligible.length){msg('No eligible demo-reviewed participants are available for this project yet.',true);return}
  const inputs=`<label>Choose an eligible participant<select name="workerUserId" required>${eligible.map(x=>`<option value="${esc(x.workerUserId||x.workerId)}">${esc(x.name||x.workerId)} · match score ${esc(x.score||0)} (demo)</option>`).join('')}</select></label>`;
  const form=await openDialog({title:'Assign a test project',description:'These are demo-only matches. No participant will be contacted or paid.',inputs,submitLabel:'Assign in demo'});
  if(!form)return;await api(`/missions/${encodeURIComponent(id)}/assign`,{method:'POST',data:{workerUserId:form.workerUserId}});
 }else if(action==='accept'){
  const form=await openDialog({title:'Accept completed test work',description:'This records a simulated acceptance. No real funds are transferred.',inputs:'<label class="checkbox-label"><input type="checkbox" name="confirm" required> I understand this is a test, not an actual payment</label>',submitLabel:'Accept test delivery'});
  if(!form)return;await api(`/missions/${encodeURIComponent(id)}/accept`,{method:'POST',data:{}});
 }else{
  const options={approve:['Approve after review','Explain how you reviewed the project scope. This approval is simulated.','Operator review notes',20,600,'Approve demo request',false],submit:['Submit finished work','Summarize what you delivered in this demonstration.','What did you complete?',12,500,'Submit test work',false],cancel:['Cancel this project','Tell us why you want to cancel. This cannot be undone in the demo.','Reason for cancellation',8,250,'Cancel project',true],incident:['Report a safety concern','Reporting a concern pauses the project. Do not include identity documents or sensitive records.','Describe the concern',20,800,'Pause and report',true]};
  const o=options[action];if(!o)return;
  const form=await openDialog({title:o[0],description:o[1],inputs:dialogNote(o[2],o[3],o[4]),submitLabel:o[5],danger:o[6]});
  if(!form)return;
  const data=action==='submit'?{proof:form.note}:action==='cancel'?{reason:form.note}:action==='incident'?{note:form.note,severity:'HIGH'}:{note:form.note};
  await api(`/missions/${encodeURIComponent(id)}/${action}`,{method:'POST',data});
 }
 await render();msg(action==='incident'?'The test project has been paused for safety review.':'Your test project was updated successfully.');
 }catch(err){msg(err.message,true)}
}
function applySession(r){state.user=r.user;state.csrf=r.csrf;$('auth').hidden=!!r.authenticated;$('dashboard').hidden=!r.authenticated;$('nav').hidden=!r.authenticated;$('signout').hidden=!r.authenticated;$('who').textContent=r.user?`${r.user.displayName} · ${{buyer:'Customer',worker:'Participant',admin:'Admin'}[r.user.role]||'Member'}`:'Invite-only';document.querySelectorAll('[data-view]').forEach(x=>{x.hidden=(x.dataset.view==='new'&&r.user?.role!=='buyer')||(x.dataset.view==='worker'&&r.user?.role!=='worker')||(x.dataset.view==='admin'&&r.user?.role!=='admin');x.classList.toggle('active',x.dataset.view===state.view);if(x.dataset.view===state.view)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});}
$('login').addEventListener('submit',async e=>{e.preventDefault();try{const r=await api('/auth/login',{method:'POST',data:fields(e.target)});applySession(r);state.view='home';msg('Signed in');await render()}catch(err){msg(err.message,true)}});
$('register').addEventListener('submit',async e=>{e.preventDefault();try{await api('/auth/register',{method:'POST',data:fields(e.target)});msg('Account created. Please sign in.');e.target.reset()}catch(err){msg(err.message,true)}});
$('signout').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST',data:{}});applySession({authenticated:false,user:null,csrf:null});msg('Signed out')}catch(err){msg(err.message,true)}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
$('viewcontent').addEventListener('click',event=>{const b=event.target.closest('[data-go]');if(b)navigate(b.dataset.go)});
$('refresh').addEventListener('click',()=>render());
try{const r=await api('/session');applySession(r);if(r.authenticated)await render()}catch(err){msg(err.message,true)}

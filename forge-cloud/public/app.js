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
 document.querySelectorAll('[data-mobile-view]').forEach(x=>{const active=x.dataset.mobileView===view;x.classList.toggle('active',active);if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});
 $('sidebar').classList.remove('nav-expanded');
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
 const [k,t,d]=state.view==='wallet'?['TEST WALLET','My test earnings','Simulated financial records only. No real money moves.']:titles[state.view];document.body.dataset.activeView=state.view;$('viewkicker').textContent=k;$('viewtitle').textContent=t;$('viewdesc').textContent=d;$('refresh').hidden=state.view==='new';
 const content=$('viewcontent');content.innerHTML='<p class="muted" role="status">Loading your workspace…</p>';
 try{
 if(state.view==='home'){
  if(state.user.role==='worker'){
   const [feed,services,discovery]=await Promise.all([api('/earn/feed'),getServices(),api('/earn/discover?mode=ALL')]);content.innerHTML=earnTodayContent(feed,services,discovery);bindFastLane(discovery);bindEarn(feed);bindServiceTemplates(services);
  }else if(state.user.role==='admin'){
   const r=await api('/admin/overview');const s=r.summary;content.innerHTML=`${focusHero()}${homeHighlights()}<div class="notice">PRE-PRODUCTION: Account review is not identity verification; mission totals and financials are simulated.</div><div class="grid"><div class="tile"><div class="label">Customer requests</div><div class="value">${s.totalMissions}</div><div class="hint">Simulated missions only</div></div><div class="tile"><div class="label">Participant profiles</div><div class="value">${s.participants}</div><div class="hint">Unverified identities</div></div><div class="tile"><div class="label">Safety holds</div><div class="value">${s.safetyHolds}</div><div class="hint">Frozen demo operations</div></div><div class="tile"><div class="label">Simulated completed value</div><div class="value">${money(s.completedGrossCents)}</div></div><div class="tile"><div class="label">Simulated participant allocation</div><div class="value">${money(s.workerPayCents)}</div></div><div class="tile"><div class="label">Uncovered requests</div><div class="value">${r.intelligence.uncoveredCount}</div></div></div><h2 class="section-title">Demand gaps (demo only)</h2><div class="panel">${r.intelligence.skillGaps.length?r.intelligence.skillGaps.map(g=>`<p>${esc(g.skill)} · ${g.count} uncovered request(s)</p>`).join(''):'No unmatched requests yet'}</div>`;
  }else{
   const r=await api('/missions');content.innerHTML=`${focusHero()}${homeHighlights()}<div class="notice">No real funds or work assignments occur in this private beta.</div><div class="grid"><div class="tile"><div class="label">Your visible missions</div><div class="value">${r.missions.length}</div></div><div class="tile"><div class="label">Completed demos</div><div class="value">${r.missions.filter(x=>x.status==='COMPLETED').length}</div></div><div class="tile"><div class="label">Open safety holds</div><div class="value">${r.missions.filter(x=>x.safetyHold).length}</div></div></div><h2 class="section-title">Recent activity</h2>${r.missions.slice(0,4).map(missionCard).join('')||'<p class="muted">No missions yet.</p>'}`;bindActions();
  }
 }else if(state.view==='earn'){
  const [feed,services,discovery]=await Promise.all([api('/earn/feed'),getServices(),api('/earn/discover?mode=ALL')]);content.innerHTML=earnTodayContent(feed,services,discovery);bindFastLane(discovery);bindEarn(feed);bindServiceTemplates(services);
 }else if(state.view==='wallet'){
  const wallet=await api('/wallet/me');content.innerHTML=walletContent(wallet);bindWallet(wallet);
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
  const intake=state.user.role==='buyer'?await api('/earn/shift-intakes'):null;
  content.innerHTML=state.user.role==='buyer'?quickPostForms(intake?.intakes||[]):'<div class="notice">Only buyer accounts may create service requests.</div>';
  setupQuickPost();
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
function applySession(r){state.user=r.user;state.csrf=r.csrf;$('auth').hidden=!!r.authenticated;$('dashboard').hidden=!r.authenticated;$('nav').hidden=!r.authenticated;$('signout').hidden=!r.authenticated;$('mobileDock').hidden=!r.authenticated;$('who').textContent=r.user?`${r.user.displayName} · ${{buyer:'Customer',worker:'Participant',admin:'Admin'}[r.user.role]||'Member'}`:'Invite-only';document.querySelectorAll('[data-view]').forEach(x=>{x.hidden=(x.dataset.view==='new'&&r.user?.role!=='buyer')||(x.dataset.view==='worker'&&r.user?.role!=='worker')||(x.dataset.view==='admin'&&r.user?.role!=='admin')||(x.dataset.view==='wallet'&&r.user?.role!=='worker');x.classList.toggle('active',x.dataset.view===state.view);if(x.dataset.view===state.view)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});document.querySelectorAll('[data-mobile-view]').forEach(x=>{x.hidden=(x.dataset.mobileView==='new'&&r.user?.role!=='buyer')||(x.dataset.mobileView==='worker'&&r.user?.role!=='worker')||(x.dataset.mobileView==='wallet'&&r.user?.role!=='worker');x.classList.toggle('active',x.dataset.mobileView===state.view)});}
$('login').addEventListener('submit',async e=>{e.preventDefault();try{const r=await api('/auth/login',{method:'POST',data:fields(e.target)});applySession(r);state.view='home';msg('Signed in');await render()}catch(err){msg(err.message,true)}});
$('register').addEventListener('submit',async e=>{e.preventDefault();try{await api('/auth/register',{method:'POST',data:fields(e.target)});msg('Account created. Please sign in.');e.target.reset()}catch(err){msg(err.message,true)}});
$('signout').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST',data:{}});applySession({authenticated:false,user:null,csrf:null});msg('Signed out')}catch(err){msg(err.message,true)}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
$('viewcontent').addEventListener('click',event=>{const b=event.target.closest('[data-go]');if(b)navigate(b.dataset.go)});
$('refresh').addEventListener('click',()=>render());
document.querySelectorAll('[data-mobile-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.mobileView)));
$('mobileMore').addEventListener('click',()=>{$('sidebar').classList.toggle('nav-expanded')});
try{const r=await api('/session');applySession(r);if(r.authenticated)await render()}catch(err){msg(err.message,true)}

/* Standalone beta features inserted by the deterministic handoff integrator. */
function earnTodayContent(feed,services,discovery){
 const original=earnContent(feed,services);
 const marker='</section>';
 const at=original.indexOf(marker);
 if(at<0)throw new Error('Earn Today page shell changed: cannot place Fast Lane');
 const where=at+marker.length;
 return original.slice(0,where)+fastLaneContent(discovery)+original.slice(where);
}

function fastLaneContent(discovery){
 const n=discovery.inventory;
 const worker=state.user.role==='worker';
 const a=discovery.workerAvailability;
 return `<section class="fast-lane" aria-labelledby="fast-lane-title">
  <div class="fast-heading"><div><span class="fast-eyebrow">⚡ EARN TODAY ENGINE / BETA</span><h2 id="fast-lane-title">Find work without the wait<span>.</span></h2><p>Choose your pace. Test missions are not paid assignments. External openings are real publisher ads, but <strong>not verified same-day work</strong>.</p></div><div class="fast-live-count"><strong>0</strong><span>VERIFIED PAID TODAY</span></div></div>
  ${worker?`<div class="fast-ready"><div><strong>My availability</strong><small>${a?.active?`You marked yourself available until ${esc(new Date(a.expiresAt).toLocaleString())}. This is self-reported, not a booking.`:'Optional: let Forge know when you can take a test mission. No job is guaranteed.'}</small></div><div class="fast-ready-controls"><button type="button" data-ready="4" class="${a?.active?'fast-secondary':'fast-primary'}">Available for 4h</button><button type="button" data-ready="12" class="fast-secondary">12h</button><button type="button" data-ready="OFF" class="fast-secondary">Go offline</button></div></div>`:''}
  <div class="fast-tabs" role="group" aria-label="Choose work search speed"><button type="button" data-fast-mode="TODAY" class="active" aria-pressed="true">⚡ Today</button><button type="button" data-fast-mode="NEXT_48H" aria-pressed="false">Next 48h</button><button type="button" data-fast-mode="CAREERS" aria-pressed="false">Career openings</button><button type="button" data-fast-mode="ALL" aria-pressed="false">All</button></div>
  <label class="fast-search-label"><span class="sr-only">Search available test missions and externally sourced jobs</span><input id="fastSearch" type="search" placeholder="Search job title, skill, employer or area…" autocomplete="off"></label>
  <div class="fast-statline" id="fastStat" role="status" aria-live="polite">${n.simulatedMissions} test requests · ${n.sourcedCareerAds} sourced career ads</div>
  <div id="fastResults" class="fast-grid"></div>
  <div class="fast-footnote">Urgency is provided by a test buyer, not verified start time. Demo budgets aren't real earnings. Career listings redirect to the original publisher. Forge has no real dispatch or payment service yet.</div>
 </section>`;
}
function fastLaneCard(o){
 if(o.kind==='EXTERNAL_CAREER_JOB')return `<article class="fast-card"><div class="fast-card-label"><span>EXTERNAL CAREER OPENING</span><span>${esc(o.source)}</span></div><h3>${esc(o.title)}</h3><p>${esc(o.employer)} · ${esc(o.locationLabel)}</p><div class="fast-card-bottom"><span>Hiring timeline and pay <strong>not verified</strong></span><a href="${esc(o.applyURL)}" target="_blank" rel="noopener noreferrer">Original job ad ↗</a></div></article>`;
 return `<article class="fast-card"><div class="fast-card-label"><span>TEST MISSION · NO PAY</span><span>${o.requestedUrgency==='TODAY'?'REQUESTED TODAY':o.requestedUrgency==='NEXT_48H'?'NEXT 48 HOURS':'FLEXIBLE'}</span></div><h3>${esc(o.title)}</h3><p>${esc(o.locationLabel)} · ${esc(o.category)} · ${esc(o.schedule)}</p><p>${esc((o.skills||[]).slice(0,3).join(' · '))}</p><div class="fast-card-bottom"><span><strong>${money(o.illustrativeWorkerPayCents)}</strong> illustrative only</span><button type="button" data-fast-see="${esc(o.id)}">View test feed ↓</button></div><small>${o.fit?.eligible?'Demo skill match · not identity verified':'Not an accepted or paid booking'}</small></article>`;
}
function bindFastLane(discovery){
 let mode='TODAY';
 const demos=discovery.missions||[],careers=discovery.careers||[];
 const tabs=[...document.querySelectorAll('[data-fast-mode]')];
 const update=()=>{
  const q=($('fastSearch')?.value||'').trim().toLowerCase();
  const list=[...(mode==='CAREERS'?[]:demos.filter(m=>mode==='TODAY'?m.requestedUrgency==='TODAY':mode==='NEXT_48H'?['TODAY','NEXT_48H'].includes(m.requestedUrgency):true)),...(mode==='TODAY'||mode==='NEXT_48H'?[]:careers)];
  const found=list.filter(m=>[m.title,m.employer,m.locationLabel,m.category,...(m.skills||[])].filter(Boolean).join(' ').toLowerCase().includes(q));
  $('fastStat').textContent=`${found.length} ${mode==='CAREERS'?'sourced career ads':mode==='TODAY'?'buyer-urgent demo requests':mode==='NEXT_48H'?'near-term demo requests':'sourced items (test and external)'} · 0 verified paid-today missions`;
  $('fastResults').innerHTML=found.length?found.map(fastLaneCard).join(''):`<div class="fast-empty"><strong>${mode==='CAREERS'?'No sourced career listings available':mode==='TODAY'?'No verified paid-today missions available':'No matches currently available'}</strong><p>${mode==='CAREERS'?'Official feeds must be configured and refreshed by an administrator.':'Forge will never generate fictional job openings or promise money that is not available.'}</p></div>`;
  $('fastResults').querySelectorAll('[data-fast-see]').forEach(b=>b.addEventListener('click',()=>{const search=$('earnSearch');if(search){search.value=b.closest('.fast-card')?.querySelector('h3')?.textContent||'';search.dispatchEvent(new Event('input'))}document.querySelector('#market-title')?.scrollIntoView({behavior:'smooth'})}));
  tabs.forEach(t=>{t.classList.toggle('active',t.dataset.fastMode===mode);t.setAttribute('aria-pressed',String(t.dataset.fastMode===mode))});
 };
 tabs.forEach(t=>t.addEventListener('click',()=>{mode=t.dataset.fastMode;update()}));
 $('fastSearch').addEventListener('input',update);
 document.querySelectorAll('[data-ready]').forEach(b=>b.addEventListener('click',async()=>{
  try{const off=b.dataset.ready==='OFF';const hours=off?undefined:Number(b.dataset.ready);await api('/earn/availability',{method:'POST',data:{action:off?'OFF':'ON',...(off?{}:{hours})}});msg(off?'Your self-reported availability is off.':'Availability saved for demo matching — no live job booked.');await render()}catch(err){msg(err.message,true)}
 }));
 update();
}

function walletContent(wallet){
 const available=money(wallet.balanceCents);
 return `<section class="wallet-page">
   <div class="wallet-header"><span class="wallet-eyebrow">MY MONEY / PRIVATE TEST</span><h2>Your work. Your earnings.</h2><p>See what a real Forge wallet could look like. Every number here is simulated: <strong>no bank account or real money is connected.</strong></p></div>
   <div class="wallet-summary"><div class="wallet-balance"><span>AVAILABLE TEST BALANCE</span><strong>${available}</strong><small>Only completed, separately test-funded missions create demo earnings.</small></div><div class="wallet-icon" aria-hidden="true">↗</div></div>
   <div class="wallet-choice-head"><div><span class="wallet-eyebrow">PAYOUT CHOICES</span><h3>Pick how you'd get paid.</h3></div><span class="wallet-demo-tag">SIMULATION ONLY</span></div>
   <div class="wallet-methods" id="walletMethods"><label class="wallet-method selected"><input type="radio" name="walletMethod" value="STANDARD" checked><span><strong>Standard bank transfer</strong><small>No Forge speed fee. Bank processing takes time.</small></span><b>$0 fee</b></label><label class="wallet-method"><input type="radio" name="walletMethod" value="INSTANT"><span><strong>Faster transfer</strong><small>For eligible accounts with available funds; speed not guaranteed.</small></span><b>1.5%*</b></label></div>
   <form class="wallet-form" id="walletForm"><label for="walletAmount">Amount to transfer (test USD)</label><div class="wallet-amount"><span>$</span><input id="walletAmount" name="amount" type="number" min="5" max="10000" step=".01" inputmode="decimal" value="${(Math.min(wallet.balanceCents,2000)/100).toFixed(2)}" required></div><div class="wallet-quote" id="walletQuote" role="status">Enter a valid amount to preview the transfer and fee.</div><button class="wallet-payout-button" id="walletPayoutButton" type="submit" disabled>Request simulated payout →</button></form>
   <p class="wallet-disclaimer">*Illustrative faster-payout fee: 1.5%, minimum $0.50. Real fees, eligibility and timing would depend on the approved payment provider. This preview cannot send money, verify a bank, or make money available early.</p>
   <div class="wallet-history"><h3>Payout history</h3>${wallet.payouts.length?wallet.payouts.map(p=>`<div class="wallet-history-row"><div><strong>${esc(p.method==='INSTANT'?'Faster':'Standard')} test payout</strong><small>${esc(friendlyDate(p.requested_at))} · ${esc(p.status.replaceAll('_',' ').toLowerCase())}</small></div><div><strong>${money(p.net_cents)}</strong><small>Fee ${money(p.fee_cents)}</small></div></div>`).join(''):'<p>No test withdrawals yet.</p>'}</div>
   <div class="wallet-history"><h3>Test earnings activity</h3>${wallet.ledger.length?wallet.ledger.map(e=>`<div class="wallet-history-row"><div><strong>${esc(({MISSION_RELEASE:'Completed mission credit',PAYOUT_RESERVED:'Withdrawal reserved',PAYOUT_REFUNDED:'Failed payout returned'})[e.kind]||'Transaction')}</strong><small>${esc(friendlyDate(e.created_at))}</small></div><strong>${e.amount_cents>0?'+':'−'}${money(Math.abs(e.amount_cents))}</strong></div>`).join(''):'<p>No test earnings yet. Paid missions are not available in this private beta.</p>'}</div>
 </section>`;
}
function bindWallet(wallet){
 const form=$('walletForm');if(!form)return;
 const amount=$('walletAmount'),quoteEl=$('walletQuote'),button=$('walletPayoutButton');
 let quote=null,queryVersion=0;
 async function updateQuote(){
   const version=++queryVersion;
   const cents=Math.round(Number(amount.value)*100),method=document.querySelector('input[name="walletMethod"]:checked')?.value;
   quote=null;button.disabled=true;
   document.querySelectorAll('.wallet-method').forEach(x=>x.classList.toggle('selected',x.querySelector('input').checked));
   if(!Number.isSafeInteger(cents)||cents<500||cents>wallet.balanceCents){quoteEl.textContent='Enter at least $5.00, up to your available simulated balance.';return;}
   try{
     const next=await api('/wallet/quote',{method:'POST',data:{amountCents:cents,method}});
     if(version!==queryVersion)return;quote=next;
     quoteEl.innerHTML=`<div><span>Test balance debit</span><strong>${money(next.amountCents)}</strong></div><div><span>${method==='INSTANT'?'Faster payout fee':'Standard transfer speed fee'}</span><strong>${money(next.feeCents)}</strong></div><div class="wallet-net"><span>Would arrive, if eligible</span><strong>${money(next.netCents)}</strong></div><small>Illustration only — no bank transfer can occur.</small>`;
     button.disabled=false;
   }catch(error){if(version===queryVersion)quoteEl.textContent=error.message;}
 }
 amount.addEventListener('input',updateQuote);
 document.querySelectorAll('input[name="walletMethod"]').forEach(x=>x.addEventListener('change',updateQuote));
 form.addEventListener('submit',async event=>{
   event.preventDefault();if(!quote)return;
   const confirm=await openDialog({title:'Confirm simulated payout?',description:`Test payout: ${money(quote.amountCents)} • fee ${money(quote.feeCents)} • illustrative net ${money(quote.netCents)}. No real funds or bank transfers are involved.`,submitLabel:'Reserve TEST payout'});
   if(!confirm)return;
   button.disabled=true;
   try{
     const key=typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
     const result=await api('/wallet/payouts',{method:'POST',data:{amountCents:quote.amountCents,method:quote.method,idempotencyKey:key}});
     await render();msg(result.bankTransferInitiated?'Transfer initiated.':'Simulated payout reserved. No real bank transfer occurred.');
   }catch(error){msg(error.message,true);await updateQuote();}
 });
 updateQuote();
}

function quickPostForms(intakes=[]){return `<section class="quick-post-top" aria-label="Post work quickly">
 <div class="quick-post-heading"><div><span class="fast-eyebrow">CUSTOMER QUICK POST · SANDBOX</span><h2>Need help today?</h2><p>Create a real description of your need in a minute. Submitting does not create live work, a contractor relationship, an employer relationship, or a payment.</p></div></div>
 <div class="fast-tabs" role="group" aria-label="Request type"><button type="button" data-intake-mode="PROJECT" aria-pressed="true" class="active">⚡ Quick project</button><button type="button" data-intake-mode="SHIFT" aria-pressed="false">W-2 shift inquiry</button><button type="button" data-intake-mode="DETAILED" aria-pressed="false">Detailed project</button></div>
 <form class="panel quick-intake" id="quickProjectForm"><h3>Request a defined service</h3><p class="muted">A service request is not automatically independent-contractor work. Classification and business verification require separate review. Digital-only private beta.</p>
 <label>What needs to be finished?<input name="title" required minlength="8" maxlength="90" placeholder="Write descriptions for ten products"></label>
 <label>What is the result you expect?<textarea name="description" required minlength="20" maxlength="500" placeholder="Write ten short product descriptions from the details I supply. Deliver a document ready for review."></textarea></label>
 <div class="quick-intake-grid"><label>Service<select name="category"><option>Content & Copy</option><option>Digital Setup</option></select></label><label>Where?<input name="city" required minlength="2" maxlength="75" value="New Jersey"></label></div>
 <div class="quick-intake-grid"><label>When is the result needed?<select name="urgency"><option value="TODAY">Today — requested only</option><option value="NEXT_48H">Within 48 hours</option><option value="FLEXIBLE">Flexible</option></select></label><label>Example budget (USD)<input name="budgetUSD" required type="number" step=".01" min="1" max="10000" value="100"></label></div>
 <label>Estimated minutes (15–480)<input name="estimatedMinutes" type="number" min="15" max="480" step="15" value="60" required></label>
 <button type="submit" class="primary">Submit test project →</button><p class="muted">No funds will be charged. A reviewer must approve any test mission before it appears to beta participants.</p></form>
 <form class="panel quick-intake" id="quickShiftForm" hidden><h3>Ask about an employee shift</h3><p class="muted">This is an inquiry for W-2 employment through a verified employer or properly qualified staffing/payroll partner. Forge is not currently recruiting, employing, or placing shift workers. No wages or advances are available.</p>
 <label>Business / prospective employer<input name="employerName" minlength="3" maxlength="90" required placeholder="Business legal name"></label>
 <label>Shift title<input name="title" required minlength="8" maxlength="90" placeholder="Weekend event assistant"></label>
 <label>What would the employee do?<textarea name="description" minlength="20" maxlength="500" required placeholder="Assist with check-in at an event under employer supervision. Training and exact responsibilities to be determined."></textarea></label>
 <div class="quick-intake-grid"><label>City<input name="city" required minlength="2" maxlength="75" value="New Jersey"></label><label>Requested timing<select name="urgency"><option value="TODAY">Today</option><option value="NEXT_48H">Next 48 hours</option><option value="FLEXIBLE">Flexible</option></select></label></div>
 <div class="quick-intake-grid"><label>Illustrative hourly wage (USD)<input name="hourlyRateUSD" type="number" step=".01" min="1" max="1000" value="20" required></label><label>Shift length (hours)<input name="shiftHours" type="number" step=".25" min="1" max="16" value="4" required></label></div>
 <button type="submit" class="primary">Submit shift inquiry →</button><p class="muted">Never appears on Earn Today until a lawful employment and payroll arrangement is established. No worker instant-withdrawal fees for payroll wages are enabled.</p></form>
 <div id="detailedProject" hidden>${missionForm()}</div>
 ${intakes.length?`<aside class="panel"><h3>Your employment shift inquiries</h3>${intakes.slice(0,10).map(i=>`<p><strong>${esc(i.title)}</strong> · ${esc(i.status.replaceAll('_',' ').toLowerCase())} · not posted to workers</p>`).join('')}</aside>`:''}
 </section>`;}
function setupQuickPost(){
 const modes={PROJECT:'quickProjectForm',SHIFT:'quickShiftForm',DETAILED:'detailedProject'};
 document.querySelectorAll('[data-intake-mode]').forEach(button=>button.addEventListener('click',()=>{
  const next=button.dataset.intakeMode;
  Object.entries(modes).forEach(([mode,id])=>{$(id).hidden=mode!==next});
  document.querySelectorAll('[data-intake-mode]').forEach(b=>{const active=b.dataset.intakeMode===next;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 }));
 const forms=[['quickProjectForm','SERVICE_PROJECT'],['quickShiftForm','EMPLOYEE_SHIFT']];
 forms.forEach(([id,requestType])=>$(id)?.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
  const raw=fields(form),data={...raw,requestType};
  if(requestType==='SERVICE_PROJECT'){data.budgetUSD=Number(raw.budgetUSD);data.estimatedMinutes=Number(raw.estimatedMinutes)}
  else{data.hourlyRateUSD=Number(raw.hourlyRateUSD);data.shiftHours=Number(raw.shiftHours)}
  const button=form.querySelector('button[type="submit"]');setBusy(button,true);
  try{
   const result=await api('/earn/quick-post',{method:'POST',data});
   await render();
   msg(requestType==='SERVICE_PROJECT'?'Test request saved for manual review. No real job or payment was created.':`Shift inquiry ${result.id.slice(0,8)} saved. It is not posted and no payroll is active.`);
  }catch(error){msg(error.message,true)}finally{setBusy(button,false)}
 }));
}

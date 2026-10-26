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

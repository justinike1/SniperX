import {
  CASE_STATUSES,
  EVIDENCE_STATUSES,
  appendActivity,
  arithmeticScenarios,
  buildQuoteComparison,
  calculateMarketingSnapshot,
  calculateLeaseDesk,
  calculateEconomics,
  createCaseFromIntake,
  createLeadFromWebsite,
  currency,
  findLeaseProgram,
  initialDemoState,
  leaseTierScenarios,
  normalizeQuote,
  sanitizeReadinessItem,
} from "./model.mjs";

const STORAGE_KEY = "iag_brokerage_demo_v1";
const app = document.getElementById("app");

let state = loadState();
let flash = "";
let flashTone = "ok";
const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Booked", "Closed Won", "Closed Lost"];

render();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialDemoState();
    const parsed = JSON.parse(raw);
    if (!parsed?.cases || !Array.isArray(parsed.cases)) return initialDemoState();
    const seed = initialDemoState();
    return {
      ...seed,
      ...parsed,
      ui: {
        ...seed.ui,
        ...(parsed.ui || {}),
      },
      marketingLeads: Array.isArray(parsed.marketingLeads)
        ? parsed.marketingLeads
        : seed.marketingLeads,
      marketing: {
        ...seed.marketing,
        ...(parsed.marketing || {}),
        funnelInputs: {
          ...seed.marketing.funnelInputs,
          ...(parsed.marketing?.funnelInputs || {}),
        },
      },
      desking: {
        ...seed.desking,
        ...(parsed.desking || {}),
        inputs: {
          ...seed.desking.inputs,
          ...(parsed.desking?.inputs || {}),
        },
        tiers: Array.isArray(parsed.desking?.tiers)
          ? parsed.desking.tiers
          : seed.desking.tiers,
        lenderProfiles: Array.isArray(parsed.desking?.lenderProfiles)
          ? parsed.desking.lenderProfiles
          : seed.desking.lenderProfiles,
        selectedProfileId:
          parsed.desking?.selectedProfileId || seed.desking.selectedProfileId,
        selectedProgramId:
          parsed.desking?.selectedProgramId || seed.desking.selectedProgramId,
        selectedImportCaseId:
          parsed.desking?.selectedImportCaseId || seed.desking.selectedImportCaseId,
      },
      customerIntakeDefaults: {
        ...seed.customerIntakeDefaults,
        ...(parsed.customerIntakeDefaults || {}),
      },
    };
  } catch {
    return initialDemoState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mutate(mutator) {
  const next = structuredClone(state);
  mutator(next);
  state = next;
  saveState();
  render();
}

function setFlash(message, tone = "ok") {
  flash = message;
  flashTone = tone;
}

function clearFlash() {
  flash = "";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char];
  });
}

function statusClass(value) {
  return `status-${String(value).replaceAll(" ", "-")}`;
}

function proposedFeeForPackage(packageName) {
  if (packageName === "Strategic Buy Plan") return 399;
  if (packageName === "Concierge Delivery") return 1499;
  return 999;
}

function linkedCaseForLead(leadId, cases = state.cases) {
  return (cases || []).find((item) => (item.notes || "").includes(`LeadRef:${leadId}`)) || null;
}

function buildCaseFromLead(lead, existingCount = 0) {
  const item = createCaseFromIntake(
    {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      intent: lead.intent || "Purchase",
      budgetUSD: lead.budgetUSD,
      preferences: lead.vehicleGoal,
      timeframe: lead.timeline || "Flexible",
      tradeIn: false,
      owner: "Founder",
      proposedFee: proposedFeeForPackage(lead.packageInterest),
    },
    existingCount
  );
  item.notes = `${item.notes}\nLeadRef:${lead.id}`;
  return appendActivity(item, `LeadRef:${lead.id} converted from website lead pipeline.`);
}

function applyLeadToDeskState(next, lead) {
  const budget = Number(lead.budgetUSD || 0);
  const goalText = String(lead.vehicleGoal || "").toLowerCase();
  const timeframeText = String(lead.timeline || "").toLowerCase();
  const targetMonthly = Number(lead.targetMonthlyPayment || 0);
  const isLease = String(lead.intent || "Purchase") === "Lease";

  const budgetFromMonthly =
    targetMonthly > 0 ? Math.max(12000, Math.round(targetMonthly * (isLease ? 120 : 72))) : 0;
  const budgetFromLead = budget > 0 ? budget : 0;
  const baselineSelling = Math.max(
    12000,
    budgetFromMonthly || (isLease && budgetFromLead < 2500 ? budgetFromLead * 115 : budgetFromLead)
  );
  const normalizedSelling = Math.round(baselineSelling / 100) * 100;
  const normalizedMsrp = Math.round((normalizedSelling * 1.08) / 100) * 100;
  const annualMileage = /15k|15000|high mileage|commut/.test(goalText) ? 15000 : 12000;
  const urgentTimeline = /week|asap|urgent|month[- ]end|immediate/.test(timeframeText);

  next.desking.inputs = {
    ...next.desking.inputs,
    msrp: normalizedMsrp,
    sellingPrice: normalizedSelling,
    incentives: isLease ? 500 : next.desking.inputs.incentives,
    capReduction: isLease ? 0 : next.desking.inputs.capReduction,
    termMonths: isLease ? 36 : next.desking.inputs.termMonths,
    annualMileage: isLease ? annualMileage : next.desking.inputs.annualMileage,
    baseResidualPct: isLease ? (urgentTimeline ? 60 : 61) : next.desking.inputs.baseResidualPct,
  };
}

function selectedCase() {
  return state.cases.find((item) => item.id === state.ui.selectedCaseId) || state.cases[0] || null;
}

function render() {
  const tab = state.ui.activeTab || "website";
  app.innerHTML = `
    <div class="shell">
      <header class="top">
        <div class="title">
          <h1>IKE Automotive Group — Brokerage Operating Demo</h1>
          <p>
            Local prototype for intake, negotiation case operations, quote comparison, economics, and readiness evidence tracking.
            No external messages, live payments, credit submissions, dealer transactions, or customer-funds custody occur in this demo.
          </p>
        </div>
        <div class="notice" role="note">
          <strong>Pre-launch demo boundary:</strong> This workspace is for reversible local simulation only.
          Checklist status is not legal approval, not NJMVC permission, and not launch authorization.
        </div>
        <div class="toolbar">
          <div class="tabs" role="tablist" aria-label="Prototype workspaces">
            ${tabButton("website", "Website", tab)}
            ${tabButton("marketing", "Marketing", tab)}
            ${tabButton("desk", "Lease Desk", tab)}
            ${tabButton("customer", "Customer demo", tab)}
            ${tabButton("cases", "Case workspace", tab)}
            ${tabButton("economics", "Economics", tab)}
            ${tabButton("readiness", "Readiness register", tab)}
            ${tabButton("metrics", "Metrics & dependencies", tab)}
          </div>
          <div class="spacer"></div>
          <button type="button" id="resetDemo" class="danger-btn">Reset demo data</button>
        </div>
      </header>
      <main class="view" id="maincontent" tabindex="-1">
        ${renderActiveView(tab)}
      </main>
      ${flash ? `<p class="${flashTone === "error" ? "warning-box" : "confirm"}">${esc(flash)}</p>` : ""}
    </div>
  `;
  bindCommon();
  bindView(tab);
}

function tabButton(id, label, current) {
  const active = id === current;
  return `<button type="button" role="tab" class="tab ${active ? "active" : ""}" aria-selected="${active}" data-tab="${id}">${esc(label)}</button>`;
}

function renderActiveView(tab) {
  if (tab === "website") return renderWebsite();
  if (tab === "marketing") return renderMarketing();
  if (tab === "desk") return renderLeaseDesk();
  if (tab === "cases") return renderCaseWorkspace();
  if (tab === "economics") return renderEconomics();
  if (tab === "readiness") return renderReadiness();
  if (tab === "metrics") return renderMetrics();
  return renderCustomerDemo();
}

function renderWebsite() {
  const leads = state.marketingLeads || [];
  const funnel = calculateMarketingSnapshot(state.marketing?.funnelInputs || {});
  const sourceCounts = leads.reduce((acc, lead) => {
    const key = lead.source || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const sourceMarkup = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => `<span class="source-pill">${esc(source)} · ${count}</span>`)
    .join("");
  const closedWon = leads.filter((lead) => lead.status === "Closed Won").length;
  const convertedToCase = leads.filter((lead) => linkedCaseForLead(lead.id, state.cases)).length;
  const leaseIntentLeads = leads.filter((lead) => (lead.intent || "Purchase") === "Lease").length;

  return `
    <section class="campaign-header">
      <div>
        <p class="eyebrow">IKE AUTOMOTIVE GROUP · AUTOMOTIVE BROKERAGE</p>
        <h2>Electrified campaign system for your launch.</h2>
        <p class="lead" style="margin-top:6px">
          Founder-forward brand creative, high-intent lead capture, and marketing controls connected in one local demo flow.
        </p>
      </div>
      <div class="brand-badge">
        <img src="./assets/ike-logo.jpg" alt="IKE Automotive Group logo" class="brand-logo">
      </div>
    </section>

    <section class="campaign-poster">
      <img
        src="./assets/campaign-lease-ending.jpg"
        alt="IKE Automotive Group lease ending campaign poster"
        class="campaign-full-image"
      >
    </section>

    <section class="campaign-gallery">
      <article class="campaign-card">
        <img
          src="./assets/campaign-car-shopping.jpg"
          alt="Car shopping campaign creative with value proposition blocks"
        >
        <div>
          <h3>Campaign angle: first-time + family + daily driver positioning</h3>
          <p>Use this as the primary conversion creative for social and DM-driven lead capture.</p>
        </div>
      </article>
      <article class="campaign-card">
        <img
          src="./assets/campaign-new-car-leases.jpg"
          alt="New car leases campaign creative with brand matrix"
        >
        <div>
          <h3>Campaign angle: lease replacement and brand breadth</h3>
          <p>Use this when targeting shoppers comparing multiple makes and lease options.</p>
        </div>
      </article>
    </section>

    <section class="poster-callout">
      <div>
        <strong>YOUR NEXT CAR STARTS HERE.</strong>
        <p>Vehicle search • Offer comparison • Personal service</p>
      </div>
      <div class="cta-row">
        <button type="button" class="poster-cta" data-jump="websiteLeadForm">START YOUR DEAL STRATEGY</button>
        <button type="button" class="secondary-btn" data-jump="websitePackages">VIEW SERVICE PACKAGES</button>
      </div>
      <div class="source-strip">${sourceMarkup || '<span class="source-pill">No lead-source mix yet</span>'}</div>
      <p class="poster-launch">COMING SOON — Launch subject to required authorization.</p>
    </section>

    <section class="site-energy-bar" aria-label="Website funnel preview">
      <div><span>Demo leads</span><strong>${leads.length}</strong></div>
      <div><span>Booked-call rate</span><strong>${funnel.metrics.bookedRate}%</strong></div>
      <div><span>Closed-won leads</span><strong>${closedWon}</strong></div>
      <div><span>Leads to case</span><strong>${convertedToCase}</strong></div>
      <div><span>Lease-intent leads</span><strong>${leaseIntentLeads}</strong></div>
      <div><span>CPL (assumed)</span><strong>${currency(funnel.metrics.cpl)}</strong></div>
    </section>

    <section class="conversion-runway" aria-label="Lead conversion runway">
      <article class="conversion-step">
        <span>STEP 1</span>
        <h3>Capture lead</h3>
        <p>Collect intent, budget, and timeline from website traffic in one form.</p>
      </article>
      <article class="conversion-step">
        <span>STEP 2</span>
        <h3>Convert to case</h3>
        <p>Create an internal case with tracked owner/status and explicit fee assumptions.</p>
      </article>
      <article class="conversion-step">
        <span>STEP 3</span>
        <h3>Desk the quote</h3>
        <p>Load assumptions into Lease Desk to model residual, MF, tier, and payment ranges.</p>
      </article>
    </section>

    <section class="route-grid">
      <button type="button" class="quick-route-btn" data-route-tab="customer">Open customer intake demo</button>
      <button type="button" class="quick-route-btn" data-route-tab="cases">Open internal case workspace</button>
      <button type="button" class="quick-route-btn" data-route-tab="desk">Open personal Lease Desk</button>
    </section>

    <section id="websitePackages" class="card" style="margin-top:14px">
      <h3>Service package architecture</h3>
      <div class="offer-grid" style="margin-top:10px">
        <article class="offer-card">
          <span>01 · STRATEGY</span>
          <h4>Strategic Buy Plan</h4>
          <p class="offer-price">${currency(399)}</p>
          <p>Market brief, trim targeting, and negotiation prep notes.</p>
          <small>Best for self-directed buyers needing tactical clarity.</small>
        </article>
        <article class="offer-card featured">
          <span>02 · FLAGSHIP</span>
          <h4>Full Negotiation</h4>
          <p class="offer-price">${currency(999)}</p>
          <p>Dealer quote collection, negotiation, and side-by-side recommendation.</p>
          <small>Best for buyers who want full execution without dealer pressure.</small>
        </article>
        <article class="offer-card">
          <span>03 · WHITE GLOVE</span>
          <h4>Concierge Delivery</h4>
          <p class="offer-price">${currency(1499)}</p>
          <p>Full negotiation plus close coordination and paperwork walkthrough.</p>
          <small>Best for high-friction schedules and end-to-end support.</small>
        </article>
      </div>
      <p class="muted" style="margin-top:8px">
        Demonstration boundary: this page captures local demo leads only and does not send messages or create external records.
        Pricing and policy terms are proposals until finalized in signed service agreements.
      </p>
    </section>

    <section class="grid-3" style="margin-top:14px">
      <article class="card">
        <h3>Who this is for</h3>
        <p>Buyers who want data-backed leverage, cleaner deal structure, and less dealership friction.</p>
      </article>
      <article class="card">
        <h3>What we never fake</h3>
        <p>No fake approvals, no invented incentives, no implied legal authority, and no undocumented assumptions.</p>
      </article>
      <article class="card">
        <h3>What we do not do</h3>
        <p>No financing origination, no credit filing, no title transfer agency, no dealer licensing substitution.</p>
      </article>
    </section>

    <section class="card" style="margin-top:14px">
      <h3 id="websiteLeadForm">High-intent lead intake (demo)</h3>
      <p class="muted">
        Submit fictional test data to validate your website funnel. No external outbound action is triggered.
      </p>
      <form id="websiteLeadCaptureForm">
        <div class="form-row">
          <label>Name
            <input name="name" required placeholder="Taylor Example">
          </label>
          <label>Email
            <input name="email" type="email" required placeholder="taylor@example.test">
          </label>
        </div>
        <div class="form-row">
          <label>Phone
            <input name="phone" required placeholder="555-0123">
          </label>
          <label>Intent
            <select name="intent">
              <option value="Purchase" selected>Purchase</option>
              <option value="Lease">Lease</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label>Vehicle goal
            <input name="vehicleGoal" required placeholder="CPO midsize SUV under 40k miles">
          </label>
          <label>Timeline
            <input name="timeline" required placeholder="Within 2 weeks">
          </label>
        </div>
        <div class="form-row">
          <label>Budget (USD)
            <input name="budgetUSD" type="number" min="1" step="0.01" required value="32000">
          </label>
          <label>Target payment (optional monthly USD)
            <input name="targetMonthlyPayment" type="number" min="0" step="0.01" placeholder="620">
          </label>
        </div>
        <div class="form-row">
          <label>Package interest
            <select name="packageInterest">
              <option>Strategic Buy Plan</option>
              <option selected>Full Negotiation</option>
              <option>Concierge Delivery</option>
            </select>
          </label>
          <label>Lead source
            <select name="source">
              <option>Website</option>
              <option>Referral</option>
              <option>Instagram</option>
              <option>Google Search</option>
              <option>Outbound</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label>After capture
            <select name="postCaptureAction">
              <option value="stay" selected>Stay on Website tab</option>
              <option value="marketing">Open Marketing tab</option>
              <option value="cases">Open Case workspace tab</option>
              <option value="desk">Open Lease Desk tab</option>
            </select>
          </label>
          <label class="check-row" style="margin-top:24px">
            <input type="checkbox" name="openDeskEstimate">
            Prefill Lease Desk assumptions from this lead
          </label>
        </div>
        <label>Notes
          <textarea name="notes" placeholder="Any special requirements, trade-in details, or constraints."></textarea>
        </label>
        <label class="check-row">
          <input type="checkbox" name="createCase" checked>
          Also create an internal demo case immediately
        </label>
        <button class="primary-btn" type="submit">Capture demo lead</button>
      </form>
    </section>

    <section class="card" style="margin-top:14px">
      <h3>Recent lead flow</h3>
      <p class="muted">${leads.length} local demo lead(s) tracked.</p>
      ${
        leads.length
          ? `<div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Name</th>
                <th>Intent</th>
                <th>Goal</th>
                <th>Budget</th>
                <th>Target / mo</th>
                <th>Source</th>
                <th>Package</th>
                <th>Linked case</th>
                <th>Status</th>
                <th>Action</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${leads
                .slice()
                .reverse()
                .slice(0, 8)
                .map(
                  (lead) => {
                    const linkedCase = linkedCaseForLead(lead.id, state.cases);
                    return `
                <tr>
                  <td>${esc(lead.id)}</td>
                  <td>${esc(lead.name)}</td>
                  <td>${esc(lead.intent || "Purchase")}</td>
                  <td>${esc(lead.vehicleGoal)}</td>
                  <td>${currency(lead.budgetUSD)}</td>
                  <td>${lead.targetMonthlyPayment ? currency(lead.targetMonthlyPayment) : "—"}</td>
                  <td>${esc(lead.source)}</td>
                  <td>${esc(lead.packageInterest)}</td>
                  <td>${linkedCase ? esc(linkedCase.id) : '<span class="muted">Not yet</span>'}</td>
                  <td>${esc(lead.status || "New")}</td>
                  <td>
                    <div class="lead-action-stack">
                      ${
                        linkedCase
                          ? `<button type="button" class="secondary-btn" data-open-case-id="${esc(linkedCase.id)}">Open case</button>`
                          : `<button type="button" class="secondary-btn" data-website-lead-case="${esc(lead.id)}">Create case</button>`
                      }
                      <button type="button" class="secondary-btn" data-website-lead-desk="${esc(lead.id)}">Desk estimate</button>
                    </div>
                  </td>
                  <td>${esc(new Date(lead.createdAt).toLocaleDateString())}</td>
                </tr>
              `
                  }
                )
                .join("")}
            </tbody>
          </table>
        </div>`
          : `<p class="muted">No leads captured yet.</p>`
      }
    </section>
  `;
}

function renderMarketing() {
  const snapshot = calculateMarketingSnapshot(state.marketing?.funnelInputs || {});
  const assumptions = snapshot.assumptions;
  const metrics = snapshot.metrics;
  const planRows = state.marketing?.channelPlan || [];
  const leads = state.marketingLeads || [];
  const bookedWidth = Math.max(6, Math.min(100, metrics.bookedRate));
  const signedWidth = Math.max(4, Math.min(100, metrics.closeRateFromLeads));
  return `
    <h2>Marketing engine and growth controls</h2>
    <p class="lead">
      Practical marketing stack for demand generation, lead quality, and conversion tracking.
      Targets are planning assumptions and must not be represented as achieved results unless evidenced.
    </p>

    <section class="funnel-card">
      <div class="funnel-head">
        <h3>Acquisition funnel pulse</h3>
        <span>Flagship offer: ${esc(state.marketing.flagshipOffer || "Full Negotiation")}</span>
      </div>
      <div class="funnel-rows">
        <div class="funnel-row">
          <strong>Leads (${assumptions.leads})</strong>
          <div class="funnel-bar"><span style="width:100%"></span></div>
        </div>
        <div class="funnel-row">
          <strong>Booked calls (${assumptions.bookedCalls})</strong>
          <div class="funnel-bar"><span style="width:${bookedWidth}%"></span></div>
        </div>
        <div class="funnel-row">
          <strong>Signed clients (${assumptions.signedClients})</strong>
          <div class="funnel-bar"><span style="width:${signedWidth}%"></span></div>
        </div>
      </div>
      <p class="muted">Funnel bars are based on editable assumptions and are for planning only.</p>
    </section>

    <div class="grid-3" style="margin-top:12px">
      ${kpi("Leads", assumptions.leads)}
      ${kpi("Booked calls", assumptions.bookedCalls)}
      ${kpi("Signed clients", assumptions.signedClients)}
      ${kpi("Book rate", `${metrics.bookedRate}%`)}
      ${kpi("Close rate (calls)", `${metrics.closeRateFromCalls}%`)}
      ${kpi("Close rate (leads)", `${metrics.closeRateFromLeads}%`)}
      ${kpi("CPL", currency(metrics.cpl))}
      ${kpi("CAC", currency(metrics.cac))}
      ${kpi("Gross collections", currency(metrics.grossCollections))}
      ${kpi("Refunds", currency(assumptions.refundsIssued))}
      ${kpi("Net after refunds", currency(metrics.netAfterRefunds))}
      ${kpi("Referral leads", assumptions.referralLeads)}
    </div>

    <section class="card" style="margin-top:14px">
      <h3>Editable funnel assumptions</h3>
      <form id="marketingFunnelForm">
        <div class="grid-3">
          <label>Ad spend (USD)
            <input name="adSpend" type="number" min="0" step="0.01" value="${esc(assumptions.adSpend)}">
          </label>
          <label>Total leads
            <input name="leads" type="number" min="0" step="1" value="${esc(assumptions.leads)}">
          </label>
          <label>Booked calls
            <input name="bookedCalls" type="number" min="0" step="1" value="${esc(assumptions.bookedCalls)}">
          </label>
          <label>Signed clients
            <input name="signedClients" type="number" min="0" step="1" value="${esc(assumptions.signedClients)}">
          </label>
          <label>Average fee collected (USD)
            <input name="avgFeeCollected" type="number" min="0" step="0.01" value="${esc(assumptions.avgFeeCollected)}">
          </label>
          <label>Refunds issued (USD)
            <input name="refundsIssued" type="number" min="0" step="0.01" value="${esc(assumptions.refundsIssued)}">
          </label>
          <label>Referral leads
            <input name="referralLeads" type="number" min="0" step="1" value="${esc(assumptions.referralLeads)}">
          </label>
          <label>Outbound leads
            <input name="outboundLeads" type="number" min="0" step="1" value="${esc(assumptions.outboundLeads)}">
          </label>
          <label>Flagship offer
            <select name="flagshipOffer">
              <option ${state.marketing.flagshipOffer === "Strategic Buy Plan" ? "selected" : ""}>Strategic Buy Plan</option>
              <option ${state.marketing.flagshipOffer === "Full Negotiation" ? "selected" : ""}>Full Negotiation</option>
              <option ${state.marketing.flagshipOffer === "Concierge Delivery" ? "selected" : ""}>Concierge Delivery</option>
            </select>
          </label>
        </div>
      </form>
      <p class="muted">
        Paid leads estimate: ${assumptions.paidLeads}. Organic/non-paid leads estimate: ${assumptions.organicLeads}.
      </p>
    </section>

    <section class="card" style="margin-top:14px">
      <h3>Lead pipeline control</h3>
      ${
        leads.length
          ? `<div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Intent</th>
                <th>Goal</th>
                <th>Source</th>
                <th>Package</th>
                <th>Linked case</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${leads
                .slice()
                .reverse()
                .slice(0, 12)
                .map(
                  (lead) => {
                    const linkedCase = linkedCaseForLead(lead.id, state.cases);
                    return `
                <tr>
                  <td><strong>${esc(lead.name)}</strong><br><small>${esc(lead.id)}</small></td>
                  <td>${esc(lead.intent || "Purchase")}${lead.targetMonthlyPayment ? `<br><small>${currency(lead.targetMonthlyPayment)} / mo target</small>` : ""}</td>
                  <td>${esc(lead.vehicleGoal)}</td>
                  <td>${esc(lead.source)}</td>
                  <td>${esc(lead.packageInterest)}</td>
                  <td>${linkedCase ? esc(linkedCase.id) : '<span class="muted">Not yet</span>'}</td>
                  <td>
                    <select data-lead-status="${esc(lead.id)}">
                      ${LEAD_STATUSES.map((status) => `<option value="${esc(status)}" ${lead.status === status ? "selected" : ""}>${esc(status)}</option>`).join("")}
                    </select>
                  </td>
                  <td>
                    <div class="lead-action-stack">
                      ${
                        linkedCase
                          ? `<button type="button" class="secondary-btn" data-open-case-id="${esc(linkedCase.id)}">Open case</button>`
                          : `<button type="button" class="secondary-btn" data-lead-to-case="${esc(lead.id)}">Create case</button>`
                      }
                      <button type="button" class="secondary-btn" data-lead-to-desk="${esc(lead.id)}">Desk lease</button>
                    </div>
                  </td>
                </tr>
              `
                  }
                )
                .join("")}
            </tbody>
          </table>
        </div>`
          : `<p class="muted">No leads in pipeline yet. Capture leads from the Website tab.</p>`
      }
    </section>

    <section class="card" style="margin-top:14px">
      <h3>Channel execution board</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Offer angle</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            ${planRows
              .map(
                (row) => `
              <tr>
                <td>${esc(row.channel)}</td>
                <td>${esc(row.offer)}</td>
                <td><span class="status-tag ${statusClass(row.status)}">${esc(row.status)}</span></td>
                <td>${esc(row.owner)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="grid-2" style="margin-top:14px">
      <article class="card">
        <h3>Message stack</h3>
        <ul>
          <li><strong>Core promise:</strong> documented, transparent vehicle negotiation support.</li>
          <li><strong>Proof angle:</strong> side-by-side quote normalization and assumption clarity.</li>
          <li><strong>Risk reducer:</strong> no hidden incentives and explicit fee disclosure.</li>
          <li><strong>Call to action:</strong> strategy intake call for target vehicle profile.</li>
        </ul>
      </article>
      <article class="card">
        <h3>30-day campaign cadence (proposal)</h3>
        <ul>
          <li>Week 1: local authority content + referral outreach setup</li>
          <li>Week 2: lead magnet launch and consult call follow-up scripts</li>
          <li>Week 3: negotiation case-study style posts (fictional/demo-labeled)</li>
          <li>Week 4: conversion optimization on intake and package framing</li>
        </ul>
      </article>
    </section>

    <div class="warning-box">
      Marketing content must not claim guaranteed savings, guaranteed approvals, or live brokerage authority without verified external approvals.
    </div>
  `;
}

function renderLeaseDesk() {
  const profiles = state.desking?.lenderProfiles || [];
  const selectedProfileId = state.desking?.selectedProfileId || "";
  const selectedProgramId = state.desking?.selectedProgramId || "";
  const { profile: selectedProfile, program: selectedProgram } = findLeaseProgram(
    selectedProfileId,
    selectedProgramId,
    profiles
  );
  const deskInputs = {
    ...(state.desking?.inputs || {}),
    programName: selectedProgram?.label || "",
    programTierBuyRates: selectedProgram?.tierBuyRates || null,
  };
  const deskReport = calculateLeaseDesk(deskInputs, state.desking?.tiers || []);
  const scenarios = leaseTierScenarios(deskInputs, state.desking?.tiers || []);
  const assumptions = deskReport.assumptions;
  const totals = deskReport.totals;
  const selectedTier = deskReport.selectedTier;
  const importCaseId = state.desking?.selectedImportCaseId || state.cases?.[0]?.id || "";
  const blendedMonthly =
    assumptions.termMonths > 0 ? totals.leaseTotal / Math.max(1, assumptions.termMonths) : 0;
  const upfrontSharePct = totals.leaseTotal > 0 ? (totals.driveOff / totals.leaseTotal) * 100 : 0;

  return `
    <h2>Personal Lease Desk</h2>
    <p class="lead">
      Internal desking calculator for residual, money factor, and credit tiers.
      Use this for estimate modeling only — confirm lender program sheets and taxable rules before quoting clients.
    </p>
    <div class="warning-box">
      Demo boundaries: this tool does not submit deals, pull credit, or represent lender approval. Values are internal planning outputs only.
    </div>

    <section class="card" style="margin-top:14px">
      <h3>Fast import from internal case</h3>
      <p class="muted">Use an existing case to prefill desking assumptions before quote review.</p>
      <div class="form-row">
        <label>Case source
          <select id="deskCaseImportSelect">
            ${state.cases
              .map(
                (item) =>
                  `<option value="${esc(item.id)}" ${item.id === importCaseId ? "selected" : ""}>${esc(item.id)} · ${esc(item.customer?.name || "Unknown")} · ${esc(item.request?.intent || "Purchase")}</option>`
              )
              .join("")}
          </select>
        </label>
        <div class="desk-actions">
          <button type="button" class="secondary-btn" id="deskImportCase">Apply case assumptions</button>
          <button type="button" class="secondary-btn" id="deskOpenCase">Open selected case</button>
        </div>
      </div>
    </section>

    <section class="card" style="margin-top:14px">
      <h3>Lender profile and program presets</h3>
      <p class="muted">Select a lender profile and program to prefill term/mileage/residual/acquisition assumptions and tier buy-rate references.</p>
      <div class="grid-3">
        <label>Lender profile
          <select id="deskLenderProfile">
            ${profiles
              .map(
                (profile) =>
                  `<option value="${esc(profile.id)}" ${profile.id === selectedProfileId ? "selected" : ""}>${esc(profile.name)} (${esc(profile.region || "Region N/A")})</option>`
              )
              .join("")}
          </select>
        </label>
        <label>Lender program
          <select id="deskLenderProgram">
            ${(selectedProfile?.programs || [])
              .map(
                (program) =>
                  `<option value="${esc(program.id)}" ${program.id === selectedProgramId ? "selected" : ""}>${esc(program.label)}</option>`
              )
              .join("")}
          </select>
        </label>
        <div class="desk-actions">
          <button type="button" class="secondary-btn" id="deskApplyProgram">Apply program preset</button>
          <button type="button" class="primary-btn" id="deskPrintSheet">Print desk sheet</button>
        </div>
      </div>
      ${
        selectedProgram
          ? `<p class="muted" style="margin-top:8px"><strong>Program notes:</strong> ${esc(selectedProgram.notes || "No notes")} · Buy-rate source for active tier: ${esc(assumptions.mfSource)}</p>`
          : `<p class="muted" style="margin-top:8px">No program selected. Tier matrix rates will drive buy-rate MF.</p>`
      }
    </section>

    <section class="card" style="margin-top:14px">
      <h3>Lease deal assumptions</h3>
      <form id="leaseDeskForm">
        <div class="grid-3">
          <label>Credit score
            <input name="creditScore" type="number" min="300" max="850" step="1" value="${esc(state.desking.inputs.creditScore)}">
          </label>
          <label>MSRP (USD)
            <input name="msrp" type="number" min="0" step="0.01" value="${esc(state.desking.inputs.msrp)}">
          </label>
          <label>Selling price (USD)
            <input name="sellingPrice" type="number" min="0" step="0.01" value="${esc(state.desking.inputs.sellingPrice)}">
          </label>
          <label>Incentives / rebates (USD)
            <input name="incentives" type="number" min="0" step="0.01" value="${esc(state.desking.inputs.incentives)}">
          </label>
          <label>Cap reduction (USD)
            <input name="capReduction" type="number" min="0" step="0.01" value="${esc(state.desking.inputs.capReduction)}">
          </label>
          <label>Acquisition fee (USD)
            <input name="acquisitionFee" type="number" min="0" step="0.01" value="${esc(state.desking.inputs.acquisitionFee)}">
          </label>
          <label>Doc fee (USD)
            <input name="docFee" type="number" min="0" step="0.01" value="${esc(state.desking.inputs.docFee)}">
          </label>
          <label>Registration fee (USD)
            <input name="registrationFee" type="number" min="0" step="0.01" value="${esc(state.desking.inputs.registrationFee)}">
          </label>
          <label>Term (months)
            <input name="termMonths" type="number" min="1" step="1" value="${esc(state.desking.inputs.termMonths)}">
          </label>
          <label>Annual mileage
            <input name="annualMileage" type="number" min="1" step="1" value="${esc(state.desking.inputs.annualMileage)}">
          </label>
          <label>Base residual (%)
            <input name="baseResidualPct" type="number" min="1" max="95" step="0.1" value="${esc(state.desking.inputs.baseResidualPct)}">
          </label>
          <label>Base buy-rate MF (active tier source)
            <input name="programBuyRateDisplay" value="${esc(assumptions.buyRateMF.toFixed(5))}" readonly>
          </label>
          <label>MF markup (decimal)
            <input name="mfMarkup" type="number" min="0" step="0.00001" value="${esc(state.desking.inputs.mfMarkup)}">
          </label>
          <label>Sales tax rate (%)
            <input name="salesTaxRatePct" type="number" min="0" max="20" step="0.001" value="${esc(state.desking.inputs.salesTaxRatePct)}">
          </label>
        </div>
        <div class="form-row">
          <label class="check-row">
            <input type="checkbox" name="rollFeesIntoLease" ${state.desking.inputs.rollFeesIntoLease ? "checked" : ""}>
            Roll fees into lease cap cost
          </label>
          <label class="check-row">
            <input type="checkbox" name="taxOnMonthlyPayment" ${state.desking.inputs.taxOnMonthlyPayment ? "checked" : ""}>
            Tax collected on monthly payment
          </label>
        </div>
        <label class="check-row">
          <input type="checkbox" name="firstPaymentDueAtSigning" ${state.desking.inputs.firstPaymentDueAtSigning ? "checked" : ""}>
          First payment due at signing
        </label>
      </form>
    </section>

    <section class="card" style="margin-top:14px">
      <h3>Tier matrix editor</h3>
      <p class="muted">Set buy-rate money factor and residual adjustment by score tier.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Minimum score</th>
              <th>Buy-rate MF</th>
              <th>Residual adjustment (%)</th>
            </tr>
          </thead>
          <tbody>
            ${deskReport.tiers
              .slice()
              .sort((a, b) => Number(b.minScore) - Number(a.minScore))
              .map(
                (tier) => `
              <tr>
                <td><strong>${esc(tier.name)}</strong>${selectedTier?.id === tier.id ? ' <span class="ok">(active)</span>' : ''}</td>
                <td><input data-tier-id="${esc(tier.id)}" data-tier-field="minScore" type="number" min="0" max="850" step="1" value="${esc(tier.minScore)}"></td>
                <td><input data-tier-id="${esc(tier.id)}" data-tier-field="buyRateMF" type="number" min="0" step="0.00001" value="${esc(tier.buyRateMF)}"></td>
                <td><input data-tier-id="${esc(tier.id)}" data-tier-field="residualAdjPct" type="number" step="0.1" value="${esc(tier.residualAdjPct)}"></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="kpi-grid" style="margin-top:14px">
      ${kpi("Active tier", selectedTier ? `${selectedTier.name} (>=${selectedTier.minScore})` : "N/A")}
      ${kpi("Residual value", currency(totals.residualValue))}
      ${kpi("Adjusted cap cost", currency(totals.adjustedCapCost))}
      ${kpi("Buy-rate source", assumptions.mfSource)}
      ${kpi("Money factor", assumptions.moneyFactor.toFixed(5))}
      ${kpi("APR estimate", `${totals.aprEstimatePct.toFixed(2)}%`)}
      ${kpi("Base monthly", currency(totals.baseMonthly))}
      ${kpi("Tax / month", currency(totals.monthlyTax))}
      ${kpi("Monthly payment", currency(totals.monthlyPayment))}
      ${kpi("Drive-off due", currency(totals.driveOff))}
      ${kpi("Blended monthly (total ÷ term)", currency(blendedMonthly))}
      ${kpi("Upfront share of total", `${upfrontSharePct.toFixed(1)}%`)}
      ${kpi("Lease total cost", currency(totals.leaseTotal))}
      ${kpi("Allowed miles", totals.totalAllowedMiles.toLocaleString())}
      ${kpi("Effective cost / mile", currency(totals.effectiveCostPerMile))}
    </section>

    <section class="card" style="margin-top:14px">
      <h3>Tier scenario comparison</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Min score</th>
              <th>MF used</th>
              <th>APR estimate</th>
              <th>Residual value</th>
              <th>Monthly payment</th>
              <th>Drive-off</th>
            </tr>
          </thead>
          <tbody>
            ${scenarios
              .map(
                (row) => `
              <tr>
                <td>${esc(row.tier.name)}${selectedTier?.id === row.tier.id ? ' <span class="ok">(active)</span>' : ''}</td>
                <td>${row.tier.minScore}</td>
                <td>${row.moneyFactor.toFixed(5)}</td>
                <td>${row.aprEstimatePct.toFixed(2)}%</td>
                <td>${currency(row.residualValue)}</td>
                <td>${currency(row.monthlyPayment)}</td>
                <td>${currency(row.driveOff)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>

    ${
      deskReport.warnings.length
        ? `<div class="warning-box" style="margin-top:14px"><strong>Desk warnings:</strong><ul>${deskReport.warnings.map((warning) => `<li>${esc(warning)}</li>`).join("")}</ul></div>`
        : ""
    }
    <p class="muted" style="margin-top:12px">
      Formula highlights: depreciation = (adjusted cap − residual) / term; rent charge = (adjusted cap + residual) × money factor;
      monthly payment = base payment + tax method output.
    </p>
  `;
}

function renderCustomerDemo() {
  const defaults = state.customerIntakeDefaults;
  return `
    <h2>Customer-facing demonstration</h2>
    <p class="lead">
      IKE Automotive Group is presented here as a proposed fee-based vehicle negotiation service.
      This page explains the offering and captures intake for local demo case creation only.
    </p>

    <div class="grid-3" aria-label="Proposed package options">
      <article class="card">
        <h3>Strategic Buy Plan</h3>
        <p><strong>$399 proposed flat fee</strong></p>
        <p>Market brief, target trim strategy, dealer shortlist, and negotiation prep.</p>
      </article>
      <article class="card">
        <h3>Full Negotiation</h3>
        <p><strong>$999 proposed flat fee</strong></p>
        <p>Quote collection, deal negotiation, and side-by-side recommendation.</p>
      </article>
      <article class="card">
        <h3>Concierge Delivery</h3>
        <p><strong>$1,499 proposed flat fee</strong></p>
        <p>Full negotiation plus paperwork walkthrough and delivery coordination.</p>
      </article>
    </div>

    <div class="warning-box">
      Proposed prices and packages are planning assumptions, not approved final commercial terms.
      Cancellation/refund policy remains unresolved and must be set in signed agreements.
    </div>

    <div class="grid-2">
      <section class="card">
        <h3>How the service works</h3>
        <ol>
          <li>Client intake and budget/profile alignment</li>
          <li>Dealer quote collection and normalization</li>
          <li>Negotiation and recommendation package</li>
          <li>Client decision support and optional close coordination</li>
        </ol>
        <p class="muted">
          Exclusions: no financing origination, no credit submission, no signing authority, no dealer payouts, no custody of vehicle funds.
        </p>
      </section>
      <section class="card faq" aria-labelledby="faq-title">
        <h3 id="faq-title">FAQ (demo language)</h3>
        <details>
          <summary>When is the brokerage fee due?</summary>
          <p>Proposed timing only. Final fee timing must be defined in signed service terms.</p>
        </details>
        <details>
          <summary>Are cancellation or refunds guaranteed?</summary>
          <p>No guarantee is implied in this demo. Cancellation and refund terms are unresolved pending final policy.</p>
        </details>
        <details>
          <summary>Who sells the vehicle?</summary>
          <p>The licensed dealer sells the vehicle. IAG proposes negotiation services and recommendation support.</p>
        </details>
        <details>
          <summary>How is compensation disclosed?</summary>
          <p>Compensation method must be explicitly disclosed in writing before launch (buyer-paid, dealer-paid, or hybrid).</p>
        </details>
      </section>
    </div>

    <section class="card" style="margin-top:14px">
      <h3>Demo intake form</h3>
      <p class="muted">Submitting creates a local demo case only. No external message is sent.</p>
      <form id="intakeForm">
        <div class="form-row">
          <label>Customer name
            <input name="name" required value="${esc(defaults.name)}" autocomplete="name">
          </label>
          <label>Email (fictional demo value)
            <input name="email" type="email" required value="${esc(defaults.email)}" autocomplete="email">
          </label>
        </div>
        <div class="form-row">
          <label>Phone
            <input name="phone" required value="${esc(defaults.phone)}">
          </label>
          <label>Intent
            <select name="intent">
              <option value="Purchase" ${defaults.intent === "Purchase" ? "selected" : ""}>Purchase</option>
              <option value="Lease" ${defaults.intent === "Lease" ? "selected" : ""}>Lease</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label>Vehicle budget (USD)
            <input name="budgetUSD" type="number" min="1" step="0.01" required value="${esc(defaults.budgetUSD)}">
          </label>
          <label>Proposed brokerage fee (USD)
            <input name="proposedFee" type="number" min="0" step="0.01" required value="${esc(defaults.proposedFee)}">
          </label>
        </div>
        <label>Vehicle preferences
          <textarea name="preferences" required>${esc(defaults.preferences)}</textarea>
        </label>
        <div class="form-row">
          <label>Timeframe
            <input name="timeframe" required value="${esc(defaults.timeframe)}">
          </label>
          <label>Default case owner
            <input name="owner" value="Founder">
          </label>
        </div>
        <label class="check-row">
          <input name="tradeIn" type="checkbox" ${defaults.tradeIn ? "checked" : ""}>
          Trade-in involved
        </label>
        <button class="primary-btn" type="submit">Create demo case</button>
      </form>
    </section>
  `;
}

function renderCaseWorkspace() {
  const query = state.ui.caseSearch || "";
  const statusFilter = state.ui.caseStatusFilter || "";
  const ownerFilter = state.ui.caseOwnerFilter || "";
  const selected = selectedCase();
  const owners = [...new Set(state.cases.map((item) => item.owner))].sort();
  const filtered = state.cases.filter((item) => {
    const text = [
      item.id,
      item.customer?.name,
      item.customer?.email,
      item.request?.vehiclePreferences,
      item.nextAction,
      item.owner,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!statusFilter || item.status === statusFilter) &&
      (!ownerFilter || item.owner === ownerFilter) &&
      (!query || text.includes(query.toLowerCase()))
    );
  });
  const compared = selected ? buildQuoteComparison(selected.dealerQuotes) : [];

  return `
    <h2>Internal case workspace</h2>
    <p class="lead">
      Manage demo cases, update operational status, track next actions, compare fictional dealer quotes, and preserve an auditable activity trail.
    </p>
    <div class="warning-box">
      No automatic dealer outreach, customer messaging, credit checks, signatures, deposits, or payments are performed from this workspace.
    </div>
    <div class="workspace-grid">
      <aside class="sidebar-panel">
        <label>Search cases
          <input id="caseSearch" type="search" value="${esc(query)}" placeholder="Search by name, ID, owner, preference">
        </label>
        <div class="form-row" style="margin-top:8px">
          <label>Status filter
            <select id="caseStatusFilter">
              <option value="">All statuses</option>
              ${CASE_STATUSES.map((status) => `<option value="${esc(status)}" ${statusFilter === status ? "selected" : ""}>${esc(status)}</option>`).join("")}
            </select>
          </label>
          <label>Owner filter
            <select id="caseOwnerFilter">
              <option value="">All owners</option>
              ${owners.map((owner) => `<option value="${esc(owner)}" ${ownerFilter === owner ? "selected" : ""}>${esc(owner)}</option>`).join("")}
            </select>
          </label>
        </div>
        <p class="muted" style="margin-top:8px">Showing ${filtered.length} of ${state.cases.length} cases</p>
        <div class="case-list">
          ${
            filtered.length
              ? filtered
                  .map(
                    (item) => `
                <button type="button" class="case-item ${selected?.id === item.id ? "active" : ""}" data-case-id="${esc(item.id)}">
                  <strong>${esc(item.id)} · ${esc(item.customer.name)}</strong>
                  <small>${esc(item.status)} · ${esc(item.owner)}</small>
                </button>
              `
                  )
                  .join("")
              : `<p class="muted">No cases match this filter.</p>`
          }
        </div>
      </aside>

      <section class="detail-panel">
        ${
          selected
            ? `
          <div class="section-head">
            <h3>${esc(selected.id)} · ${esc(selected.customer.name)}</h3>
            <span class="pill">${esc(selected.status)}</span>
          </div>
          <p class="muted">${esc(selected.customer.email)} · ${esc(selected.customer.phone)}</p>
          <p><strong>Intent:</strong> ${esc(selected.request.intent)} · <strong>Budget:</strong> ${currency(selected.request.budgetUSD)} · <strong>Trade-in:</strong> ${selected.request.tradeIn ? "Yes" : "No"}</p>
          <p><strong>Preferences:</strong> ${esc(selected.request.vehiclePreferences)}</p>
          <p><strong>Timeframe:</strong> ${esc(selected.request.timeframe)}</p>

          <form id="caseCoreForm">
            <div class="form-row">
              <label>Owner
                <input name="owner" required value="${esc(selected.owner)}">
              </label>
              <label>Status
                <select name="status">
                  ${CASE_STATUSES.map((status) => `<option value="${esc(status)}" ${selected.status === status ? "selected" : ""}>${esc(status)}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="form-row">
              <label>Next action
                <input name="nextAction" required value="${esc(selected.nextAction)}">
              </label>
              <label>Due date
                <input name="dueDate" type="date" value="${esc(selected.dueDate || "")}">
              </label>
            </div>
            <label>Internal notes
              <textarea name="notes">${esc(selected.notes || "")}</textarea>
            </label>
            <div class="form-row">
              <label>Fee proposed (USD)
                <input name="feeProposed" type="number" min="0" step="0.01" value="${esc(selected.fees.proposed)}">
              </label>
              <label>Fee due (USD)
                <input name="feeDue" type="number" min="0" step="0.01" value="${esc(selected.fees.due)}">
              </label>
            </div>
            <div class="form-row">
              <label>Collected amount (USD)
                <input name="feeCollected" type="number" min="0" step="0.01" value="${esc(selected.fees.collected)}">
              </label>
              <label>Refunds issued (USD)
                <input name="feeRefunds" type="number" min="0" step="0.01" value="${esc(selected.fees.refunds)}">
              </label>
            </div>
            <label class="check-row">
              <input type="checkbox" name="completed" ${selected.completion.completed ? "checked" : ""}>
              Mark case complete (administrative status only)
            </label>
            <button type="submit" class="primary-btn">Save case updates</button>
          </form>

          <div class="section-head">
            <h3>Vehicle candidates</h3>
          </div>
          <form id="candidateForm">
            <div class="form-row">
              <label>Year / make / model
                <input name="label" required placeholder="2023 Honda CR-V EX">
              </label>
              <label>Trim or key spec
                <input name="trim" placeholder="CPO, AWD, safety package">
              </label>
            </div>
            <div class="form-row">
              <label>Mileage
                <input name="mileage" type="number" min="0" step="1" placeholder="28500">
              </label>
              <label>Target price (USD)
                <input name="targetPrice" type="number" min="0" step="0.01" placeholder="29800">
              </label>
            </div>
            <button class="secondary-btn" type="submit">Add candidate</button>
          </form>
          ${
            selected.vehicleCandidates.length
              ? `<ul>${selected.vehicleCandidates
                  .map(
                    (candidate) =>
                      `<li>${esc(candidate.label)}${candidate.trim ? ` · ${esc(candidate.trim)}` : ""}${candidate.mileage ? ` · ${esc(candidate.mileage)} miles` : ""}${candidate.targetPrice ? ` · target ${currency(candidate.targetPrice)}` : ""}</li>`
                  )
                  .join("")}</ul>`
              : `<p class="muted">No candidates added yet.</p>`
          }

          <div class="section-head">
            <h3>Dealer quote entry (fictional)</h3>
          </div>
          <form id="quoteForm">
            <div class="form-row">
              <label>Dealer name
                <input name="dealerName" required>
              </label>
              <label>Vehicle label
                <input name="vehicleLabel" required>
              </label>
            </div>
            <div class="form-row">
              <label>Term (months)
                <input name="termMonths" type="number" min="1" step="1">
              </label>
              <label>Mileage per year
                <input name="milesPerYear" type="number" min="1" step="1">
              </label>
            </div>
            <div class="form-row">
              <label>Vehicle price (USD)
                <input name="salePrice" type="number" min="0" step="0.01">
              </label>
              <label>Taxes (USD)
                <input name="taxes" type="number" min="0" step="0.01">
              </label>
            </div>
            <div class="form-row">
              <label>Fees (USD)
                <input name="fees" type="number" min="0" step="0.01">
              </label>
              <label>Down payment (USD)
                <input name="downPayment" type="number" min="0" step="0.01">
              </label>
            </div>
            <div class="form-row">
              <label>Monthly payment assumption (USD)
                <input name="monthlyPayment" type="number" min="0" step="0.01">
              </label>
              <label>As-of date
                <input name="asOfDate" type="date">
              </label>
            </div>
            <label>Payment assumption notes
              <input name="paymentAssumption" required placeholder="Assumes 72-month purchase with tier-1 credit">
            </label>
            <button class="secondary-btn" type="submit">Add fictional quote</button>
          </form>

          <div class="section-head">
            <h3>Quote comparison</h3>
            <span class="muted">Flags missing fields before recommendations</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dealer</th>
                  <th>Vehicle</th>
                  <th>Term</th>
                  <th>Mileage</th>
                  <th>Price</th>
                  <th>Taxes</th>
                  <th>Fees</th>
                  <th>Down</th>
                  <th>Monthly assumption</th>
                  <th>Drive-off estimate</th>
                  <th>Comparability</th>
                </tr>
              </thead>
              <tbody>
                ${
                  compared.length
                    ? compared
                        .map(
                          (quote) => `
                        <tr>
                          <td>${esc(quote.dealerName)}</td>
                          <td>${esc(quote.vehicleLabel)}</td>
                          <td>${quote.termMonths ?? "—"}</td>
                          <td>${quote.milesPerYear ?? "—"}</td>
                          <td>${quote.salePrice === null ? "—" : currency(quote.salePrice)}</td>
                          <td>${quote.taxes === null ? "—" : currency(quote.taxes)}</td>
                          <td>${quote.fees === null ? "—" : currency(quote.fees)}</td>
                          <td>${quote.downPayment === null ? "—" : currency(quote.downPayment)}</td>
                          <td>${quote.monthlyPayment === null ? "—" : currency(quote.monthlyPayment)}${quote.paymentAssumption ? `<br><small>${esc(quote.paymentAssumption)}</small>` : ""}</td>
                          <td>${quote.driveOffEstimate === null ? "—" : currency(quote.driveOffEstimate)}</td>
                          <td>${
                            quote.comparable
                              ? `<span class="ok">Comparable</span>`
                              : `<span class="flag">Incomplete: ${esc(quote.missing.join(", "))}</span>`
                          }</td>
                        </tr>
                      `
                        )
                        .join("")
                    : `<tr><td colspan="11">No quotes yet.</td></tr>`
                }
              </tbody>
            </table>
          </div>

          <div class="section-head">
            <h3>Activity history</h3>
            <button type="button" class="ghost-btn" id="addActivity">Add note</button>
          </div>
          ${
            selected.activity.length
              ? `<ol class="activity">${selected.activity
                  .map((entry) => `<li><strong>${esc(new Date(entry.at).toLocaleString())}</strong> — ${esc(entry.text)}</li>`)
                  .join("")}</ol>`
              : `<p class="muted">No activity recorded yet.</p>`
          }
        `
            : `<p class="muted">Create a case from the intake tab to begin.</p>`
        }
      </section>
    </div>
  `;
}

function renderEconomics() {
  const report = calculateEconomics(state.economics);
  const totals = report.totals;
  const assumptions = report.assumptions;
  const scenarios = arithmeticScenarios(assumptions.fee);
  return `
    <h2>Economics and capacity model</h2>
    <p class="lead">
      Editable planning model for fee collection, refunds, acquisition spend, operating costs, delivery labor, and owner draw.
      Revenue is only counted from paid brokerage fees.
    </p>
    <div class="warning-box">
      Arithmetic scenarios are planning aids, not earnings forecasts. Taxes and owner draws are shown separately and may require professional review.
    </div>

    <form id="economicsForm" style="margin-top:14px">
      <div class="grid-3">
        <label>Flagship fee (USD)
          <input name="flagshipFee" type="number" min="0" step="0.01" value="${esc(state.economics.flagshipFee)}">
        </label>
        <label>Paid cases / month
          <input name="paidCases" type="number" min="0" step="1" value="${esc(state.economics.paidCases)}">
        </label>
        <label>Unpaid cases / month
          <input name="unpaidCases" type="number" min="0" step="1" value="${esc(state.economics.unpaidCases)}">
        </label>
        <label>Refunded cases / month
          <input name="refundsCount" type="number" min="0" step="1" value="${esc(state.economics.refundsCount)}">
        </label>
        <label>Average refund (USD)
          <input name="averageRefund" type="number" min="0" step="0.01" value="${esc(state.economics.averageRefund)}">
        </label>
        <label>Acquisition spend (USD)
          <input name="acquisitionSpend" type="number" min="0" step="0.01" value="${esc(state.economics.acquisitionSpend)}">
        </label>
        <label>Payment cost % on collections
          <input name="paymentProcessingPercent" type="number" min="0" step="0.01" value="${esc(state.economics.paymentProcessingPercent)}">
        </label>
        <label>Payment flat fee per paid case (USD)
          <input name="paymentProcessingFlat" type="number" min="0" step="0.01" value="${esc(state.economics.paymentProcessingFlat)}">
        </label>
        <label>Other operating costs (USD)
          <input name="operatingCosts" type="number" min="0" step="0.01" value="${esc(state.economics.operatingCosts)}">
        </label>
        <label>Delivery hours per paid case
          <input name="deliveryHoursPerCase" type="number" min="0" step="0.25" value="${esc(state.economics.deliveryHoursPerCase)}">
        </label>
        <label>Sales/admin hours per month
          <input name="salesAdminHours" type="number" min="0" step="0.25" value="${esc(state.economics.salesAdminHours)}">
        </label>
        <label>Labor cost per hour (USD)
          <input name="laborCostPerHour" type="number" min="0" step="0.01" value="${esc(state.economics.laborCostPerHour)}">
        </label>
        <label>Owner draw (USD)
          <input name="ownerDraw" type="number" min="0" step="0.01" value="${esc(state.economics.ownerDraw)}">
        </label>
        <label>Estimated tax rate (%)
          <input name="taxRatePercent" type="number" min="0" step="0.01" value="${esc(state.economics.taxRatePercent)}">
        </label>
      </div>
      <label class="check-row">
        <input type="checkbox" name="laborCostIncludedInOperatingCosts" ${state.economics.laborCostIncludedInOperatingCosts ? "checked" : ""}>
        Operating costs already include labor (prevents double deduction)
      </label>
    </form>

    <div class="kpi-grid">
      ${kpi("Gross fee collections", currency(totals.grossCollections))}
      ${kpi("Refunds", currency(totals.refunds))}
      ${kpi("Net collections", currency(totals.netCollections))}
      ${kpi("Payment costs", currency(totals.paymentCosts))}
      ${kpi("Acquisition spend", currency(assumptions.acquisitionSpend))}
      ${kpi("Operating costs", currency(assumptions.opCosts))}
      ${kpi("Labor applied", currency(totals.laborCostApplied))}
      ${kpi("Pre-tax profit", currency(totals.preTaxProfit))}
      ${kpi("After owner draw", currency(totals.afterOwnerDraw))}
      ${kpi("Estimated taxes", currency(totals.estimatedTaxes))}
      ${kpi("Retained after tax", currency(totals.retainedAfterTax))}
      ${kpi("Monthly service hours", `${totals.serviceHours.toFixed(2)} h`)}
    </div>

    <div class="table-wrap" style="margin-top:14px">
      <table>
        <thead>
          <tr>
            <th>Paid cases in a month</th>
            <th>Gross fee collections</th>
          </tr>
        </thead>
        <tbody>
          ${scenarios
            .map(
              (row) => `
            <tr>
              <td>${row.paidCases}</td>
              <td>${currency(row.grossFeeCollections)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <p class="muted" style="margin-top:10px">
      Capacity formula: completed paid cases × delivery hours per case + sales/admin hours. Unpaid cases are not counted as collected cash.
      Vehicle purchase price is excluded from brokerage revenue.
    </p>
    ${
      report.notes.laborDoubleCountProtected
        ? `<p class="muted">Labor double-count protection is active: modeled labor is informational only because operating costs already include labor.</p>`
        : ""
    }
  `;
}

function kpi(label, value) {
  return `<div class="kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function renderReadiness() {
  return `
    <h2>Readiness evidence register</h2>
    <p class="lead">
      Every status must map to evidence metadata. Unknown items stay <strong>Unverified</strong>.
      No record here implies legal approval unless supported by applicable external authority.
    </p>
    <div class="warning-box">
      Historical documents support entity formation language and a dated standing certificate. They do not by themselves prove current operating authority, insurance, banking controls, security completion, or launch permission.
    </div>
    <div class="grid-2" style="margin-top:14px">
      ${state.readinessRegister
        .map(
          (item) => `
        <form class="card readiness-form" data-readiness-id="${esc(item.id)}">
          <div class="section-head">
            <h3>${esc(item.category)}</h3>
            <span class="status-tag ${statusClass(item.status)}">${esc(item.status)}</span>
          </div>
          <p>${esc(item.statement)}</p>
          <label>Status
            <select name="status">
              ${EVIDENCE_STATUSES.map((status) => `<option value="${esc(status)}" ${item.status === status ? "selected" : ""}>${esc(status)}</option>`).join("")}
            </select>
          </label>
          <label>Evidence reference (non-sensitive)
            <input name="evidenceReference" value="${esc(item.evidenceReference)}" placeholder="Document title, record id, or source summary">
          </label>
          <div class="form-row">
            <label>Evidence date
              <input name="evidenceDate" type="date" value="${esc(item.evidenceDate || "")}">
            </label>
            <label>Responsible person
              <input name="responsible" value="${esc(item.responsible)}">
            </label>
          </div>
          <label>Next action
            <textarea name="nextAction">${esc(item.nextAction)}</textarea>
          </label>
          <button class="secondary-btn" type="submit">Save evidence status</button>
        </form>
      `
        )
        .join("")}
    </div>
  `;
}

function renderMetrics() {
  return `
    <h2>Metrics definitions and dependency-based 90-day planning</h2>
    <p class="lead">
      These are proposed targets and operating definitions, not proven outcomes.
      Calendar expectations depend on approvals and external dependencies.
    </p>
    <div class="table-wrap" style="margin-top:14px">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Definition (denominator + meaning)</th>
            <th>Timing window</th>
          </tr>
        </thead>
        <tbody>
          ${state.metrics.definitions
            .map(
              (item) => `
            <tr>
              <td><strong>${esc(item.metric)}</strong></td>
              <td>${esc(item.definition)}</td>
              <td>${esc(item.timing)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="table-wrap" style="margin-top:14px">
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Depends on</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${state.metrics.dependencyPlan
            .map(
              (item) => `
            <tr>
              <td>${esc(item.milestone)}</td>
              <td>${esc(item.dependsOn)}</td>
              <td><span class="status-tag ${statusClass(item.status)}">${esc(item.status)}</span></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="warning-box">
      Prototype completion does not authorize paid brokerage launch.
      Live activity depends on an established permitted route, legal signoff, and documented controls.
    </div>
  `;
}

function bindCommon() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      clearFlash();
      mutate((next) => {
        next.ui.activeTab = button.dataset.tab;
      });
    });
  });

  document.getElementById("resetDemo")?.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Reset all local demo website leads, cases, readiness entries, and economics/marketing inputs?"
    );
    if (!confirmed) return;
    state = initialDemoState();
    saveState();
    setFlash("Demo data reset locally.", "ok");
    render();
  });
}

function bindView(tab) {
  if (tab === "website") bindWebsite();
  if (tab === "marketing") bindMarketing();
  if (tab === "desk") bindDesk();
  if (tab === "customer") bindCustomer();
  if (tab === "cases") bindCases();
  if (tab === "economics") bindEconomics();
  if (tab === "readiness") bindReadiness();
}

function bindWebsite() {
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.jump);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-route-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      mutate((next) => {
        next.ui.activeTab = button.dataset.routeTab;
      });
    });
  });

  document.querySelectorAll("[data-open-case-id]").forEach((button) => {
    button.addEventListener("click", () => {
      mutate((next) => {
        next.ui.activeTab = "cases";
        next.ui.selectedCaseId = button.dataset.openCaseId;
      });
    });
  });

  document.querySelectorAll("[data-website-lead-case]").forEach((button) => {
    button.addEventListener("click", () => {
      const leadId = button.dataset.websiteLeadCase;
      mutate((next) => {
        const lead = next.marketingLeads.find((item) => item.id === leadId);
        if (!lead) return;
        const existing = linkedCaseForLead(lead.id, next.cases);
        if (existing) {
          next.ui.activeTab = "cases";
          next.ui.selectedCaseId = existing.id;
          return;
        }
        const caseItem = buildCaseFromLead(lead, next.cases.length);
        next.cases.unshift(caseItem);
        next.ui.activeTab = "cases";
        next.ui.selectedCaseId = caseItem.id;
        lead.status = "Qualified";
      });
      setFlash("Lead converted and opened in Case workspace.", "ok");
    });
  });

  document.querySelectorAll("[data-website-lead-desk]").forEach((button) => {
    button.addEventListener("click", () => {
      const leadId = button.dataset.websiteLeadDesk;
      mutate((next) => {
        const lead = next.marketingLeads.find((item) => item.id === leadId);
        if (!lead) return;
        applyLeadToDeskState(next, lead);
        next.ui.activeTab = "desk";
      });
      setFlash("Lead assumptions moved into Lease Desk for estimate modeling.", "ok");
    });
  });

  const form = document.getElementById("websiteLeadCaptureForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = formDataObject(form);
    const createCase = !!form.querySelector('input[name="createCase"]').checked;
    const openDeskEstimate = !!form.querySelector('input[name="openDeskEstimate"]').checked;
    const postCaptureAction = values.postCaptureAction || "stay";
    const forceCase = postCaptureAction === "cases";
    mutate((next) => {
      const lead = createLeadFromWebsite(
        {
          ...values,
          budgetUSD: Number(values.budgetUSD || 0),
          targetMonthlyPayment: Number(values.targetMonthlyPayment || 0),
        },
        next.marketingLeads.length
      );
      next.marketingLeads.push(lead);

      const shouldCreateCase = createCase || forceCase;
      let caseItem = null;
      if (shouldCreateCase) {
        caseItem = buildCaseFromLead(lead, next.cases.length);
        next.cases.unshift(caseItem);
        next.ui.selectedCaseId = caseItem.id;
        lead.status = "Qualified";
      }

      if (openDeskEstimate || postCaptureAction === "desk") {
        applyLeadToDeskState(next, lead);
        next.ui.activeTab = "desk";
      } else if (postCaptureAction === "marketing") {
        next.ui.activeTab = "marketing";
      } else if (postCaptureAction === "cases" && caseItem) {
        next.ui.activeTab = "cases";
      } else {
        next.ui.activeTab = "website";
      }
    });
    const actionSummary =
      openDeskEstimate || postCaptureAction === "desk"
        ? "Lease Desk opened with prefilled assumptions."
        : postCaptureAction === "marketing"
          ? "Marketing pipeline opened."
          : postCaptureAction === "cases"
            ? "Case workspace opened."
            : "Lead saved on Website tab.";
    setFlash(
      (createCase || forceCase
        ? "Demo lead saved and internal case created. "
        : "Demo lead saved locally. ") +
        actionSummary +
        " No external message was sent.",
      "ok"
    );
  });
}

function bindCustomer() {
  const form = document.getElementById("intakeForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = formDataObject(form);
    mutate((next) => {
      next.customerIntakeDefaults = {
        ...next.customerIntakeDefaults,
        ...data,
        tradeIn: !!form.querySelector('input[name="tradeIn"]').checked,
      };
      const item = createCaseFromIntake(
        {
          ...data,
          budgetUSD: Number(data.budgetUSD),
          proposedFee: Number(data.proposedFee),
          tradeIn: !!form.querySelector('input[name="tradeIn"]').checked,
        },
        next.cases.length
      );
      next.cases.unshift(item);
      next.ui.activeTab = "cases";
      next.ui.selectedCaseId = item.id;
    });
    setFlash(
      "Demo case created locally. No external message, dealer outreach, or payment was sent.",
      "ok"
    );
  });
}

function bindCases() {
  document.getElementById("caseSearch")?.addEventListener("input", (event) => {
    mutate((next) => {
      next.ui.caseSearch = event.target.value;
    });
  });
  document.getElementById("caseStatusFilter")?.addEventListener("change", (event) => {
    mutate((next) => {
      next.ui.caseStatusFilter = event.target.value;
    });
  });
  document.getElementById("caseOwnerFilter")?.addEventListener("change", (event) => {
    mutate((next) => {
      next.ui.caseOwnerFilter = event.target.value;
    });
  });

  document.querySelectorAll("[data-case-id]").forEach((button) => {
    button.addEventListener("click", () => {
      mutate((next) => {
        next.ui.selectedCaseId = button.dataset.caseId;
      });
    });
  });

  const selected = selectedCase();
  if (!selected) return;

  const coreForm = document.getElementById("caseCoreForm");
  coreForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!coreForm.reportValidity()) return;
    const values = formDataObject(coreForm);
    mutate((next) => {
      const target = next.cases.find((item) => item.id === selected.id);
      if (!target) return;
      target.owner = values.owner;
      target.status = values.status;
      target.nextAction = values.nextAction;
      target.dueDate = values.dueDate || "";
      target.notes = values.notes || "";
      target.fees.proposed = Number(values.feeProposed || 0);
      target.fees.due = Number(values.feeDue || 0);
      target.fees.collected = Number(values.feeCollected || 0);
      target.fees.refunds = Number(values.feeRefunds || 0);
      const completed = !!coreForm.querySelector('input[name="completed"]').checked;
      target.completion.completed = completed;
      target.completion.completedAt = completed ? new Date().toISOString() : "";
      const updated = appendActivity(target, "Case core fields updated.");
      Object.assign(target, updated);
    });
    setFlash("Case updates saved.", "ok");
  });

  const candidateForm = document.getElementById("candidateForm");
  candidateForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!candidateForm.reportValidity()) return;
    const values = formDataObject(candidateForm);
    mutate((next) => {
      const target = next.cases.find((item) => item.id === selected.id);
      if (!target) return;
      target.vehicleCandidates.push({
        id: `C-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        label: values.label,
        trim: values.trim || "",
        mileage: values.mileage ? Number(values.mileage) : null,
        targetPrice: values.targetPrice ? Number(values.targetPrice) : null,
      });
      const updated = appendActivity(target, `Vehicle candidate added: ${values.label}`);
      Object.assign(target, updated);
    });
    setFlash("Vehicle candidate added.", "ok");
  });

  const quoteForm = document.getElementById("quoteForm");
  quoteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!quoteForm.reportValidity()) return;
    const values = formDataObject(quoteForm);
    mutate((next) => {
      const target = next.cases.find((item) => item.id === selected.id);
      if (!target) return;
      const quote = normalizeQuote(values);
      target.dealerQuotes.push(quote);
      const updated = appendActivity(
        target,
        `Fictional quote logged from ${quote.dealerName || "unknown dealer"}.`
      );
      Object.assign(target, updated);
    });
    setFlash("Fictional dealer quote added.", "ok");
  });

  document.getElementById("addActivity")?.addEventListener("click", () => {
    const text = window.prompt("Add an internal activity note:");
    if (!text || !text.trim()) return;
    mutate((next) => {
      const target = next.cases.find((item) => item.id === selected.id);
      if (!target) return;
      const updated = appendActivity(target, text.trim());
      Object.assign(target, updated);
    });
    setFlash("Activity note added.", "ok");
  });
}

function bindEconomics() {
  const form = document.getElementById("economicsForm");
  if (!form) return;
  form.addEventListener("input", () => {
    const values = formDataObject(form);
    mutate((next) => {
      next.economics = {
        ...next.economics,
        ...toNumberMap(values, [
          "flagshipFee",
          "paidCases",
          "unpaidCases",
          "refundsCount",
          "averageRefund",
          "acquisitionSpend",
          "paymentProcessingPercent",
          "paymentProcessingFlat",
          "operatingCosts",
          "deliveryHoursPerCase",
          "salesAdminHours",
          "laborCostPerHour",
          "ownerDraw",
          "taxRatePercent",
        ]),
        laborCostIncludedInOperatingCosts: !!form.querySelector(
          'input[name="laborCostIncludedInOperatingCosts"]'
        ).checked,
      };
    });
  });
}

function bindDesk() {
  const importSelect = document.getElementById("deskCaseImportSelect");
  const importButton = document.getElementById("deskImportCase");
  const openCaseButton = document.getElementById("deskOpenCase");
  const profileSelect = document.getElementById("deskLenderProfile");
  const programSelect = document.getElementById("deskLenderProgram");
  const applyProgramButton = document.getElementById("deskApplyProgram");
  const printButton = document.getElementById("deskPrintSheet");

  importSelect?.addEventListener("change", () => {
    mutate((next) => {
      next.desking.selectedImportCaseId = importSelect.value;
    });
  });

  importButton?.addEventListener("click", () => {
    mutate((next) => {
      const selectedId = next.desking.selectedImportCaseId || importSelect?.value;
      const item = next.cases.find((candidate) => candidate.id === selectedId);
      if (!item) return;
      const budget = Number(item.request?.budgetUSD || 0);
      const sellingPrice = Math.max(12000, Math.round((budget || next.desking.inputs.sellingPrice) / 100) * 100);
      const msrp = Math.round((sellingPrice * 1.08) / 100) * 100;
      const leaseIntent = item.request?.intent === "Lease";
      next.desking.inputs = {
        ...next.desking.inputs,
        msrp,
        sellingPrice,
        capReduction: item.request?.tradeIn ? 1000 : 0,
        termMonths: leaseIntent ? 36 : next.desking.inputs.termMonths,
        annualMileage: leaseIntent ? 12000 : next.desking.inputs.annualMileage,
        baseResidualPct: leaseIntent ? 61 : next.desking.inputs.baseResidualPct,
      };
      next.desking.selectedImportCaseId = item.id;
    });
    setFlash("Case assumptions applied to Lease Desk.", "ok");
  });

  openCaseButton?.addEventListener("click", () => {
    const selectedId = state.desking?.selectedImportCaseId || importSelect?.value;
    if (!selectedId) return;
    mutate((next) => {
      next.ui.activeTab = "cases";
      next.ui.selectedCaseId = selectedId;
    });
  });

  profileSelect?.addEventListener("change", () => {
    mutate((next) => {
      next.desking.selectedProfileId = profileSelect.value;
      const profile = (next.desking.lenderProfiles || []).find(
        (item) => item.id === profileSelect.value
      );
      next.desking.selectedProgramId = profile?.programs?.[0]?.id || "";
    });
  });

  programSelect?.addEventListener("change", () => {
    mutate((next) => {
      next.desking.selectedProgramId = programSelect.value;
    });
  });

  applyProgramButton?.addEventListener("click", () => {
    mutate((next) => {
      const { program } = findLeaseProgram(
        next.desking.selectedProfileId,
        next.desking.selectedProgramId,
        next.desking.lenderProfiles || []
      );
      if (!program) return;
      next.desking.inputs = {
        ...next.desking.inputs,
        termMonths: Number(program.termMonths) || next.desking.inputs.termMonths,
        annualMileage: Number(program.annualMileage) || next.desking.inputs.annualMileage,
        baseResidualPct: Number(program.residualPct) || next.desking.inputs.baseResidualPct,
        acquisitionFee: Number(program.acquisitionFee) || next.desking.inputs.acquisitionFee,
      };
    });
    setFlash("Lender program preset applied to desk assumptions.", "ok");
  });

  printButton?.addEventListener("click", () => {
    const inputs = {
      ...(state.desking?.inputs || {}),
      programTierBuyRates: (() => {
        const { program } = findLeaseProgram(
          state.desking?.selectedProfileId,
          state.desking?.selectedProgramId,
          state.desking?.lenderProfiles || []
        );
        return program?.tierBuyRates || null;
      })(),
    };
    const report = calculateLeaseDesk(inputs, state.desking?.tiers || []);
    const { profile, program } = findLeaseProgram(
      state.desking?.selectedProfileId,
      state.desking?.selectedProgramId,
      state.desking?.lenderProfiles || []
    );
    printDeskSheet(report, profile, program);
  });

  const form = document.getElementById("leaseDeskForm");
  if (form) {
    form.addEventListener("change", () => {
      const values = formDataObject(form);
      mutate((next) => {
        next.desking.inputs = {
          ...next.desking.inputs,
          ...toNumberMap(values, [
            "creditScore",
            "msrp",
            "sellingPrice",
            "incentives",
            "capReduction",
            "acquisitionFee",
            "docFee",
            "registrationFee",
            "termMonths",
            "annualMileage",
            "baseResidualPct",
            "mfMarkup",
            "salesTaxRatePct",
          ]),
          rollFeesIntoLease: !!form.querySelector('input[name="rollFeesIntoLease"]').checked,
          taxOnMonthlyPayment: !!form.querySelector('input[name="taxOnMonthlyPayment"]').checked,
          firstPaymentDueAtSigning: !!form.querySelector('input[name="firstPaymentDueAtSigning"]').checked,
        };
      });
    });
  }

  document.querySelectorAll("[data-tier-id][data-tier-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const tierId = input.dataset.tierId;
      const field = input.dataset.tierField;
      mutate((next) => {
        next.desking.tiers = next.desking.tiers.map((tier) => {
          if (tier.id !== tierId) return tier;
          const value =
            field === "minScore" || field === "buyRateMF" || field === "residualAdjPct"
              ? Number(input.value)
              : input.value;
          return {
            ...tier,
            [field]: value,
          };
        });
      });
    });
  });
}

function printDeskSheet(report, profile, program) {
  const win = window.open("", "_blank", "width=1024,height=900");
  if (!win) {
    setFlash("Pop-up blocked. Allow pop-ups to print the desk sheet.", "error");
    return;
  }
  const tier = report.selectedTier;
  win.document.write(`<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>IAG Lease Desk Sheet</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; color:#12243b; margin:24px; }
      h1 { margin:0; font-size:28px; letter-spacing:-0.03em; }
      h2 { margin:20px 0 8px; font-size:18px; }
      .muted { color:#4d5f79; }
      .row { display:flex; gap:14px; flex-wrap:wrap; margin-top:12px; }
      .kpi { border:1px solid #d6e0ed; border-radius:10px; padding:10px; min-width:180px; }
      .kpi span { display:block; font-size:12px; color:#5b6f89; }
      .kpi strong { font-size:20px; }
      table { width:100%; border-collapse:collapse; margin-top:8px; }
      th, td { border-bottom:1px solid #e7edf6; text-align:left; padding:7px; font-size:13px; }
      th { background:#f4f8ff; }
      .warn { border:1px solid #f0d8a8; background:#fff9ec; border-radius:10px; padding:10px; margin-top:16px; color:#6f5519;}
      @media print { body { margin: 12mm; } .noprint { display:none; } }
    </style>
  </head>
  <body>
    <h1>IKE Automotive Group — Lease Desk Sheet</h1>
    <p class="muted">Generated: ${new Date().toLocaleString()}</p>
    <p><strong>Lender:</strong> ${esc(profile?.name || "Not selected")} · <strong>Program:</strong> ${esc(program?.label || "Not selected")}</p>
    <p><strong>Active Tier:</strong> ${esc(tier?.name || "N/A")} (score >= ${esc(tier?.minScore ?? "N/A")})</p>

    <div class="row">
      <div class="kpi"><span>Monthly payment</span><strong>${currency(report.totals.monthlyPayment)}</strong></div>
      <div class="kpi"><span>Drive-off due</span><strong>${currency(report.totals.driveOff)}</strong></div>
      <div class="kpi"><span>Residual value</span><strong>${currency(report.totals.residualValue)}</strong></div>
      <div class="kpi"><span>Money factor</span><strong>${report.assumptions.moneyFactor.toFixed(5)}</strong></div>
      <div class="kpi"><span>APR estimate</span><strong>${report.totals.aprEstimatePct.toFixed(2)}%</strong></div>
    </div>

    <h2>Deal assumptions</h2>
    <table>
      <tbody>
        <tr><th>MSRP</th><td>${currency(report.assumptions.msrp)}</td><th>Selling price</th><td>${currency(report.assumptions.sellingPrice)}</td></tr>
        <tr><th>Incentives</th><td>${currency(report.assumptions.incentives)}</td><th>Cap reduction</th><td>${currency(report.assumptions.capReduction)}</td></tr>
        <tr><th>Term</th><td>${report.assumptions.termMonths} months</td><th>Annual mileage</th><td>${report.assumptions.annualMileage.toLocaleString()}</td></tr>
        <tr><th>Residual %</th><td>${report.assumptions.residualPct.toFixed(2)}%</td><th>Tax rate</th><td>${report.assumptions.taxRate.toFixed(3)}%</td></tr>
        <tr><th>Buy-rate source</th><td>${esc(report.assumptions.mfSource)}</td><th>Buy-rate MF</th><td>${report.assumptions.buyRateMF.toFixed(5)}</td></tr>
      </tbody>
    </table>

    <h2>Payment math</h2>
    <table>
      <tbody>
        <tr><th>Depreciation charge</th><td>${currency(report.totals.depreciationCharge)}</td><th>Rent charge</th><td>${currency(report.totals.rentCharge)}</td></tr>
        <tr><th>Base monthly</th><td>${currency(report.totals.baseMonthly)}</td><th>Tax / month</th><td>${currency(report.totals.monthlyTax)}</td></tr>
        <tr><th>Lease total</th><td>${currency(report.totals.leaseTotal)}</td><th>Cost per mile</th><td>${currency(report.totals.effectiveCostPerMile)}</td></tr>
      </tbody>
    </table>

    ${
      report.warnings.length
        ? `<div class="warn"><strong>Warnings:</strong><ul>${report.warnings.map((warning) => `<li>${esc(warning)}</li>`).join("")}</ul></div>`
        : ""
    }

    <p class="muted" style="margin-top:18px;">Internal estimate only. Not lender approval, not legal/financial advice, and not a customer contract.</p>
    <button class="noprint" onclick="window.print()">Print</button>
  </body></html>`);
  win.document.close();
}

function bindMarketing() {
  const form = document.getElementById("marketingFunnelForm");
  if (form) {
    form.addEventListener("input", () => {
      const values = formDataObject(form);
      mutate((next) => {
        next.marketing.funnelInputs = {
          ...next.marketing.funnelInputs,
          ...toNumberMap(values, [
            "adSpend",
            "leads",
            "bookedCalls",
            "signedClients",
            "avgFeeCollected",
            "refundsIssued",
            "referralLeads",
            "outboundLeads",
          ]),
        };
        next.marketing.flagshipOffer = values.flagshipOffer || "Full Negotiation";
      });
    });
  }

  document.querySelectorAll("[data-lead-status]").forEach((select) => {
    select.addEventListener("change", () => {
      const leadId = select.dataset.leadStatus;
      mutate((next) => {
        const lead = next.marketingLeads.find((item) => item.id === leadId);
        if (!lead) return;
        lead.status = select.value;
      });
      setFlash("Lead status updated.", "ok");
    });
  });

  document.querySelectorAll("[data-lead-to-case]").forEach((button) => {
    button.addEventListener("click", () => {
      const leadId = button.dataset.leadToCase;
      mutate((next) => {
        const lead = next.marketingLeads.find((item) => item.id === leadId);
        if (!lead) return;
        const existing = linkedCaseForLead(lead.id, next.cases);
        const item = existing || buildCaseFromLead(lead, next.cases.length);
        if (!existing) next.cases.unshift(item);
        next.ui.selectedCaseId = item.id;
        next.ui.activeTab = "cases";
        lead.status = "Qualified";
      });
      setFlash("Lead routed to Case workspace.", "ok");
    });
  });

  document.querySelectorAll("[data-lead-to-desk]").forEach((button) => {
    button.addEventListener("click", () => {
      const leadId = button.dataset.leadToDesk;
      mutate((next) => {
        const lead = next.marketingLeads.find((item) => item.id === leadId);
        if (!lead) return;
        applyLeadToDeskState(next, lead);
        next.ui.activeTab = "desk";
      });
      setFlash("Lead assumptions loaded into Lease Desk.", "ok");
    });
  });

  document.querySelectorAll("[data-open-case-id]").forEach((button) => {
    button.addEventListener("click", () => {
      mutate((next) => {
        next.ui.activeTab = "cases";
        next.ui.selectedCaseId = button.dataset.openCaseId;
      });
    });
  });
}

function bindReadiness() {
  document.querySelectorAll(".readiness-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = formDataObject(form);
      const id = form.dataset.readinessId;
      mutate((next) => {
        const item = next.readinessRegister.find((row) => row.id === id);
        if (!item) return;
        Object.assign(
          item,
          sanitizeReadinessItem({
            ...item,
            ...values,
          })
        );
      });
      setFlash("Readiness evidence item saved.", "ok");
    });
  });
}

function formDataObject(form) {
  return Object.fromEntries(new FormData(form));
}

function toNumberMap(values, keys) {
  const out = {};
  for (const key of keys) {
    out[key] = Number(values[key] ?? 0);
  }
  return out;
}

import {
  CASE_STATUSES,
  EVIDENCE_STATUSES,
  appendActivity,
  arithmeticScenarios,
  buildQuoteComparison,
  calculateMarketingSnapshot,
  calculateEconomics,
  createCaseFromIntake,
  createLeadFromWebsite,
  currency,
  initialDemoState,
  normalizeQuote,
  sanitizeReadinessItem,
} from "./model.mjs";

const STORAGE_KEY = "iag_brokerage_demo_v1";
const app = document.getElementById("app");

let state = loadState();
let flash = "";
let flashTone = "ok";

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
  if (tab === "cases") return renderCaseWorkspace();
  if (tab === "economics") return renderEconomics();
  if (tab === "readiness") return renderReadiness();
  if (tab === "metrics") return renderMetrics();
  return renderCustomerDemo();
}

function renderWebsite() {
  const leads = state.marketingLeads || [];
  return `
    <section class="site-hero">
      <div class="site-hero-copy">
        <p class="eyebrow">IKE AUTOMOTIVE GROUP LLC · PRE-LAUNCH DEMO</p>
        <h2>Professional car deal negotiation.<br><span>Built for buyer leverage.</span></h2>
        <p>
          We help clients secure cleaner vehicle terms through transparent dealer quote comparison and direct negotiation support.
          You keep decision control. We handle the negotiation pressure.
        </p>
        <div class="cta-row">
          <button type="button" class="primary-btn" data-jump="websiteLeadForm">Book a strategy intake</button>
          <button type="button" class="secondary-btn" data-jump="websitePackages">See service packages</button>
        </div>
        <p class="muted">
          Demonstration boundary: this page captures local demo leads only and does not send messages or create external records.
        </p>
      </div>
      <aside class="site-hero-panel">
        <h3>What clients get</h3>
        <ul>
          <li>Structured intake and target vehicle strategy</li>
          <li>Quote normalization across terms, mileage, fees, and assumptions</li>
          <li>Negotiation documentation and recommendation summary</li>
          <li>Clear fee disclosure language before engagement</li>
        </ul>
        <p class="muted">No guarantees, no hidden incentives, no custody of vehicle purchase funds.</p>
      </aside>
    </section>

    <section id="websitePackages" class="card" style="margin-top:14px">
      <h3>Proposed package lineup</h3>
      <div class="table-wrap" style="margin-top:10px">
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Proposed fee</th>
              <th>Delivery scope</th>
              <th>Best fit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Strategic Buy Plan</td>
              <td>${currency(399)}</td>
              <td>Market brief, trim targeting, and negotiation prep notes</td>
              <td>Self-directed buyers needing strategy support</td>
            </tr>
            <tr>
              <td>Full Negotiation</td>
              <td>${currency(999)}</td>
              <td>Dealer quote collection, negotiation, and side-by-side recommendation</td>
              <td>Buyers wanting full negotiation execution</td>
            </tr>
            <tr>
              <td>Concierge Delivery</td>
              <td>${currency(1499)}</td>
              <td>Full negotiation plus close coordination and paperwork walkthrough</td>
              <td>Clients wanting end-to-end support</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted" style="margin-top:8px">
        Pricing and policy terms are planning proposals until finalized in signed service agreements.
      </p>
    </section>

    <section class="grid-3" style="margin-top:14px">
      <article class="card">
        <h3>Who we serve</h3>
        <p>Buyers who want documented comparisons and less dealership friction.</p>
      </article>
      <article class="card">
        <h3>What we do not do</h3>
        <p>No financing origination, no credit filing, no title transfer agency, no dealer licensing substitution.</p>
      </article>
      <article class="card">
        <h3>Compensation clarity</h3>
        <p>Compensation model must be disclosed in writing before any engagement.</p>
      </article>
    </section>

    <section class="card" style="margin-top:14px">
      <h3 id="websiteLeadForm">Marketing lead intake (demo)</h3>
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
          <label>Vehicle goal
            <input name="vehicleGoal" required placeholder="CPO midsize SUV under 40k miles">
          </label>
        </div>
        <div class="form-row">
          <label>Budget (USD)
            <input name="budgetUSD" type="number" min="1" step="0.01" required value="32000">
          </label>
          <label>Timeline
            <input name="timeline" required placeholder="Within 2 weeks">
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
        <label>Notes
          <textarea name="notes" placeholder="Any special requirements, trade-in details, or constraints."></textarea>
        </label>
        <label class="check-row">
          <input type="checkbox" name="createCase">
          Also create an internal demo case immediately
        </label>
        <button class="primary-btn" type="submit">Save demo lead</button>
      </form>
    </section>

    <section class="card" style="margin-top:14px">
      <h3>Recent demo leads</h3>
      <p class="muted">${leads.length} local demo lead(s) tracked.</p>
      ${
        leads.length
          ? `<div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Name</th>
                <th>Goal</th>
                <th>Budget</th>
                <th>Source</th>
                <th>Package</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${leads
                .slice()
                .reverse()
                .slice(0, 8)
                .map(
                  (lead) => `
                <tr>
                  <td>${esc(lead.id)}</td>
                  <td>${esc(lead.name)}</td>
                  <td>${esc(lead.vehicleGoal)}</td>
                  <td>${currency(lead.budgetUSD)}</td>
                  <td>${esc(lead.source)}</td>
                  <td>${esc(lead.packageInterest)}</td>
                  <td>${esc(new Date(lead.createdAt).toLocaleDateString())}</td>
                </tr>
              `
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
  return `
    <h2>Marketing engine and growth controls</h2>
    <p class="lead">
      Practical marketing stack for demand generation, lead quality, and conversion tracking.
      Targets are planning assumptions and must not be represented as achieved results unless evidenced.
    </p>

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

  const form = document.getElementById("websiteLeadCaptureForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = formDataObject(form);
    const createCase = !!form.querySelector('input[name="createCase"]').checked;
    mutate((next) => {
      const lead = createLeadFromWebsite(
        {
          ...values,
          budgetUSD: Number(values.budgetUSD || 0),
        },
        next.marketingLeads.length
      );
      next.marketingLeads.push(lead);
      if (createCase) {
        const caseItem = createCaseFromIntake(
          {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            intent: "Purchase",
            budgetUSD: lead.budgetUSD,
            preferences: lead.vehicleGoal,
            timeframe: lead.timeline || "Flexible",
            tradeIn: false,
            owner: "Founder",
            proposedFee:
              lead.packageInterest === "Strategic Buy Plan"
                ? 399
                : lead.packageInterest === "Concierge Delivery"
                  ? 1499
                  : 999,
          },
          next.cases.length
        );
        next.cases.unshift(caseItem);
        next.ui.selectedCaseId = caseItem.id;
      }
    });
    setFlash(
      createCase
        ? "Demo lead saved and internal case created. No external contact was sent."
        : "Demo lead saved locally. No external message was sent.",
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

function bindMarketing() {
  const form = document.getElementById("marketingFunnelForm");
  if (!form) return;
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

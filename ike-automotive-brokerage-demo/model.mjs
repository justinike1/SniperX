export const EVIDENCE_STATUSES = [
  "Proposed",
  "Unverified",
  "In progress with evidence",
  "Verified",
  "Blocked",
  "Not applicable",
];

export const CASE_STATUSES = [
  "New Intake",
  "Intake Reviewed",
  "Negotiation In Progress",
  "Options Ready",
  "Client Decision Pending",
  "Completed",
  "Cancelled",
];

const nowIso = () => new Date().toISOString();

const clampMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Number(n.toFixed(2)));
};

const clampWhole = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
};

export function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function safeStatus(status) {
  return EVIDENCE_STATUSES.includes(status) ? status : "Unverified";
}

export function sanitizeReadinessItem(item) {
  return {
    ...item,
    status: safeStatus(item.status),
    evidenceDate: item.evidenceDate || "",
    evidenceReference: (item.evidenceReference || "").trim(),
    responsible: (item.responsible || "").trim(),
    nextAction: (item.nextAction || "").trim(),
  };
}

export function createLeadFromWebsite(input, existingCount = 0) {
  const id = `LEAD-${String(existingCount + 1).padStart(4, "0")}`;
  const createdAt = nowIso();
  return {
    id,
    createdAt,
    name: (input.name || "").trim(),
    email: (input.email || "").trim(),
    phone: (input.phone || "").trim(),
    vehicleGoal: (input.vehicleGoal || "").trim(),
    budgetUSD: clampMoney(input.budgetUSD),
    timeline: (input.timeline || "").trim(),
    packageInterest: (input.packageInterest || "Full Negotiation").trim(),
    source: (input.source || "Website").trim(),
    notes: (input.notes || "").trim(),
    status: "New",
  };
}

export function createCaseFromIntake(intake, existingCount = 0) {
  const nextNumber = String(1001 + existingCount).padStart(4, "0");
  const id = `IAG-${nextNumber}`;
  const createdAt = nowIso();
  const timeframe = intake.timeframe || "Flexible";
  const intent = intake.intent || "Purchase";
  const budget = clampMoney(intake.budgetUSD);
  const tradeIn = !!intake.tradeIn;
  const feeProposed = clampMoney(intake.proposedFee || 999);
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    customer: {
      name: (intake.name || "").trim(),
      email: (intake.email || "").trim(),
      phone: (intake.phone || "").trim(),
    },
    request: {
      intent,
      budgetUSD: budget,
      vehiclePreferences: (intake.preferences || "").trim(),
      timeframe,
      tradeIn,
    },
    owner: intake.owner || "Founder",
    status: "New Intake",
    nextAction: "Review intake and confirm target vehicle profile",
    dueDate: "",
    notes: "Case created from demo intake. No external message sent.",
    fees: {
      proposed: feeProposed,
      due: feeProposed,
      collected: 0,
      refunds: 0,
    },
    completion: {
      completed: false,
      completedAt: "",
    },
    vehicleCandidates: [],
    dealerQuotes: [],
    activity: [
      {
        at: createdAt,
        text: "Demo intake submitted locally. No external outreach triggered.",
      },
    ],
  };
}

export function appendActivity(caseItem, text) {
  return {
    ...caseItem,
    updatedAt: nowIso(),
    activity: [{ at: nowIso(), text }, ...(caseItem.activity || [])],
  };
}

function parseQuoteNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeQuote(input) {
  return {
    id: input.id || `Q-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    dealerName: (input.dealerName || "").trim(),
    vehicleLabel: (input.vehicleLabel || "").trim(),
    termMonths: parseQuoteNumber(input.termMonths),
    milesPerYear: parseQuoteNumber(input.milesPerYear),
    salePrice: parseQuoteNumber(input.salePrice),
    taxes: parseQuoteNumber(input.taxes),
    fees: parseQuoteNumber(input.fees),
    downPayment: parseQuoteNumber(input.downPayment),
    monthlyPayment: parseQuoteNumber(input.monthlyPayment),
    paymentAssumption: (input.paymentAssumption || "").trim(),
    asOfDate: input.asOfDate || "",
    createdAt: nowIso(),
  };
}

export function buildQuoteComparison(quotes) {
  return (quotes || []).map((q) => {
    const missing = [];
    if (!q.termMonths) missing.push("term");
    if (!q.milesPerYear) missing.push("mileage");
    if (q.salePrice === null) missing.push("vehicle price");
    if (q.taxes === null) missing.push("taxes");
    if (q.fees === null) missing.push("fees");
    if (!q.paymentAssumption) missing.push("payment assumption");

    const comparable = missing.length === 0;
    const driveOffEstimate =
      q.salePrice === null || q.taxes === null || q.fees === null
        ? null
        : clampMoney((q.salePrice || 0) + (q.taxes || 0) + (q.fees || 0) + (q.downPayment || 0));

    return {
      ...q,
      comparable,
      missing,
      driveOffEstimate,
    };
  });
}

export function defaultEconomics() {
  return {
    flagshipFee: 999,
    paidCases: 10,
    unpaidCases: 4,
    refundsCount: 1,
    averageRefund: 250,
    acquisitionSpend: 1200,
    paymentProcessingPercent: 2.9,
    paymentProcessingFlat: 0.3,
    operatingCosts: 2200,
    deliveryHoursPerCase: 4,
    salesAdminHours: 28,
    laborCostPerHour: 45,
    laborCostIncludedInOperatingCosts: false,
    ownerDraw: 2500,
    taxRatePercent: 26,
  };
}

export function calculateEconomics(rawInputs) {
  const inputs = {
    ...defaultEconomics(),
    ...rawInputs,
  };

  const fee = clampMoney(inputs.flagshipFee);
  const paidCases = clampWhole(inputs.paidCases);
  const refundsCount = clampWhole(inputs.refundsCount);
  const unpaidCases = clampWhole(inputs.unpaidCases);
  const avgRefund = clampMoney(inputs.averageRefund);
  const acquisitionSpend = clampMoney(inputs.acquisitionSpend);
  const opCosts = clampMoney(inputs.operatingCosts);
  const procPct = clampMoney(inputs.paymentProcessingPercent);
  const procFlat = clampMoney(inputs.paymentProcessingFlat);
  const deliveryHoursPerCase = clampMoney(inputs.deliveryHoursPerCase);
  const salesAdminHours = clampMoney(inputs.salesAdminHours);
  const laborRate = clampMoney(inputs.laborCostPerHour);
  const ownerDraw = clampMoney(inputs.ownerDraw);
  const taxRate = clampMoney(inputs.taxRatePercent) / 100;
  const laborIncluded = !!inputs.laborCostIncludedInOperatingCosts;

  const grossCollections = clampMoney(fee * paidCases);
  const refunds = clampMoney(Math.min(grossCollections, refundsCount * avgRefund));
  const netCollections = clampMoney(grossCollections - refunds);
  const paymentCosts = clampMoney(grossCollections * (procPct / 100) + paidCases * procFlat);

  const deliveryHours = clampMoney(paidCases * deliveryHoursPerCase);
  const serviceHours = clampMoney(deliveryHours + salesAdminHours);
  const modeledLaborCost = clampMoney(serviceHours * laborRate);
  const laborCostApplied = laborIncluded ? 0 : modeledLaborCost;

  const preTaxProfit = clampMoney(
    netCollections - paymentCosts - acquisitionSpend - opCosts - laborCostApplied
  );
  const afterOwnerDraw = clampMoney(preTaxProfit - ownerDraw);
  const estimatedTaxes = clampMoney(Math.max(0, afterOwnerDraw) * taxRate);
  const retainedAfterTax = clampMoney(afterOwnerDraw - estimatedTaxes);

  return {
    assumptions: {
      fee,
      paidCases,
      unpaidCases,
      refundsCount,
      avgRefund,
      acquisitionSpend,
      opCosts,
      procPct,
      procFlat,
      deliveryHoursPerCase,
      salesAdminHours,
      laborRate,
      laborIncluded,
      ownerDraw,
      taxRate,
    },
    totals: {
      grossCollections,
      refunds,
      netCollections,
      paymentCosts,
      deliveryHours,
      serviceHours,
      modeledLaborCost,
      laborCostApplied,
      preTaxProfit,
      afterOwnerDraw,
      estimatedTaxes,
      retainedAfterTax,
    },
    notes: {
      unpaidCasesExcludedFromCash: true,
      vehiclePurchasePriceExcludedFromRevenue: true,
      laborDoubleCountProtected: laborIncluded,
    },
  };
}

export function arithmeticScenarios(fee) {
  const cleanFee = clampMoney(fee);
  return [5, 10, 20].map((cases) => ({
    paidCases: cases,
    grossFeeCollections: clampMoney(cases * cleanFee),
  }));
}

export function defaultMarketingFunnel() {
  return {
    adSpend: 1800,
    leads: 42,
    bookedCalls: 14,
    signedClients: 5,
    avgFeeCollected: 999,
    refundsIssued: 350,
    referralLeads: 9,
    outboundLeads: 10,
  };
}

export function calculateMarketingSnapshot(rawInputs) {
  const inputs = {
    ...defaultMarketingFunnel(),
    ...rawInputs,
  };
  const adSpend = clampMoney(inputs.adSpend);
  const leads = clampWhole(inputs.leads);
  const bookedCalls = clampWhole(inputs.bookedCalls);
  const signedClients = clampWhole(inputs.signedClients);
  const avgFeeCollected = clampMoney(inputs.avgFeeCollected);
  const refundsIssued = clampMoney(inputs.refundsIssued);
  const referralLeads = clampWhole(inputs.referralLeads);
  const outboundLeads = clampWhole(inputs.outboundLeads);

  const bookedRate = leads > 0 ? (bookedCalls / leads) * 100 : 0;
  const closeRateFromCalls = bookedCalls > 0 ? (signedClients / bookedCalls) * 100 : 0;
  const closeRateFromLeads = leads > 0 ? (signedClients / leads) * 100 : 0;
  const cpl = leads > 0 ? adSpend / leads : 0;
  const cac = signedClients > 0 ? adSpend / signedClients : 0;

  const grossCollections = clampMoney(signedClients * avgFeeCollected);
  const netAfterRefunds = clampMoney(Math.max(0, grossCollections - refundsIssued));

  const organicLeads = Math.max(0, leads - outboundLeads);
  const paidLeads = Math.max(0, leads - referralLeads - outboundLeads);

  return {
    assumptions: {
      adSpend,
      leads,
      bookedCalls,
      signedClients,
      avgFeeCollected,
      refundsIssued,
      referralLeads,
      outboundLeads,
      organicLeads,
      paidLeads,
    },
    metrics: {
      bookedRate: Number(bookedRate.toFixed(2)),
      closeRateFromCalls: Number(closeRateFromCalls.toFixed(2)),
      closeRateFromLeads: Number(closeRateFromLeads.toFixed(2)),
      cpl: Number(cpl.toFixed(2)),
      cac: Number(cac.toFixed(2)),
      grossCollections,
      netAfterRefunds,
    },
  };
}

function seedCase(overrides) {
  const base = createCaseFromIntake(
    {
      name: "Fictional Buyer",
      email: "buyer@example.test",
      phone: "555-0100",
      intent: "Purchase",
      budgetUSD: 42000,
      preferences: "Certified SUV under 35k miles",
      timeframe: "Within 30 days",
      tradeIn: false,
      proposedFee: 999,
      owner: "Justin",
    },
    0
  );
  return {
    ...base,
    ...overrides,
    fees: { ...base.fees, ...(overrides.fees || {}) },
    request: { ...base.request, ...(overrides.request || {}) },
    customer: { ...base.customer, ...(overrides.customer || {}) },
    activity: overrides.activity || base.activity,
  };
}

export function initialDemoState() {
  const createdAt = nowIso();
  const cases = [
    seedCase({
      id: "IAG-1001",
      createdAt,
      updatedAt: createdAt,
      customer: { name: "Maya R.", email: "maya.demo@sample.test", phone: "555-1001" },
      owner: "Justin",
      status: "Negotiation In Progress",
      nextAction: "Collect refreshed OTD offers from 3 dealers",
      dueDate: "",
      request: {
        intent: "Lease",
        budgetUSD: 520,
        vehiclePreferences: "2023-2024 compact EV lease, 10k miles/year",
        timeframe: "Needs options this week",
        tradeIn: true,
      },
      fees: { proposed: 999, due: 999, collected: 0, refunds: 0 },
      dealerQuotes: [
        normalizeQuote({
          id: "Q-MAYA-1",
          dealerName: "Garden State Auto",
          vehicleLabel: "2024 EV Touring",
          termMonths: 36,
          milesPerYear: 10000,
          salePrice: 39800,
          taxes: 2480,
          fees: 980,
          downPayment: 2500,
          monthlyPayment: 489,
          paymentAssumption: "Lease with tier-1 credit assumption",
          asOfDate: "2026-10-23",
        }),
      ],
      activity: [
        { at: createdAt, text: "Demo case seeded for workspace validation." },
        { at: createdAt, text: "Client requested lease-focused negotiation." },
      ],
    }),
    seedCase({
      id: "IAG-1002",
      createdAt,
      updatedAt: createdAt,
      customer: { name: "Ethan P.", email: "ethan.demo@sample.test", phone: "555-1002" },
      owner: "Ops Team",
      status: "Options Ready",
      nextAction: "Present side-by-side quote summary to client",
      request: {
        intent: "Purchase",
        budgetUSD: 31000,
        vehiclePreferences: "Certified midsize sedan with driver-assist package",
        timeframe: "Within 2 weeks",
        tradeIn: false,
      },
      fees: { proposed: 999, due: 999, collected: 999, refunds: 0 },
    }),
    seedCase({
      id: "IAG-1003",
      createdAt,
      updatedAt: createdAt,
      customer: { name: "Leila K.", email: "leila.demo@sample.test", phone: "555-1003" },
      owner: "Justin",
      status: "Client Decision Pending",
      nextAction: "Confirm insurance quote impact before signing",
      request: {
        intent: "Purchase",
        budgetUSD: 47000,
        vehiclePreferences: "7-seat SUV, new or CPO",
        timeframe: "Before month-end",
        tradeIn: true,
      },
      fees: { proposed: 1499, due: 1499, collected: 1499, refunds: 150 },
    }),
    seedCase({
      id: "IAG-1004",
      createdAt,
      updatedAt: createdAt,
      customer: { name: "Noah T.", email: "noah.demo@sample.test", phone: "555-1004" },
      owner: "Unassigned",
      status: "New Intake",
      nextAction: "Assign owner and validate realistic budget",
      request: {
        intent: "Lease",
        budgetUSD: 430,
        vehiclePreferences: "Compact crossover lease",
        timeframe: "Flexible",
        tradeIn: false,
      },
      fees: { proposed: 399, due: 399, collected: 0, refunds: 0 },
    }),
  ];

  const readinessRegister = [
    sanitizeReadinessItem({
      id: "R-001",
      category: "Entity records",
      statement:
        "NJ LLC formation is documented (filed Jul 24, 2026) and standing certificate is dated Jul 24, 2026.",
      status: "Verified",
      evidenceReference: "NJ Formation Certificate #4328981058 and standing document dated 2026-07-24",
      evidenceDate: "2026-10-25",
      responsible: "Founder",
      nextAction: "Refresh standing certificate to establish current-status evidence.",
    }),
    sanitizeReadinessItem({
      id: "R-002",
      category: "Regulatory applicability",
      statement:
        "Current operating path for NJ automotive brokerage fee collection is unresolved pending written determination.",
      status: "Blocked",
      evidenceReference: "NJMVC dealership/broker language reviewed (Oct 25, 2026); counsel memo pending",
      evidenceDate: "2026-10-25",
      responsible: "NJ Counsel + Founder",
      nextAction: "Obtain written NJMVC applicability determination and counsel-approved route.",
    }),
    sanitizeReadinessItem({
      id: "R-003",
      category: "Security review",
      statement:
        "Independent security assessment has not been evidenced in this prototype workspace.",
      status: "Unverified",
      evidenceReference: "",
      evidenceDate: "",
      responsible: "Security Assessor",
      nextAction: "Assign assessor, define scope, and attach report metadata.",
    }),
    sanitizeReadinessItem({
      id: "R-004",
      category: "Operations ownership",
      statement:
        "Named owners for disputes, support coverage, reconciliation, and incident response are proposed but incomplete.",
      status: "Proposed",
      evidenceReference: "Draft owner matrix from planning notes",
      evidenceDate: "2026-10-25",
      responsible: "Founder",
      nextAction: "Publish role roster with alternates and on-call schedule.",
    }),
  ];

  return {
    metadata: {
      version: 2,
      createdAt,
      demoMode: true,
      lastResetAt: createdAt,
    },
    ui: {
      activeTab: "website",
      selectedCaseId: cases[0].id,
    },
    marketingLeads: [
      createLeadFromWebsite(
        {
          name: "Jordan L.",
          email: "jordan.demo@sample.test",
          phone: "555-2001",
          vehicleGoal: "Hybrid SUV under 35k miles",
          budgetUSD: 36000,
          timeline: "Need options in 10 days",
          packageInterest: "Full Negotiation",
          source: "Referral",
          notes: "Prefers CPO with service records",
        },
        0
      ),
      createLeadFromWebsite(
        {
          name: "Chris N.",
          email: "chris.demo@sample.test",
          phone: "555-2002",
          vehicleGoal: "Lease compact EV for commuting",
          budgetUSD: 520,
          timeline: "Before month-end",
          packageInterest: "Strategic Buy Plan",
          source: "Instagram",
          notes: "Wants side-by-side lease assumptions",
        },
        1
      ),
    ],
    marketing: {
      funnelInputs: defaultMarketingFunnel(),
      flagshipOffer: "Full Negotiation",
      channelPlan: [
        {
          id: "C-001",
          channel: "Referral partners",
          offer: "Deal review mini-audit",
          status: "In progress with evidence",
          owner: "Founder",
        },
        {
          id: "C-002",
          channel: "Local social content",
          offer: "Weekly negotiation breakdown clips",
          status: "Proposed",
          owner: "Marketing",
        },
        {
          id: "C-003",
          channel: "Outbound to repeat dealer regions",
          offer: "Transparent fee + documented comparison promise",
          status: "Unverified",
          owner: "Founder",
        },
      ],
    },
    customerIntakeDefaults: {
      name: "Alex Sample",
      email: "alex.sample@example.test",
      phone: "555-0199",
      intent: "Purchase",
      budgetUSD: 32000,
      preferences: "Low-mileage compact SUV with safety package",
      timeframe: "Within 2 weeks",
      tradeIn: false,
      proposedFee: 999,
    },
    cases,
    economics: defaultEconomics(),
    readinessRegister,
    metrics: {
      definitions: [
        {
          id: "M-001",
          metric: "Conversion rate",
          definition:
            "Paid brokerage cases / qualified leads in the same measurement window.",
          timing: "Monthly, finalized at month close.",
        },
        {
          id: "M-002",
          metric: "Cycle time",
          definition:
            "Business days from intake accepted to options-ready recommendation delivered.",
          timing: "Tracked per case and summarized weekly/monthly.",
        },
        {
          id: "M-003",
          metric: "Satisfaction",
          definition:
            "Average rating from closed-case survey responses; report sample size and response rate.",
          timing: "Rolling 30-day with monthly lock.",
        },
        {
          id: "M-004",
          metric: "Referral rate",
          definition:
            "Referred paying clients / total paying clients, separated from referral inquiries.",
          timing: "Monthly and quarter-to-date.",
        },
        {
          id: "M-005",
          metric: "Documentation completeness",
          definition:
            "Cases with full required artifacts / total active and closed cases.",
          timing: "Weekly QA review.",
        },
      ],
      dependencyPlan: [
        {
          id: "D-001",
          milestone: "Pilot paid brokerage operations",
          dependsOn:
            "Written legal path + NJMVC applicability determination + service agreement finalization",
          status: "Blocked",
        },
        {
          id: "D-002",
          milestone: "Payment collection workflow",
          dependsOn:
            "Merchant/provider approval, fee/refund policy finalization, and accounting controls",
          status: "Unverified",
        },
        {
          id: "D-003",
          milestone: "Scaled acquisition",
          dependsOn:
            "Documented conversion baseline and service delivery capacity proof",
          status: "Proposed",
        },
      ],
    },
  };
}

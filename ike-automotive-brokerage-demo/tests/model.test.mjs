import test from "node:test";
import assert from "node:assert/strict";
import {
  arithmeticScenarios,
  buildQuoteComparison,
  calculateLeaseDesk,
  defaultLeaseLenderProfiles,
  calculateMarketingSnapshot,
  calculateEconomics,
  createCaseFromIntake,
  createLeadFromWebsite,
  findLeaseProgram,
  initialDemoState,
  leaseTierScenarios,
  sanitizeReadinessItem,
} from "../model.mjs";

test("intake creates identifiable demo case with default safeguards", () => {
  const created = createCaseFromIntake(
    {
      name: "Demo Person",
      email: "demo@example.test",
      phone: "555-0101",
      intent: "Purchase",
      budgetUSD: 30000,
      preferences: "Used crossover",
      timeframe: "Within 14 days",
      tradeIn: true,
      owner: "Founder",
      proposedFee: 999,
    },
    3
  );
  assert.equal(created.id, "IAG-1004");
  assert.equal(created.status, "New Intake");
  assert.equal(created.customer.name, "Demo Person");
  assert.equal(created.request.tradeIn, true);
  assert.equal(created.fees.collected, 0);
});

test("quote comparison flags missing fields and only marks complete rows as comparable", () => {
  const rows = buildQuoteComparison([
    {
      dealerName: "A Dealer",
      vehicleLabel: "SUV A",
      termMonths: 36,
      milesPerYear: 10000,
      salePrice: 32000,
      taxes: 1800,
      fees: 500,
      downPayment: 3000,
      paymentAssumption: "Tier-1",
    },
    {
      dealerName: "B Dealer",
      vehicleLabel: "SUV B",
      termMonths: null,
      milesPerYear: 12000,
      salePrice: null,
      taxes: 1500,
      fees: null,
      downPayment: 0,
      paymentAssumption: "",
    },
  ]);
  assert.equal(rows[0].comparable, true);
  assert.equal(rows[0].driveOffEstimate, 37300);
  assert.equal(rows[1].comparable, false);
  assert.ok(rows[1].missing.includes("term"));
  assert.ok(rows[1].missing.includes("vehicle price"));
});

test("economics excludes unpaid cases from collections and keeps refunds explicit", () => {
  const report = calculateEconomics({
    flagshipFee: 999,
    paidCases: 5,
    unpaidCases: 20,
    refundsCount: 1,
    averageRefund: 200,
    acquisitionSpend: 0,
    operatingCosts: 0,
    paymentProcessingPercent: 0,
    paymentProcessingFlat: 0,
    deliveryHoursPerCase: 0,
    salesAdminHours: 0,
    laborCostPerHour: 0,
    ownerDraw: 0,
    taxRatePercent: 0,
  });
  assert.equal(report.totals.grossCollections, 4995);
  assert.equal(report.totals.refunds, 200);
  assert.equal(report.totals.netCollections, 4795);
});

test("labor double-count protection disables modeled labor deduction when flagged", () => {
  const report = calculateEconomics({
    paidCases: 10,
    deliveryHoursPerCase: 5,
    salesAdminHours: 10,
    laborCostPerHour: 100,
    laborCostIncludedInOperatingCosts: true,
  });
  assert.equal(report.totals.modeledLaborCost, 6000);
  assert.equal(report.totals.laborCostApplied, 0);
  assert.equal(report.notes.laborDoubleCountProtected, true);
});

test("readiness sanitation enforces allowed statuses", () => {
  const item = sanitizeReadinessItem({
    status: "Totally Confirmed",
    evidenceReference: "doc",
    evidenceDate: "",
    responsible: "Founder",
    nextAction: "Track it",
  });
  assert.equal(item.status, "Unverified");
});

test("arithmetic scenarios follow fee x paid-cases only", () => {
  const scenarios = arithmeticScenarios(999);
  assert.deepEqual(scenarios, [
    { paidCases: 5, grossFeeCollections: 4995 },
    { paidCases: 10, grossFeeCollections: 9990 },
    { paidCases: 20, grossFeeCollections: 19980 },
  ]);
});

test("initial demo state contains realistic seeded cases", () => {
  const seeded = initialDemoState();
  assert.ok(seeded.cases.length >= 4);
  assert.equal(seeded.readinessRegister[0].status, "Verified");
  assert.ok(seeded.marketingLeads.length >= 2);
  assert.equal(seeded.ui.activeTab, "website");
});

test("website lead creation returns identifiable lead objects", () => {
  const lead = createLeadFromWebsite(
    {
      name: "Prospect",
      email: "prospect@example.test",
      phone: "555-0100",
      vehicleGoal: "Hybrid sedan",
      budgetUSD: 28000,
      timeline: "30 days",
      packageInterest: "Full Negotiation",
      source: "Website",
      notes: "Prefers low APR options",
    },
    2
  );
  assert.equal(lead.id, "LEAD-0003");
  assert.equal(lead.budgetUSD, 28000);
  assert.equal(lead.status, "New");
});

test("marketing snapshot computes funnel and cost metrics", () => {
  const report = calculateMarketingSnapshot({
    adSpend: 2000,
    leads: 40,
    bookedCalls: 10,
    signedClients: 4,
    avgFeeCollected: 999,
    refundsIssued: 399,
    referralLeads: 8,
    outboundLeads: 7,
  });
  assert.equal(report.metrics.bookedRate, 25);
  assert.equal(report.metrics.closeRateFromCalls, 40);
  assert.equal(report.metrics.closeRateFromLeads, 10);
  assert.equal(report.metrics.cpl, 50);
  assert.equal(report.metrics.cac, 500);
  assert.equal(report.metrics.grossCollections, 3996);
  assert.equal(report.metrics.netAfterRefunds, 3597);
});

test("lease desk computes monthly payment with tier-adjusted residual and money factor", () => {
  const report = calculateLeaseDesk(
    {
      creditScore: 735,
      msrp: 45000,
      sellingPrice: 42000,
      incentives: 1000,
      capReduction: 2000,
      acquisitionFee: 895,
      docFee: 500,
      registrationFee: 300,
      rollFeesIntoLease: true,
      termMonths: 36,
      annualMileage: 10000,
      baseResidualPct: 61,
      mfMarkup: 0.0003,
      salesTaxRatePct: 6.625,
      taxOnMonthlyPayment: true,
      firstPaymentDueAtSigning: true,
    },
    [
      { id: "T1", name: "Tier 1", minScore: 760, buyRateMF: 0.0012, residualAdjPct: 0 },
      { id: "T2", name: "Tier 2", minScore: 720, buyRateMF: 0.0015, residualAdjPct: -1 },
      { id: "T3", name: "Tier 3", minScore: 680, buyRateMF: 0.0019, residualAdjPct: -2 },
    ]
  );
  assert.equal(report.selectedTier.name, "Tier 2");
  assert.equal(report.assumptions.residualPct, 60);
  assert.equal(report.assumptions.moneyFactor, 0.0018);
  assert.ok(report.totals.monthlyPayment > 0);
  assert.ok(report.totals.driveOff > 0);
  assert.ok(report.totals.aprEstimatePct > 0);
});

test("lease tier scenarios return sorted tier outputs", () => {
  const rows = leaseTierScenarios(
    { creditScore: 700, msrp: 40000, sellingPrice: 39000, termMonths: 36 },
    [
      { id: "T2", name: "Tier 2", minScore: 700, buyRateMF: 0.0018, residualAdjPct: -1 },
      { id: "T1", name: "Tier 1", minScore: 760, buyRateMF: 0.0013, residualAdjPct: 0 },
      { id: "T3", name: "Tier 3", minScore: 640, buyRateMF: 0.0022, residualAdjPct: -3 },
    ]
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].tier.name, "Tier 1");
  assert.equal(rows[1].tier.name, "Tier 2");
  assert.ok(rows[0].monthlyPayment < rows[2].monthlyPayment);
});

test("lender profiles expose programs and findLeaseProgram resolves selection", () => {
  const profiles = defaultLeaseLenderProfiles();
  assert.ok(profiles.length >= 2);
  const { profile, program } = findLeaseProgram("LNX", "LNX-36-10", profiles);
  assert.equal(profile.name.includes("Luxe"), true);
  assert.equal(program.termMonths, 36);
  assert.ok(program.tierBuyRates.T1 > 0);
});

test("lease desk uses selected program tier buy-rate override when provided", () => {
  const report = calculateLeaseDesk(
    {
      creditScore: 770,
      msrp: 50000,
      sellingPrice: 47000,
      termMonths: 36,
      annualMileage: 10000,
      baseResidualPct: 60,
      mfMarkup: 0.0001,
      programTierBuyRates: { T1: 0.00111 },
    },
    [{ id: "T1", name: "Tier 1", minScore: 760, buyRateMF: 0.0015, residualAdjPct: 0 }]
  );
  assert.equal(report.assumptions.buyRateMF, 0.00111);
  assert.equal(report.assumptions.moneyFactor, 0.00121);
  assert.equal(report.assumptions.mfSource, "Program tier buy rate");
});

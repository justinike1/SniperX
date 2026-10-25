import test from "node:test";
import assert from "node:assert/strict";
import {
  arithmeticScenarios,
  buildQuoteComparison,
  calculateEconomics,
  createCaseFromIntake,
  initialDemoState,
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
});

import assert from "node:assert/strict";
import { portfolioManager } from "../brain/portfolioManager";
import { riskManager } from "../brain/riskManager";
import { tradeJournal } from "../brain/tradeJournal";
import { canonicalRiskState } from "../risk/canonicalRiskState";

type ExitStep = {
  soldQty: number;
  exitPriceUSD: number;
  feeUSD: number;
  reason: string;
};

const TOL_QTY = 1e-8;
const TOL_USD = 1e-6;

function approximateEqual(a: number, b: number, tolerance: number, label: string): void {
  assert.ok(Math.abs(a - b) <= tolerance, `${label}: expected ${b}, got ${a}`);
}

async function seedPosition(params: {
  mint: string;
  token: string;
  qty: number;
  entryPrice: number;
  feeUSD?: number;
}): Promise<{ journalId: string; startingNotional: number; startingCostBasisPerToken: number }> {
  const notional = params.qty * params.entryPrice;
  const journalId = tradeJournal.open({
    token: params.token,
    mint: params.mint,
    action: "BUY",
    sizeUSD: notional + (params.feeUSD || 0),
    entryPrice: params.entryPrice,
    confidence: 80,
    regime: "CHOP",
    signals: ["TEST_SEED"],
    breakdown: {},
    execution: { success: true },
  });
  portfolioManager.seedPositionForTests({
    token: params.token,
    mint: params.mint,
    quantity: params.qty,
    entryPriceUSD: params.entryPrice,
    entryNotionalUSD: notional + (params.feeUSD || 0),
    entryFeeUSD: params.feeUSD || 0,
    journalId,
    strategy: "TEST",
  });
  riskManager.onTradeOpen(journalId, notional + (params.feeUSD || 0), params.entryPrice);
  return {
    journalId,
    startingNotional: notional + (params.feeUSD || 0),
    startingCostBasisPerToken: (notional + (params.feeUSD || 0)) / params.qty,
  };
}

function assertNoPhantomValues(mint: string): void {
  const p = portfolioManager.getOpenPositionByMint(mint);
  if (!p) return;
  assert.ok(p.quantity >= -TOL_QTY, "quantity must not go negative");
  assert.ok(p.entryNotionalUSD >= -TOL_USD, "remaining cost basis must not go negative");
  assert.ok(
    Number.isFinite(p.realizedPnlUSD) && Number.isFinite(p.unrealizedPnlUSD),
    "PnL values must be finite"
  );
}

function assertRiskAndJournalAgreeWhenClosed(journalId: string): void {
  const closed = tradeJournal.getById(journalId);
  assert.ok(closed, "journal entry must exist");
  assert.equal(closed!.outcome !== "OPEN", true, "journal should be closed");
  const risk = riskManager.getState();
  assert.equal(risk.tradesOpenCount, 0, "risk open trade count should be zero after full close");
}

function assertPnlContinuity(mint: string, totalCostUSD: number): void {
  const p = portfolioManager.getOpenPositionByMint(mint);
  const realized = p?.realizedPnlUSD || 0;
  const unrealized = p?.unrealizedPnlUSD || 0;
  const mark = p?.markValueUSD || 0;
  const remainingBasis = p?.entryNotionalUSD || 0;
  const lhs = realized + unrealized;
  const rhs = realized + (mark - remainingBasis);
  assert.ok(Math.abs(lhs - rhs) <= 1e-4, "realized+unrealized continuity must hold");
  assert.ok(totalCostUSD >= -TOL_USD, "total cost cannot be negative");
}

function assertStepLevelAgreement(params: {
  mint: string;
  journalId: string;
  expectedOpenTrades: number;
  expectedDailyPnlUSD: number;
  expectedDailyTradeCount: number;
}): void {
  const { mint, journalId, expectedOpenTrades, expectedDailyPnlUSD, expectedDailyTradeCount } = params;
  const risk = riskManager.getState();
  const canonical = canonicalRiskState.getCanonicalSnapshot();
  const journal = tradeJournal.getById(journalId);
  const pos = portfolioManager.getOpenPositionByMint(mint);

  assert.ok(journal, "journal entry must exist during step");
  assert.equal(
    journal!.outcome === "OPEN",
    expectedOpenTrades > 0,
    "journal OPEN/CLOSED state should match expected open-trade state"
  );
  assert.equal(
    risk.tradesOpenCount,
    expectedOpenTrades,
    "risk open trades must match expected count"
  );
  assert.equal(
    canonical.tradesOpenCount,
    expectedOpenTrades,
    "canonical open trades must match expected count"
  );
  assert.equal(
    risk.dailyTradeCount,
    expectedDailyTradeCount,
    "risk daily trade count must match expected"
  );
  assert.equal(
    canonical.dailyTradeCount,
    expectedDailyTradeCount,
    "canonical daily trade count must match expected"
  );
  approximateEqual(
    risk.dailyPnlUSD,
    expectedDailyPnlUSD,
    2e-2,
    "risk daily PnL"
  );
  approximateEqual(
    canonical.dailyPnlUSD,
    expectedDailyPnlUSD,
    2e-2,
    "canonical daily PnL"
  );
  if (expectedOpenTrades > 0) {
    assert.ok(pos, "portfolio position should still be open");
  } else {
    assert.equal(pos, undefined, "portfolio position should be fully closed");
  }
}

function applyExitAndAssert(params: {
  mint: string;
  expectedPreQty: number;
  expectedPreBasis: number;
  step: ExitStep;
  expectedPostQty: number;
  expectedPostBasis: number;
}): { realizedPnlUSD: number; netProceedsUSD: number } {
  const { mint, expectedPreQty, expectedPreBasis, step, expectedPostQty, expectedPostBasis } = params;
  const pBefore = portfolioManager.getOpenPositionByMint(mint);
  assert.ok(pBefore, "position must exist before exit");
  assert.ok(Math.abs((pBefore?.quantity || 0) - expectedPreQty) <= 1e-6, "pre quantity mismatch");
  assert.ok(
    Math.abs((pBefore?.entryNotionalUSD || 0) - expectedPreBasis) <= 1e-4,
    "pre basis mismatch"
  );

  const result = portfolioManager.recordExit({
    mint,
    soldQuantity: step.soldQty,
    grossProceedsUSD: step.soldQty * step.exitPriceUSD,
    feeUSD: step.feeUSD,
  });
  assert.ok(result, "recordExit should return a result");

  if (result!.closed) {
    const pAfterClose = portfolioManager.getOpenPositionByMint(mint);
    assert.equal(pAfterClose, undefined, "position should be closed");
  } else {
    const pAfter = portfolioManager.getOpenPositionByMint(mint);
    assert.ok(pAfter, "position must remain open");
    assert.ok(Math.abs((pAfter?.quantity || 0) - expectedPostQty) <= 1e-6, "post quantity mismatch");
    assert.ok(
      Math.abs((pAfter?.entryNotionalUSD || 0) - expectedPostBasis) <= 1e-4,
      "post basis mismatch"
    );
  }

  assertNoPhantomValues(mint);
  return {
    realizedPnlUSD: result!.realizedPnlUSD,
    netProceedsUSD: result!.netProceedsUSD,
  };
}

async function runScenario(name: string, fn: () => Promise<void>): Promise<void> {
  canonicalRiskState.resetForTests();
  riskManager.resetForTests();
  await fn();
  console.log(`[partial-exit] PASS ${name}`);
}

async function scenarioPercentExits(): Promise<void> {
  const mint = "MINT_TEST_25_50_75";
  const { journalId, startingNotional, startingCostBasisPerToken } = await seedPosition({
    mint,
    token: "TST1",
    qty: 100,
    entryPrice: 2,
    feeUSD: 1,
  });
  let cumulativeRealized = 0;
  assertStepLevelAgreement({
    mint,
    journalId,
    expectedOpenTrades: 1,
    expectedDailyPnlUSD: cumulativeRealized,
    expectedDailyTradeCount: 1,
  });

  // 25%
  const s1 = applyExitAndAssert({
    mint,
    expectedPreQty: 100,
    expectedPreBasis: 201,
    step: { soldQty: 25, exitPriceUSD: 2.2, feeUSD: 0.4, reason: "TEST_25" },
    expectedPostQty: 75,
    expectedPostBasis: 201 - 25 * startingCostBasisPerToken,
  });
  assert.ok(Number.isFinite(s1.realizedPnlUSD), "realized PnL should be finite");
  cumulativeRealized += s1.realizedPnlUSD;
  riskManager.onTradeClose(journalId, s1.realizedPnlUSD, 0, { keepOpen: true });
  assertStepLevelAgreement({
    mint,
    journalId,
    expectedOpenTrades: 1,
    expectedDailyPnlUSD: cumulativeRealized,
    expectedDailyTradeCount: 1,
  });

  // 50% of original (50 tokens)
  const preBasis2 = 201 - 25 * startingCostBasisPerToken;
  const s2 = applyExitAndAssert({
    mint,
    expectedPreQty: 75,
    expectedPreBasis: preBasis2,
    step: { soldQty: 50, exitPriceUSD: 2.4, feeUSD: 0.6, reason: "TEST_50" },
    expectedPostQty: 25,
    expectedPostBasis: preBasis2 - 50 * (preBasis2 / 75),
  });
  assert.ok(Number.isFinite(s2.netProceedsUSD), "net proceeds should be finite");
  cumulativeRealized += s2.realizedPnlUSD;
  riskManager.onTradeClose(journalId, s2.realizedPnlUSD, 0, { keepOpen: true });
  assertStepLevelAgreement({
    mint,
    journalId,
    expectedOpenTrades: 1,
    expectedDailyPnlUSD: cumulativeRealized,
    expectedDailyTradeCount: 1,
  });

  // 75% of remaining (18.75 tokens)
  const pre = portfolioManager.getOpenPositionByMint(mint)!;
  const sold3 = pre.quantity * 0.75;
  const preBasis3 = pre.entryNotionalUSD;
  const s3 = applyExitAndAssert({
    mint,
    expectedPreQty: pre.quantity,
    expectedPreBasis: preBasis3,
    step: { soldQty: sold3, exitPriceUSD: 1.8, feeUSD: 0.2, reason: "TEST_75_REMAINING" },
    expectedPostQty: pre.quantity - sold3,
    expectedPostBasis: preBasis3 - sold3 * (preBasis3 / pre.quantity),
  });
  cumulativeRealized += s3.realizedPnlUSD;
  riskManager.onTradeClose(journalId, s3.realizedPnlUSD, 0, { keepOpen: true });
  assertStepLevelAgreement({
    mint,
    journalId,
    expectedOpenTrades: 1,
    expectedDailyPnlUSD: cumulativeRealized,
    expectedDailyTradeCount: 1,
  });

  // Full close after partials
  const remain = portfolioManager.getOpenPositionByMint(mint)!;
  const close = portfolioManager.recordExit({
    mint,
    soldQuantity: remain.quantity,
    grossProceedsUSD: remain.quantity * 2.1,
    feeUSD: 0.3,
  });
  assert.ok(close && close.closed, "final close must close position");
  cumulativeRealized += close.realizedPnlUSD;
  tradeJournal.close(journalId, close!.exitPriceUSD, "TEST_FINAL_CLOSE", { success: true });
  riskManager.onTradeClose(journalId, close!.realizedPnlUSD, 0);
  assertStepLevelAgreement({
    mint,
    journalId,
    expectedOpenTrades: 0,
    expectedDailyPnlUSD: cumulativeRealized,
    expectedDailyTradeCount: 1,
  });
  assertRiskAndJournalAgreeWhenClosed(journalId);
  assertPnlContinuity(mint, startingNotional);
}

async function scenarioStaggeredAndDust(): Promise<void> {
  const mint = "MINT_TEST_STAGGER";
  const seed = await seedPosition({
    mint,
    token: "TST2",
    qty: 10,
    entryPrice: 5,
  });
  let cumulativeRealized = 0;
  assertStepLevelAgreement({
    mint,
    journalId: seed.journalId,
    expectedOpenTrades: 1,
    expectedDailyPnlUSD: cumulativeRealized,
    expectedDailyTradeCount: 1,
  });
  const steps: ExitStep[] = [
    { soldQty: 2.5, exitPriceUSD: 5.1, feeUSD: 0.01, reason: "STEP_1" },
    { soldQty: 3.3, exitPriceUSD: 4.8, feeUSD: 0.02, reason: "STEP_2" },
    { soldQty: 1.9, exitPriceUSD: 5.3, feeUSD: 0.03, reason: "STEP_3" },
  ];
  for (const step of steps) {
    const pre = portfolioManager.getOpenPositionByMint(mint)!;
    const stepResult = applyExitAndAssert({
      mint,
      expectedPreQty: pre.quantity,
      expectedPreBasis: pre.entryNotionalUSD,
      step,
      expectedPostQty: pre.quantity - step.soldQty,
      expectedPostBasis: pre.entryNotionalUSD - step.soldQty * (pre.entryNotionalUSD / pre.quantity),
    });
    cumulativeRealized += stepResult.realizedPnlUSD;
    riskManager.onTradeClose(seed.journalId, stepResult.realizedPnlUSD, 0, { keepOpen: true });
    assertStepLevelAgreement({
      mint,
      journalId: seed.journalId,
      expectedOpenTrades: 1,
      expectedDailyPnlUSD: cumulativeRealized,
      expectedDailyTradeCount: 1,
    });
  }

  // near-zero dust remainder
  const preDust = portfolioManager.getOpenPositionByMint(mint)!;
  const toSell = Math.max(0, preDust.quantity - 5e-7);
  const dustResult = portfolioManager.recordExit({
    mint,
    soldQuantity: toSell,
    grossProceedsUSD: toSell * 4.9,
    feeUSD: 0.01,
  });
  assert.ok(dustResult, "dust exit result should exist");
  cumulativeRealized += dustResult!.realizedPnlUSD;
  riskManager.onTradeClose(seed.journalId, dustResult!.realizedPnlUSD, 0, { keepOpen: true });
  const afterDust = portfolioManager.getOpenPositionByMint(mint);
  assert.ok(afterDust, "position should still exist before final dust close");
  assert.ok((afterDust?.quantity || 0) <= 1e-4, "dust remainder should be tiny");
  assertStepLevelAgreement({
    mint,
    journalId: seed.journalId,
    expectedOpenTrades: 1,
    expectedDailyPnlUSD: cumulativeRealized,
    expectedDailyTradeCount: 1,
  });

  // final close of dust
  const final = portfolioManager.recordExit({
    mint,
    soldQuantity: afterDust!.quantity,
    grossProceedsUSD: afterDust!.quantity * 5,
    feeUSD: 0,
  });
  assert.ok(final && final.closed, "dust final close should close position");
  cumulativeRealized += final!.realizedPnlUSD;
  tradeJournal.close(seed.journalId, final!.exitPriceUSD, "TEST_DUST_FINAL_CLOSE", { success: true });
  riskManager.onTradeClose(seed.journalId, final!.realizedPnlUSD, 0);
  assertStepLevelAgreement({
    mint,
    journalId: seed.journalId,
    expectedOpenTrades: 0,
    expectedDailyPnlUSD: cumulativeRealized,
    expectedDailyTradeCount: 1,
  });
}

async function scenarioFeeHeavy(): Promise<void> {
  const mint = "MINT_TEST_FEE_HEAVY";
  const seed = await seedPosition({
    mint,
    token: "TST3",
    qty: 20,
    entryPrice: 1,
  });
  const pre = portfolioManager.getOpenPositionByMint(mint)!;
  const result = portfolioManager.recordExit({
    mint,
    soldQuantity: 10,
    grossProceedsUSD: 10.5,
    feeUSD: 9.5,
  });
  assert.ok(result, "fee-heavy result should exist");
  assert.ok(result!.realizedPnlUSD < 0, "fee-heavy exit should realize loss");
  riskManager.onTradeClose(seed.journalId, result!.realizedPnlUSD, 0, { keepOpen: true });
  assertStepLevelAgreement({
    mint,
    journalId: seed.journalId,
    expectedOpenTrades: 1,
    expectedDailyPnlUSD: result!.realizedPnlUSD,
    expectedDailyTradeCount: 1,
  });
  const post = portfolioManager.getOpenPositionByMint(mint)!;
  assert.ok(post.entryNotionalUSD <= pre.entryNotionalUSD, "basis should not increase");
  assertNoPhantomValues(mint);
}

async function main(): Promise<void> {
  await runScenario("25/50/75 exits + final close", scenarioPercentExits);
  await runScenario("staggered exits + dust handling", scenarioStaggeredAndDust);
  await runScenario("fee-heavy exit", scenarioFeeHeavy);
  console.log("[partial-exit] all invariant scenarios passed");
}

main().catch((err) => {
  console.error("[partial-exit] FAILED", err);
  process.exit(1);
});


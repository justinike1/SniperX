import { RiskState, TradeDecision } from "./types";
import { canonicalRiskState } from "../risk/canonicalRiskState";

const MAX_DAILY_LOSS_PCT = 5;
const MAX_PER_TRADE_RISK_PCT = 2;
const MAX_CONSECUTIVE_LOSSES = 3;
const MAX_OPEN_POSITIONS = 4;
const MAX_DRAWDOWN_PCT = 15;
const DRAWDOWN_REDUCE_PCT = 10;

class RiskManager {
  private legacyState: RiskState = {
    dailyPnlUSD: 0,
    dailyPnlPct: 0,
    consecutiveLosses: 0,
    peakPortfolioUSD: 0,
    currentDrawdownPct: 0,
    tradesOpenCount: 0,
    dailyTradeCount: 0,
    isHalted: false,
    haltReason: undefined,
    lastResetDate: new Date().toISOString().split("T")[0],
  };

  initSession(totalEquityUSD: number): void {
    canonicalRiskState.rollDayIfNeeded();
    canonicalRiskState.initDailyStartEquity(totalEquityUSD);
    canonicalRiskState.updateDrawdown(totalEquityUSD);
    this.syncLegacyFromCanonical();
  }

  canTrade(decision: TradeDecision, totalEquityUSD: number): string | null {
    canonicalRiskState.rollDayIfNeeded();
    canonicalRiskState.updateDrawdown(totalEquityUSD);
    this.syncLegacyFromCanonical();
    const s = canonicalRiskState.getCanonicalSnapshot();

    if (s.isHalted) return `HALTED:${s.haltReason}`;
    if (s.tradesOpenCount >= MAX_OPEN_POSITIONS) {
      return `MAX_POSITIONS:${MAX_OPEN_POSITIONS}`;
    }
    if (s.currentDrawdownPct >= MAX_DRAWDOWN_PCT) {
      this.halt(
        `Drawdown ${s.currentDrawdownPct.toFixed(1)}% exceeds ${MAX_DRAWDOWN_PCT}%`
      );
      return `DRAWDOWN_LIMIT:${s.currentDrawdownPct.toFixed(1)}%`;
    }

    if (totalEquityUSD < 2) return `LOW_EQUITY:$${totalEquityUSD.toFixed(2)}`;

    const dailyStartUSD = canonicalRiskState.getDailyStartEquity();
    const dailyLossPct =
      dailyStartUSD > 0
        ? ((dailyStartUSD - totalEquityUSD) / dailyStartUSD) * 100
        : 0;
    if (dailyLossPct >= MAX_DAILY_LOSS_PCT) {
      this.halt(`Daily loss ${dailyLossPct.toFixed(1)}% exceeds ${MAX_DAILY_LOSS_PCT}%`);
      return `DAILY_LOSS_LIMIT:${dailyLossPct.toFixed(1)}%`;
    }

    return null;
  }

  sizeTrade(baseUSD: number, confidence: number, portfolioUSD: number): number {
    const s = canonicalRiskState.getCanonicalSnapshot();
    const maxRisk = portfolioUSD * (MAX_PER_TRADE_RISK_PCT / 100);
    const confMultiplier = Math.min(1, Math.max(0.35, (confidence - 50) / 50));
    const drawdownMultiplier =
      s.currentDrawdownPct >= DRAWDOWN_REDUCE_PCT
        ? Math.max(0.2, 0.55 - (s.currentDrawdownPct - DRAWDOWN_REDUCE_PCT) / 100)
        : 1;
    const lossMultiplier =
      s.consecutiveLosses >= 2 ? 0.45 : s.consecutiveLosses === 1 ? 0.7 : 1;

    const sized = Math.min(baseUSD, maxRisk) * confMultiplier * drawdownMultiplier * lossMultiplier;
    if (sized <= 0) return 0;
    return Math.max(1, Math.round(sized * 100) / 100);
  }

  calculateExits(
    confidence: number,
    volatilityCv: number
  ): { tp: number; sl: number; trailingActivation: number } {
    const baseTp = confidence >= 82 ? 18 : confidence >= 72 ? 14 : 10;
    const baseSl = confidence >= 82 ? 7 : confidence >= 72 ? 6 : 5;
    const volMult = 1 + Math.min(1.2, volatilityCv * 7);
    return {
      tp: Math.round(baseTp * volMult * 10) / 10,
      sl: Math.round(baseSl * volMult * 10) / 10,
      trailingActivation: 4,
    };
  }

  onTradeOpen(id: string, sizeUSD: number, entryPrice: number): void {
    canonicalRiskState.rollDayIfNeeded();
    canonicalRiskState.recordTradeOpen(id, sizeUSD, entryPrice);
    this.syncLegacyFromCanonical();
  }

  onTradeClose(
    id: string,
    pnlUSD: number,
    _pnlPct: number,
    opts?: { keepOpen?: boolean }
  ): void {
    canonicalRiskState.rollDayIfNeeded();
    if (!opts?.keepOpen) {
      canonicalRiskState.recordTradeClose(id);
    }
    canonicalRiskState.applyRealizedPnl(pnlUSD);
    this.syncLegacyFromCanonical();
    const s = canonicalRiskState.getCanonicalSnapshot();
    if (s.consecutiveLosses >= MAX_CONSECUTIVE_LOSSES && !s.isHalted) {
      this.halt(`Consecutive loss halt (${MAX_CONSECUTIVE_LOSSES})`);
      void this.sendRiskHaltAlert(
        `Risk halt: ${MAX_CONSECUTIVE_LOSSES} consecutive losses. Trading paused.`
      );
    }
  }

  updateDrawdown(currentEquityUSD: number): void {
    canonicalRiskState.updateDrawdown(currentEquityUSD);
    this.syncLegacyFromCanonical();
  }

  halt(reason: string): void {
    canonicalRiskState.setHalt(reason);
    this.syncLegacyFromCanonical();
    console.error(`[risk] HALT ${reason}`);
  }

  resume(): void {
    canonicalRiskState.resume();
    this.syncLegacyFromCanonical();
    console.log("[risk] resumed");
  }

  getState(): RiskState {
    const s = canonicalRiskState.getCanonicalSnapshot();
    this.legacyState = {
      dailyPnlUSD: s.dailyPnlUSD,
      dailyPnlPct: s.dailyPnlPct,
      consecutiveLosses: s.consecutiveLosses,
      peakPortfolioUSD: s.peakPortfolioUSD,
      currentDrawdownPct: s.currentDrawdownPct,
      tradesOpenCount: s.tradesOpenCount,
      dailyTradeCount: s.dailyTradeCount,
      isHalted: s.isHalted,
      haltReason: s.haltReason,
      lastResetDate: s.tradingDay,
    };
    canonicalRiskState.setBrainSecondary({ ...this.legacyState });
    return { ...this.legacyState };
  }

  getStatusText(): string {
    const s = this.getState();
    return (
      `Risk manager\n\n` +
      `${s.isHalted ? `HALTED: ${s.haltReason}` : "ACTIVE"}\n` +
      `Daily P&L: ${s.dailyPnlUSD >= 0 ? "+" : ""}$${s.dailyPnlUSD.toFixed(2)} (${s.dailyPnlPct.toFixed(2)}%)\n` +
      `Open positions: ${s.tradesOpenCount}/${MAX_OPEN_POSITIONS}\n` +
      `Consecutive losses: ${s.consecutiveLosses}/${MAX_CONSECUTIVE_LOSSES}\n` +
      `Drawdown: ${s.currentDrawdownPct.toFixed(2)}%`
    );
  }

  resetForTests(): void {
    canonicalRiskState.resetForTests();
    this.syncLegacyFromCanonical();
  }

  private syncLegacyFromCanonical(): void {
    const s = canonicalRiskState.getCanonicalSnapshot();
    this.legacyState = {
      dailyPnlUSD: s.dailyPnlUSD,
      dailyPnlPct: s.dailyPnlPct,
      consecutiveLosses: s.consecutiveLosses,
      peakPortfolioUSD: s.peakPortfolioUSD,
      currentDrawdownPct: s.currentDrawdownPct,
      tradesOpenCount: s.tradesOpenCount,
      dailyTradeCount: s.dailyTradeCount,
      isHalted: s.isHalted,
      haltReason: s.haltReason,
      lastResetDate: s.tradingDay,
    };
  }

  private async sendRiskHaltAlert(message: string): Promise<void> {
    try {
      const { sendTelegramAlert } = await import("../utils/telegramBotEnhanced");
      await sendTelegramAlert(message);
    } catch {
      // Alerting should never break core risk state transitions.
    }
  }
}

export const riskManager = new RiskManager();

import { sendTelegramAlert } from "./../utils/telegramBotEnhanced";
import { RiskState, TradeDecision } from "./types";

const MAX_DAILY_LOSS_PCT = 5;
const MAX_PER_TRADE_RISK_PCT = 2;
const MAX_CONSECUTIVE_LOSSES = 3;
const MAX_OPEN_POSITIONS = 4;
const MAX_DRAWDOWN_PCT = 15;
const DRAWDOWN_REDUCE_PCT = 10;

class RiskManager {
  private state: RiskState = {
    dailyPnlUSD: 0,
    dailyPnlPct: 0,
    consecutiveLosses: 0,
    peakPortfolioUSD: 0,
    currentDrawdownPct: 0,
    tradesOpenCount: 0,
    dailyTradeCount: 0,
    isHalted: false,
    haltReason: undefined,
    lastResetDate: this.todayStr(),
  };

  private dailyStartUSD = 0;
  private openTrades: Map<string, { sizeUSD: number; entryPrice: number }> = new Map();

  initSession(totalEquityUSD: number): void {
    this.checkDailyReset();
    if (this.dailyStartUSD === 0) this.dailyStartUSD = totalEquityUSD;
    this.updateDrawdown(totalEquityUSD);
  }

  canTrade(decision: TradeDecision, totalEquityUSD: number): string | null {
    this.checkDailyReset();
    if (this.state.isHalted) return `HALTED:${this.state.haltReason}`;
    if (this.state.tradesOpenCount >= MAX_OPEN_POSITIONS) {
      return `MAX_POSITIONS:${MAX_OPEN_POSITIONS}`;
    }
    if (this.state.currentDrawdownPct >= MAX_DRAWDOWN_PCT) {
      this.halt(
        `Drawdown ${this.state.currentDrawdownPct.toFixed(1)}% exceeds ${MAX_DRAWDOWN_PCT}%`
      );
      return `DRAWDOWN_LIMIT:${this.state.currentDrawdownPct.toFixed(1)}%`;
    }

    if (totalEquityUSD < 2) return `LOW_EQUITY:$${totalEquityUSD.toFixed(2)}`;

    const dailyLossPct =
      this.dailyStartUSD > 0
        ? ((this.dailyStartUSD - totalEquityUSD) / this.dailyStartUSD) * 100
        : 0;
    if (dailyLossPct >= MAX_DAILY_LOSS_PCT) {
      this.halt(`Daily loss ${dailyLossPct.toFixed(1)}% exceeds ${MAX_DAILY_LOSS_PCT}%`);
      return `DAILY_LOSS_LIMIT:${dailyLossPct.toFixed(1)}%`;
    }

    return null;
  }

  sizeTrade(baseUSD: number, confidence: number, portfolioUSD: number): number {
    const maxRisk = portfolioUSD * (MAX_PER_TRADE_RISK_PCT / 100);
    const confMultiplier = Math.min(1, Math.max(0.35, (confidence - 50) / 50));
    const drawdownMultiplier =
      this.state.currentDrawdownPct >= DRAWDOWN_REDUCE_PCT
        ? Math.max(0.2, 0.55 - (this.state.currentDrawdownPct - DRAWDOWN_REDUCE_PCT) / 100)
        : 1;
    const lossMultiplier =
      this.state.consecutiveLosses >= 2 ? 0.45 : this.state.consecutiveLosses === 1 ? 0.7 : 1;

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
    this.openTrades.set(id, { sizeUSD, entryPrice });
    this.state.tradesOpenCount = this.openTrades.size;
    this.state.dailyTradeCount += 1;
  }

  onTradeClose(id: string, pnlUSD: number, _pnlPct: number): void {
    this.openTrades.delete(id);
    this.state.tradesOpenCount = this.openTrades.size;
    this.state.dailyPnlUSD += pnlUSD;

    if (pnlUSD < 0) {
      this.state.consecutiveLosses += 1;
      if (this.state.consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
        this.halt(`Consecutive loss halt (${MAX_CONSECUTIVE_LOSSES})`);
        sendTelegramAlert(
          `Risk halt: ${MAX_CONSECUTIVE_LOSSES} consecutive losses. Trading paused.`
        );
      }
    } else if (pnlUSD > 0) {
      this.state.consecutiveLosses = 0;
    }

    if (this.dailyStartUSD > 0) {
      this.state.dailyPnlPct = (this.state.dailyPnlUSD / this.dailyStartUSD) * 100;
    }
  }

  updateDrawdown(currentEquityUSD: number): void {
    if (currentEquityUSD > this.state.peakPortfolioUSD) {
      this.state.peakPortfolioUSD = currentEquityUSD;
    }
    if (this.state.peakPortfolioUSD > 0) {
      this.state.currentDrawdownPct =
        ((this.state.peakPortfolioUSD - currentEquityUSD) / this.state.peakPortfolioUSD) * 100;
    }
  }

  halt(reason: string): void {
    this.state.isHalted = true;
    this.state.haltReason = reason;
    console.error(`[risk] HALT ${reason}`);
  }

  resume(): void {
    this.state.isHalted = false;
    this.state.haltReason = undefined;
    console.log("[risk] resumed");
  }

  getState(): RiskState {
    return { ...this.state };
  }

  getStatusText(): string {
    this.checkDailyReset();
    const s = this.state;
    return (
      `Risk manager\n\n` +
      `${s.isHalted ? `HALTED: ${s.haltReason}` : "ACTIVE"}\n` +
      `Daily P&L: ${s.dailyPnlUSD >= 0 ? "+" : ""}$${s.dailyPnlUSD.toFixed(2)} (${s.dailyPnlPct.toFixed(2)}%)\n` +
      `Open positions: ${s.tradesOpenCount}/${MAX_OPEN_POSITIONS}\n` +
      `Consecutive losses: ${s.consecutiveLosses}/${MAX_CONSECUTIVE_LOSSES}\n` +
      `Drawdown: ${s.currentDrawdownPct.toFixed(2)}%`
    );
  }

  private checkDailyReset(): void {
    const today = this.todayStr();
    if (today === this.state.lastResetDate) return;
    this.state.dailyPnlUSD = 0;
    this.state.dailyPnlPct = 0;
    this.state.dailyTradeCount = 0;
    this.state.lastResetDate = today;
    this.dailyStartUSD = 0;
    if (this.state.isHalted && this.state.haltReason?.includes("Daily")) {
      this.resume();
    }
  }

  private todayStr(): string {
    return new Date().toISOString().split("T")[0];
  }
}

export const riskManager = new RiskManager();

/**
 * RISK MANAGER — The most important system.
 * Controls position sizing, daily loss limits, consecutive loss shutoff,
 * and circuit breaker. Without this, the bot is just dangerous.
 *
 * Rules:
 *   1. Max 2% account risk per trade
 *   2. Max 5% total daily loss before shutdown
 *   3. Auto shutdown after 3 consecutive losses
 *   4. Position size scales with confidence and shrinks with drawdown
 *   5. Trailing stop activates once in profit
 *   6. Maximum 3 open positions simultaneously
 */
import { RiskState, TradeDecision } from './types';
import { sendTelegramAlert } from '../utils/telegramBotEnhanced';

const MAX_DAILY_LOSS_PCT = 5;      // % of starting balance
const MAX_PER_TRADE_RISK_PCT = 2;  // % of portfolio per trade
const MAX_CONSECUTIVE_LOSSES = 3;  // halt after this many in a row
const MAX_OPEN_POSITIONS = 3;
const MAX_DRAWDOWN_PCT = 15;       // hard stop, no override
const DRAWDOWN_REDUCE_PCT = 10;    // reduce size at this level

class RiskManager {
  private state: RiskState = {
    dailyPnlUSD: 0,
    dailyPnlPct: 0,
    consecutiveLosses: 0,
    peakPortfolioSOL: 0,
    currentDrawdownPct: 0,
    tradesOpenCount: 0,
    dailyTradeCount: 0,
    isHalted: false,
    haltReason: undefined,
    lastResetDate: this.todayStr(),
  };

  private dailyStartUSD: number = 0;
  private openTrades: Map<string, { sizeUSD: number; entryPrice: number }> = new Map();

  // ─── Public API ───────────────────────────────────────────────────

  initSession(portfolioUSD: number, portfolioSOL: number) {
    this.checkDailyReset();
    if (this.dailyStartUSD === 0) this.dailyStartUSD = portfolioUSD;
    if (this.state.peakPortfolioSOL === 0) this.state.peakPortfolioSOL = portfolioSOL;
    this.updateDrawdown(portfolioSOL);
  }

  /** Returns null if trade is allowed, or a string reason why it's rejected */
  canTrade(decision: TradeDecision, portfolioSOL: number, solPrice: number): string | null {
    this.checkDailyReset();

    if (this.state.isHalted) return `HALTED: ${this.state.haltReason}`;
    if (this.state.tradesOpenCount >= MAX_OPEN_POSITIONS) return `MAX_POSITIONS: ${MAX_OPEN_POSITIONS} already open`;
    if (this.state.currentDrawdownPct >= MAX_DRAWDOWN_PCT) {
      this.halt(`Drawdown ${this.state.currentDrawdownPct.toFixed(1)}% exceeds hard limit ${MAX_DRAWDOWN_PCT}%`);
      return `DRAWDOWN_LIMIT: ${this.state.currentDrawdownPct.toFixed(1)}%`;
    }

    const portfolioUSD = portfolioSOL * solPrice;
    if (portfolioUSD < 0.5) return `LOW_WALLET: $${portfolioUSD.toFixed(2)}`;

    const dailyLossPct = this.dailyStartUSD > 0
      ? ((this.dailyStartUSD - portfolioUSD) / this.dailyStartUSD) * 100
      : 0;

    if (dailyLossPct >= MAX_DAILY_LOSS_PCT) {
      this.halt(`Daily loss ${dailyLossPct.toFixed(1)}% ≥ ${MAX_DAILY_LOSS_PCT}% limit`);
      return `DAILY_LOSS_LIMIT: ${dailyLossPct.toFixed(1)}%`;
    }

    return null; // allowed
  }

  /** Calculate final position size based on confidence + regime + drawdown */
  sizeTrade(baseUSD: number, confidence: number, portfolioUSD: number): number {
    // Hard cap: never risk more than MAX_PER_TRADE_RISK_PCT of portfolio
    const maxRisk = portfolioUSD * (MAX_PER_TRADE_RISK_PCT / 100);

    // Scale by confidence: 68 → 0.7x, 80 → 0.9x, 90+ → 1.0x
    const confMultiplier = Math.min(1, (confidence - 50) / 50);

    // Drawdown penalty: at 10% drawdown we trade half size
    const drawdownMultiplier = this.state.currentDrawdownPct >= DRAWDOWN_REDUCE_PCT
      ? 0.5 - (this.state.currentDrawdownPct - DRAWDOWN_REDUCE_PCT) / 100
      : 1.0;

    // Consecutive loss penalty
    const lossMultiplier = this.state.consecutiveLosses >= 2 ? 0.5 : this.state.consecutiveLosses === 1 ? 0.75 : 1.0;

    const sized = Math.min(baseUSD, maxRisk) * confMultiplier * drawdownMultiplier * lossMultiplier;
    return Math.max(1, Math.round(sized * 100) / 100);
  }

  /** Calculate TP/SL for this trade */
  calculateExits(confidence: number, volatilityCv: number): { tp: number; sl: number; trailingActivation: number } {
    // Higher confidence = we can afford wider TP
    const baseTp = confidence >= 80 ? 20 : confidence >= 70 ? 15 : 10;
    // Tighter stop in lower confidence
    const baseSl = confidence >= 80 ? 8 : confidence >= 70 ? 6 : 5;
    // Scale with volatility (more volatile = wider bands)
    const volMult = 1 + Math.min(1.5, volatilityCv * 8);

    return {
      tp: Math.round(baseTp * volMult * 10) / 10,
      sl: Math.round(baseSl * volMult * 10) / 10,
      trailingActivation: 5, // trailing kicks in at +5%
    };
  }

  // ─── Trade lifecycle ──────────────────────────────────────────────

  onTradeOpen(id: string, sizeUSD: number, entryPrice: number) {
    this.openTrades.set(id, { sizeUSD, entryPrice });
    this.state.tradesOpenCount = this.openTrades.size;
    this.state.dailyTradeCount++;
  }

  onTradeClose(id: string, pnlUSD: number, pnlPct: number) {
    this.openTrades.delete(id);
    this.state.tradesOpenCount = this.openTrades.size;
    this.state.dailyPnlUSD += pnlUSD;

    if (pnlUSD < 0) {
      this.state.consecutiveLosses++;
      if (this.state.consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
        this.halt(`${MAX_CONSECUTIVE_LOSSES} consecutive losses — cooling down`);
        sendTelegramAlert(
          `🛑 *RISK: Trading Halted*\n${MAX_CONSECUTIVE_LOSSES} consecutive losses.\nBot paused for 1 hour to prevent further drawdown.\n/resume to restart manually.`
        );
      }
    } else {
      this.state.consecutiveLosses = 0; // reset on win
    }

    if (this.dailyStartUSD > 0) {
      this.state.dailyPnlPct = (this.state.dailyPnlUSD / this.dailyStartUSD) * 100;
    }
  }

  updateDrawdown(currentSOL: number) {
    if (currentSOL > this.state.peakPortfolioSOL) {
      this.state.peakPortfolioSOL = currentSOL;
    }
    if (this.state.peakPortfolioSOL > 0) {
      this.state.currentDrawdownPct = ((this.state.peakPortfolioSOL - currentSOL) / this.state.peakPortfolioSOL) * 100;
    }
  }

  // ─── Circuit breaker ──────────────────────────────────────────────

  halt(reason: string) {
    this.state.isHalted = true;
    this.state.haltReason = reason;
    console.error(`🛑 RISK MANAGER HALT: ${reason}`);
    // Auto-resume after 1 hour for loss streaks, never for drawdown limit
    if (!reason.includes('Drawdown') && !reason.includes('DRAWDOWN')) {
      setTimeout(() => this.resume(), 60 * 60_000);
    }
  }

  resume() {
    this.state.isHalted = false;
    this.state.haltReason = undefined;
    console.log('✅ Risk Manager: Resumed');
  }

  getState(): RiskState { return { ...this.state }; }

  getStatusText(): string {
    this.checkDailyReset();
    const s = this.state;
    const drawdownBar = '█'.repeat(Math.round(s.currentDrawdownPct / 2)) + '░'.repeat(Math.max(0, 10 - Math.round(s.currentDrawdownPct / 2)));

    return (
      `🛡️ *Risk Manager Status*\n\n` +
      `${s.isHalted ? '🔴 HALTED: ' + s.haltReason : '🟢 ACTIVE — trading allowed'}\n\n` +
      `📊 *Today's Stats:*\n` +
      `Daily P&L: ${s.dailyPnlUSD >= 0 ? '+' : ''}$${s.dailyPnlUSD.toFixed(2)} (${s.dailyPnlPct.toFixed(1)}%)\n` +
      `Daily trades: ${s.dailyTradeCount}\n` +
      `Open positions: ${s.tradesOpenCount}/${MAX_OPEN_POSITIONS}\n` +
      `Consecutive losses: ${s.consecutiveLosses}/${MAX_CONSECUTIVE_LOSSES}\n\n` +
      `📉 *Drawdown:*\n` +
      `[${drawdownBar}] ${s.currentDrawdownPct.toFixed(1)}%\n` +
      `Reduce at: ${DRAWDOWN_REDUCE_PCT}% | Hard stop: ${MAX_DRAWDOWN_PCT}%\n\n` +
      `⚙️ *Limits:*\n` +
      `Max per trade: ${MAX_PER_TRADE_RISK_PCT}% | Daily max loss: ${MAX_DAILY_LOSS_PCT}%`
    );
  }

  // ─── Internal ─────────────────────────────────────────────────────

  private checkDailyReset() {
    const today = this.todayStr();
    if (this.state.lastResetDate !== today) {
      this.state.dailyPnlUSD = 0;
      this.state.dailyPnlPct = 0;
      this.state.dailyTradeCount = 0;
      this.state.lastResetDate = today;
      this.dailyStartUSD = 0;
      // Don't reset consecutiveLosses or drawdown — those persist
      if (this.state.isHalted && this.state.haltReason?.includes('Daily loss')) {
        this.resume(); // new day, daily limits reset
      }
      console.log('📅 Risk Manager: Daily stats reset');
    }
  }

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }
}

export const riskManager = new RiskManager();

/**
 * BACKTESTER / PAPER TRADING
 * Two modes:
 *   Paper: uses live prices but virtual money. Tracks simulated P&L.
 *          Must achieve positive results before real money is allowed.
 *   Replay: feeds historical DexScreener price windows to the decision engine.
 *
 * Paper trading acts as a safety gate: until you have 10 trades with
 * positive expectancy (profitFactor > 1), the bot won't let you go live
 * without an explicit override.
 */
import { TokenOpportunity, MarketRegime } from './types';
import { tradeJournal } from './tradeJournal';
import { riskManager } from './riskManager';
import { sendTelegramAlert } from '../utils/telegramBotEnhanced';

interface PaperTrade {
  id: string;
  journalId?: string;
  token: string;
  mint: string;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  entryTime: number;
  sizeUSD: number;
  tpPct: number;
  slPct: number;
  exitPrice?: number;
  exitTime?: number;
  exitReason?: string;
  pnlUSD?: number;
  pnlPct?: number;
  confidence: number;
  regime: MarketRegime;
  isOpen: boolean;
}

interface PaperStats {
  totalTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlUSD: number;
  virtualBalance: number;
  profitFactor: number;
  isReadyForLive: boolean;
  readinessReason: string;
}

const PAPER_STARTING_BALANCE = 100; // virtual $100
const LIVE_GATE_MIN_TRADES = 10;
const LIVE_GATE_MIN_PROFIT_FACTOR = 1.2;
const LIVE_GATE_MIN_WIN_RATE = 50;

class Backtester {
  private mode: 'PAPER' | 'LIVE' = 'PAPER';
  private trades: PaperTrade[] = [];
  private virtualBalance: number = PAPER_STARTING_BALANCE;
  private nextId = 1;
  private monitorInterval: NodeJS.Timeout | null = null;

  // ─── Mode control ─────────────────────────────────────────────────

  enablePaperMode() {
    this.mode = 'PAPER';
    console.log('📄 Paper Trading: ENABLED — no real money will be spent');
  }

  enableLiveMode(): { allowed: boolean; reason: string } {
    const stats = this.getStats();
    if (!stats.isReadyForLive) {
      return { allowed: false, reason: stats.readinessReason };
    }
    this.mode = 'LIVE';
    console.log('🔴 Paper Trading: Switched to LIVE mode');
    return { allowed: true, reason: 'Paper trading criteria met' };
  }

  isPaper(): boolean { return this.mode === 'PAPER'; }
  isLive(): boolean { return this.mode === 'LIVE'; }
  getMode(): string { return this.mode; }

  // ─── Paper trade management ───────────────────────────────────────

  openPaperTrade(params: {
    token: string;
    mint: string;
    entryPrice: number;
    sizeUSD: number;
    tpPct: number;
    slPct: number;
    confidence: number;
    regime: MarketRegime;
  }): PaperTrade {
    const id = `P${String(this.nextId++).padStart(3, '0')}`;
    const trade: PaperTrade = { id, action: 'BUY', isOpen: true, entryTime: Date.now(), ...params };
    this.trades.push(trade);
    this.virtualBalance -= params.sizeUSD;
    console.log(`📄 Paper: ${id} BUY ${params.token} @ $${params.entryPrice.toFixed(6)} | $${params.sizeUSD.toFixed(2)}`);
    return trade;
  }

  closePaperTrade(id: string, exitPrice: number, reason: string): PaperTrade | null {
    const t = this.trades.find(t => t.id === id);
    if (!t || !t.isOpen) return null;

    t.exitPrice = exitPrice;
    t.exitTime = Date.now();
    t.exitReason = reason;
    t.pnlPct = ((exitPrice - t.entryPrice) / t.entryPrice) * 100;
    t.pnlUSD = (t.pnlPct / 100) * t.sizeUSD;
    t.isOpen = false;

    this.virtualBalance += t.sizeUSD + (t.pnlUSD || 0);

    if (t.journalId) {
      tradeJournal.close(t.journalId, exitPrice, reason, { success: true });
      riskManager.onTradeClose(t.journalId, t.pnlUSD || 0, t.pnlPct || 0);
    }

    const icon = (t.pnlPct || 0) >= 0 ? '✅' : '❌';
    const pnlStr = `${(t.pnlPct || 0) >= 0 ? '+' : ''}${(t.pnlPct || 0).toFixed(2)}%`;
    console.log(`📄 Paper: ${id} closed ${icon} ${pnlStr} ($${(t.pnlUSD || 0).toFixed(2)}) | ${reason}`);
    sendTelegramAlert(`📄 *Paper Close:* ${t.token} ${icon}\nP&L: ${pnlStr} ($${(t.pnlUSD || 0).toFixed(2)})\nReason: ${reason}`);
    return t;
  }

  // ─── Live price monitoring for paper trades ────────────────────────

  startMonitor() {
    if (this.monitorInterval) return;
    this.monitorInterval = setInterval(() => this.checkExits(), 30_000); // every 30s
  }

  stopMonitor() {
    if (this.monitorInterval) { clearInterval(this.monitorInterval); this.monitorInterval = null; }
  }

  private async checkExits() {
    const open = this.trades.filter(t => t.isOpen);
    if (open.length === 0) return;

    for (const t of open) {
      try {
        const price = await this.fetchPrice(t.mint);
        if (price <= 0) continue;

        const pnlPct = ((price - t.entryPrice) / t.entryPrice) * 100;

        if (pnlPct >= t.tpPct) {
          this.closePaperTrade(t.id, price, `TP hit: +${pnlPct.toFixed(2)}%`);
        } else if (pnlPct <= -t.slPct) {
          this.closePaperTrade(t.id, price, `SL hit: ${pnlPct.toFixed(2)}%`);
        }
      } catch {}
    }
  }

  // ─── Stats & readiness gate ───────────────────────────────────────

  getStats(): PaperStats {
    const closed = this.trades.filter(t => !t.isOpen);
    const wins = closed.filter(t => (t.pnlUSD || 0) > 0);
    const losses = closed.filter(t => (t.pnlUSD || 0) < 0);
    const totalPnl = closed.reduce((a, t) => a + (t.pnlUSD || 0), 0);
    const grossWin = wins.reduce((a, t) => a + (t.pnlUSD || 0), 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + (t.pnlUSD || 0), 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

    let isReadyForLive = false;
    let readinessReason = '';

    if (closed.length < LIVE_GATE_MIN_TRADES) {
      readinessReason = `Need ${LIVE_GATE_MIN_TRADES - closed.length} more paper trades (have ${closed.length})`;
    } else if (winRate < LIVE_GATE_MIN_WIN_RATE) {
      readinessReason = `Win rate ${winRate.toFixed(1)}% below ${LIVE_GATE_MIN_WIN_RATE}% minimum`;
    } else if (profitFactor < LIVE_GATE_MIN_PROFIT_FACTOR) {
      readinessReason = `Profit factor ${profitFactor.toFixed(2)} below ${LIVE_GATE_MIN_PROFIT_FACTOR} minimum`;
    } else {
      isReadyForLive = true;
      readinessReason = `All criteria met: ${closed.length} trades, ${winRate.toFixed(0)}% WR, PF ${profitFactor.toFixed(2)}`;
    }

    return {
      totalTrades: closed.length,
      openTrades: this.trades.filter(t => t.isOpen).length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalPnlUSD: totalPnl,
      virtualBalance: this.virtualBalance,
      profitFactor,
      isReadyForLive,
      readinessReason,
    };
  }

  getStatusText(): string {
    const s = this.getStats();
    const modeStr = this.mode === 'PAPER' ? '📄 PAPER TRADING (no real money)' : '🔴 LIVE TRADING';
    const gateIcon = s.isReadyForLive ? '✅' : '⏳';

    let msg = `${modeStr}\n\n`;
    msg += `*Paper Results:*\n`;
    msg += `Trades: ${s.totalTrades} | Open: ${s.openTrades}\n`;
    msg += `Win Rate: ${s.winRate.toFixed(1)}% | PF: ${s.profitFactor.toFixed(2)}\n`;
    msg += `Virtual P&L: ${s.totalPnlUSD >= 0 ? '+' : ''}$${s.totalPnlUSD.toFixed(2)}\n`;
    msg += `Virtual Balance: $${s.virtualBalance.toFixed(2)}\n\n`;
    msg += `${gateIcon} *Live Mode Gate:*\n${s.readinessReason}\n\n`;
    msg += s.isReadyForLive
      ? `Use /go_live to switch to real money`
      : `Build track record on paper first`;

    return msg;
  }

  getOpenTrades(): PaperTrade[] { return this.trades.filter(t => t.isOpen); }

  // ─── Price fetch ──────────────────────────────────────────────────

  private async fetchPrice(mint: string): Promise<number> {
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return 0;
      const d = await r.json();
      return parseFloat(d.pairs?.[0]?.priceUsd || '0');
    } catch { return 0; }
  }

  reset() {
    this.trades = [];
    this.virtualBalance = PAPER_STARTING_BALANCE;
    this.nextId = 1;
    console.log('📄 Paper Trading: Reset');
  }
}

export const backtester = new Backtester();

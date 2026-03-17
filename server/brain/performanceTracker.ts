/**
 * PERFORMANCE TRACKER
 * Real metrics: win rate, profit factor, Sharpe ratio, max drawdown,
 * per-regime breakdown, streak analysis. This tells you if the bot is actually
 * working or just feeling good while losing money.
 */
import { JournalEntry, PerformanceSummary, MarketRegime } from './types';

class PerformanceTracker {
  private equityCurve: { ts: number; value: number }[] = [];
  private startingCapital: number = 0;

  // ─── Public API ───────────────────────────────────────────────────

  setStartingCapital(usd: number) {
    if (this.startingCapital === 0) this.startingCapital = usd;
  }

  recordEquityPoint(valueUSD: number) {
    this.equityCurve.push({ ts: Date.now(), value: valueUSD });
    if (this.equityCurve.length > 10000) this.equityCurve.shift();
  }

  compute(entries: JournalEntry[]): PerformanceSummary {
    const closed = entries.filter(e => e.outcome !== 'OPEN' && e.pnlUSD !== undefined);

    if (closed.length === 0) {
      return this.emptySummary();
    }

    const wins = closed.filter(e => e.outcome === 'WIN');
    const losses = closed.filter(e => e.outcome === 'LOSS');

    const totalPnlUSD = closed.reduce((a, e) => a + (e.pnlUSD || 0), 0);
    const avgWinUSD = wins.length ? wins.reduce((a, e) => a + (e.pnlUSD || 0), 0) / wins.length : 0;
    const avgLossUSD = losses.length ? losses.reduce((a, e) => a + (e.pnlUSD || 0), 0) / losses.length : 0;
    const grossWin = wins.reduce((a, e) => a + (e.pnlUSD || 0), 0);
    const grossLoss = Math.abs(losses.reduce((a, e) => a + (e.pnlUSD || 0), 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

    const bestTrade = closed.reduce((best, e) => Math.max(best, e.pnlUSD || 0), -Infinity);
    const worstTrade = closed.reduce((worst, e) => Math.min(worst, e.pnlUSD || 0), Infinity);

    const maxDrawdownPct = this.computeMaxDrawdown(closed);
    const sharpeRatio = this.computeSharpe(closed);
    const { longestWinStreak, longestLossStreak } = this.computeStreaks(closed);
    const avgHoldTimeMs = closed.reduce((a, e) => a + (e.durationMs || 0), 0) / closed.length;
    const regimeBreakdown = this.computeRegimeBreakdown(closed);

    return {
      totalTrades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / closed.length) * 100,
      totalPnlUSD,
      avgWinUSD,
      avgLossUSD,
      profitFactor,
      maxDrawdownPct,
      sharpeRatio,
      bestTrade,
      worstTrade,
      longestWinStreak,
      longestLossStreak,
      avgHoldTimeMs,
      regimeBreakdown,
    };
  }

  formatReport(summary: PerformanceSummary): string {
    const pnlColor = summary.totalPnlUSD >= 0 ? '🟢' : '🔴';
    const pfColor = summary.profitFactor >= 1.5 ? '🟢' : summary.profitFactor >= 1 ? '🟡' : '🔴';
    const shColor = summary.sharpeRatio >= 1 ? '🟢' : summary.sharpeRatio >= 0 ? '🟡' : '🔴';
    const wrColor = summary.winRate >= 55 ? '🟢' : summary.winRate >= 45 ? '🟡' : '🔴';
    const avgHoldMin = (summary.avgHoldTimeMs / 60_000).toFixed(0);

    let report = `📊 *Performance Report*\n`;
    report += `${'─'.repeat(30)}\n`;
    report += `${pnlColor} Total P&L: ${summary.totalPnlUSD >= 0 ? '+' : ''}$${summary.totalPnlUSD.toFixed(2)}\n`;
    report += `${wrColor} Win Rate: ${summary.winRate.toFixed(1)}% (${summary.wins}W/${summary.losses}L)\n`;
    report += `${pfColor} Profit Factor: ${summary.profitFactor === Infinity ? '∞' : summary.profitFactor.toFixed(2)}\n`;
    report += `${shColor} Sharpe Ratio: ${summary.sharpeRatio.toFixed(2)}\n`;
    report += `\n📈 *Trade Stats:*\n`;
    report += `Avg Win: +$${summary.avgWinUSD.toFixed(2)} | Avg Loss: -$${Math.abs(summary.avgLossUSD).toFixed(2)}\n`;
    report += `Best: +$${summary.bestTrade.toFixed(2)} | Worst: $${summary.worstTrade.toFixed(2)}\n`;
    report += `Max Drawdown: ${summary.maxDrawdownPct.toFixed(1)}%\n`;
    report += `Avg Hold Time: ${avgHoldMin}m\n`;
    report += `Win Streak: ${summary.longestWinStreak} | Loss Streak: ${summary.longestLossStreak}\n`;
    report += `\n🌍 *By Regime:*\n`;
    for (const [regime, data] of Object.entries(summary.regimeBreakdown)) {
      if (data.trades > 0) {
        const icon = data.pnl >= 0 ? '🟢' : '🔴';
        report += `${icon} ${regime}: ${data.trades} trades | P&L: ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}\n`;
      }
    }
    report += `\n📝 Total Trades: ${summary.totalTrades}`;

    return report;
  }

  // ─── Analytics ────────────────────────────────────────────────────

  private computeMaxDrawdown(entries: JournalEntry[]): number {
    if (this.equityCurve.length < 2) {
      // Fallback: compute from closed trade PnL stream
      let peak = 0, dd = 0, running = 0;
      for (const e of entries) {
        running += e.pnlUSD || 0;
        if (running > peak) peak = running;
        const drawdown = peak > 0 ? ((peak - running) / peak) * 100 : 0;
        if (drawdown > dd) dd = drawdown;
      }
      return dd;
    }
    let peak = -Infinity, maxDD = 0;
    for (const p of this.equityCurve) {
      if (p.value > peak) peak = p.value;
      const dd = peak > 0 ? ((peak - p.value) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }

  private computeSharpe(entries: JournalEntry[]): number {
    if (entries.length < 3) return 0;
    const returns = entries.map(e => e.pnlPct || 0);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    return stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0; // annualised
  }

  private computeStreaks(entries: JournalEntry[]): { longestWinStreak: number; longestLossStreak: number } {
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
    for (const e of entries) {
      if (e.outcome === 'WIN') { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
      else if (e.outcome === 'LOSS') { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
      else { curWin = 0; curLoss = 0; }
    }
    return { longestWinStreak: maxWin, longestLossStreak: maxLoss };
  }

  private computeRegimeBreakdown(entries: JournalEntry[]): Record<MarketRegime, { trades: number; pnl: number }> {
    const regimes: MarketRegime[] = ['TREND_UP', 'TREND_DOWN', 'CHOP', 'MANIA', 'RISK_OFF'];
    const result = {} as Record<MarketRegime, { trades: number; pnl: number }>;
    for (const r of regimes) result[r] = { trades: 0, pnl: 0 };
    for (const e of entries) {
      const r = e.regime as MarketRegime;
      if (result[r]) { result[r].trades++; result[r].pnl += e.pnlUSD || 0; }
    }
    return result;
  }

  private emptySummary(): PerformanceSummary {
    const regimes: MarketRegime[] = ['TREND_UP', 'TREND_DOWN', 'CHOP', 'MANIA', 'RISK_OFF'];
    const regimeBreakdown = {} as Record<MarketRegime, { trades: number; pnl: number }>;
    for (const r of regimes) regimeBreakdown[r] = { trades: 0, pnl: 0 };
    return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnlUSD: 0, avgWinUSD: 0, avgLossUSD: 0, profitFactor: 0, maxDrawdownPct: 0, sharpeRatio: 0, bestTrade: 0, worstTrade: 0, longestWinStreak: 0, longestLossStreak: 0, avgHoldTimeMs: 0, regimeBreakdown };
  }
}

export const performanceTracker = new PerformanceTracker();

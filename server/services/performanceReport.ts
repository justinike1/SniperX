import type { TradeJournalEntry } from "./tradeJournal";

export interface PerformanceSummary {
  generatedAt: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  grossPnlUSD: number;
  netPnlUSD: number;
  drawdown: {
    maxDrawdownUSD: number;
    maxDrawdownPctFromPeak: number;
  };
  last10Trades: TradeJournalEntry[];
}

class PerformanceReportService {
  generate(entries: TradeJournalEntry[]): PerformanceSummary {
    const executed = entries.filter((entry) => entry.status === "EXECUTED");
    const pnlKnown = executed.filter((entry) => typeof entry.realizedPnlUSD === "number");

    const totalTrades = executed.length;
    const wins = pnlKnown.filter((entry) => (entry.realizedPnlUSD || 0) > 0).length;
    const losses = pnlKnown.filter((entry) => (entry.realizedPnlUSD || 0) < 0).length;
    const grossWinPnl = pnlKnown
      .filter((entry) => (entry.realizedPnlUSD || 0) > 0)
      .reduce((sum, entry) => sum + (entry.realizedPnlUSD || 0), 0);
    const grossLossPnl = Math.abs(
      pnlKnown
        .filter((entry) => (entry.realizedPnlUSD || 0) < 0)
        .reduce((sum, entry) => sum + (entry.realizedPnlUSD || 0), 0)
    );
    const totalFees = executed.reduce((sum, entry) => sum + (entry.feesUSD || 0), 0);
    const grossPnlUSD = grossWinPnl - grossLossPnl;
    const netPnlUSD = grossPnlUSD - totalFees;
    const winRatePct = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const drawdown = this.computeDrawdown(executed);
    const last10Trades = [...entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10);

    return {
      generatedAt: new Date().toISOString(),
      totalTrades,
      wins,
      losses,
      winRatePct: round2(winRatePct),
      grossPnlUSD: round2(grossPnlUSD),
      netPnlUSD: round2(netPnlUSD),
      drawdown,
      last10Trades,
    };
  }

  private computeDrawdown(entries: TradeJournalEntry[]): {
    maxDrawdownUSD: number;
    maxDrawdownPctFromPeak: number;
  } {
    if (!entries.length) {
      return { maxDrawdownUSD: 0, maxDrawdownPctFromPeak: 0 };
    }

    let equity = 0;
    let peak = 0;
    let maxDrawdownUSD = 0;
    let maxDrawdownPctFromPeak = 0;

    const byTime = [...entries].sort((a, b) => a.updatedAt - b.updatedAt);
    for (const entry of byTime) {
      equity += entry.realizedPnlUSD || 0;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
      if (dd > maxDrawdownUSD) maxDrawdownUSD = dd;
      if (ddPct > maxDrawdownPctFromPeak) maxDrawdownPctFromPeak = ddPct;
    }

    return {
      maxDrawdownUSD: round2(maxDrawdownUSD),
      maxDrawdownPctFromPeak: round2(maxDrawdownPctFromPeak),
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export const performanceReport = new PerformanceReportService();

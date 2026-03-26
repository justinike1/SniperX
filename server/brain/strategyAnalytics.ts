import { JournalEntry, ScoreBreakdown } from "./types";

interface BucketStat {
  trades: number;
  wins: number;
  losses: number;
  pnlUSD: number;
}

class StrategyAnalytics {
  summarize(entries: JournalEntry[]): {
    scoreRanges: Record<string, BucketStat>;
    liquidityRanges: Record<string, BucketStat>;
    exitReasons: Record<string, BucketStat>;
    regimes: Record<string, BucketStat>;
    weightHints: string[];
  } {
    const closed = entries.filter((e) => e.outcome !== "OPEN" && typeof e.pnlUSD === "number");
    const scoreRanges: Record<string, BucketStat> = {};
    const liquidityRanges: Record<string, BucketStat> = {};
    const exitReasons: Record<string, BucketStat> = {};
    const regimes: Record<string, BucketStat> = {};

    for (const e of closed) {
      const score =
        e.analytics?.score ??
        this.inferScoreFromBreakdown(e.breakdown) ??
        e.confidence;
      const scoreKey = this.bucketScore(score);
      this.bump(scoreRanges, scoreKey, e.pnlUSD || 0);

      const liq = e.analytics?.liquidity ?? 0;
      const liqKey = this.bucketLiquidity(liq);
      this.bump(liquidityRanges, liqKey, e.pnlUSD || 0);

      const exitKey = (e.exitReason || "UNKNOWN").toUpperCase();
      this.bump(exitReasons, exitKey, e.pnlUSD || 0);

      this.bump(regimes, e.regime, e.pnlUSD || 0);
    }

    return {
      scoreRanges,
      liquidityRanges,
      exitReasons,
      regimes,
      weightHints: this.deriveWeightHints(scoreRanges, liquidityRanges, regimes),
    };
  }

  private inferScoreFromBreakdown(b: Partial<ScoreBreakdown>): number | null {
    if (!b) return null;
    const keys: (keyof ScoreBreakdown)[] = [
      "trend",
      "momentum",
      "volume",
      "liquidity",
      "volatility",
      "slippage",
      "tokenSafety",
      "regime",
    ];
    const values = keys.map((k) => b[k]).filter((v) => typeof v === "number") as number[];
    if (!values.length) return null;
    return Math.round(values.reduce((a, b) => a + b, 0));
  }

  private bump(target: Record<string, BucketStat>, key: string, pnl: number): void {
    if (!target[key]) {
      target[key] = { trades: 0, wins: 0, losses: 0, pnlUSD: 0 };
    }
    target[key].trades += 1;
    target[key].pnlUSD += pnl;
    if (pnl > 0) target[key].wins += 1;
    else if (pnl < 0) target[key].losses += 1;
  }

  private bucketScore(score: number): string {
    if (score < 55) return "<55";
    if (score < 65) return "55-64";
    if (score < 75) return "65-74";
    if (score < 85) return "75-84";
    return "85+";
  }

  private bucketLiquidity(liq: number): string {
    if (liq < 25_000) return "<25k";
    if (liq < 75_000) return "25k-74k";
    if (liq < 200_000) return "75k-199k";
    if (liq < 500_000) return "200k-499k";
    return "500k+";
  }

  private deriveWeightHints(
    scoreRanges: Record<string, BucketStat>,
    liquidityRanges: Record<string, BucketStat>,
    regimes: Record<string, BucketStat>
  ): string[] {
    const hints: string[] = [];
    const badLowScore = scoreRanges["55-64"] && scoreRanges["55-64"].pnlUSD < 0;
    if (badLowScore) {
      hints.push("Raise minimum score threshold or reduce sizing for 55-64 scores.");
    }
    const badLowLiq = liquidityRanges["25k-74k"] && liquidityRanges["25k-74k"].pnlUSD < 0;
    if (badLowLiq) {
      hints.push("Increase minimum liquidity requirement or penalize thin pools more.");
    }
    const riskOff = regimes["RISK_OFF"] && regimes["RISK_OFF"].pnlUSD < 0;
    if (riskOff) {
      hints.push("Further cut entries in RISK_OFF regime; prioritize capital protection.");
    }
    if (!hints.length) {
      hints.push("No strong negative cluster yet; keep collecting closed-trade samples.");
    }
    return hints;
  }
}

export const strategyAnalytics = new StrategyAnalytics();

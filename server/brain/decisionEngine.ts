/**
 * DECISION ENGINE — The Brain
 * Scores every opportunity 0-100 using 8 weighted categories.
 * Only allows trades above a configurable threshold (default 68).
 *
 * Score breakdown (max 100):
 *   Trend        15 — price direction, MA alignment
 *   Momentum     15 — rate of change acceleration
 *   Volume       15 — volume vs baseline and expanding/contracting
 *   Liquidity    15 — pool depth vs trade size
 *   Volatility   10 — punishes extreme swings
 *   Slippage     10 — price impact for this trade size
 *   Token Safety 10 — safety filter score (0-10 → 0-10)
 *   Regime        10 — market backdrop bonus/penalty
 */
import { TokenOpportunity, ScoredOpportunity, ScoreBreakdown, TradeDecision, MarketRegime } from './types';
import { safetyFilters } from './safetyFilters';
import { regimeDetector } from './regimeDetector';
import { marketScanner } from './marketScanner';

const TRADE_THRESHOLD = 68;  // score required to allow entry
const WATCH_THRESHOLD = 48;  // score to worth monitoring

class DecisionEngine {
  private threshold: number = TRADE_THRESHOLD;

  // ─── Public API ───────────────────────────────────────────────────

  setThreshold(t: number) { this.threshold = Math.max(30, Math.min(95, t)); }
  getThreshold(): number { return this.threshold; }

  async score(opp: TokenOpportunity, tradeUSD: number = 10): Promise<ScoredOpportunity> {
    const [safetyReport, regimeReading] = await Promise.all([
      safetyFilters.check(opp, tradeUSD),
      regimeDetector.getRegime(),
    ]);

    const notes: string[] = [];
    const breakdown = this.buildBreakdown(opp, tradeUSD, safetyReport.score, regimeReading.regime, regimeReading.confidence, notes);
    const score = this.sumBreakdown(breakdown);
    const mods = regimeDetector.getStrategyModifiers(regimeReading.regime);

    let recommendation: 'TRADE' | 'WATCH' | 'REJECT' = 'REJECT';
    if (!safetyReport.passed) {
      notes.push(...safetyReport.flags);
      recommendation = 'REJECT';
    } else if (score >= this.threshold && mods.allowNewEntries) {
      recommendation = 'TRADE';
    } else if (score >= WATCH_THRESHOLD) {
      recommendation = 'WATCH';
      if (!mods.allowNewEntries) notes.push(`Regime ${regimeReading.regime} — no new entries`);
    }

    if (safetyReport.warnings.length) notes.push(...safetyReport.warnings);

    return { ...opp, score, breakdown, recommendation, notes };
  }

  async decide(opp: TokenOpportunity, portfolioUSD: number): Promise<TradeDecision> {
    const regimeReading = await regimeDetector.getRegime();
    const mods = regimeDetector.getStrategyModifiers(regimeReading.regime);

    // Base trade size: 1% of portfolio, capped at $50 for now
    const baseSize = Math.min(portfolioUSD * 0.01, 50);
    const tradeUSD = Math.max(1, baseSize);

    const scored = await this.score(opp, tradeUSD);

    if (scored.recommendation !== 'TRADE') {
      return {
        action: 'PASS',
        token: opp.token,
        mint: opp.mint,
        confidence: scored.score,
        sizeUSD: 0,
        takeProfitPct: 0,
        stopLossPct: 0,
        trailingStopActivationPct: 0,
        reason: scored.notes[0] || `Score ${scored.score} below threshold ${this.threshold}`,
        signals: scored.notes,
        regime: regimeReading.regime,
        timestamp: Date.now(),
      };
    }

    // Size = base * regime multiplier * confidence boost
    const confidenceBoost = scored.score >= 80 ? 1.2 : scored.score >= 75 ? 1.1 : 1.0;
    const sizeUSD = Math.max(1, tradeUSD * mods.sizeMultiplier * confidenceBoost);

    // TP/SL scale with regime and volatility
    const volatility = marketScanner.getVolatility(opp.mint);
    const baseTP = 15; // 15% default take profit
    const baseSL = 8;  // 8% default stop loss
    const volMultiplier = 1 + Math.min(2, volatility * 10); // high vol = wider TP/SL
    const takeProfitPct = baseTP * mods.tpMultiplier * volMultiplier;
    const stopLossPct = baseSL * mods.slMultiplier;
    const trailingStopActivationPct = 5; // trailing activates at +5% profit

    const signals = [
      `Score: ${scored.score}/100`,
      `Regime: ${regimeReading.regime}`,
      ...Object.entries(scored.breakdown).map(([k, v]) => `${k}: ${v}`),
    ];

    return {
      action: 'BUY',
      token: opp.token,
      mint: opp.mint,
      confidence: scored.score,
      sizeUSD,
      takeProfitPct,
      stopLossPct,
      trailingStopActivationPct,
      reason: `${scored.score}/100 confidence — ${regimeReading.regime} regime`,
      signals,
      regime: regimeReading.regime,
      timestamp: Date.now(),
    };
  }

  // Explain a score for Telegram
  async explain(opp: TokenOpportunity): Promise<string> {
    const scored = await this.score(opp, 10);
    const emoji = scored.score >= this.threshold ? '✅' : scored.score >= WATCH_THRESHOLD ? '👀' : '❌';
    const b = scored.breakdown;
    return (
      `${emoji} *${opp.token} — Score: ${scored.score}/100* (threshold: ${this.threshold})\n\n` +
      `📊 *Breakdown:*\n` +
      `Trend: ${b.trend}/15 | Momentum: ${b.momentum}/15\n` +
      `Volume: ${b.volume}/15 | Liquidity: ${b.liquidity}/15\n` +
      `Volatility: ${b.volatility}/10 | Slippage: ${b.slippage}/10\n` +
      `Safety: ${b.tokenSafety}/10 | Regime: ${b.regime}/10\n\n` +
      `📝 *Notes:*\n${scored.notes.slice(0, 5).map(n => `• ${n}`).join('\n') || 'Clean'}\n\n` +
      `🎯 *Verdict: ${scored.recommendation}*`
    );
  }

  // ─── Scoring logic ────────────────────────────────────────────────

  private buildBreakdown(
    opp: TokenOpportunity,
    tradeUSD: number,
    safetyScore: number,
    regime: MarketRegime,
    regimeConfidence: number,
    notes: string[]
  ): ScoreBreakdown {
    return {
      trend: this.scoreTrend(opp, notes),
      momentum: this.scoreMomentum(opp, notes),
      volume: this.scoreVolume(opp, notes),
      liquidity: this.scoreLiquidity(opp, tradeUSD, notes),
      volatility: this.scoreVolatility(opp, notes),
      slippage: this.scoreSlippage(opp, tradeUSD, notes),
      tokenSafety: safetyScore,
      regime: this.scoreRegime(regime, regimeConfidence, notes),
    };
  }

  private sumBreakdown(b: ScoreBreakdown): number {
    return Math.round(b.trend + b.momentum + b.volume + b.liquidity + b.volatility + b.slippage + b.tokenSafety + b.regime);
  }

  // Trend (0-15): is price moving in a consistent direction?
  private scoreTrend(opp: TokenOpportunity, notes: string[]): number {
    const c1h = opp.priceChange1h;
    const c24h = opp.priceChange24h;
    // Perfect: both positive and aligned
    if (c1h > 2 && c24h > 5) { notes.push('Strong uptrend'); return 15; }
    if (c1h > 0 && c24h > 0) { return 12; }
    if (c1h > 0 && c24h < 0) { notes.push('1h recovery in downtrend'); return 7; }
    if (c1h < 0 && c24h > 5) { notes.push('Pulling back in uptrend'); return 8; }
    if (c1h < -5) { notes.push('Sharp 1h drop'); return 2; }
    return 5;
  }

  // Momentum (0-15): acceleration of price change
  private scoreMomentum(opp: TokenOpportunity, notes: string[]): number {
    const c5m = opp.priceChange5m;
    const c1h = opp.priceChange1h;
    // Accelerating up
    if (c5m > 3 && c1h > 5) { notes.push(`Hot momentum: +${c5m.toFixed(1)}% 5m`); return 15; }
    if (c5m > 1 && c1h > 2) return 12;
    if (c5m > 0 && c1h > 0) return 9;
    if (c5m > 0 && c1h <= 0) return 6;
    if (c5m < -3) { notes.push('Selling momentum'); return 2; }
    return 4;
  }

  // Volume (0-15): is there money behind this move?
  private scoreVolume(opp: TokenOpportunity, notes: string[]): number {
    const vol = opp.volume24h;
    if (vol > 1_000_000) { notes.push(`High volume: $${(vol/1e6).toFixed(1)}M`); return 15; }
    if (vol > 500_000) return 13;
    if (vol > 100_000) return 10;
    if (vol > 50_000) return 8;
    if (vol > 10_000) return 5;
    notes.push(`Low volume: $${vol.toFixed(0)}`);
    return 2;
  }

  // Liquidity (0-15): can we exit without destroying price?
  private scoreLiquidity(opp: TokenOpportunity, tradeUSD: number, notes: string[]): number {
    const liq = opp.liquidity;
    if (liq <= 0) { notes.push('Zero liquidity'); return 0; }
    const tradeToPool = tradeUSD / liq;
    if (tradeToPool > 0.05) { notes.push(`Trade is ${(tradeToPool*100).toFixed(1)}% of pool`); return 3; }
    if (liq > 500_000) return 15;
    if (liq > 200_000) return 13;
    if (liq > 100_000) return 11;
    if (liq > 50_000) return 8;
    if (liq > 25_000) return 5;
    return 2;
  }

  // Volatility (0-10): high vol is risk, not reward
  private scoreVolatility(opp: TokenOpportunity, notes: string[]): number {
    const c1h = Math.abs(opp.priceChange1h);
    const c24h = Math.abs(opp.priceChange24h);
    const avg = (c1h + c24h / 24) / 2;

    // Ideal: 2-8% moves. Penalise flat (no action) AND extreme (uncontrollable)
    if (avg < 1) { notes.push('Very low volatility'); return 5; }
    if (avg < 3) return 10;
    if (avg < 8) return 9;
    if (avg < 15) return 7;
    if (avg < 30) { notes.push(`High volatility: ${avg.toFixed(0)}% avg`); return 4; }
    notes.push(`Extreme volatility: ${avg.toFixed(0)}%`);
    return 1;
  }

  // Slippage (0-10): estimated from liquidity depth
  private scoreSlippage(opp: TokenOpportunity, tradeUSD: number, notes: string[]): number {
    if (opp.liquidity <= 0) { notes.push('No liquidity for slippage estimate'); return 0; }
    const estimatedImpact = (tradeUSD / (opp.liquidity * 2)) * 100;
    if (estimatedImpact < 0.1) return 10;
    if (estimatedImpact < 0.3) return 9;
    if (estimatedImpact < 0.5) return 8;
    if (estimatedImpact < 1.0) { notes.push(`Est. slippage ${estimatedImpact.toFixed(2)}%`); return 6; }
    if (estimatedImpact < 2.0) { notes.push(`High slippage ${estimatedImpact.toFixed(2)}%`); return 3; }
    notes.push(`Severe slippage ${estimatedImpact.toFixed(2)}%`);
    return 1;
  }

  // Regime (0-10): market backdrop bonus/penalty
  private scoreRegime(regime: MarketRegime, confidence: number, notes: string[]): number {
    const mods = regimeDetector.getStrategyModifiers(regime);
    const base = 5 + mods.scoreBonus / 2;
    return Math.max(0, Math.min(10, Math.round(base * 10) / 10));
  }
}

export const decisionEngine = new DecisionEngine();

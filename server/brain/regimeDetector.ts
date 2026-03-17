/**
 * REGIME DETECTOR
 * Determines the current market backdrop. Every strategy adapts based on regime.
 *
 * Regimes:
 *   TREND_UP   → Momentum strategies. Ride the wave.
 *   TREND_DOWN → No longs. Reduce exposure. Cash is a position.
 *   CHOP       → Range strategies only. Tighter stops. Smaller size.
 *   MANIA      → Extreme euphoria. Take profits fast. Risk of reversal.
 *   RISK_OFF   → Macro fear. No new entries. Protect capital.
 */
import { MarketRegime } from './types';

interface RegimeReading {
  regime: MarketRegime;
  confidence: number;    // 0-100 how certain we are
  signals: string[];
  solPrice: number;
  solChange1h: number;
  solChange24h: number;
  fearGreed: number;
  volumeTrend: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL';
  updatedAt: number;
}

interface PricePoint { price: number; ts: number; }

class RegimeDetector {
  private current: RegimeReading | null = null;
  private priceHistory: PricePoint[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly TTL = 5 * 60_000; // 5 minutes cache

  // ─── Public API ───────────────────────────────────────────────────

  async getRegime(): Promise<RegimeReading> {
    if (this.current && Date.now() - this.current.updatedAt < this.TTL) {
      return this.current;
    }
    return this.detect();
  }

  start() {
    if (this.updateInterval) return;
    this.detect();
    this.updateInterval = setInterval(() => this.detect(), this.TTL);
    console.log('🌍 Regime Detector: Started');
  }

  stop() {
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
  }

  // ─── Strategy modifiers per regime ───────────────────────────────

  getStrategyModifiers(regime: MarketRegime): {
    sizeMultiplier: number;
    tpMultiplier: number;
    slMultiplier: number;
    allowNewEntries: boolean;
    scoreBonus: number;
  } {
    switch (regime) {
      case 'TREND_UP':   return { sizeMultiplier: 1.0, tpMultiplier: 1.5, slMultiplier: 1.0, allowNewEntries: true, scoreBonus: 8 };
      case 'CHOP':       return { sizeMultiplier: 0.5, tpMultiplier: 0.7, slMultiplier: 0.8, allowNewEntries: true, scoreBonus: -5 };
      case 'MANIA':      return { sizeMultiplier: 0.6, tpMultiplier: 0.5, slMultiplier: 1.5, allowNewEntries: true, scoreBonus: -3 };
      case 'TREND_DOWN': return { sizeMultiplier: 0.3, tpMultiplier: 1.0, slMultiplier: 1.2, allowNewEntries: false, scoreBonus: -15 };
      case 'RISK_OFF':   return { sizeMultiplier: 0.0, tpMultiplier: 1.0, slMultiplier: 1.5, allowNewEntries: false, scoreBonus: -20 };
    }
  }

  // ─── Detection logic ──────────────────────────────────────────────

  private async detect(): Promise<RegimeReading> {
    const signals: string[] = [];
    let solPrice = 0, solChange1h = 0, solChange24h = 0, fearGreed = 50;
    let volumeTrend: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL' = 'NEUTRAL';

    try {
      // SOL price data from DexScreener
      const solData = await this.fetchSolData();
      solPrice = solData.price;
      solChange1h = solData.change1h;
      solChange24h = solData.change24h;
      volumeTrend = solData.volumeTrend;

      // Fear & Greed
      fearGreed = await this.fetchFearGreed();

      // Record for trend calculation
      this.priceHistory.push({ price: solPrice, ts: Date.now() });
      if (this.priceHistory.length > 48) this.priceHistory.shift(); // keep 4h of 5min data
    } catch {}

    // ── Regime classification ──────────────────────────────────────
    let regime: MarketRegime;
    let confidence = 50;

    const isExtremeFear = fearGreed <= 20;
    const isExtremeGreed = fearGreed >= 80;
    const strongUp = solChange24h > 5 && solChange1h > 0;
    const strongDown = solChange24h < -5 && solChange1h < 0;
    const choppyRange = Math.abs(solChange24h) < 2;
    const maniaSignal = solChange1h > 5 || (isExtremeGreed && solChange1h > 2);
    const riskOffSignal = solChange24h < -10 || (isExtremeFear && solChange1h < -3);

    if (riskOffSignal) {
      regime = 'RISK_OFF';
      confidence = 80 + Math.min(20, Math.abs(solChange24h));
      signals.push(`SOL down ${solChange24h.toFixed(1)}% / Fear & Greed: ${fearGreed}`);
    } else if (maniaSignal) {
      regime = 'MANIA';
      confidence = 70 + Math.min(20, solChange1h * 2);
      signals.push(`SOL +${solChange1h.toFixed(1)}% in 1h (euphoria spike)`);
    } else if (strongDown) {
      regime = 'TREND_DOWN';
      confidence = 60 + Math.min(30, Math.abs(solChange24h));
      signals.push(`SOL down ${solChange24h.toFixed(1)}% over 24h`);
    } else if (strongUp) {
      regime = 'TREND_UP';
      confidence = 60 + Math.min(30, solChange24h);
      signals.push(`SOL up ${solChange24h.toFixed(1)}% over 24h`);
    } else {
      regime = 'CHOP';
      confidence = 55;
      signals.push(`SOL ${solChange24h.toFixed(1)}% — ranging`);
    }

    // Confidence adjustments
    if (volumeTrend === 'EXPANDING' && (regime === 'TREND_UP' || regime === 'TREND_DOWN')) confidence = Math.min(100, confidence + 10);
    if (volumeTrend === 'CONTRACTING') confidence = Math.max(30, confidence - 10);
    if (isExtremeFear && regime !== 'RISK_OFF') signals.push(`Fear & Greed ${fearGreed} — extreme fear`);
    if (isExtremeGreed && regime !== 'MANIA') signals.push(`Fear & Greed ${fearGreed} — extreme greed`);

    this.current = { regime, confidence, signals, solPrice, solChange1h, solChange24h, fearGreed, volumeTrend, updatedAt: Date.now() };

    const emoji = { TREND_UP: '📈', TREND_DOWN: '📉', CHOP: '↔️', MANIA: '🔥', RISK_OFF: '🛡️' }[regime];
    console.log(`🌍 Regime: ${emoji} ${regime} (${confidence}% confidence) | SOL: $${solPrice.toFixed(2)} | F&G: ${fearGreed}`);

    return this.current;
  }

  private async fetchSolData(): Promise<{ price: number; change1h: number; change24h: number; volumeTrend: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL' }> {
    const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112', { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { price: 0, change1h: 0, change24h: 0, volumeTrend: 'NEUTRAL' };
    const data = await r.json();
    const pair = (data.pairs || []).find((p: any) => p.chainId === 'solana' && p.quoteToken?.symbol === 'USDC') || data.pairs?.[0];
    if (!pair) return { price: 0, change1h: 0, change24h: 0, volumeTrend: 'NEUTRAL' };

    const price = parseFloat(pair.priceUsd || '0');
    const change1h = parseFloat(pair.priceChange?.h1 || '0');
    const change24h = parseFloat(pair.priceChange?.h24 || '0');
    const vol24h = parseFloat(pair.volume?.h24 || '0');
    const vol6h = parseFloat(pair.volume?.h6 || '0');
    const volRate = vol6h * 4; // annualize 6h to 24h
    const volumeTrend: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL' = volRate > vol24h * 1.2 ? 'EXPANDING' : volRate < vol24h * 0.8 ? 'CONTRACTING' : 'NEUTRAL';

    return { price, change1h, change24h, volumeTrend };
  }

  private async fetchFearGreed(): Promise<number> {
    try {
      const r = await fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return 50;
      const d = await r.json();
      return parseInt(d?.data?.[0]?.value || '50');
    } catch { return 50; }
  }
}

export const regimeDetector = new RegimeDetector();

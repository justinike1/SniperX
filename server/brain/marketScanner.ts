/**
 * MARKET SCANNER
 * Continuously watches price momentum, volume spikes, liquidity, wallet activity,
 * and volatility across Solana tokens. Its only job is to surface opportunities.
 */
import { TokenOpportunity } from './types';

interface ScanResult {
  opportunities: TokenOpportunity[];
  scannedAt: number;
  tokenCount: number;
}

interface PriceSnapshot {
  price: number;
  timestamp: number;
}

class MarketScanner {
  private priceHistory: Map<string, PriceSnapshot[]> = new Map();
  private lastScan: ScanResult | null = null;
  private scanInterval: NodeJS.Timeout | null = null;
  private readonly HISTORY_WINDOW = 12; // keep last 12 snapshots
  private readonly SOLANA_CHAIN = 'solana';

  // ─── Public API ───────────────────────────────────────────────────

  start(onOpportunity?: (opp: TokenOpportunity) => void) {
    if (this.scanInterval) return;
    console.log('🔍 Market Scanner: Started (30s interval)');
    this.runScan(onOpportunity);
    this.scanInterval = setInterval(() => this.runScan(onOpportunity), 30_000);
  }

  stop() {
    if (this.scanInterval) { clearInterval(this.scanInterval); this.scanInterval = null; }
    console.log('🔍 Market Scanner: Stopped');
  }

  getLastScan(): ScanResult | null { return this.lastScan; }

  async scanNow(): Promise<ScanResult> { return this.runScan(); }

  // Force-inject a manual opportunity (from sniper or whale alert)
  injectOpportunity(opp: TokenOpportunity): void {
    if (!this.lastScan) {
      this.lastScan = { opportunities: [], scannedAt: Date.now(), tokenCount: 0 };
    }
    const existing = this.lastScan.opportunities.findIndex(o => o.mint === opp.mint);
    if (existing >= 0) this.lastScan.opportunities[existing] = opp;
    else this.lastScan.opportunities.push(opp);
  }

  // ─── Volatility helper ────────────────────────────────────────────

  getVolatility(mint: string): number {
    const snaps = this.priceHistory.get(mint) || [];
    if (snaps.length < 3) return 0;
    const prices = snaps.map(s => s.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, p) => a + Math.pow(p - mean, 2), 0) / prices.length;
    return Math.sqrt(variance) / mean; // coefficient of variation
  }

  getMomentum(mint: string): number {
    const snaps = this.priceHistory.get(mint) || [];
    if (snaps.length < 2) return 0;
    const oldest = snaps[0].price;
    const newest = snaps[snaps.length - 1].price;
    return oldest > 0 ? (newest - oldest) / oldest : 0;
  }

  // ─── Core scan ────────────────────────────────────────────────────

  private async runScan(onOpportunity?: (opp: TokenOpportunity) => void): Promise<ScanResult> {
    const opportunities: TokenOpportunity[] = [];

    try {
      const [trending, boosted] = await Promise.allSettled([
        this.fetchTrending(),
        this.fetchBoosted(),
      ]);

      const allTokens: any[] = [];
      if (trending.status === 'fulfilled') allTokens.push(...trending.value);
      if (boosted.status === 'fulfilled') allTokens.push(...boosted.value);

      // Deduplicate by mint
      const seen = new Set<string>();
      for (const raw of allTokens) {
        const mint = raw.baseToken?.address;
        if (!mint || seen.has(mint)) continue;
        seen.add(mint);

        const opp = this.parseToken(raw);
        if (!opp) continue;

        // Update price history for volatility/momentum
        this.recordPrice(mint, opp.price);

        // Minimal pre-filter — scanner just finds, doesn't judge deeply
        if (opp.liquidity < 5000) continue;       // no ghost pools
        if (opp.volume24h < 1000) continue;        // no dead tokens

        opportunities.push(opp);
        onOpportunity?.(opp);
      }
    } catch (e: any) {
      console.error('Market Scanner error:', e.message);
    }

    this.lastScan = { opportunities, scannedAt: Date.now(), tokenCount: opportunities.length };
    return this.lastScan;
  }

  private async fetchTrending(): Promise<any[]> {
    const r = await fetch('https://api.dexscreener.com/token-boosts/latest/v1', { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data.filter((t: any) => t.chainId === this.SOLANA_CHAIN) : [];
  }

  private async fetchBoosted(): Promise<any[]> {
    const r = await fetch('https://api.dexscreener.com/latest/dex/search?q=trending&chain=solana', { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.pairs || []).filter((p: any) => p.chainId === this.SOLANA_CHAIN);
  }

  private parseToken(raw: any): TokenOpportunity | null {
    try {
      const price = parseFloat(raw.priceUsd || raw.baseToken?.priceUsd || '0');
      const liquidity = parseFloat(raw.liquidity?.usd || raw.liquidityUsd || '0');
      const volume24h = parseFloat(raw.volume?.h24 || raw.volume24h || '0');
      const mint = raw.baseToken?.address || raw.tokenAddress || raw.address;
      const symbol = raw.baseToken?.symbol || raw.symbol || '???';
      const pairAddress = raw.pairAddress || raw.address || mint;

      if (!mint || !price) return null;

      return {
        token: symbol,
        mint,
        price,
        priceChange5m: parseFloat(raw.priceChange?.m5 || '0'),
        priceChange1h: parseFloat(raw.priceChange?.h1 || '0'),
        priceChange24h: parseFloat(raw.priceChange?.h24 || '0'),
        volume24h,
        liquidity,
        fdv: parseFloat(raw.fdv || '0'),
        pairAddress,
        dexId: raw.dexId,
        source: 'scanner',
        timestamp: Date.now(),
      };
    } catch { return null; }
  }

  private recordPrice(mint: string, price: number) {
    if (!this.priceHistory.has(mint)) this.priceHistory.set(mint, []);
    const snaps = this.priceHistory.get(mint)!;
    snaps.push({ price, timestamp: Date.now() });
    if (snaps.length > this.HISTORY_WINDOW) snaps.shift();
  }
}

export const marketScanner = new MarketScanner();

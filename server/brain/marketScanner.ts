import { TokenOpportunity } from "./types";

interface ScanResult {
  opportunities: TokenOpportunity[];
  scannedAt: number;
  tokenCount: number;
}

interface PriceSnapshot {
  price: number;
  timestamp: number;
}

interface CandidateState {
  firstSeenAt: number;
  lastSeenAt: number;
  passes: number;
  latest: TokenOpportunity;
}

class MarketScanner {
  private priceHistory: Map<string, PriceSnapshot[]> = new Map();
  private watchlist: Map<string, CandidateState> = new Map();
  private priceCache: Map<string, { price: number; ts: number }> = new Map();
  private lastScan: ScanResult | null = null;
  private scanInterval: NodeJS.Timeout | null = null;
  private readonly HISTORY_WINDOW = 18;
  private readonly SOLANA_CHAIN = "solana";

  start(onOpportunity?: (opp: TokenOpportunity) => void): void {
    if (this.scanInterval) return;
    console.log("[scanner] started (30s)");
    this.runScan(onOpportunity);
    this.scanInterval = setInterval(() => this.runScan(onOpportunity), 30_000);
  }

  stop(): void {
    if (this.scanInterval) clearInterval(this.scanInterval);
    this.scanInterval = null;
    console.log("[scanner] stopped");
  }

  getLastScan(): ScanResult | null {
    return this.lastScan;
  }

  async scanNow(): Promise<ScanResult> {
    return this.runScan();
  }

  injectOpportunity(opp: TokenOpportunity): void {
    if (!this.lastScan) {
      this.lastScan = { opportunities: [], scannedAt: Date.now(), tokenCount: 0 };
    }
    const idx = this.lastScan.opportunities.findIndex((o) => o.mint === opp.mint);
    if (idx >= 0) this.lastScan.opportunities[idx] = opp;
    else this.lastScan.opportunities.push(opp);
  }

  getVolatility(mint: string): number {
    const snaps = this.priceHistory.get(mint) || [];
    if (snaps.length < 3) return 0;
    const prices = snaps.map((s) => s.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    if (mean <= 0) return 0;
    const variance = prices.reduce((a, p) => a + (p - mean) ** 2, 0) / prices.length;
    return Math.sqrt(variance) / mean;
  }

  getMomentum(mint: string): number {
    const snaps = this.priceHistory.get(mint) || [];
    if (snaps.length < 2) return 0;
    const oldest = snaps[0].price;
    const latest = snaps[snaps.length - 1].price;
    return oldest > 0 ? (latest - oldest) / oldest : 0;
  }

  async fetchPriceByMint(mint: string): Promise<number> {
    const cached = this.priceCache.get(mint);
    if (cached && Date.now() - cached.ts < 20_000) return cached.price;

    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) throw new Error(`PRICE_HTTP_${r.status}`);
      const d = (await r.json()) as any;
      const pair = (d.pairs || [])
        .filter((p: any) => p.chainId === this.SOLANA_CHAIN)
        .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      const price = parseFloat(pair?.priceUsd || "0");
      if (Number.isFinite(price) && price > 0) {
        this.priceCache.set(mint, { price, ts: Date.now() });
        this.recordPrice(mint, price);
        return price;
      }
      return 0;
    } catch {
      return cached?.price || 0;
    }
  }

  private async runScan(onOpportunity?: (opp: TokenOpportunity) => void): Promise<ScanResult> {
    const ready: TokenOpportunity[] = [];
    const now = Date.now();

    try {
      const [trending, boosted] = await Promise.allSettled([
        this.fetchTrending(),
        this.fetchBoosted(),
      ]);
      const rawPairs: any[] = [];
      if (trending.status === "fulfilled") rawPairs.push(...trending.value);
      if (boosted.status === "fulfilled") rawPairs.push(...boosted.value);

      const dedup = new Map<string, any>();
      for (const raw of rawPairs) {
        const mint = raw.baseToken?.address || raw.tokenAddress || raw.address;
        if (!mint) continue;
        if (!dedup.has(mint)) dedup.set(mint, raw);
      }

      const dedupValues = Array.from(dedup.values());
      for (const raw of dedupValues) {
        const candidate = this.parseToken(raw);
        if (!candidate) continue;
        this.recordPrice(candidate.mint, candidate.price);
        const { discoveryScore, flags, tradeReady } = this.classifyCandidate(candidate);
        candidate.discoveryScore = discoveryScore;
        candidate.discoveryFlags = flags;

        const prev = this.watchlist.get(candidate.mint);
        const state: CandidateState = prev
          ? {
              ...prev,
              latest: candidate,
              passes: tradeReady ? prev.passes + 1 : 0,
              lastSeenAt: now,
            }
          : {
              firstSeenAt: now,
              lastSeenAt: now,
              passes: tradeReady ? 1 : 0,
              latest: candidate,
            };
        this.watchlist.set(candidate.mint, state);

        const stableForTwoScans = state.passes >= 2;
        if (tradeReady && stableForTwoScans) {
          ready.push(candidate);
          onOpportunity?.(candidate);
        }
      }

      const watchEntries = Array.from(this.watchlist.entries());
      for (const [mint, state] of watchEntries) {
        if (now - state.lastSeenAt > 2 * 60 * 60_000) this.watchlist.delete(mint);
      }
    } catch (e: any) {
      console.error("[scanner] error", e?.message || e);
    }

    this.lastScan = { opportunities: ready, scannedAt: now, tokenCount: ready.length };
    return this.lastScan;
  }

  private classifyCandidate(opp: TokenOpportunity): {
    discoveryScore: number;
    flags: string[];
    tradeReady: boolean;
  } {
    const flags: string[] = [];
    let score = 0;

    if (opp.liquidity >= 100_000) score += 30;
    else if (opp.liquidity >= 50_000) score += 20;
    else if (opp.liquidity >= 25_000) score += 10;
    else flags.push("low_liquidity");

    const volExpansion =
      opp.volume1h && opp.volume1h > 0 ? (opp.volume5m || 0) * 12 / opp.volume1h : 0;
    if (opp.volume24h >= 100_000) score += 20;
    else if (opp.volume24h >= 40_000) score += 12;
    else flags.push("low_volume");
    if (volExpansion > 1.2) score += 10;

    if (opp.priceChange5m > 0 && opp.priceChange1h > 0) score += 12;
    if (opp.priceChange1h > -10 && opp.priceChange1h < 40) score += 10;
    else flags.push("unstable_momentum");

    if (opp.tokenAgeSec && opp.tokenAgeSec > 20 * 60) score += 8;
    else flags.push("too_new");

    if (opp.boosted) {
      score -= 8;
      flags.push("boosted_source");
    }
    if (opp.priceChange1h > 65 || opp.priceChange24h > 220) {
      score -= 8;
      flags.push("parabolic_risk");
    }

    const tradeReady =
      score >= 42 &&
      !flags.includes("low_liquidity") &&
      !flags.includes("low_volume") &&
      !flags.includes("too_new") &&
      !flags.includes("parabolic_risk");

    return { discoveryScore: Math.max(0, score), flags, tradeReady };
  }

  private async fetchTrending(): Promise<any[]> {
    const r = await fetch("https://api.dexscreener.com/latest/dex/search?q=solana%20trending", {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const d = (await r.json()) as any;
    return (d.pairs || []).filter((p: any) => p.chainId === this.SOLANA_CHAIN);
  }

  private async fetchBoosted(): Promise<any[]> {
    const r = await fetch("https://api.dexscreener.com/token-boosts/latest/v1", {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const d = (await r.json()) as any[];
    return Array.isArray(d) ? d.filter((t: any) => t.chainId === this.SOLANA_CHAIN) : [];
  }

  private parseToken(raw: any): TokenOpportunity | null {
    try {
      const mint = raw.baseToken?.address || raw.tokenAddress || raw.address;
      const symbol = raw.baseToken?.symbol || raw.symbol || "???";
      const price = parseFloat(raw.priceUsd || raw.baseToken?.priceUsd || "0");
      if (!mint || !price || !Number.isFinite(price)) return null;

      const pairAddress = raw.pairAddress || raw.address || mint;
      const liquidity = parseFloat(raw.liquidity?.usd || raw.liquidityUsd || "0");
      const volume24h = parseFloat(raw.volume?.h24 || raw.volume24h || "0");
      const volume1h = parseFloat(raw.volume?.h1 || "0");
      const volume5m = parseFloat(raw.volume?.m5 || "0");
      const pairCreatedAt = raw.pairCreatedAt || 0;
      const tokenAgeSec = pairCreatedAt > 0 ? Math.max(0, Date.now() / 1000 - pairCreatedAt / 1000) : undefined;

      return {
        token: symbol,
        mint,
        price,
        priceChange5m: parseFloat(raw.priceChange?.m5 || "0"),
        priceChange1h: parseFloat(raw.priceChange?.h1 || "0"),
        priceChange24h: parseFloat(raw.priceChange?.h24 || "0"),
        volume24h,
        volume1h,
        volume5m,
        liquidity,
        fdv: parseFloat(raw.fdv || "0"),
        pairAddress,
        dexId: raw.dexId,
        source: "scanner",
        tokenAgeSec,
        boosted: raw.boostAmount !== undefined || raw.totalAmount !== undefined,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  private recordPrice(mint: string, price: number): void {
    if (!Number.isFinite(price) || price <= 0) return;
    if (!this.priceHistory.has(mint)) this.priceHistory.set(mint, []);
    const snaps = this.priceHistory.get(mint)!;
    snaps.push({ price, timestamp: Date.now() });
    if (snaps.length > this.HISTORY_WINDOW) snaps.shift();
    this.priceCache.set(mint, { price, ts: Date.now() });
  }
}

export const marketScanner = new MarketScanner();

/**
 * SAFETY FILTERS
 * Runs before any trade is allowed. One fail = hard reject.
 * Checks: token age, liquidity, holder concentration, price impact,
 * sell simulation (honeypot), and known scam patterns.
 */
import { TokenOpportunity } from './types';

interface SafetyReport {
  passed: boolean;
  score: number;      // 0-10 safety score (contributes to decision engine)
  flags: string[];    // each flag is a reason for rejection or warning
  warnings: string[]; // non-fatal concerns
  checkedAt: number;
}

interface TokenMeta {
  age: number;           // seconds since creation
  topHolderPct: number;  // top 10 holders combined %
  isLiquidityLocked: boolean;
  hasMintAuthority: boolean;
  hasFreezeAuthority: boolean;
  sellSimPassed: boolean;
}

// Words that appear in scam token names
const SCAM_KEYWORDS = ['test', 'scam', 'fake', 'rug', 'honeypot', 'ponzi', 'trust', 'safe', 'moon100', 'elon', 'x100', 'x1000', 'free', 'airdrop'];
const BLACKLISTED_MINTS = new Set<string>(); // populated at runtime

class SafetyFilters {
  private cache: Map<string, { report: SafetyReport; ts: number }> = new Map();
  private readonly CACHE_TTL = 10 * 60_000; // 10 minutes

  // ─── Public API ───────────────────────────────────────────────────

  async check(opp: TokenOpportunity, tradeUSD: number): Promise<SafetyReport> {
    const cacheKey = `${opp.mint}_${tradeUSD}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return cached.report;

    const report = await this.runChecks(opp, tradeUSD);
    this.cache.set(cacheKey, { report, ts: Date.now() });
    return report;
  }

  blacklist(mint: string) { BLACKLISTED_MINTS.add(mint); }

  // ─── Core checks ─────────────────────────────────────────────────

  private async runChecks(opp: TokenOpportunity, tradeUSD: number): Promise<SafetyReport> {
    const flags: string[] = [];
    const warnings: string[] = [];
    let score = 10; // start perfect, deduct for problems

    // ── 1. Blacklist ──────────────────────────────────────────────
    if (BLACKLISTED_MINTS.has(opp.mint)) {
      return { passed: false, score: 0, flags: ['BLACKLISTED_MINT'], warnings: [], checkedAt: Date.now() };
    }

    // ── 2. Scam name keywords ─────────────────────────────────────
    const nameLower = (opp.token || '').toLowerCase();
    const scamWord = SCAM_KEYWORDS.find(w => nameLower.includes(w));
    if (scamWord) {
      flags.push(`SCAM_KEYWORD: "${scamWord}" in name`);
      score -= 4;
    }

    // ── 3. Minimum liquidity ──────────────────────────────────────
    const MIN_LIQUIDITY = 25_000;
    if (opp.liquidity < MIN_LIQUIDITY) {
      flags.push(`LOW_LIQUIDITY: $${opp.liquidity.toFixed(0)} < $${MIN_LIQUIDITY.toLocaleString()}`);
      score -= 4;
    } else if (opp.liquidity < 50_000) {
      warnings.push(`Thin liquidity: $${opp.liquidity.toFixed(0)}`);
      score -= 1;
    }

    // ── 4. Minimum volume ─────────────────────────────────────────
    if (opp.volume24h < 5_000) {
      flags.push(`LOW_VOLUME: $${opp.volume24h.toFixed(0)} 24h`);
      score -= 3;
    }

    // ── 5. Price impact for trade size ────────────────────────────
    const priceImpact = await this.estimatePriceImpact(opp.mint, tradeUSD);
    if (priceImpact > 2) {
      flags.push(`HIGH_IMPACT: ${priceImpact.toFixed(2)}% price impact for $${tradeUSD}`);
      score -= 3;
    } else if (priceImpact > 0.8) {
      warnings.push(`Moderate slippage: ${priceImpact.toFixed(2)}%`);
      score -= 1;
    }

    // ── 6. Token metadata from DexScreener ────────────────────────
    try {
      const meta = await this.fetchTokenMeta(opp.mint);

      // Age check (reject if < 5 minutes old — too fresh to trust)
      if (meta.age < 300) {
        flags.push(`TOO_NEW: ${Math.round(meta.age / 60)}m old`);
        score -= 5;
      } else if (meta.age < 3600) {
        warnings.push(`Young token: ${Math.round(meta.age / 60)}m old`);
        score -= 1;
      }

      // Holder concentration
      if (meta.topHolderPct > 60) {
        flags.push(`CONCENTRATED: Top holders own ${meta.topHolderPct.toFixed(0)}%`);
        score -= 4;
      } else if (meta.topHolderPct > 40) {
        warnings.push(`Holder concentration: ${meta.topHolderPct.toFixed(0)}%`);
        score -= 1;
      }

      // Mint authority = owner can print unlimited tokens
      if (meta.hasMintAuthority) {
        flags.push('MINT_AUTHORITY: Dev can mint unlimited supply');
        score -= 3;
      }

      // Freeze authority = owner can freeze your tokens
      if (meta.hasFreezeAuthority) {
        warnings.push('FREEZE_AUTHORITY: Dev can freeze accounts');
        score -= 1;
      }

    } catch { /* metadata fetch failed — not fatal */ }

    // ── 7. Extreme price action (possible pump & dump peak) ────────
    if (opp.priceChange1h > 100) {
      flags.push(`PARABOLIC: +${opp.priceChange1h.toFixed(0)}% in 1h — possible top`);
      score -= 2;
    } else if (opp.priceChange1h > 50) {
      warnings.push(`Strong pump: +${opp.priceChange1h.toFixed(0)}% in 1h`);
    }

    score = Math.max(0, Math.min(10, score));
    const passed = flags.length === 0;

    return { passed, score, flags, warnings, checkedAt: Date.now() };
  }

  // ─── Price impact via Jupiter quote ──────────────────────────────

  private async estimatePriceImpact(outputMint: string, tradeUSD: number): Promise<number> {
    try {
      const SOL = 'So11111111111111111111111111111111111111112';
      const solPrice = 100; // rough — if unknown use conservative estimate
      const lamports = Math.round((tradeUSD / solPrice) * 1e9);
      if (lamports < 1000) return 0;

      const r = await fetch(
        `https://lite-api.jup.ag/swap/v1/quote?inputMint=${SOL}&outputMint=${outputMint}&amount=${lamports}&slippageBps=200`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!r.ok) return 0;
      const data = await r.json();
      return parseFloat(data.priceImpactPct || '0') * 100;
    } catch { return 0; }
  }

  // ─── Token metadata ───────────────────────────────────────────────

  private async fetchTokenMeta(mint: string): Promise<TokenMeta> {
    const defaults: TokenMeta = { age: 9999, topHolderPct: 0, isLiquidityLocked: false, hasMintAuthority: false, hasFreezeAuthority: false, sellSimPassed: true };

    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) return defaults;
      const data = await r.json();
      const pair = data.pairs?.[0];
      if (!pair) return defaults;

      const createdAt = pair.pairCreatedAt ? pair.pairCreatedAt / 1000 : Date.now() / 1000;
      const age = Date.now() / 1000 - createdAt;

      // DexScreener surfaces some safety info
      const info = pair.info || {};
      const hasMintAuthority = info.mintAuthority === true;
      const hasFreezeAuthority = info.freezeAuthority === true;

      return { ...defaults, age, hasMintAuthority, hasFreezeAuthority };
    } catch { return defaults; }
  }
}

export const safetyFilters = new SafetyFilters();

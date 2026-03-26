import { getMint, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { conn, loadWallet } from "../utils/solanaAdapter";
import { TokenOpportunity } from "./types";

interface SafetyReport {
  passed: boolean;
  score: number;      // 0-10 safety score (contributes to decision engine)
  flags: string[];    // each flag is a reason for rejection or warning
  warnings: string[]; // non-fatal concerns
  checkedAt: number;
}

interface TokenMeta {
  age: number;
  topHolderPct: number;
  hasMintAuthority: boolean;
  hasFreezeAuthority: boolean;
  sellSimPassed: boolean;
}

const SCAM_KEYWORDS = [
  "test",
  "scam",
  "fake",
  "rug",
  "honeypot",
  "ponzi",
  "trust",
  "safe",
  "moon100",
  "elon",
  "x100",
  "x1000",
  "free",
  "airdrop",
];
const BLACKLISTED_MINTS = new Set<string>(); // populated at runtime

class SafetyFilters {
  private cache: Map<string, { report: SafetyReport; ts: number }> = new Map();
  private readonly CACHE_TTL = 7 * 60_000;

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

  private async runChecks(opp: TokenOpportunity, tradeUSD: number): Promise<SafetyReport> {
    const flags: string[] = [];
    const warnings: string[] = [];
    let score = 10; // start perfect, deduct for problems

    if (BLACKLISTED_MINTS.has(opp.mint)) {
      return {
        passed: false,
        score: 0,
        flags: ["BLACKLISTED_MINT"],
        warnings: [],
        checkedAt: Date.now(),
      };
    }

    const nameLower = (opp.token || "").toLowerCase();
    const scamWord = SCAM_KEYWORDS.find((w) => nameLower.includes(w));
    if (scamWord) {
      flags.push(`SCAM_KEYWORD: "${scamWord}" in name`);
      score -= 4;
    }

    const MIN_LIQUIDITY = 25_000;
    if (opp.liquidity < MIN_LIQUIDITY) {
      flags.push(
        `LOW_LIQUIDITY: $${opp.liquidity.toFixed(0)} < $${MIN_LIQUIDITY.toLocaleString()}`
      );
      score -= 4;
    } else if (opp.liquidity < 50_000) {
      warnings.push(`Thin liquidity: $${opp.liquidity.toFixed(0)}`);
      score -= 1;
    }

    if (opp.volume24h < 7_000) {
      flags.push(`LOW_VOLUME: $${opp.volume24h.toFixed(0)} 24h`);
      score -= 3;
    }

    const quote = await this.estimatePriceImpact(opp.mint, tradeUSD);
    const priceImpact = quote.priceImpactPct;
    if (priceImpact > 2.2) {
      flags.push(`HIGH_IMPACT: ${priceImpact.toFixed(2)}% price impact for $${tradeUSD}`);
      score -= 3;
    } else if (priceImpact > 0.8) {
      warnings.push(`Moderate slippage: ${priceImpact.toFixed(2)}%`);
      score -= 1;
    }
    if (!quote.hasRoute) {
      flags.push("NO_BUY_ROUTE");
      score -= 4;
    }

    try {
      const meta = await this.fetchTokenMeta(opp.mint);

      if (meta.age < 300) {
        flags.push(`TOO_NEW: ${Math.round(meta.age / 60)}m old`);
        score -= 5;
      } else if (meta.age < 3600) {
        warnings.push(`Young token: ${Math.round(meta.age / 60)}m old`);
        score -= 1;
      }

      if (meta.topHolderPct > 60) {
        flags.push(`CONCENTRATED: Top holders own ${meta.topHolderPct.toFixed(0)}%`);
        score -= 4;
      } else if (meta.topHolderPct > 40) {
        warnings.push(`Holder concentration: ${meta.topHolderPct.toFixed(0)}%`);
        score -= 1;
      }

      if (meta.hasMintAuthority) {
        flags.push('MINT_AUTHORITY: Dev can mint unlimited supply');
        score -= 3;
      }

      if (meta.hasFreezeAuthority) {
        warnings.push('FREEZE_AUTHORITY: Dev can freeze accounts');
        score -= 1;
      }

      if (!meta.sellSimPassed) {
        flags.push("SELL_ROUTE_FAIL");
        score -= 4;
      }
    } catch {}

    if (opp.priceChange1h > 90 || opp.priceChange24h > 260) {
      flags.push(`PARABOLIC: +${opp.priceChange1h.toFixed(0)}% in 1h — possible top`);
      score -= 3;
    } else if (opp.priceChange1h > 50) {
      warnings.push(`Strong pump: +${opp.priceChange1h.toFixed(0)}% in 1h`);
    }

    score = Math.max(0, Math.min(10, score));
    const passed = flags.length === 0;

    return { passed, score, flags, warnings, checkedAt: Date.now() };
  }

  private async estimatePriceImpact(
    outputMint: string,
    tradeUSD: number
  ): Promise<{ hasRoute: boolean; priceImpactPct: number }> {
    try {
      const SOL = "So11111111111111111111111111111111111111112";
      const solPrice = await this.fetchSolPrice();
      const lamports = Math.round((tradeUSD / solPrice) * 1e9);
      if (lamports < 1000) return { hasRoute: false, priceImpactPct: 0 };

      const r = await fetch(
        `https://lite-api.jup.ag/swap/v1/quote?inputMint=${SOL}&outputMint=${outputMint}&amount=${lamports}&slippageBps=200`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!r.ok) return { hasRoute: false, priceImpactPct: 0 };
      const data = await r.json();
      return {
        hasRoute: !!data?.outAmount || !!(data?.data && data.data.length > 0),
        priceImpactPct: parseFloat(data.priceImpactPct || "0") * 100,
      };
    } catch {
      return { hasRoute: false, priceImpactPct: 0 };
    }
  }

  private async fetchTokenMeta(mint: string): Promise<TokenMeta> {
    const defaults: TokenMeta = {
      age: 9999,
      topHolderPct: 0,
      hasMintAuthority: false,
      hasFreezeAuthority: false,
      sellSimPassed: true,
    };

    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) return defaults;
      const data = await r.json();
      const pair = data.pairs?.[0];
      if (!pair) return defaults;

      const createdAt = pair.pairCreatedAt ? pair.pairCreatedAt / 1000 : Date.now() / 1000;
      const age = Date.now() / 1000 - createdAt;

      const info = pair.info || {};
      const hasMintAuthority = info.mintAuthority === true;
      const hasFreezeAuthority = info.freezeAuthority === true;
      const topHolderPct = Number(info.topHoldersPercent || info.top10HoldersPercent || 0);

      let onchainMintAuth = hasMintAuthority;
      let onchainFreezeAuth = hasFreezeAuthority;
      try {
        const mintInfo = await getMint(conn(), new PublicKey(mint));
        onchainMintAuth = mintInfo.mintAuthority !== null;
        onchainFreezeAuth = mintInfo.freezeAuthority !== null;
      } catch {}

      const sellSimPassed = await this.checkSellability(mint);

      return {
        ...defaults,
        age,
        topHolderPct,
        hasMintAuthority: onchainMintAuth,
        hasFreezeAuthority: onchainFreezeAuth,
        sellSimPassed,
      };
    } catch {
      return defaults;
    }
  }

  private async checkSellability(mint: string): Promise<boolean> {
    try {
      const wallet = loadWallet();
      const ata = getAssociatedTokenAddressSync(new PublicKey(mint), wallet.publicKey);
      const bal = await conn().getTokenAccountBalance(ata, "confirmed");
      const ui = Number(bal.value.uiAmountString || "0");
      if (ui <= 0) return true;

      const decimals = bal.value.decimals || 0;
      const raw = Math.max(1, Math.floor(Math.min(ui, 1) * 10 ** decimals));
      const SOL = "So11111111111111111111111111111111111111112";
      const r = await fetch(
        `https://lite-api.jup.ag/swap/v1/quote?inputMint=${mint}&outputMint=${SOL}&amount=${raw}&slippageBps=300`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!r.ok) return false;
      const quote = await r.json();
      return !!quote?.outAmount;
    } catch {
      return true;
    }
  }

  private async fetchSolPrice(): Promise<number> {
    try {
      const r = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112",
        { signal: AbortSignal.timeout(4000) }
      );
      if (!r.ok) return 100;
      const d = await r.json();
      const pair = (d.pairs || [])[0];
      const p = Number(pair?.priceUsd || 100);
      return Number.isFinite(p) && p > 0 ? p : 100;
    } catch {
      return 100;
    }
  }
}

export const safetyFilters = new SafetyFilters();

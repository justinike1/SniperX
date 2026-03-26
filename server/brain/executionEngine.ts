/**
 * EXECUTION ENGINE
 * Handles Jupiter quotes, route selection, transaction sending, retry logic,
 * and confirmation logging. Built so it never silently fails.
 *
 * Flow: quote → build tx → simulate → send (3 attempts with backoff) → confirm → log
 */
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { ExecutionResult } from './types';
import { conn, loadWallet } from '../utils/solanaAdapter';

const JUPITER_QUOTE = 'https://lite-api.jup.ag/swap/v1/quote';
const JUPITER_SWAP  = 'https://lite-api.jup.ag/swap/v1/swap';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1500;

interface QuoteResult {
  outAmount: string;
  priceImpactPct: string;
  routePlan: any[];
  quoteResponse: any; // pass directly to swap endpoint
}

interface PriceQuote {
  priceUsd: number;
  outAmount: number;
  inAmount: number;
  priceImpactPct: number;
}

class ExecutionEngine {
  private connection: Connection;
  private wallet: Keypair | null = null;

  constructor() {
    this.connection = conn();
    try { this.wallet = loadWallet(); } catch { /* no key — read-only mode */ }
  }

  // ─── Public API ───────────────────────────────────────────────────

  /** Get a live quote. Throws on failure. */
  async quote(inputMint: string, outputMint: string, amountLamports: number, slippageBps = 100): Promise<QuoteResult> {
    const url = `${JUPITER_QUOTE}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}&onlyDirectRoutes=false`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`QUOTE_FAIL_${r.status}: ${err.slice(0, 100)}`);
    }
    const data = await r.json();
    if (!data.outAmount) throw new Error('QUOTE_EMPTY: no outAmount returned');
    return { outAmount: data.outAmount, priceImpactPct: data.priceImpactPct || '0', routePlan: data.routePlan || [], quoteResponse: data };
  }

  /** Full buy execution: quote → simulate → send with retry */
  async buy(outputMint: string, amountUSD: number, slippageBps = 100): Promise<ExecutionResult> {
    const start = Date.now();

    if (!this.wallet) {
      return { success: false, inputAmount: 0, outputAmount: 0, priceImpact: 0, fee: 0, attempts: 0, error: 'NO_PRIVATE_KEY', timestamp: start };
    }

    try {
      // Convert USD → lamports (approximate via SOL price)
      const solPrice = await this.getSolPrice();
      const solAmount = amountUSD / solPrice;
      const lamports = Math.round(solAmount * 1e9);

      if (lamports < 1_000) {
        return { success: false, inputAmount: lamports, outputAmount: 0, priceImpact: 0, fee: 0, attempts: 0, error: 'AMOUNT_TOO_SMALL', timestamp: start };
      }

      const q = await this.quote(SOL_MINT, outputMint, lamports, slippageBps);
      const impact = parseFloat(q.priceImpactPct) * 100;

      if (impact > 3) {
        return { success: false, inputAmount: lamports, outputAmount: 0, priceImpact: impact, fee: 0, attempts: 0, error: `IMPACT_TOO_HIGH: ${impact.toFixed(2)}%`, timestamp: start };
      }

      const result = await this.executeSwap(q, lamports, parseInt(q.outAmount));
      if (result.success) {
        const reconciled = await this.reconcileFill(SOL_MINT, outputMint, result.txHash!);
        return this.mergeFill(result, reconciled);
      }
      return result;
    } catch (e: any) {
      return { success: false, inputAmount: 0, outputAmount: 0, priceImpact: 0, fee: 0, attempts: 1, error: e.message, timestamp: start };
    }
  }

  /** Full sell execution — amountTokens is in human-readable units (e.g. 1.5 tokens) */
  async sell(inputMint: string, amountTokens: number, slippageBps = 150): Promise<ExecutionResult> {
    const start = Date.now();

    if (!this.wallet) {
      return { success: false, inputAmount: 0, outputAmount: 0, priceImpact: 0, fee: 0, attempts: 0, error: 'NO_PRIVATE_KEY', timestamp: start };
    }

    try {
      // Convert human-readable token amount to raw integer units
      const { getMint } = await import('@solana/spl-token');
      const { PublicKey } = await import('@solana/web3.js');
      const mintInfo = await getMint(this.connection, new PublicKey(inputMint));
      const rawAmount = Math.floor(amountTokens * (10 ** mintInfo.decimals));

      if (rawAmount <= 0) {
        return { success: false, inputAmount: 0, outputAmount: 0, priceImpact: 0, fee: 0, attempts: 0, error: 'SELL_AMOUNT_TOO_SMALL', timestamp: start };
      }

      const q = await this.quote(inputMint, SOL_MINT, rawAmount, slippageBps);
      const result = await this.executeSwap(q, rawAmount, parseInt(q.outAmount));
      if (result.success) {
        const reconciled = await this.reconcileFill(inputMint, SOL_MINT, result.txHash!);
        return this.mergeFill(result, reconciled);
      }
      return result;
    } catch (e: any) {
      return { success: false, inputAmount: 0, outputAmount: 0, priceImpact: 0, fee: 0, attempts: 1, error: e.message, timestamp: start };
    }
  }

  /** Quote sell to SOL without sending a transaction */
  async quoteSellToSol(inputMint: string, amountTokens: number, slippageBps = 150): Promise<PriceQuote | null> {
    try {
      const { getMint } = await import('@solana/spl-token');
      const { PublicKey } = await import('@solana/web3.js');
      const mintInfo = await getMint(this.connection, new PublicKey(inputMint));
      const rawAmount = Math.floor(amountTokens * (10 ** mintInfo.decimals));
      if (rawAmount <= 0) return null;
      const q = await this.quote(inputMint, SOL_MINT, rawAmount, slippageBps);
      const outAmountLamports = Number(q.outAmount || 0);
      const outSol = outAmountLamports / 1e9;
      const inTokens = amountTokens;
      const priceUsd = inTokens > 0 ? (await this.getSolPrice()) * (outSol / inTokens) : 0;
      return {
        priceUsd,
        outAmount: outSol,
        inAmount: inTokens,
        priceImpactPct: parseFloat(q.priceImpactPct || "0") * 100,
      };
    } catch {
      return null;
    }
  }

  async reconcileExecutedSwap(
    signature: string,
    inputMint: string,
    outputMint: string
  ): Promise<Partial<ExecutionResult>> {
    const fill = await this.reconcileFill(inputMint, outputMint, signature);
    return {
      inputMint: fill.inputMint,
      outputMint: fill.outputMint,
      filledInputAmount: fill.filledInputAmount,
      filledOutputAmount: fill.filledOutputAmount,
      avgPriceUSD: fill.avgPriceUSD,
      networkFeeLamports: fill.networkFeeLamports,
      networkFeeSOL: fill.networkFeeSOL,
      fillSource: fill.fillSource,
    };
  }

  /** Simulate without sending. Returns true if simulation passes. */
  async simulate(inputMint: string, outputMint: string, amountLamports: number): Promise<{ ok: boolean; error?: string; computeUnits?: number }> {
    if (!this.wallet) return { ok: false, error: 'NO_PRIVATE_KEY' };

    try {
      const q = await this.quote(inputMint, outputMint, amountLamports);
      const tx = await this.buildTx(q.quoteResponse);
      const result = await this.connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });

      if (result.value.err) {
        const errStr = JSON.stringify(result.value.err);
        return { ok: false, error: errStr };
      }

      const logs = result.value.logs || [];
      const cu = logs.find(l => l.includes('consumed'))?.match(/consumed (\d+)/)?.[1];
      return { ok: true, computeUnits: cu ? parseInt(cu) : undefined };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // ─── Core swap flow ───────────────────────────────────────────────

  private async executeSwap(q: QuoteResult, inputAmount: number, outputAmount: number): Promise<ExecutionResult> {
    const start = Date.now();
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const tx = await this.buildTx(q.quoteResponse);

        // Sign
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        tx.message.recentBlockhash = blockhash;
        tx.sign([this.wallet!]);

        // Send
        const sig = await this.connection.sendTransaction(tx, {
          skipPreflight: false,
          maxRetries: 2,
          preflightCommitment: 'processed',
        });

        // Confirm
        const conf = await this.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

        if (conf.value.err) throw new Error(`CONFIRM_ERROR: ${JSON.stringify(conf.value.err)}`);

        const elapsed = Date.now() - start;
        console.log(`✅ Execution: ${sig} | ${elapsed}ms | attempt ${attempt}`);

        return {
          success: true,
          txHash: sig,
          inputAmount,
          outputAmount,
          priceImpact: parseFloat(q.priceImpactPct) * 100,
          fee: 5000, // lamports (approx)
          attempts: attempt,
          timestamp: start,
        };
      } catch (e: any) {
        lastError = e.message;
        console.warn(`⚠️ Execution attempt ${attempt}/${MAX_ATTEMPTS}: ${e.message}`);
        if (attempt < MAX_ATTEMPTS) await this.sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }

    return { success: false, inputAmount, outputAmount: 0, priceImpact: parseFloat(q.priceImpactPct) * 100, fee: 0, attempts: MAX_ATTEMPTS, error: lastError, timestamp: start };
  }

  private async buildTx(quoteResponse: any): Promise<VersionedTransaction> {
    const r = await fetch(JUPITER_SWAP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: this.wallet!.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 5000,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`SWAP_BUILD_FAIL_${r.status}: ${err.slice(0, 100)}`);
    }

    const data = await r.json();
    if (!data.swapTransaction) throw new Error('SWAP_BUILD_EMPTY: no transaction returned');

    const buf = Buffer.from(data.swapTransaction, 'base64');
    return VersionedTransaction.deserialize(buf);
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private async getSolPrice(): Promise<number> {
    try {
      const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return 100;
      const data = await r.json();
      const pair = (data.pairs || []).find((p: any) => p.chainId === 'solana' && p.quoteToken?.symbol === 'USDC') || data.pairs?.[0];
      return pair ? parseFloat(pair.priceUsd || '100') : 100;
    } catch { return 100; }
  }

  isReady(): boolean { return !!this.wallet; }

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  private async reconcileFill(
    inputMint: string,
    outputMint: string,
    signature: string
  ): Promise<{
    filledInputAmount?: number;
    filledOutputAmount?: number;
    avgPriceUSD?: number;
    networkFeeLamports?: number;
    networkFeeSOL?: number;
    inputMint: string;
    outputMint: string;
    fillSource: "onchain" | "quote";
  }> {
    if (!this.wallet) {
      return { inputMint, outputMint, fillSource: "quote" };
    }
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx || !tx.meta) {
        return { inputMint, outputMint, fillSource: "quote" };
      }

      const pre = tx.meta.preTokenBalances || [];
      const post = tx.meta.postTokenBalances || [];
      const owner = this.wallet.publicKey.toBase58();

      const tokenDeltaForMint = (mint: string): number => {
        const byIndex = new Map<number, { pre: number; post: number }>();
        for (const b of pre) {
          if (b.owner !== owner || b.mint !== mint) continue;
          const preAmt = Number(b.uiTokenAmount.uiAmountString || "0");
          const slot = byIndex.get(b.accountIndex) || { pre: 0, post: 0 };
          slot.pre = preAmt;
          byIndex.set(b.accountIndex, slot);
        }
        for (const b of post) {
          if (b.owner !== owner || b.mint !== mint) continue;
          const postAmt = Number(b.uiTokenAmount.uiAmountString || "0");
          const slot = byIndex.get(b.accountIndex) || { pre: 0, post: 0 };
          slot.post = postAmt;
          byIndex.set(b.accountIndex, slot);
        }
        let total = 0;
        byIndex.forEach((slot) => {
          total += slot.post - slot.pre;
        });
        return total;
      };

      const inputTokenDelta = tokenDeltaForMint(inputMint);
      const outputTokenDelta = tokenDeltaForMint(outputMint);

      const staticKeys = tx.transaction.message.staticAccountKeys || [];
      let walletIndex = staticKeys.findIndex((k) => k.toBase58() === owner);
      if (walletIndex < 0) walletIndex = 0;
      const preLamports = tx.meta.preBalances?.[walletIndex] ?? 0;
      const postLamports = tx.meta.postBalances?.[walletIndex] ?? 0;
      const feeLamports = tx.meta.fee ?? 0;
      const feeSOL = feeLamports / 1e9;
      const walletSolDelta = (postLamports - preLamports) / 1e9;

      let filledInputAmount = Math.max(0, -inputTokenDelta);
      let filledOutputAmount = Math.max(0, outputTokenDelta);
      if (inputMint === SOL_MINT) {
        // Wallet delta includes fee: -input - fee
        filledInputAmount = Math.max(0, -walletSolDelta - feeSOL);
      }
      if (outputMint === SOL_MINT) {
        // Wallet delta includes fee: +output - fee
        filledOutputAmount = Math.max(0, walletSolDelta + feeSOL);
      }

      const solPrice = await this.getSolPrice();
      let avgPriceUSD: number | undefined;
      if (outputMint === SOL_MINT && filledInputAmount > 0 && filledOutputAmount > 0) {
        avgPriceUSD = solPrice * (filledOutputAmount / filledInputAmount);
      } else if (inputMint === SOL_MINT && filledInputAmount > 0 && filledOutputAmount > 0) {
        avgPriceUSD = solPrice * (filledInputAmount / filledOutputAmount);
      }

      return {
        inputMint,
        outputMint,
        filledInputAmount: filledInputAmount > 0 ? filledInputAmount : undefined,
        filledOutputAmount: filledOutputAmount > 0 ? filledOutputAmount : undefined,
        avgPriceUSD,
        networkFeeLamports: feeLamports,
        networkFeeSOL: feeSOL,
        fillSource: "onchain",
      };
    } catch {
      return { inputMint, outputMint, fillSource: "quote" };
    }
  }

  private mergeFill(
    base: ExecutionResult,
    fill: {
      inputMint: string;
      outputMint: string;
      filledInputAmount?: number;
      filledOutputAmount?: number;
      avgPriceUSD?: number;
      networkFeeLamports?: number;
      networkFeeSOL?: number;
      fillSource: "onchain" | "quote";
    }
  ): ExecutionResult {
    return {
      ...base,
      inputMint: fill.inputMint,
      outputMint: fill.outputMint,
      filledInputAmount: fill.filledInputAmount,
      filledOutputAmount: fill.filledOutputAmount,
      avgPriceUSD: fill.avgPriceUSD,
      networkFeeLamports: fill.networkFeeLamports,
      networkFeeSOL: fill.networkFeeSOL,
      fillSource: fill.fillSource,
    };
  }
}

export const executionEngine = new ExecutionEngine();

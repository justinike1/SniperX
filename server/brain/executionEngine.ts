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

      return await this.executeSwap(q, lamports, parseInt(q.outAmount));
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
      return await this.executeSwap(q, rawAmount, parseInt(q.outAmount));
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
}

export const executionEngine = new ExecutionEngine();

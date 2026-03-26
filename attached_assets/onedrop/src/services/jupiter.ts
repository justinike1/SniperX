import axios from 'axios';
import { TOKENS } from '../config.tokens.js';
import { signAndSendSwapTransaction } from './solana.js';
import { loadKeypair } from './solana.js';

export type Side = 'BUY'|'SELL';
export type Denom = 'SOL'|'USD'|'TOKEN';

const QUOTE_URL = 'https://quote-api.jup.ag/v6/quote';
const SWAP_URL = 'https://quote-api.jup.ag/v6/swap';

function toAtomic(amount: number, decimals: number) { return Math.round(amount * Math.pow(10, decimals)); }
function getMint(symbol: string) { const t = TOKENS[symbol.toUpperCase()]; if (!t) throw new Error(`Unknown token ${symbol}`); return t; }

export async function getQuoteByDenom(params: { side: Side; token: string; denom: Denom; amount: number; slippagePct: number; }) {
  const { side, token, denom, amount, slippagePct } = params;
  const target = getMint(token);
  const slippageBps = Math.round(slippagePct * 100);

  let inputMint: string, outputMint: string, rawAmount: number, swapMode: 'ExactIn'|'ExactOut' = 'ExactIn';

  if (side === 'BUY') {
    if (denom === 'USD') { inputMint = TOKENS.USDC.mint; outputMint = target.mint; rawAmount = toAtomic(amount, TOKENS.USDC.decimals); swapMode = 'ExactIn'; }
    else if (denom === 'SOL') { inputMint = TOKENS.SOL.mint; outputMint = target.mint; rawAmount = toAtomic(amount, TOKENS.SOL.decimals); swapMode = 'ExactIn'; }
    else { inputMint = TOKENS.USDC.mint; outputMint = target.mint; rawAmount = toAtomic(amount, target.decimals); swapMode = 'ExactOut'; }
  } else {
    inputMint = target.mint; outputMint = TOKENS.USDC.mint; rawAmount = toAtomic(amount, target.decimals); swapMode = 'ExactIn';
  }

  const paramsObj: Record<string, string|number|boolean> = {
    inputMint, outputMint, amount: rawAmount, slippageBps, swapMode, restrictIntermediateTokens: true, onlyDirectRoutes: false
  };
  const { data } = await axios.get(QUOTE_URL, { params: paramsObj });
  return { quote: data, params: paramsObj };
}

export async function buildAndExecuteSwap(quoteResponse: any, opts?: { prioritizationFeeLamports?: number }) {
  const kp = loadKeypair();
  const payload: any = { quoteResponse, userPublicKey: kp.publicKey.toBase58(), wrapAndUnwrapSol: TrueIfSolIn(quoteResponse) };
  if (opts?.prioritizationFeeLamports) payload.prioritizationFeeLamports = opts.prioritizationFeeLamports;
  const { data } = await axios.post(SWAP_URL, payload, { headers: { 'Content-Type': 'application/json' } });
  const { swapTransaction } = data;
  const { signature } = await signAndSendSwapTransaction(swapTransaction);
  return signature;
}

// Heuristic: wrap SOL when input or output involves SOL mint
function TrueIfSolIn(quoteResponse: any) {
  try {
    const inMint = quoteResponse?.inAmount?.mint ?? quoteResponse?.routePlan?.[0]?.swapInfo?.inputMint;
    const outMint = quoteResponse?.outAmount?.mint ?? quoteResponse?.routePlan?.slice(-1)?.[0]?.swapInfo?.outputMint;
    const SOL = TOKENS.SOL.mint;
    return inMint === SOL || outMint === SOL;
  } catch { return true; }
}

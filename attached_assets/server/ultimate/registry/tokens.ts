
export type TokenInfo = { symbol: string; mint: string };
export type PerpInfo = { symbol: string; driftSymbol: string };
export const TOKENS: TokenInfo[] = [
  { symbol: "SOL",  mint: "So11111111111111111111111111111111111111112" },
  { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7yaB1pPB263" },
  { symbol: "JUP",  mint: "JUP4Fb2cqiRUcaWPoKz7R7GSD6M829zvRvHjB1p6G3k" }
];
export const PERPS: PerpInfo[] = [
  { symbol: "SOL", driftSymbol: "SOL-PERP" },
  { symbol: "BTC", driftSymbol: "BTC-PERP" },
  { symbol: "ETH", driftSymbol: "ETH-PERP" }
];
export function resolveTokenMint(input: string): string | null {
  if (/^[1-9A-HJ-NP-Za-km-z]{30,}$/.test(input)) return input;
  const sym = input.trim().toUpperCase();
  const hit = TOKENS.find(t => t.symbol === sym);
  return hit?.mint || null;
}
export function resolvePerpSymbol(input: string): string {
  const sym = input.trim().toUpperCase();
  const hit = PERPS.find(p => p.symbol === sym);
  return hit?.driftSymbol || process.env.DRIFT_PERP_SYMBOL || "SOL-PERP";
}

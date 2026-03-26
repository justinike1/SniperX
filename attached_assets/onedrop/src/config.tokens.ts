export type TokenInfo = { mint: string; symbol: string; decimals: number };
export const TOKENS: Record<string, TokenInfo> = {
  SOL: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6 },
  BONK: { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', decimals: 5 },
  JUP: { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', decimals: 6 },
  WIF: { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', decimals: 6 },
};
export const PYTH_PRICE_IDS: Record<string, string> = {
  SOL: 'Crypto.SOL/USD',
  USDC: 'Crypto.USDC/USD',
  BONK: 'Crypto.BONK/USD',
  JUP: 'Crypto.JUP/USD',
  WIF: 'Crypto.WIF/USD'
};

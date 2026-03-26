// tokenSelector.ts
// Auto-generated 2025-06-30T14:27:58.402350 UTC

import { getTrendingTokens } from './externalSources';  // You must implement this based on your data provider

let tokenIndex = 0;
const bannedTokens = ['BONK', 'SCAM', 'RUG'];  // Add more tokens to avoid here

export async function getSmartToken() {
    const trendingTokens = await getTrendingTokens();

    const safeTokens = trendingTokens.filter(token =>
        token.marketCap > 5_000_000 &&
        token.volume24h > 100_000 &&
        !bannedTokens.includes(token.symbol)
    );

    if (safeTokens.length === 0) {
        throw new Error('No safe tokens found to trade.');
    }

    tokenIndex = (tokenIndex + 1) % safeTokens.length;
    return safeTokens[tokenIndex];
}

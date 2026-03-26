let tokenIndex = 0;
const bannedTokens = ['BONK', 'SCAM'];

export async function getTradeCandidate() {
  const trendingTokens = await fetchTrendingTokens();
  const filtered = trendingTokens.filter(t =>
    t.volume > 100000 && t.marketCap > 5000000 && !bannedTokens.includes(t.symbol)
  );
  if (filtered.length === 0) throw new Error('No safe tokens found');
  tokenIndex = (tokenIndex + 1) % filtered.length;
  return filtered[tokenIndex];
}

async function fetchTrendingTokens() {
  return [
    { symbol: 'SOLAPE', tokenAddress: 'XYZ', volume: 2000000, marketCap: 10000000, price: 0.05, amount: 0.05 }
  ];
}

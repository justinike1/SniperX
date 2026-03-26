const portfolio: { [key: string]: any[] } = {};

export async function trackPnL(
  tokenMint: string, 
  amount: number | string, 
  direction: 'BUY' | 'SELL'
): Promise<void> {
  const now = Date.now();
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (!portfolio[tokenMint]) {
    portfolio[tokenMint] = [];
  }

  portfolio[tokenMint].push({
    direction,
    amount: numAmount,
    timestamp: now
  });

  console.log(`[💹 PnL] ${direction} ${numAmount} of ${tokenMint}`);
}

export function getPnLSummary(): any {
  let totalTrades = 0;
  let successfulTrades = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let bestTrade = 0;
  let worstTrade = 0;

  for (const token in portfolio) {
    const trades = portfolio[token];
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].direction === 'SELL') {
        totalTrades++;
        
        const buyTrade = trades.find((t: any, idx: number) => 
          t.direction === 'BUY' && idx < i
        );
        
        if (buyTrade) {
          const profit = trades[i].amount - buyTrade.amount;
          
          if (profit > 0) {
            successfulTrades++;
            totalProfit += profit;
            if (profit > bestTrade) bestTrade = profit;
          } else {
            totalLoss += Math.abs(profit);
            if (profit < worstTrade) worstTrade = profit;
          }
        }
      }
    }
  }

  const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

  return {
    totalTrades,
    successfulTrades,
    totalProfit,
    totalLoss,
    bestTrade,
    worstTrade,
    winRate
  };
}

export function getActivePositions(): any[] {
  const positions = [];
  
  for (const token in portfolio) {
    const trades = portfolio[token];
    const buyTrades = trades.filter((t: any) => t.direction === 'BUY');
    const sellTrades = trades.filter((t: any) => t.direction === 'SELL');
    
    if (buyTrades.length > sellTrades.length) {
      const totalBought = buyTrades.reduce((sum: number, t: any) => sum + t.amount, 0);
      const totalSold = sellTrades.reduce((sum: number, t: any) => sum + t.amount, 0);
      const remaining = totalBought - totalSold;
      
      if (remaining > 0) {
        positions.push({
          tokenMint: token,
          amount: remaining,
          entryPrice: buyTrades[buyTrades.length - 1].amount
        });
      }
    }
  }
  
  return positions;
}

export async function updateUnrealizedPnL(): Promise<void> {
  console.log('[PnL] Updating unrealized PnL for active positions');
}
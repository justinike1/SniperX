/**
 * TRADE TRACKER SYSTEM
 * Manages active trades for intelligent buy/sell decisions
 */

interface ActiveTrade {
  token: string;
  tokenAddress: string;
  amount: number;
  buyPrice: number;
  timestamp: number;
  id: string;
}

class TradeTracker {
  private activeTrades: Map<string, ActiveTrade> = new Map();
  private tradeHistory: ActiveTrade[] = [];

  /**
   * Store a new trade after successful buy
   */
  storeTrade(tokenAddress: string, symbol: string, amount: number, buyPrice: number): string {
    const tradeId = `${tokenAddress}_${Date.now()}`;
    const trade: ActiveTrade = {
      token: symbol,
      tokenAddress,
      amount,
      buyPrice,
      timestamp: Date.now(),
      id: tradeId
    };

    this.activeTrades.set(tokenAddress, trade);
    console.log(`📝 Stored trade: ${symbol} (${amount} tokens at $${buyPrice})`);
    return tradeId;
  }

  /**
   * Get all active trades for selling evaluation
   */
  getActiveTrades(): ActiveTrade[] {
    return Array.from(this.activeTrades.values());
  }

  /**
   * Get specific trade by token address
   */
  getTrade(tokenAddress: string): ActiveTrade | undefined {
    return this.activeTrades.get(tokenAddress);
  }

  /**
   * Remove trade after successful sell
   */
  removeTrade(tokenAddress: string): void {
    const trade = this.activeTrades.get(tokenAddress);
    if (trade) {
      this.tradeHistory.push(trade);
      this.activeTrades.delete(tokenAddress);
      console.log(`🗑️ Removed trade: ${trade.token}`);
    }
  }

  /**
   * Check if we should sell based on profit/loss targets
   */
  shouldSell(tokenAddress: string, currentPrice: number): { shouldSell: boolean; reason: string; profitPercent?: number } {
    const trade = this.getTrade(tokenAddress);
    if (!trade) {
      return { shouldSell: false, reason: 'No active trade found' };
    }

    const profitPercent = ((currentPrice - trade.buyPrice) / trade.buyPrice) * 100;
    
    // 10% profit target
    if (profitPercent >= 10) {
      return { shouldSell: true, reason: 'PROFIT_TARGET', profitPercent };
    }
    
    // 10% stop loss
    if (profitPercent <= -10) {
      return { shouldSell: true, reason: 'STOP_LOSS', profitPercent };
    }

    return { shouldSell: false, reason: 'HOLD', profitPercent };
  }

  /**
   * Get trading statistics
   */
  getStats() {
    return {
      activeTrades: this.activeTrades.size,
      totalHistoryTrades: this.tradeHistory.length,
      activePositions: Array.from(this.activeTrades.values()).map(trade => ({
        token: trade.token,
        age: Date.now() - trade.timestamp,
        amount: trade.amount
      }))
    };
  }

  /**
   * Clear all active trades (emergency function)
   */
  clearAllTrades(): void {
    console.log('🚨 EMERGENCY: Clearing all active trades');
    this.activeTrades.clear();
  }
}

export const tradeTracker = new TradeTracker();
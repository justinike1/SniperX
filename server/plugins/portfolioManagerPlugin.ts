/**
 * PORTFOLIO MANAGER PLUGIN
 * Tracks holdings and manages buy/sell decisions with profit targets
 */

import { TradingPlugin, TradingContext, TradingResult } from './pluginManager';

interface PortfolioHolding {
  buyPrice: number;
  amount: number;
  symbol: string;
  timestamp: number;
}

class PortfolioManager {
  private portfolio: { [symbol: string]: PortfolioHolding } = {};

  recordBuy(symbol: string, price: number, amount: number): void {
    this.portfolio[symbol] = { 
      buyPrice: price, 
      amount, 
      symbol,
      timestamp: Date.now()
    };
    console.log(`📈 Portfolio: Added ${symbol} at $${price}`);
  }

  getHoldings(): { [symbol: string]: PortfolioHolding } {
    return this.portfolio;
  }

  shouldSell(symbol: string, currentPrice: number): boolean {
    const token = this.portfolio[symbol];
    if (!token) return false;

    const takeProfit = token.buyPrice * 1.25; // 25% profit target
    const stopLoss = token.buyPrice * 0.90;   // 10% stop loss
    
    const shouldSellNow = currentPrice >= takeProfit || currentPrice <= stopLoss;
    
    if (shouldSellNow) {
      const profitPercent = ((currentPrice - token.buyPrice) / token.buyPrice * 100).toFixed(1);
      console.log(`🎯 Portfolio: ${symbol} sell signal - ${profitPercent}% gain/loss`);
    }
    
    return shouldSellNow;
  }

  removeHolding(symbol: string): void {
    if (this.portfolio[symbol]) {
      delete this.portfolio[symbol];
      console.log(`📉 Portfolio: Removed ${symbol} from holdings`);
    }
  }

  getPortfolioValue(currentPrices: Map<string, number>): number {
    let totalValue = 0;
    for (const [symbol, holding] of Object.entries(this.portfolio)) {
      const currentPrice = currentPrices.get(symbol) || holding.buyPrice;
      totalValue += currentPrice * holding.amount;
    }
    return totalValue;
  }

  getPortfolioStats(currentPrices: Map<string, number>) {
    const holdings = Object.values(this.portfolio);
    let totalInvested = 0;
    let currentValue = 0;
    let winners = 0;
    let losers = 0;

    for (const holding of holdings) {
      const invested = holding.buyPrice * holding.amount;
      const currentPrice = currentPrices.get(holding.symbol) || holding.buyPrice;
      const value = currentPrice * holding.amount;
      
      totalInvested += invested;
      currentValue += value;
      
      if (value > invested) winners++;
      else if (value < invested) losers++;
    }

    return {
      totalHoldings: holdings.length,
      totalInvested,
      currentValue,
      profitLoss: currentValue - totalInvested,
      profitLossPercent: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested * 100) : 0,
      winners,
      losers
    };
  }
}

export class PortfolioManagerPlugin implements TradingPlugin {
  name = 'PortfolioManager';
  version = '1.0.0';
  description = 'Tracks holdings and manages profit/loss targets';
  enabled = false;

  private portfolioManager = new PortfolioManager();

  async initialize(): Promise<void> {
    console.log('💼 Portfolio Manager Plugin initialized');
  }

  async execute(context: TradingContext): Promise<TradingResult> {
    try {
      // Check existing holdings for sell opportunities
      const holdings = this.portfolioManager.getHoldings();
      
      for (const [symbol, holding] of Object.entries(holdings)) {
        const currentPrice = context.market.prices.get(symbol) || holding.buyPrice;
        
        if (this.portfolioManager.shouldSell(symbol, currentPrice)) {
          return {
            success: true,
            action: 'SELL',
            token: symbol,
            amount: holding.amount,
            confidence: 90,
            reason: `Portfolio target reached for ${symbol}`
          };
        }
      }

      // Provide portfolio analytics
      const stats = this.portfolioManager.getPortfolioStats(context.market.prices);
      
      return {
        success: true,
        action: 'HOLD',
        confidence: 75,
        reason: `Portfolio: ${stats.totalHoldings} holdings, ${stats.profitLossPercent.toFixed(1)}% P/L, ${stats.winners}W/${stats.losers}L`
      };

    } catch (error) {
      return {
        success: false,
        reason: `Portfolio management failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('🔌 Portfolio Manager Plugin cleaned up');
  }

  // Public methods for external use
  public recordBuy(symbol: string, price: number, amount: number): void {
    this.portfolioManager.recordBuy(symbol, price, amount);
  }

  public getHoldings() {
    return this.portfolioManager.getHoldings();
  }

  public shouldSell(symbol: string, currentPrice: number): boolean {
    return this.portfolioManager.shouldSell(symbol, currentPrice);
  }

  public removeHolding(symbol: string): void {
    this.portfolioManager.removeHolding(symbol);
  }

  public getPortfolioStats(currentPrices: Map<string, number>) {
    return this.portfolioManager.getPortfolioStats(currentPrices);
  }
}

// Export singleton instance for global use
export const portfolioManagerPlugin = new PortfolioManagerPlugin();
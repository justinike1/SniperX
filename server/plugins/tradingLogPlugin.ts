/**
 * TRADING LOG PLUGIN
 * Enhanced trade logging with comprehensive tracking and analytics
 */

import { TradingPlugin, TradingContext, TradingResult } from './pluginManager';
import fs from 'fs';
import path from 'path';

const logFile = './server/logs/trade-log.json';

// Ensure logs directory exists
const logsDir = path.dirname(logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export class TradingLogPlugin implements TradingPlugin {
  name = 'TradingLog';
  version = '1.0.0';
  description = 'Comprehensive trade logging and analytics system';
  enabled = false;

  async initialize(): Promise<void> {
    console.log('📝 Trading Log Plugin initialized');
  }

  async execute(context: TradingContext): Promise<TradingResult> {
    try {
      // Log current trading context for analytics
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'CONTEXT_ANALYSIS',
        walletBalance: context.wallet.balance,
        walletAddress: context.wallet.address,
        marketPrices: Object.fromEntries(context.market.prices),
        marketVolume: Object.fromEntries(context.market.volume),
        config: context.config
      };

      this.logTrade(logEntry);

      // Analyze trading patterns
      const analytics = this.generateTradingAnalytics();

      return {
        success: true,
        action: 'HOLD',
        confidence: 85,
        reason: `Trading data logged. Recent trades: ${analytics.recentTradeCount}, Success rate: ${analytics.successRate.toFixed(1)}%`
      };

    } catch (error) {
      return {
        success: false,
        reason: `Logging failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('🔌 Trading Log Plugin cleaned up');
  }

  public logTrade(entry: any): void {
    let history: any[] = [];
    
    if (fs.existsSync(logFile)) {
      try {
        const fileContent = fs.readFileSync(logFile, 'utf8');
        history = JSON.parse(fileContent);
      } catch (error) {
        console.error('Error reading trade log:', error);
        history = [];
      }
    }
    
    // Add enhanced entry data
    const enhancedEntry = {
      id: entry.id || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      plugin: 'TradingLog',
      ...entry
    };
    
    history.push(enhancedEntry);
    
    try {
      fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
      console.log(`📝 Trade logged: ${enhancedEntry.id}`);
    } catch (error) {
      console.error('Error writing trade log:', error);
    }
  }

  public getTradeHistory(): any[] {
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    try {
      const fileContent = fs.readFileSync(logFile, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading trade history:', error);
      return [];
    }
  }

  private generateTradingAnalytics() {
    const history = this.getTradeHistory();
    const recentTrades = history.filter(trade => {
      const tradeTime = new Date(trade.timestamp);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return tradeTime > oneDayAgo;
    });

    const successfulTrades = recentTrades.filter(trade => 
      trade.type === 'BUY' || trade.type === 'SELL'
    );

    const successRate = recentTrades.length > 0 
      ? (successfulTrades.length / recentTrades.length) * 100 
      : 0;

    return {
      recentTradeCount: recentTrades.length,
      successRate,
      totalTrades: history.length
    };
  }
}

// Export singleton instance for global use
export const tradingLogPlugin = new TradingLogPlugin();
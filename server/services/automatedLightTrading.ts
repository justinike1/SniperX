import { WebSocketMessage } from '../routes';
import { RealMarketDataService } from './realMarketDataService';
import { AdvancedTradingEngine } from './advancedTradingEngine';
import { ProfitMaximizer } from './profitMaximizer';
import { RapidExitEngine } from './rapidExitEngine';
import { storage } from '../storage';

export interface LightTradingConfig {
  maxPositionSize: number; // Maximum 1% of portfolio per trade
  stopLossPercentage: number; // Conservative 1.5% stop loss
  takeProfitPercentage: number; // Conservative 4% take profit
  maxDailyTrades: number; // Maximum 5 trades per day
  minConfidenceScore: number; // Minimum 85% confidence
  riskLevel: 'ULTRA_CONSERVATIVE' | 'CONSERVATIVE' | 'MODERATE';
}

export interface ActiveTrade {
  id: string;
  tokenAddress: string;
  entryPrice: number;
  amount: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
  confidence: number;
  status: 'ACTIVE' | 'CLOSED' | 'STOPPED';
}

export class AutomatedLightTrading {
  private marketDataService: RealMarketDataService;
  private tradingEngine: AdvancedTradingEngine;
  private profitMaximizer: ProfitMaximizer;
  private rapidExitEngine: RapidExitEngine;
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  
  private config: LightTradingConfig = {
    maxPositionSize: 0.01, // 1% max position size
    stopLossPercentage: 1.5, // 1.5% stop loss
    takeProfitPercentage: 4.0, // 4% take profit
    maxDailyTrades: 5, // Maximum 5 trades per day
    minConfidenceScore: 85, // 85% minimum confidence
    riskLevel: 'ULTRA_CONSERVATIVE'
  };

  private activeTrades: Map<string, ActiveTrade> = new Map();
  private dailyTradeCount: number = 0;
  private lastResetDate: string = '';
  private isActive: boolean = false;
  private totalProfit: number = 0;
  private successfulTrades: number = 0;
  private totalTrades: number = 0;

  constructor() {
    this.marketDataService = new RealMarketDataService();
    this.tradingEngine = new AdvancedTradingEngine();
    this.profitMaximizer = new ProfitMaximizer();
    this.rapidExitEngine = new RapidExitEngine();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  async startLightTrading(userId: number) {
    this.isActive = true;
    this.resetDailyCountIfNeeded();
    
    console.log(`🤖 Automated Light Trading: ACTIVATED for user ${userId}`);
    console.log(`📊 Config: Max ${this.config.maxPositionSize * 100}% position, ${this.config.stopLossPercentage}% stop loss, ${this.config.takeProfitPercentage}% take profit`);
    
    this.broadcastStatus('LIGHT_TRADING_STARTED', {
      config: this.config,
      message: 'Automated light trading activated with ultra-conservative settings'
    });

    // Start monitoring and trading loop
    this.startTradingLoop(userId);
    
    return {
      success: true,
      message: 'Automated light trading activated',
      config: this.config,
      status: 'ACTIVE'
    };
  }

  async stopLightTrading() {
    this.isActive = false;
    
    // Close all active trades
    const trades = Array.from(this.activeTrades.values());
    for (const trade of trades) {
      await this.closeTrade(trade.id, 'MANUAL_STOP');
    }

    console.log(`🛑 Automated Light Trading: DEACTIVATED`);
    this.broadcastStatus('LIGHT_TRADING_STOPPED', {
      totalTrades: this.totalTrades,
      successfulTrades: this.successfulTrades,
      totalProfit: this.totalProfit,
      winRate: this.totalTrades > 0 ? (this.successfulTrades / this.totalTrades) * 100 : 0
    });

    return {
      success: true,
      message: 'Automated light trading deactivated',
      stats: this.getStats()
    };
  }

  private async startTradingLoop(userId: number) {
    if (!this.isActive) return;

    try {
      // Check for trading opportunities every 45 seconds
      await this.scanForTradingOpportunities(userId);
      
      // Monitor active trades
      await this.monitorActiveTrades();
      
      // Schedule next scan
      setTimeout(() => this.startTradingLoop(userId), 45000);
    } catch (error) {
      console.error('Error in trading loop:', error);
      setTimeout(() => this.startTradingLoop(userId), 60000); // Retry in 1 minute
    }
  }

  private async scanForTradingOpportunities(userId: number) {
    if (this.dailyTradeCount >= this.config.maxDailyTrades) {
      console.log(`📊 Daily trade limit reached (${this.config.maxDailyTrades})`);
      return;
    }

    try {
      // Get high-confidence trading signals from market data
      const tokens = await storage.getAllTokens(20);
      
      for (const token of tokens) {
        if (!token.priceUsd) continue;
        
        const signal = await this.tradingEngine.analyzeToken(token.address);
        
        if (signal.confidence >= this.config.minConfidenceScore && 
            signal.action === 'BUY' &&
            this.activeTrades.size < 3) { // Maximum 3 concurrent trades
          
          await this.executeLightTrade(userId, signal);
          break; // Only execute one trade per scan
        }
      }
    } catch (error) {
      console.error('Error scanning for opportunities:', error);
    }
  }

  private async executeLightTrade(userId: number, opportunity: any) {
    try {
      const userWallet = await storage.getWalletBalance(userId, 'SOL');
      if (!userWallet || parseFloat(userWallet.balance) < 0.1) {
        console.log('❌ Insufficient SOL balance for trading');
        return;
      }

      const portfolioValue = parseFloat(userWallet.balance);
      const tradeAmount = portfolioValue * this.config.maxPositionSize;

      if (tradeAmount < 0.01) { // Minimum trade size
        console.log('❌ Trade amount too small');
        return;
      }

      const currentPrice = opportunity.targetPrice || opportunity.currentPrice;
      const stopLoss = currentPrice * (1 - this.config.stopLossPercentage / 100);
      const takeProfit = currentPrice * (1 + this.config.takeProfitPercentage / 100);

      const tradeId = `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const trade: ActiveTrade = {
        id: tradeId,
        tokenAddress: opportunity.tokenAddress,
        entryPrice: currentPrice,
        amount: tradeAmount,
        stopLoss,
        takeProfit,
        timestamp: Date.now(),
        confidence: opportunity.confidence,
        status: 'ACTIVE'
      };

      this.activeTrades.set(tradeId, trade);
      this.dailyTradeCount++;
      this.totalTrades++;

      // Record trade in database
      await storage.createTrade({
        userId,
        tokenAddress: opportunity.tokenAddress,
        tokenSymbol: opportunity.tokenAddress.slice(0, 8),
        type: 'BUY',
        amount: tradeAmount.toString(),
        price: currentPrice.toString(),
        status: 'PENDING'
      });

      console.log(`✅ Light Trade Executed: ${opportunity.tokenAddress.slice(0, 8)}... at $${currentPrice.toFixed(6)}`);
      console.log(`📊 Amount: ${tradeAmount.toFixed(4)} SOL | SL: $${stopLoss.toFixed(6)} | TP: $${takeProfit.toFixed(6)}`);

      this.broadcastStatus('TRADE_EXECUTED', {
        trade,
        opportunity,
        stats: this.getStats()
      });

    } catch (error) {
      console.error('Error executing light trade:', error);
    }
  }

  private async monitorActiveTrades() {
    const trades = Array.from(this.activeTrades.values());
    for (const trade of trades) {
      try {
        const currentPrice = await this.getCurrentPrice(trade.tokenAddress);
        
        if (currentPrice === 0) continue; // Skip if price unavailable
        
        // Check stop loss
        if (currentPrice <= trade.stopLoss) {
          await this.closeTrade(trade.id, 'STOP_LOSS', currentPrice);
          continue;
        }

        // Check take profit
        if (currentPrice >= trade.takeProfit) {
          await this.closeTrade(trade.id, 'TAKE_PROFIT', currentPrice);
          continue;
        }

        // Check for time-based exit (24 hour max hold)
        const holdTime = Date.now() - trade.timestamp;
        if (holdTime > 24 * 60 * 60 * 1000) { // 24 hours
          await this.closeTrade(trade.id, 'TIME_EXIT', currentPrice);
        }

      } catch (error) {
        console.error(`Error monitoring trade ${trade.id}:`, error);
      }
    }
  }

  private async closeTrade(tradeId: string, reason: string, exitPrice?: number) {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return;

    const currentPrice = exitPrice || await this.getCurrentPrice(trade.tokenAddress);
    const pnl = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
    const profitAmount = trade.amount * (pnl / 100);

    trade.status = 'CLOSED';
    this.activeTrades.delete(tradeId);

    if (pnl > 0) {
      this.successfulTrades++;
      this.totalProfit += profitAmount;
    }

    console.log(`🔚 Trade Closed: ${reason} | PnL: ${pnl.toFixed(2)}% | Profit: ${profitAmount.toFixed(4)} SOL`);

    this.broadcastStatus('TRADE_CLOSED', {
      trade,
      reason,
      pnl,
      profitAmount,
      exitPrice: currentPrice,
      stats: this.getStats()
    });
  }

  private async getCurrentPrice(tokenAddress: string): Promise<number> {
    try {
      const tokenData = await storage.getTokenData(tokenAddress);
      return tokenData && tokenData.priceUsd ? parseFloat(tokenData.priceUsd) : 0;
    } catch (error) {
      console.error('Error getting current price:', error);
      return 0;
    }
  }

  private resetDailyCountIfNeeded() {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyTradeCount = 0;
      this.lastResetDate = today;
      console.log('🔄 Daily trade count reset');
    }
  }

  private broadcastStatus(type: string, data: any) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'BOT_STATUS' as any,
        data: {
          lightTrading: true,
          type,
          ...data,
          timestamp: Date.now()
        }
      });
    }
  }

  getStats() {
    return {
      isActive: this.isActive,
      activeTrades: this.activeTrades.size,
      dailyTradeCount: this.dailyTradeCount,
      totalTrades: this.totalTrades,
      successfulTrades: this.successfulTrades,
      winRate: this.totalTrades > 0 ? (this.successfulTrades / this.totalTrades) * 100 : 0,
      totalProfit: this.totalProfit,
      config: this.config
    };
  }

  getActiveTrades() {
    return Array.from(this.activeTrades.values());
  }

  updateConfig(newConfig: Partial<LightTradingConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Light trading config updated:', this.config);
    
    this.broadcastStatus('CONFIG_UPDATED', {
      config: this.config
    });
  }
}

export const automatedLightTrading = new AutomatedLightTrading();
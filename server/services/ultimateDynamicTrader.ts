import { WebSocketMessage } from '../routes';
import { storage } from '../storage';

export interface DynamicTradingPosition {
  tokenAddress: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  side: 'BUY' | 'SELL';
  profitLoss: number;
  profitPercentage: number;
  timeHeld: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  strategy: string;
  marketCondition: string;
}

export interface DynamicTradingSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  tokenAddress: string;
  symbol: string;
  price: number;
  amount: number;
  confidence: number;
  reasoning: string[];
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  marketTiming: 'PERFECT' | 'GOOD' | 'AVERAGE' | 'POOR';
  riskLevel: number;
  expectedReturn: number;
  timeframe: string;
  strategy: string;
}

export interface MarketCondition {
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  volume: 'LOW' | 'NORMAL' | 'HIGH' | 'MASSIVE';
  momentum: number; // -100 to 100
  sentiment: number; // 0 to 100
  liquidityFlow: 'INFLOW' | 'OUTFLOW' | 'BALANCED';
  manipulationRisk: number; // 0 to 100
}

export class UltimateDynamicTrader {
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private activePositions: Map<string, DynamicTradingPosition> = new Map();
  private tradingQueue: DynamicTradingSignal[] = [];
  private isActive = false;
  
  // Dynamic Trading Metrics
  private totalTrades = 0;
  private winningTrades = 0;
  private losingTrades = 0;
  private totalProfit = 0;
  private maxDrawdown = 0;
  private currentDrawdown = 0;
  private winRate = 0;
  private avgHoldTime = 0;
  
  // Adaptive Parameters
  private buyThreshold = 75; // Confidence required for buying
  private sellThreshold = 70; // Confidence required for selling
  private maxPositions = 8;
  private positionSizePercent = 12; // Percentage of portfolio per trade
  private stopLossPercent = 2.5; // Dynamic stop loss
  private takeProfitPercent = 8.0; // Dynamic take profit
  
  // Market Analysis Cache
  private marketConditions: Map<string, MarketCondition> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();
  
  constructor() {
    this.initializeDynamicTrading();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  private async initializeDynamicTrading() {
    console.log('🚀 ULTIMATE DYNAMIC TRADER: Initializing revolutionary trading engine');
    
    // Start continuous market analysis
    this.startContinuousAnalysis();
    
    // Start dynamic trade execution
    this.startDynamicTradeExecution();
    
    // Start position management
    this.startPositionManagement();
    
    // Start performance optimization
    this.startPerformanceOptimization();
    
    this.isActive = true;
    this.broadcastStatus();
  }

  private startContinuousAnalysis() {
    // Analyze markets every 10 seconds for dynamic opportunities
    setInterval(async () => {
      try {
        await this.analyzeDynamicOpportunities();
      } catch (error) {
        console.error('Dynamic analysis error:', error);
      }
    }, 10000);
  }

  private startDynamicTradeExecution() {
    // Execute trades every 15 seconds with intelligent timing
    setInterval(async () => {
      try {
        await this.executeDynamicTrades();
      } catch (error) {
        console.error('Dynamic execution error:', error);
      }
    }, 15000);
  }

  private startPositionManagement() {
    // Manage positions every 20 seconds
    setInterval(async () => {
      try {
        await this.manageDynamicPositions();
      } catch (error) {
        console.error('Position management error:', error);
      }
    }, 20000);
  }

  private startPerformanceOptimization() {
    // Optimize parameters every 2 minutes
    setInterval(async () => {
      try {
        await this.optimizeTradingParameters();
      } catch (error) {
        console.error('Performance optimization error:', error);
      }
    }, 120000);
  }

  private async analyzeDynamicOpportunities() {
    // Get trending tokens for analysis
    const trendingTokens = [
      { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', price: 185.42 },
      { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', price: 0.000032 },
      { symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', price: 0.89 },
      { symbol: 'WIF', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', price: 2.14 },
      { symbol: 'ORCA', address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', price: 3.67 },
      { symbol: 'RAY', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', price: 4.82 }
    ];

    for (const token of trendingTokens) {
      // Analyze market conditions
      const marketCondition = await this.analyzeMarketCondition(token);
      this.marketConditions.set(token.address, marketCondition);
      
      // Generate dynamic trading signals
      const signal = await this.generateDynamicSignal(token, marketCondition);
      
      if (signal && signal.action !== 'HOLD') {
        this.tradingQueue.push(signal);
        
        // Log the analysis
        console.log(`📊 DYNAMIC ANALYSIS: ${token.symbol} - ${signal.action} signal with ${signal.confidence}% confidence`);
        console.log(`   Market: ${marketCondition.trend} | Volatility: ${marketCondition.volatility} | Momentum: ${marketCondition.momentum}`);
      }
    }
  }

  private async analyzeMarketCondition(token: any): Promise<MarketCondition> {
    // Update price history
    if (!this.priceHistory.has(token.address)) {
      this.priceHistory.set(token.address, []);
    }
    const prices = this.priceHistory.get(token.address)!;
    prices.push(token.price);
    if (prices.length > 20) prices.shift(); // Keep last 20 prices
    
    // Calculate trend
    const trend = this.calculateTrend(prices);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(prices);
    
    // Calculate momentum
    const momentum = this.calculateMomentum(prices);
    
    // Mock volume and sentiment (would be real data in production)
    const volume = Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'NORMAL' : 'LOW';
    const sentiment = Math.random() * 100;
    
    return {
      trend: trend as 'BULLISH' | 'BEARISH' | 'SIDEWAYS',
      volatility: volatility as 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
      volume: volume as 'LOW' | 'NORMAL' | 'HIGH' | 'MASSIVE',
      momentum,
      sentiment,
      liquidityFlow: momentum > 20 ? 'INFLOW' : momentum < -20 ? 'OUTFLOW' : 'BALANCED',
      manipulationRisk: Math.random() * 30 // Low manipulation risk for major tokens
    };
  }

  private calculateTrend(prices: number[]): string {
    if (prices.length < 3) return 'SIDEWAYS';
    
    const recent = prices.slice(-5);
    const older = prices.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 2) return 'BULLISH';
    if (change < -2) return 'BEARISH';
    return 'SIDEWAYS';
  }

  private calculateVolatility(prices: number[]): string {
    if (prices.length < 2) return 'LOW';
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const variance = returns.reduce((sum, ret) => {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      return sum + Math.pow(ret - mean, 2);
    }, 0) / returns.length;
    
    const volatility = Math.sqrt(variance) * 100;
    
    if (volatility > 10) return 'EXTREME';
    if (volatility > 5) return 'HIGH';
    if (volatility > 2) return 'MEDIUM';
    return 'LOW';
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 5) return 0;
    
    const recent = prices.slice(-3);
    const older = prices.slice(-6, -3);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  private async generateDynamicSignal(token: any, marketCondition: MarketCondition): Promise<DynamicTradingSignal | null> {
    const currentPosition = this.activePositions.get(token.address);
    
    // DYNAMIC SELLING LOGIC - Priority for profit taking and loss prevention
    if (currentPosition && currentPosition.side === 'BUY') {
      const profitPercentage = ((token.price - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;
      
      // SMART PROFIT TAKING - Sell when profitable
      if (profitPercentage >= this.takeProfitPercent) {
        return {
          action: 'SELL',
          tokenAddress: token.address,
          symbol: token.symbol,
          price: token.price,
          amount: currentPosition.amount,
          confidence: 95,
          reasoning: [`Taking ${profitPercentage.toFixed(1)}% profit`, 'Target reached', 'Securing gains'],
          urgency: 'HIGH',
          marketTiming: 'PERFECT',
          riskLevel: 10,
          expectedReturn: profitPercentage,
          timeframe: 'IMMEDIATE',
          strategy: 'PROFIT_TAKING'
        };
      }
      
      // STOP LOSS PROTECTION - Sell when losing too much
      if (profitPercentage <= -this.stopLossPercent) {
        return {
          action: 'SELL',
          tokenAddress: token.address,
          symbol: token.symbol,
          price: token.price,
          amount: currentPosition.amount,
          confidence: 100,
          reasoning: [`Stop loss triggered at ${profitPercentage.toFixed(1)}%`, 'Risk management', 'Preventing larger loss'],
          urgency: 'CRITICAL',
          marketTiming: 'GOOD',
          riskLevel: 90,
          expectedReturn: profitPercentage,
          timeframe: 'IMMEDIATE',
          strategy: 'STOP_LOSS'
        };
      }
      
      // TREND REVERSAL SELLING - Sell if trend turns bearish
      if (marketCondition.trend === 'BEARISH' && marketCondition.momentum < -15) {
        return {
          action: 'SELL',
          tokenAddress: token.address,
          symbol: token.symbol,
          price: token.price,
          amount: currentPosition.amount,
          confidence: 85,
          reasoning: ['Bearish trend detected', 'Momentum turning negative', 'Risk reduction'],
          urgency: 'HIGH',
          marketTiming: 'GOOD',
          riskLevel: 70,
          expectedReturn: profitPercentage,
          timeframe: 'SHORT',
          strategy: 'TREND_REVERSAL'
        };
      }
    }
    
    // DYNAMIC BUYING LOGIC - Only buy in good conditions, avoid all-time highs
    if (!currentPosition && this.activePositions.size < this.maxPositions) {
      let buyConfidence = 0;
      const reasoning: string[] = [];
      
      // Market condition scoring
      if (marketCondition.trend === 'BULLISH') {
        buyConfidence += 25;
        reasoning.push('Bullish trend confirmed');
      }
      
      if (marketCondition.momentum > 10) {
        buyConfidence += 20;
        reasoning.push('Strong upward momentum');
      }
      
      if (marketCondition.volatility === 'LOW' || marketCondition.volatility === 'MEDIUM') {
        buyConfidence += 15;
        reasoning.push('Healthy volatility levels');
      }
      
      if (marketCondition.volume === 'HIGH') {
        buyConfidence += 15;
        reasoning.push('High volume confirmation');
      }
      
      if (marketCondition.sentiment > 70) {
        buyConfidence += 10;
        reasoning.push('Positive market sentiment');
      }
      
      if (marketCondition.manipulationRisk < 20) {
        buyConfidence += 10;
        reasoning.push('Low manipulation risk');
      }
      
      // Price position analysis - avoid buying at highs
      const prices = this.priceHistory.get(token.address) || [];
      if (prices.length > 5) {
        const maxRecent = Math.max(...prices.slice(-10));
        const currentPricePosition = (token.price / maxRecent) * 100;
        
        if (currentPricePosition < 95) { // Not at all-time high
          buyConfidence += 5;
          reasoning.push('Not buying at recent highs');
        } else {
          buyConfidence -= 30; // Penalize buying at highs
          reasoning.push('Price near recent highs - waiting');
        }
      }
      
      // Only buy if confidence is high enough
      if (buyConfidence >= this.buyThreshold) {
        return {
          action: 'BUY',
          tokenAddress: token.address,
          symbol: token.symbol,
          price: token.price,
          amount: this.calculatePositionSize(token.price),
          confidence: buyConfidence,
          reasoning,
          urgency: buyConfidence > 90 ? 'HIGH' : 'MEDIUM',
          marketTiming: buyConfidence > 85 ? 'PERFECT' : 'GOOD',
          riskLevel: 100 - buyConfidence,
          expectedReturn: this.takeProfitPercent,
          timeframe: 'SHORT',
          strategy: 'DYNAMIC_ENTRY'
        };
      }
    }
    
    return null; // Hold position
  }

  private calculatePositionSize(price: number): number {
    // Calculate position size based on portfolio percentage
    const portfolioValue = 1000; // Mock portfolio value
    const positionValue = (portfolioValue * this.positionSizePercent) / 100;
    return positionValue / price;
  }

  private async executeDynamicTrades() {
    if (this.tradingQueue.length === 0) return;
    
    // Process highest priority trades first
    this.tradingQueue.sort((a, b) => {
      const urgencyScore = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return urgencyScore[b.urgency] - urgencyScore[a.urgency] || b.confidence - a.confidence;
    });
    
    const signal = this.tradingQueue.shift()!;
    
    try {
      // Execute the trade
      await this.executeTradeSignal(signal);
      
      // Update statistics
      this.totalTrades++;
      this.updateTradingMetrics();
      
      console.log(`🎯 EXECUTED: ${signal.action} ${signal.symbol} at $${signal.price.toFixed(6)} with ${signal.confidence}% confidence`);
      console.log(`   Strategy: ${signal.strategy} | Urgency: ${signal.urgency} | Expected Return: ${signal.expectedReturn.toFixed(1)}%`);
      
    } catch (error) {
      console.error('Trade execution error:', error);
    }
  }

  private async executeTradeSignal(signal: DynamicTradingSignal) {
    if (signal.action === 'BUY') {
      // Create new position
      const position: DynamicTradingPosition = {
        tokenAddress: signal.tokenAddress,
        symbol: signal.symbol,
        entryPrice: signal.price,
        currentPrice: signal.price,
        amount: signal.amount,
        side: 'BUY',
        profitLoss: 0,
        profitPercentage: 0,
        timeHeld: 0,
        stopLoss: signal.price * (1 - this.stopLossPercent / 100),
        takeProfit: signal.price * (1 + this.takeProfitPercent / 100),
        confidence: signal.confidence,
        strategy: signal.strategy,
        marketCondition: this.marketConditions.get(signal.tokenAddress)?.trend || 'UNKNOWN'
      };
      
      this.activePositions.set(signal.tokenAddress, position);
      
      // Store trade in database
      await storage.createTrade({
        userId: 1, // Will be updated with real user ID
        tokenAddress: signal.tokenAddress,
        tokenSymbol: signal.symbol,
        amount: signal.amount.toString(),
        price: signal.price.toString(),
        type: 'BUY',
        txHash: `dynamic_${Date.now()}`
      });
      
    } else if (signal.action === 'SELL') {
      // Close position
      const position = this.activePositions.get(signal.tokenAddress);
      if (position) {
        const profitLoss = (signal.price - position.entryPrice) * position.amount;
        const profitPercentage = ((signal.price - position.entryPrice) / position.entryPrice) * 100;
        
        // Update win/loss statistics
        if (profitLoss > 0) {
          this.winningTrades++;
        } else {
          this.losingTrades++;
        }
        
        this.totalProfit += profitLoss;
        this.activePositions.delete(signal.tokenAddress);
        
        // Store trade in database
        await storage.createTrade({
          userId: 1, // Will be updated with real user ID
          tokenAddress: signal.tokenAddress,
          tokenSymbol: signal.symbol,
          amount: position.amount.toString(),
          price: signal.price.toString(),
          type: 'SELL',
          txHash: `dynamic_${Date.now()}`,
          status: profitLoss > 0 ? 'PROFIT' : 'LOSS'
        });
        
        console.log(`💰 POSITION CLOSED: ${signal.symbol} | P&L: ${profitLoss > 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${profitPercentage.toFixed(1)}%)`);
      }
    }
    
    // Broadcast trade execution
    this.broadcastTradeExecution(signal);
  }

  private async manageDynamicPositions() {
    // Update all active positions with current prices
    for (const [address, position] of this.activePositions) {
      // Mock price update (would be real market data)
      const priceChange = (Math.random() - 0.5) * 0.1; // ±5% random price movement
      position.currentPrice *= (1 + priceChange);
      
      // Update P&L
      position.profitLoss = (position.currentPrice - position.entryPrice) * position.amount;
      position.profitPercentage = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
      position.timeHeld++;
      
      // Check for automatic stop loss or take profit
      if (position.currentPrice <= position.stopLoss || position.currentPrice >= position.takeProfit) {
        const signal: DynamicTradingSignal = {
          action: 'SELL',
          tokenAddress: address,
          symbol: position.symbol,
          price: position.currentPrice,
          amount: position.amount,
          confidence: 100,
          reasoning: position.currentPrice >= position.takeProfit ? ['Take profit triggered'] : ['Stop loss triggered'],
          urgency: 'CRITICAL',
          marketTiming: 'PERFECT',
          riskLevel: 10,
          expectedReturn: position.profitPercentage,
          timeframe: 'IMMEDIATE',
          strategy: position.currentPrice >= position.takeProfit ? 'TAKE_PROFIT' : 'STOP_LOSS'
        };
        
        this.tradingQueue.unshift(signal); // High priority
      }
    }
  }

  private updateTradingMetrics() {
    this.winRate = this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0;
    
    // Calculate current drawdown
    if (this.totalProfit < 0 && Math.abs(this.totalProfit) > this.maxDrawdown) {
      this.maxDrawdown = Math.abs(this.totalProfit);
    }
    
    this.currentDrawdown = this.totalProfit < 0 ? Math.abs(this.totalProfit) : 0;
  }

  private async optimizeTradingParameters() {
    // Adaptive parameter optimization based on performance
    if (this.winRate < 60) {
      // Increase thresholds if win rate is low
      this.buyThreshold = Math.min(85, this.buyThreshold + 2);
      this.sellThreshold = Math.min(80, this.sellThreshold + 2);
      console.log('📈 OPTIMIZATION: Increased confidence thresholds for better accuracy');
    } else if (this.winRate > 85) {
      // Decrease thresholds if win rate is very high (to capture more opportunities)
      this.buyThreshold = Math.max(65, this.buyThreshold - 1);
      this.sellThreshold = Math.max(60, this.sellThreshold - 1);
      console.log('📈 OPTIMIZATION: Decreased confidence thresholds to capture more opportunities');
    }
    
    // Adjust position sizing based on performance
    if (this.currentDrawdown > 100) {
      this.positionSizePercent = Math.max(5, this.positionSizePercent - 1);
      console.log('📈 OPTIMIZATION: Reduced position size due to drawdown');
    } else if (this.totalProfit > 200 && this.winRate > 75) {
      this.positionSizePercent = Math.min(20, this.positionSizePercent + 1);
      console.log('📈 OPTIMIZATION: Increased position size due to strong performance');
    }
  }

  private broadcastTradeExecution(signal: DynamicTradingSignal) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'NEW_TRADE',
        data: {
          action: signal.action,
          symbol: signal.symbol,
          price: signal.price,
          amount: signal.amount,
          confidence: signal.confidence,
          strategy: signal.strategy,
          reasoning: signal.reasoning.join(', '),
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private broadcastStatus() {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'BOT_STATUS',
        data: {
          type: 'ULTIMATE_DYNAMIC_TRADER',
          isActive: this.isActive,
          totalTrades: this.totalTrades,
          winRate: this.winRate,
          totalProfit: this.totalProfit,
          activePositions: this.activePositions.size,
          maxPositions: this.maxPositions,
          buyThreshold: this.buyThreshold,
          sellThreshold: this.sellThreshold,
          positionSizePercent: this.positionSizePercent,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Public methods for external control
  async getStatus() {
    return {
      isActive: this.isActive,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate: this.winRate,
      totalProfit: this.totalProfit,
      activePositions: Array.from(this.activePositions.values()),
      tradingQueue: this.tradingQueue.length,
      buyThreshold: this.buyThreshold,
      sellThreshold: this.sellThreshold,
      positionSizePercent: this.positionSizePercent,
      maxDrawdown: this.maxDrawdown,
      currentDrawdown: this.currentDrawdown
    };
  }

  async pauseTrading() {
    this.isActive = false;
    console.log('⏸️ ULTIMATE DYNAMIC TRADER: Trading paused');
    this.broadcastStatus();
  }

  async resumeTrading() {
    this.isActive = true;
    console.log('▶️ ULTIMATE DYNAMIC TRADER: Trading resumed');
    this.broadcastStatus();
  }

  async emergencyStop() {
    this.isActive = false;
    // Close all positions immediately
    for (const [address, position] of this.activePositions) {
      const signal: DynamicTradingSignal = {
        action: 'SELL',
        tokenAddress: address,
        symbol: position.symbol,
        price: position.currentPrice,
        amount: position.amount,
        confidence: 100,
        reasoning: ['Emergency stop activated'],
        urgency: 'CRITICAL',
        marketTiming: 'EMERGENCY',
        riskLevel: 100,
        expectedReturn: position.profitPercentage,
        timeframe: 'IMMEDIATE',
        strategy: 'EMERGENCY_EXIT'
      };
      
      this.tradingQueue.unshift(signal);
    }
    
    console.log('🚨 ULTIMATE DYNAMIC TRADER: Emergency stop activated - closing all positions');
    this.broadcastStatus();
  }
}

export const ultimateDynamicTrader = new UltimateDynamicTrader();
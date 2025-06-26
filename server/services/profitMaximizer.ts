import { AdvancedTradingEngine, TradingSignal } from './advancedTradingEngine';
import { RealMarketDataService } from './realMarketData';
import { WebSocketMessage } from '../routes';

export interface ProfitStrategy {
  name: string;
  description: string;
  expectedReturn: number;
  riskLevel: number;
  timeframe: string;
  conditions: string[];
  active: boolean;
}

export interface PortfolioOptimization {
  allocation: Map<string, number>;
  expectedReturn: number;
  riskLevel: number;
  diversificationScore: number;
  rebalanceNeeded: boolean;
}

export class ProfitMaximizer {
  private tradingEngine: AdvancedTradingEngine;
  private marketData: RealMarketDataService;
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private activeStrategies: Map<string, ProfitStrategy> = new Map();
  private portfolioBalance = 1000; // Starting balance in SOL
  private winRate = 0;
  private totalTrades = 0;
  private profitableTrades = 0;

  constructor() {
    this.tradingEngine = new AdvancedTradingEngine();
    this.marketData = new RealMarketDataService();
    this.initializeStrategies();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
    this.tradingEngine.setWebSocketBroadcast(broadcast);
  }

  private initializeStrategies() {
    const strategies: ProfitStrategy[] = [
      {
        name: 'Momentum Scalper',
        description: 'Capitalize on strong price movements with quick entries and exits',
        expectedReturn: 15,
        riskLevel: 60,
        timeframe: '5-15 minutes',
        conditions: ['Price momentum > 10%', 'Volume spike > 200%', 'RSI < 70'],
        active: true
      },
      {
        name: 'Whale Following',
        description: 'Follow major wallet movements for institutional-level profits',
        expectedReturn: 25,
        riskLevel: 40,
        timeframe: '30 minutes - 2 hours',
        conditions: ['Whale transaction > $50k', 'Token age < 24h', 'Liquidity > $100k'],
        active: true
      },
      {
        name: 'Arbitrage Hunter',
        description: 'Exploit price differences across DEXs for risk-free profits',
        expectedReturn: 8,
        riskLevel: 15,
        timeframe: '1-5 minutes',
        conditions: ['Price difference > 2%', 'Sufficient liquidity', 'Gas costs < 0.5%'],
        active: true
      },
      {
        name: 'New Token Sniper',
        description: 'Early entry into high-potential new token launches',
        expectedReturn: 50,
        riskLevel: 80,
        timeframe: '1 hour - 1 day',
        conditions: ['Token age < 1 hour', 'Dev wallet < 20%', 'Liquidity locked'],
        active: true
      },
      {
        name: 'Pattern Recognition',
        description: 'AI-powered chart pattern identification for optimal entries',
        expectedReturn: 20,
        riskLevel: 45,
        timeframe: '2-6 hours',
        conditions: ['Bullish pattern confirmed', 'Volume confirmation', 'Support level tested'],
        active: true
      }
    ];

    strategies.forEach(strategy => {
      this.activeStrategies.set(strategy.name, strategy);
    });
  }

  async executeMaximumProfitScan() {
    const opportunities = await this.tradingEngine.scanForOpportunities();
    const enhancedOpportunities = [];

    for (const opp of opportunities) {
      const enhancement = await this.enhanceOpportunityAnalysis(opp);
      if (enhancement.profitPotential > 20) {
        enhancedOpportunities.push(enhancement);
      }
    }

    // Sort by profit potential
    enhancedOpportunities.sort((a, b) => b.profitPotential - a.profitPotential);

    if (enhancedOpportunities.length > 0) {
      this.broadcastProfitOpportunities(enhancedOpportunities);
    }

    return enhancedOpportunities;
  }

  private async enhanceOpportunityAnalysis(opportunity: any) {
    const { token, signal } = opportunity;
    
    // Multi-factor profit analysis
    const liquidityScore = this.calculateLiquidityScore(token);
    const momentumScore = this.calculateMomentumScore(token);
    const whaleInfluence = await this.assessWhaleInfluence(token.address);
    const marketSentiment = await this.getMarketSentiment(token.address);

    const profitPotential = (
      signal.estimatedReturn * 0.3 +
      liquidityScore * 0.2 +
      momentumScore * 0.25 +
      whaleInfluence * 0.15 +
      marketSentiment * 0.1
    ) * 100;

    return {
      ...opportunity,
      profitPotential,
      liquidityScore,
      momentumScore,
      whaleInfluence,
      marketSentiment,
      optimalEntryPrice: await this.calculateOptimalEntry(token.address),
      maxPosition: this.calculateMaxPosition(profitPotential, signal.riskLevel),
      exitStrategy: this.generateExitStrategy(signal, profitPotential)
    };
  }

  private calculateLiquidityScore(token: any): number {
    if (token.liquidity > 1000000) return 100;
    if (token.liquidity > 500000) return 80;
    if (token.liquidity > 100000) return 60;
    if (token.liquidity > 50000) return 40;
    return 20;
  }

  private calculateMomentumScore(token: any): number {
    const priceChange = Math.abs(token.priceChange24h || 0);
    const volumeRatio = token.volume24h / (token.marketCap || 1);
    
    return Math.min((priceChange * 2 + volumeRatio * 100), 100);
  }

  private async assessWhaleInfluence(tokenAddress: string): Promise<number> {
    const whaleActivity = await this.marketData.getWhaleTransactions(tokenAddress);
    const recentWhales = whaleActivity.filter(tx => 
      Date.now() - new Date(tx.timestamp).getTime() < 3600000 // Last hour
    );
    
    return Math.min(recentWhales.length * 20, 100);
  }

  private async getMarketSentiment(tokenAddress: string): Promise<number> {
    // Simulate sentiment analysis from social media and news
    const sentiment = Math.random() * 100;
    return sentiment > 70 ? 90 : sentiment > 50 ? 70 : sentiment > 30 ? 50 : 30;
  }

  private async calculateOptimalEntry(tokenAddress: string): Promise<number> {
    const currentPrice = await this.marketData.getTokenPrice(tokenAddress);
    const metadata = await this.marketData.getTokenMetadata(tokenAddress);
    
    // Calculate optimal entry based on support levels and momentum
    const supportLevel = currentPrice * 0.98;
    const momentumEntry = currentPrice * (metadata?.priceChange24h > 0 ? 1.002 : 0.998);
    
    return Math.min(supportLevel, momentumEntry);
  }

  private calculateMaxPosition(profitPotential: number, riskLevel: number): number {
    const basePosition = this.portfolioBalance * 0.1; // 10% max per trade
    const profitMultiplier = Math.min(profitPotential / 100, 2);
    const riskAdjustment = 1 - (riskLevel / 200);
    
    return basePosition * profitMultiplier * riskAdjustment;
  }

  private generateExitStrategy(signal: TradingSignal, profitPotential: number) {
    return {
      takeProfit1: signal.targetPrice * 0.7, // 70% of target
      takeProfit2: signal.targetPrice,       // Full target
      takeProfit3: signal.targetPrice * 1.3, // Extended target
      stopLoss: signal.stopLoss,
      trailingStop: profitPotential > 30 ? 0.05 : 0.08, // 5% or 8% trailing
      maxHoldTime: profitPotential > 40 ? '24h' : '12h'
    };
  }

  private broadcastProfitOpportunities(opportunities: any[]) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'NOTIFICATION',
        data: {
          type: 'PROFIT_OPPORTUNITIES',
          opportunities: opportunities.slice(0, 5), // Top 5
          totalFound: opportunities.length,
          avgProfitPotential: opportunities.reduce((sum, opp) => sum + opp.profitPotential, 0) / opportunities.length,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async optimizePortfolio(currentHoldings: any[] = []) {
    const optimization: PortfolioOptimization = {
      allocation: new Map(),
      expectedReturn: 0,
      riskLevel: 0,
      diversificationScore: 0,
      rebalanceNeeded: false
    };

    // Get top opportunities
    const opportunities = await this.executeMaximumProfitScan();
    
    // Calculate optimal allocation
    let totalWeight = 0;
    opportunities.slice(0, 10).forEach(opp => {
      const weight = opp.profitPotential / (opp.signal.riskLevel || 50);
      optimization.allocation.set(opp.token.address, weight);
      totalWeight += weight;
    });

    // Normalize allocations
    optimization.allocation.forEach((weight, address) => {
      optimization.allocation.set(address, (weight / totalWeight) * 100);
    });

    // Calculate portfolio metrics
    optimization.expectedReturn = opportunities.slice(0, 5).reduce((sum, opp) => 
      sum + opp.profitPotential, 0) / 5;
    
    optimization.riskLevel = opportunities.slice(0, 5).reduce((sum, opp) => 
      sum + opp.signal.riskLevel, 0) / 5;
    
    optimization.diversificationScore = Math.min(optimization.allocation.size * 20, 100);
    optimization.rebalanceNeeded = currentHoldings.length > 0;

    return optimization;
  }

  recordTrade(profitable: boolean, returnPercentage: number) {
    this.totalTrades++;
    if (profitable) {
      this.profitableTrades++;
      this.portfolioBalance *= (1 + returnPercentage / 100);
    } else {
      this.portfolioBalance *= (1 + returnPercentage / 100); // Negative return
    }
    this.winRate = this.profitableTrades / this.totalTrades;
  }

  getPerformanceMetrics() {
    return {
      totalTrades: this.totalTrades,
      winRate: this.winRate * 100,
      portfolioValue: this.portfolioBalance,
      totalReturn: ((this.portfolioBalance - 1000) / 1000) * 100,
      activeStrategies: Array.from(this.activeStrategies.values()),
      profitableTrades: this.profitableTrades,
      averageReturn: this.totalTrades > 0 ? 
        ((this.portfolioBalance - 1000) / this.totalTrades) : 0
    };
  }

  async startProfitMaximization() {
    console.log('🚀 Profit Maximization Engine Started');
    
    // Continuous scanning for maximum profit opportunities
    setInterval(async () => {
      try {
        await this.executeMaximumProfitScan();
      } catch (error) {
        console.error('Profit scan error:', error);
      }
    }, 30000); // Every 30 seconds

    // Portfolio optimization every 5 minutes
    setInterval(async () => {
      try {
        const optimization = await this.optimizePortfolio();
        if (this.websocketBroadcast) {
          this.websocketBroadcast({
            type: 'WALLET_UPDATE',
            data: {
              type: 'PORTFOLIO_OPTIMIZATION',
              optimization,
              performance: this.getPerformanceMetrics(),
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error('Portfolio optimization error:', error);
      }
    }, 300000); // Every 5 minutes
  }

  getActiveStrategies() {
    return Array.from(this.activeStrategies.values());
  }

  toggleStrategy(strategyName: string, active: boolean) {
    const strategy = this.activeStrategies.get(strategyName);
    if (strategy) {
      strategy.active = active;
      this.activeStrategies.set(strategyName, strategy);
    }
  }
}
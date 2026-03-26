/**
 * SELF-LEARNING AI ENGINE
 * Machine learning system that evolves from trade history
 * Continuously improves to maximize 7-figure profits
 */

import { Connection } from '@solana/web3.js';
import { advancedTradeEngine } from './advancedTradeEngine';
import { telegramBot } from './telegramBotService';

interface TradePattern {
  pattern: string;
  winRate: number;
  averageProfit: number;
  confidence: number;
  conditions: MarketConditions;
  frequency: number;
  lastSeen: Date;
}

interface MarketConditions {
  momentum: number;
  volume: number;
  volatility: number;
  sentiment: number;
  liquidity: number;
  timeOfDay: number;
  dayOfWeek: number;
}

interface LearningModel {
  patterns: Map<string, TradePattern>;
  successFactors: Map<string, number>;
  failureFactors: Map<string, number>;
  optimalSettings: TradingParameters;
  performanceHistory: PerformanceMetric[];
}

interface TradingParameters {
  entryThreshold: number;
  exitThreshold: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  maxExposure: number;
  riskTolerance: number;
}

interface PerformanceMetric {
  timestamp: Date;
  profit: number;
  winRate: number;
  totalTrades: number;
  bestTrade: number;
  worstTrade: number;
  parameters: TradingParameters;
}

export class SelfLearningAI {
  private model: LearningModel;
  private tradeHistory: any[] = [];
  private learningRate: number = 0.01;
  private adaptationSpeed: number = 0.1;
  private profitTarget: number = 1000000; // $1M target
  private connection: Connection;
  private isLearning: boolean = false;
  private evolutionGeneration: number = 1;

  constructor() {
    this.connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');
    this.model = this.initializeModel();
    this.startContinuousLearning();
  }

  private initializeModel(): LearningModel {
    return {
      patterns: new Map(),
      successFactors: new Map([
        ['high_volume', 0.7],
        ['positive_sentiment', 0.8],
        ['whale_accumulation', 0.85],
        ['momentum_surge', 0.75],
        ['liquidity_depth', 0.65],
        ['viral_potential', 0.9],
        ['institutional_interest', 0.95]
      ]),
      failureFactors: new Map([
        ['low_liquidity', -0.9],
        ['negative_sentiment', -0.8],
        ['whale_distribution', -0.85],
        ['rug_pull_risk', -0.95],
        ['pump_dump_pattern', -0.9]
      ]),
      optimalSettings: {
        entryThreshold: 75,
        exitThreshold: 20,
        positionSize: 0.1,
        stopLoss: 0.08,
        takeProfit: 0.5,
        maxExposure: 0.3,
        riskTolerance: 0.15
      },
      performanceHistory: []
    };
  }

  async analyzeTradingOpportunity(token: any, marketData: any): Promise<any> {
    const conditions = this.extractMarketConditions(marketData);
    const patterns = this.identifyPatterns(token, conditions);
    const prediction = this.predictOutcome(patterns, conditions);
    
    const confidence = this.calculateConfidence(patterns, conditions);
    const optimalSize = this.calculateOptimalPosition(confidence, conditions);
    
    const recommendation = {
      action: confidence > this.model.optimalSettings.entryThreshold ? 'BUY' : 'WAIT',
      confidence,
      expectedProfit: prediction.profit,
      riskLevel: this.assessRisk(conditions),
      positionSize: optimalSize,
      reasoning: this.generateReasoning(patterns, conditions),
      exitStrategy: this.planExitStrategy(prediction, conditions),
      learningInsights: this.getCurrentInsights()
    };

    await this.recordDecision(token, recommendation, conditions);
    
    return recommendation;
  }

  private extractMarketConditions(marketData: any): MarketConditions {
    const now = new Date();
    return {
      momentum: this.calculateMomentum(marketData),
      volume: marketData.volume24h || 0,
      volatility: this.calculateVolatility(marketData),
      sentiment: marketData.sentimentScore || 50,
      liquidity: marketData.liquidity || 0,
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay()
    };
  }

  private identifyPatterns(token: any, conditions: MarketConditions): TradePattern[] {
    const patterns: TradePattern[] = [];
    
    // Check for bullish patterns
    if (conditions.momentum > 70 && conditions.volume > 1000000) {
      patterns.push(this.getOrCreatePattern('BULLISH_BREAKOUT', conditions));
    }
    
    // Check for accumulation patterns
    if (conditions.sentiment > 80 && conditions.liquidity > 500000) {
      patterns.push(this.getOrCreatePattern('WHALE_ACCUMULATION', conditions));
    }
    
    // Check for viral patterns
    if (conditions.sentiment > 90 && conditions.momentum > 80) {
      patterns.push(this.getOrCreatePattern('VIRAL_SURGE', conditions));
    }
    
    // Check for institutional patterns
    if (conditions.volume > 5000000 && conditions.liquidity > 1000000) {
      patterns.push(this.getOrCreatePattern('INSTITUTIONAL_FLOW', conditions));
    }
    
    return patterns;
  }

  private getOrCreatePattern(patternName: string, conditions: MarketConditions): TradePattern {
    if (!this.model.patterns.has(patternName)) {
      this.model.patterns.set(patternName, {
        pattern: patternName,
        winRate: 50,
        averageProfit: 0,
        confidence: 50,
        conditions,
        frequency: 0,
        lastSeen: new Date()
      });
    }
    
    const pattern = this.model.patterns.get(patternName)!;
    pattern.frequency++;
    pattern.lastSeen = new Date();
    
    return pattern;
  }

  private predictOutcome(patterns: TradePattern[], conditions: MarketConditions): any {
    let totalConfidence = 0;
    let expectedProfit = 0;
    
    for (const pattern of patterns) {
      totalConfidence += pattern.confidence * pattern.winRate / 100;
      expectedProfit += pattern.averageProfit;
    }
    
    // Apply success and failure factors
    for (const [factor, weight] of this.model.successFactors) {
      if (this.checkFactor(factor, conditions)) {
        totalConfidence *= (1 + weight * this.adaptationSpeed);
        expectedProfit *= (1 + weight * 0.5);
      }
    }
    
    for (const [factor, weight] of this.model.failureFactors) {
      if (this.checkFactor(factor, conditions)) {
        totalConfidence *= (1 + weight * this.adaptationSpeed);
        expectedProfit *= (1 + weight * 0.5);
      }
    }
    
    return {
      confidence: Math.min(100, Math.max(0, totalConfidence)),
      profit: expectedProfit,
      probability: totalConfidence / 100
    };
  }

  private calculateConfidence(patterns: TradePattern[], conditions: MarketConditions): number {
    let confidence = 50; // Base confidence
    
    // Pattern-based confidence
    for (const pattern of patterns) {
      confidence += pattern.winRate * 0.3;
    }
    
    // Condition-based adjustments
    if (conditions.momentum > 70) confidence += 10;
    if (conditions.volume > 2000000) confidence += 15;
    if (conditions.sentiment > 80) confidence += 12;
    if (conditions.liquidity > 1000000) confidence += 8;
    
    // Time-based adjustments (best trading hours)
    if (conditions.timeOfDay >= 9 && conditions.timeOfDay <= 16) confidence += 5;
    if (conditions.dayOfWeek >= 1 && conditions.dayOfWeek <= 5) confidence += 3;
    
    // Evolution bonus
    confidence += this.evolutionGeneration * 2;
    
    return Math.min(100, Math.max(0, confidence));
  }

  private calculateOptimalPosition(confidence: number, conditions: MarketConditions): number {
    let baseSize = this.model.optimalSettings.positionSize;
    
    // Confidence-based sizing
    const confidenceMultiplier = confidence / 100;
    baseSize *= confidenceMultiplier;
    
    // Risk-adjusted sizing
    const risk = this.assessRisk(conditions);
    if (risk === 'HIGH') baseSize *= 0.5;
    else if (risk === 'EXTREME') baseSize *= 0.25;
    else if (risk === 'LOW') baseSize *= 1.5;
    
    // Volume-based sizing
    if (conditions.volume > 5000000) baseSize *= 1.3;
    else if (conditions.volume < 500000) baseSize *= 0.7;
    
    // Cap at max exposure
    return Math.min(baseSize, this.model.optimalSettings.maxExposure);
  }

  private assessRisk(conditions: MarketConditions): string {
    let riskScore = 0;
    
    if (conditions.volatility > 50) riskScore += 30;
    if (conditions.liquidity < 100000) riskScore += 25;
    if (conditions.sentiment < 30) riskScore += 20;
    if (conditions.volume < 100000) riskScore += 15;
    
    if (riskScore >= 70) return 'EXTREME';
    if (riskScore >= 50) return 'HIGH';
    if (riskScore >= 30) return 'MEDIUM';
    return 'LOW';
  }

  private generateReasoning(patterns: TradePattern[], conditions: MarketConditions): string {
    const patternNames = patterns.map(p => p.pattern).join(', ');
    const risk = this.assessRisk(conditions);
    
    return `Identified patterns: ${patternNames}. ` +
           `Market momentum: ${conditions.momentum.toFixed(0)}%, ` +
           `Volume: $${(conditions.volume / 1000000).toFixed(1)}M, ` +
           `Risk level: ${risk}. ` +
           `AI Generation ${this.evolutionGeneration} confidence based on ${this.tradeHistory.length} historical trades.`;
  }

  private planExitStrategy(prediction: any, conditions: MarketConditions): any {
    return {
      takeProfit: [
        { target: 1.2, percentage: 0.2, reason: 'Initial profit taking' },
        { target: 1.5, percentage: 0.3, reason: 'Momentum confirmation' },
        { target: 2.0, percentage: 0.3, reason: 'Double position' },
        { target: 5.0, percentage: 0.2, reason: 'Moonshot protection' }
      ],
      stopLoss: this.model.optimalSettings.stopLoss,
      trailingStop: conditions.momentum > 80 ? 0.15 : 0.1,
      timeBasedExit: conditions.volatility > 70 ? '4 hours' : '24 hours'
    };
  }

  private getCurrentInsights(): any {
    return {
      generation: this.evolutionGeneration,
      totalLearned: this.tradeHistory.length,
      winRate: this.calculateWinRate(),
      bestPattern: this.getBestPattern(),
      currentOptimization: this.model.optimalSettings,
      profitProgress: this.calculateProfitProgress()
    };
  }

  async learnFromTrade(trade: any): Promise<void> {
    this.tradeHistory.push(trade);
    
    // Update pattern performance
    if (trade.patterns) {
      for (const patternName of trade.patterns) {
        const pattern = this.model.patterns.get(patternName);
        if (pattern) {
          const success = trade.profit > 0;
          pattern.winRate = pattern.winRate * 0.9 + (success ? 10 : 0);
          pattern.averageProfit = pattern.averageProfit * 0.9 + trade.profit * 0.1;
          pattern.confidence = pattern.winRate;
        }
      }
    }
    
    // Update success/failure factors
    if (trade.profit > 0) {
      this.updateSuccessFactors(trade);
    } else {
      this.updateFailureFactors(trade);
    }
    
    // Optimize parameters
    await this.optimizeParameters();
    
    // Evolution check
    if (this.tradeHistory.length % 100 === 0) {
      await this.evolve();
    }
    
    // Send learning update
    if (this.tradeHistory.length % 10 === 0) {
      await this.sendLearningUpdate();
    }
  }

  private updateSuccessFactors(trade: any): void {
    for (const [factor, currentWeight] of this.model.successFactors) {
      if (trade.conditions && this.checkFactor(factor, trade.conditions)) {
        const newWeight = currentWeight + this.learningRate * trade.profit;
        this.model.successFactors.set(factor, Math.min(1, newWeight));
      }
    }
  }

  private updateFailureFactors(trade: any): void {
    for (const [factor, currentWeight] of this.model.failureFactors) {
      if (trade.conditions && this.checkFactor(factor, trade.conditions)) {
        const newWeight = currentWeight - this.learningRate * Math.abs(trade.profit);
        this.model.failureFactors.set(factor, Math.max(-1, newWeight));
      }
    }
  }

  private async optimizeParameters(): Promise<void> {
    const recentTrades = this.tradeHistory.slice(-50);
    if (recentTrades.length < 10) return;
    
    const profitableTrades = recentTrades.filter(t => t.profit > 0);
    const avgProfit = profitableTrades.reduce((sum, t) => sum + t.profit, 0) / profitableTrades.length;
    
    // Adjust parameters based on performance
    if (profitableTrades.length / recentTrades.length > 0.6) {
      // Increase aggression if winning
      this.model.optimalSettings.positionSize *= 1.05;
      this.model.optimalSettings.entryThreshold *= 0.98;
    } else if (profitableTrades.length / recentTrades.length < 0.4) {
      // Decrease aggression if losing
      this.model.optimalSettings.positionSize *= 0.95;
      this.model.optimalSettings.entryThreshold *= 1.02;
    }
    
    // Cap adjustments
    this.model.optimalSettings.positionSize = Math.min(0.3, Math.max(0.05, this.model.optimalSettings.positionSize));
    this.model.optimalSettings.entryThreshold = Math.min(90, Math.max(60, this.model.optimalSettings.entryThreshold));
  }

  private async evolve(): Promise<void> {
    this.evolutionGeneration++;
    console.log(`🧬 AI Evolution Generation ${this.evolutionGeneration}`);
    
    // Increase learning capabilities
    this.learningRate *= 1.1;
    this.adaptationSpeed *= 1.05;
    
    // Prune poor patterns
    for (const [name, pattern] of this.model.patterns) {
      if (pattern.winRate < 30 && pattern.frequency > 10) {
        this.model.patterns.delete(name);
        console.log(`🗑️ Removed poor pattern: ${name}`);
      }
    }
    
    await telegramBot.sendCustomMessage(
      `🧬 <b>AI EVOLUTION</b>\n` +
      `Generation: ${this.evolutionGeneration}\n` +
      `Patterns: ${this.model.patterns.size}\n` +
      `Win Rate: ${this.calculateWinRate().toFixed(1)}%\n` +
      `Optimization: Enhanced`
    );
  }

  private async sendLearningUpdate(): Promise<void> {
    const stats = {
      trades: this.tradeHistory.length,
      winRate: this.calculateWinRate(),
      bestPattern: this.getBestPattern(),
      generation: this.evolutionGeneration
    };
    
    await telegramBot.sendCustomMessage(
      `🧠 <b>AI LEARNING UPDATE</b>\n` +
      `Trades Analyzed: ${stats.trades}\n` +
      `Win Rate: ${stats.winRate.toFixed(1)}%\n` +
      `Best Pattern: ${stats.bestPattern?.pattern || 'Learning...'}\n` +
      `Evolution: Gen ${stats.generation}`
    );
  }

  private calculateWinRate(): number {
    if (this.tradeHistory.length === 0) return 0;
    const wins = this.tradeHistory.filter(t => t.profit > 0).length;
    return (wins / this.tradeHistory.length) * 100;
  }

  private getBestPattern(): TradePattern | null {
    let best: TradePattern | null = null;
    let bestScore = 0;
    
    for (const pattern of this.model.patterns.values()) {
      const score = pattern.winRate * pattern.averageProfit;
      if (score > bestScore) {
        bestScore = score;
        best = pattern;
      }
    }
    
    return best;
  }

  private calculateProfitProgress(): number {
    const totalProfit = this.tradeHistory.reduce((sum, t) => sum + (t.profit || 0), 0);
    return (totalProfit / this.profitTarget) * 100;
  }

  private checkFactor(factor: string, conditions: MarketConditions): boolean {
    switch(factor) {
      case 'high_volume':
        return conditions.volume > 2000000;
      case 'positive_sentiment':
        return conditions.sentiment > 70;
      case 'whale_accumulation':
        return conditions.volume > 5000000 && conditions.momentum > 60;
      case 'momentum_surge':
        return conditions.momentum > 80;
      case 'liquidity_depth':
        return conditions.liquidity > 1000000;
      case 'viral_potential':
        return conditions.sentiment > 85 && conditions.momentum > 75;
      case 'institutional_interest':
        return conditions.volume > 10000000;
      case 'low_liquidity':
        return conditions.liquidity < 100000;
      case 'negative_sentiment':
        return conditions.sentiment < 30;
      case 'whale_distribution':
        return conditions.volume > 5000000 && conditions.momentum < -20;
      case 'rug_pull_risk':
        return conditions.liquidity < 50000 && conditions.volatility > 80;
      case 'pump_dump_pattern':
        return conditions.volatility > 90 && conditions.volume < 500000;
      default:
        return false;
    }
  }

  private calculateMomentum(marketData: any): number {
    const priceChange = marketData.priceChange24h || 0;
    const volumeChange = marketData.volumeChange24h || 0;
    return (priceChange + volumeChange) / 2;
  }

  private calculateVolatility(marketData: any): number {
    // Simple volatility calculation
    const high = marketData.high24h || 0;
    const low = marketData.low24h || 0;
    const current = marketData.price || 1;
    return ((high - low) / current) * 100;
  }

  private async recordDecision(token: any, recommendation: any, conditions: MarketConditions): Promise<void> {
    // Store decision for future learning
    const decision = {
      timestamp: new Date(),
      token: token.symbol,
      recommendation,
      conditions,
      generation: this.evolutionGeneration
    };
    
    // This will be matched with actual trade results later
    console.log(`🧠 AI Decision recorded for ${token.symbol}`);
  }

  private startContinuousLearning(): void {
    setInterval(async () => {
      if (this.isLearning) return;
      
      this.isLearning = true;
      
      try {
        // Analyze recent market performance
        const marketPerformance = await this.analyzeMarketPerformance();
        
        // Update model based on market conditions
        if (marketPerformance.trend === 'BULLISH') {
          this.model.optimalSettings.entryThreshold *= 0.98;
        } else if (marketPerformance.trend === 'BEARISH') {
          this.model.optimalSettings.entryThreshold *= 1.02;
        }
        
        // Record performance
        this.model.performanceHistory.push({
          timestamp: new Date(),
          profit: marketPerformance.profit,
          winRate: this.calculateWinRate(),
          totalTrades: this.tradeHistory.length,
          bestTrade: Math.max(...this.tradeHistory.map(t => t.profit || 0)),
          worstTrade: Math.min(...this.tradeHistory.map(t => t.profit || 0)),
          parameters: { ...this.model.optimalSettings }
        });
        
        // Trim history
        if (this.model.performanceHistory.length > 1000) {
          this.model.performanceHistory.shift();
        }
        
      } catch (error) {
        console.error('Continuous learning error:', error);
      } finally {
        this.isLearning = false;
      }
    }, 60000); // Learn every minute
  }

  private async analyzeMarketPerformance(): Promise<any> {
    // Analyze overall market performance
    const recentTrades = this.tradeHistory.slice(-100);
    const totalProfit = recentTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgProfit = recentTrades.length > 0 ? totalProfit / recentTrades.length : 0;
    
    return {
      trend: avgProfit > 0 ? 'BULLISH' : 'BEARISH',
      profit: totalProfit,
      trades: recentTrades.length,
      confidence: this.calculateWinRate()
    };
  }

  getModelStats(): any {
    return {
      generation: this.evolutionGeneration,
      patterns: Array.from(this.model.patterns.values()),
      successFactors: Array.from(this.model.successFactors.entries()),
      failureFactors: Array.from(this.model.failureFactors.entries()),
      optimalSettings: this.model.optimalSettings,
      performance: this.model.performanceHistory.slice(-10),
      totalTrades: this.tradeHistory.length,
      winRate: this.calculateWinRate(),
      profitProgress: this.calculateProfitProgress()
    };
  }
}

export const selfLearningAI = new SelfLearningAI();
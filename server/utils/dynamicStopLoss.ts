/**
 * Dynamic Stop-Loss Calculator for SniperX
 * Calculates adaptive stop-loss levels based on market conditions and token behavior
 */

interface MarketCondition {
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  volume: 'LOW' | 'NORMAL' | 'HIGH' | 'SURGE';
  liquidityHealth: number; // 0-100
}

interface TokenMetrics {
  symbol: string;
  address: string;
  averageVolatility: number;
  supportLevels: number[];
  resistanceLevels: number[];
  historicalPerformance: number;
  riskScore: number; // 0-100
}

interface StopLossResult {
  percentage: number;
  absolutePrice: number;
  reasoning: string[];
  confidence: number;
  adjustmentFactors: {
    volatility: number;
    market: number;
    token: number;
    time: number;
  };
}

export class DynamicStopLossCalculator {
  private tokenMemory: Map<string, TokenMetrics> = new Map();
  private marketHistory: MarketCondition[] = [];

  /**
   * Calculate dynamic stop-loss percentage based on multiple factors
   */
  calculateDynamicStopLoss(
    tokenAddress: string,
    entryPrice: number,
    positionSize: number,
    timeHeld: number
  ): StopLossResult {
    const marketCondition = this.assessMarketCondition();
    const tokenMetrics = this.getTokenMetrics(tokenAddress);
    
    // Base stop-loss percentage (conservative starting point)
    let baseStopLoss = 8; // 8% base
    
    const reasoning: string[] = [`Base stop-loss: ${baseStopLoss}%`];
    
    // Volatility adjustment
    const volatilityAdjustment = this.calculateVolatilityAdjustment(marketCondition.volatility, tokenMetrics);
    baseStopLoss += volatilityAdjustment;
    reasoning.push(`Volatility adjustment: ${volatilityAdjustment > 0 ? '+' : ''}${volatilityAdjustment}%`);
    
    // Market trend adjustment
    const trendAdjustment = this.calculateTrendAdjustment(marketCondition.trend);
    baseStopLoss += trendAdjustment;
    reasoning.push(`Market trend adjustment: ${trendAdjustment > 0 ? '+' : ''}${trendAdjustment}%`);
    
    // Token-specific adjustment
    const tokenAdjustment = this.calculateTokenAdjustment(tokenMetrics);
    baseStopLoss += tokenAdjustment;
    reasoning.push(`Token risk adjustment: ${tokenAdjustment > 0 ? '+' : ''}${tokenAdjustment}%`);
    
    // Time-based adjustment (positions held longer get tighter stops)
    const timeAdjustment = this.calculateTimeAdjustment(timeHeld);
    baseStopLoss += timeAdjustment;
    reasoning.push(`Time-based adjustment: ${timeAdjustment > 0 ? '+' : ''}${timeAdjustment}%`);
    
    // Position size adjustment (larger positions get tighter stops)
    const sizeAdjustment = this.calculateSizeAdjustment(positionSize);
    baseStopLoss += sizeAdjustment;
    reasoning.push(`Position size adjustment: ${sizeAdjustment > 0 ? '+' : ''}${sizeAdjustment}%`);
    
    // Technical level adjustment
    const technicalAdjustment = this.calculateTechnicalAdjustment(entryPrice, tokenMetrics);
    baseStopLoss += technicalAdjustment;
    reasoning.push(`Technical level adjustment: ${technicalAdjustment > 0 ? '+' : ''}${technicalAdjustment}%`);
    
    // Ensure stop-loss is within reasonable bounds
    const finalStopLoss = Math.max(2, Math.min(25, baseStopLoss)); // Between 2% and 25%
    const absolutePrice = entryPrice * (1 - finalStopLoss / 100);
    
    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(tokenMetrics, marketCondition);
    
    return {
      percentage: finalStopLoss,
      absolutePrice,
      reasoning,
      confidence,
      adjustmentFactors: {
        volatility: volatilityAdjustment,
        market: trendAdjustment,
        token: tokenAdjustment,
        time: timeAdjustment
      }
    };
  }

  private calculateVolatilityAdjustment(volatility: string, tokenMetrics: TokenMetrics): number {
    const baseAdjustments = {
      'LOW': -1,      // Tighter stop for low volatility
      'MEDIUM': 0,    // No adjustment
      'HIGH': 2,      // Looser stop for high volatility
      'EXTREME': 5    // Much looser stop for extreme volatility
    };
    
    let adjustment = baseAdjustments[volatility];
    
    // Further adjust based on token's historical volatility
    if (tokenMetrics.averageVolatility > 30) {
      adjustment += 1; // Token is historically volatile
    } else if (tokenMetrics.averageVolatility < 10) {
      adjustment -= 0.5; // Token is historically stable
    }
    
    return adjustment;
  }

  private calculateTrendAdjustment(trend: string): number {
    switch (trend) {
      case 'BULLISH': return -1; // Tighter stop in bull market
      case 'BEARISH': return 2;  // Looser stop in bear market
      case 'SIDEWAYS': return 0; // No adjustment
      default: return 0;
    }
  }

  private calculateTokenAdjustment(tokenMetrics: TokenMetrics): number {
    let adjustment = 0;
    
    // Risk score adjustment
    if (tokenMetrics.riskScore > 70) {
      adjustment += 3; // High risk token needs looser stop
    } else if (tokenMetrics.riskScore < 30) {
      adjustment -= 1; // Low risk token can have tighter stop
    }
    
    // Historical performance adjustment
    if (tokenMetrics.historicalPerformance < -20) {
      adjustment += 2; // Poor performer needs protection
    } else if (tokenMetrics.historicalPerformance > 50) {
      adjustment -= 0.5; // Strong performer can be held longer
    }
    
    return adjustment;
  }

  private calculateTimeAdjustment(timeHeld: number): number {
    const hoursHeld = timeHeld / (1000 * 60 * 60);
    
    if (hoursHeld < 1) {
      return 1; // Looser stop for new positions
    } else if (hoursHeld > 24) {
      return -1; // Tighter stop for old positions
    }
    
    return 0;
  }

  private calculateSizeAdjustment(positionSize: number): number {
    // Larger positions (in SOL) get tighter stops for risk management
    if (positionSize > 1) {
      return -1;
    } else if (positionSize > 0.5) {
      return -0.5;
    }
    
    return 0;
  }

  private calculateTechnicalAdjustment(entryPrice: number, tokenMetrics: TokenMetrics): number {
    // Check if entry price is near support/resistance levels
    const nearSupport = tokenMetrics.supportLevels.some(level => 
      Math.abs(entryPrice - level) / entryPrice < 0.05
    );
    
    const nearResistance = tokenMetrics.resistanceLevels.some(level => 
      Math.abs(entryPrice - level) / entryPrice < 0.05
    );
    
    if (nearSupport) {
      return -1; // Tighter stop near support (more likely to bounce)
    } else if (nearResistance) {
      return 1; // Looser stop near resistance (may need more room)
    }
    
    return 0;
  }

  private calculateConfidence(tokenMetrics: TokenMetrics, marketCondition: MarketCondition): number {
    let confidence = 70; // Base confidence
    
    // Increase confidence with more data
    if (tokenMetrics.historicalPerformance !== 0) confidence += 10;
    if (tokenMetrics.supportLevels.length > 2) confidence += 10;
    if (marketCondition.liquidityHealth > 80) confidence += 10;
    
    return Math.min(100, confidence);
  }

  private assessMarketCondition(): MarketCondition {
    // Simulate market condition assessment
    // In real implementation, this would analyze actual market data
    const conditions: MarketCondition[] = [
      {
        volatility: 'MEDIUM',
        trend: 'BULLISH',
        volume: 'NORMAL',
        liquidityHealth: 85
      },
      {
        volatility: 'HIGH',
        trend: 'BEARISH',
        volume: 'LOW',
        liquidityHealth: 65
      },
      {
        volatility: 'LOW',
        trend: 'SIDEWAYS',
        volume: 'HIGH',
        liquidityHealth: 90
      }
    ];
    
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  private getTokenMetrics(tokenAddress: string): TokenMetrics {
    if (this.tokenMemory.has(tokenAddress)) {
      return this.tokenMemory.get(tokenAddress)!;
    }
    
    // Create default metrics for new tokens
    const defaultMetrics: TokenMetrics = {
      symbol: 'UNKNOWN',
      address: tokenAddress,
      averageVolatility: 20,
      supportLevels: [],
      resistanceLevels: [],
      historicalPerformance: 0,
      riskScore: 50
    };
    
    this.tokenMemory.set(tokenAddress, defaultMetrics);
    return defaultMetrics;
  }

  /**
   * Update token memory with trading results
   */
  updateTokenMemory(
    tokenAddress: string,
    symbol: string,
    result: 'WIN' | 'LOSS',
    entryPrice: number,
    exitPrice: number,
    timeHeld: number
  ): void {
    let metrics = this.getTokenMetrics(tokenAddress);
    
    // Update symbol if known
    if (symbol !== 'UNKNOWN') {
      metrics.symbol = symbol;
    }
    
    // Calculate performance for this trade
    const performance = ((exitPrice - entryPrice) / entryPrice) * 100;
    
    // Update historical performance (weighted average)
    if (metrics.historicalPerformance === 0) {
      metrics.historicalPerformance = performance;
    } else {
      metrics.historicalPerformance = (metrics.historicalPerformance * 0.8) + (performance * 0.2);
    }
    
    // Update volatility estimate
    const priceChange = Math.abs(performance);
    if (metrics.averageVolatility === 20) { // Default value
      metrics.averageVolatility = priceChange;
    } else {
      metrics.averageVolatility = (metrics.averageVolatility * 0.9) + (priceChange * 0.1);
    }
    
    // Update risk score based on results
    if (result === 'LOSS') {
      metrics.riskScore = Math.min(100, metrics.riskScore + 5);
    } else {
      metrics.riskScore = Math.max(0, metrics.riskScore - 2);
    }
    
    // Add price levels
    if (!metrics.supportLevels.includes(entryPrice)) {
      if (result === 'WIN') {
        metrics.supportLevels.push(entryPrice);
        metrics.supportLevels = metrics.supportLevels.slice(-5); // Keep last 5
      }
    }
    
    if (!metrics.resistanceLevels.includes(exitPrice)) {
      if (result === 'LOSS') {
        metrics.resistanceLevels.push(exitPrice);
        metrics.resistanceLevels = metrics.resistanceLevels.slice(-5); // Keep last 5
      }
    }
    
    this.tokenMemory.set(tokenAddress, metrics);
    
    console.log(`📊 Token memory updated for ${symbol}: Risk ${metrics.riskScore}, Performance ${metrics.historicalPerformance.toFixed(2)}%`);
  }

  /**
   * Get all stored token metrics
   */
  getTokenMemoryStats(): { [symbol: string]: TokenMetrics } {
    const stats: { [symbol: string]: TokenMetrics } = {};
    
    for (const [address, metrics] of this.tokenMemory) {
      stats[metrics.symbol || address.substring(0, 8)] = metrics;
    }
    
    return stats;
  }

  /**
   * Clear old token memory to prevent memory bloat
   */
  cleanupTokenMemory(): void {
    // Keep only the most recently updated tokens (implement LRU logic if needed)
    if (this.tokenMemory.size > 100) {
      const entries = Array.from(this.tokenMemory.entries());
      const toKeep = entries.slice(-50); // Keep last 50
      
      this.tokenMemory.clear();
      toKeep.forEach(([address, metrics]) => {
        this.tokenMemory.set(address, metrics);
      });
      
      console.log('🧹 Token memory cleaned up, keeping 50 most recent entries');
    }
  }
}

// Export singleton instance
export const dynamicStopLoss = new DynamicStopLossCalculator();
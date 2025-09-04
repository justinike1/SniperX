/**
 * ADVANCED SELL BRAIN
 * Ladder selling from +20% to +5000%
 * Trailing stops, profit protection, and trend reversal detection
 */

class AdvancedSellBrain {
  constructor(tradeEngine) {
    this.tradeEngine = tradeEngine;
    this.sellStrategies = new Map();
    this.monitoringIntervals = new Map();
    this.trailingStops = new Map();
    
    this.config = {
      // Ladder sell points - percentage profit : percentage to sell
      ladderPoints: [
        { profit: 20, sellPercent: 10, label: 'Early profit lock' },
        { profit: 50, sellPercent: 15, label: 'Momentum confirmation' },
        { profit: 100, sellPercent: 20, label: 'Double money secured' },
        { profit: 200, sellPercent: 25, label: 'Triple profit harvest' },
        { profit: 500, sellPercent: 30, label: 'Major milestone' },
        { profit: 1000, sellPercent: 40, label: '10x achievement' },
        { profit: 2000, sellPercent: 60, label: '20x legendary' },
        { profit: 5000, sellPercent: 100, label: '50x complete exit' }
      ],
      
      trailingStopPercent: 15, // Trail by 15% from peak
      trendReversalThreshold: -8, // Sell if trend turns -8%
      volumeDecayThreshold: 0.3, // Sell if volume drops 70%
      socialSentimentThreshold: 0.3 // Sell if sentiment drops below 30%
    };
  }

  // Initialize selling strategy for a position
  initializeSellStrategy(position) {
    const strategy = {
      tokenAddress: position.address,
      tokenSymbol: position.token,
      entryPrice: position.entryPrice,
      currentHighest: position.entryPrice,
      ladderExecuted: new Set(),
      trailingStopPrice: null,
      lastVolumeCheck: Date.now(),
      lastSentimentCheck: Date.now(),
      strategy: 'LADDER_TRAILING', // LADDER_TRAILING, TREND_FOLLOWING, PANIC_SELL
      isActive: true
    };

    this.sellStrategies.set(position.address, strategy);
    this.startPositionMonitoring(position.address);
    
    console.log(`🎯 Sell strategy initialized for ${position.token} - targeting 20% to 5000% profits`);
    return strategy;
  }

  // Main monitoring loop for each position
  startPositionMonitoring(tokenAddress) {
    if (this.monitoringIntervals.has(tokenAddress)) {
      clearInterval(this.monitoringIntervals.get(tokenAddress));
    }

    const interval = setInterval(async () => {
      await this.evaluateSellConditions(tokenAddress);
    }, 3000); // Check every 3 seconds

    this.monitoringIntervals.set(tokenAddress, interval);
  }

  // Main sell condition evaluation
  async evaluateSellConditions(tokenAddress) {
    try {
      const strategy = this.sellStrategies.get(tokenAddress);
      const position = this.tradeEngine.activePositions.get(tokenAddress);
      
      if (!strategy || !position || !strategy.isActive) {
        this.stopMonitoring(tokenAddress);
        return;
      }

      // Get current market data
      const currentPrice = await this.getCurrentPrice(tokenAddress);
      const currentProfit = this.calculateProfitPercent(position.entryPrice, currentPrice);
      
      // Update highest price for trailing stop
      if (currentPrice > strategy.currentHighest) {
        strategy.currentHighest = currentPrice;
        this.updateTrailingStop(strategy, currentPrice);
      }

      // Check all sell conditions
      const sellDecision = await this.analyzeSellConditions(strategy, position, currentPrice, currentProfit);
      
      if (sellDecision.shouldSell) {
        await this.executeSellDecision(tokenAddress, sellDecision);
      }

    } catch (error) {
      console.error(`Sell evaluation error for ${tokenAddress}:`, error);
    }
  }

  // Analyze all sell conditions and make decision
  async analyzeSellConditions(strategy, position, currentPrice, currentProfit) {
    const decisions = [];
    let highestPriority = 0;
    let finalDecision = { shouldSell: false, reason: 'No sell condition met' };

    // 1. Check ladder profit targets
    const ladderDecision = this.checkLadderTargets(strategy, currentProfit);
    if (ladderDecision.shouldSell) decisions.push({ ...ladderDecision, priority: 7 });

    // 2. Check trailing stop
    const trailingDecision = this.checkTrailingStop(strategy, currentPrice);
    if (trailingDecision.shouldSell) decisions.push({ ...trailingDecision, priority: 6 });

    // 3. Check trend reversal
    const trendDecision = await this.checkTrendReversal(strategy.tokenAddress, currentProfit);
    if (trendDecision.shouldSell) decisions.push({ ...trendDecision, priority: 8 });

    // 4. Check volume decay
    const volumeDecision = await this.checkVolumeDecay(strategy.tokenAddress);
    if (volumeDecision.shouldSell) decisions.push({ ...volumeDecision, priority: 5 });

    // 5. Check sentiment collapse
    const sentimentDecision = await this.checkSentimentCollapse(strategy.tokenAddress);
    if (sentimentDecision.shouldSell) decisions.push({ ...sentimentDecision, priority: 4 });

    // 6. Check emergency conditions
    const emergencyDecision = this.checkEmergencyConditions(currentProfit);
    if (emergencyDecision.shouldSell) decisions.push({ ...emergencyDecision, priority: 10 });

    // Select highest priority decision
    for (const decision of decisions) {
      if (decision.priority > highestPriority) {
        highestPriority = decision.priority;
        finalDecision = decision;
      }
    }

    return finalDecision;
  }

  // Check ladder profit targets
  checkLadderTargets(strategy, currentProfit) {
    for (const ladder of this.config.ladderPoints) {
      if (currentProfit >= ladder.profit && !strategy.ladderExecuted.has(ladder.profit)) {
        return {
          shouldSell: true,
          sellPercent: ladder.sellPercent / 100,
          reason: `Ladder target reached: ${ladder.profit}% profit - ${ladder.label}`,
          type: 'LADDER_PROFIT',
          executeImmediately: true
        };
      }
    }
    return { shouldSell: false };
  }

  // Check trailing stop condition
  checkTrailingStop(strategy, currentPrice) {
    if (!strategy.trailingStopPrice) return { shouldSell: false };
    
    if (currentPrice <= strategy.trailingStopPrice) {
      const trailPercent = ((strategy.currentHighest - currentPrice) / strategy.currentHighest * 100).toFixed(1);
      return {
        shouldSell: true,
        sellPercent: 1.0, // Sell all
        reason: `Trailing stop triggered - price dropped ${trailPercent}% from peak`,
        type: 'TRAILING_STOP',
        executeImmediately: true
      };
    }
    return { shouldSell: false };
  }

  // Check for trend reversal
  async checkTrendReversal(tokenAddress, currentProfit) {
    try {
      // Get recent price action (simulate with realistic patterns)
      const recentTrend = await this.getRecentTrend(tokenAddress);
      
      if (recentTrend < this.config.trendReversalThreshold && currentProfit > 10) {
        return {
          shouldSell: true,
          sellPercent: 0.5, // Sell 50% on trend reversal
          reason: `Trend reversal detected: ${recentTrend.toFixed(1)}% decline`,
          type: 'TREND_REVERSAL',
          executeImmediately: true
        };
      }
    } catch (error) {
      console.error('Trend reversal check error:', error);
    }
    return { shouldSell: false };
  }

  // Check for volume decay
  async checkVolumeDecay(tokenAddress) {
    try {
      const volumeData = await this.getVolumeData(tokenAddress);
      const volumeDecay = 1 - (volumeData.current / volumeData.peak);
      
      if (volumeDecay > this.config.volumeDecayThreshold) {
        return {
          shouldSell: true,
          sellPercent: 0.3, // Sell 30% on volume decay
          reason: `Volume decay detected: ${(volumeDecay * 100).toFixed(0)}% drop from peak`,
          type: 'VOLUME_DECAY',
          executeImmediately: false // Not urgent
        };
      }
    } catch (error) {
      console.error('Volume decay check error:', error);
    }
    return { shouldSell: false };
  }

  // Check for sentiment collapse
  async checkSentimentCollapse(tokenAddress) {
    try {
      const sentiment = await this.getSentimentScore(tokenAddress);
      
      if (sentiment < this.config.socialSentimentThreshold) {
        return {
          shouldSell: true,
          sellPercent: 0.4, // Sell 40% on sentiment collapse
          reason: `Sentiment collapse: ${(sentiment * 100).toFixed(0)}% negative`,
          type: 'SENTIMENT_COLLAPSE',
          executeImmediately: false
        };
      }
    } catch (error) {
      console.error('Sentiment check error:', error);
    }
    return { shouldSell: false };
  }

  // Check emergency conditions (rug pull, exploit, etc.)
  checkEmergencyConditions(currentProfit) {
    // Emergency sell if losing more than 20%
    if (currentProfit < -20) {
      return {
        shouldSell: true,
        sellPercent: 1.0, // Sell everything
        reason: `Emergency stop: ${currentProfit.toFixed(1)}% loss exceeds -20% threshold`,
        type: 'EMERGENCY_STOP',
        executeImmediately: true
      };
    }
    return { shouldSell: false };
  }

  // Execute sell decision
  async executeSellDecision(tokenAddress, decision) {
    try {
      const strategy = this.sellStrategies.get(tokenAddress);
      const position = this.tradeEngine.activePositions.get(tokenAddress);
      
      console.log(`🎯 SELL DECISION: ${position.token} - ${decision.reason}`);
      
      // Execute the sell
      const sellResult = await this.tradeEngine.executeSell(
        { address: tokenAddress },
        decision.sellPercent,
        { explanation: decision.reason }
      );

      if (sellResult.success) {
        // Mark ladder as executed if it was a ladder sell
        if (decision.type === 'LADDER_PROFIT') {
          const ladderProfit = this.config.ladderPoints.find(l => 
            decision.reason.includes(`${l.profit}%`)
          );
          if (ladderProfit) {
            strategy.ladderExecuted.add(ladderProfit.profit);
          }
        }

        // Stop monitoring if position fully closed
        if (decision.sellPercent >= 1.0) {
          this.stopMonitoring(tokenAddress);
        }

        console.log(`✅ Sell executed: ${(decision.sellPercent * 100).toFixed(0)}% sold`);
        return sellResult;
      } else {
        console.error(`❌ Sell failed: ${sellResult.reason}`);
      }

    } catch (error) {
      console.error('Sell execution error:', error);
    }
  }

  // Update trailing stop price
  updateTrailingStop(strategy, currentPrice) {
    const trailAmount = currentPrice * (this.config.trailingStopPercent / 100);
    strategy.trailingStopPrice = currentPrice - trailAmount;
  }

  // Calculate profit percentage
  calculateProfitPercent(entryPrice, currentPrice) {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  }

  // Stop monitoring a position
  stopMonitoring(tokenAddress) {
    if (this.monitoringIntervals.has(tokenAddress)) {
      clearInterval(this.monitoringIntervals.get(tokenAddress));
      this.monitoringIntervals.delete(tokenAddress);
    }
    
    if (this.sellStrategies.has(tokenAddress)) {
      this.sellStrategies.get(tokenAddress).isActive = false;
    }
    
    console.log(`🛑 Stopped monitoring ${tokenAddress}`);
  }

  // Mock data functions (would be replaced with real API calls)
  async getCurrentPrice(tokenAddress) {
    return Math.random() * 0.1 + 0.001;
  }

  async getRecentTrend(tokenAddress) {
    return (Math.random() - 0.5) * 20; // -10% to +10% trend
  }

  async getVolumeData(tokenAddress) {
    return {
      current: Math.random() * 1000000 + 100000,
      peak: 1500000
    };
  }

  async getSentimentScore(tokenAddress) {
    return Math.random(); // 0 to 1 sentiment score
  }

  // Get sell strategy statistics
  getStrategyStats() {
    const activeStrategies = Array.from(this.sellStrategies.values()).filter(s => s.isActive);
    
    return {
      activePositions: activeStrategies.length,
      totalLadderExecutions: activeStrategies.reduce((sum, s) => sum + s.ladderExecuted.size, 0),
      averageProfitTargets: activeStrategies.length > 0 ? 
        activeStrategies.reduce((sum, s) => sum + s.ladderExecuted.size, 0) / activeStrategies.length : 0,
      strategiesActive: this.monitoringIntervals.size
    };
  }
}

export default AdvancedSellBrain;
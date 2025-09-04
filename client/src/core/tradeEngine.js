/**
 * ADVANCED TRADE ENGINE
 * Core buy/sell logic with Alfred AI integration
 * Handles position sizing, risk management, and execution
 */

import AlfredReasoner from '../ai/reasoner.js';
import SentimentFusionEngine from '../ai/sentimentFuse.js';

class AdvancedTradeEngine {
  constructor(walletConnector, jupiterClient) {
    this.wallet = walletConnector;
    this.jupiter = jupiterClient;
    this.reasoner = new AlfredReasoner();
    this.sentiment = new SentimentFusionEngine();
    
    this.settings = {
      maxWalletPercentage: 0.10, // 10% max per trade
      emergencyStopLoss: -0.20,  // -20% extreme stop
      normalStopLoss: -0.08,     // -8% normal stop
      minProfitTarget: 0.20,     // 20% minimum profit target
      maxProfitTarget: 50.00,    // 5000% maximum profit target
      slippageTolerance: 0.05    // 5% slippage tolerance
    };

    this.activePositions = new Map();
    this.tradeHistory = [];
    this.isExecuting = false;
  }

  // Main trade analysis and execution
  async analyzeTrade(token, action = 'BUY', overrideAmount = null) {
    if (this.isExecuting) {
      return { success: false, reason: 'Another trade is currently executing' };
    }

    try {
      this.isExecuting = true;

      // Get current market data
      const marketData = await this.getMarketData(token);
      
      // Get wallet status
      const walletStatus = await this.getWalletStatus();
      
      // Get social sentiment
      const sentimentData = await this.sentiment.fuseAllSentiment(token.symbol);

      // Initialize Alfred reasoner with current data
      this.reasoner = new AlfredReasoner(walletStatus, marketData, sentimentData);

      // Get Alfred's analysis and explanation
      const analysis = this.reasoner.analyzeAndExplain(token, action, marketData);

      // Calculate position size
      const positionSize = overrideAmount || this.calculatePositionSize(
        walletStatus.solBalance, 
        analysis.confidence, 
        analysis.riskLevel
      );

      // Execute trade if recommended
      let result = { success: false, reason: 'Analysis incomplete' };
      
      if (analysis.confidence > 60 && analysis.riskLevel !== 'EXTREME') {
        if (action === 'BUY') {
          result = await this.executeBuy(token, positionSize, analysis);
        } else if (action === 'SELL') {
          result = await this.executeSell(token, positionSize, analysis);
        }
      } else {
        result = {
          success: false,
          reason: `Trade rejected - ${analysis.explanation}`,
          analysis: analysis
        };
      }

      // Log trade attempt
      this.logTrade({
        token: token.symbol,
        action,
        analysis,
        result,
        timestamp: new Date().toISOString()
      });

      return {
        ...result,
        alfredExplanation: analysis.explanation,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning
      };

    } catch (error) {
      console.error('Trade analysis error:', error);
      return { 
        success: false, 
        reason: `Trade analysis failed: ${error.message}` 
      };
    } finally {
      this.isExecuting = false;
    }
  }

  // Execute buy order with Alfred's reasoning
  async executeBuy(token, solAmount, analysis) {
    try {
      // Validate buy conditions
      if (solAmount < 0.001) {
        return { success: false, reason: 'Position size too small (min 0.001 SOL)' };
      }

      // Check if we already have a position
      if (this.activePositions.has(token.address)) {
        return { success: false, reason: 'Already have position in this token' };
      }

      // Execute Jupiter swap
      const swapResult = await this.jupiter.swapSolToToken(
        token.address,
        solAmount,
        this.settings.slippageTolerance
      );

      if (swapResult.success) {
        // Create position tracking
        const position = {
          token: token.symbol,
          address: token.address,
          entryPrice: swapResult.executionPrice,
          tokenAmount: swapResult.tokensReceived,
          solInvested: solAmount,
          entryTime: new Date().toISOString(),
          stopLoss: analysis.riskLevel === 'HIGH' ? this.settings.emergencyStopLoss : this.settings.normalStopLoss,
          takeProfitLadder: this.createProfitLadder(swapResult.executionPrice),
          alfredReasoning: analysis.reasoning,
          confidence: analysis.confidence
        };

        this.activePositions.set(token.address, position);

        // Start monitoring this position
        this.startPositionMonitoring(token.address);

        return {
          success: true,
          transaction: swapResult.signature,
          position: position,
          message: `BUY executed - ${analysis.explanation}`
        };
      }

      return { success: false, reason: swapResult.error };

    } catch (error) {
      console.error('Buy execution error:', error);
      return { success: false, reason: error.message };
    }
  }

  // Execute sell order
  async executeSell(token, percentage = 1.0, analysis) {
    try {
      const position = this.activePositions.get(token.address);
      if (!position) {
        return { success: false, reason: 'No position found for this token' };
      }

      const sellAmount = position.tokenAmount * percentage;

      const swapResult = await this.jupiter.swapTokenToSol(
        token.address,
        sellAmount,
        this.settings.slippageTolerance
      );

      if (swapResult.success) {
        // Calculate P&L
        const pnl = this.calculatePnL(position, swapResult.solReceived, percentage);

        // Update or remove position
        if (percentage >= 1.0) {
          this.activePositions.delete(token.address);
        } else {
          position.tokenAmount -= sellAmount;
        }

        return {
          success: true,
          transaction: swapResult.signature,
          pnl: pnl,
          message: `SELL executed - ${analysis.explanation}`,
          percentageSold: percentage * 100
        };
      }

      return { success: false, reason: swapResult.error };

    } catch (error) {
      console.error('Sell execution error:', error);
      return { success: false, reason: error.message };
    }
  }

  // Calculate position size based on confidence and risk
  calculatePositionSize(solBalance, confidence, riskLevel) {
    let baseAmount = solBalance * this.settings.maxWalletPercentage;
    
    // Adjust for confidence
    const confidenceMultiplier = confidence / 100;
    baseAmount *= confidenceMultiplier;
    
    // Adjust for risk
    if (riskLevel === 'HIGH') baseAmount *= 0.5;
    else if (riskLevel === 'EXTREME') baseAmount *= 0.25;
    else if (riskLevel === 'LOW') baseAmount *= 1.2;
    
    // Ensure minimum viable trade
    return Math.max(baseAmount, 0.001);
  }

  // Create profit-taking ladder from 20% to 5000%
  createProfitLadder(entryPrice) {
    return [
      { target: entryPrice * 1.20, percentage: 0.10, label: '20% profit - take 10%' },
      { target: entryPrice * 1.50, percentage: 0.15, label: '50% profit - take 15%' },
      { target: entryPrice * 2.00, percentage: 0.20, label: '100% profit - take 20%' },
      { target: entryPrice * 3.00, percentage: 0.25, label: '200% profit - take 25%' },
      { target: entryPrice * 5.00, percentage: 0.30, label: '400% profit - take 30%' },
      { target: entryPrice * 10.00, percentage: 0.40, label: '900% profit - take 40%' },
      { target: entryPrice * 25.00, percentage: 0.60, label: '2400% profit - take 60%' },
      { target: entryPrice * 51.00, percentage: 1.00, label: '5000% profit - sell all' }
    ];
  }

  // Monitor position for stop loss and take profit
  startPositionMonitoring(tokenAddress) {
    const position = this.activePositions.get(tokenAddress);
    if (!position) return;

    const monitoringInterval = setInterval(async () => {
      try {
        const currentPrice = await this.getCurrentPrice(tokenAddress);
        const currentValue = currentPrice * position.tokenAmount;
        const pnlPercent = ((currentValue - position.solInvested) / position.solInvested) * 100;

        // Check stop loss
        if (pnlPercent <= position.stopLoss * 100) {
          console.log(`🛡️ Stop loss triggered for ${position.token} at ${pnlPercent.toFixed(2)}%`);
          await this.executeSell({ address: tokenAddress }, 1.0, {
            explanation: `Stop loss triggered at ${pnlPercent.toFixed(2)}% loss`
          });
          clearInterval(monitoringInterval);
          return;
        }

        // Check profit ladder
        for (const ladder of position.takeProfitLadder) {
          if (currentPrice >= ladder.target && !ladder.executed) {
            console.log(`🎯 Profit target hit: ${ladder.label}`);
            await this.executeSell({ address: tokenAddress }, ladder.percentage, {
              explanation: ladder.label
            });
            ladder.executed = true;
            break;
          }
        }

        // Stop monitoring if position is fully closed
        if (!this.activePositions.has(tokenAddress)) {
          clearInterval(monitoringInterval);
        }

      } catch (error) {
        console.error('Position monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  // Get current market data
  async getMarketData(token) {
    try {
      // This would connect to real price feeds
      return {
        price: Math.random() * 0.1 + 0.001,
        priceChange24h: (Math.random() - 0.5) * 50,
        volume24h: Math.random() * 1000000 + 100000,
        momentum: Math.random() * 100,
        liquidity: Math.random() * 500000 + 100000,
        marketCap: Math.random() * 10000000 + 1000000
      };
    } catch (error) {
      console.error('Market data error:', error);
      return null;
    }
  }

  // Get wallet status
  async getWalletStatus() {
    try {
      const balance = await this.wallet.getSolBalance();
      const positions = Array.from(this.activePositions.values());
      
      return {
        solBalance: balance,
        activePositions: positions.length,
        totalValue: balance + positions.reduce((sum, pos) => sum + pos.solInvested, 0)
      };
    } catch (error) {
      console.error('Wallet status error:', error);
      return { solBalance: 0, activePositions: 0, totalValue: 0 };
    }
  }

  // Calculate P&L for a trade
  calculatePnL(position, solReceived, percentage) {
    const solInvestedPortion = position.solInvested * percentage;
    const profit = solReceived - solInvestedPortion;
    const profitPercent = (profit / solInvestedPortion) * 100;
    
    return {
      solProfit: profit,
      percentageProfit: profitPercent,
      solInvested: solInvestedPortion,
      solReceived: solReceived
    };
  }

  // Log trade for learning and analysis
  logTrade(tradeData) {
    this.tradeHistory.push(tradeData);
    
    // Keep only last 1000 trades
    if (this.tradeHistory.length > 1000) {
      this.tradeHistory.shift();
    }

    // Learn from this trade
    if (this.reasoner) {
      this.reasoner.learnFromOutcome(
        tradeData.transaction || 'REJECTED',
        tradeData.result.success ? 'SUCCESS' : 'FAILURE',
        tradeData.analysis.expectedOutcome
      );
    }
  }

  // Get current price (stub - would use real price feed)
  async getCurrentPrice(tokenAddress) {
    return Math.random() * 0.1 + 0.001;
  }

  // Get trade statistics
  getTradeStats() {
    const successfulTrades = this.tradeHistory.filter(t => t.result.success);
    const winRate = successfulTrades.length / this.tradeHistory.length * 100;
    
    return {
      totalTrades: this.tradeHistory.length,
      successfulTrades: successfulTrades.length,
      winRate: winRate.toFixed(1),
      activePositions: this.activePositions.size,
      recentTrades: this.tradeHistory.slice(-10)
    };
  }
}

export default AdvancedTradeEngine;
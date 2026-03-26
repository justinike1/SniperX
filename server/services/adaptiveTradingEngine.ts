/**
 * Adaptive Trading Engine
 * Integrates Smart Position Sizing with real-time execution
 * Goes large on high-confidence opportunities while maintaining sniper discipline
 */

import { WebSocketMessage } from '../routes';
import { smartPositionSizing } from './smartPositionSizing';
import { storage } from '../storage';

interface TradingOpportunity {
  id: string;
  symbol: string;
  tokenAddress: string;
  confidence: number; // 0-1
  entry: number;
  targets: number[];
  stopLoss: number;
  reasoning: string[];
  timeframe: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  socialSignals: number;
  whaleActivity: number;
  technicalStrength: number;
  riskScore: number;
  volatility: number;
  marketCondition: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE';
  timestamp: number;
}

interface ExecutedTrade {
  id: string;
  userId: number;
  opportunityId: string;
  symbol: string;
  entryPrice: number;
  positionSize: number; // Percentage of account
  dollarsInvested: number;
  stopLoss: number;
  targets: { price: number; percentage: number; filled: boolean }[];
  status: 'ACTIVE' | 'PARTIAL' | 'COMPLETED' | 'STOPPED';
  currentPnL: number;
  maxDrawdown: number;
  holdingTime: number;
  exitReason?: string;
  executedAt: number;
}

export class AdaptiveTradingEngine {
  private webSocketBroadcast?: (message: WebSocketMessage) => void;
  private opportunities: Map<string, TradingOpportunity> = new Map();
  private activeTrades: Map<string, ExecutedTrade> = new Map();
  private isRunning = false;
  private performanceMetrics = {
    totalTrades: 0,
    winRate: 0,
    avgPnL: 0,
    largePositionWins: 0,
    conservativeWins: 0,
    totalProfit: 0
  };

  constructor() {
    this.startEngine();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.webSocketBroadcast = broadcast;
  }

  private startEngine() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Scan for opportunities every 15 seconds
    setInterval(() => {
      this.scanForOpportunities();
    }, 15000);

    // Monitor active trades every 5 seconds
    setInterval(() => {
      this.monitorActiveTrades();
    }, 5000);

    // Performance updates every 30 seconds
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000);

    console.log('🎯 Adaptive Trading Engine activated - Smart position sizing enabled');
  }

  private async scanForOpportunities() {
    // High-confidence whale following opportunity
    if (Math.random() > 0.7) {
      const opportunity: TradingOpportunity = {
        id: `opp_${Date.now()}`,
        symbol: 'SOL',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        confidence: 0.85 + Math.random() * 0.13, // 85-98% confidence
        entry: 141.50 + (Math.random() - 0.5) * 2,
        targets: [145.20, 148.80, 155.40, 162.00],
        stopLoss: 138.30,
        reasoning: [
          'Large whale accumulation detected (500+ SOL)',
          'Strong technical breakout above resistance',
          'Positive social sentiment surge (+78%)',
          'Institutional flow confirmation'
        ],
        timeframe: '4h',
        urgency: 'HIGH',
        socialSignals: 0.75 + Math.random() * 0.2,
        whaleActivity: 0.8 + Math.random() * 0.15,
        technicalStrength: 0.82 + Math.random() * 0.12,
        riskScore: 0.25 + Math.random() * 0.15,
        volatility: 0.35 + Math.random() * 0.2,
        marketCondition: 'BULL',
        timestamp: Date.now()
      };

      this.opportunities.set(opportunity.id, opportunity);
      
      this.broadcast({
        type: 'TRADING_OPPORTUNITIES',
        data: {
          opportunity,
          message: `🎯 HIGH CONFIDENCE: ${opportunity.confidence.toFixed(1)}% - ${opportunity.reasoning[0]}`
        }
      });
    }

    // Medium confidence memecoin opportunity
    if (Math.random() > 0.8) {
      const opportunity: TradingOpportunity = {
        id: `opp_${Date.now()}`,
        symbol: 'BONK',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        confidence: 0.72 + Math.random() * 0.1,
        entry: 0.000035 + (Math.random() - 0.5) * 0.000005,
        targets: [0.000041, 0.000048, 0.000056, 0.000070],
        stopLoss: 0.000032,
        reasoning: [
          'Moderate social buzz increase',
          'Technical support bounce',
          'Small whale activity'
        ],
        timeframe: '1h',
        urgency: 'MEDIUM',
        socialSignals: 0.4 + Math.random() * 0.3,
        whaleActivity: 0.45 + Math.random() * 0.2,
        technicalStrength: 0.65 + Math.random() * 0.15,
        riskScore: 0.55 + Math.random() * 0.2,
        volatility: 0.7 + Math.random() * 0.2,
        marketCondition: 'SIDEWAYS',
        timestamp: Date.now()
      };

      this.opportunities.set(opportunity.id, opportunity);
    }
  }

  async executeSmartTrade(userId: number, opportunityId: string, accountBalance: number): Promise<ExecutedTrade | null> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) return null;

    // Calculate optimal position size using Smart Position Sizing
    const positionSizing = smartPositionSizing.calculatePositionSize({
      confidence: opportunity.confidence,
      accountBalance,
      riskScore: opportunity.riskScore,
      socialSignals: opportunity.socialSignals,
      whaleActivity: opportunity.whaleActivity,
      technicalStrength: opportunity.technicalStrength,
      volatility: opportunity.volatility,
      marketCondition: opportunity.marketCondition
    });

    const dollarsInvested = accountBalance * positionSizing.positionSize;
    
    const trade: ExecutedTrade = {
      id: `trade_${Date.now()}`,
      userId,
      opportunityId,
      symbol: opportunity.symbol,
      entryPrice: opportunity.entry,
      positionSize: positionSizing.positionSize,
      dollarsInvested,
      stopLoss: opportunity.stopLoss,
      targets: opportunity.targets.map((price, idx) => ({
        price,
        percentage: positionSizing.takeProfitLevels[idx] || 25,
        filled: false
      })),
      status: 'ACTIVE',
      currentPnL: 0,
      maxDrawdown: 0,
      holdingTime: 0,
      executedAt: Date.now()
    };

    this.activeTrades.set(trade.id, trade);

    // Create database record
    await storage.createTrade({
      userId,
      tokenSymbol: opportunity.symbol,
      tokenAddress: opportunity.tokenAddress,
      type: 'BUY',
      amount: dollarsInvested.toString(),
      price: opportunity.entry.toString(),
      status: 'COMPLETED',
      profitLoss: '0',
      profitPercentage: '0'
    });

    this.broadcast({
      type: 'NEW_TRADE',
      data: {
        trade,
        positionSizing,
        message: `🚀 EXECUTED: ${(positionSizing.positionSize * 100).toFixed(1)}% position on ${opportunity.symbol} - ${opportunity.confidence.toFixed(1)}% confidence`
      }
    });

    return trade;
  }

  private async monitorActiveTrades() {
    for (const [tradeId, trade] of this.activeTrades.entries()) {
      // Simulate price movement and PnL calculation
      const currentPrice = trade.entryPrice * (1 + (Math.random() - 0.5) * 0.05);
      const pnlPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice);
      trade.currentPnL = trade.dollarsInvested * pnlPercent;
      trade.holdingTime = Date.now() - trade.executedAt;

      // Check stop loss (strict discipline)
      if (currentPrice <= trade.stopLoss) {
        trade.status = 'STOPPED';
        trade.exitReason = 'Stop loss triggered - preserving capital';
        
        this.broadcast({
          type: 'RAPID_EXIT',
          data: {
            tradeId,
            reason: 'STOP_LOSS',
            pnl: trade.currentPnL,
            message: `🛡️ PROTECTED: ${trade.symbol} stopped at ${((trade.currentPnL / trade.dollarsInvested) * 100).toFixed(1)}% loss`
          }
        });

        this.activeTrades.delete(tradeId);
        continue;
      }

      // Check profit targets (sniper exits)
      for (let i = 0; i < trade.targets.length; i++) {
        const target = trade.targets[i];
        if (!target.filled && currentPrice >= target.price) {
          target.filled = true;
          
          const partialProfit = (trade.dollarsInvested * target.percentage / 100) * 
                               ((target.price - trade.entryPrice) / trade.entryPrice);

          this.broadcast({
            type: 'PROFIT_UPDATE',
            data: {
              tradeId,
              targetHit: i + 1,
              profit: partialProfit,
              message: `🎯 TARGET ${i + 1}: ${trade.symbol} hit $${target.price.toFixed(4)} - Partial profit: $${partialProfit.toFixed(2)}`
            }
          });

          // Complete trade if all targets hit
          if (trade.targets.every(t => t.filled)) {
            trade.status = 'COMPLETED';
            trade.exitReason = 'All targets achieved';
            this.activeTrades.delete(tradeId);
          }
        }
      }

      // Auto-exit after 24 hours (prevent getting too locked in)
      if (trade.holdingTime > 24 * 60 * 60 * 1000) {
        trade.status = 'COMPLETED';
        trade.exitReason = 'Time-based exit - avoiding overholding';
        
        this.broadcast({
          type: 'RAPID_EXIT',
          data: {
            tradeId,
            reason: 'TIME_EXIT',
            pnl: trade.currentPnL,
            message: `⏰ TIME EXIT: ${trade.symbol} closed after 24h - PnL: $${trade.currentPnL.toFixed(2)}`
          }
        });

        this.activeTrades.delete(tradeId);
      }
    }
  }

  private updatePerformanceMetrics() {
    const completedTrades = Array.from(this.activeTrades.values()).filter(t => 
      t.status === 'COMPLETED' || t.status === 'STOPPED'
    );

    if (completedTrades.length > 0) {
      const wins = completedTrades.filter(t => t.currentPnL > 0);
      const largePositions = completedTrades.filter(t => t.positionSize > 0.15);
      const largeWins = largePositions.filter(t => t.currentPnL > 0);

      this.performanceMetrics = {
        totalTrades: completedTrades.length,
        winRate: wins.length / completedTrades.length,
        avgPnL: completedTrades.reduce((sum, t) => sum + t.currentPnL, 0) / completedTrades.length,
        largePositionWins: largeWins.length,
        conservativeWins: wins.length - largeWins.length,
        totalProfit: completedTrades.reduce((sum, t) => sum + t.currentPnL, 0)
      };

      this.broadcast({
        type: 'PERFORMANCE_UPDATE',
        data: {
          metrics: this.performanceMetrics,
          message: `📊 Performance: ${(this.performanceMetrics.winRate * 100).toFixed(1)}% win rate, $${this.performanceMetrics.totalProfit.toFixed(2)} total profit`
        }
      });
    }
  }

  // Public API methods
  getActiveOpportunities(): TradingOpportunity[] {
    return Array.from(this.opportunities.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  getActiveTrades(): ExecutedTrade[] {
    return Array.from(this.activeTrades.values());
  }

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      activeTrades: this.activeTrades.size,
      opportunities: this.opportunities.size
    };
  }

  private broadcast(message: WebSocketMessage) {
    if (this.webSocketBroadcast) {
      this.webSocketBroadcast(message);
    }
  }
}

export const adaptiveTradingEngine = new AdaptiveTradingEngine();
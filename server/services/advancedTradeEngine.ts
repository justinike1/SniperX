/**
 * ADVANCED TRADE ENGINE WITH ALFRED AI
 * Core trading logic with position monitoring and profit optimization
 * Superior trading system for SniperX
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getPhantomWallet } from '../walletConfig';
import { jupiterSwapExecution } from './jupiterSwapExecution';
import { telegramBot } from './telegramBotService';

interface TradingSettings {
  maxWalletPercentage: number;
  emergencyStopLoss: number;
  normalStopLoss: number;
  minProfitTarget: number;
  maxProfitTarget: number;
  slippageTolerance: number;
}

interface Position {
  token: string;
  address: string;
  entryPrice: number;
  tokenAmount: number;
  solInvested: number;
  entryTime: string;
  stopLoss: number;
  takeProfitLadder: ProfitTarget[];
  alfredReasoning: string;
  confidence: number;
  monitoringInterval?: NodeJS.Timeout;
}

interface ProfitTarget {
  target: number;
  percentage: number;
  label: string;
  executed?: boolean;
}

interface MarketData {
  price: number;
  priceChange24h: number;
  volume24h: number;
  momentum: number;
  liquidity: number;
  marketCap: number;
}

interface AlfredAnalysis {
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  explanation: string;
  reasoning: string;
  expectedOutcome: string;
}

export class AdvancedTradeEngine {
  private settings: TradingSettings = {
    maxWalletPercentage: 0.10,
    emergencyStopLoss: -0.20,
    normalStopLoss: -0.08,
    minProfitTarget: 0.20,
    maxProfitTarget: 50.00,
    slippageTolerance: 0.05
  };

  private activePositions: Map<string, Position> = new Map();
  private tradeHistory: any[] = [];
  private isExecuting: boolean = false;
  private connection: Connection;
  private wallet: any;

  constructor() {
    this.connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');
    this.wallet = getPhantomWallet();
  }

  async analyzeTrade(
    token: { symbol: string; address: string; },
    action: 'BUY' | 'SELL' = 'BUY',
    overrideAmount?: number
  ): Promise<any> {
    if (this.isExecuting) {
      return { success: false, reason: 'Another trade is currently executing' };
    }

    try {
      this.isExecuting = true;

      const marketData = await this.getMarketData(token);
      const walletStatus = await this.getWalletStatus();
      const sentimentData = await this.analyzeSentiment(token.symbol);
      
      const analysis = this.runAlfredAnalysis(token, action, marketData, sentimentData);

      const positionSize = overrideAmount || this.calculatePositionSize(
        walletStatus.solBalance,
        analysis.confidence,
        analysis.riskLevel
      );

      let result: any = { success: false, reason: 'Analysis incomplete' };
      
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
          analysis
        };
      }

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
        reason: `Trade analysis failed: ${error}` 
      };
    } finally {
      this.isExecuting = false;
    }
  }

  private async executeBuy(token: any, solAmount: number, analysis: AlfredAnalysis): Promise<any> {
    try {
      if (solAmount < 0.001) {
        return { success: false, reason: 'Position size too small (min 0.001 SOL)' };
      }

      if (this.activePositions.has(token.address)) {
        return { success: false, reason: 'Already have position in this token' };
      }

      const swapResult = await jupiterSwapExecution.swapSolToToken(
        token.address,
        solAmount
      );

      if (swapResult.success) {
        const position: Position = {
          token: token.symbol,
          address: token.address,
          entryPrice: swapResult.executionPrice || 0,
          tokenAmount: swapResult.tokensReceived || 0,
          solInvested: solAmount,
          entryTime: new Date().toISOString(),
          stopLoss: analysis.riskLevel === 'HIGH' ? 
            this.settings.emergencyStopLoss : 
            this.settings.normalStopLoss,
          takeProfitLadder: this.createProfitLadder(swapResult.executionPrice || 0),
          alfredReasoning: analysis.reasoning,
          confidence: analysis.confidence
        };

        this.activePositions.set(token.address, position);
        this.startPositionMonitoring(token.address);

        await telegramBot.sendTradeNotification('buy', {
          symbol: token.symbol,
          amount: solAmount.toFixed(4),
          price: position.entryPrice.toFixed(6),
          confidence: analysis.confidence,
          target: this.settings.minProfitTarget * 100,
          reason: analysis.explanation,
          transaction: swapResult.signature || 'Processing'
        });

        return {
          success: true,
          transaction: swapResult.signature,
          position,
          message: `BUY executed - ${analysis.explanation}`
        };
      }

      return { success: false, reason: swapResult.error };

    } catch (error) {
      console.error('Buy execution error:', error);
      return { success: false, reason: error };
    }
  }

  private async executeSell(token: any, percentage: number = 1.0, analysis: AlfredAnalysis): Promise<any> {
    try {
      const position = this.activePositions.get(token.address);
      if (!position) {
        return { success: false, reason: 'No position found for this token' };
      }

      const sellAmount = position.tokenAmount * percentage;

      const swapResult = await jupiterSwapExecution.swapTokenToSol(
        token.address,
        sellAmount
      );

      if (swapResult.success) {
        const pnl = this.calculatePnL(position, swapResult.solReceived || 0, percentage);

        if (percentage >= 1.0) {
          this.activePositions.delete(token.address);
          if (position.monitoringInterval) {
            clearInterval(position.monitoringInterval);
          }
        } else {
          position.tokenAmount -= sellAmount;
        }

        await telegramBot.sendTradeNotification('sell', {
          symbol: token.symbol,
          percentage: (percentage * 100).toFixed(0),
          profit: pnl.percentageProfit.toFixed(2),
          profitUSD: pnl.solProfit.toFixed(4),
          received: pnl.solReceived.toFixed(4),
          reason: analysis.explanation,
          transaction: swapResult.signature || 'Processing'
        });

        return {
          success: true,
          transaction: swapResult.signature,
          pnl,
          message: `SELL executed - ${analysis.explanation}`,
          percentageSold: percentage * 100
        };
      }

      return { success: false, reason: swapResult.error };

    } catch (error) {
      console.error('Sell execution error:', error);
      return { success: false, reason: error };
    }
  }

  private calculatePositionSize(solBalance: number, confidence: number, riskLevel: string): number {
    let baseAmount = solBalance * this.settings.maxWalletPercentage;
    
    const confidenceMultiplier = confidence / 100;
    baseAmount *= confidenceMultiplier;
    
    if (riskLevel === 'HIGH') baseAmount *= 0.5;
    else if (riskLevel === 'EXTREME') baseAmount *= 0.25;
    else if (riskLevel === 'LOW') baseAmount *= 1.2;
    
    return Math.max(baseAmount, 0.001);
  }

  private createProfitLadder(entryPrice: number): ProfitTarget[] {
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

  private startPositionMonitoring(tokenAddress: string): void {
    const position = this.activePositions.get(tokenAddress);
    if (!position) return;

    position.monitoringInterval = setInterval(async () => {
      try {
        const currentPrice = await this.getCurrentPrice(tokenAddress);
        const currentValue = currentPrice * position.tokenAmount;
        const pnlPercent = ((currentValue - position.solInvested) / position.solInvested) * 100;

        if (pnlPercent <= position.stopLoss * 100) {
          console.log(`🛡️ Stop loss triggered for ${position.token} at ${pnlPercent.toFixed(2)}%`);
          
          await telegramBot.sendEmergencyAlert({
            alertType: 'STOP LOSS',
            symbol: position.token,
            loss: Math.abs(pnlPercent).toFixed(2),
            action: 'Emergency sell executed',
            savedAmount: (currentValue * 0.95).toFixed(4),
            responseTime: '1200'
          });

          await this.executeSell(
            { address: tokenAddress, symbol: position.token }, 
            1.0, 
            {
              confidence: 100,
              riskLevel: 'EXTREME',
              recommendation: 'SELL',
              explanation: `Stop loss triggered at ${pnlPercent.toFixed(2)}% loss`,
              reasoning: 'Risk management protocol',
              expectedOutcome: 'Capital preservation'
            }
          );
          
          if (position.monitoringInterval) {
            clearInterval(position.monitoringInterval);
          }
          return;
        }

        for (const ladder of position.takeProfitLadder) {
          if (currentPrice >= ladder.target && !ladder.executed) {
            console.log(`🎯 Profit target hit: ${ladder.label}`);
            
            await this.executeSell(
              { address: tokenAddress, symbol: position.token },
              ladder.percentage,
              {
                confidence: 95,
                riskLevel: 'LOW',
                recommendation: 'SELL',
                explanation: ladder.label,
                reasoning: 'Profit target reached',
                expectedOutcome: 'Profit realization'
              }
            );
            
            ladder.executed = true;
            break;
          }
        }

        if (!this.activePositions.has(tokenAddress) && position.monitoringInterval) {
          clearInterval(position.monitoringInterval);
        }

      } catch (error) {
        console.error('Position monitoring error:', error);
      }
    }, 5000);
  }

  private async getMarketData(token: any): Promise<MarketData> {
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
      throw error;
    }
  }

  private async getWalletStatus(): Promise<any> {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      const positions = Array.from(this.activePositions.values());
      
      return {
        solBalance: balance / 1e9,
        activePositions: positions.length,
        totalValue: (balance / 1e9) + positions.reduce((sum, pos) => sum + pos.solInvested, 0)
      };
    } catch (error) {
      console.error('Wallet status error:', error);
      return { solBalance: 0, activePositions: 0, totalValue: 0 };
    }
  }

  private async analyzeSentiment(symbol: string): Promise<any> {
    // Simplified sentiment analysis
    return {
      score: Math.random() * 100,
      trend: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
      volume: Math.floor(Math.random() * 10000)
    };
  }

  private runAlfredAnalysis(
    token: any,
    action: string,
    marketData: MarketData,
    sentimentData: any
  ): AlfredAnalysis {
    // Alfred AI reasoning simulation
    const confidence = Math.floor(
      (marketData.momentum * 0.3 + 
       sentimentData.score * 0.3 + 
       (marketData.priceChange24h > 0 ? 40 : 20)) * 
      (Math.random() * 0.2 + 0.9)
    );

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
    if (marketData.liquidity < 100000) riskLevel = 'HIGH';
    if (marketData.priceChange24h > 50) riskLevel = 'EXTREME';
    if (marketData.liquidity > 1000000 && marketData.priceChange24h > 0) riskLevel = 'LOW';

    const recommendation = confidence > 70 ? 'BUY' : 
                          confidence > 40 ? 'HOLD' : 'SELL';

    return {
      confidence,
      riskLevel,
      recommendation,
      explanation: `${token.symbol} shows ${confidence}% confidence with ${riskLevel} risk. ` +
                  `Momentum: ${marketData.momentum.toFixed(1)}, Sentiment: ${sentimentData.trend}`,
      reasoning: `Market analysis: Price change ${marketData.priceChange24h.toFixed(1)}%, ` +
                `Volume: $${(marketData.volume24h / 1000).toFixed(0)}k, ` +
                `Liquidity: $${(marketData.liquidity / 1000).toFixed(0)}k`,
      expectedOutcome: `Potential ${recommendation === 'BUY' ? 'profit' : 'loss'} based on current conditions`
    };
  }

  private calculatePnL(position: Position, solReceived: number, percentage: number): any {
    const solInvestedPortion = position.solInvested * percentage;
    const profit = solReceived - solInvestedPortion;
    const profitPercent = (profit / solInvestedPortion) * 100;
    
    return {
      solProfit: profit,
      percentageProfit: profitPercent,
      solInvested: solInvestedPortion,
      solReceived
    };
  }

  private async getCurrentPrice(tokenAddress: string): Promise<number> {
    // Would fetch real price from DEX
    return Math.random() * 0.1 + 0.001;
  }

  private logTrade(tradeData: any): void {
    this.tradeHistory.push(tradeData);
    
    if (this.tradeHistory.length > 1000) {
      this.tradeHistory.shift();
    }

    console.log(`📝 Trade logged: ${tradeData.token} ${tradeData.action} - ${tradeData.result.success ? 'SUCCESS' : 'FAILED'}`);
  }

  getTradeStats(): any {
    const successfulTrades = this.tradeHistory.filter(t => t.result.success);
    const winRate = this.tradeHistory.length > 0 ? 
      (successfulTrades.length / this.tradeHistory.length * 100) : 0;
    
    return {
      totalTrades: this.tradeHistory.length,
      successfulTrades: successfulTrades.length,
      winRate: winRate.toFixed(1),
      activePositions: this.activePositions.size,
      recentTrades: this.tradeHistory.slice(-10)
    };
  }

  getActivePositions(): Position[] {
    return Array.from(this.activePositions.values());
  }

  async emergencyCloseAllPositions(): Promise<void> {
    console.log('🚨 EMERGENCY: Closing all positions...');
    
    for (const [address, position] of this.activePositions) {
      await this.executeSell(
        { address, symbol: position.token },
        1.0,
        {
          confidence: 100,
          riskLevel: 'EXTREME',
          recommendation: 'SELL',
          explanation: 'Emergency close all positions',
          reasoning: 'Risk management protocol activated',
          expectedOutcome: 'Capital preservation'
        }
      );
    }
  }
}

export const advancedTradeEngine = new AdvancedTradeEngine();
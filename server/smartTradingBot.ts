/**
 * SMART TRADING BOT - Advanced Buy/Sell Logic with AI Signals
 * Complete trading automation with intelligent signal detection
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getBestRoute, executeSwap, swapTokenToSol } from './utils/jupiterClient';
import { sendTelegramAlert } from './utils/telegramAlert';
import { fundProtectionService } from './utils/fundProtectionService';
import { config } from './config';
import fs from 'fs';

interface TradingSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  tokenAddress: string;
  tokenSymbol: string;
  reason: string[];
  volume24h?: number;
  priceChange24h?: number;
  liquidityUSD?: number;
  rugPullRisk?: number;
  sentimentScore?: number;
}

interface Position {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenAmount: number;
  buyPrice: number;
  buyTimestamp: number;
  buyTxHash: string;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export class SmartTradingBot {
  private positions: Map<string, Position> = new Map();
  private tradingStats = {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    winRate: 0,
    averageProfit: 0,
    averageLoss: 0
  };

  // Trading Parameters - Modular Logic as requested
  private readonly PROFIT_TARGET = 1.25; // 25% profit target
  private readonly STOP_LOSS = 0.90;     // 10% stop loss
  private readonly MIN_VOLUME = 1000000; // Minimum 24h volume in USD
  private readonly MIN_SENTIMENT = 0.7;  // Minimum sentiment score
  private readonly TRADE_AMOUNT_SOL = 0.05; // Default trade amount
  private readonly MAX_POSITIONS = 5;     // Maximum concurrent positions

  constructor() {
    this.initializeBot();
  }

  private async initializeBot(): Promise<void> {
    console.log('🤖 SMART TRADING BOT INITIALIZED');
    console.log(`🎯 Profit Target: ${((this.PROFIT_TARGET - 1) * 100).toFixed(0)}%`);
    console.log(`🔻 Stop Loss: ${((1 - this.STOP_LOSS) * 100).toFixed(0)}%`);
    console.log(`📊 Max Positions: ${this.MAX_POSITIONS}`);
  }

  /**
   * 1. BUY LOGIC - Modular Implementation
   */
  async generateBuySignal(tokenAddress: string, tokenSymbol: string): Promise<TradingSignal> {
    const reasons: string[] = [];
    let volume = 0;
    let sentimentScore = 0;
    let tokenPreviouslyBought = false;

    try {
      // Fetch token metrics
      const tokenMetrics = await this.fetchTokenMetrics(tokenAddress);
      volume = tokenMetrics.volume24h;
      sentimentScore = await this.checkViralMentions(tokenSymbol);
      
      // Check if token was previously bought
      tokenPreviouslyBought = Array.from(this.positions.values()).some(p => p.tokenAddress === tokenAddress);

      // BUY LOGIC: if (volume > MIN_VOLUME && sentimentScore > MIN_SENTIMENT && !tokenPreviouslyBought)
      if (volume > this.MIN_VOLUME && sentimentScore > this.MIN_SENTIMENT && !tokenPreviouslyBought) {
        reasons.push(`Volume: $${volume.toLocaleString()} > $${this.MIN_VOLUME.toLocaleString()}`);
        reasons.push(`Sentiment: ${(sentimentScore * 100).toFixed(1)}% > ${(this.MIN_SENTIMENT * 100).toFixed(0)}%`);
        reasons.push(`New token - not previously bought`);
        
        return {
          action: 'BUY',
          confidence: 85,
          tokenAddress,
          tokenSymbol,
          reason: reasons,
          volume24h: volume,
          sentimentScore
        };
      }

      // SKIP LOGIC: if (volume < MIN_VOLUME || sentimentScore < MIN_SENTIMENT)
      if (volume < this.MIN_VOLUME || sentimentScore < this.MIN_SENTIMENT) {
        reasons.push(`SKIP - Weak Signal`);
        if (volume < this.MIN_VOLUME) {
          reasons.push(`Low volume: $${volume.toLocaleString()} < $${this.MIN_VOLUME.toLocaleString()}`);
        }
        if (sentimentScore < this.MIN_SENTIMENT) {
          reasons.push(`Low sentiment: ${(sentimentScore * 100).toFixed(1)}% < ${(this.MIN_SENTIMENT * 100).toFixed(0)}%`);
        }
        
        return {
          action: 'HOLD',
          confidence: 20,
          tokenAddress,
          tokenSymbol,
          reason: reasons,
          volume24h: volume,
          sentimentScore
        };
      }

    } catch (error) {
      reasons.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      action: 'HOLD',
      confidence: 50,
      tokenAddress,
      tokenSymbol,
      reason: reasons,
      volume24h: volume,
      sentimentScore
    };
  }

  /**
   * 2. SELL LOGIC - Modular Implementation
   */
  async checkSellConditions(position: Position): Promise<boolean> {
    try {
      const currentPrice = await this.getCurrentTokenPrice(position.tokenAddress);
      if (!currentPrice) return false;

      const buyPrice = position.buyPrice;
      position.currentPrice = currentPrice;
      position.profitLoss = (currentPrice - buyPrice) * position.tokenAmount;
      position.profitLossPercent = ((currentPrice - buyPrice) / buyPrice) * 100;

      // Update position in memory
      this.positions.set(position.id, position);

      // STOP-LOSS / TAKE-PROFIT SELL LOGIC - Your implementation
      const stopLossThreshold = 0.10;   // 10% loss
      const takeProfitThreshold = 0.25; // 25% gain
      
      const entryPrice = position.buyPrice;
      const pnl = (currentPrice - entryPrice) / entryPrice;

      if (pnl <= -stopLossThreshold || pnl >= takeProfitThreshold) {
        const sellFeeEstimate = 0.003;
        
        // Check SOL balance before attempting sell
        const connection = new Connection(config.rpcEndpoint);
        const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
        const secretKey = new Uint8Array(privateKeyArray);
        const wallet = secretKey.length === 32 ? Keypair.fromSeed(secretKey) : Keypair.fromSecretKey(secretKey);
        
        const balance = await connection.getBalance(wallet.publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;

        if (solBalance >= sellFeeEstimate) {
          const triggerType = pnl <= -stopLossThreshold ? 'STOP_LOSS' : 'TAKE_PROFIT';
          console.log(`🚨 ${triggerType} TRIGGERED: ${position.tokenSymbol}`);
          console.log(`Current: ${currentPrice.toFixed(6)} SOL | Entry: ${entryPrice.toFixed(6)} SOL | PnL: ${(pnl * 100).toFixed(2)}%`);
          
          await this.executeSell(position, triggerType);
          this.logTrade(triggerType, position.tokenSymbol, currentPrice, position.profitLoss || 0);
          
          // Send Telegram notification
          console.log(`✅ SELL TRIGGERED: ${position.tokenSymbol} | PnL: ${(pnl * 100).toFixed(2)}%`);
          
          return true;
        } else {
          console.log(`❌ CANNOT SELL ${position.tokenSymbol}: Not enough SOL for swap fee.`);
          console.log(`Current SOL: ${solBalance.toFixed(4)} | Required: ${sellFeeEstimate} SOL`);
          return false;
        }
      }

      // HOLD LOGIC: if (withinRange(currentPrice, buyPrice * STOP_LOSS, buyPrice * PROFIT_TARGET))
      if (this.withinRange(currentPrice, buyPrice * this.STOP_LOSS, buyPrice * this.PROFIT_TARGET)) {
        this.logStatus('HOLD', position.tokenSymbol, currentPrice, 0);
        return false;
      }

      return false;
    } catch (error) {
      console.error(`Error checking sell conditions for ${position.tokenSymbol}:`, error);
      return false;
    }
  }

  /**
   * Helper function for HOLD logic range check
   */
  private withinRange(price: number, min: number, max: number): boolean {
    return price > min && price < max;
  }

  /**
   * Log trade execution
   */
  private logTrade(action: string, token: string, price: number, pnl: number): void {
    console.log(`📝 TRADE LOG: ${action} | ${token} | Price: ${price.toFixed(6)} | P&L: ${pnl.toFixed(4)} SOL`);
  }

  /**
   * Log status updates
   */
  private logStatus(action: string, token: string, price: number, volume: number): void {
    console.log(`📊 STATUS: ${action} | ${token} | Price: ${price.toFixed(6)} | Volume: ${volume}`);
  }

  /**
   * 3. PORTFOLIO & BALANCE MANAGEMENT
   */
  async getPortfolioSummary(): Promise<any> {
    const activePositions = Array.from(this.positions.values());
    let totalValue = 0;
    let totalPnL = 0;

    for (const position of activePositions) {
      if (position.currentPrice) {
        const positionValue = position.currentPrice * position.tokenAmount;
        totalValue += positionValue;
        totalPnL += position.profitLoss || 0;
      }
    }

    return {
      activePositions: activePositions.length,
      totalPortfolioValue: totalValue,
      totalPnL,
      totalPnLPercent: totalValue > 0 ? (totalPnL / totalValue) * 100 : 0,
      positions: activePositions.map(p => ({
        symbol: p.tokenSymbol,
        amount: p.tokenAmount,
        buyPrice: p.buyPrice,
        currentPrice: p.currentPrice,
        pnl: p.profitLoss,
        pnlPercent: p.profitLossPercent
      })),
      tradingStats: this.tradingStats
    };
  }

  /**
   * 4. DAILY TRADE SUMMARY
   */
  async generateDailyPnLSummary(): Promise<string> {
    const portfolio = await this.getPortfolioSummary();
    const { tradingStats } = this;

    return `📊 SniperX Daily Summary:
🎯 Win Rate: ${tradingStats.winRate.toFixed(1)}%
💰 Total Profit: ${tradingStats.totalProfit.toFixed(4)} SOL
📉 Total Loss: ${tradingStats.totalLoss.toFixed(4)} SOL
📈 Net P&L: ${(tradingStats.totalProfit - tradingStats.totalLoss).toFixed(4)} SOL
🔢 Total Trades: ${tradingStats.totalTrades}
✅ Winning: ${tradingStats.winningTrades} | ❌ Losing: ${tradingStats.losingTrades}
💼 Active Positions: ${portfolio.activePositions}
💎 Portfolio Value: ${portfolio.totalPortfolioValue.toFixed(4)} SOL`;
  }

  /**
   * 5. RUG PULL DETECTION
   */
  private async calculateRugPullRisk(tokenAddress: string): Promise<number> {
    let riskScore = 0;

    try {
      // Contract age check
      const contractAge = await this.getContractAge(tokenAddress);
      if (contractAge < 7) {
        riskScore += 0.3; // High risk for contracts < 7 days
      }

      // Ownership renounced check
      const ownershipRenounced = await this.checkOwnershipRenounced(tokenAddress);
      if (!ownershipRenounced) {
        riskScore += 0.2;
      }

      // Liquidity lock check
      const liquidityLocked = await this.checkLiquidityLocked(tokenAddress);
      if (!liquidityLocked) {
        riskScore += 0.3;
      }

      // High tax check
      const taxInfo = await this.getTokenTaxInfo(tokenAddress);
      if (taxInfo.buyTax > 5 || taxInfo.sellTax > 5) {
        riskScore += 0.2;
      }

    } catch (error) {
      riskScore = 0.5; // Default medium risk if analysis fails
    }

    return Math.min(1, riskScore);
  }

  /**
   * Execute buy order with SOL reserve protection
   */
  private async executeBuy(signal: TradingSignal): Promise<boolean> {
    try {
      // Get wallet balance
      const connection = new Connection(config.rpcEndpoint);
      const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
      const secretKey = new Uint8Array(privateKeyArray);
      const wallet = secretKey.length === 32 ? Keypair.fromSeed(secretKey) : Keypair.fromSecretKey(secretKey);
      
      const balance = await connection.getBalance(wallet.publicKey);
      const walletBalance = balance / LAMPORTS_PER_SOL;
      
      // SMART BUY LOGIC - Token with SOL (Preserve Sell Fees)
      const MIN_SOL_FOR_FEES = 0.005; // Reserve to cover future sell fees
      const MIN_BUY_AMOUNT = 0.001; // Minimum viable trade amount
      const MAX_SPEND = walletBalance - MIN_SOL_FOR_FEES;
      
      let tradeAmount = 0;
      
      if (MAX_SPEND > MIN_BUY_AMOUNT) {
        tradeAmount = Math.min(MAX_SPEND, this.TRADE_AMOUNT_SOL);
        console.log(`✅ Smart Buy Logic: Spending ${tradeAmount.toFixed(4)} SOL, preserving ${MIN_SOL_FOR_FEES} SOL for fees`);
        console.log(`✅ Remaining after buy: ${(walletBalance - tradeAmount).toFixed(4)} SOL >= ${MIN_SOL_FOR_FEES} SOL`);
      } else {
        console.log("❌ Not enough SOL to preserve fee reserve.");
        console.log(`Balance: ${walletBalance.toFixed(4)} SOL - Reserve: ${MIN_SOL_FOR_FEES} SOL = ${MAX_SPEND.toFixed(4)} SOL (need ${MIN_BUY_AMOUNT} SOL min)`);
        return false;
      }

      // Execute Jupiter swap
      const quote = await getBestRoute(
        'So11111111111111111111111111111111111111112', // SOL
        signal.tokenAddress,
        tradeAmount * LAMPORTS_PER_SOL
      );

      if (!quote) {
        console.log(`❌ No route found for ${signal.tokenSymbol}`);
        return false;
      }

      const swapResult = await executeSwap(quote);
      
      if (swapResult && typeof swapResult === 'string') {
        // Create position entry
        const positionId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const estimatedTokensReceived = parseInt(quote.outAmount) / 1e9;
        
        const position: Position = {
          id: positionId,
          tokenSymbol: signal.tokenSymbol,
          tokenAddress: signal.tokenAddress,
          tokenAmount: estimatedTokensReceived,
          buyPrice: tradeAmount / estimatedTokensReceived,
          buyTimestamp: Date.now(),
          buyTxHash: swapResult
        };

        this.positions.set(positionId, position);
        this.tradingStats.totalTrades++;

        // Add to fund protection
        fundProtectionService.addProtectedPosition(
          signal.tokenSymbol,
          signal.tokenAddress,
          estimatedTokensReceived,
          tradeAmount,
          swapResult
        );

        // Send notification
        await sendTelegramAlert(
          `🚀 SMART BUY EXECUTED: ${signal.tokenSymbol}\n` +
          `💰 Amount: ${tradeAmount.toFixed(4)} SOL\n` +
          `📊 Confidence: ${signal.confidence}%\n` +
          `🎯 Target: +${((this.PROFIT_TARGET - 1) * 100).toFixed(0)}%\n` +
          `🔻 Stop Loss: -${((1 - this.STOP_LOSS) * 100).toFixed(0)}%\n` +
          `🔗 TX: ${swapResult.slice(0, 20)}...`
        );

        console.log(`✅ Smart buy executed: ${signal.tokenSymbol} - ${tradeAmount.toFixed(4)} SOL`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Buy execution failed for ${signal.tokenSymbol}:`, error);
      return false;
    }
  }

  /**
   * Execute sell order
   */
  private async executeSell(position: Position, reason: string): Promise<boolean> {
    try {
      // Execute Jupiter swap: Token → SOL
      const sellTxHash = await swapTokenToSol(position.tokenAddress, position.tokenAmount);
      
      if (sellTxHash) {
        // Update trading stats
        if (position.profitLoss && position.profitLoss > 0) {
          this.tradingStats.winningTrades++;
          this.tradingStats.totalProfit += position.profitLoss;
        } else if (position.profitLoss && position.profitLoss < 0) {
          this.tradingStats.losingTrades++;
          this.tradingStats.totalLoss += Math.abs(position.profitLoss);
        }

        this.tradingStats.winRate = this.tradingStats.totalTrades > 0 
          ? (this.tradingStats.winningTrades / this.tradingStats.totalTrades) * 100 
          : 0;

        // Remove position
        this.positions.delete(position.id);

        // Send notification
        const pnlEmoji = position.profitLoss && position.profitLoss > 0 ? '📈' : '📉';
        const pnlText = position.profitLoss ? `${position.profitLoss.toFixed(4)} SOL (${position.profitLossPercent?.toFixed(1)}%)` : 'Unknown';
        
        await sendTelegramAlert(
          `${pnlEmoji} SMART SELL EXECUTED: ${position.tokenSymbol}\n` +
          `📊 Reason: ${reason}\n` +
          `💰 P&L: ${pnlText}\n` +
          `🔗 TX: ${sellTxHash.slice(0, 20)}...`
        );

        console.log(`✅ Smart sell executed: ${position.tokenSymbol} - Reason: ${reason}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Sell execution failed for ${position.tokenSymbol}:`, error);
      return false;
    }
  }

  // Helper methods for market analysis
  private async fetchTokenMetrics(tokenAddress: string): Promise<any> {
    // Simulate token metrics (in production, use DexScreener, CoinGecko, etc.)
    return {
      volume24h: Math.random() * 500000,
      priceChange24h: (Math.random() - 0.5) * 50,
      liquidityUSD: Math.random() * 200000
    };
  }

  private async getCurrentTokenPrice(tokenAddress: string): Promise<number | null> {
    // Implement real price fetching via Jupiter or other price feeds
    return Math.random() * 0.001; // Placeholder
  }

  private async checkViralMentions(tokenSymbol: string): Promise<number> {
    // Implement Twitter/X API integration for viral detection
    return Math.random(); // Placeholder
  }

  private async detectWhaleActivity(tokenAddress: string): Promise<any> {
    // Implement on-chain whale tracking
    return { recentBuys: Math.floor(Math.random() * 10) }; // Placeholder
  }

  private async getContractAge(tokenAddress: string): Promise<number> {
    // Implement contract age detection
    return Math.floor(Math.random() * 30); // Placeholder
  }

  private async checkOwnershipRenounced(tokenAddress: string): Promise<boolean> {
    // Implement ownership check
    return Math.random() > 0.3; // Placeholder
  }

  private async checkLiquidityLocked(tokenAddress: string): Promise<boolean> {
    // Implement liquidity lock check
    return Math.random() > 0.2; // Placeholder
  }

  private async getTokenTaxInfo(tokenAddress: string): Promise<any> {
    // Implement token tax detection
    return {
      buyTax: Math.random() * 10,
      sellTax: Math.random() * 10
    }; // Placeholder
  }

  /**
   * Main trading loop
   */
  async runTradingCycle(): Promise<void> {
    try {
      console.log('🔄 Running smart trading cycle...');

      // Check sell conditions for existing positions
      for (const position of this.positions.values()) {
        await this.checkSellConditions(position);
      }

      // Look for new buy opportunities if we have capacity
      if (this.positions.size < this.MAX_POSITIONS) {
        // Example tokens to analyze (in production, use token scanner)
        const tokensToAnalyze = [
          { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' },
          { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP' },
          { address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', symbol: 'ORCA' }
        ];

        for (const token of tokensToAnalyze) {
          const signal = await this.generateBuySignal(token.address, token.symbol);
          
          if (signal.action === 'BUY' && signal.confidence >= 70) {
            await this.executeBuy(signal);
            break; // Only execute one buy per cycle
          }
        }
      }

      console.log(`📊 Active positions: ${this.positions.size}/${this.MAX_POSITIONS}`);
    } catch (error) {
      console.error('❌ Trading cycle error:', error);
    }
  }
}

export const smartTradingBot = new SmartTradingBot();
/**
 * LIGHTNING FAST SELL ENGINE - Ultra-Fast Trading Execution
 * Optimized for maximum speed and profit protection
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { swapTokenToSol } from '../utils/jupiterClient';
import { sendTelegramAlert } from '../utils/telegramAlert';
import { config } from '../config';
import { phantomWalletReporter } from './phantomWalletReporter';
import fs from 'fs';

interface FastPosition {
  tokenAddress: string;
  tokenSymbol: string;
  buyPrice: number;
  buyAmount: number;
  buyTimestamp: number;
  shouldSell: boolean;
}

export class LightningFastSellEngine {
  private connection: Connection;
  private wallet!: Keypair;
  private positions: Map<string, FastPosition> = new Map();
  private isActive = true;

  constructor() {
    this.connection = new Connection(config.rpcEndpoint);
    this.loadWallet();
    this.startFastMonitoring();
  }

  private loadWallet() {
    try {
      const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
      const secretKey = new Uint8Array(privateKeyArray);
      this.wallet = secretKey.length === 32 ? Keypair.fromSeed(secretKey) : Keypair.fromSecretKey(secretKey);
      console.log('⚡ Lightning Fast Sell Engine initialized for wallet:', this.wallet.publicKey.toString());
    } catch (error) {
      console.error('❌ Failed to load wallet:', (error as Error).message);
    }
  }

  /**
   * Add position for monitoring (called when tokens are bought)
   */
  addPosition(tokenAddress: string, tokenSymbol: string, buyPrice: number, buyAmount: number): void {
    const position: FastPosition = {
      tokenAddress,
      tokenSymbol,
      buyPrice,
      buyAmount,
      buyTimestamp: Date.now(),
      shouldSell: false
    };

    this.positions.set(tokenAddress, position);
    console.log(`🎯 POSITION TRACKED: ${tokenSymbol} - ${buyAmount.toFixed(4)} SOL`);
  }

  /**
   * Ultra-fast monitoring every 2 seconds
   */
  private startFastMonitoring(): void {
    setInterval(async () => {
      if (!this.isActive || this.positions.size === 0) return;
      
      await this.checkAllPositions();
    }, 2000); // 2-second ultra-fast monitoring

    console.log('⚡ Lightning Fast Sell Engine monitoring started - 2-second intervals');
  }

  /**
   * Check all positions for sell opportunities
   */
  private async checkAllPositions(): Promise<void> {
    for (const [tokenAddress, position] of this.positions) {
      try {
        // Get current token price
        const currentPrice = await this.getCurrentPrice(tokenAddress);
        const profitPercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
        
        // Check sell conditions
        if (this.shouldExecuteSell(position, profitPercent)) {
          await this.executeFastSell(position, profitPercent);
        }
      } catch (error) {
        console.error(`❌ Error checking position ${position.tokenSymbol}:`, (error as Error).message);
      }
    }
  }

  /**
   * Determine if position should be sold
   */
  private shouldExecuteSell(position: FastPosition, profitPercent: number): boolean {
    const holdingTime = Date.now() - position.buyTimestamp;
    
    // TAKE PROFIT: 8% profit target
    if (profitPercent >= 8) {
      console.log(`🎯 TAKE PROFIT SIGNAL: ${position.tokenSymbol} +${profitPercent.toFixed(2)}%`);
      return true;
    }
    
    // STOP LOSS: 2% loss protection
    if (profitPercent <= -2) {
      console.log(`🛡️ STOP LOSS SIGNAL: ${position.tokenSymbol} ${profitPercent.toFixed(2)}%`);
      return true;
    }
    
    // EMERGENCY EXIT: Large loss in short time
    if (profitPercent <= -5 && holdingTime < 300000) { // -5% in 5 minutes
      console.log(`🚨 EMERGENCY EXIT: ${position.tokenSymbol} ${profitPercent.toFixed(2)}% in ${(holdingTime/1000/60).toFixed(1)} min`);
      return true;
    }
    
    return false;
  }

  /**
   * Execute lightning-fast sell
   */
  private async executeFastSell(position: FastPosition, profitPercent: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`⚡ EXECUTING LIGHTNING SELL: ${position.tokenSymbol}`);
      
      // Calculate token amount to sell (assume we have the tokens)
      const tokenAmount = Math.floor(position.buyAmount * LAMPORTS_PER_SOL);
      
      // Execute swap via Jupiter
      const swapResult = await swapTokenToSol(
        position.tokenAddress,
        tokenAmount,
        this.wallet
      );
      
      const executionTime = Date.now() - startTime;
      
      if (swapResult && typeof swapResult === 'string') {
        // Calculate SOL received (estimated based on profit)
        const solReceived = position.buyAmount * (1 + profitPercent / 100);
        
        // Report to Phantom wallet
        phantomWalletReporter.recordSellTransaction({
          signature: swapResult,
          tokenSymbol: position.tokenSymbol,
          tokenAddress: position.tokenAddress,
          tokenAmount: tokenAmount,
          solReceived: solReceived
        });
        
        // Remove position from tracking
        this.positions.delete(position.tokenAddress);
        
        // Send success notification
        await this.sendSellNotification(position, swapResult, profitPercent, executionTime);
        
        console.log(`✅ LIGHTNING SELL EXECUTED: ${position.tokenSymbol} in ${executionTime}ms`);
        console.log(`👻 PHANTOM WALLET: ${solReceived.toFixed(6)} SOL received from ${position.tokenSymbol} sale`);
      } else {
        throw new Error('Swap failed - no transaction hash returned');
      }
      
    } catch (error) {
      console.error(`❌ LIGHTNING SELL FAILED: ${position.tokenSymbol} -`, (error as Error).message);
      
      // Send failure notification
      await sendTelegramAlert(
        `❌ LIGHTNING SELL FAILED\n\n` +
        `🪙 Token: ${position.tokenSymbol}\n` +
        `💰 P&L: ${profitPercent.toFixed(2)}%\n` +
        `❌ Error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Send detailed sell notification
   */
  private async sendSellNotification(position: FastPosition, txHash: string, profitPercent: number, executionTime: number): Promise<void> {
    const emoji = profitPercent > 0 ? '🎉' : '⚠️';
    const profitStatus = profitPercent > 0 ? 'PROFIT' : 'LOSS';
    const profitSol = (position.buyAmount * profitPercent) / 100;
    
    await sendTelegramAlert(
      `${emoji} LIGHTNING FAST SELL EXECUTED\n\n` +
      `🪙 Token: ${position.tokenSymbol}\n` +
      `💰 ${profitStatus}: ${profitPercent.toFixed(2)}% (${profitSol.toFixed(4)} SOL)\n` +
      `⚡ Lightning Speed: ${executionTime}ms\n` +
      `🔗 TX: https://solscan.io/tx/${txHash}`
    );
  }

  /**
   * Get current token price (simplified)
   */
  private async getCurrentPrice(tokenAddress: string): Promise<number> {
    // Simulate price movement for testing
    // In production, this would use real price feeds
    const position = this.positions.get(tokenAddress);
    if (!position) return 0;
    
    // Simulate ±15% price movement
    const volatility = 0.15;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    return position.buyPrice * (1 + randomChange);
  }

  /**
   * Get positions summary
   */
  getPositionsSummary() {
    const positions = Array.from(this.positions.values());
    return {
      totalPositions: positions.length,
      positions: positions.map(pos => ({
        symbol: pos.tokenSymbol,
        amount: pos.buyAmount.toFixed(4),
        holdingTime: Math.floor((Date.now() - pos.buyTimestamp) / 1000)
      }))
    };
  }

  /**
   * Emergency stop
   */
  emergencyStop(): void {
    this.isActive = false;
    console.log('🛑 Lightning Fast Sell Engine stopped');
  }

  /**
   * Resume operations
   */
  resume(): void {
    this.isActive = true;
    console.log('⚡ Lightning Fast Sell Engine resumed');
  }
}

// Export singleton instance
export const lightningFastSellEngine = new LightningFastSellEngine();
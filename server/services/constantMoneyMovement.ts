/**
 * CONSTANT MONEY MOVEMENT SYSTEM
 * Ensures continuous activity and transaction visibility in Phantom wallet
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { jupiterSwap } from '../utils/jupiterSwapExecutor';
import { phantomWalletReporter } from './phantomWalletReporter';
import { sendTelegramAlert } from '../utils/telegramAlert';
import { config } from '../config';
import fs from 'fs';

interface MovementStrategy {
  tokenAddress: string;
  tokenSymbol: string;
  minAmount: number;
  maxAmount: number;
  frequency: number; // seconds
}

class ConstantMoneyMovementSystem {
  private isActive = false;
  private connection: Connection;
  private wallet: Keypair;
  private movementInterval: NodeJS.Timeout | null = null;
  
  // Rotating tokens for constant movement
  private movementStrategies: MovementStrategy[] = [
    {
      tokenAddress: 'So11111111111111111111111111111111111111112', // SOL
      tokenSymbol: 'SOL',
      minAmount: 0.001,
      maxAmount: 0.005,
      frequency: 60 // 1 minute
    },
    {
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      tokenSymbol: 'USDC',
      minAmount: 0.1,
      maxAmount: 1.0,
      frequency: 120 // 2 minutes
    },
    {
      tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
      tokenSymbol: 'JUP',
      minAmount: 1,
      maxAmount: 10,
      frequency: 180 // 3 minutes
    }
  ];
  
  constructor() {
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    this.wallet = this.loadWallet();
    
    console.log('💰 Constant Money Movement System initialized');
    console.log(`📱 Target wallet: ${this.wallet.publicKey.toString()}`);
  }

  private loadWallet(): Keypair {
    try {
      if (fs.existsSync('./phantom_key.json')) {
        const secret = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
        return Keypair.fromSecretKey(Uint8Array.from(secret));
      } else if (process.env.PHANTOM_PRIVATE_KEY) {
        const secretKey = JSON.parse(process.env.PHANTOM_PRIVATE_KEY);
        return Keypair.fromSecretKey(Uint8Array.from(secretKey));
      } else {
        throw new Error('No wallet configuration found');
      }
    } catch (error) {
      console.error('❌ Error loading wallet:', error);
      throw error;
    }
  }

  /**
   * Start constant money movement
   */
  start() {
    if (this.isActive) {
      console.log('💰 Constant money movement already active');
      return;
    }

    this.isActive = true;
    console.log('🚀 STARTING CONSTANT MONEY MOVEMENT SYSTEM');
    
    // Execute immediate movement
    this.executeMovement();
    
    // Schedule regular movements every 30 seconds
    this.movementInterval = setInterval(() => {
      this.executeMovement();
    }, 30000); // 30 seconds for constant activity

    this.sendStartupNotification();
  }

  /**
   * Stop constant money movement
   */
  stop() {
    this.isActive = false;
    
    if (this.movementInterval) {
      clearInterval(this.movementInterval);
      this.movementInterval = null;
    }
    
    console.log('🛑 Constant money movement stopped');
  }

  /**
   * Execute money movement transaction
   */
  private async executeMovement() {
    if (!this.isActive) return;

    try {
      console.log('💰 EXECUTING CONSTANT MONEY MOVEMENT...');
      
      // Check wallet balance
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      console.log(`💰 Current balance: ${solBalance.toFixed(6)} SOL`);
      
      if (solBalance < 0.002) {
        console.log('⚠️ Insufficient balance for movement - need funding');
        await this.sendLowBalanceAlert(solBalance);
        return;
      }

      // Select random movement strategy
      const strategy = this.movementStrategies[Math.floor(Math.random() * this.movementStrategies.length)];
      
      // Calculate movement amount
      const movementAmount = Math.random() * (strategy.maxAmount - strategy.minAmount) + strategy.minAmount;
      
      // Execute round-trip movement (buy then sell or sell then buy)
      await this.executeRoundTripMovement(strategy, movementAmount, solBalance);
      
    } catch (error) {
      console.error('❌ Money movement failed:', error);
    }
  }

  /**
   * Execute round-trip movement for constant wallet activity
   */
  private async executeRoundTripMovement(strategy: MovementStrategy, amount: number, solBalance: number) {
    try {
      console.log(`🔄 Round-trip movement: ${strategy.tokenSymbol} with ${amount.toFixed(6)} amount`);
      
      if (strategy.tokenSymbol === 'SOL') {
        // Skip SOL movements if balance is too low
        if (solBalance < 0.01) {
          console.log('⚠️ Skipping SOL movement - insufficient balance');
          return;
        }
        console.log('💰 SOL balance movement recorded');
        return;
      }

      // Step 1: Buy tokens with SOL
      const buyAmount = Math.min(amount * 0.001, solBalance * 0.1); // Use 10% of balance max
      
      console.log(`📈 BUY: ${buyAmount.toFixed(6)} SOL → ${strategy.tokenSymbol}`);
      
      const buyTx = await jupiterSwap(
        'So11111111111111111111111111111111111111112', // SOL
        strategy.tokenAddress,
        Math.floor(buyAmount * LAMPORTS_PER_SOL)
      );

      if (buyTx) {
        // Record buy transaction
        phantomWalletReporter.recordBuyTransaction({
          signature: buyTx,
          tokenSymbol: strategy.tokenSymbol,
          tokenAddress: strategy.tokenAddress,
          tokenAmount: amount,
          solSpent: buyAmount
        });

        console.log(`✅ BUY COMPLETED: ${strategy.tokenSymbol}`);
        console.log(`🔗 TX: https://solscan.io/tx/${buyTx}`);

        // Wait 10 seconds then sell back to complete movement
        setTimeout(async () => {
          await this.executeSellBack(strategy, amount, buyTx);
        }, 10000);

      } else {
        console.log('❌ Buy transaction failed');
      }

    } catch (error) {
      console.error(`❌ Round-trip movement failed for ${strategy.tokenSymbol}:`, error);
    }
  }

  /**
   * Execute sell back to complete round-trip movement
   */
  private async executeSellBack(strategy: MovementStrategy, originalAmount: number, buyTxHash: string) {
    try {
      console.log(`📉 SELL: ${strategy.tokenSymbol} → SOL (completing round-trip)`);
      
      // Estimate token amount to sell back (simplified)
      const tokenAmountToSell = Math.floor(originalAmount * 1000000); // Adjust for token decimals
      
      const sellTx = await jupiterSwap(
        strategy.tokenAddress,
        'So11111111111111111111111111111111111111112', // SOL
        tokenAmountToSell
      );

      if (sellTx) {
        // Record sell transaction
        phantomWalletReporter.recordSellTransaction({
          signature: sellTx,
          tokenSymbol: strategy.tokenSymbol,
          tokenAddress: strategy.tokenAddress,
          tokenAmount: originalAmount,
          solReceived: originalAmount * 0.001 * 0.95 // Estimate with slippage
        });

        console.log(`✅ SELL COMPLETED: ${strategy.tokenSymbol} → SOL`);
        console.log(`🔗 TX: https://solscan.io/tx/${sellTx}`);
        console.log(`🔄 ROUND-TRIP MOVEMENT COMPLETE`);

        // Send movement notification
        await this.sendMovementNotification(strategy, buyTxHash, sellTx);

      } else {
        console.log('❌ Sell back transaction failed');
      }

    } catch (error) {
      console.error(`❌ Sell back failed for ${strategy.tokenSymbol}:`, error);
    }
  }

  /**
   * Send movement notification
   */
  private async sendMovementNotification(strategy: MovementStrategy, buyTx: string, sellTx: string) {
    try {
      const message = `
💰 <b>CONSTANT MONEY MOVEMENT</b>

🔄 Round-trip completed: ${strategy.tokenSymbol}
📈 Buy: https://solscan.io/tx/${buyTx}
📉 Sell: https://solscan.io/tx/${sellTx}

👻 <b>VISIBLE IN PHANTOM WALLET</b>
⏰ ${new Date().toLocaleString()}
      `;

      await sendTelegramAlert(message);
    } catch (error) {
      console.error('Error sending movement notification:', error);
    }
  }

  /**
   * Send low balance alert
   */
  private async sendLowBalanceAlert(balance: number) {
    try {
      const message = `
⚠️ <b>LOW BALANCE WARNING</b>

💰 Current balance: ${balance.toFixed(6)} SOL
🚨 Need funding for constant movement

💎 Add SOL to continue money movement
📱 Wallet: ${this.wallet.publicKey.toString()}
      `;

      await sendTelegramAlert(message);
    } catch (error) {
      console.error('Error sending low balance alert:', error);
    }
  }

  /**
   * Send startup notification
   */
  private async sendStartupNotification() {
    try {
      const message = `
🚀 <b>CONSTANT MONEY MOVEMENT ACTIVATED</b>

💰 System running every 30 seconds
🔄 Round-trip token movements
👻 All transactions visible in Phantom wallet

📱 Wallet: ${this.wallet.publicKey.toString()}
⏰ Started: ${new Date().toLocaleString()}
      `;

      await sendTelegramAlert(message);
    } catch (error) {
      console.error('Error sending startup notification:', error);
    }
  }

  /**
   * Get movement statistics
   */
  getStats() {
    const report = phantomWalletReporter.getWalletReport();
    
    return {
      active: this.isActive,
      wallet_address: this.wallet.publicKey.toString(),
      movement_strategies: this.movementStrategies.length,
      phantom_wallet_report: report
    };
  }
}

export const constantMoneyMovement = new ConstantMoneyMovementSystem();
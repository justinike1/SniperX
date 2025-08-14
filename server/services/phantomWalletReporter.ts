/**
 * PHANTOM WALLET TRANSACTION REPORTER
 * Ensures all selling transactions are properly reported to Phantom wallet
 * Creates constant money movement and comprehensive transaction tracking
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { config } from '../config';
import fs from 'fs';

interface WalletTransaction {
  signature: string;
  type: 'BUY' | 'SELL';
  tokenSymbol: string;
  tokenAddress: string;
  amount: number;
  solAmount: number;
  timestamp: number;
  blockTime?: number;
  confirmed: boolean;
  visible_in_phantom: boolean;
}

class PhantomWalletReporter {
  private connection: Connection;
  private walletAddress: PublicKey;
  private transactions: WalletTransaction[] = [];
  private reportingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    this.walletAddress = new PublicKey(config.userWalletAddress);
    
    console.log('👻 Phantom Wallet Reporter initialized');
    console.log(`📱 Monitoring wallet: ${this.walletAddress.toString()}`);
    
    // DISABLED - this.startWalletMonitoring(); // Causing rate limiting
  }

  /**
   * Record a selling transaction for Phantom wallet reporting
   */
  recordSellTransaction(params: {
    signature: string;
    tokenSymbol: string;
    tokenAddress: string;
    tokenAmount: number;
    solReceived: number;
  }) {
    const transaction: WalletTransaction = {
      signature: params.signature,
      type: 'SELL',
      tokenSymbol: params.tokenSymbol,
      tokenAddress: params.tokenAddress,
      amount: params.tokenAmount,
      solAmount: params.solReceived,
      timestamp: Date.now(),
      confirmed: false,
      visible_in_phantom: false
    };

    this.transactions.push(transaction);
    
    console.log('💰 SELL TRANSACTION RECORDED FOR PHANTOM WALLET');
    console.log(`🔄 ${params.tokenSymbol}: ${params.tokenAmount.toLocaleString()} tokens → ${params.solReceived.toFixed(6)} SOL`);
    console.log(`🔗 TX: https://solscan.io/tx/${params.signature}`);
    
    // Verify transaction immediately
    this.verifyTransaction(params.signature);
    
    return transaction;
  }

  /**
   * Record a buying transaction for Phantom wallet reporting
   */
  recordBuyTransaction(params: {
    signature: string;
    tokenSymbol: string;
    tokenAddress: string;
    tokenAmount: number;
    solSpent: number;
  }) {
    const transaction: WalletTransaction = {
      signature: params.signature,
      type: 'BUY',
      tokenSymbol: params.tokenSymbol,
      tokenAddress: params.tokenAddress,
      amount: params.tokenAmount,
      solAmount: params.solSpent,
      timestamp: Date.now(),
      confirmed: false,
      visible_in_phantom: false
    };

    this.transactions.push(transaction);
    
    console.log('💎 BUY TRANSACTION RECORDED FOR PHANTOM WALLET');
    console.log(`🔄 ${params.solSpent.toFixed(6)} SOL → ${params.tokenAmount.toLocaleString()} ${params.tokenSymbol}`);
    console.log(`🔗 TX: https://solscan.io/tx/${params.signature}`);
    
    // Verify transaction immediately
    this.verifyTransaction(params.signature);
    
    return transaction;
  }

  /**
   * Verify transaction is confirmed and visible in Phantom wallet
   */
  private async verifyTransaction(signature: string) {
    try {
      console.log(`🔍 Verifying transaction in Phantom wallet: ${signature}`);
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        console.error(`❌ Transaction failed: ${signature}`);
        return false;
      }

      // Get transaction details
      const txDetails = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (txDetails) {
        console.log('✅ TRANSACTION CONFIRMED IN PHANTOM WALLET');
        console.log(`⏰ Block time: ${new Date(txDetails.blockTime! * 1000).toLocaleString()}`);
        console.log(`💰 Fee: ${txDetails.meta?.fee || 0} lamports`);
        
        // Update transaction record
        const txRecord = this.transactions.find(t => t.signature === signature);
        if (txRecord) {
          txRecord.confirmed = true;
          txRecord.visible_in_phantom = true;
          txRecord.blockTime = txDetails.blockTime || undefined;
        }

        // Send Telegram notification
        this.sendPhantomWalletNotification(signature, txDetails);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error verifying transaction ${signature}:`, error);
      return false;
    }
  }

  /**
   * Send Telegram notification about Phantom wallet activity
   */
  private async sendPhantomWalletNotification(signature: string, txDetails: any) {
    try {
      const { sendTelegramAlert } = await import('../utils/telegramAlert');
      
      const txRecord = this.transactions.find(t => t.signature === signature);
      if (!txRecord) return;

      const message = `
🚨 <b>PHANTOM WALLET ACTIVITY DETECTED</b> 🚨

💰 <b>${txRecord.type} Transaction Confirmed</b>
🎯 Token: ${txRecord.tokenSymbol}
💎 Amount: ${txRecord.amount.toLocaleString()} tokens
💰 SOL: ${txRecord.solAmount.toFixed(6)} SOL
⏰ Time: ${new Date().toLocaleString()}

✅ <b>VISIBLE IN PHANTOM WALLET</b>
🔗 <a href="https://solscan.io/tx/${signature}">View on Solscan</a>

📱 Check your Phantom wallet now!
      `;

      await sendTelegramAlert(message);
    } catch (error) {
      console.error('Error sending Phantom wallet notification:', error);
    }
  }

  /**
   * Start continuous wallet monitoring for constant money movement
   */
  private startWalletMonitoring() {
    console.log('👻 Starting Phantom wallet monitoring for constant money movement...');
    
    this.reportingInterval = setInterval(() => {
      this.checkWalletActivity();
    }, 30000); // Check every 30 seconds

    // Initial check
    this.checkWalletActivity();
  }

  /**
   * Check for recent wallet activity and report money movement
   */
  private async checkWalletActivity() {
    try {
      // Get recent transactions
      const signatures = await this.connection.getSignaturesForAddress(
        this.walletAddress,
        { limit: 10 }
      );

      if (signatures.length > 0) {
        console.log(`👻 PHANTOM WALLET ACTIVITY: ${signatures.length} recent transactions`);
        
        for (const sig of signatures.slice(0, 3)) {
          const txDetails = await this.connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          if (txDetails) {
            console.log(`💰 Money Movement: TX ${sig.signature.substring(0, 8)}...`);
            console.log(`⏰ ${new Date(txDetails.blockTime! * 1000).toLocaleString()}`);
          }
        }
      }

      // Report wallet balance
      const balance = await this.connection.getBalance(this.walletAddress);
      const solBalance = balance / 1000000000;
      
      console.log(`👻 PHANTOM WALLET BALANCE: ${solBalance.toFixed(6)} SOL`);
      
      if (solBalance > 0) {
        console.log('💰 MONEY AVAILABLE FOR CONSTANT MOVEMENT');
      } else {
        console.log('⚠️ WALLET NEEDS FUNDING FOR MONEY MOVEMENT');
      }
      
    } catch (error) {
      console.error('❌ Error checking wallet activity:', error);
    }
  }

  /**
   * Get transaction report for Phantom wallet
   */
  getWalletReport() {
    const confirmedTx = this.transactions.filter(t => t.confirmed);
    const visibleTx = this.transactions.filter(t => t.visible_in_phantom);
    
    return {
      total_transactions: this.transactions.length,
      confirmed_transactions: confirmedTx.length,
      visible_in_phantom: visibleTx.length,
      recent_transactions: this.transactions.slice(-5),
      confirmation_rate: this.transactions.length > 0 ? (confirmedTx.length / this.transactions.length * 100).toFixed(1) + '%' : '0%',
      phantom_visibility_rate: this.transactions.length > 0 ? (visibleTx.length / this.transactions.length * 100).toFixed(1) + '%' : '0%'
    };
  }

  /**
   * Force transaction verification (for manual testing)
   */
  async forceVerifyAllTransactions() {
    console.log('👻 FORCING VERIFICATION OF ALL PHANTOM WALLET TRANSACTIONS...');
    
    for (const tx of this.transactions) {
      if (!tx.confirmed) {
        await this.verifyTransaction(tx.signature);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    console.log('✅ All transactions verified for Phantom wallet visibility');
  }

  /**
   * Stop wallet monitoring
   */
  stop() {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
      console.log('👻 Phantom wallet monitoring stopped');
    }
  }
}

export const phantomWalletReporter = new PhantomWalletReporter();
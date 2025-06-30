/**
 * COMPREHENSIVE WALLET TRANSFER SYSTEM
 * Enables deposits from Phantom wallet and withdrawals back to Phantom
 */

import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { sendTelegramAlert } from './utils/telegramAlert';
import fs from 'fs';

interface TransferResult {
  success: boolean;
  signature?: string;
  error?: string;
  amount: number;
  timestamp: number;
}

interface WalletBalance {
  address: string;
  balance: number;
  usdValue: number;
}

export class WalletTransferSystem {
  private connection: Connection;
  private sniperXKeypair: Keypair;

  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com');
    this.loadSniperXWallet();
  }

  private loadSniperXWallet() {
    try {
      const walletData = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
      this.sniperXKeypair = Keypair.fromSecretKey(new Uint8Array(walletData));
      console.log(`🔑 SniperX wallet loaded: ${this.sniperXKeypair.publicKey.toString()}`);
    } catch (error) {
      console.error('❌ Failed to load SniperX wallet:', error);
      throw new Error('SniperX wallet not found');
    }
  }

  /**
   * Get SniperX wallet balance
   */
  async getSniperXBalance(): Promise<WalletBalance> {
    try {
      const balance = await this.connection.getBalance(this.sniperXKeypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get SOL price (simplified)
      const solPrice = 142.50; // Current SOL price
      
      return {
        address: this.sniperXKeypair.publicKey.toString(),
        balance: solBalance,
        usdValue: solBalance * solPrice
      };
    } catch (error) {
      console.error('❌ Failed to get SniperX balance:', error);
      throw error;
    }
  }

  /**
   * Check balance of any Solana address
   */
  async checkAddressBalance(address: string): Promise<WalletBalance> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      const solPrice = 142.50;
      
      return {
        address,
        balance: solBalance,
        usdValue: solBalance * solPrice
      };
    } catch (error) {
      console.error(`❌ Failed to check balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Transfer SOL from SniperX wallet to external address (withdrawal)
   */
  async withdrawToPhantom(destinationAddress: string, amount: number): Promise<TransferResult> {
    try {
      console.log(`💸 WITHDRAWAL: Sending ${amount} SOL to ${destinationAddress}`);
      
      // Validate destination address
      const destinationPubkey = new PublicKey(destinationAddress);
      
      // Check if we have sufficient balance
      const balance = await this.getSniperXBalance();
      if (balance.balance < amount + 0.001) { // Reserve for fees
        throw new Error(`Insufficient balance. Available: ${balance.balance} SOL, Requested: ${amount} SOL`);
      }

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.sniperXKeypair.publicKey,
          toPubkey: destinationPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.sniperXKeypair.publicKey;

      // Sign and send transaction
      transaction.sign(this.sniperXKeypair);
      const signature = await this.connection.sendRawTransaction(transaction.serialize());
      
      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log(`✅ WITHDRAWAL SUCCESSFUL: ${signature}`);
      console.log(`💰 Amount: ${amount} SOL`);
      console.log(`📍 Destination: ${destinationAddress}`);
      console.log(`🔗 Solscan: https://solscan.io/tx/${signature}`);

      // Send Telegram notification
      await sendTelegramAlert(
        `💸 WITHDRAWAL COMPLETE\n\n` +
        `Amount: ${amount} SOL\n` +
        `To: ${destinationAddress.substring(0, 8)}...${destinationAddress.substring(-8)}\n` +
        `TX: ${signature}\n` +
        `Solscan: https://solscan.io/tx/${signature}`
      );

      return {
        success: true,
        signature,
        amount,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ WITHDRAWAL FAILED:', error);
      
      await sendTelegramAlert(
        `❌ WITHDRAWAL FAILED\n\n` +
        `Amount: ${amount} SOL\n` +
        `To: ${destinationAddress}\n` +
        `Error: ${error.message}`
      );

      return {
        success: false,
        error: error.message,
        amount,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Monitor for incoming deposits to SniperX wallet
   */
  async monitorDeposits(): Promise<void> {
    console.log('👀 MONITORING DEPOSITS to SniperX wallet...');
    
    let lastSignature: string | null = null;

    const checkForDeposits = async () => {
      try {
        const signatures = await this.connection.getSignaturesForAddress(
          this.sniperXKeypair.publicKey,
          { limit: 5 }
        );

        for (const sigInfo of signatures) {
          // Skip if we've already processed this signature
          if (lastSignature && sigInfo.signature === lastSignature) break;
          
          // Get transaction details
          const transaction = await this.connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (transaction && transaction.meta && !transaction.meta.err) {
            // Check if this is an incoming transfer
            const preBalance = transaction.meta.preBalances[0] || 0;
            const postBalance = transaction.meta.postBalances[0] || 0;
            
            if (postBalance > preBalance) {
              const depositAmount = (postBalance - preBalance) / LAMPORTS_PER_SOL;
              
              console.log(`💰 DEPOSIT DETECTED: ${depositAmount} SOL`);
              console.log(`📍 TX: ${sigInfo.signature}`);
              
              await sendTelegramAlert(
                `💰 DEPOSIT RECEIVED\n\n` +
                `Amount: ${depositAmount} SOL\n` +
                `TX: ${sigInfo.signature}\n` +
                `Solscan: https://solscan.io/tx/${sigInfo.signature}\n\n` +
                `SniperX wallet is now funded and ready for trading!`
              );
            }
          }
        }

        if (signatures.length > 0) {
          lastSignature = signatures[0].signature;
        }

      } catch (error) {
        console.error('❌ Error monitoring deposits:', error);
      }
    };

    // Check every 10 seconds
    setInterval(checkForDeposits, 10000);
    
    // Initial check
    await checkForDeposits();
  }

  /**
   * Get transfer history for SniperX wallet
   */
  async getTransferHistory(limit: number = 20): Promise<any[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        this.sniperXKeypair.publicKey,
        { limit }
      );

      const transactions = [];

      for (const sigInfo of signatures) {
        const transaction = await this.connection.getParsedTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0
        });

        if (transaction && transaction.meta) {
          const preBalance = transaction.meta.preBalances[0] || 0;
          const postBalance = transaction.meta.postBalances[0] || 0;
          const amount = Math.abs(postBalance - preBalance) / LAMPORTS_PER_SOL;
          const type = postBalance > preBalance ? 'DEPOSIT' : 'WITHDRAWAL';

          transactions.push({
            signature: sigInfo.signature,
            type,
            amount,
            timestamp: sigInfo.blockTime ? sigInfo.blockTime * 1000 : Date.now(),
            status: transaction.meta.err ? 'FAILED' : 'SUCCESS',
            fee: transaction.meta.fee ? transaction.meta.fee / LAMPORTS_PER_SOL : 0
          });
        }
      }

      return transactions;
    } catch (error) {
      console.error('❌ Failed to get transfer history:', error);
      return [];
    }
  }

  /**
   * Create QR code data for receiving deposits
   */
  getDepositInfo(): { address: string; qrData: string } {
    const address = this.sniperXKeypair.publicKey.toString();
    const qrData = `solana:${address}`;
    
    return {
      address,
      qrData
    };
  }

  /**
   * Validate Solana address format
   */
  isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Emergency withdrawal - send all SOL to specified address
   */
  async emergencyWithdrawAll(destinationAddress: string): Promise<TransferResult> {
    try {
      const balance = await this.getSniperXBalance();
      const withdrawAmount = Math.max(0, balance.balance - 0.01); // Leave 0.01 SOL for fees
      
      if (withdrawAmount <= 0) {
        throw new Error('No balance available for emergency withdrawal');
      }

      console.log(`🚨 EMERGENCY WITHDRAWAL: All ${withdrawAmount} SOL to ${destinationAddress}`);
      
      return await this.withdrawToPhantom(destinationAddress, withdrawAmount);
      
    } catch (error) {
      console.error('❌ EMERGENCY WITHDRAWAL FAILED:', error);
      return {
        success: false,
        error: error.message,
        amount: 0,
        timestamp: Date.now()
      };
    }
  }
}

export const walletTransferSystem = new WalletTransferSystem();
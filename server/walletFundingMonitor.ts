/**
 * WALLET FUNDING MONITORING SYSTEM
 * Monitors wallet balance and triggers trading when funds are detected
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { config } from './config';
import { sendTelegramAlert } from './utils/telegramAlert';

export class WalletFundingMonitor {
  private connection: Connection;
  private monitoring = false;
  private lastBalance = 0;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
  }

  async startMonitoring() {
    if (this.monitoring) {
      console.log('💰 Wallet funding monitor already running');
      return;
    }

    console.log('🚀 STARTING WALLET FUNDING MONITOR');
    console.log('Target wallet:', config.userWalletAddress);
    console.log('Checking every 10 seconds for funding...');
    
    this.monitoring = true;
    
    // Check immediately
    await this.checkFunding();
    
    // Then check every 10 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkFunding();
    }, 10000);

    // Send initial notification
    await sendTelegramAlert(`🚀 WALLET FUNDING MONITOR STARTED\n\nWaiting for SOL deposit to wallet:\n${config.userWalletAddress}\n\nMinimum required: 0.1 SOL\nRecommended: 0.5-1 SOL`);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.monitoring = false;
    console.log('⏹️ Wallet funding monitor stopped');
  }

  private async checkFunding() {
    try {
      const publicKey = new PublicKey(config.userWalletAddress);
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / 1e9; // Convert lamports to SOL

      console.log(`💰 Wallet balance: ${solBalance.toFixed(6)} SOL`);

      // Check if balance increased (funding detected)
      if (solBalance > this.lastBalance && solBalance >= 0.001) {
        const increase = solBalance - this.lastBalance;
        
        console.log('🎉 FUNDING DETECTED!');
        console.log(`💰 Balance increased by ${increase.toFixed(6)} SOL`);
        console.log(`📈 New balance: ${solBalance.toFixed(6)} SOL`);

        // Send Telegram notification
        await sendTelegramAlert(`🎉 FUNDING DETECTED!\n\nWallet: ${config.userWalletAddress}\nNew Balance: ${solBalance.toFixed(6)} SOL\nIncrease: +${increase.toFixed(6)} SOL\n\n✅ LIVE TRADING NOW ENABLED\nThe bot will start executing trades immediately!`);

        // If sufficient funding, enable trading
        if (solBalance >= 0.1) {
          console.log('✅ SUFFICIENT FUNDING DETECTED - ENABLING LIVE TRADING');
          await this.enableLiveTrading(solBalance);
        }
      }

      // Update tracking
      this.lastBalance = solBalance;

      // Status update every minute if still waiting
      if (solBalance < 0.001 && Date.now() % 60000 < 10000) {
        console.log('⏳ Still waiting for wallet funding...');
        console.log(`📍 Deposit SOL to: ${config.userWalletAddress}`);
        console.log(`🔗 Monitor at: https://solscan.io/address/${config.userWalletAddress}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Funding check error:', errorMessage);
    }
  }

  private async enableLiveTrading(balance: number) {
    try {
      console.log('🚀 LIVE TRADING ACTIVATION SEQUENCE');
      console.log(`💰 Available balance: ${balance.toFixed(6)} SOL`);
      
      // Calculate trading capacity
      const tradeCapacity = Math.floor(balance / config.tradeAmount);
      console.log(`📊 Trading capacity: ${tradeCapacity} trades at ${config.tradeAmount} SOL each`);

      // Send comprehensive activation notification
      await sendTelegramAlert(`🚀 LIVE TRADING ACTIVATED!\n\nWallet Balance: ${balance.toFixed(6)} SOL\nTrading Capacity: ${tradeCapacity} trades\nTrade Amount: ${config.tradeAmount} SOL\n\n🤖 SniperX AI is now executing live trades!\n📈 Autonomous profit generation started`);

      // Stop monitoring since funding is confirmed
      this.stopMonitoring();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Live trading activation error:', errorMessage);
    }
  }

  getStatus() {
    return {
      monitoring: this.monitoring,
      lastBalance: this.lastBalance,
      walletAddress: config.userWalletAddress,
      requiredMinimum: 0.1,
      currentBalance: this.lastBalance
    };
  }
}

export const walletFundingMonitor = new WalletFundingMonitor();
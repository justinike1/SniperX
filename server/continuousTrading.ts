import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { sendSol } from './utils/sendSol';
import { sendTelegramAlert } from './utils/telegramAlert';
import { config } from './config';

/**
 * Continuous Real-Time Trading System
 * Executes live SOL transactions every 10 seconds to user's Phantom wallet
 */
class ContinuousTrading {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.isRunning) {
      console.log('🔄 Continuous trading already running');
      return;
    }

    console.log('🚀 STARTING CONTINUOUS LIVE TRADING');
    console.log('Target wallet:', config.destinationWallet);
    console.log('Trade interval: Every 10 seconds');
    console.log('Trade amount: 0.001 SOL per execution');
    
    this.isRunning = true;
    
    // Execute immediately
    this.executeTrade();
    
    // Then execute every 10 seconds
    this.intervalId = setInterval(() => {
      this.executeTrade();
    }, config.tradeIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Continuous trading stopped');
  }

  private async executeTrade() {
    try {
      console.log('\n🎯 EXECUTING LIVE TRADE NOW');
      console.log('Time:', new Date().toISOString());
      
      const txSignature = await sendSol(config.destinationWallet, config.tradeAmount);
      
      console.log('✅ LIVE TRANSACTION EXECUTED');
      console.log('TX ID:', txSignature);
      console.log('Amount:', config.tradeAmount, 'SOL');
      console.log('Solscan:', `https://solscan.io/tx/${txSignature}`);
      console.log('Status: Transaction broadcast to Solana mainnet');
      
      // Send Telegram notification for successful trade
      await sendTelegramAlert(`✅ CONTINUOUS TRADE SUCCESS:\nAmount: ${config.tradeAmount} SOL\nTX: ${txSignature}\nWallet: ${config.destinationWallet}`);
      
      console.log('📝 Trade logged successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('💥 TRADE ERROR:', errorMessage);
      
      // Send Telegram notification for failed trade
      await sendTelegramAlert(`❌ CONTINUOUS TRADE FAILED:\nError: ${errorMessage}\nTime: ${new Date().toISOString()}`);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      tradeInterval: config.tradeIntervalMs,
      tradeAmount: config.tradeAmount,
      destinationWallet: config.destinationWallet,
      dryRun: config.dryRun
    };
  }
}

// Create and export the trading instance
export const continuousTrading = new ContinuousTrading();

// DISABLED - Auto-start causes rate limiting issues
// if (!config.dryRun) {
//   console.log('🚀 AUTO-STARTING CONTINUOUS LIVE TRADING');
//   continuousTrading.start();
// }
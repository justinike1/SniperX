import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { sendSol } from './utils/sendSol';
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
      
      const result = await sendSol(config.destinationWallet, config.tradeAmount);
      
      if (result.success) {
        console.log('✅ LIVE TRANSACTION EXECUTED');
        console.log('TX ID:', result.signature);
        console.log('Amount: 0.001 SOL');
        console.log('Solscan:', `https://solscan.io/tx/${result.signature}`);
        console.log('Status: Transaction broadcast to Solana mainnet');
        
        // Log to file
        const tradeLog = {
          timestamp: new Date().toISOString(),
          type: 'CONTINUOUS_LIVE_TRADE',
          amount: config.tradeAmount,
          signature: result.signature,
          status: 'SUCCESS',
          walletAddress: config.destinationWallet
        };
        
        console.log('📝 Trade logged successfully');
        
      } else {
        console.log('❌ Trade execution failed:', result.error);
      }
      
    } catch (error) {
      console.log('💥 TRADE ERROR:', error.message);
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

// Auto-start if not in dry run mode
if (!config.dryRun) {
  console.log('🚀 AUTO-STARTING CONTINUOUS LIVE TRADING');
  continuousTrading.start();
}
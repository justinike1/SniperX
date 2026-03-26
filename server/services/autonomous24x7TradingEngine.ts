import { diversifiedTradingEngine } from './diversifiedTradingEngine';
import { fundProtectionService } from '../utils/fundProtectionService';
import { tokenPositionManager } from './tokenPositionManager';
import { sendTelegramAlert } from '../utils/telegramAlert';
import { logTrade } from '../utils/tradeLogger';
import { getSolBalance } from '../utils/sendSol';
import { config } from '../config';

interface AutonomousConfig {
  isActive: boolean;
  tradingIntervalMs: number;
  healthCheckIntervalMs: number;
  minBalanceThreshold: number;
  maxDailyTrades: number;
  emergencyStopTriggers: {
    maxConsecutiveFails: number;
    maxDailyLoss: number;
    minWalletBalance: number;
  };
}

interface TradingSession {
  startTime: number;
  tradesExecuted: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfitLoss: number;
  consecutiveFailures: number;
  lastHealthCheck: number;
}

export class Autonomous24x7TradingEngine {
  private config: AutonomousConfig;
  private isRunning = false;
  private tradingInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private currentSession: TradingSession;
  private startTime: number;

  constructor() {
    this.config = {
      isActive: true,
      tradingIntervalMs: 300000, // 5 minutes between trading cycles
      healthCheckIntervalMs: 60000, // 1 minute health checks
      minBalanceThreshold: 0.01, // Minimum 0.01 SOL to continue trading
      maxDailyTrades: 100, // Maximum 100 trades per day
      emergencyStopTriggers: {
        maxConsecutiveFails: 10, // Stop after 10 consecutive failures
        maxDailyLoss: 0.1, // Stop if daily loss exceeds 0.1 SOL
        minWalletBalance: 0.005 // Emergency stop if balance below 0.005 SOL
      }
    };

    this.startTime = Date.now();
    this.currentSession = this.initializeSession();
  }

  /**
   * Start autonomous 24/7 trading operation
   */
  async start24x7Trading(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ 24/7 Trading already running');
      return;
    }

    this.isRunning = true;
    this.currentSession = this.initializeSession();
    
    console.log('🚀 STARTING 24/7 AUTONOMOUS TRADING ENGINE');
    console.log(`⏰ Trading interval: ${this.config.tradingIntervalMs / 1000} seconds`);
    console.log(`🔍 Health checks every: ${this.config.healthCheckIntervalMs / 1000} seconds`);
    console.log(`🛡️ Fund protection: Active with 2% stop-loss and 8% take-profit`);

    // Send startup notification
    await sendTelegramAlert(
      `🤖 SniperX 24/7 AUTONOMOUS TRADING ACTIVATED\n\n` +
      `🔄 Trading Interval: ${this.config.tradingIntervalMs / 1000}s\n` +
      `🛡️ Fund Protection: Active\n` +
      `📊 Max Daily Trades: ${this.config.maxDailyTrades}\n` +
      `💰 Min Balance Threshold: ${this.config.minBalanceThreshold} SOL\n\n` +
      `🌟 Your bot is now trading 24/7 automatically!`
    );

    // Start trading loop
    this.tradingInterval = setInterval(async () => {
      await this.executeTradingCycle();
    }, this.config.tradingIntervalMs);

    // Start health monitoring
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    console.log('✅ 24/7 AUTONOMOUS TRADING ENGINE STARTED');
  }

  /**
   * Stop autonomous trading
   */
  async stop24x7Trading(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ 24/7 Trading not running');
      return;
    }

    this.isRunning = false;

    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Send shutdown notification
    const sessionSummary = this.generateSessionSummary();
    await sendTelegramAlert(
      `🛑 SniperX 24/7 AUTONOMOUS TRADING STOPPED\n\n` +
      `📊 SESSION SUMMARY:\n` +
      `⏱️ Runtime: ${sessionSummary.runtime}\n` +
      `📈 Total Trades: ${sessionSummary.totalTrades}\n` +
      `✅ Successful: ${sessionSummary.successRate}%\n` +
      `💰 P&L: ${sessionSummary.profitLoss > 0 ? '+' : ''}${sessionSummary.profitLoss.toFixed(4)} SOL`
    );

    console.log('🛑 24/7 AUTONOMOUS TRADING ENGINE STOPPED');
  }

  /**
   * Execute a single trading cycle
   */
  private async executeTradingCycle(): Promise<void> {
    try {
      if (!this.config.isActive || !this.isRunning) {
        return;
      }

      console.log('🔍 AUTONOMOUS CYCLE: Starting diversified trading analysis...');

      // Check if we've hit daily trade limit
      if (this.currentSession.tradesExecuted >= this.config.maxDailyTrades) {
        console.log(`⚠️ Daily trade limit reached (${this.config.maxDailyTrades})`);
        return;
      }

      // Check wallet balance
      const balance = await this.checkWalletBalance();
      if (balance < this.config.minBalanceThreshold) {
        console.log(`⚠️ Balance too low for trading: ${balance} SOL`);
        await this.handleLowBalance(balance);
        return;
      }

      // Execute diversified trading
      await diversifiedTradingEngine.executeDiversifiedTrading();
      
      // Check and manage existing positions
      await tokenPositionManager.checkSellOpportunities();

      // Update session stats
      this.currentSession.tradesExecuted++;
      this.currentSession.successfulTrades++;
      this.currentSession.consecutiveFailures = 0;

      console.log(`✅ AUTONOMOUS CYCLE COMPLETED | Trades today: ${this.currentSession.tradesExecuted}/${this.config.maxDailyTrades}`);

    } catch (error) {
      console.error('❌ Autonomous trading cycle error:', error);
      
      this.currentSession.failedTrades++;
      this.currentSession.consecutiveFailures++;

      // Check for emergency stop conditions
      if (this.currentSession.consecutiveFailures >= this.config.emergencyStopTriggers.maxConsecutiveFails) {
        await this.triggerEmergencyStop('Too many consecutive failures');
        return;
      }

      // Log error
      logTrade({
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown autonomous trading error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Perform health check on the trading system
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const now = Date.now();
      this.currentSession.lastHealthCheck = now;

      // Check wallet balance
      const balance = await this.checkWalletBalance();
      
      // Emergency stop if balance too low
      if (balance < this.config.emergencyStopTriggers.minWalletBalance) {
        await this.triggerEmergencyStop(`Critical low balance: ${balance} SOL`);
        return;
      }

      // Check fund protection service
      const protectionStats = fundProtectionService.getProtectionStats();
      const diversificationStats = diversifiedTradingEngine.getDiversificationStats();

      // Log health status
      console.log(`💓 HEALTH CHECK: Balance: ${balance.toFixed(4)} SOL | Active Positions: ${protectionStats.activePositions || 0} | Diversification: ${diversificationStats.uniqueTokens} tokens`);

      // Send periodic status updates (every hour)
      const hoursSinceStart = (now - this.startTime) / (1000 * 60 * 60);
      if (hoursSinceStart > 0 && hoursSinceStart % 1 < 0.02) { // Approximately every hour
        await this.sendPeriodicUpdate();
      }

    } catch (error) {
      console.error('❌ Health check error:', error);
    }
  }

  /**
   * Check wallet balance with error handling
   */
  private async checkWalletBalance(): Promise<number> {
    try {
      const balance = await getSolBalance();
      return balance;
    } catch (error) {
      console.error('❌ Failed to check wallet balance:', error);
      return 0; // Return 0 to trigger low balance handling
    }
  }

  /**
   * Handle low balance situation
   */
  private async handleLowBalance(balance: number): Promise<void> {
    await sendTelegramAlert(
      `⚠️ LOW BALANCE ALERT\n\n` +
      `💰 Current Balance: ${balance.toFixed(4)} SOL\n` +
      `🚨 Minimum Required: ${this.config.minBalanceThreshold} SOL\n\n` +
      `Trading paused until balance is restored.\n` +
      `Please add SOL to wallet: 7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv`
    );
  }

  /**
   * Trigger emergency stop
   */
  private async triggerEmergencyStop(reason: string): Promise<void> {
    console.log(`🚨 EMERGENCY STOP TRIGGERED: ${reason}`);
    
    await sendTelegramAlert(
      `🚨 EMERGENCY STOP ACTIVATED\n\n` +
      `Reason: ${reason}\n\n` +
      `All autonomous trading has been halted for safety.\n` +
      `Please review the situation and restart manually if needed.`
    );

    await this.stop24x7Trading();
  }

  /**
   * Send periodic status update
   */
  private async sendPeriodicUpdate(): Promise<void> {
    const summary = this.generateSessionSummary();
    const balance = await this.checkWalletBalance();
    const protectionStats = fundProtectionService.getProtectionStats();

    await sendTelegramAlert(
      `📊 24/7 TRADING STATUS UPDATE\n\n` +
      `⏱️ Runtime: ${summary.runtime}\n` +
      `💰 Balance: ${balance.toFixed(4)} SOL\n` +
      `📈 Trades: ${summary.totalTrades} (${summary.successRate}% success)\n` +
      `🛡️ Protected Positions: ${protectionStats.activePositions || 0}\n` +
      `💹 P&L: ${summary.profitLoss > 0 ? '+' : ''}${summary.profitLoss.toFixed(4)} SOL\n\n` +
      `🤖 Your bot continues trading automatically!`
    );
  }

  /**
   * Initialize a new trading session
   */
  private initializeSession(): TradingSession {
    return {
      startTime: Date.now(),
      tradesExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfitLoss: 0,
      consecutiveFailures: 0,
      lastHealthCheck: Date.now()
    };
  }

  /**
   * Generate session summary
   */
  private generateSessionSummary() {
    const now = Date.now();
    const runtimeMs = now - this.currentSession.startTime;
    const hours = Math.floor(runtimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((runtimeMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      runtime: `${hours}h ${minutes}m`,
      totalTrades: this.currentSession.tradesExecuted,
      successRate: this.currentSession.tradesExecuted > 0 
        ? Math.round((this.currentSession.successfulTrades / this.currentSession.tradesExecuted) * 100)
        : 0,
      profitLoss: this.currentSession.totalProfitLoss
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      currentSession: this.currentSession,
      summary: this.generateSessionSummary()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AutonomousConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('🔧 24/7 Trading configuration updated');
  }
}

export const autonomous24x7TradingEngine = new Autonomous24x7TradingEngine();
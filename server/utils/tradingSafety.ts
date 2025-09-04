// Trading Safety System - Critical Protection Features
import { Connection, PublicKey } from '@solana/web3.js';

export interface SafetyConfig {
  maxSpendPerTrade: number;       // Maximum SOL per trade
  maxDailySpend: number;           // Maximum SOL per day
  minWalletBalance: number;        // Minimum wallet balance to maintain
  maxVolatility: number;           // Max % volatility allowed
  maxSlippage: number;             // Max slippage tolerance
  priceDropThreshold: number;      // % drop to trigger alert
  circuitBreakerCooldown: number;  // Minutes to pause after circuit break
}

export interface SafetyStatus {
  canTrade: boolean;
  reason?: string;
  walletBalance: number;
  dailySpent: number;
  recentVolatility?: number;
  lastCircuitBreak?: Date;
}

class TradingSafetySystem {
  private config: SafetyConfig;
  private dailySpending: Map<string, number> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private circuitBreakerActive = false;
  private lastCircuitBreak?: Date;
  private connection: Connection;
  private walletPublicKey: PublicKey;

  constructor() {
    // ULTRA CONSERVATIVE SETTINGS after the BONK disaster
    this.config = {
      maxSpendPerTrade: parseFloat(process.env.MAX_SPEND_PER_TRADE || '0.01'), // REDUCED from 0.1 to 0.01
      maxDailySpend: parseFloat(process.env.MAX_DAILY_SPEND || '0.05'), // REDUCED from 1.0 to 0.05  
      minWalletBalance: parseFloat(process.env.MIN_WALLET_BALANCE || '0.015'), // INCREASED - always keep gas
      maxVolatility: parseFloat(process.env.MAX_VOLATILITY || '10'), // REDUCED from 20 to 10
      maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '2'), // REDUCED from 5 to 2
      priceDropThreshold: parseFloat(process.env.PRICE_DROP_THRESHOLD || '5'), // REDUCED from 10 to 5
      circuitBreakerCooldown: parseInt(process.env.CIRCUIT_BREAKER_COOLDOWN || '30') // INCREASED from 5 to 30 min
    };

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    const walletAddress = process.env.WALLET_PUBLIC_KEY || '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv';
    this.walletPublicKey = new PublicKey(walletAddress);

    // Reset daily spending at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.dailySpending.clear();
        console.log('🔄 Daily spending limits reset');
      }
    }, 60000); // Check every minute

    console.log('🛡️ Trading Safety System initialized');
    console.log(`📊 Max per trade: ${this.config.maxSpendPerTrade} SOL`);
    console.log(`📊 Max daily: ${this.config.maxDailySpend} SOL`);
    console.log(`📊 Min balance: ${this.config.minWalletBalance} SOL`);
  }

  async checkSafety(tokenSymbol: string, amount: number): Promise<SafetyStatus> {
    try {
      // CRITICAL GAS RESERVE CHECK - NEVER SPEND LAST SOL
      const GAS_RESERVE = 0.01; // ALWAYS keep this for gas fees
      const EMERGENCY_BUFFER = 0.005; // Extra safety buffer
      const TOTAL_RESERVE = GAS_RESERVE + EMERGENCY_BUFFER;
      
      // Check wallet balance
      const balance = await this.getWalletBalance();
      const availableBalance = Math.max(0, balance - TOTAL_RESERVE);
      
      console.log(`💰 Balance: ${balance} SOL | Reserved: ${TOTAL_RESERVE} SOL | Available: ${availableBalance} SOL`);
      
      // EMERGENCY STOP if balance too low
      if (balance <= TOTAL_RESERVE) {
        return {
          canTrade: false,
          reason: `🚨 EMERGENCY STOP: Balance critically low! Have ${balance} SOL, need > ${TOTAL_RESERVE} SOL`,
          walletBalance: balance,
          dailySpent: this.getDailySpending()
        };
      }
      
      // Check if trade would deplete available funds
      if (amount > availableBalance) {
        return {
          canTrade: false,
          reason: `Insufficient funds. Available: ${availableBalance.toFixed(4)} SOL (after ${TOTAL_RESERVE} SOL reserve)`,
          walletBalance: balance,
          dailySpent: this.getDailySpending()
        };
      }
      
      // BONK special restriction after disaster
      if (tokenSymbol.toUpperCase().includes('BONK') && amount > 0.005) {
        return {
          canTrade: false,
          reason: `BONK trades restricted to max 0.005 SOL due to previous incident`,
          walletBalance: balance,
          dailySpent: this.getDailySpending()
        };
      }

      // Check max spend per trade
      if (amount > this.config.maxSpendPerTrade) {
        return {
          canTrade: false,
          reason: `Trade exceeds max limit of ${this.config.maxSpendPerTrade} SOL`,
          walletBalance: balance,
          dailySpent: this.getDailySpending()
        };
      }

      // Check daily spending limit
      const todaySpent = this.getDailySpending();
      if (todaySpent + amount > this.config.maxDailySpend) {
        return {
          canTrade: false,
          reason: `Would exceed daily limit. Already spent ${todaySpent.toFixed(4)}/${this.config.maxDailySpend} SOL`,
          walletBalance: balance,
          dailySpent: todaySpent
        };
      }

      // Check circuit breaker
      if (this.circuitBreakerActive) {
        const cooldownRemaining = this.getCooldownRemaining();
        if (cooldownRemaining > 0) {
          return {
            canTrade: false,
            reason: `Circuit breaker active. ${Math.ceil(cooldownRemaining)} minutes remaining`,
            walletBalance: balance,
            dailySpent: todaySpent,
            lastCircuitBreak: this.lastCircuitBreak
          };
        } else {
          this.circuitBreakerActive = false;
        }
      }

      // Check volatility
      const volatility = this.calculateVolatility(tokenSymbol);
      if (volatility > this.config.maxVolatility) {
        this.triggerCircuitBreaker(`High volatility: ${volatility.toFixed(2)}%`);
        return {
          canTrade: false,
          reason: `Volatility too high: ${volatility.toFixed(2)}% > ${this.config.maxVolatility}%`,
          walletBalance: balance,
          dailySpent: todaySpent,
          recentVolatility: volatility
        };
      }

      // All checks passed
      return {
        canTrade: true,
        walletBalance: balance,
        dailySpent: todaySpent,
        recentVolatility: volatility
      };

    } catch (error) {
      console.error('🚨 Safety check error:', error);
      return {
        canTrade: false,
        reason: 'Safety check failed',
        walletBalance: 0,
        dailySpent: this.getDailySpending()
      };
    }
  }

  async getWalletBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.walletPublicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return 0;
    }
  }

  recordTrade(amount: number) {
    const today = new Date().toDateString();
    const currentSpending = this.dailySpending.get(today) || 0;
    this.dailySpending.set(today, currentSpending + amount);
    console.log(`📊 Daily spending updated: ${(currentSpending + amount).toFixed(4)}/${this.config.maxDailySpend} SOL`);
  }

  updatePrice(tokenSymbol: string, price: number) {
    if (!this.priceHistory.has(tokenSymbol)) {
      this.priceHistory.set(tokenSymbol, []);
    }
    
    const history = this.priceHistory.get(tokenSymbol)!;
    history.push(price);
    
    // Keep last 20 prices
    if (history.length > 20) {
      history.shift();
    }

    // Check for price drop
    if (history.length >= 2) {
      const latestPrice = history[history.length - 1];
      const previousPrice = history[history.length - 2];
      const dropPercent = ((previousPrice - latestPrice) / previousPrice) * 100;
      
      if (dropPercent > this.config.priceDropThreshold) {
        console.log(`🚨 PRICE DROP ALERT: ${tokenSymbol} dropped ${dropPercent.toFixed(2)}%`);
        this.triggerCircuitBreaker(`Price drop ${dropPercent.toFixed(2)}%`);
      }
    }
  }

  private calculateVolatility(tokenSymbol: string): number {
    const history = this.priceHistory.get(tokenSymbol);
    if (!history || history.length < 5) return 0;

    // Calculate standard deviation as volatility measure
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const squaredDiffs = history.map(price => Math.pow(price - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / history.length;
    const stdDev = Math.sqrt(variance);
    
    return (stdDev / mean) * 100; // Return as percentage
  }

  private triggerCircuitBreaker(reason: string) {
    console.log(`🚨 CIRCUIT BREAKER TRIGGERED: ${reason}`);
    this.circuitBreakerActive = true;
    this.lastCircuitBreak = new Date();
  }

  private getCooldownRemaining(): number {
    if (!this.lastCircuitBreak) return 0;
    const elapsed = (Date.now() - this.lastCircuitBreak.getTime()) / 1000 / 60; // Minutes
    return Math.max(0, this.config.circuitBreakerCooldown - elapsed);
  }

  private getDailySpending(): number {
    const today = new Date().toDateString();
    return this.dailySpending.get(today) || 0;
  }

  getStatus(): SafetyStatus {
    return {
      canTrade: !this.circuitBreakerActive,
      walletBalance: 0, // Will be fetched when needed
      dailySpent: this.getDailySpending(),
      lastCircuitBreak: this.lastCircuitBreak
    };
  }

  getConfig(): SafetyConfig {
    return this.config;
  }
}

// Export singleton instance
export const tradingSafety = new TradingSafetySystem();
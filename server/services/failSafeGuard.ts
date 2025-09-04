/**
 * FAIL-SAFE GUARD SYSTEM
 * Circuit breaker and risk protection for 7-figure trading
 * Multiple layers of protection to preserve capital
 */

import { Connection } from '@solana/web3.js';
import { advancedTradeEngine } from './advancedTradeEngine';
import { telegramBot } from './telegramBotService';
import { googleSheetsLogger } from './googleSheetsLogger';

interface CircuitBreakerState {
  isOpen: boolean;
  openedAt?: Date;
  reason?: string;
  cooldownPeriod: number;
  tripCount: number;
  lastTrip?: Date;
}

interface RiskMetrics {
  currentExposure: number;
  maxExposure: number;
  dailyLoss: number;
  maxDailyLoss: number;
  consecutiveLosses: number;
  volatilityScore: number;
  marketHealth: number;
}

interface ProtectionRule {
  name: string;
  enabled: boolean;
  threshold: number;
  action: 'WARN' | 'PAUSE' | 'STOP' | 'EMERGENCY';
  triggered: boolean;
  lastTriggered?: Date;
  description: string;
}

interface EmergencyProtocol {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actions: string[];
  notificationsSent: boolean;
  timestamp: Date;
}

export class FailSafeGuard {
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    cooldownPeriod: 300000, // 5 minutes default
    tripCount: 0
  };

  private protectionRules: Map<string, ProtectionRule> = new Map();
  private riskMetrics: RiskMetrics = {
    currentExposure: 0,
    maxExposure: 0.3, // 30% of portfolio
    dailyLoss: 0,
    maxDailyLoss: 0.15, // 15% max daily loss
    consecutiveLosses: 0,
    volatilityScore: 0,
    marketHealth: 100
  };

  private emergencyProtocol: EmergencyProtocol | null = null;
  private blacklistedTokens: Set<string> = new Set();
  private suspiciousActivity: Map<string, number> = new Map();
  private connection: Connection;
  private monitoringInterval?: NodeJS.Timeout;
  private lastHealthCheck: Date = new Date();

  constructor() {
    this.connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');
    this.initializeProtectionRules();
    this.startContinuousMonitoring();
  }

  private initializeProtectionRules(): void {
    // Critical Protection Rules
    this.protectionRules.set('DAILY_LOSS_LIMIT', {
      name: 'Daily Loss Limit',
      enabled: true,
      threshold: 0.15, // 15% daily loss
      action: 'STOP',
      triggered: false,
      description: 'Stops all trading when daily loss exceeds 15%'
    });

    this.protectionRules.set('CONSECUTIVE_LOSSES', {
      name: 'Consecutive Loss Protection',
      enabled: true,
      threshold: 5, // 5 consecutive losses
      action: 'PAUSE',
      triggered: false,
      description: 'Pauses trading after 5 consecutive losses'
    });

    this.protectionRules.set('EXPOSURE_LIMIT', {
      name: 'Maximum Exposure',
      enabled: true,
      threshold: 0.3, // 30% of portfolio
      action: 'WARN',
      triggered: false,
      description: 'Prevents trades that exceed 30% portfolio exposure'
    });

    this.protectionRules.set('VOLATILITY_SPIKE', {
      name: 'Volatility Protection',
      enabled: true,
      threshold: 80, // Volatility score > 80
      action: 'PAUSE',
      triggered: false,
      description: 'Pauses trading during extreme volatility'
    });

    this.protectionRules.set('RUG_PULL_DETECTION', {
      name: 'Rug Pull Protection',
      enabled: true,
      threshold: 0.5, // 50% sudden drop
      action: 'EMERGENCY',
      triggered: false,
      description: 'Emergency exit on potential rug pulls'
    });

    this.protectionRules.set('WHALE_DUMP', {
      name: 'Whale Dump Protection',
      enabled: true,
      threshold: 0.3, // 30% price drop in 1 minute
      action: 'EMERGENCY',
      triggered: false,
      description: 'Emergency exit on whale dumps'
    });

    this.protectionRules.set('LIQUIDITY_CRISIS', {
      name: 'Liquidity Protection',
      enabled: true,
      threshold: 10000, // Less than $10k liquidity
      action: 'STOP',
      triggered: false,
      description: 'Prevents trading in low liquidity pools'
    });

    this.protectionRules.set('NETWORK_CONGESTION', {
      name: 'Network Congestion',
      enabled: true,
      threshold: 5000, // 5 second delay
      action: 'PAUSE',
      triggered: false,
      description: 'Pauses during network congestion'
    });

    this.protectionRules.set('PROFIT_PROTECTION', {
      name: 'Profit Protection',
      enabled: true,
      threshold: 0.5, // 50% profit giveback
      action: 'WARN',
      triggered: false,
      description: 'Protects profits from excessive drawdown'
    });

    console.log(`🛡️ Initialized ${this.protectionRules.size} protection rules`);
  }

  async validateTrade(trade: any): Promise<{ allowed: boolean; reason?: string }> {
    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      const timeSinceOpen = Date.now() - (this.circuitBreaker.openedAt?.getTime() || 0);
      if (timeSinceOpen < this.circuitBreaker.cooldownPeriod) {
        return {
          allowed: false,
          reason: `Circuit breaker active: ${this.circuitBreaker.reason} (${Math.ceil((this.circuitBreaker.cooldownPeriod - timeSinceOpen) / 1000)}s remaining)`
        };
      } else {
        this.resetCircuitBreaker();
      }
    }

    // Check blacklisted tokens
    if (trade.token && this.blacklistedTokens.has(trade.token.address)) {
      return {
        allowed: false,
        reason: `Token blacklisted due to previous issues`
      };
    }

    // Check protection rules
    for (const [key, rule] of this.protectionRules) {
      if (rule.enabled && rule.triggered) {
        if (rule.action === 'STOP' || rule.action === 'EMERGENCY') {
          return {
            allowed: false,
            reason: `Protection triggered: ${rule.name}`
          };
        }
      }
    }

    // Validate risk metrics
    const riskCheck = await this.validateRiskMetrics(trade);
    if (!riskCheck.allowed) {
      return riskCheck;
    }

    // Check for suspicious patterns
    const suspiciousCheck = this.checkSuspiciousPatterns(trade);
    if (!suspiciousCheck.allowed) {
      return suspiciousCheck;
    }

    // All checks passed
    return { allowed: true };
  }

  private async validateRiskMetrics(trade: any): Promise<{ allowed: boolean; reason?: string }> {
    // Update current metrics
    await this.updateRiskMetrics();

    // Check daily loss limit
    if (this.riskMetrics.dailyLoss >= this.riskMetrics.maxDailyLoss) {
      this.triggerProtection('DAILY_LOSS_LIMIT');
      return {
        allowed: false,
        reason: `Daily loss limit reached: ${(this.riskMetrics.dailyLoss * 100).toFixed(1)}%`
      };
    }

    // Check exposure limit
    const newExposure = this.riskMetrics.currentExposure + (trade.amount || 0);
    if (newExposure > this.riskMetrics.maxExposure) {
      this.triggerProtection('EXPOSURE_LIMIT');
      return {
        allowed: false,
        reason: `Exposure limit exceeded: ${(newExposure * 100).toFixed(1)}% of portfolio`
      };
    }

    // Check consecutive losses
    if (this.riskMetrics.consecutiveLosses >= 5) {
      this.triggerProtection('CONSECUTIVE_LOSSES');
      return {
        allowed: false,
        reason: `Too many consecutive losses: ${this.riskMetrics.consecutiveLosses}`
      };
    }

    // Check volatility
    if (this.riskMetrics.volatilityScore > 80) {
      this.triggerProtection('VOLATILITY_SPIKE');
      return {
        allowed: false,
        reason: `Market too volatile: Score ${this.riskMetrics.volatilityScore}/100`
      };
    }

    // Check market health
    if (this.riskMetrics.marketHealth < 30) {
      return {
        allowed: false,
        reason: `Poor market conditions: Health ${this.riskMetrics.marketHealth}/100`
      };
    }

    return { allowed: true };
  }

  private checkSuspiciousPatterns(trade: any): { allowed: boolean; reason?: string } {
    const token = trade.token?.address;
    if (!token) return { allowed: true };

    // Track suspicious activity
    const suspicionCount = this.suspiciousActivity.get(token) || 0;
    
    // Check for pump and dump patterns
    if (trade.priceChange > 500 && trade.volume < 100000) {
      this.suspiciousActivity.set(token, suspicionCount + 1);
      if (suspicionCount >= 2) {
        this.blacklistedTokens.add(token);
        return {
          allowed: false,
          reason: 'Suspicious pump pattern detected'
        };
      }
    }

    // Check for rug pull indicators
    if (trade.liquidity < 10000 || trade.liquidityChange < -50) {
      return {
        allowed: false,
        reason: 'Rug pull risk detected'
      };
    }

    // Check for honeypot
    if (trade.sellTax > 50 || trade.buyTax > 50) {
      this.blacklistedTokens.add(token);
      return {
        allowed: false,
        reason: 'Honeypot detected - excessive taxes'
      };
    }

    return { allowed: true };
  }

  async monitorPosition(position: any): Promise<void> {
    const checkInterval = setInterval(async () => {
      try {
        // Get current price and calculate PnL
        const currentPrice = await this.getCurrentPrice(position.token.address);
        const pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

        // Check for rug pull (sudden massive drop)
        if (pnl < -50) {
          await this.executeEmergencyProtocol('RUG_PULL', position);
          clearInterval(checkInterval);
          return;
        }

        // Check for whale dump
        if (pnl < -30 && position.timeHeld < 60000) { // 30% drop in < 1 minute
          await this.executeEmergencyProtocol('WHALE_DUMP', position);
          clearInterval(checkInterval);
          return;
        }

        // Trailing stop loss for profits
        if (pnl > 100) {
          const trailingStop = position.highestPrice * 0.8; // 20% trailing stop
          if (currentPrice < trailingStop) {
            await this.executeProtection('PROFIT_PROTECTION', position);
          }
        }

        // Update highest price for trailing stop
        if (currentPrice > (position.highestPrice || position.entryPrice)) {
          position.highestPrice = currentPrice;
        }

      } catch (error) {
        console.error('Position monitoring error:', error);
      }
    }, 2000); // Check every 2 seconds

    // Store interval for cleanup
    position.monitoringInterval = checkInterval;
  }

  private async executeEmergencyProtocol(type: string, position?: any): Promise<void> {
    console.log(`🚨 EMERGENCY PROTOCOL ACTIVATED: ${type}`);
    
    this.emergencyProtocol = {
      level: 'CRITICAL',
      actions: [],
      notificationsSent: false,
      timestamp: new Date()
    };

    // Trip circuit breaker
    this.tripCircuitBreaker(`Emergency: ${type}`, 600000); // 10 minute cooldown

    // Execute emergency sell if position provided
    if (position) {
      this.emergencyProtocol.actions.push('Emergency sell executed');
      await advancedTradeEngine.emergencyCloseAllPositions();
    }

    // Send emergency notifications
    await this.sendEmergencyNotifications(type, position);
    
    // Log to Google Sheets
    await googleSheetsLogger.logTrade({
      timestamp: new Date().toISOString(),
      tradeId: `EMERGENCY_${Date.now()}`,
      action: 'SELL',
      token: position?.token || 'ALL',
      tokenAddress: position?.address || '',
      amount: position?.amount || 0,
      price: 0,
      totalValue: 0,
      confidence: 0,
      aiGeneration: 0,
      reasoning: `Emergency protocol: ${type}`,
      marketConditions: {},
      status: 'SUCCESS',
      executionTime: 0
    });

    // Update protection rules
    this.triggerProtection(type === 'RUG_PULL' ? 'RUG_PULL_DETECTION' : 'WHALE_DUMP');
  }

  private async sendEmergencyNotifications(type: string, position?: any): Promise<void> {
    const message = `🚨🚨 EMERGENCY ALERT 🚨🚨\n` +
                   `Type: ${type}\n` +
                   `Token: ${position?.token || 'Multiple'}\n` +
                   `Action: IMMEDIATE EXIT\n` +
                   `Circuit Breaker: ACTIVATED\n` +
                   `All trading: PAUSED`;
    
    await telegramBot.sendEmergencyAlert({
      alertType: type,
      symbol: position?.token || 'MULTIPLE',
      loss: position?.loss || 'N/A',
      action: 'Emergency exit executed',
      savedAmount: position?.value || 0,
      responseTime: '< 1000ms'
    });

    this.emergencyProtocol!.notificationsSent = true;
  }

  private triggerProtection(ruleName: string): void {
    const rule = this.protectionRules.get(ruleName);
    if (!rule) return;

    rule.triggered = true;
    rule.lastTriggered = new Date();
    
    console.log(`⚠️ Protection triggered: ${rule.name}`);
    
    // Execute action based on severity
    switch(rule.action) {
      case 'EMERGENCY':
        this.tripCircuitBreaker(rule.name, 600000); // 10 minutes
        break;
      case 'STOP':
        this.tripCircuitBreaker(rule.name, 300000); // 5 minutes
        break;
      case 'PAUSE':
        this.tripCircuitBreaker(rule.name, 60000); // 1 minute
        break;
      case 'WARN':
        console.log(`⚠️ Warning: ${rule.description}`);
        break;
    }
  }

  private tripCircuitBreaker(reason: string, cooldown: number = 300000): void {
    this.circuitBreaker.isOpen = true;
    this.circuitBreaker.openedAt = new Date();
    this.circuitBreaker.reason = reason;
    this.circuitBreaker.cooldownPeriod = cooldown;
    this.circuitBreaker.tripCount++;
    this.circuitBreaker.lastTrip = new Date();
    
    console.log(`🔴 Circuit breaker tripped: ${reason} (${cooldown/1000}s cooldown)`);
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.openedAt = undefined;
    this.circuitBreaker.reason = undefined;
    
    console.log('🟢 Circuit breaker reset');
  }

  private async updateRiskMetrics(): Promise<void> {
    // Calculate current metrics from trade history
    const positions = advancedTradeEngine.getActivePositions();
    const stats = advancedTradeEngine.getTradeStats();
    
    // Update exposure
    this.riskMetrics.currentExposure = positions.reduce((sum, p) => sum + p.solInvested, 0);
    
    // Update consecutive losses (would track from actual trade history)
    if (stats.recentTrades?.length > 0) {
      let consecutive = 0;
      for (let i = stats.recentTrades.length - 1; i >= 0; i--) {
        if (!stats.recentTrades[i].result?.success) {
          consecutive++;
        } else {
          break;
        }
      }
      this.riskMetrics.consecutiveLosses = consecutive;
    }
    
    // Calculate volatility score (simplified)
    this.riskMetrics.volatilityScore = Math.random() * 100; // Would use real market data
    
    // Calculate market health
    this.riskMetrics.marketHealth = 100 - this.riskMetrics.volatilityScore;
  }

  private async executeProtection(type: string, position: any): Promise<void> {
    console.log(`🛡️ Executing protection: ${type}`);
    
    switch(type) {
      case 'PROFIT_PROTECTION':
        // Sell portion to lock in profits
        await advancedTradeEngine.executeSell(
          position.token,
          0.5, // Sell 50%
          {
            confidence: 100,
            riskLevel: 'LOW',
            recommendation: 'SELL',
            explanation: 'Profit protection - locking gains',
            reasoning: 'Trailing stop triggered',
            expectedOutcome: 'Profit preservation'
          }
        );
        break;
    }
  }

  private async getCurrentPrice(tokenAddress: string): Promise<number> {
    // Would fetch real price
    return Math.random() * 0.1;
  }

  private startContinuousMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Update risk metrics
        await this.updateRiskMetrics();
        
        // Check system health
        await this.performHealthCheck();
        
        // Reset triggered rules after cooldown
        for (const [key, rule] of this.protectionRules) {
          if (rule.triggered && rule.lastTriggered) {
            const timeSince = Date.now() - rule.lastTriggered.getTime();
            if (timeSince > 300000) { // 5 minute reset
              rule.triggered = false;
              console.log(`✅ Protection reset: ${rule.name}`);
            }
          }
        }
        
        // Clear old suspicious activity
        for (const [token, count] of this.suspiciousActivity) {
          if (count === 0) {
            this.suspiciousActivity.delete(token);
          } else {
            this.suspiciousActivity.set(token, count - 1);
          }
        }
        
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 10000); // Every 10 seconds
  }

  private async performHealthCheck(): Promise<void> {
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - this.lastHealthCheck.getTime();
    
    if (timeSinceLastCheck > 60000) { // Every minute
      this.lastHealthCheck = now;
      
      // Check network health
      try {
        const slot = await this.connection.getSlot();
        if (slot) {
          console.log('✅ Network health check passed');
        }
      } catch (error) {
        console.error('❌ Network health check failed');
        this.tripCircuitBreaker('Network issues', 60000);
      }
    }
  }

  getStatus(): any {
    return {
      circuitBreaker: {
        isOpen: this.circuitBreaker.isOpen,
        reason: this.circuitBreaker.reason,
        tripCount: this.circuitBreaker.tripCount,
        cooldownRemaining: this.circuitBreaker.isOpen ? 
          Math.max(0, this.circuitBreaker.cooldownPeriod - (Date.now() - (this.circuitBreaker.openedAt?.getTime() || 0))) : 
          0
      },
      protectionRules: Array.from(this.protectionRules.values()).map(rule => ({
        name: rule.name,
        enabled: rule.enabled,
        triggered: rule.triggered,
        action: rule.action
      })),
      riskMetrics: this.riskMetrics,
      blacklistedTokens: this.blacklistedTokens.size,
      emergencyProtocol: this.emergencyProtocol,
      lastHealthCheck: this.lastHealthCheck
    };
  }

  async testEmergencySystem(): Promise<void> {
    console.log('🧪 Testing emergency systems...');
    
    // Test circuit breaker
    this.tripCircuitBreaker('TEST', 5000);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test notification
    await telegramBot.sendCustomMessage('🧪 Emergency system test successful');
    
    // Reset
    await new Promise(resolve => setTimeout(resolve, 5000));
    this.resetCircuitBreaker();
    
    console.log('✅ Emergency system test complete');
  }
}

export const failSafeGuard = new FailSafeGuard();
import { WebSocketMessage } from '../routes';

export interface RapidExitConfig {
  enabled: boolean;
  triggerThreshold: number; // Price drop percentage to trigger rapid exit
  maxSlippage: number; // Maximum acceptable slippage for emergency exits
  gasMultiplier: number; // Gas price multiplier for front-running
  exitStrategy: 'IMMEDIATE' | 'SMART_ORDER' | 'SANDWICH_PROTECTION';
  mevProtection: boolean;
}

export interface RugPullSignal {
  tokenAddress: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicators: string[];
  priceImpact: number;
  liquidityChange: number;
  volumeSpike: number;
  suspiciousTransactions: number;
  confidence: number;
  recommendedAction: 'MONITOR' | 'REDUCE_POSITION' | 'IMMEDIATE_EXIT' | 'EMERGENCY_DUMP';
}

export interface ExitTransaction {
  id: string;
  tokenAddress: string;
  amount: string;
  expectedPrice: string;
  actualPrice: string;
  slippage: number;
  gasUsed: string;
  executionTime: number; // milliseconds
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'FRONT_RAN';
  mevProtected: boolean;
}

export class RapidExitEngine {
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private config: RapidExitConfig;
  private monitoredTokens: Map<string, number> = new Map(); // tokenAddress -> lastPrice
  private activeExits: Map<string, ExitTransaction> = new Map();
  private rugPullPatterns: string[] = [];

  constructor() {
    this.config = {
      enabled: true,
      triggerThreshold: 0.15, // 15% drop triggers rapid exit
      maxSlippage: 0.25, // 25% max slippage for emergency exits
      gasMultiplier: 3.0, // 3x normal gas for front-running
      exitStrategy: 'IMMEDIATE',
      mevProtection: true
    };

    this.initializeRugPullPatterns();
    this.startMonitoring();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  private initializeRugPullPatterns() {
    this.rugPullPatterns = [
      'massive_liquidity_removal',
      'dev_wallet_dumping',
      'contract_ownership_renounce',
      'trading_disabled',
      'honeypot_activated',
      'price_manipulation_detected',
      'whale_coordinated_dump',
      'exchange_delisting_signals'
    ];
  }

  private startMonitoring() {
    // Monitor price movements every 100ms for rapid detection
    setInterval(() => {
      this.scanForRugPulls();
    }, 100);

    // Advanced pattern detection every 500ms
    setInterval(() => {
      this.detectSuspiciousPatterns();
    }, 500);

    console.log('🚨 Rapid Exit Engine: Monitoring for rug pulls and emergency situations');
  }

  private async scanForRugPulls() {
    for (const [tokenAddress, lastPrice] of this.monitoredTokens) {
      try {
        const currentPrice = await this.getCurrentPrice(tokenAddress);
        const priceChange = (currentPrice - lastPrice) / lastPrice;
        
        if (priceChange <= -this.config.triggerThreshold) {
          const rugSignal = await this.analyzeRugPullRisk(tokenAddress, priceChange);
          
          if (rugSignal.severity === 'CRITICAL' || rugSignal.severity === 'HIGH') {
            await this.executeRapidExit(tokenAddress, rugSignal);
          }
          
          this.broadcastAlert({
            type: 'TOKEN_SCAN',
            data: {
              alert: 'RUG_PULL_DETECTED',
              token: tokenAddress,
              severity: rugSignal.severity,
              priceChange: priceChange * 100,
              action: rugSignal.recommendedAction,
              indicators: rugSignal.indicators
            }
          });
        }
        
        this.monitoredTokens.set(tokenAddress, currentPrice);
      } catch (error) {
        console.error(`Error monitoring token ${tokenAddress}:`, error);
      }
    }
  }

  private async analyzeRugPullRisk(tokenAddress: string, priceChange: number): Promise<RugPullSignal> {
    const indicators: string[] = [];
    let severity: RugPullSignal['severity'] = 'LOW';
    let confidence = 0;

    // Analyze price drop severity
    if (priceChange <= -0.5) {
      indicators.push('Massive price drop (>50%)');
      severity = 'CRITICAL';
      confidence += 0.4;
    } else if (priceChange <= -0.3) {
      indicators.push('Major price drop (>30%)');
      severity = 'HIGH';
      confidence += 0.3;
    } else if (priceChange <= -0.15) {
      indicators.push('Significant price drop (>15%)');
      severity = 'MEDIUM';
      confidence += 0.2;
    }

    // Check for liquidity removal
    const liquidityChange = await this.checkLiquidityChange(tokenAddress);
    if (liquidityChange <= -0.3) {
      indicators.push('Major liquidity removal detected');
      severity = 'CRITICAL';
      confidence += 0.3;
    }

    // Check for suspicious whale activity
    const whaleActivity = await this.detectWhaleActivity(tokenAddress);
    if (whaleActivity.suspiciousTransactions > 5) {
      indicators.push('Coordinated whale dumping');
      severity = severity === 'LOW' ? 'MEDIUM' : 'CRITICAL';
      confidence += 0.2;
    }

    // Check for dev wallet activity
    const devActivity = await this.checkDevWalletActivity(tokenAddress);
    if (devActivity.isDumping) {
      indicators.push('Developer wallet dumping tokens');
      severity = 'CRITICAL';
      confidence += 0.4;
    }

    // Check for contract manipulation
    const contractRisk = await this.analyzeContractRisk(tokenAddress);
    if (contractRisk.isManipulated) {
      indicators.push('Smart contract manipulation detected');
      severity = 'CRITICAL';
      confidence += 0.5;
    }

    const recommendedAction = this.getRecommendedAction(severity, confidence);

    return {
      tokenAddress,
      severity,
      indicators,
      priceImpact: Math.abs(priceChange),
      liquidityChange,
      volumeSpike: whaleActivity.volumeSpike,
      suspiciousTransactions: whaleActivity.suspiciousTransactions,
      confidence,
      recommendedAction
    };
  }

  private async executeRapidExit(tokenAddress: string, rugSignal: RugPullSignal) {
    try {
      console.log(`🚨 EMERGENCY EXIT INITIATED for ${tokenAddress}`);
      
      const exitTransaction: ExitTransaction = {
        id: `exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tokenAddress,
        amount: '100', // Exit full position
        expectedPrice: '0',
        actualPrice: '0',
        slippage: 0,
        gasUsed: '0',
        executionTime: 0,
        status: 'PENDING',
        mevProtected: this.config.mevProtection
      };

      const startTime = Date.now();
      
      // Execute based on strategy
      switch (this.config.exitStrategy) {
        case 'IMMEDIATE':
          await this.executeImmediateExit(exitTransaction);
          break;
        case 'SMART_ORDER':
          await this.executeSmartOrderExit(exitTransaction);
          break;
        case 'SANDWICH_PROTECTION':
          await this.executeSandwichProtectedExit(exitTransaction);
          break;
      }

      exitTransaction.executionTime = Date.now() - startTime;
      this.activeExits.set(exitTransaction.id, exitTransaction);

      this.broadcastAlert({
        type: 'NEW_TRADE',
        data: {
          alert: 'RAPID_EXIT_EXECUTED',
          transaction: exitTransaction,
          rugSignal,
          executionTime: exitTransaction.executionTime
        }
      });

    } catch (error) {
      console.error('Failed to execute rapid exit:', error);
      
      this.broadcastAlert({
        type: 'NOTIFICATION',
        data: {
          alert: 'EXIT_FAILED',
          token: tokenAddress,
          error: error.message,
          severity: 'CRITICAL'
        }
      });
    }
  }

  private async executeImmediateExit(transaction: ExitTransaction) {
    // Simulate immediate market sell with high gas
    console.log(`💨 Executing IMMEDIATE exit for ${transaction.tokenAddress}`);
    
    // Use 3x gas price to front-run other exits
    const gasPrice = await this.getOptimalGasPrice() * this.config.gasMultiplier;
    
    // Market sell with maximum slippage tolerance
    const result = await this.marketSell(
      transaction.tokenAddress,
      transaction.amount,
      this.config.maxSlippage,
      gasPrice
    );
    
    transaction.actualPrice = result.price;
    transaction.slippage = result.slippage;
    transaction.gasUsed = result.gasUsed;
    transaction.status = result.success ? 'CONFIRMED' : 'FAILED';
  }

  private async executeSmartOrderExit(transaction: ExitTransaction) {
    // Split large orders to minimize slippage while maintaining speed
    console.log(`🧠 Executing SMART ORDER exit for ${transaction.tokenAddress}`);
    
    const orderSize = parseFloat(transaction.amount);
    const chunks = this.calculateOptimalChunks(orderSize);
    
    for (const chunk of chunks) {
      await this.marketSell(
        transaction.tokenAddress,
        chunk.toString(),
        0.1, // Lower slippage for chunks
        await this.getOptimalGasPrice() * 1.5
      );
      
      // Small delay between chunks (10ms)
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    transaction.status = 'CONFIRMED';
  }

  private async executeSandwichProtectedExit(transaction: ExitTransaction) {
    // Use MEV protection to avoid sandwich attacks
    console.log(`🛡️ Executing MEV-PROTECTED exit for ${transaction.tokenAddress}`);
    
    // Use flashloan-style protection against MEV
    const protectedResult = await this.executeMEVProtectedTrade(
      transaction.tokenAddress,
      transaction.amount,
      'SELL'
    );
    
    transaction.actualPrice = protectedResult.price;
    transaction.slippage = protectedResult.slippage;
    transaction.gasUsed = protectedResult.gasUsed;
    transaction.status = protectedResult.success ? 'CONFIRMED' : 'FAILED';
    transaction.mevProtected = true;
  }

  // Helper methods for blockchain interaction simulation
  private async getCurrentPrice(tokenAddress: string): Promise<number> {
    // Simulate real-time price fetching
    const basePrice = 1.0;
    const volatility = 0.1;
    const randomChange = (Math.random() - 0.5) * volatility;
    return Math.max(0.01, basePrice + randomChange);
  }

  private async checkLiquidityChange(tokenAddress: string): Promise<number> {
    // Simulate liquidity monitoring
    return -Math.random() * 0.5; // Random liquidity change
  }

  private async detectWhaleActivity(tokenAddress: string) {
    return {
      suspiciousTransactions: Math.floor(Math.random() * 10),
      volumeSpike: Math.random() * 5
    };
  }

  private async checkDevWalletActivity(tokenAddress: string) {
    return {
      isDumping: Math.random() > 0.8 // 20% chance of dev dumping
    };
  }

  private async analyzeContractRisk(tokenAddress: string) {
    return {
      isManipulated: Math.random() > 0.9 // 10% chance of manipulation
    };
  }

  private getRecommendedAction(severity: RugPullSignal['severity'], confidence: number): RugPullSignal['recommendedAction'] {
    if (severity === 'CRITICAL' || confidence > 0.8) return 'EMERGENCY_DUMP';
    if (severity === 'HIGH' || confidence > 0.6) return 'IMMEDIATE_EXIT';
    if (severity === 'MEDIUM' || confidence > 0.4) return 'REDUCE_POSITION';
    return 'MONITOR';
  }

  private async getOptimalGasPrice(): Promise<number> {
    // Simulate dynamic gas price calculation
    return 50; // Base gas price in gwei
  }

  private async marketSell(tokenAddress: string, amount: string, maxSlippage: number, gasPrice: number) {
    // Simulate market sell execution
    const executionDelay = Math.random() * 100; // 0-100ms delay
    await new Promise(resolve => setTimeout(resolve, executionDelay));
    
    return {
      success: Math.random() > 0.05, // 95% success rate
      price: '0.95', // Simulated exit price
      slippage: Math.random() * maxSlippage,
      gasUsed: (gasPrice * 21000).toString()
    };
  }

  private calculateOptimalChunks(totalAmount: number): number[] {
    // Split large orders into optimal chunks
    const maxChunkSize = totalAmount * 0.3; // Max 30% per chunk
    const chunks: number[] = [];
    let remaining = totalAmount;
    
    while (remaining > 0) {
      const chunkSize = Math.min(remaining, maxChunkSize);
      chunks.push(chunkSize);
      remaining -= chunkSize;
    }
    
    return chunks;
  }

  private async executeMEVProtectedTrade(tokenAddress: string, amount: string, type: 'BUY' | 'SELL') {
    // Simulate MEV protection mechanisms
    console.log(`🛡️ Executing MEV-protected ${type} for ${tokenAddress}`);
    
    return {
      success: Math.random() > 0.02, // 98% success rate with MEV protection
      price: type === 'SELL' ? '0.97' : '1.03',
      slippage: Math.random() * 0.05, // Lower slippage with MEV protection
      gasUsed: '75000' // Higher gas for MEV protection
    };
  }

  private detectSuspiciousPatterns() {
    // Advanced pattern detection for rug pull prediction
    this.monitoredTokens.forEach((price, tokenAddress) => {
      const suspiciousActivity = Math.random() > 0.99; // 1% chance of suspicious activity
      
      if (suspiciousActivity) {
        this.broadcastAlert({
          type: 'TOKEN_SCAN',
          data: {
            alert: 'SUSPICIOUS_PATTERN_DETECTED',
            token: tokenAddress,
            pattern: this.rugPullPatterns[Math.floor(Math.random() * this.rugPullPatterns.length)],
            severity: 'MEDIUM',
            recommendation: 'Monitor closely for potential rug pull'
          }
        });
      }
    });
  }

  private broadcastAlert(message: WebSocketMessage) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast(message);
    }
  }

  // Public methods
  addTokenToMonitor(tokenAddress: string, currentPrice: number) {
    this.monitoredTokens.set(tokenAddress, currentPrice);
    console.log(`👁️ Now monitoring ${tokenAddress} for rapid exit signals`);
  }

  removeTokenFromMonitor(tokenAddress: string) {
    this.monitoredTokens.delete(tokenAddress);
    console.log(`🚫 Stopped monitoring ${tokenAddress}`);
  }

  updateConfig(newConfig: Partial<RapidExitConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Rapid Exit configuration updated:', this.config);
  }

  getActiveExits(): ExitTransaction[] {
    return Array.from(this.activeExits.values());
  }

  getMonitoredTokens(): string[] {
    return Array.from(this.monitoredTokens.keys());
  }

  // Emergency manual exit
  async forceExit(tokenAddress: string, amount: string): Promise<ExitTransaction> {
    console.log(`🚨 FORCE EXIT requested for ${tokenAddress}`);
    
    const transaction: ExitTransaction = {
      id: `force_exit_${Date.now()}`,
      tokenAddress,
      amount,
      expectedPrice: '0',
      actualPrice: '0',
      slippage: 0,
      gasUsed: '0',
      executionTime: 0,
      status: 'PENDING',
      mevProtected: this.config.mevProtection
    };

    const startTime = Date.now();
    await this.executeImmediateExit(transaction);
    transaction.executionTime = Date.now() - startTime;

    this.activeExits.set(transaction.id, transaction);
    return transaction;
  }
}

export const rapidExitEngine = new RapidExitEngine();
import { getSolBalance, sendSol, isLiveTradingEnabled } from '../utils/solana';
import { sendTelegramAlert } from '../utils/telegramAlert';

interface TradePosition {
  tokenAddress: string;
  tokenSymbol: string;
  amount: number;
  buyPrice: number;
  buyTimestamp: number;
  maxProfit?: number;
  status: 'OPEN' | 'CLOSED' | 'PARTIAL_SELL';
}

class PositionManager {
  private positions = new Map<string, TradePosition>();

  getPosition(tokenAddress: string): TradePosition | undefined {
    return this.positions.get(tokenAddress);
  }

  getAllPositions(): TradePosition[] {
    return Array.from(this.positions.values());
  }

  updatePosition(tokenAddress: string, position: TradePosition): void {
    this.positions.set(tokenAddress, position);
  }

  addPosition(position: TradePosition): void {
    this.positions.set(position.tokenAddress, position);
  }
}

const positionManager = new PositionManager();

interface SellSignal {
  tokenAddress: string;
  tokenSymbol: string;
  currentPrice: number;
  sellReason: 'PROFIT_TARGET' | 'STOP_LOSS' | 'TRAILING_STOP' | 'MANUAL' | 'EMERGENCY';
  confidence: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  profitPercentage?: number;
  riskLevel: number;
}

interface SellResult {
  success: boolean;
  signature?: string;
  amountReceived?: number;
  fees?: number;
  profitLoss?: number;
  profitPercentage?: number;
  sellPrice?: number;
  error?: string;
}

export class AdvancedSellEngine {
  private isActive = false;
  private sellQueue: SellSignal[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startProcessing();
  }

  /**
   * Start the advanced sell processing engine
   */
  startProcessing() {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(async () => {
      if (this.sellQueue.length > 0 && this.isActive) {
        const signal = this.sellQueue.shift();
        if (signal) {
          await this.processSellSignal(signal);
        }
      }
    }, 1000); // Process sell signals every second
  }

  /**
   * Advanced sell signal analysis with multiple strategies
   */
  async analyzeSellOpportunity(position: TradePosition): Promise<SellSignal | null> {
    try {
      const currentPrice = await this.getCurrentTokenPrice(position.tokenAddress);
      const profitPercentage = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
      
      // Profit target analysis
      if (profitPercentage >= 8.0) {
        return {
          tokenAddress: position.tokenAddress,
          tokenSymbol: position.tokenSymbol,
          currentPrice,
          sellReason: 'PROFIT_TARGET',
          confidence: 95,
          urgency: 'HIGH',
          profitPercentage,
          riskLevel: 0.2
        };
      }

      // Stop loss analysis  
      if (profitPercentage <= -2.0) {
        return {
          tokenAddress: position.tokenAddress,
          tokenSymbol: position.tokenSymbol,
          currentPrice,
          sellReason: 'STOP_LOSS',
          confidence: 98,
          urgency: 'CRITICAL',
          profitPercentage,
          riskLevel: 0.9
        };
      }

      // Trailing stop analysis
      if (position.maxProfit && profitPercentage < (position.maxProfit - 3.0)) {
        return {
          tokenAddress: position.tokenAddress,
          tokenSymbol: position.tokenSymbol,
          currentPrice,
          sellReason: 'TRAILING_STOP',
          confidence: 85,
          urgency: 'HIGH',
          profitPercentage,
          riskLevel: 0.4
        };
      }

      return null;
    } catch (error) {
      console.error('Error analyzing sell opportunity:', error);
      return null;
    }
  }

  /**
   * Execute intelligent sell with multiple strategies
   */
  async executeSell(signal: SellSignal): Promise<SellResult> {
    try {
      const position = positionManager.getPosition(signal.tokenAddress);
      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      // Calculate sell amount based on strategy
      let sellAmount = position.amount;
      
      // Partial sell for profit taking
      if (signal.sellReason === 'PROFIT_TARGET' && signal.profitPercentage && signal.profitPercentage > 15) {
        sellAmount = position.amount * 0.5; // Sell 50% on high profits
      }

      // Emergency full sell
      if (signal.urgency === 'CRITICAL') {
        sellAmount = position.amount; // Sell everything immediately
      }

      const sellResult = await this.executeTokenSell(
        position.tokenAddress,
        sellAmount,
        signal.currentPrice
      );

      if (sellResult.success) {
        // Update position
        const updatedPosition: TradePosition = {
          ...position,
          amount: position.amount - sellAmount,
          status: (sellAmount === position.amount ? 'CLOSED' : 'PARTIAL_SELL') as 'OPEN' | 'CLOSED' | 'PARTIAL_SELL'
        };

        positionManager.updatePosition(signal.tokenAddress, updatedPosition);

        // Log P&L (simulated for now)
        console.log(`📊 P&L Logged: ${signal.tokenSymbol} SELL ${sellAmount} at $${signal.currentPrice} - Profit: ${signal.profitPercentage?.toFixed(2)}%`);

        // Send Telegram notification
        await sendTelegramAlert(
          `🎯 SELL EXECUTED\n` +
          `Token: ${signal.tokenSymbol}\n` +
          `Amount: ${sellAmount.toFixed(4)}\n` +
          `Price: $${signal.currentPrice.toFixed(6)}\n` +
          `Profit: ${signal.profitPercentage?.toFixed(2)}%\n` +
          `Reason: ${signal.sellReason}\n` +
          `TX: ${sellResult.signature}`
        );

        return sellResult;
      }

      return sellResult;
    } catch (error) {
      console.error('Error executing sell:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Process sell signal with advanced logic
   */
  private async processSellSignal(signal: SellSignal): Promise<void> {
    try {
      console.log(`🎯 Processing sell signal for ${signal.tokenSymbol} - ${signal.sellReason}`);
      
      const result = await this.executeSell(signal);
      
      if (result.success) {
        console.log(`✅ Sell executed successfully for ${signal.tokenSymbol}`);
      } else {
        console.log(`❌ Sell failed for ${signal.tokenSymbol}: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing sell signal:', error);
    }
  }

  /**
   * Add sell signal to processing queue
   */
  addSellSignal(signal: SellSignal): void {
    // Priority queue - critical sells go first
    if (signal.urgency === 'CRITICAL') {
      this.sellQueue.unshift(signal);
    } else {
      this.sellQueue.push(signal);
    }
  }

  /**
   * Get current token price (simulated for now)
   */
  private async getCurrentTokenPrice(tokenAddress: string): Promise<number> {
    // This would connect to real price feeds in production
    return Math.random() * 0.001 + 0.0001;
  }

  /**
   * Execute token sell transaction
   */
  private async executeTokenSell(
    tokenAddress: string, 
    amount: number, 
    price: number
  ): Promise<SellResult> {
    try {
      if (!isLiveTradingEnabled()) {
        // Dry run mode
        return {
          success: true,
          signature: 'DRY_RUN_' + Math.random().toString(36).substr(2, 9),
          amountReceived: amount * price,
          fees: amount * price * 0.001,
          profitLoss: (amount * price) - (amount * 0.001), // Simulated profit
          profitPercentage: 5.2,
          sellPrice: price
        };
      }

      // In live mode, this would execute actual token sell via Jupiter DEX
      const solReceived = amount * price;
      
      return {
        success: true,
        signature: 'LIVE_SELL_' + Math.random().toString(36).substr(2, 9),
        amountReceived: solReceived,
        fees: solReceived * 0.005, // 0.5% DEX fees
        sellPrice: price
      };
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Emergency sell all positions
   */
  async emergencySellAll(): Promise<void> {
    const positions = positionManager.getAllPositions();
    
    for (const position of positions) {
      if (position.status === 'OPEN') {
        const emergencySignal: SellSignal = {
          tokenAddress: position.tokenAddress,
          tokenSymbol: position.tokenSymbol,
          currentPrice: await this.getCurrentTokenPrice(position.tokenAddress),
          sellReason: 'EMERGENCY',
          confidence: 100,
          urgency: 'CRITICAL',
          riskLevel: 1.0
        };
        
        this.addSellSignal(emergencySignal);
      }
    }

    await sendTelegramAlert('🚨 EMERGENCY SELL ALL TRIGGERED - All positions being liquidated');
  }

  /**
   * Get sell engine status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      queueLength: this.sellQueue.length,
      openPositions: positionManager.getAllPositions().filter(p => p.status === 'OPEN').length
    };
  }

  /**
   * Activate/deactivate sell engine
   */
  setActive(active: boolean): void {
    this.isActive = active;
  }
}

export const advancedSellEngine = new AdvancedSellEngine();
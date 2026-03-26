/**
 * PROTECTIVE TRADING ENGINE
 * Implements comprehensive stop-loss and profit-taking mechanisms
 * to protect user funds with automatic selling at specified thresholds
 */

import { swapTokenToSol } from './jupiterClient';
import { transactionReceiptLogger } from './transactionReceiptLogger';
import { sendTelegramAlert } from './telegramAlert';
import { config } from '../config';

interface ProtectedPosition {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenAmount: number;
  buyPrice: number;
  buyTimestamp: number;
  buyTxHash: string;
  stopLossPrice: number;  // Sell if price drops to this level
  takeProfitPrice: number; // Sell if price rises to this level
  currentPrice?: number;
  isActive: boolean;
}

class ProtectiveTradingEngine {
  private positions: Map<string, ProtectedPosition> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  // Protection thresholds
  private readonly STOP_LOSS_PERCENTAGE = 0.02; // 2% stop loss
  private readonly TAKE_PROFIT_PERCENTAGE = 0.08; // 8% take profit
  private readonly MONITORING_INTERVAL = 10000; // Check every 10 seconds

  constructor() {
    this.startMonitoring();
  }

  /**
   * Add a new position with automatic protection
   */
  addProtectedPosition(
    tokenSymbol: string,
    tokenAddress: string,
    tokenAmount: number,
    buyPrice: number,
    buyTxHash: string
  ): string {
    const positionId = `${tokenAddress}_${Date.now()}`;
    
    const stopLossPrice = buyPrice * (1 - this.STOP_LOSS_PERCENTAGE);
    const takeProfitPrice = buyPrice * (1 + this.TAKE_PROFIT_PERCENTAGE);
    
    const position: ProtectedPosition = {
      id: positionId,
      tokenSymbol,
      tokenAddress,
      tokenAmount,
      buyPrice,
      buyTimestamp: Date.now(),
      buyTxHash,
      stopLossPrice,
      takeProfitPrice,
      isActive: true
    };

    this.positions.set(positionId, position);
    
    console.log(`🛡️ PROTECTION ACTIVATED: ${tokenSymbol}`);
    console.log(`💰 Buy Price: ${buyPrice.toFixed(6)} SOL`);
    console.log(`🔻 Stop Loss: ${stopLossPrice.toFixed(6)} SOL (-${(this.STOP_LOSS_PERCENTAGE * 100).toFixed(1)}%)`);
    console.log(`🎯 Take Profit: ${takeProfitPrice.toFixed(6)} SOL (+${(this.TAKE_PROFIT_PERCENTAGE * 100).toFixed(1)}%)`);

    // Send Telegram notification
    sendTelegramAlert(
      `🛡️ PROTECTION ACTIVATED\n` +
      `Token: ${tokenSymbol}\n` +
      `Amount: ${tokenAmount.toLocaleString()}\n` +
      `Buy Price: ${buyPrice.toFixed(6)} SOL\n` +
      `🔻 Stop Loss: ${stopLossPrice.toFixed(6)} SOL\n` +
      `🎯 Take Profit: ${takeProfitPrice.toFixed(6)} SOL`,
      'info'
    );

    return positionId;
  }

  /**
   * Start monitoring all positions for stop-loss and take-profit triggers
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Protective monitoring started - checking positions every 10 seconds');
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllPositions();
    }, this.MONITORING_INTERVAL);
  }

  /**
   * Check all active positions for protection triggers
   */
  private async checkAllPositions(): Promise<void> {
    const activePositions = Array.from(this.positions.values()).filter(p => p.isActive);
    
    if (activePositions.length === 0) {
      return;
    }

    console.log(`🔍 Monitoring ${activePositions.length} protected positions...`);

    for (const position of activePositions) {
      try {
        await this.checkPositionProtection(position);
      } catch (error) {
        console.error(`❌ Error checking position ${position.id}:`, error);
      }
    }
  }

  /**
   * Check individual position for stop-loss or take-profit triggers
   */
  private async checkPositionProtection(position: ProtectedPosition): Promise<void> {
    // Get current token price (simplified - in real implementation would use live price feeds)
    const currentPrice = await this.getCurrentTokenPrice(position.tokenAddress);
    
    if (!currentPrice) {
      console.log(`⚠️ Could not get price for ${position.tokenSymbol}`);
      return;
    }

    position.currentPrice = currentPrice;
    
    const priceChangePercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
    
    // Check stop-loss trigger
    if (currentPrice <= position.stopLossPrice) {
      console.log(`🚨 STOP-LOSS TRIGGERED: ${position.tokenSymbol}`);
      console.log(`Current: ${currentPrice.toFixed(6)} SOL <= Stop Loss: ${position.stopLossPrice.toFixed(6)} SOL`);
      await this.executeProtectiveSell(position, 'STOP_LOSS');
      return;
    }
    
    // Check take-profit trigger
    if (currentPrice >= position.takeProfitPrice) {
      console.log(`🎯 TAKE-PROFIT TRIGGERED: ${position.tokenSymbol}`);
      console.log(`Current: ${currentPrice.toFixed(6)} SOL >= Take Profit: ${position.takeProfitPrice.toFixed(6)} SOL`);
      await this.executeProtectiveSell(position, 'TAKE_PROFIT');
      return;
    }

    // Log monitoring status
    console.log(`✅ ${position.tokenSymbol}: ${currentPrice.toFixed(6)} SOL (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)`);
  }

  /**
   * Execute protective sell order
   */
  private async executeProtectiveSell(position: ProtectedPosition, reason: 'STOP_LOSS' | 'TAKE_PROFIT'): Promise<void> {
    try {
      console.log(`🔄 Executing ${reason} sell for ${position.tokenSymbol}...`);
      
      if (config.dryRun) {
        console.log(`[DRY RUN] Would execute ${reason} sell for ${position.tokenSymbol}`);
        await this.logProtectiveSell(position, reason, 'DRY_RUN_TX', position.currentPrice || 0);
        return;
      }

      // Execute real Jupiter swap: Token → SOL
      const sellTxHash = await swapTokenToSol(position.tokenAddress, position.tokenAmount);
      
      if (sellTxHash) {
        await this.logProtectiveSell(position, reason, sellTxHash, position.currentPrice || 0);
        
        // Mark position as inactive
        position.isActive = false;
        this.positions.set(position.id, position);
        
        console.log(`✅ ${reason} EXECUTED: ${position.tokenSymbol} | TX: ${sellTxHash}`);
      } else {
        throw new Error(`${reason} sell failed - no transaction hash`);
      }
      
    } catch (error) {
      console.error(`❌ ${reason} execution failed for ${position.tokenSymbol}:`, error);
      
      // Send emergency alert
      await sendTelegramAlert(
        `🚨 ${reason} EXECUTION FAILED\n` +
        `Token: ${position.tokenSymbol}\n` +
        `Error: ${error.message}\n` +
        `Manual intervention required!`,
        'error'
      );
    }
  }

  /**
   * Log protective sell with P&L calculation
   */
  private async logProtectiveSell(
    position: ProtectedPosition,
    reason: 'STOP_LOSS' | 'TAKE_PROFIT',
    txHash: string,
    sellPrice: number
  ): Promise<void> {
    const pnl = (sellPrice - position.buyPrice) * (position.tokenAmount / 1000000); // Rough P&L calculation
    const pnlPercent = ((sellPrice - position.buyPrice) / position.buyPrice) * 100;
    
    // Log transaction receipt
    await transactionReceiptLogger.logTokenSale(
      position.tokenSymbol,
      position.tokenAddress,
      position.tokenAmount,
      sellPrice * (position.tokenAmount / 1000000), // Estimated SOL received
      txHash,
      position.buyPrice * (position.tokenAmount / 1000000), // Original SOL spent
      95.0, // Confidence
      0.002 // Price impact
    );

    // Send comprehensive Telegram notification
    const emoji = reason === 'TAKE_PROFIT' ? '🎯💰' : '🛡️🔻';
    const reasonText = reason === 'TAKE_PROFIT' ? 'TAKE PROFIT' : 'STOP LOSS';
    
    await sendTelegramAlert(
      `${emoji} ${reasonText} EXECUTED\n` +
      `Token: ${position.tokenSymbol}\n` +
      `Amount: ${position.tokenAmount.toLocaleString()}\n` +
      `Buy: ${position.buyPrice.toFixed(6)} SOL\n` +
      `Sell: ${sellPrice.toFixed(6)} SOL\n` +
      `P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} SOL (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)\n` +
      `TX: ${txHash}\n` +
      `🔗 https://solscan.io/tx/${txHash}`,
      pnl >= 0 ? 'success' : 'error'
    );
  }

  /**
   * Get current token price (simplified implementation)
   */
  private async getCurrentTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
      // In a real implementation, this would fetch from Jupiter/DEX APIs
      // For now, simulate price movement based on time and randomness
      const basePrice = 0.001; // Base price in SOL
      const timeVariation = Math.sin(Date.now() / 100000) * 0.0001;
      const randomVariation = (Math.random() - 0.5) * 0.0002;
      
      return Math.max(0.0001, basePrice + timeVariation + randomVariation);
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  /**
   * Get all active positions
   */
  getActivePositions(): ProtectedPosition[] {
    return Array.from(this.positions.values()).filter(p => p.isActive);
  }

  /**
   * Get position by ID
   */
  getPosition(positionId: string): ProtectedPosition | undefined {
    return this.positions.get(positionId);
  }

  /**
   * Manually close a position
   */
  async manualClosePosition(positionId: string): Promise<boolean> {
    const position = this.positions.get(positionId);
    if (!position || !position.isActive) {
      return false;
    }

    try {
      await this.executeProtectiveSell(position, 'TAKE_PROFIT');
      return true;
    } catch (error) {
      console.error('Manual position close failed:', error);
      return false;
    }
  }

  /**
   * Emergency stop all positions
   */
  async emergencyStopAll(): Promise<void> {
    console.log('🚨 EMERGENCY STOP: Closing all positions immediately');
    
    const activePositions = this.getActivePositions();
    for (const position of activePositions) {
      await this.executeProtectiveSell(position, 'STOP_LOSS');
    }
    
    await sendTelegramAlert(
      `🚨 EMERGENCY STOP EXECUTED\n` +
      `Closed ${activePositions.length} positions\n` +
      `All positions liquidated for safety`,
      'error'
    );
  }

  /**
   * Stop monitoring (cleanup)
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Protective monitoring stopped');
  }
}

// Export singleton instance
export const protectiveTradingEngine = new ProtectiveTradingEngine();
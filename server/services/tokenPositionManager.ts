import { getAllTokenBalances, getTokenBalance } from '../utils/tokenBalanceChecker';
import { getBestRoute, executeSwap } from '../utils/jupiterClient';
import { sendTelegramAlert } from '../utils/telegramAlert';
import { logTrade } from '../utils/tradeLogger';
import { config } from '../config';

export interface OwnedPosition {
  mint: string;
  symbol: string;
  balance: number;
  uiAmount: number;
  purchasePrice: number;
  targetPrice: number;
  stopLoss: number;
  purchaseTime: Date;
  confidence: number;
  reasoning: string;
}

class TokenPositionManager {
  private ownedPositions: Map<string, OwnedPosition> = new Map();

  /**
   * Add a newly purchased token position
   */
  addPosition(tradeDetails: any): void {
    const position: OwnedPosition = {
      mint: tradeDetails.tokenAddress || 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      symbol: tradeDetails.symbol,
      balance: 0, // Will be updated when we check actual balance
      uiAmount: 0,
      purchasePrice: tradeDetails.price,
      targetPrice: tradeDetails.targetPrice,
      stopLoss: tradeDetails.stopLoss,
      purchaseTime: new Date(tradeDetails.timestamp),
      confidence: tradeDetails.confidence,
      reasoning: tradeDetails.reasoning
    };

    this.ownedPositions.set(position.mint, position);
    console.log(`📈 Position added: ${position.symbol} (${position.mint})`);
  }

  /**
   * Update position balances from blockchain
   */
  async updatePositionBalances(): Promise<void> {
    try {
      const tokenBalances = await getAllTokenBalances();
      
      for (const [mint, position] of Array.from(this.ownedPositions.entries())) {
        const balance = tokenBalances.find(b => b.mint === mint);
        if (balance) {
          position.balance = balance.balance;
          position.uiAmount = balance.uiAmount;
        } else {
          // Token balance is zero, position may have been sold
          position.balance = 0;
          position.uiAmount = 0;
        }
      }
    } catch (error) {
      console.error('❌ Error updating position balances:', error);
    }
  }

  /**
   * Check positions for sell opportunities
   */
  async checkSellOpportunities(): Promise<void> {
    await this.updatePositionBalances();

    for (const [mint, position] of Array.from(this.ownedPositions.entries())) {
      if (position.uiAmount <= 0) continue; // Skip empty positions

      try {
        // Get current market price for comparison
        const currentPrice = await this.getCurrentPrice(mint);
        if (!currentPrice) continue;

        const priceChange = ((currentPrice - position.purchasePrice) / position.purchasePrice) * 100;
        
        console.log(`📊 ${position.symbol}: ${priceChange.toFixed(2)}% change (Target: 8%, Stop: -2%)`);

        // Check if we should sell due to profit target
        if (priceChange >= 8) {
          console.log(`🎯 Profit target reached for ${position.symbol}: ${priceChange.toFixed(2)}%`);
          await this.executeSellPosition(position, 'PROFIT_TARGET');
        }
        // Check if we should sell due to stop loss
        else if (priceChange <= -2) {
          console.log(`🛑 Stop loss triggered for ${position.symbol}: ${priceChange.toFixed(2)}%`);
          await this.executeSellPosition(position, 'STOP_LOSS');
        }
        // Check if position is older than 24 hours (risk management)
        else if (this.isPositionOld(position)) {
          console.log(`⏰ Position timeout for ${position.symbol}, selling to manage risk`);
          await this.executeSellPosition(position, 'TIMEOUT');
        }

      } catch (error) {
        console.error(`❌ Error checking ${position.symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Execute sell for a specific position
   */
  private async executeSellPosition(position: OwnedPosition, reason: string): Promise<void> {
    try {
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      
      console.log(`🔻 Selling ${position.symbol}: ${position.uiAmount} tokens (${reason})`);

      // Get best sell route
      const sellRoute = await getBestRoute(position.mint, SOL_MINT, position.uiAmount);
      if (!sellRoute) {
        console.error(`❌ No sell route found for ${position.symbol}`);
        return;
      }

      // Execute the swap
      const tx = await executeSwap(sellRoute);

      // Log the trade
      logTrade({
        id: `sell_${position.mint}_${Date.now()}`,
        symbol: position.symbol,
        type: 'SELL',
        price: parseFloat(sellRoute.outAmount) / 1e9, // Convert lamports to SOL
        amount: position.uiAmount,
        confidence: position.confidence,
        prediction: 'SELL',
        txHash: tx,
        status: config.dryRun ? 'DRY_RUN' : 'EXECUTED',
        timestamp: new Date().toISOString(),
        reason
      });

      // Send notification
      const profitLoss = ((parseFloat(sellRoute.outAmount) / 1e9) - (position.balance * position.purchasePrice));
      await sendTelegramAlert(
        `🔻 SELL executed (${reason}):\n` +
        `Symbol: ${position.symbol}\n` +
        `Amount: ${position.uiAmount.toFixed(6)} tokens\n` +
        `P&L: ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(4)} SOL\n` +
        `TX: ${tx}`
      );

      // Remove position from tracking
      this.ownedPositions.delete(position.mint);
      console.log(`✅ Position sold and removed: ${position.symbol}`);

    } catch (error) {
      console.error(`❌ Failed to sell ${position.symbol}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await sendTelegramAlert(`❌ SELL FAILED: ${position.symbol}\nError: ${errorMessage}`);
    }
  }

  /**
   * Get current market price for a token (simplified)
   */
  private async getCurrentPrice(mint: string): Promise<number | null> {
    try {
      // Use Jupiter price API or implement price fetching logic
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const testRoute = await getBestRoute(mint, SOL_MINT, 1); // Test with 1 token
      if (testRoute) {
        return parseFloat(testRoute.outAmount) / 1e9; // Convert to SOL price per token
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting price for ${mint}:`, error);
      return null;
    }
  }

  /**
   * Check if position is older than 24 hours
   */
  private isPositionOld(position: OwnedPosition): boolean {
    const now = new Date();
    const hoursSincePurchase = (now.getTime() - position.purchaseTime.getTime()) / (1000 * 60 * 60);
    return hoursSincePurchase > 24;
  }

  /**
   * Get all active positions
   */
  getActivePositions(): OwnedPosition[] {
    return Array.from(this.ownedPositions.values()).filter(p => p.uiAmount > 0);
  }

  /**
   * Get trading statistics
   */
  getTradingStats() {
    const positions = this.getActivePositions();
    return {
      totalPositions: positions.length,
      totalInvested: positions.reduce((sum, p) => sum + (p.uiAmount * p.purchasePrice), 0),
      averageHoldTime: positions.length > 0 ? 
        positions.reduce((sum, p) => sum + (Date.now() - p.purchaseTime.getTime()), 0) / positions.length / (1000 * 60 * 60) : 0,
      oldestPosition: positions.length > 0 ? 
        Math.max(...positions.map(p => Date.now() - p.purchaseTime.getTime())) / (1000 * 60 * 60) : 0
    };
  }
}

export const tokenPositionManager = new TokenPositionManager();
import { logTrade } from '../utils/tradeLogger';
import { sendTelegramAlert } from '../utils/telegramAlert';
import { config } from '../config';

interface Position {
  id: string;
  symbol: string;
  tokenAddress: string;
  entryPrice: number;
  amount: number;
  entryTime: Date;
  targetPrice: number;
  stopLoss: number;
  txHash: string;
}

interface SellSignal {
  positionId: string;
  currentPrice: number;
  profitPercent: number;
  reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'AI_SIGNAL';
}

export class PositionManager {
  private activePositions: Map<string, Position> = new Map();
  private profitThreshold = 0.08; // 8% profit target
  private stopLossThreshold = 0.02; // 2% stop loss

  /**
   * Add a new position after successful buy
   */
  addPosition(trade: any): void {
    const position: Position = {
      id: trade.id,
      symbol: trade.symbol,
      tokenAddress: trade.tokenAddress,
      entryPrice: trade.price,
      amount: trade.amount,
      entryTime: new Date(trade.timestamp),
      targetPrice: trade.targetPrice || trade.price * (1 + this.profitThreshold),
      stopLoss: trade.stopLoss || trade.price * (1 - this.stopLossThreshold),
      txHash: trade.txHash
    };

    this.activePositions.set(position.id, position);
    
    console.log(`📈 Position opened: ${position.symbol} at $${position.entryPrice} (Target: $${position.targetPrice})`);
    
    // Send Telegram notification
    sendTelegramAlert(`📈 Position opened: ${position.symbol}\nEntry: $${position.entryPrice}\nTarget: $${position.targetPrice}\nStop Loss: $${position.stopLoss}`);
  }

  /**
   * Check all positions for sell signals
   */
  checkPositionsForSells(currentPrices: Map<string, number>): SellSignal[] {
    const sellSignals: SellSignal[] = [];

    const positionsData: Array<[string, Position]> = [];
    this.activePositions.forEach((position, id) => {
      positionsData.push([id, position]);
    });
    for (const [id, position] of positionsData) {
      const currentPrice = currentPrices.get(position.symbol);
      if (!currentPrice) continue;

      const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

      // Check for take profit
      if (currentPrice >= position.targetPrice) {
        sellSignals.push({
          positionId: id,
          currentPrice,
          profitPercent,
          reason: 'TAKE_PROFIT'
        });
      }
      // Check for stop loss
      else if (currentPrice <= position.stopLoss) {
        sellSignals.push({
          positionId: id,
          currentPrice,
          profitPercent,
          reason: 'STOP_LOSS'
        });
      }
      // Check for 8%+ profit (conservative take profit)
      else if (profitPercent >= 8) {
        sellSignals.push({
          positionId: id,
          currentPrice,
          profitPercent,
          reason: 'TAKE_PROFIT'
        });
      }
    }

    return sellSignals;
  }

  /**
   * Execute sell order and close position
   */
  async executeSell(sellSignal: SellSignal): Promise<void> {
    const position = this.activePositions.get(sellSignal.positionId);
    if (!position) return;

    try {
      console.log(`💰 Executing SELL: ${position.symbol} at $${sellSignal.currentPrice} (${sellSignal.profitPercent.toFixed(2)}% ${sellSignal.profitPercent > 0 ? 'profit' : 'loss'})`);

      // Create sell trade record
      const sellTrade = {
        id: `sell_${position.id}_${Date.now()}`,
        symbol: position.symbol,
        tokenAddress: position.tokenAddress,
        type: 'SELL' as const,
        amount: position.amount,
        price: sellSignal.currentPrice,
        confidence: 99, // High confidence for profit-taking
        prediction: 'STRONG_SELL',
        status: 'EXECUTED' as const,
        txHash: `sell_${position.txHash}_${Date.now()}`, // Simulated sell hash
        entryPrice: position.entryPrice,
        profitPercent: sellSignal.profitPercent,
        profitAmount: (sellSignal.currentPrice - position.entryPrice) * position.amount,
        reason: sellSignal.reason,
        holdTime: Date.now() - position.entryTime.getTime(),
        timestamp: new Date().toISOString()
      };

      // Log the sell trade
      logTrade(sellTrade);

      // Send Telegram notification
      const profitEmoji = sellSignal.profitPercent > 0 ? '💰' : '📉';
      const profitText = sellSignal.profitPercent > 0 ? 'PROFIT' : 'LOSS';
      
      await sendTelegramAlert(`${profitEmoji} Position CLOSED: ${position.symbol}\nEntry: $${position.entryPrice}\nExit: $${sellSignal.currentPrice}\n${profitText}: ${sellSignal.profitPercent.toFixed(2)}%\nReason: ${sellSignal.reason}`);

      // Remove position from active tracking
      this.activePositions.delete(sellSignal.positionId);

      console.log(`✅ Position closed: ${position.symbol} | ${profitText}: ${sellSignal.profitPercent.toFixed(2)}%`);

    } catch (error) {
      console.error(`❌ Sell execution failed for ${position.symbol}:`, error);
    }
  }

  /**
   * Get all active positions
   */
  getActivePositions(): Position[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Get position by ID
   */
  getPosition(id: string): Position | undefined {
    return this.activePositions.get(id);
  }

  /**
   * Force close all positions (emergency)
   */
  async closeAllPositions(currentPrices: Map<string, number>): Promise<void> {
    console.log('🚨 Emergency: Closing all positions');
    
    const positionsArray = Array.from(this.activePositions.values());
    for (const position of positionsArray) {
      const currentPrice = currentPrices.get(position.symbol) || position.entryPrice;
      const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      
      await this.executeSell({
        positionId: position.id,
        currentPrice,
        profitPercent,
        reason: 'STOP_LOSS'
      });
    }
  }

  /**
   * Get trading performance summary
   */
  getTradingStats(): any {
    const positions = this.getActivePositions();
    
    return {
      activePositions: positions.length,
      totalInvested: positions.reduce((sum, p) => sum + (p.amount * p.entryPrice), 0),
      oldestPosition: positions.length > 0 ? Math.min(...positions.map(p => p.entryTime.getTime())) : null,
      averageHoldTime: positions.length > 0 ? positions.reduce((sum, p) => sum + (Date.now() - p.entryTime.getTime()), 0) / positions.length : 0
    };
  }
}

export const positionManager = new PositionManager();
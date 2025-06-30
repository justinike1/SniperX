/**
 * TRANSACTION RECEIPT LOGGER
 * Comprehensive logging system for all Jupiter DEX trades with P&L tracking
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { sendTelegramAlert } from './telegramAlert';

export interface TradeReceipt {
  id: string;
  timestamp: number;
  type: 'BUY' | 'SELL';
  tokenSymbol: string;
  tokenAddress: string;
  solAmount: number;
  tokenAmount: number;
  price: number;
  txHash: string;
  solscanLink: string;
  confidence: number;
  priceImpact: number;
  pnl?: number;
  totalPnl?: number;
}

interface PnLTracker {
  totalTrades: number;
  successfulTrades: number;
  totalProfit: number;
  totalLoss: number;
  bestTrade: number;
  worstTrade: number;
  winRate: number;
}

class TransactionReceiptLogger {
  private receiptsFile = './server/logs/tradeReceipts.json';
  private pnlFile = './server/logs/pnlTracker.json';

  constructor() {
    // Ensure log directories exist
    this.ensureLogDirectories();
  }

  private ensureLogDirectories() {
    import('fs').then(fs => {
      if (!fs.existsSync('./server/logs')) {
        fs.mkdirSync('./server/logs', { recursive: true });
      }
    }).catch(() => {
      // Directory creation handled by async import
    });
  }

  /**
   * Log a successful Jupiter token swap with full receipt details
   */
  async logTokenPurchase(
    tokenSymbol: string,
    tokenAddress: string,
    solAmount: number,
    tokenAmount: number,
    txHash: string,
    confidence: number,
    priceImpact: number
  ): Promise<TradeReceipt> {
    const receipt: TradeReceipt = {
      id: `BUY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'BUY',
      tokenSymbol,
      tokenAddress,
      solAmount,
      tokenAmount,
      price: solAmount / tokenAmount,
      txHash,
      solscanLink: `https://solscan.io/tx/${txHash}`,
      confidence,
      priceImpact,
    };

    // Save receipt
    await this.saveReceipt(receipt);

    // Send Telegram notification
    await this.sendPurchaseAlert(receipt);

    // Update P&L tracker
    await this.updatePnLTracker('BUY', 0);

    console.log('📧 TRADE RECEIPT GENERATED:', receipt);
    return receipt;
  }

  /**
   * Log a successful token sale with P&L calculation
   */
  async logTokenSale(
    tokenSymbol: string,
    tokenAddress: string,
    tokenAmount: number,
    solReceived: number,
    txHash: string,
    originalBuyPrice: number
  ): Promise<TradeReceipt> {
    const currentPrice = solReceived / tokenAmount;
    const pnl = (currentPrice - originalBuyPrice) * tokenAmount;
    const pnlPercentage = ((currentPrice - originalBuyPrice) / originalBuyPrice) * 100;

    const receipt: TradeReceipt = {
      id: `SELL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'SELL',
      tokenSymbol,
      tokenAddress,
      solAmount: solReceived,
      tokenAmount,
      price: currentPrice,
      txHash,
      solscanLink: `https://solscan.io/tx/${txHash}`,
      confidence: 100,
      priceImpact: 0,
      pnl,
    };

    // Save receipt
    await this.saveReceipt(receipt);

    // Send Telegram notification
    await this.sendSaleAlert(receipt, pnlPercentage);

    // Update P&L tracker
    await this.updatePnLTracker('SELL', pnl);

    console.log('💰 SALE RECEIPT GENERATED:', receipt);
    return receipt;
  }

  private async saveReceipt(receipt: TradeReceipt) {
    try {
      let receipts: TradeReceipt[] = [];
      
      if (existsSync(this.receiptsFile)) {
        const data = readFileSync(this.receiptsFile, 'utf8');
        receipts = JSON.parse(data);
      }

      receipts.push(receipt);
      writeFileSync(this.receiptsFile, JSON.stringify(receipts, null, 2));
    } catch (error) {
      console.error('Failed to save receipt:', error);
    }
  }

  private async sendPurchaseAlert(receipt: TradeReceipt) {
    const message = `
🟢 TOKEN PURCHASE CONFIRMED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 Token: ${receipt.tokenSymbol}
💰 Amount: ${receipt.tokenAmount.toFixed(6)} tokens
🔄 Cost: ${receipt.solAmount} SOL
💵 Price: ${receipt.price.toFixed(8)} SOL per token
🎯 Confidence: ${receipt.confidence}%
📊 Price Impact: ${receipt.priceImpact.toFixed(4)}%
🔗 Transaction: ${receipt.solscanLink}
⏰ Time: ${new Date(receipt.timestamp).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Position opened and tracking for profit targets
    `.trim();

    await sendTelegramAlert(message);
  }

  private async sendSaleAlert(receipt: TradeReceipt, pnlPercentage: number) {
    const profitEmoji = receipt.pnl > 0 ? '🟢' : '🔴';
    const profitStatus = receipt.pnl > 0 ? 'PROFIT' : 'LOSS';
    
    const message = `
${profitEmoji} TOKEN SALE CONFIRMED - ${profitStatus}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 Token: ${receipt.tokenSymbol}
💰 Sold: ${receipt.tokenAmount.toFixed(6)} tokens
🔄 Received: ${receipt.solAmount} SOL
💵 Sale Price: ${receipt.price.toFixed(8)} SOL per token
📈 P&L: ${receipt.pnl.toFixed(6)} SOL (${pnlPercentage.toFixed(2)}%)
🔗 Transaction: ${receipt.solscanLink}
⏰ Time: ${new Date(receipt.timestamp).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${receipt.pnl > 0 ? '🎉 Profitable trade completed!' : '⚠️ Stop-loss triggered'}
    `.trim();

    await sendTelegramAlert(message);
  }

  private async updatePnLTracker(type: 'BUY' | 'SELL', pnl: number) {
    try {
      let tracker: PnLTracker = {
        totalTrades: 0,
        successfulTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
        winRate: 0
      };

      if (existsSync(this.pnlFile)) {
        const data = readFileSync(this.pnlFile, 'utf8');
        tracker = JSON.parse(data);
      }

      if (type === 'BUY') {
        tracker.totalTrades++;
      } else if (type === 'SELL') {
        tracker.successfulTrades++;
        
        if (pnl > 0) {
          tracker.totalProfit += pnl;
          if (pnl > tracker.bestTrade) tracker.bestTrade = pnl;
        } else {
          tracker.totalLoss += Math.abs(pnl);
          if (pnl < tracker.worstTrade) tracker.worstTrade = pnl;
        }

        tracker.winRate = tracker.successfulTrades > 0 ? 
          (tracker.totalProfit / (tracker.totalProfit + tracker.totalLoss)) * 100 : 0;
      }

      writeFileSync(this.pnlFile, JSON.stringify(tracker, null, 2));
    } catch (error) {
      console.error('Failed to update P&L tracker:', error);
    }
  }

  /**
   * Get all trade receipts
   */
  getAllReceipts(): TradeReceipt[] {
    try {
      if (existsSync(this.receiptsFile)) {
        const data = readFileSync(this.receiptsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read receipts:', error);
    }
    return [];
  }

  /**
   * Get P&L tracker data
   */
  getPnLTracker(): PnLTracker {
    try {
      if (existsSync(this.pnlFile)) {
        const data = readFileSync(this.pnlFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read P&L tracker:', error);
    }
    return {
      totalTrades: 0,
      successfulTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
      winRate: 0
    };
  }

  /**
   * Generate daily trading summary
   */
  async generateDailySummary(): Promise<string> {
    const tracker = this.getPnLTracker();
    const receipts = this.getAllReceipts();
    const todayReceipts = receipts.filter(r => 
      new Date(r.timestamp).toDateString() === new Date().toDateString()
    );

    const summary = `
📊 DAILY TRADING SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Today's Trades: ${todayReceipts.length}
💰 Total P&L: ${tracker.totalProfit - tracker.totalLoss} SOL
🎯 Win Rate: ${tracker.winRate.toFixed(1)}%
🏆 Best Trade: +${tracker.bestTrade.toFixed(6)} SOL
📉 Worst Trade: ${tracker.worstTrade.toFixed(6)} SOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 SniperX Autonomous Trading System
    `.trim();

    await sendTelegramAlert(summary);
    return summary;
  }
}

export const transactionReceiptLogger = new TransactionReceiptLogger();
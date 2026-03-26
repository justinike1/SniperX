interface TradeRecord {
  id: string;
  token: string;
  type: 'BUY' | 'SELL';
  amountUSD: number;
  priceAtTrade: number;
  timestamp: number;
  txHash?: string;
}

interface PnlSummary {
  totalBought: number;
  totalSold: number;
  realizedPnl: number;
  tradeCount: number;
  winRate: number;
  bestTrade: number;
  worstTrade: number;
  todayPnl: number;
  weekPnl: number;
}

class PnlTracker {
  private trades: TradeRecord[] = [];
  private openPositions: Map<string, { entryUSD: number; entryPrice: number }> = new Map();

  recordBuy(token: string, amountUSD: number, price: number, txHash?: string) {
    const trade: TradeRecord = {
      id: `trade_${Date.now()}`,
      token: token.toUpperCase(),
      type: 'BUY',
      amountUSD,
      priceAtTrade: price,
      timestamp: Date.now(),
      txHash
    };
    this.trades.push(trade);
    this.openPositions.set(token.toUpperCase(), { entryUSD: amountUSD, entryPrice: price });
    console.log(`📊 P&L recorded: BUY ${token} $${amountUSD}`);
  }

  recordSell(token: string, amountUSD: number, price: number, txHash?: string) {
    const trade: TradeRecord = {
      id: `trade_${Date.now()}`,
      token: token.toUpperCase(),
      type: 'SELL',
      amountUSD,
      priceAtTrade: price,
      timestamp: Date.now(),
      txHash
    };
    this.trades.push(trade);
    this.openPositions.delete(token.toUpperCase());
    console.log(`📊 P&L recorded: SELL ${token} $${amountUSD}`);
  }

  getSummary(): PnlSummary {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    let totalBought = 0;
    let totalSold = 0;
    let todayBought = 0;
    let todaySold = 0;
    let weekBought = 0;
    let weekSold = 0;
    const tradePnls: number[] = [];

    // Match buys to sells per token
    const tokenBuys: Map<string, number> = new Map();

    for (const trade of this.trades) {
      if (trade.type === 'BUY') {
        totalBought += trade.amountUSD;
        tokenBuys.set(trade.token, (tokenBuys.get(trade.token) || 0) + trade.amountUSD);
        if (trade.timestamp > dayAgo) todayBought += trade.amountUSD;
        if (trade.timestamp > weekAgo) weekBought += trade.amountUSD;
      } else {
        totalSold += trade.amountUSD;
        const buyAmount = tokenBuys.get(trade.token) || 0;
        if (buyAmount > 0) {
          const pnl = trade.amountUSD - buyAmount;
          tradePnls.push(pnl);
          tokenBuys.delete(trade.token);
        }
        if (trade.timestamp > dayAgo) todaySold += trade.amountUSD;
        if (trade.timestamp > weekAgo) weekSold += trade.amountUSD;
      }
    }

    const realizedPnl = totalSold - totalBought;
    const wins = tradePnls.filter(p => p > 0).length;
    const winRate = tradePnls.length > 0 ? (wins / tradePnls.length) * 100 : 0;
    const bestTrade = tradePnls.length > 0 ? Math.max(...tradePnls) : 0;
    const worstTrade = tradePnls.length > 0 ? Math.min(...tradePnls) : 0;

    return {
      totalBought,
      totalSold,
      realizedPnl,
      tradeCount: this.trades.length,
      winRate,
      bestTrade,
      worstTrade,
      todayPnl: todaySold - todayBought,
      weekPnl: weekSold - weekBought
    };
  }

  formatPnlReport(): string {
    const s = this.getSummary();

    if (s.tradeCount === 0) {
      return '📊 *P&L Report*\n\nNo trades recorded yet.\n\nStart trading to see your performance!';
    }

    const pnlEmoji = s.realizedPnl >= 0 ? '✅' : '❌';
    const todayEmoji = s.todayPnl >= 0 ? '📈' : '📉';
    const sign = (n: number) => n >= 0 ? '+' : '';

    return `📊 *P&L Report*\n\n` +
      `${pnlEmoji} *Total P&L: ${sign(s.realizedPnl)}$${s.realizedPnl.toFixed(2)}*\n\n` +
      `${todayEmoji} Today: ${sign(s.todayPnl)}$${s.todayPnl.toFixed(2)}\n` +
      `📅 This week: ${sign(s.weekPnl)}$${s.weekPnl.toFixed(2)}\n\n` +
      `📈 Total bought: $${s.totalBought.toFixed(2)}\n` +
      `📉 Total sold: $${s.totalSold.toFixed(2)}\n` +
      `🔢 Total trades: ${s.tradeCount}\n` +
      `🎯 Win rate: ${s.winRate.toFixed(1)}%\n` +
      `🏆 Best trade: +$${s.bestTrade.toFixed(2)}\n` +
      `💔 Worst trade: -$${Math.abs(s.worstTrade).toFixed(2)}`;
  }

  getRecentTrades(limit = 5): string {
    const recent = this.trades.slice(-limit).reverse();
    if (!recent.length) return '📭 No recent trades';

    let msg = '📋 *Recent Trades*\n\n';
    for (const t of recent) {
      const emoji = t.type === 'BUY' ? '🟢' : '🔴';
      const time = new Date(t.timestamp).toLocaleTimeString();
      msg += `${emoji} ${t.type} *${t.token}* - $${t.amountUSD.toFixed(2)}\n`;
      msg += `   @ $${t.priceAtTrade.toFixed(6)} | ${time}\n\n`;
    }

    return msg;
  }
}

export const pnlTracker = new PnlTracker();

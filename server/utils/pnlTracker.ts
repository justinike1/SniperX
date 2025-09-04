interface Trade {
  tokenMint: string;
  amount: number;
  action: 'buy' | 'sell';
  price: number;
  timestamp: Date;
  txid?: string;
}

interface PnLData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  todayPnL: number;
  winRate: number;
  bestTrade: number;
  worstTrade: number;
  positions: Map<string, Position>;
}

interface Position {
  tokenMint: string;
  buyPrice: number;
  amount: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
}

class PnLTracker {
  private trades: Trade[] = [];
  private positions: Map<string, Position> = new Map();
  private pnlData: PnLData;

  constructor() {
    this.pnlData = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      todayPnL: 0,
      winRate: 0,
      bestTrade: 0,
      worstTrade: 0,
      positions: new Map()
    };
    console.log('[SNIPERX] 📈 PnL Tracker initialized');
  }

  async trackTrade(
    tokenMint: string, 
    amount: number | string, 
    action: 'buy' | 'sell',
    price?: number
  ): Promise<void> {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const tradePrice = price || await this.getTokenPrice(tokenMint);

    const trade: Trade = {
      tokenMint,
      amount: numAmount,
      action,
      price: tradePrice,
      timestamp: new Date()
    };

    this.trades.push(trade);
    this.pnlData.totalTrades++;

    if (action === 'buy') {
      this.positions.set(tokenMint, {
        tokenMint,
        buyPrice: tradePrice,
        amount: numAmount
      });
      console.log(`[SNIPERX] 💰 Opened position: ${numAmount} ${tokenMint} @ ${tradePrice}`);
    } else if (action === 'sell') {
      const position = this.positions.get(tokenMint);
      if (position) {
        const pnl = (tradePrice - position.buyPrice) * numAmount;
        position.realizedPnL = pnl;
        this.pnlData.totalPnL += pnl;
        
        if (pnl > 0) {
          this.pnlData.winningTrades++;
          if (pnl > this.pnlData.bestTrade) {
            this.pnlData.bestTrade = pnl;
          }
        } else {
          this.pnlData.losingTrades++;
          if (pnl < this.pnlData.worstTrade) {
            this.pnlData.worstTrade = pnl;
          }
        }

        this.pnlData.winRate = (this.pnlData.winningTrades / this.pnlData.totalTrades) * 100;
        
        console.log(`[SNIPERX] 💵 Closed position: ${numAmount} ${tokenMint}`);
        console.log(`[SNIPERX] 📊 PnL: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} SOL`);
        
        this.positions.delete(tokenMint);
      }
    }

    this.updateTodayPnL();
  }

  private updateTodayPnL(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.pnlData.todayPnL = this.trades
      .filter(t => t.timestamp >= today)
      .reduce((sum, trade) => {
        if (trade.action === 'sell') {
          const buyTrade = this.trades.find(t => 
            t.tokenMint === trade.tokenMint && 
            t.action === 'buy' && 
            t.timestamp < trade.timestamp
          );
          if (buyTrade) {
            return sum + (trade.price - buyTrade.price) * trade.amount;
          }
        }
        return sum;
      }, 0);
  }

  private async getTokenPrice(tokenMint: string): Promise<number> {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${tokenMint}&vs_currencies=usd`);
      const data = await response.json();
      return data[tokenMint]?.usd || 0.001;
    } catch (error) {
      console.log('[PnL] Using default price for', tokenMint);
      return 0.001;
    }
  }

  getPnLSummary(): PnLData {
    return {
      ...this.pnlData,
      positions: new Map(this.positions)
    };
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  async updateUnrealizedPnL(): Promise<void> {
    for (const [token, position] of this.positions) {
      const currentPrice = await this.getTokenPrice(token);
      position.currentPrice = currentPrice;
      position.unrealizedPnL = (currentPrice - position.buyPrice) * position.amount;
    }
  }
}

const pnlTracker = new PnLTracker();

export async function trackPnL(
  tokenMint: string,
  amount: number | string,
  action: 'buy' | 'sell'
): Promise<void> {
  await pnlTracker.trackTrade(tokenMint, amount, action);
}

export function getPnLSummary(): PnLData {
  return pnlTracker.getPnLSummary();
}

export function getActivePositions(): Position[] {
  return pnlTracker.getPositions();
}

export async function updateUnrealizedPnL(): Promise<void> {
  await pnlTracker.updateUnrealizedPnL();
}
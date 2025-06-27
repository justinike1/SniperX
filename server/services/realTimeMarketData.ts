import { WebSocketMessage } from "../routes";

export interface MarketTick {
  symbol: string;
  address: string;
  price: number;
  volume24h: number;
  change24h: number;
  change1h: number;
  change5m: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  timestamp: number;
  source: string;
}

export interface OrderBookData {
  symbol: string;
  bids: Array<[number, number]>; // [price, volume]
  asks: Array<[number, number]>;
  spread: number;
  depth: number;
  timestamp: number;
}

export interface WhaleActivity {
  txHash: string;
  tokenAddress: string;
  type: 'BUY' | 'SELL';
  amount: number;
  valueUSD: number;
  walletAddress: string;
  timestamp: number;
  impact: number; // Price impact percentage
}

export class RealTimeMarketData {
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private marketTickers: Map<string, MarketTick> = new Map();
  private orderBooks: Map<string, OrderBookData> = new Map();
  private whaleActivities: WhaleActivity[] = [];
  private dataFeeds: Map<string, any> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeMarketData();
    this.startRealTimeUpdates();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  private initializeMarketData() {
    // Initialize with real Solana ecosystem tokens
    const tokens = [
      {
        symbol: 'SOL',
        address: 'So11111111111111111111111111111111111111112',
        price: 95.24,
        volume24h: 892340000,
        marketCap: 42847392847,
        holders: 1250000
      },
      {
        symbol: 'BONK',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        price: 0.000034,
        volume24h: 45670000,
        marketCap: 2384729384,
        holders: 847392
      },
      {
        symbol: 'WIF',
        address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        price: 2.87,
        volume24h: 23450000,
        marketCap: 1847392847,
        holders: 234847
      },
      {
        symbol: 'PEPE',
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        price: 0.00001234,
        volume24h: 67890000,
        marketCap: 3847392847,
        holders: 547392
      },
      {
        symbol: 'RAY',
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        price: 4.67,
        volume24h: 12340000,
        marketCap: 847392847,
        holders: 156284
      }
    ];

    tokens.forEach(token => {
      const marketTick: MarketTick = {
        ...token,
        change24h: (Math.random() - 0.5) * 20, // -10% to +10%
        change1h: (Math.random() - 0.5) * 4,   // -2% to +2%
        change5m: (Math.random() - 0.5) * 1,   // -0.5% to +0.5%
        liquidity: token.volume24h * 0.1,
        timestamp: Date.now(),
        source: 'JUPITER_DEX'
      };
      this.marketTickers.set(token.symbol, marketTick);
      this.generateOrderBook(token.symbol, token.price);
    });
  }

  private generateOrderBook(symbol: string, midPrice: number) {
    const bids: Array<[number, number]> = [];
    const asks: Array<[number, number]> = [];
    
    // Generate realistic order book with depth
    for (let i = 1; i <= 20; i++) {
      const bidPrice = midPrice * (1 - (i * 0.001));
      const askPrice = midPrice * (1 + (i * 0.001));
      const volume = Math.random() * 10000 * (21 - i); // Higher volume closer to mid
      
      bids.push([bidPrice, volume]);
      asks.push([askPrice, volume]);
    }

    const orderBook: OrderBookData = {
      symbol,
      bids: bids.sort((a, b) => b[0] - a[0]), // Highest bid first
      asks: asks.sort((a, b) => a[0] - b[0]), // Lowest ask first
      spread: (asks[0][0] - bids[0][0]) / midPrice * 100,
      depth: bids.reduce((sum, [, vol]) => sum + vol, 0) + asks.reduce((sum, [, vol]) => sum + vol, 0),
      timestamp: Date.now()
    };

    this.orderBooks.set(symbol, orderBook);
  }

  private startRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateMarketData();
      this.detectWhaleActivity();
      this.broadcastMarketUpdates();
    }, 2000); // Update every 2 seconds for real-time feel
  }

  private updateMarketData() {
    this.marketTickers.forEach((ticker, symbol) => {
      // Simulate realistic price movements
      const volatility = this.getVolatilityForToken(symbol);
      const priceChange = (Math.random() - 0.5) * volatility * 2;
      const newPrice = ticker.price * (1 + priceChange / 100);
      
      // Update volume with realistic patterns
      const volumeChange = (Math.random() - 0.5) * 0.1;
      const newVolume = Math.max(ticker.volume24h * (1 + volumeChange), 1000);

      const updatedTicker: MarketTick = {
        ...ticker,
        price: Math.max(newPrice, 0.000001), // Prevent negative prices
        volume24h: newVolume,
        change5m: priceChange,
        change1h: ticker.change1h + priceChange * 0.3,
        change24h: ticker.change24h + priceChange * 0.1,
        timestamp: Date.now()
      };

      this.marketTickers.set(symbol, updatedTicker);
      this.generateOrderBook(symbol, updatedTicker.price);
    });
  }

  private getVolatilityForToken(symbol: string): number {
    const volatilityMap: { [key: string]: number } = {
      'SOL': 0.5,
      'BONK': 2.0,
      'WIF': 1.5,
      'PEPE': 3.0,
      'RAY': 1.2
    };
    return volatilityMap[symbol] || 1.0;
  }

  private detectWhaleActivity() {
    // Simulate whale activity detection
    if (Math.random() < 0.1) { // 10% chance per update
      const tokens = Array.from(this.marketTickers.keys());
      const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
      const ticker = this.marketTickers.get(randomToken)!;
      
      const whaleActivity: WhaleActivity = {
        txHash: `whale_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        tokenAddress: ticker.address,
        type: Math.random() > 0.5 ? 'BUY' : 'SELL',
        amount: Math.random() * 1000000 + 100000, // 100K - 1M tokens
        valueUSD: ticker.price * (Math.random() * 1000000 + 100000),
        walletAddress: `whale_${Math.random().toString(36).substr(2, 12)}`,
        timestamp: Date.now(),
        impact: Math.random() * 5 + 0.5 // 0.5% - 5.5% impact
      };

      this.whaleActivities.unshift(whaleActivity);
      if (this.whaleActivities.length > 50) {
        this.whaleActivities = this.whaleActivities.slice(0, 50);
      }

      // Broadcast whale activity
      if (this.websocketBroadcast) {
        this.websocketBroadcast({
          type: 'REAL_TIME_PRICES',
          data: {
            type: 'WHALE_ACTIVITY',
            activity: whaleActivity,
            timestamp: Date.now()
          }
        });
      }
    }
  }

  private broadcastMarketUpdates() {
    if (this.websocketBroadcast) {
      const marketUpdate = {
        tickers: Array.from(this.marketTickers.values()),
        orderBooks: Array.from(this.orderBooks.values()),
        whaleActivities: this.whaleActivities.slice(0, 10), // Last 10 activities
        timestamp: Date.now()
      };

      this.websocketBroadcast({
        type: 'REAL_TIME_PRICES',
        data: marketUpdate
      });
    }
  }

  getMarketTicker(symbol: string): MarketTick | undefined {
    return this.marketTickers.get(symbol);
  }

  getAllTickers(): MarketTick[] {
    return Array.from(this.marketTickers.values());
  }

  getOrderBook(symbol: string): OrderBookData | undefined {
    return this.orderBooks.get(symbol);
  }

  getWhaleActivities(limit = 20): WhaleActivity[] {
    return this.whaleActivities.slice(0, limit);
  }

  getMarketOverview() {
    const tickers = Array.from(this.marketTickers.values());
    const totalMarketCap = tickers.reduce((sum, t) => sum + t.marketCap, 0);
    const totalVolume = tickers.reduce((sum, t) => sum + t.volume24h, 0);
    const avgChange24h = tickers.reduce((sum, t) => sum + t.change24h, 0) / tickers.length;

    return {
      totalMarketCap,
      totalVolume24h: totalVolume,
      avgChange24h,
      activeTokens: tickers.length,
      topGainers: tickers
        .filter(t => t.change24h > 0)
        .sort((a, b) => b.change24h - a.change24h)
        .slice(0, 5),
      topLosers: tickers
        .filter(t => t.change24h < 0)
        .sort((a, b) => a.change24h - b.change24h)
        .slice(0, 5),
      trending: tickers
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 10),
      timestamp: Date.now()
    };
  }

  // Real-time price feeds for specific tokens
  subscribeToPriceFeed(tokenAddress: string, callback: (price: MarketTick) => void) {
    const symbol = Array.from(this.marketTickers.entries())
      .find(([_, ticker]) => ticker.address === tokenAddress)?.[0];
    
    if (symbol) {
      setInterval(() => {
        const ticker = this.marketTickers.get(symbol);
        if (ticker) {
          callback(ticker);
        }
      }, 1000);
    }
  }
}

export const realTimeMarketData = new RealTimeMarketData();
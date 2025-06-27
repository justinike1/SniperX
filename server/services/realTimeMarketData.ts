import WebSocket from 'ws';
import axios from 'axios';

interface MarketDataConfig {
  symbol: string;
  exchange: string;
  lastPrice: number;
  volume24h: number;
  priceChange24h: number;
  timestamp: number;
  bid: number;
  ask: number;
  spread: number;
}

interface PriceAggregation {
  symbol: string;
  weightedPrice: number;
  exchanges: MarketDataConfig[];
  confidence: number;
  lastUpdated: number;
}

export class RealTimeMarketDataService {
  private priceData: Map<string, PriceAggregation> = new Map();
  private webSocketConnections: Map<string, WebSocket> = new Map();
  private updateCallbacks: ((data: PriceAggregation) => void)[] = [];
  private isConnected = false;

  constructor() {
    // Start with REST APIs first for immediate data
    this.initializeRESTFeeds();
    this.startPriceAggregation();
    
    // Initialize WebSocket connections with delay to avoid overwhelming
    setTimeout(() => this.initializeWebSocketConnections(), 2000);
  }

  private async initializeRESTFeeds() {
    console.log('🚀 Initializing REST market data feeds...');
    
    // Start with reliable REST endpoints
    this.connectCoinGecko();
    this.connectJupiter();
    
    this.isConnected = true;
    console.log('✅ REST market data feeds connected successfully');
  }

  private async initializeWebSocketConnections() {
    console.log('🔗 Connecting to WebSocket feeds...');
    
    // Connect to WebSocket feeds gradually
    setTimeout(() => this.connectBinance(), 1000);
    setTimeout(() => this.connectCoinbase(), 2000);
    setTimeout(() => this.connectKraken(), 3000);
  }

  private async connectBinance() {
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/solusdt@ticker');
      
      ws.on('open', () => {
        console.log('📡 Binance WebSocket connected');
      });

      ws.on('message', (data) => {
        try {
          const ticker = JSON.parse(data.toString());
          this.updatePriceData('SOL', 'binance', {
            symbol: 'SOL',
            exchange: 'binance',
            lastPrice: parseFloat(ticker.c),
            volume24h: parseFloat(ticker.v),
            priceChange24h: parseFloat(ticker.P),
            timestamp: Date.now(),
            bid: parseFloat(ticker.b),
            ask: parseFloat(ticker.a),
            spread: parseFloat(ticker.a) - parseFloat(ticker.b)
          });
        } catch (error) {
          console.error('Binance data parsing error:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('Binance WebSocket error:', error);
        // Reconnect after delay
        setTimeout(() => this.connectBinance(), 5000);
      });

      ws.on('close', () => {
        console.log('Binance WebSocket disconnected, reconnecting...');
        setTimeout(() => this.connectBinance(), 5000);
      });

      this.webSocketConnections.set('binance', ws);
    } catch (error) {
      console.error('Binance connection failed:', error);
      // Retry connection after delay
      setTimeout(() => this.connectBinance(), 10000);
    }
  }

  private async connectCoinbase() {
    try {
      // Use REST API instead of WebSocket for more reliability
      setInterval(async () => {
        try {
          const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=SOL');
          const data = await response.json();
          
          if (data.data && data.data.rates && data.data.rates.USD) {
            const price = parseFloat(data.data.rates.USD);
            this.updatePriceData('SOL', 'coinbase', {
              symbol: 'SOL',
              exchange: 'coinbase',
              lastPrice: price,
              volume24h: 0,
              priceChange24h: 0,
              timestamp: Date.now(),
              bid: price * 0.999,
              ask: price * 1.001,
              spread: price * 0.002
            });
          }
        } catch (error) {
          console.error('Coinbase REST API error:', error);
        }
      }, 15000); // Update every 15 seconds
      
      console.log('📡 Coinbase REST API connected');
    } catch (error) {
      console.error('Coinbase connection failed:', error);
    }
  }

  private async connectKraken() {
    try {
      // Use REST API for more reliable connections
      setInterval(async () => {
        try {
          const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=SOLUSD');
          const data = await response.json();
          
          if (data.result && data.result.SOLUSD) {
            const ticker = data.result.SOLUSD;
            const price = parseFloat(ticker.c[0]);
            this.updatePriceData('SOL', 'kraken', {
              symbol: 'SOL',
              exchange: 'kraken',
              lastPrice: price,
              volume24h: parseFloat(ticker.v[1]) || 0,
              priceChange24h: 0,
              timestamp: Date.now(),
              bid: parseFloat(ticker.b[0]),
              ask: parseFloat(ticker.a[0]),
              spread: parseFloat(ticker.a[0]) - parseFloat(ticker.b[0])
            });
          }
        } catch (error) {
          console.error('Kraken REST API error:', error);
        }
      }, 20000); // Update every 20 seconds
      
      console.log('📡 Kraken REST API connected');
    } catch (error) {
      console.error('Kraken connection failed:', error);
    }
  }

  private async connectCoinGecko() {
    // CoinGecko uses REST API with frequent polling
    setInterval(async () => {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: {
            ids: 'solana',
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_24hr_vol: true
          }
        });

        const data = response.data.solana;
        if (data) {
          this.updatePriceData('SOL', 'coingecko', {
            symbol: 'SOL',
            exchange: 'coingecko',
            lastPrice: data.usd,
            volume24h: data.usd_24h_vol || 0,
            priceChange24h: data.usd_24h_change || 0,
            timestamp: Date.now(),
            bid: data.usd * 0.999, // Estimated bid
            ask: data.usd * 1.001, // Estimated ask
            spread: data.usd * 0.002
          });
        }
      } catch (error) {
        console.error('CoinGecko API error:', error);
      }
    }, 10000); // Update every 10 seconds
  }

  private async connectJupiter() {
    // Jupiter Solana DEX aggregator
    setInterval(async () => {
      try {
        const response = await axios.get('https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112');
        const data = response.data.data;
        
        if (data && data['So11111111111111111111111111111111111111112']) {
          const solData = data['So11111111111111111111111111111111111111112'];
          this.updatePriceData('SOL', 'jupiter', {
            symbol: 'SOL',
            exchange: 'jupiter',
            lastPrice: solData.price,
            volume24h: 0,
            priceChange24h: 0,
            timestamp: Date.now(),
            bid: solData.price * 0.998,
            ask: solData.price * 1.002,
            spread: solData.price * 0.004
          });
        }
      } catch (error) {
        console.error('Jupiter API error:', error);
      }
    }, 5000); // Update every 5 seconds for faster DEX data
  }

  private updatePriceData(symbol: string, exchange: string, data: MarketDataConfig) {
    const current = this.priceData.get(symbol) || {
      symbol,
      weightedPrice: 0,
      exchanges: [],
      confidence: 0,
      lastUpdated: Date.now()
    };

    // Update or add exchange data
    const existingIndex = current.exchanges.findIndex(e => e.exchange === exchange);
    if (existingIndex >= 0) {
      current.exchanges[existingIndex] = data;
    } else {
      current.exchanges.push(data);
    }

    // Calculate weighted average price based on exchange reliability
    const weights = {
      binance: 0.25,
      coinbase: 0.25,
      kraken: 0.20,
      coingecko: 0.15,
      jupiter: 0.15
    };

    let totalWeight = 0;
    let weightedSum = 0;

    current.exchanges.forEach(exchange => {
      const weight = weights[exchange.exchange as keyof typeof weights] || 0.1;
      weightedSum += exchange.lastPrice * weight;
      totalWeight += weight;
    });

    if (totalWeight > 0) {
      current.weightedPrice = weightedSum / totalWeight;
      current.confidence = Math.min(current.exchanges.length * 20, 100);
      current.lastUpdated = Date.now();
    }

    this.priceData.set(symbol, current);

    // Notify all callbacks with the updated data
    this.updateCallbacks.forEach(callback => {
      try {
        callback(current);
      } catch (error) {
        console.error('Callback error:', error);
      }
    });
  }

  private startPriceAggregation() {
    // Aggregate and validate prices every second
    setInterval(() => {
      this.priceData.forEach((data, symbol) => {
        // Remove stale data (older than 30 seconds)
        data.exchanges = data.exchanges.filter(
          exchange => Date.now() - exchange.timestamp < 30000
        );

        if (data.exchanges.length === 0) {
          data.confidence = 0;
          data.weightedPrice = 0;
        }
      });
    }, 1000);
  }

  public getPrice(symbol: string): PriceAggregation | null {
    return this.priceData.get(symbol) || null;
  }

  public getAllPrices(): Map<string, PriceAggregation> {
    return new Map(this.priceData);
  }

  public onPriceUpdate(callback: (data: PriceAggregation) => void) {
    this.updateCallbacks.push(callback);
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getExchangeStatus(): { [exchange: string]: boolean } {
    const status: { [exchange: string]: boolean } = {};
    
    this.webSocketConnections.forEach((ws, exchange) => {
      status[exchange] = ws.readyState === WebSocket.OPEN;
    });

    return status;
  }

  public async validatePrice(symbol: string, proposedPrice: number): Promise<boolean> {
    const currentData = this.getPrice(symbol);
    if (!currentData || currentData.confidence < 50) {
      return false;
    }

    // Allow 2% deviation from weighted average
    const deviation = Math.abs(proposedPrice - currentData.weightedPrice) / currentData.weightedPrice;
    return deviation <= 0.02;
  }

  public destroy() {
    this.webSocketConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.webSocketConnections.clear();
    this.updateCallbacks = [];
    this.isConnected = false;
  }
}

export const realTimeMarketData = new RealTimeMarketDataService();
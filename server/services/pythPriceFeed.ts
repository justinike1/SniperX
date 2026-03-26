import { PriceServiceConnection } from '@pythnetwork/price-service-client';

const PYTH_ENDPOINT = 'https://hermes.pyth.network';

export interface PythPrice {
  price: number;
  confidence: number;
  expo: number;
  publishTime: number;
}

const PRICE_FEED_IDS: Record<string, string> = {
  'SOL': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BONK': '0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  'JUP': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'USDC': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b'
};

class PythPriceFeedService {
  private connection: PriceServiceConnection;
  private cache: Map<string, { price: PythPrice; timestamp: number }>;
  private readonly CACHE_TTL = 5000;

  constructor() {
    this.connection = new PriceServiceConnection(PYTH_ENDPOINT, {
      priceFeedRequestConfig: { binary: true }
    });
    this.cache = new Map();
  }

  async getPrice(symbol: string): Promise<PythPrice | null> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    const feedId = PRICE_FEED_IDS[symbol.toUpperCase()];
    if (!feedId) {
      console.warn(`⚠️ No Pyth feed ID for ${symbol}`);
      return null;
    }

    try {
      const priceFeeds = await this.connection.getLatestPriceFeeds([feedId]);
      
      if (!priceFeeds || priceFeeds.length === 0) {
        return null;
      }

      const feed = priceFeeds[0];
      const priceData = feed.getPriceNoOlderThan(60);
      
      if (!priceData) {
        return null;
      }

      const pythPrice: PythPrice = {
        price: Number(priceData.price) * Math.pow(10, priceData.expo),
        confidence: Number(priceData.conf) * Math.pow(10, priceData.expo),
        expo: priceData.expo,
        publishTime: priceData.publishTime
      };

      this.cache.set(symbol, {
        price: pythPrice,
        timestamp: Date.now()
      });

      return pythPrice;
    } catch (error) {
      console.error(`❌ Pyth price fetch failed for ${symbol}:`, error);
      return null;
    }
  }

  async getPrices(symbols: string[]): Promise<Record<string, PythPrice | null>> {
    const results: Record<string, PythPrice | null> = {};
    
    await Promise.all(
      symbols.map(async (symbol) => {
        results[symbol] = await this.getPrice(symbol);
      })
    );

    return results;
  }

  getFeedId(symbol: string): string | undefined {
    return PRICE_FEED_IDS[symbol.toUpperCase()];
  }

  clearCache() {
    this.cache.clear();
  }
}

export const pythPriceService = new PythPriceFeedService();

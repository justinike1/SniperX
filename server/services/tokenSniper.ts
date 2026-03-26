import { sendTelegramAlert } from '../utils/telegramBotEnhanced';
import { tradeQueue } from '../worker/queue';

interface NewToken {
  address: string;
  name: string;
  symbol: string;
  priceUsd: number;
  liquidity: number;
  volume24h: number;
  priceChange5m: number;
  priceChange1h: number;
  age: number; // minutes since creation
  pairAddress: string;
  url: string;
}

interface SniperConfig {
  enabled: boolean;
  minLiquidity: number;     // Min $ liquidity to snipe
  maxAge: number;           // Max age in minutes to consider
  minVolume: number;        // Min 24h volume
  maxBuyUSD: number;        // Max USD to spend per snipe
  autoBuy: boolean;         // Auto-execute or just alert
  requirePositiveMomentum: boolean; // Require positive 5m price change
  blacklistedWords: string[]; // Skip tokens with these in name
}

const DEFAULT_CONFIG: SniperConfig = {
  enabled: false,
  minLiquidity: 10000,    // $10K minimum liquidity
  maxAge: 10,             // Max 10 minutes old
  minVolume: 5000,        // $5K minimum volume
  maxBuyUSD: 20,          // Max $20 per snipe
  autoBuy: false,         // Alert only by default (safer)
  requirePositiveMomentum: true,
  blacklistedWords: ['test', 'scam', 'fake', 'rug', 'honeypot']
};

class TokenSniper {
  private config: SniperConfig = { ...DEFAULT_CONFIG };
  private sniped: Set<string> = new Set();
  private scanInterval: NodeJS.Timeout | null = null;
  private alertsOnly: boolean = true;

  updateConfig(updates: Partial<SniperConfig>) {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): SniperConfig {
    return { ...this.config };
  }

  enable(autoBuy = false) {
    this.config.enabled = true;
    this.config.autoBuy = autoBuy;
    this.alertsOnly = !autoBuy;
  }

  disable() {
    this.config.enabled = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  startScanning() {
    if (this.scanInterval) return;

    console.log('🎯 Token Sniper scanning started');
    this.scanInterval = setInterval(() => this.scanNewTokens(), 30000); // every 30s
    this.scanNewTokens(); // immediate first scan
  }

  stopScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log('🛑 Token Sniper scanning stopped');
  }

  private async scanNewTokens() {
    if (!this.config.enabled) return;

    try {
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/tokens/solana',
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) return;
      const data = await response.json() as any;
      const pairs = data.pairs || [];

      for (const pair of pairs.slice(0, 50)) {
        if (!pair || !pair.baseToken) continue;

        const token: NewToken = {
          address: pair.baseToken.address,
          name: pair.baseToken.name || 'Unknown',
          symbol: pair.baseToken.symbol || '???',
          priceUsd: parseFloat(pair.priceUsd || '0'),
          liquidity: pair.liquidity?.usd || 0,
          volume24h: pair.volume?.h24 || 0,
          priceChange5m: pair.priceChange?.m5 || 0,
          priceChange1h: pair.priceChange?.h1 || 0,
          age: this.getPairAge(pair.pairCreatedAt),
          pairAddress: pair.pairAddress,
          url: pair.url || `https://dexscreener.com/solana/${pair.pairAddress}`
        };

        if (this.passesFilters(token)) {
          await this.handleOpportunity(token);
        }
      }
    } catch (error) {
      // Silent fail - network issues are normal
    }
  }

  private getPairAge(createdAt: number): number {
    if (!createdAt) return 9999;
    const ageMs = Date.now() - createdAt;
    return Math.floor(ageMs / 60000); // minutes
  }

  private passesFilters(token: NewToken): boolean {
    if (this.sniped.has(token.address)) return false;

    const nameLower = (token.name + token.symbol).toLowerCase();
    if (this.config.blacklistedWords.some(w => nameLower.includes(w))) return false;
    if (token.liquidity < this.config.minLiquidity) return false;
    if (token.age > this.config.maxAge) return false;
    if (token.volume24h < this.config.minVolume) return false;
    if (this.config.requirePositiveMomentum && token.priceChange5m <= 0) return false;

    return true;
  }

  private async handleOpportunity(token: NewToken) {
    this.sniped.add(token.address);

    const momentum = token.priceChange5m > 0 ? `📈 +${token.priceChange5m.toFixed(1)}%` : `📉 ${token.priceChange5m.toFixed(1)}%`;
    const alert = `🎯 *NEW TOKEN SNIPE OPPORTUNITY*\n\n` +
      `🪙 ${token.name} (${token.symbol})\n` +
      `💰 Price: $${token.priceUsd.toFixed(8)}\n` +
      `💧 Liquidity: $${(token.liquidity / 1000).toFixed(1)}K\n` +
      `📊 Volume 24h: $${(token.volume24h / 1000).toFixed(1)}K\n` +
      `${momentum} 5min | ${token.priceChange1h > 0 ? '📈' : '📉'} ${token.priceChange1h.toFixed(1)}% 1h\n` +
      `⏰ Age: ${token.age} minutes\n\n` +
      `🔗 ${token.url}\n\n` +
      (this.config.autoBuy
        ? `⚡ Auto-buying $${this.config.maxBuyUSD}...`
        : `💡 Reply /snipe ${token.symbol} to buy $${this.config.maxBuyUSD}`);

    await sendTelegramAlert(alert);

    if (this.config.autoBuy) {
      tradeQueue.enqueue({
        type: 'BUY',
        token: token.address,
        amount: this.config.maxBuyUSD,
        denom: 'USD',
        slippagePct: 2.0
      });
    }
  }

  async scanTrending(): Promise<string> {
    try {
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/search?q=solana&sort=volume',
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) return '❌ Could not fetch trending data';

      const data = await response.json() as any;
      const pairs = (data.pairs || [])
        .filter((p: any) => p.chainId === 'solana')
        .slice(0, 8);

      if (!pairs.length) return '❌ No trending tokens found';

      let msg = '🔥 *TRENDING ON SOLANA*\n\n';
      for (const pair of pairs) {
        const change = pair.priceChange?.h1 || 0;
        const arrow = change > 0 ? '📈' : '📉';
        msg += `${arrow} *${pair.baseToken?.symbol}* - $${parseFloat(pair.priceUsd || '0').toFixed(6)}\n`;
        msg += `   ${change > 0 ? '+' : ''}${change.toFixed(1)}% 1h | Vol: $${((pair.volume?.h24 || 0) / 1000).toFixed(0)}K\n\n`;
      }

      return msg;
    } catch (error) {
      return '❌ Could not fetch trending tokens';
    }
  }

  async getTokenInfo(symbol: string): Promise<string> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${symbol}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) return `❌ Could not find ${symbol}`;

      const data = await response.json() as any;
      const pair = (data.pairs || [])
        .filter((p: any) => p.chainId === 'solana' && p.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase())
        .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

      if (!pair) return `❌ ${symbol} not found on Solana`;

      const change1h = pair.priceChange?.h1 || 0;
      const change24h = pair.priceChange?.h24 || 0;
      const arrow1h = change1h > 0 ? '📈' : '📉';
      const arrow24h = change24h > 0 ? '📈' : '📉';

      return `🔍 *${pair.baseToken.name} (${symbol})*\n\n` +
        `💰 Price: $${parseFloat(pair.priceUsd || '0').toFixed(8)}\n` +
        `${arrow1h} 1h: ${change1h > 0 ? '+' : ''}${change1h.toFixed(2)}%\n` +
        `${arrow24h} 24h: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%\n` +
        `💧 Liquidity: $${((pair.liquidity?.usd || 0) / 1000).toFixed(1)}K\n` +
        `📊 Volume 24h: $${((pair.volume?.h24 || 0) / 1000).toFixed(1)}K\n` +
        `🔗 ${pair.url}`;
    } catch {
      return `❌ Error fetching ${symbol} data`;
    }
  }
}

export const tokenSniper = new TokenSniper();

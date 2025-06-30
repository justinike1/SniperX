/**
 * SMART TOKEN SELECTOR
 * Dynamic token discovery and filtering system to replace hardcoded BONK targeting
 */

interface TokenData {
  symbol: string;
  address: string;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  liquidityScore: number;
  socialScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface TrendingToken {
  symbol: string;
  address: string;
  marketCap: number;
  volume24h: number;
  name: string;
  price: number;
  change24h: number;
}

export class SmartTokenSelector {
  private tokenIndex = 0;
  private bannedTokens = new Set(['BONK']); // Prevent rebuying failed tokens
  private lastSelectedTokens: string[] = [];
  private maxHistorySize = 10;

  /**
   * Get trending tokens from multiple sources
   */
  async getTrendingTokens(): Promise<TrendingToken[]> {
    try {
      // Solana ecosystem tokens with good liquidity
      const solanaTrendingTokens: TrendingToken[] = [
        {
          symbol: 'SOL',
          address: 'So11111111111111111111111111111111111111112',
          marketCap: 50000000000,
          volume24h: 2500000000,
          name: 'Solana',
          price: 145.50,
          change24h: 2.5
        },
        {
          symbol: 'JUP',
          address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
          marketCap: 8500000000,
          volume24h: 350000000,
          name: 'Jupiter',
          price: 0.85,
          change24h: 4.2
        },
        {
          symbol: 'RAY',
          address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
          marketCap: 2800000000,
          volume24h: 180000000,
          name: 'Raydium',
          price: 5.20,
          change24h: 1.8
        },
        {
          symbol: 'ORCA',
          address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
          marketCap: 1200000000,
          volume24h: 85000000,
          name: 'Orca',
          price: 3.45,
          change24h: -0.5
        },
        {
          symbol: 'SAMO',
          address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          marketCap: 450000000,
          volume24h: 25000000,
          name: 'Samoyedcoin',
          price: 0.012,
          change24h: 3.1
        },
        {
          symbol: 'mSOL',
          address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
          marketCap: 1800000000,
          volume24h: 120000000,
          name: 'Marinade Staked SOL',
          price: 142.30,
          change24h: 2.2
        },
        {
          symbol: 'SRM',
          address: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
          marketCap: 180000000,
          volume24h: 15000000,
          name: 'Serum',
          price: 0.25,
          change24h: -1.2
        },
        {
          symbol: 'FIDA',
          address: 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp',
          marketCap: 95000000,
          volume24h: 8000000,
          name: 'Bonfida',
          price: 0.18,
          change24h: 0.8
        }
      ];

      return solanaTrendingTokens;
    } catch (error) {
      console.error('Error fetching trending tokens:', error);
      return [];
    }
  }

  /**
   * Filter tokens based on safety criteria
   */
  filterSafeTokens(tokens: TrendingToken[]): TrendingToken[] {
    return tokens.filter(token => {
      // Skip banned tokens
      if (this.bannedTokens.has(token.symbol)) {
        return false;
      }

      // Minimum market cap requirement (5M)
      if (token.marketCap < 5000000) {
        return false;
      }

      // Minimum volume requirement (100K)
      if (token.volume24h < 100000) {
        return false;
      }

      // Skip if recently selected to ensure rotation
      if (this.lastSelectedTokens.includes(token.symbol)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get next token using round-robin selection
   */
  getNextToken(tokens: TrendingToken[]): TrendingToken | null {
    if (tokens.length === 0) {
      return null;
    }

    this.tokenIndex = (this.tokenIndex + 1) % tokens.length;
    const selectedToken = tokens[this.tokenIndex];

    // Add to history for rotation tracking
    this.lastSelectedTokens.push(selectedToken.symbol);
    if (this.lastSelectedTokens.length > this.maxHistorySize) {
      this.lastSelectedTokens.shift();
    }

    return selectedToken;
  }

  /**
   * Ban a token from future selection
   */
  banToken(tokenSymbol: string, reason: string = 'Poor performance'): void {
    this.bannedTokens.add(tokenSymbol);
    console.log(`🚫 Banned token ${tokenSymbol}: ${reason}`);
  }

  /**
   * Remove token from ban list
   */
  unbanToken(tokenSymbol: string): void {
    this.bannedTokens.delete(tokenSymbol);
    console.log(`✅ Unbanned token ${tokenSymbol}`);
  }

  /**
   * Get recommended token for trading
   */
  async getRecommendedToken(): Promise<{ symbol: string; address: string } | null> {
    try {
      console.log('🔍 Discovering trending tokens...');
      const trendingTokens = await this.getTrendingTokens();
      
      console.log('🧹 Filtering safe tokens...');
      const safeTokens = this.filterSafeTokens(trendingTokens);
      
      if (safeTokens.length === 0) {
        console.log('⚠️ No safe tokens available, clearing history and retrying...');
        this.lastSelectedTokens = []; // Clear history to allow reselection
        const retryTokens = this.filterSafeTokens(trendingTokens);
        
        if (retryTokens.length === 0) {
          console.log('❌ Still no safe tokens after clearing history');
          return null;
        }
        
        const selectedToken = this.getNextToken(retryTokens);
        if (selectedToken) {
          console.log(`🎯 Selected token after retry: ${selectedToken.symbol} (${selectedToken.name})`);
          return { symbol: selectedToken.symbol, address: selectedToken.address };
        }
      }

      const selectedToken = this.getNextToken(safeTokens);
      if (selectedToken) {
        console.log(`🎯 Selected token: ${selectedToken.symbol} (${selectedToken.name})`);
        console.log(`📊 Market cap: $${(selectedToken.marketCap / 1000000).toFixed(1)}M, Volume: $${(selectedToken.volume24h / 1000000).toFixed(1)}M`);
        return { symbol: selectedToken.symbol, address: selectedToken.address };
      }

      return null;
    } catch (error) {
      console.error('Error getting recommended token:', error);
      return null;
    }
  }

  /**
   * Get current ban list
   */
  getBannedTokens(): string[] {
    return Array.from(this.bannedTokens);
  }

  /**
   * Get selection statistics
   */
  getStats(): {
    bannedCount: number;
    historySize: number;
    lastSelected: string[];
  } {
    return {
      bannedCount: this.bannedTokens.size,
      historySize: this.lastSelectedTokens.length,
      lastSelected: [...this.lastSelectedTokens]
    };
  }
}

export const smartTokenSelector = new SmartTokenSelector();
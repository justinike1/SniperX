import { Connection, PublicKey } from '@solana/web3.js';

export class RealMarketDataService {
  private connection: Connection;
  private heliusApiKey: string | null;
  private jupiterApiKey: string | null;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.heliusApiKey = process.env.HELIUS_API_KEY || null;
    this.jupiterApiKey = process.env.JUPITER_API_KEY || null;
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      // Jupiter Price API for real-time prices
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${tokenAddress}`);
      const data = await response.json();
      
      if (data.data && data.data[tokenAddress]) {
        return data.data[tokenAddress].price;
      }

      // Fallback to DEX Screener API
      const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
      const dexData = await dexResponse.json();
      
      if (dexData.pairs && dexData.pairs.length > 0) {
        return parseFloat(dexData.pairs[0].priceUsd);
      }

      return 0;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return 0;
    }
  }

  async getTokenMetadata(tokenAddress: string) {
    try {
      if (this.heliusApiKey) {
        // Use Helius API for enhanced metadata
        const response = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${this.heliusApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mintAccounts: [tokenAddress] })
        });
        const data = await response.json();
        return data[0] || null;
      }

      // Fallback to basic token info
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        return {
          name: pair.baseToken.name,
          symbol: pair.baseToken.symbol,
          logoURI: pair.info?.imageUrl,
          marketCap: pair.marketCap,
          volume24h: pair.volume.h24,
          priceChange24h: pair.priceChange.h24
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }

  async getNewTokens(limit = 50) {
    try {
      // Get new tokens from DEX Screener
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens');
      const data = await response.json();
      
      return data.pairs
        .filter((pair: any) => pair.chainId === 'solana')
        .slice(0, limit)
        .map((pair: any) => ({
          address: pair.baseToken.address,
          name: pair.baseToken.name,
          symbol: pair.baseToken.symbol,
          price: parseFloat(pair.priceUsd),
          marketCap: pair.marketCap,
          volume24h: pair.volume.h24,
          priceChange24h: pair.priceChange.h24,
          liquidity: pair.liquidity?.usd || 0,
          age: pair.pairCreatedAt ? Date.now() - new Date(pair.pairCreatedAt).getTime() : 0
        }));
    } catch (error) {
      console.error('Error fetching new tokens:', error);
      return [];
    }
  }

  async getTokenHolders(tokenAddress: string) {
    try {
      if (this.heliusApiKey) {
        const response = await fetch(`https://api.helius.xyz/v0/addresses/${tokenAddress}/balances?api-key=${this.heliusApiKey}`);
        const data = await response.json();
        return data.tokens || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching token holders:', error);
      return [];
    }
  }

  async getWhaleTransactions(tokenAddress: string, minAmount = 10000) {
    try {
      if (this.heliusApiKey) {
        const response = await fetch(`https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${this.heliusApiKey}&limit=50`);
        const data = await response.json();
        
        return data
          .filter((tx: any) => tx.amount && tx.amount >= minAmount)
          .map((tx: any) => ({
            signature: tx.signature,
            amount: tx.amount,
            timestamp: tx.timestamp,
            from: tx.feePayer,
            type: tx.type
          }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching whale transactions:', error);
      return [];
    }
  }

  async analyzeTradingOpportunity(tokenAddress: string) {
    try {
      const [price, metadata, holders, whaleActivity] = await Promise.all([
        this.getTokenPrice(tokenAddress),
        this.getTokenMetadata(tokenAddress),
        this.getTokenHolders(tokenAddress),
        this.getWhaleTransactions(tokenAddress)
      ]);

      // Calculate opportunity score
      let score = 0;
      let signals = [];

      // Price momentum
      if (metadata?.priceChange24h > 10) {
        score += 25;
        signals.push('Strong upward momentum');
      }

      // Volume analysis
      if (metadata?.volume24h > 100000) {
        score += 20;
        signals.push('High trading volume');
      }

      // Whale activity
      if (whaleActivity.length > 3) {
        score += 15;
        signals.push('Increased whale activity');
      }

      // Market cap assessment
      if (metadata?.marketCap > 1000000 && metadata?.marketCap < 10000000) {
        score += 20;
        signals.push('Optimal market cap range');
      }

      // Liquidity check
      if (metadata?.liquidity > 50000) {
        score += 20;
        signals.push('Sufficient liquidity');
      }

      return {
        tokenAddress,
        opportunityScore: score,
        signals,
        price,
        metadata,
        recommendation: score > 60 ? 'BUY' : score > 40 ? 'WATCH' : 'AVOID',
        confidence: Math.min(score / 100, 0.95)
      };
    } catch (error) {
      console.error('Error analyzing trading opportunity:', error);
      return {
        tokenAddress,
        opportunityScore: 0,
        signals: ['Analysis failed'],
        price: 0,
        metadata: null,
        recommendation: 'AVOID',
        confidence: 0
      };
    }
  }

  async getJupiterQuote(inputMint: string, outputMint: string, amount: number) {
    try {
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
      );
      return await response.json();
    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      return null;
    }
  }

  isConfigured(): boolean {
    return !!(this.connection && (this.heliusApiKey || this.jupiterApiKey));
  }

  getConnectionStatus() {
    return {
      rpcConnected: !!this.connection,
      heliusConfigured: !!this.heliusApiKey,
      jupiterConfigured: !!this.jupiterApiKey,
      fullyConfigured: this.isConfigured()
    };
  }
}
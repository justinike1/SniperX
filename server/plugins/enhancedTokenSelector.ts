/**
 * ENHANCED TOKEN SELECTOR PLUGIN
 * Smart token selection with volume and market cap filtering
 */

import { TradingPlugin, TradingContext, TradingResult } from './pluginManager';
import { isTokenBanned } from '../utils/tokenBlacklist';

let tokenIndex = 0;
const bannedTokens = ['BONK', 'SCAM', 'RUGPULL', 'FAKE'];

interface TokenCandidate {
  symbol: string;
  tokenAddress: string;
  volume: number;
  marketCap: number;
  price: number;
  amount: number;
  score?: number;
}

export class EnhancedTokenSelectorPlugin implements TradingPlugin {
  name = 'EnhancedTokenSelector';
  version = '1.0.0';
  description = 'Smart token selection with volume and market cap filtering';
  enabled = false;

  private minVolume = 100000; // $100k minimum volume
  private minMarketCap = 5000000; // $5M minimum market cap
  private maxRiskTokens = 3; // Maximum high-risk tokens

  async initialize(): Promise<void> {
    console.log('🎯 Enhanced Token Selector Plugin initialized');
  }

  async execute(context: TradingContext): Promise<TradingResult> {
    try {
      const candidate = await this.getTradeCandidate();
      
      if (!candidate) {
        return {
          success: true,
          action: 'SKIP',
          reason: 'No safe tokens found matching criteria'
        };
      }

      // Calculate confidence based on token metrics
      const confidence = this.calculateTokenConfidence(candidate);

      return {
        success: true,
        action: 'BUY',
        token: candidate.symbol,
        amount: candidate.amount,
        confidence,
        reason: `Safe token found: Volume $${(candidate.volume / 1000000).toFixed(1)}M, MarketCap $${(candidate.marketCap / 1000000).toFixed(1)}M`
      };

    } catch (error) {
      return {
        success: false,
        reason: `Token selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('🔌 Enhanced Token Selector Plugin cleaned up');
  }

  private async getTradeCandidate(): Promise<TokenCandidate | null> {
    const trendingTokens = await this.fetchTrendingTokens();
    const filtered = trendingTokens.filter(token =>
      token.volume > this.minVolume && 
      token.marketCap > this.minMarketCap && 
      !bannedTokens.includes(token.symbol) &&
      !isTokenBanned(token.symbol, token.tokenAddress)
    );

    if (filtered.length === 0) {
      throw new Error('No safe tokens found');
    }

    // Add scoring based on volume and market cap
    const scoredTokens = filtered.map(token => ({
      ...token,
      score: this.calculateTokenScore(token)
    })).sort((a, b) => (b.score || 0) - (a.score || 0));

    tokenIndex = (tokenIndex + 1) % scoredTokens.length;
    return scoredTokens[tokenIndex];
  }

  private async fetchTrendingTokens(): Promise<TokenCandidate[]> {
    // Enhanced token list with real Solana ecosystem tokens
    return [
      { 
        symbol: 'JUP', 
        tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', 
        volume: 15000000, 
        marketCap: 850000000, 
        price: 0.95, 
        amount: 0.05 
      },
      { 
        symbol: 'RAY', 
        tokenAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', 
        volume: 8500000, 
        marketCap: 420000000, 
        price: 4.2, 
        amount: 0.05 
      },
      { 
        symbol: 'ORCA', 
        tokenAddress: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', 
        volume: 6200000, 
        marketCap: 380000000, 
        price: 3.8, 
        amount: 0.05 
      },
      { 
        symbol: 'SOLAPE', 
        tokenAddress: 'XYZ123', 
        volume: 2000000, 
        marketCap: 10000000, 
        price: 0.05, 
        amount: 0.05 
      }
    ];
  }

  private calculateTokenScore(token: TokenCandidate): number {
    // Volume score (higher is better)
    const volumeScore = Math.min(token.volume / 10000000, 1) * 40;
    
    // Market cap score (higher is better, but not too high)
    const marketCapScore = Math.min(token.marketCap / 100000000, 1) * 30;
    
    // Price stability score (avoid extreme prices)
    const priceScore = token.price > 0.001 && token.price < 100 ? 20 : 0;
    
    // Safety bonus for known tokens
    const safetyBonus = ['JUP', 'RAY', 'ORCA'].includes(token.symbol) ? 10 : 0;

    return volumeScore + marketCapScore + priceScore + safetyBonus;
  }

  private calculateTokenConfidence(token: TokenCandidate): number {
    const score = token.score || 0;
    return Math.min(Math.max(score, 60), 95); // Confidence between 60-95%
  }
}
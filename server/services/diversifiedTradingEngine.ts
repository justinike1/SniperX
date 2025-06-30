import { enhancedAITradingEngine } from './enhancedAITradingEngine';
import { executeSwap, getBestRoute } from '../utils/jupiterClient';
import { sendTelegramAlert } from '../utils/telegramAlert';
import { fundProtectionService } from '../utils/fundProtectionService';
import { transactionReceiptLogger } from '../utils/transactionReceiptLogger';
import { logTrade } from '../utils/tradeLogger';
import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../config';

interface TokenOpportunity {
  symbol: string;
  address: string;
  confidence: number;
  prediction: string;
  marketCap?: number;
  volume24h?: number;
  priceChange24h?: number;
  liquidity?: number;
}

interface DiversificationConfig {
  maxPositionsPerToken: number;
  maxTotalPositions: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  diversificationTargets: string[];
  velocityMode: boolean;
}

export class DiversifiedTradingEngine {
  private connection: Connection;
  private activePositions: Map<string, number> = new Map();
  private diversificationConfig: DiversificationConfig;
  private lastTradeTime: Map<string, number> = new Map();
  private tokenRotationIndex = 0;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    this.diversificationConfig = {
      maxPositionsPerToken: 3, // Max 3 positions per token
      maxTotalPositions: 15, // Max 15 total positions
      minTradeAmount: 0.001,
      maxTradeAmount: 0.01,
      velocityMode: true,
      diversificationTargets: [
        // Major tokens with high liquidity
        'So11111111111111111111111111111111111111112', // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
        'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // bSOL
        'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', // RND
        '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', // SAMO
        'So11111111111111111111111111111111111111112', // Wrapped SOL
        // Meme tokens with high velocity potential
        'CATCHejFEtKayjupN1JBZX8LBFzKvJDDjqT8N34m6c1A', // CATCH
        '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4', // JLP
        'SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y', // SHDW
        'HNHV3Rq2dYjkzz4vHh1B4vT3BYiMLzD5j2Kh9d8WzNwF', // HNT
        'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk', // WEN
        // DeFi tokens
        'CKfatsPMUf8SkiURsDXs7eK6GWb4Jsd6UDbs7twMCWxo', // RAY
        'So11111111111111111111111111111111111111112', // Raydium
        'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', // ORCA
        'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac', // MNGO
        'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6', // KIN
      ]
    };
  }

  /**
   * Execute diversified trading across multiple tokens for maximum velocity
   */
  async executeDiversifiedTrading(): Promise<void> {
    try {
      console.log('🌐 DIVERSIFIED TRADING: Analyzing multiple token opportunities...');
      
      // Get current portfolio balance
      const totalPositions = Array.from(this.activePositions.values()).reduce((sum, count) => sum + count, 0);
      
      if (totalPositions >= this.diversificationConfig.maxTotalPositions) {
        console.log(`⚠️ Maximum positions reached (${totalPositions}/${this.diversificationConfig.maxTotalPositions})`);
        return;
      }

      // Analyze multiple tokens simultaneously
      const opportunities = await this.analyzeMultipleTokens();
      
      // Filter and prioritize opportunities
      const tradableOpportunities = this.filterTradableOpportunities(opportunities);
      
      // Execute trades across multiple tokens
      await this.executeMultiTokenTrades(tradableOpportunities);
      
    } catch (error) {
      console.error('❌ Diversified trading error:', error);
      await sendTelegramAlert(`🚨 Diversified Trading Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze multiple tokens for trading opportunities
   */
  private async analyzeMultipleTokens(): Promise<TokenOpportunity[]> {
    const opportunities: TokenOpportunity[] = [];
    const targetTokens = this.getRotatedTokenSelection();
    
    console.log(`🔍 Analyzing ${targetTokens.length} tokens for opportunities...`);
    
    // Analyze each token in parallel for speed
    const analysisPromises = targetTokens.map(async (tokenAddress) => {
      try {
        const symbol = this.getTokenSymbol(tokenAddress);
        const prediction = await enhancedAITradingEngine.analyzeTradingOpportunity(symbol);
        
        if (prediction.confidence >= 75) { // Lower threshold for diversified trading
          opportunities.push({
            symbol,
            address: tokenAddress,
            confidence: prediction.confidence,
            prediction: prediction.prediction,
            marketCap: 0,
            volume24h: 0,
            priceChange24h: 0
          });
        }
      } catch (error) {
        console.log(`⚠️ Failed to analyze ${tokenAddress}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    });
    
    await Promise.allSettled(analysisPromises);
    
    // Sort by confidence and filter by prediction type
    return opportunities
      .filter(op => op.prediction === 'STRONG_BUY' || op.prediction === 'BUY')
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get rotated selection of tokens to ensure diversity
   */
  private getRotatedTokenSelection(): string[] {
    const targets = this.diversificationConfig.diversificationTargets;
    const batchSize = 8; // Analyze 8 tokens per cycle
    
    // Rotate through different token batches for maximum coverage
    const startIndex = (this.tokenRotationIndex * batchSize) % targets.length;
    const selectedTokens: string[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      const index = (startIndex + i) % targets.length;
      selectedTokens.push(targets[index]);
    }
    
    this.tokenRotationIndex++;
    return selectedTokens;
  }

  /**
   * Filter opportunities based on diversification rules
   */
  private filterTradableOpportunities(opportunities: TokenOpportunity[]): TokenOpportunity[] {
    const tradable: TokenOpportunity[] = [];
    const now = Date.now();
    
    for (const opportunity of opportunities) {
      // Check position limits per token
      const currentPositions = this.activePositions.get(opportunity.address) || 0;
      if (currentPositions >= this.diversificationConfig.maxPositionsPerToken) {
        continue;
      }
      
      // Check cooldown period (prevent rapid trading same token)
      const lastTrade = this.lastTradeTime.get(opportunity.address) || 0;
      const cooldownPeriod = 60000; // 1 minute cooldown
      if (now - lastTrade < cooldownPeriod) {
        continue;
      }
      
      // Add to tradable list
      tradable.push(opportunity);
    }
    
    // Limit to 5 simultaneous trades for velocity
    return tradable.slice(0, 5);
  }

  /**
   * Execute trades across multiple tokens simultaneously
   */
  private async executeMultiTokenTrades(opportunities: TokenOpportunity[]): Promise<void> {
    if (opportunities.length === 0) {
      console.log('📊 No suitable diversified trading opportunities found');
      return;
    }
    
    console.log(`🚀 EXECUTING ${opportunities.length} DIVERSIFIED TRADES:`);
    opportunities.forEach((op, index) => {
      console.log(`  ${index + 1}. ${op.symbol} - ${op.confidence}% confidence`);
    });
    
    // Calculate trade amounts based on confidence and diversification
    const tradePromises = opportunities.map(async (opportunity, index) => {
      try {
        // Dynamic position sizing based on confidence
        const baseAmount = this.diversificationConfig.minTradeAmount;
        const confidenceMultiplier = opportunity.confidence / 100;
        const diversificationMultiplier = 1 / opportunities.length; // Spread across all trades
        
        const tradeAmount = Math.min(
          baseAmount * confidenceMultiplier * (1 + diversificationMultiplier),
          this.diversificationConfig.maxTradeAmount
        );
        
        await this.executeTokenBuy(opportunity, tradeAmount);
        
        // Update tracking
        this.activePositions.set(opportunity.address, (this.activePositions.get(opportunity.address) || 0) + 1);
        this.lastTradeTime.set(opportunity.address, Date.now());
        
      } catch (error) {
        console.error(`❌ Failed to execute trade for ${opportunity.symbol}:`, error);
      }
    });
    
    // Execute all trades in parallel for maximum velocity
    await Promise.allSettled(tradePromises);
    
    console.log('🌟 DIVERSIFIED TRADING ROUND COMPLETED');
  }

  /**
   * Execute individual token buy with fund protection
   */
  private async executeTokenBuy(opportunity: TokenOpportunity, tradeAmount: number): Promise<void> {
    try {
      console.log(`💎 BUYING ${opportunity.symbol}: ${tradeAmount} SOL (${opportunity.confidence}% confidence)`);
      
      // Get Jupiter quote and route
      const quote = await getBestRoute(
        'So11111111111111111111111111111111111111112', // SOL
        opportunity.address,
        tradeAmount * 1e9 // Convert to lamports
      );
      
      if (!quote) {
        throw new Error(`No route found for ${opportunity.symbol}`);
      }
      
      // Execute swap
      const swapResult = await executeSwap(quote);
      
      if (swapResult && typeof swapResult === 'string') {
        // Calculate estimated tokens received
        const estimatedTokensReceived = parseInt(quote.outAmount) / 1e9;
        
        // Add fund protection
        const protectionId = fundProtectionService.addProtectedPosition(
          opportunity.symbol,
          opportunity.address,
          estimatedTokensReceived,
          tradeAmount,
          swapResult
        );
        
        // Log transaction
        await transactionReceiptLogger.logBuyTransaction({
          tokenSymbol: opportunity.symbol,
          tokenAddress: opportunity.address,
          solAmount: tradeAmount,
          tokenAmount: estimatedTokensReceived,
          txHash: swapResult,
          confidence: opportunity.confidence,
          priceImpact: parseFloat(quote.priceImpactPct || '0')
        });
        
        // Send alert
        await sendTelegramAlert(
          `🚀 DIVERSIFIED BUY: ${opportunity.symbol}\n` +
          `💰 Amount: ${tradeAmount} SOL\n` +
          `📊 Confidence: ${opportunity.confidence}%\n` +
          `🛡️ Fund Protection: Active\n` +
          `🔗 TX: ${swapResult.slice(0, 20)}...`
        );
        
        console.log(`✅ ${opportunity.symbol} BUY COMPLETED: ${swapResult}`);
        
      } else {
        throw new Error(`Swap failed for ${opportunity.symbol}`);
      }
      
    } catch (error) {
      console.error(`❌ Token buy failed for ${opportunity.symbol}:`, error);
      await sendTelegramAlert(`🚨 BUY FAILED: ${opportunity.symbol} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get token symbol from address (simplified mapping)
   */
  private getTokenSymbol(address: string): string {
    const tokenMap: { [key: string]: string } = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
      'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': 'bSOL',
      'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': 'RND',
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': 'SAMO',
      'CKfatsPMUf8SkiURsDXs7eK6GWb4Jsd6UDbs7twMCWxo': 'RAY',
      'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'ORCA',
      'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac': 'MNGO',
      'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6': 'KIN'
    };
    
    return tokenMap[address] || address.slice(0, 8);
  }

  /**
   * Get diversification statistics
   */
  getDiversificationStats() {
    const totalPositions = Array.from(this.activePositions.values()).reduce((sum, count) => sum + count, 0);
    const uniqueTokens = this.activePositions.size;
    
    return {
      totalPositions,
      uniqueTokens,
      maxPositions: this.diversificationConfig.maxTotalPositions,
      velocityMode: this.diversificationConfig.velocityMode,
      averagePositionsPerToken: uniqueTokens > 0 ? totalPositions / uniqueTokens : 0,
      diversificationRatio: uniqueTokens / this.diversificationConfig.diversificationTargets.length
    };
  }

  /**
   * Reset position tracking (use with caution)
   */
  resetPositionTracking() {
    this.activePositions.clear();
    this.lastTradeTime.clear();
    this.tokenRotationIndex = 0;
    console.log('🔄 Position tracking reset for fresh diversification');
  }
}

export const diversifiedTradingEngine = new DiversifiedTradingEngine();
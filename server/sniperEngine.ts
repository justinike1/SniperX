// Autonomous Sniper Engine - Alfred-style intelligent trading bot
import { Connection, PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';

interface TradingConfig {
  scanIntervalMs: number;
  minConfidenceScore: number;
  defaultTradeAmount: number;
  maxPositions: number;
  profitTarget: number;
  stopLoss: number;
  momentumThreshold: number;
  volumeThreshold: number;
}

interface Position {
  token: string;
  entryPrice: number;
  amount: number;
  timestamp: number;
  confidence: number;
  reasons: string[];
}

interface Trade {
  token: string;
  action: string;
  timestamp: number;
}

class SniperEngine {
  private isRunning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private baseUrl: string = process.env.BACKEND_URL || 'http://localhost:5000';
  private connection: Connection;
  private config: TradingConfig;
  private activePositions: Map<string, Position>;
  private recentTrades: Trade[];
  private blacklistedTokens: Set<string>;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // Trading parameters
    this.config = {
      scanIntervalMs: 30000, // Scan every 30 seconds
      minConfidenceScore: 0.75, // Minimum confidence to trade
      defaultTradeAmount: 0.05, // Default 0.05 SOL per trade
      maxPositions: 5, // Maximum concurrent positions
      profitTarget: 0.08, // 8% profit target
      stopLoss: 0.02, // 2% stop loss
      momentumThreshold: 50, // Minimum momentum score
      volumeThreshold: 100000, // Minimum 24h volume in USD
    };
    
    this.activePositions = new Map();
    this.recentTrades = [];
    this.blacklistedTokens = new Set(['BONK']); // Tokens to avoid
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Sniper Engine already running');
      return;
    }

    console.log('🎯 SNIPER ENGINE ACTIVATED');
    console.log(`📊 Scan interval: ${this.config.scanIntervalMs / 1000}s`);
    console.log(`💰 Trade amount: ${this.config.defaultTradeAmount} SOL`);
    console.log(`🎯 Profit target: ${this.config.profitTarget * 100}%`);
    console.log(`🛡️ Stop loss: ${this.config.stopLoss * 100}%`);
    
    this.isRunning = true;
    
    // Start scanning immediately
    await this.scanAndTrade();
    
    // Then continue on interval
    this.scanInterval = setInterval(async () => {
      await this.scanAndTrade();
    }, this.config.scanIntervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log('🛑 Sniper Engine stopped');
    this.isRunning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  async scanAndTrade() {
    try {
      console.log('🔍 Scanning for opportunities...');
      
      // Get trending tokens
      const trending = await this.getTrendingTokens();
      
      // Get market intelligence
      const socialSignals = await this.getSocialSignals();
      const insiderActivity = await this.getInsiderActivity();
      
      // Analyze each trending token
      for (const token of trending) {
        if (this.blacklistedTokens.has(token.symbol)) continue;
        if (this.activePositions.size >= this.config.maxPositions) {
          console.log('📦 Max positions reached, skipping new trades');
          break;
        }
        
        const analysis = await this.analyzeToken(token, socialSignals, insiderActivity);
        
        if (analysis.shouldBuy) {
          await this.executeBuy(token, analysis);
        }
      }
      
      // Check existing positions for exit opportunities
      await this.checkExitConditions();
      
    } catch (error) {
      console.error('❌ Scan error:', error);
    }
  }

  async getTrendingTokens() {
    try {
      const response = await fetch(`${this.baseUrl}/api/intelligence/trending`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching trending tokens:', error);
      return [];
    }
  }

  async getSocialSignals() {
    try {
      const response = await fetch(`${this.baseUrl}/api/intelligence/social-signals`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      return [];
    }
  }

  async getInsiderActivity() {
    try {
      const response = await fetch(`${this.baseUrl}/api/intelligence/insider-activity`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      return [];
    }
  }

  async analyzeToken(token, socialSignals, insiderActivity) {
    const analysis = {
      token: token.symbol,
      shouldBuy: false,
      confidence: 0,
      reasons: [],
      risks: []
    };

    // Alfred-style decision matrix
    let score = 0;
    const factors = [];

    // 1. Momentum Analysis (0-30 points)
    if (token.momentum > this.config.momentumThreshold) {
      const momentumScore = Math.min(30, token.momentum * 0.3);
      score += momentumScore;
      factors.push(`Strong momentum: ${token.momentum.toFixed(1)}`);
    } else {
      analysis.risks.push('Low momentum');
    }

    // 2. Social Sentiment (0-25 points)
    const tokenSocial = socialSignals.filter(s => 
      s.tokenMention === token.symbol || (s.content && s.content.includes(token.symbol))
    );
    
    if (tokenSocial.length > 0) {
      const avgSentiment = tokenSocial.reduce((acc, s) => acc + (s.confidence || 0), 0) / tokenSocial.length;
      const socialScore = avgSentiment * 25;
      score += socialScore;
      
      if (avgSentiment > 0.8) {
        factors.push(`High social sentiment: ${(avgSentiment * 100).toFixed(0)}%`);
      }
    }

    // 3. Whale Activity (0-25 points)
    const whaleActivity = insiderActivity.filter(i => 
      i.tokenSymbol === token.symbol && i.type === 'WHALE_MOVEMENT'
    );
    
    if (whaleActivity.length > 0) {
      score += 25;
      factors.push('Whale accumulation detected');
    }

    // 4. Volume Check (0-20 points)
    if (token.volume24h > this.config.volumeThreshold) {
      score += 20;
      factors.push(`High volume: $${(token.volume24h / 1000).toFixed(0)}K`);
    } else {
      analysis.risks.push('Low volume');
    }

    // 5. Price Action Analysis
    if (token.priceChange24h > 5 && token.priceChange24h < 50) {
      score += 10;
      factors.push(`Healthy price action: +${token.priceChange24h.toFixed(1)}%`);
    } else if (token.priceChange24h > 50) {
      analysis.risks.push('Potential pump - too risky');
      score -= 20;
    } else if (token.priceChange24h < -10) {
      analysis.risks.push('Negative price action');
      score -= 10;
    }

    // Calculate confidence score (0-1)
    analysis.confidence = Math.max(0, Math.min(1, score / 100));
    
    // Decision logic
    if (analysis.confidence >= this.config.minConfidenceScore && analysis.risks.length < 2) {
      analysis.shouldBuy = true;
      analysis.reasons = factors;
      
      console.log(`✅ BUY SIGNAL: ${token.symbol}`);
      console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
      console.log(`   Factors: ${factors.join(', ')}`);
    } else if (analysis.confidence > 0.5) {
      console.log(`🤔 Watching ${token.symbol} - Score: ${score}/100`);
    }

    return analysis;
  }

  async executeBuy(token, analysis) {
    try {
      // Check if we already have this position
      if (this.activePositions.has(token.symbol)) {
        console.log(`📋 Already holding ${token.symbol}`);
        return;
      }

      // Check recent trades to avoid spam
      const recentTrade = this.recentTrades.find(t => 
        t.token === token.symbol && 
        Date.now() - t.timestamp < 300000 // 5 minutes
      );
      
      if (recentTrade) {
        console.log(`⏳ Too soon to trade ${token.symbol} again`);
        return;
      }

      console.log(`🎯 Executing BUY: ${token.symbol}`);
      
      // Call the backend buy endpoint
      const response = await fetch(`${this.baseUrl}/api/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenMint: token.symbol,
          amount: this.config.defaultTradeAmount.toString(),
          mode: process.env.ENABLE_LIVE_TRADING === 'true' ? 'live' : 'simulated'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Track the position
        this.activePositions.set(token.symbol, {
          token: token.symbol,
          entryPrice: token.currentPrice || 0,
          amount: this.config.defaultTradeAmount,
          timestamp: Date.now(),
          confidence: analysis.confidence,
          reasons: analysis.reasons
        });
        
        this.recentTrades.push({
          token: token.symbol,
          action: 'BUY',
          timestamp: Date.now()
        });
        
        console.log(`✅ Bought ${token.symbol} - TX: ${result.txid || 'simulated'}`);
        
        // Send Telegram notification
        await this.sendAlert(
          `🎯 SNIPER BUY EXECUTED\n` +
          `Token: ${token.symbol}\n` +
          `Amount: ${this.config.defaultTradeAmount} SOL\n` +
          `Confidence: ${(analysis.confidence * 100).toFixed(0)}%\n` +
          `Reasons: ${analysis.reasons.slice(0, 2).join(', ')}`
        );
      } else {
        console.log(`❌ Buy failed for ${token.symbol}: ${result.reason || result.msg}`);
      }
      
    } catch (error) {
      console.error(`Error executing buy for ${token.symbol}:`, error);
    }
  }

  async checkExitConditions() {
    for (const [symbol, position] of this.activePositions) {
      try {
        // Get current price (in production, fetch real price)
        const currentPrice = await this.getCurrentPrice(symbol);
        
        if (!currentPrice) continue;
        
        const priceChange = (currentPrice - position.entryPrice) / position.entryPrice;
        const holdTime = (Date.now() - position.timestamp) / 1000 / 60; // minutes
        
        let shouldSell = false;
        let reason = '';
        
        // Check profit target
        if (priceChange >= this.config.profitTarget) {
          shouldSell = true;
          reason = `Profit target reached: +${(priceChange * 100).toFixed(1)}%`;
        }
        // Check stop loss
        else if (priceChange <= -this.config.stopLoss) {
          shouldSell = true;
          reason = `Stop loss triggered: ${(priceChange * 100).toFixed(1)}%`;
        }
        // Time-based exit (hold max 2 hours)
        else if (holdTime > 120 && priceChange > 0) {
          shouldSell = true;
          reason = `Time exit with profit: +${(priceChange * 100).toFixed(1)}%`;
        }
        // Cut losses after 1 hour if negative
        else if (holdTime > 60 && priceChange < -0.01) {
          shouldSell = true;
          reason = `Time stop: ${(priceChange * 100).toFixed(1)}%`;
        }
        
        if (shouldSell) {
          await this.executeSell(symbol, position.amount, reason);
        }
        
      } catch (error) {
        console.error(`Error checking exit for ${symbol}:`, error);
      }
    }
  }

  async executeSell(symbol, amount, reason) {
    try {
      console.log(`🔴 Executing SELL: ${symbol} - ${reason}`);
      
      const response = await fetch(`${this.baseUrl}/api/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenMint: symbol,
          amount: amount.toString(),
          mode: process.env.ENABLE_LIVE_TRADING === 'true' ? 'live' : 'simulated'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.activePositions.delete(symbol);
        this.recentTrades.push({
          token: symbol,
          action: 'SELL',
          timestamp: Date.now()
        });
        
        console.log(`✅ Sold ${symbol} - ${reason}`);
        
        await this.sendAlert(
          `🔴 SNIPER SELL EXECUTED\n` +
          `Token: ${symbol}\n` +
          `Reason: ${reason}`
        );
      }
      
    } catch (error) {
      console.error(`Error executing sell for ${symbol}:`, error);
    }
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    // In production, fetch real price from DEX or price feed
    // For now, return simulated price change
    return Math.random() * 2;
  }

  async sendAlert(message: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/telegram/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
    } catch (error) {
      // Silent fail for alerts
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activePositions: this.activePositions.size,
      positions: Array.from(this.activePositions.values()),
      config: this.config
    };
  }
}

// Create and export singleton instance
export const sniperEngine = new SniperEngine();

// Auto-start if configured
if (process.env.AUTO_START_SNIPER === 'true') {
  setTimeout(() => {
    console.log('🚀 Auto-starting Sniper Engine...');
    sniperEngine.start();
  }, 10000); // Wait 10 seconds for server to fully initialize
}
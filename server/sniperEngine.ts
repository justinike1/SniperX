// Autonomous Sniper Engine - AI-Powered intelligent trading bot with Elon Musk level sophistication
import { Connection, PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';
import { aiDecisionEngine, type MarketData } from './utils/aiDecisionEngine';
import { tradingSafety } from './utils/tradingSafety';

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
    
    // ULTRA SAFE Trading parameters after BONK disaster
    this.config = {
      scanIntervalMs: 60000, // Scan every 60 seconds (less aggressive)
      minConfidenceScore: 0.70, // AI must be 70% confident
      defaultTradeAmount: 0.005, // REDUCED: Only 0.005 SOL per trade
      maxPositions: 3, // REDUCED: Maximum 3 concurrent positions
      profitTarget: 0.08, // 8% profit target
      stopLoss: 0.02, // 2% stop loss
      momentumThreshold: 30, // Lowered momentum threshold
      volumeThreshold: 50000, // Minimum 50K volume
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
    console.log(`🤖 AI analyzing ${token.symbol}...`);
    
    // Prepare market data for AI analysis
    const marketData: MarketData = {
      price: token.currentPrice || 0,
      volume24h: token.volume24h || 0,
      priceChange24h: token.priceChange24h || 0,
      marketCap: token.marketCap || 0,
      volatility: Math.abs(token.priceChange24h) || 0,
      socialSentiment: this.calculateSocialSentiment(token, socialSignals),
      technicalIndicators: {
        momentum: token.momentum || 0,
        whaleActivity: insiderActivity.filter(i => i.tokenSymbol === token.symbol).length > 0
      }
    };

    // Get AI decision
    const aiSignal = await aiDecisionEngine.analyzeMarket(token.symbol, marketData);
    
    // Build analysis result
    const analysis = {
      token: token.symbol,
      shouldBuy: false,
      confidence: 0,
      reasons: [],
      risks: [],
      aiRecommendation: aiSignal
    };

    // Apply additional safety checks on top of AI decision
    if (aiSignal.action === 'BUY' && aiSignal.confidence >= this.config.minConfidenceScore * 100) {
      // Check trading safety
      const safetyCheck = await tradingSafety.checkSafety(token.symbol, aiSignal.suggestedAmount);
      
      if (safetyCheck.canTrade) {
        analysis.shouldBuy = true;
        analysis.confidence = aiSignal.confidence / 100;
        analysis.reasons = [
          aiSignal.reasoning,
          `AI Confidence: ${aiSignal.confidence}%`,
          `Risk Level: ${aiSignal.riskLevel}`,
          `Expected Return: ${aiSignal.expectedReturn}%`
        ];
        
        console.log(`✅ AI BUY SIGNAL: ${token.symbol}`);
        console.log(`   🤖 AI Confidence: ${aiSignal.confidence}%`);
        console.log(`   💰 Suggested Amount: ${aiSignal.suggestedAmount} SOL`);
        console.log(`   📝 Reasoning: ${aiSignal.reasoning}`);
      } else {
        console.log(`⚠️ AI wanted to buy ${token.symbol} but safety check failed: ${safetyCheck.reason}`);
        analysis.risks.push(safetyCheck.reason || 'Safety check failed');
      }
    } else if (aiSignal.action === 'SELL') {
      console.log(`🔴 AI SELL SIGNAL: ${token.symbol} - ${aiSignal.reasoning}`);
    } else {
      console.log(`🔍 AI HOLD: ${token.symbol} - ${aiSignal.reasoning}`);
    }

    return analysis;
  }

  private calculateSocialSentiment(token, socialSignals): number {
    const tokenSocial = socialSignals.filter(s => 
      s.tokenMention === token.symbol || (s.content && s.content.includes(token.symbol))
    );
    
    if (tokenSocial.length === 0) return 0;
    
    return tokenSocial.reduce((acc, s) => acc + (s.confidence || 0), 0) / tokenSocial.length;
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
      
      // Use AI-recommended amount or default (whichever is safer)
      const tradeAmount = Math.min(
        analysis.aiRecommendation?.suggestedAmount || this.config.defaultTradeAmount,
        this.config.defaultTradeAmount
      );
      
      console.log(`💰 Trade amount: ${tradeAmount} SOL (AI suggested: ${analysis.aiRecommendation?.suggestedAmount} SOL)`);
      
      // Call the backend buy endpoint with AI-determined amount
      const response = await fetch(`${this.baseUrl}/api/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenMint: token.symbol,
          amount: tradeAmount.toString()
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
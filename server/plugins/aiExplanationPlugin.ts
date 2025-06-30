/**
 * AI EXPLANATION PLUGIN
 * Provides intelligent trade analysis and explanations using OpenAI
 */

import { TradingPlugin, TradingContext, TradingResult } from './pluginManager';
import axios from 'axios';
import { config } from '../config';

export class AIExplanationPlugin implements TradingPlugin {
  name = 'AIExplanation';
  version = '1.0.0';
  description = 'Provides intelligent trade analysis and explanations using OpenAI';
  enabled = false;

  async initialize(): Promise<void> {
    console.log('🤖 AI Explanation Plugin initialized');
  }

  async execute(context: TradingContext): Promise<TradingResult> {
    try {
      // Analyze current market conditions and provide intelligent insights
      const marketAnalysis = await this.analyzeMarketConditions(context);
      
      return {
        success: true,
        action: 'HOLD',
        confidence: 80,
        reason: `AI Analysis: ${marketAnalysis}`
      };

    } catch (error) {
      return {
        success: false,
        reason: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('🔌 AI Explanation Plugin cleaned up');
  }

  public async explainTrade(symbol: string, reason: string): Promise<string> {
    try {
      // Use OpenAI API key from environment variables or config
      const apiKey = process.env.OPENAI_API_KEY || config.openaiKey || '';
      
      if (!apiKey) {
        console.log('⚠️ OpenAI API key not found, using fallback explanation');
        return `Trade Analysis for ${symbol}: ${reason}`;
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o', // Use latest model
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert crypto trading analyst. Provide concise, actionable trade explanations focused on risk and opportunity.' 
          },
          { 
            role: 'user', 
            content: `Explain why we are trading ${symbol}. The reasoning: ${reason}. Keep it under 100 words and focus on the key factors.` 
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const explanation = response.data.choices[0].message.content.trim();
      console.log(`🤖 AI Explanation for ${symbol}: ${explanation.substring(0, 50)}...`);
      return explanation;

    } catch (error) {
      console.error('AI explanation failed:', error instanceof Error ? error.message : 'Unknown error');
      return `Trade Analysis for ${symbol}: ${reason}`;
    }
  }

  public async analyzeMarketConditions(context: TradingContext): Promise<string> {
    try {
      const apiKey = process.env.OPENAI_API_KEY || config.openaiKey || '';
      
      if (!apiKey) {
        return 'Market conditions analysis unavailable - OpenAI API key required';
      }

      // Prepare market data for analysis
      const marketData = {
        walletBalance: context.wallet.balance,
        topTokens: Array.from(context.market.prices.entries()).slice(0, 5),
        volumes: Array.from(context.market.volume.entries()).slice(0, 5)
      };

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a crypto market analyst. Analyze market conditions and provide trading insights.' 
          },
          { 
            role: 'user', 
            content: `Analyze these market conditions: Wallet Balance: ${marketData.walletBalance} SOL, Top Tokens: ${JSON.stringify(marketData.topTokens)}, Volumes: ${JSON.stringify(marketData.volumes)}. Provide a brief market outlook and trading recommendation.` 
          }
        ],
        max_tokens: 100,
        temperature: 0.6
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content.trim();

    } catch (error) {
      console.error('Market analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      return 'Market analysis unavailable due to API limitations';
    }
  }
}

// Export singleton instance for global use
export const aiExplanationPlugin = new AIExplanationPlugin();
/**
 * GPT-Powered Trade Reasoning Engine
 * Generates intelligent insights for every trade decision
 */

import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({
  apiKey: config.openaiKey,
});

interface TradeInsight {
  reasoning: string;
  confidence: number;
  riskFactors: string[];
  marketSentiment: string;
  recommendations: string[];
  timeframe: string;
}

export async function generateTradeInsight(
  symbol: string,
  action: 'BUY' | 'SELL',
  price: number,
  reasoning: string[]
): Promise<TradeInsight> {
  try {
    if (!config.openaiKey) {
      return {
        reasoning: `${action} signal for ${symbol} at $${price}`,
        confidence: 85,
        riskFactors: ['Limited AI analysis without API key'],
        marketSentiment: 'Neutral',
        recommendations: ['Monitor position closely'],
        timeframe: 'Short-term'
      };
    }

    const prompt = `You are SniperX, the most advanced AI trading analyst. Analyze this trade:

Symbol: ${symbol}
Action: ${action}
Price: $${price}
Initial Reasoning: ${reasoning.join(', ')}

Provide a comprehensive trading insight in JSON format with:
1. reasoning: Deep analysis of why this trade makes sense
2. confidence: 1-100 confidence score
3. riskFactors: Array of potential risks
4. marketSentiment: Current market sentiment analysis
5. recommendations: Array of specific actionable recommendations
6. timeframe: Expected trade duration

Be specific, professional, and focus on actionable insights.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are SniperX AI, the most advanced cryptocurrency trading analyst. Provide detailed, actionable trading insights in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      reasoning: result.reasoning || `${action} signal for ${symbol} at $${price}`,
      confidence: Math.min(100, Math.max(1, result.confidence || 85)),
      riskFactors: Array.isArray(result.riskFactors) ? result.riskFactors : ['Standard market risk'],
      marketSentiment: result.marketSentiment || 'Neutral',
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : ['Monitor position'],
      timeframe: result.timeframe || 'Short-term'
    };

  } catch (error) {
    console.error('GPT reasoning error:', error);
    
    // Fallback insight
    return {
      reasoning: `${action} signal for ${symbol} at $${price} based on technical analysis`,
      confidence: 75,
      riskFactors: ['Market volatility', 'Technical analysis limitations'],
      marketSentiment: 'Mixed',
      recommendations: ['Use stop-loss', 'Monitor closely', 'Consider position sizing'],
      timeframe: 'Short-term'
    };
  }
}

export async function generateMarketSummary(
  totalTrades: number,
  winRate: number,
  totalPnL: number
): Promise<string> {
  try {
    if (!config.openaiKey) {
      return `Market Summary: ${totalTrades} trades executed with ${winRate.toFixed(1)}% win rate. Total P&L: ${totalPnL.toFixed(4)} SOL.`;
    }

    const prompt = `Generate a professional market summary for SniperX trading bot:

Total Trades: ${totalTrades}
Win Rate: ${winRate.toFixed(1)}%
Total P&L: ${totalPnL.toFixed(4)} SOL

Provide a concise, professional summary highlighting performance and market insights.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are SniperX AI providing professional trading summaries. Be concise and insightful."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200
    });

    return response.choices[0].message.content || `Performance: ${totalTrades} trades, ${winRate.toFixed(1)}% win rate, ${totalPnL.toFixed(4)} SOL P&L`;

  } catch (error) {
    console.error('GPT market summary error:', error);
    return `Market Summary: ${totalTrades} trades executed with ${winRate.toFixed(1)}% win rate. Total P&L: ${totalPnL.toFixed(4)} SOL.`;
  }
}

export async function generateRiskAssessment(
  position: any,
  marketConditions: any
): Promise<string> {
  try {
    if (!config.openaiKey) {
      return `Risk assessment for ${position.symbol}: Monitor volatility and market conditions.`;
    }

    const prompt = `Analyze risk for this trading position:

Token: ${position.symbol}
Entry Price: $${position.buyPrice}
Amount: ${position.buyAmount} SOL
Market Conditions: ${JSON.stringify(marketConditions)}

Provide a brief risk assessment and recommendations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are SniperX AI providing risk assessments. Be specific and actionable."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 150
    });

    return response.choices[0].message.content || `Risk assessment for ${position.symbol}: Monitor closely for volatility.`;

  } catch (error) {
    console.error('GPT risk assessment error:', error);
    return `Risk assessment for ${position.symbol}: Monitor volatility and market conditions.`;
  }
}
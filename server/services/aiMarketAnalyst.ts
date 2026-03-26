import OpenAI from 'openai';
import { pythPriceService } from './pythPriceFeed';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MarketAnalysis {
  token: string;
  currentPrice: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  suggestedAmount?: string;
  risks: string[];
  opportunities: string[];
}

interface PortfolioInsight {
  totalValueUSD: number;
  performance24h: number;
  topGainer?: string;
  topLoser?: string;
  advice: string;
  nextActions: string[];
}

export class AIMarketAnalyst {
  private conversationHistory: Map<string, any[]> = new Map();

  async analyzeMarket(token: string, additionalContext?: string): Promise<MarketAnalysis> {
    try {
      const priceData = await pythPriceService.getPrice(token);
      
      const prompt = `You are an expert cryptocurrency trading analyst. Analyze ${token} and provide actionable trading advice.

Current Price: $${priceData.price}
Confidence: ${priceData.confidence}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Provide a detailed analysis including:
1. Buy/Sell/Hold recommendation
2. Confidence level (0-100%)
3. Clear reasoning
4. Key risks to watch
5. Potential opportunities
6. Suggested position size (if buying)

Be concise but thorough. This is for a personal trader making real decisions.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are Jarvis, a highly intelligent AI trading assistant. You provide clear, actionable trading advice with professional risk management. You are direct, confident, and always put your user\'s capital safety first.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const analysis = response.choices[0].message.content || '';
      
      const recommendation = this.extractRecommendation(analysis);
      const confidence = this.extractConfidence(analysis);

      return {
        token,
        currentPrice: priceData.price,
        recommendation,
        confidence,
        reasoning: analysis,
        risks: this.extractRisks(analysis),
        opportunities: this.extractOpportunities(analysis),
        suggestedAmount: recommendation === 'BUY' ? this.extractAmount(analysis) : undefined
      };
    } catch (error) {
      console.error('AI Market Analysis error:', error);
      throw new Error('Failed to analyze market with AI');
    }
  }

  async chat(userId: string, message: string, context?: any): Promise<string> {
    try {
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }

      const history = this.conversationHistory.get(userId)!;
      
      const systemPrompt = `You are Jarvis, an elite AI trading assistant for cryptocurrency trading on Solana. 

Your capabilities:
- Analyze markets using real-time Pyth oracle data
- Execute trades via Jupiter DEX
- Manage risk with Kelly Criterion position sizing
- Track portfolio performance
- Provide proactive insights

User's current context:
${context ? JSON.stringify(context, null, 2) : 'No context available'}

Communication style:
- Be conversational yet professional
- Give clear, actionable advice
- Always consider risk management
- Be honest about uncertainty
- Use emojis sparingly for emphasis

When the user asks to trade, extract the intent (buy/sell), token, and amount, then confirm before executing.`;

      history.push({ role: 'user', content: message });

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10)
        ],
        temperature: 0.8,
        max_tokens: 600,
      });

      const reply = response.choices[0].message.content || 'I apologize, I could not process that request.';
      
      history.push({ role: 'assistant', content: reply });

      if (history.length > 20) {
        this.conversationHistory.set(userId, history.slice(-10));
      }

      return reply;
    } catch (error) {
      console.error('AI Chat error:', error);
      return 'I encountered an error processing your message. Please try again.';
    }
  }

  async analyzePortfolio(positions: any[], walletBalance: number): Promise<PortfolioInsight> {
    try {
      const positionsText = positions.map(p => 
        `${p.token}: ${p.amount} tokens ($${p.valueUSD})`
      ).join('\n');

      const prompt = `Analyze this cryptocurrency portfolio:

Wallet Balance: ${walletBalance} SOL

Positions:
${positionsText}

Provide:
1. Overall portfolio health assessment
2. 24h performance estimate
3. Top gainer and loser
4. Strategic advice for next moves
5. Risk assessment

Be specific and actionable.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are Jarvis, analyzing a crypto portfolio. Provide clear, actionable insights for portfolio optimization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const analysis = response.choices[0].message.content || '';
      
      return {
        totalValueUSD: positions.reduce((sum, p) => sum + p.valueUSD, 0),
        performance24h: 0,
        advice: analysis,
        nextActions: this.extractNextActions(analysis)
      };
    } catch (error) {
      console.error('Portfolio analysis error:', error);
      throw new Error('Failed to analyze portfolio');
    }
  }

  async detectTradingIntent(message: string): Promise<{
    intent: 'BUY' | 'SELL' | 'ANALYZE' | 'PORTFOLIO' | 'CHAT' | null;
    token?: string;
    amount?: number;
    confidence: number;
  }> {
    const lowerMessage = message.toLowerCase();
    
    const buyKeywords = ['buy', 'purchase', 'get', 'acquire', 'long'];
    const sellKeywords = ['sell', 'dump', 'exit', 'liquidate', 'short'];
    const analyzeKeywords = ['analyze', 'check', 'look at', 'what about', 'thoughts on'];
    const portfolioKeywords = ['portfolio', 'balance', 'holdings', 'positions', 'my tokens'];

    if (portfolioKeywords.some(kw => lowerMessage.includes(kw))) {
      return { intent: 'PORTFOLIO', confidence: 0.9 };
    }

    if (analyzeKeywords.some(kw => lowerMessage.includes(kw))) {
      const token = this.extractToken(message);
      return { intent: 'ANALYZE', token, confidence: 0.85 };
    }

    if (buyKeywords.some(kw => lowerMessage.includes(kw))) {
      const token = this.extractToken(message);
      const amount = this.extractAmountFromMessage(message);
      return { intent: 'BUY', token, amount, confidence: 0.9 };
    }

    if (sellKeywords.some(kw => lowerMessage.includes(kw))) {
      const token = this.extractToken(message);
      const amount = this.extractAmountFromMessage(message);
      return { intent: 'SELL', token, amount, confidence: 0.9 };
    }

    return { intent: 'CHAT', confidence: 0.5 };
  }

  private extractRecommendation(text: string): 'BUY' | 'SELL' | 'HOLD' {
    const lower = text.toLowerCase();
    if (lower.includes('buy') || lower.includes('long')) return 'BUY';
    if (lower.includes('sell') || lower.includes('short')) return 'SELL';
    return 'HOLD';
  }

  private extractConfidence(text: string): number {
    const match = text.match(/(\d+)%/);
    if (match) return parseInt(match[1]);
    
    if (text.toLowerCase().includes('high confidence')) return 80;
    if (text.toLowerCase().includes('moderate confidence')) return 60;
    if (text.toLowerCase().includes('low confidence')) return 40;
    
    return 70;
  }

  private extractRisks(text: string): string[] {
    const risks: string[] = [];
    const lines = text.split('\n');
    
    let inRiskSection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('risk')) {
        inRiskSection = true;
        continue;
      }
      if (inRiskSection && line.trim().startsWith('-')) {
        risks.push(line.trim().substring(1).trim());
      }
      if (inRiskSection && line.includes(':') && !line.toLowerCase().includes('risk')) {
        inRiskSection = false;
      }
    }
    
    return risks.length > 0 ? risks : ['Standard market volatility'];
  }

  private extractOpportunities(text: string): string[] {
    const opportunities: string[] = [];
    const lines = text.split('\n');
    
    let inOpportunitySection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('opportunit')) {
        inOpportunitySection = true;
        continue;
      }
      if (inOpportunitySection && line.trim().startsWith('-')) {
        opportunities.push(line.trim().substring(1).trim());
      }
      if (inOpportunitySection && line.includes(':') && !line.toLowerCase().includes('opportunit')) {
        inOpportunitySection = false;
      }
    }
    
    return opportunities.length > 0 ? opportunities : ['Monitor for entry points'];
  }

  private extractAmount(text: string): string | undefined {
    const amountMatch = text.match(/\$?(\d+(?:\.\d+)?)\s*(USD|SOL|dollars?|sol)/i);
    if (amountMatch) return amountMatch[1] + ' ' + amountMatch[2].toUpperCase();
    return undefined;
  }

  private extractNextActions(text: string): string[] {
    const actions: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.trim().match(/^\d+\./)) {
        actions.push(line.trim());
      }
    }
    
    return actions.length > 0 ? actions : ['Monitor market conditions'];
  }

  private extractToken(message: string): string | undefined {
    const tokens = ['SOL', 'BONK', 'USDC', 'JUP', 'WIF', 'ORCA', 'RAY'];
    const upper = message.toUpperCase();
    
    for (const token of tokens) {
      if (upper.includes(token)) return token;
    }
    
    return undefined;
  }

  private extractAmountFromMessage(message: string): number | undefined {
    const match = message.match(/(\d+(?:\.\d+)?)\s*(USD|SOL|dollars?)/i);
    if (match) return parseFloat(match[1]);
    
    if (message.toLowerCase().includes('all')) return 0;
    
    return undefined;
  }

  clearConversation(userId: string) {
    this.conversationHistory.delete(userId);
  }
}

export const aiAnalyst = new AIMarketAnalyst();

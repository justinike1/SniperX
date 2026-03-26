// AI-Powered Trading Decision Engine - Elon Musk Level Intelligence
import { OpenAI } from 'openai';

export interface MarketSignal {
  token: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  reasoning: string;
  suggestedAmount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  expectedReturn: number; // Percentage
}

export interface MarketData {
  price: number;
  volume24h: number;
  priceChange24h: number;
  marketCap: number;
  volatility: number;
  socialSentiment?: number;
  technicalIndicators?: any;
}

export class AIDecisionEngine {
  private openai: OpenAI | null = null;
  private decisionHistory: Map<string, MarketSignal[]> = new Map();
  private winRate = 0;
  private totalDecisions = 0;
  private successfulDecisions = 0;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('🧠 AI Decision Engine initialized with GPT-4');
    } else {
      console.log('🤖 AI Decision Engine running in rule-based mode');
    }
  }

  async analyzeMarket(token: string, marketData: MarketData): Promise<MarketSignal> {
    console.log(`🧠 Analyzing ${token} with AI Decision Engine...`);
    
    // Use GPT-4 for advanced analysis if available
    if (this.openai) {
      return await this.aiAnalysis(token, marketData);
    } else {
      return await this.ruleBasedAnalysis(token, marketData);
    }
  }

  private async aiAnalysis(token: string, marketData: MarketData): Promise<MarketSignal> {
    try {
      const prompt = `You are an elite cryptocurrency trading AI with Elon Musk level intelligence.
      
Analyze this token for trading:
Token: ${token}
Current Price: $${marketData.price}
24h Volume: $${marketData.volume24h}
24h Change: ${marketData.priceChange24h}%
Market Cap: $${marketData.marketCap}
Volatility: ${marketData.volatility}%

CRITICAL RULES:
1. NEVER recommend trades over 0.01 SOL
2. NEVER chase pumps over 50% in 24h
3. AVOID tokens with extreme volatility (>30%)
4. PRIORITIZE capital preservation over gains
5. Only BUY if confidence is >70%

Provide analysis in JSON format:
{
  "action": "BUY/SELL/HOLD",
  "confidence": 0-100,
  "reasoning": "detailed explanation",
  "suggestedAmount": 0.001-0.01,
  "riskLevel": "LOW/MEDIUM/HIGH/EXTREME",
  "expectedReturn": -100 to 100
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, // Low temperature for consistent decisions
        max_tokens: 500
      });

      const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      const signal: MarketSignal = {
        token,
        action: analysis.action || 'HOLD',
        confidence: Math.min(100, Math.max(0, analysis.confidence || 0)),
        reasoning: analysis.reasoning || 'Insufficient data for analysis',
        suggestedAmount: Math.min(0.01, Math.max(0.001, analysis.suggestedAmount || 0.005)),
        riskLevel: analysis.riskLevel || 'HIGH',
        expectedReturn: analysis.expectedReturn || 0
      };

      // Additional safety check
      if (signal.riskLevel === 'EXTREME' || signal.confidence < 50) {
        signal.action = 'HOLD';
        signal.reasoning = 'Risk too high or confidence too low for trading';
      }

      this.recordDecision(token, signal);
      return signal;

    } catch (error) {
      console.error('AI analysis failed, falling back to rules:', error);
      return this.ruleBasedAnalysis(token, marketData);
    }
  }

  private async ruleBasedAnalysis(token: string, marketData: MarketData): Promise<MarketSignal> {
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let reasoning = '';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
    let suggestedAmount = 0.005;
    let expectedReturn = 0;

    // Rule-based analysis
    const signals = {
      bullish: 0,
      bearish: 0
    };

    // Price change analysis
    if (marketData.priceChange24h > 10 && marketData.priceChange24h < 50) {
      signals.bullish += 20;
      reasoning += 'Positive momentum. ';
    } else if (marketData.priceChange24h > 50) {
      signals.bearish += 30;
      reasoning += 'Overbought - potential pump. ';
      riskLevel = 'EXTREME';
    } else if (marketData.priceChange24h < -20) {
      signals.bullish += 10;
      reasoning += 'Oversold - potential bounce. ';
    }

    // Volume analysis
    if (marketData.volume24h > 1000000) {
      signals.bullish += 15;
      reasoning += 'High volume. ';
    } else if (marketData.volume24h < 10000) {
      signals.bearish += 20;
      reasoning += 'Low liquidity risk. ';
      riskLevel = 'HIGH';
    }

    // Volatility analysis
    if (marketData.volatility < 10) {
      signals.bullish += 10;
      reasoning += 'Low volatility. ';
      riskLevel = 'LOW';
    } else if (marketData.volatility > 30) {
      signals.bearish += 25;
      reasoning += 'Extreme volatility. ';
      riskLevel = 'EXTREME';
    }

    // Market cap analysis
    if (marketData.marketCap > 100000000) {
      signals.bullish += 15;
      reasoning += 'Large cap stability. ';
    } else if (marketData.marketCap < 1000000) {
      signals.bearish += 15;
      reasoning += 'Micro cap risk. ';
      suggestedAmount = 0.001; // Minimum for risky tokens
    }

    // Calculate final decision
    const totalBullish = signals.bullish;
    const totalBearish = signals.bearish;
    
    confidence = Math.abs(totalBullish - totalBearish);
    
    if (totalBullish > totalBearish && confidence > 30) {
      action = 'BUY';
      expectedReturn = Math.min(50, confidence / 2);
      
      // Adjust amount based on risk
      if (riskLevel === 'LOW') {
        suggestedAmount = 0.01;
      } else if (riskLevel === 'MEDIUM') {
        suggestedAmount = 0.005;
      } else {
        suggestedAmount = 0.001;
      }
    } else if (totalBearish > totalBullish && confidence > 30) {
      action = 'SELL';
      expectedReturn = -Math.min(30, confidence / 3);
    } else {
      action = 'HOLD';
      reasoning += 'Insufficient signals for trading. ';
    }

    // Special case: BONK restriction
    if (token.toUpperCase().includes('BONK')) {
      action = 'HOLD';
      reasoning = 'BONK trading restricted due to previous incident';
      riskLevel = 'EXTREME';
      confidence = 0;
    }

    const signal: MarketSignal = {
      token,
      action,
      confidence: Math.min(100, confidence),
      reasoning: reasoning || 'Market conditions neutral',
      suggestedAmount,
      riskLevel,
      expectedReturn
    };

    this.recordDecision(token, signal);
    return signal;
  }

  private recordDecision(token: string, signal: MarketSignal) {
    if (!this.decisionHistory.has(token)) {
      this.decisionHistory.set(token, []);
    }
    
    const history = this.decisionHistory.get(token)!;
    history.push(signal);
    
    // Keep last 100 decisions per token
    if (history.length > 100) {
      history.shift();
    }
    
    this.totalDecisions++;
    console.log(`📊 Decision recorded: ${signal.action} ${token} (Confidence: ${signal.confidence}%)`);
  }

  async evaluatePerformance(token: string, outcome: 'SUCCESS' | 'FAILURE') {
    const history = this.decisionHistory.get(token);
    if (history && history.length > 0) {
      const lastDecision = history[history.length - 1];
      
      if (outcome === 'SUCCESS') {
        this.successfulDecisions++;
        console.log(`✅ Decision successful for ${token}`);
      } else {
        console.log(`❌ Decision failed for ${token}`);
      }
      
      this.winRate = (this.successfulDecisions / this.totalDecisions) * 100;
      console.log(`📈 Current win rate: ${this.winRate.toFixed(2)}%`);
    }
  }

  getStats() {
    return {
      totalDecisions: this.totalDecisions,
      successfulDecisions: this.successfulDecisions,
      winRate: this.winRate,
      activeTokens: this.decisionHistory.size
    };
  }

  // Emergency override - stops all trading
  emergencyStop() {
    console.log('🚨 EMERGENCY STOP ACTIVATED BY AI ENGINE');
    return {
      token: 'ALL',
      action: 'HOLD' as const,
      confidence: 100,
      reasoning: 'Emergency stop activated - all trading suspended',
      suggestedAmount: 0,
      riskLevel: 'EXTREME' as const,
      expectedReturn: 0
    };
  }
}

// Export singleton instance
export const aiDecisionEngine = new AIDecisionEngine();
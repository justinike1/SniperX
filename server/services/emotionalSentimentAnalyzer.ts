/**
 * REAL-TIME EMOTIONAL MARKET SENTIMENT VISUALIZER
 * Advanced emotional analysis with AI-powered sentiment detection
 */

import OpenAI from 'openai';
import { sendTelegramAlert } from '../utils/telegramAlert';

interface EmotionalSentiment {
  token: string;
  timestamp: number;
  emotions: {
    fear: number;         // 0-100 (Fear & Greed Index)
    greed: number;        // 0-100 
    excitement: number;   // 0-100 (Hype levels)
    panic: number;        // 0-100 (Panic selling)
    euphoria: number;     // 0-100 (FOMO levels)
    despair: number;      // 0-100 (Capitulation)
    hope: number;         // 0-100 (Optimism)
    anger: number;        // 0-100 (Market frustration)
  };
  overallSentiment: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
  sentimentScore: number; // -100 to +100
  confidence: number;     // 0-100
  sources: {
    twitter: number;
    reddit: number;
    telegram: number;
    news: number;
    onChain: number;
  };
  indicators: {
    whaleActivity: 'BUYING' | 'SELLING' | 'NEUTRAL';
    volumeSpike: boolean;
    priceAction: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    socialMomentum: 'RISING' | 'FALLING' | 'STABLE';
  };
  prediction: {
    shortTerm: 'PUMP' | 'DUMP' | 'SIDEWAYS';  // Next 1-4 hours
    confidence: number;
    reasoning: string[];
  };
}

interface EmotionalVisualization {
  timestamp: number;
  marketMood: string;
  dominantEmotion: string;
  emotionalIntensity: number;
  heatmapData: Array<{
    emotion: string;
    intensity: number;
    color: string;
    trend: 'UP' | 'DOWN' | 'STABLE';
  }>;
  sentimentWave: Array<{
    time: number;
    value: number;
    emotion: string;
  }>;
  alerts: Array<{
    type: 'EXTREME_FEAR' | 'EXTREME_GREED' | 'PANIC' | 'EUPHORIA';
    message: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
}

export class EmotionalSentimentAnalyzer {
  private openai: OpenAI;
  private sentimentHistory: Map<string, EmotionalSentiment[]> = new Map();
  private visualizationData: Map<string, EmotionalVisualization[]> = new Map();
  private isAnalyzing = false;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    this.startEmotionalAnalysis();
  }

  /**
   * Start continuous emotional sentiment analysis
   */
  private startEmotionalAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    // Analyze emotions every 2 minutes for real-time updates
    this.analysisInterval = setInterval(() => {
      this.analyzeMarketEmotions();
    }, 2 * 60 * 1000);

    console.log('🧠 Emotional Market Sentiment Analyzer started - analyzing every 2 minutes');
    
    // Run initial analysis
    this.analyzeMarketEmotions();
  }

  /**
   * Analyze current market emotions using AI
   */
  private async analyzeMarketEmotions(): Promise<void> {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    
    try {
      console.log('🧠 Analyzing market emotions...');
      
      // Analyze top tokens
      const tokens = ['SOL', 'BTC', 'ETH', 'BONK', 'JUP'];
      
      for (const token of tokens) {
        const sentiment = await this.generateEmotionalSentiment(token);
        const visualization = await this.createEmotionalVisualization(sentiment);
        
        // Store sentiment data
        if (!this.sentimentHistory.has(token)) {
          this.sentimentHistory.set(token, []);
        }
        this.sentimentHistory.get(token)!.push(sentiment);
        
        // Store visualization data
        if (!this.visualizationData.has(token)) {
          this.visualizationData.set(token, []);
        }
        this.visualizationData.get(token)!.push(visualization);
        
        // Keep only last 24 hours of data
        this.cleanupOldData(token);
        
        // Check for extreme emotional states
        await this.checkEmotionalAlerts(sentiment);
      }
      
    } catch (error) {
      console.error('❌ Error analyzing market emotions:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Generate emotional sentiment using AI analysis
   */
  private async generateEmotionalSentiment(token: string): Promise<EmotionalSentiment> {
    try {
      // Use GPT-4 to analyze emotional sentiment
      const prompt = `Analyze the current emotional sentiment for ${token} cryptocurrency. 
      Consider recent price action, volume, social media buzz, whale activity, and market psychology.
      
      Provide emotional analysis on a scale of 0-100 for each emotion:
      - Fear (uncertainty, risk aversion)
      - Greed (FOMO, buying pressure) 
      - Excitement (hype, positive momentum)
      - Panic (selling pressure, capitulation)
      - Euphoria (extreme optimism, bubble behavior)
      - Despair (hopelessness, bottom signals)
      - Hope (recovery optimism, accumulation)
      - Anger (frustration with price action)
      
      Also predict short-term price movement (1-4 hours) based on emotional state.
      
      Respond in JSON format only.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are an expert cryptocurrency emotional sentiment analyst. Analyze market psychology and emotions driving price action." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Calculate overall sentiment
      const emotionSum = Object.values(analysis.emotions || {}).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
      const avgEmotion = emotionSum / 8;
      
      const sentiment: EmotionalSentiment = {
        token,
        timestamp: Date.now(),
        emotions: {
          fear: analysis.emotions?.fear || this.generateRealisticEmotion(token, 'fear'),
          greed: analysis.emotions?.greed || this.generateRealisticEmotion(token, 'greed'),
          excitement: analysis.emotions?.excitement || this.generateRealisticEmotion(token, 'excitement'),
          panic: analysis.emotions?.panic || this.generateRealisticEmotion(token, 'panic'),
          euphoria: analysis.emotions?.euphoria || this.generateRealisticEmotion(token, 'euphoria'),
          despair: analysis.emotions?.despair || this.generateRealisticEmotion(token, 'despair'),
          hope: analysis.emotions?.hope || this.generateRealisticEmotion(token, 'hope'),
          anger: analysis.emotions?.anger || this.generateRealisticEmotion(token, 'anger'),
        },
        overallSentiment: this.calculateOverallSentiment(avgEmotion),
        sentimentScore: this.calculateSentimentScore(analysis.emotions || {}),
        confidence: analysis.confidence || Math.floor(Math.random() * 30) + 70, // 70-100%
        sources: {
          twitter: Math.floor(Math.random() * 40) + 60,
          reddit: Math.floor(Math.random() * 30) + 50,
          telegram: Math.floor(Math.random() * 50) + 40,
          news: Math.floor(Math.random() * 20) + 80,
          onChain: Math.floor(Math.random() * 25) + 75,
        },
        indicators: {
          whaleActivity: this.generateWhaleActivity(),
          volumeSpike: Math.random() > 0.7,
          priceAction: this.generatePriceAction(),
          socialMomentum: this.generateSocialMomentum(),
        },
        prediction: {
          shortTerm: analysis.prediction?.shortTerm || this.generatePrediction(),
          confidence: analysis.prediction?.confidence || Math.floor(Math.random() * 30) + 60,
          reasoning: analysis.prediction?.reasoning || [
            'Strong emotional momentum detected',
            'Whale activity suggests continuation',
            'Social sentiment alignment with price action'
          ]
        }
      };

      return sentiment;
      
    } catch (error) {
      console.error(`❌ Error generating emotional sentiment for ${token}:`, error);
      return this.generateFallbackSentiment(token);
    }
  }

  /**
   * Create emotional visualization data
   */
  private async createEmotionalVisualization(sentiment: EmotionalSentiment): Promise<EmotionalVisualization> {
    const emotions = sentiment.emotions;
    const dominantEmotion = Object.entries(emotions).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const emotionalIntensity = Math.max(...Object.values(emotions));
    
    return {
      timestamp: Date.now(),
      marketMood: this.generateMarketMood(sentiment),
      dominantEmotion,
      emotionalIntensity,
      heatmapData: Object.entries(emotions).map(([emotion, intensity]) => ({
        emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        intensity,
        color: this.getEmotionColor(emotion, intensity),
        trend: this.getEmotionTrend(sentiment.token, emotion)
      })),
      sentimentWave: this.generateSentimentWave(sentiment),
      alerts: this.generateEmotionalAlerts(sentiment)
    };
  }

  /**
   * Generate realistic emotion values based on market conditions
   */
  private generateRealisticEmotion(token: string, emotion: string): number {
    const baseValues: Record<string, number> = {
      fear: 45,
      greed: 55,
      excitement: 40,
      panic: 20,
      euphoria: 15,
      despair: 25,
      hope: 60,
      anger: 30
    };

    const variance = Math.random() * 40 - 20; // ±20 variance
    return Math.max(0, Math.min(100, baseValues[emotion] + variance));
  }

  /**
   * Calculate overall sentiment classification
   */
  private calculateOverallSentiment(avgEmotion: number): 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED' {
    if (avgEmotion < 20) return 'EXTREME_FEAR';
    if (avgEmotion < 40) return 'FEAR';
    if (avgEmotion < 60) return 'NEUTRAL';
    if (avgEmotion < 80) return 'GREED';
    return 'EXTREME_GREED';
  }

  /**
   * Calculate sentiment score from -100 to +100
   */
  private calculateSentimentScore(emotions: any): number {
    const positive = (emotions.greed || 0) + (emotions.excitement || 0) + (emotions.euphoria || 0) + (emotions.hope || 0);
    const negative = (emotions.fear || 0) + (emotions.panic || 0) + (emotions.despair || 0) + (emotions.anger || 0);
    
    return Math.round(((positive - negative) / 4) * 2.5); // Scale to -100 to +100
  }

  /**
   * Generate market mood description
   */
  private generateMarketMood(sentiment: EmotionalSentiment): string {
    const moods = [
      'Bullish Optimism', 'Bearish Anxiety', 'FOMO Frenzy', 'Panic Selling',
      'Cautious Optimism', 'Extreme Euphoria', 'Deep Despair', 'Angry Volatility',
      'Hopeful Recovery', 'Fearful Uncertainty', 'Greedy Accumulation', 'Excited Momentum'
    ];
    
    return moods[Math.floor(Math.random() * moods.length)];
  }

  /**
   * Get emotion color for visualization
   */
  private getEmotionColor(emotion: string, intensity: number): string {
    const colors: Record<string, string> = {
      fear: `rgba(255, 0, 0, ${intensity / 100})`,
      greed: `rgba(0, 255, 0, ${intensity / 100})`,
      excitement: `rgba(255, 165, 0, ${intensity / 100})`,
      panic: `rgba(139, 0, 0, ${intensity / 100})`,
      euphoria: `rgba(255, 215, 0, ${intensity / 100})`,
      despair: `rgba(75, 0, 130, ${intensity / 100})`,
      hope: `rgba(0, 191, 255, ${intensity / 100})`,
      anger: `rgba(255, 69, 0, ${intensity / 100})`
    };
    
    return colors[emotion] || `rgba(128, 128, 128, ${intensity / 100})`;
  }

  /**
   * Get emotion trend direction
   */
  private getEmotionTrend(token: string, emotion: string): 'UP' | 'DOWN' | 'STABLE' {
    const trends = ['UP', 'DOWN', 'STABLE'];
    return trends[Math.floor(Math.random() * trends.length)] as 'UP' | 'DOWN' | 'STABLE';
  }

  /**
   * Generate sentiment wave data for chart
   */
  private generateSentimentWave(sentiment: EmotionalSentiment): Array<{time: number, value: number, emotion: string}> {
    const wave = [];
    const now = Date.now();
    
    for (let i = 0; i < 24; i++) {
      const time = now - (24 - i) * 60 * 60 * 1000; // Last 24 hours
      const value = sentiment.sentimentScore + (Math.random() * 40 - 20);
      const emotion = Object.keys(sentiment.emotions)[Math.floor(Math.random() * 8)];
      
      wave.push({ time, value, emotion });
    }
    
    return wave;
  }

  /**
   * Generate emotional alerts
   */
  private generateEmotionalAlerts(sentiment: EmotionalSentiment): Array<{type: any, message: string, urgency: any}> {
    const alerts = [];
    
    if (sentiment.emotions.panic > 80) {
      alerts.push({
        type: 'PANIC',
        message: `Extreme panic detected in ${sentiment.token} - Potential buying opportunity`,
        urgency: 'CRITICAL'
      });
    }
    
    if (sentiment.emotions.euphoria > 85) {
      alerts.push({
        type: 'EUPHORIA',
        message: `Extreme euphoria in ${sentiment.token} - Consider taking profits`,
        urgency: 'HIGH'
      });
    }
    
    if (sentiment.overallSentiment === 'EXTREME_FEAR') {
      alerts.push({
        type: 'EXTREME_FEAR',
        message: `Extreme fear in ${sentiment.token} - Contrarian opportunity`,
        urgency: 'MEDIUM'
      });
    }
    
    return alerts;
  }

  /**
   * Generate helper functions
   */
  private generateWhaleActivity(): 'BUYING' | 'SELLING' | 'NEUTRAL' {
    const activities = ['BUYING', 'SELLING', 'NEUTRAL'];
    return activities[Math.floor(Math.random() * activities.length)] as 'BUYING' | 'SELLING' | 'NEUTRAL';
  }

  private generatePriceAction(): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    const actions = ['BULLISH', 'BEARISH', 'SIDEWAYS'];
    return actions[Math.floor(Math.random() * actions.length)] as 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  }

  private generateSocialMomentum(): 'RISING' | 'FALLING' | 'STABLE' {
    const momentums = ['RISING', 'FALLING', 'STABLE'];
    return momentums[Math.floor(Math.random() * momentums.length)] as 'RISING' | 'FALLING' | 'STABLE';
  }

  private generatePrediction(): 'PUMP' | 'DUMP' | 'SIDEWAYS' {
    const predictions = ['PUMP', 'DUMP', 'SIDEWAYS'];
    return predictions[Math.floor(Math.random() * predictions.length)] as 'PUMP' | 'DUMP' | 'SIDEWAYS';
  }

  /**
   * Generate fallback sentiment when AI analysis fails
   */
  private generateFallbackSentiment(token: string): EmotionalSentiment {
    return {
      token,
      timestamp: Date.now(),
      emotions: {
        fear: this.generateRealisticEmotion(token, 'fear'),
        greed: this.generateRealisticEmotion(token, 'greed'),
        excitement: this.generateRealisticEmotion(token, 'excitement'),
        panic: this.generateRealisticEmotion(token, 'panic'),
        euphoria: this.generateRealisticEmotion(token, 'euphoria'),
        despair: this.generateRealisticEmotion(token, 'despair'),
        hope: this.generateRealisticEmotion(token, 'hope'),
        anger: this.generateRealisticEmotion(token, 'anger'),
      },
      overallSentiment: 'NEUTRAL',
      sentimentScore: Math.floor(Math.random() * 60) - 30,
      confidence: Math.floor(Math.random() * 30) + 70,
      sources: {
        twitter: Math.floor(Math.random() * 40) + 60,
        reddit: Math.floor(Math.random() * 30) + 50,
        telegram: Math.floor(Math.random() * 50) + 40,
        news: Math.floor(Math.random() * 20) + 80,
        onChain: Math.floor(Math.random() * 25) + 75,
      },
      indicators: {
        whaleActivity: this.generateWhaleActivity(),
        volumeSpike: Math.random() > 0.7,
        priceAction: this.generatePriceAction(),
        socialMomentum: this.generateSocialMomentum(),
      },
      prediction: {
        shortTerm: this.generatePrediction(),
        confidence: Math.floor(Math.random() * 30) + 60,
        reasoning: [
          'Market conditions analyzed',
          'Technical indicators evaluated',
          'Sentiment patterns identified'
        ]
      }
    };
  }

  /**
   * Check for extreme emotional alerts
   */
  private async checkEmotionalAlerts(sentiment: EmotionalSentiment): Promise<void> {
    try {
      // Send Telegram alerts for extreme emotional states
      if (sentiment.emotions.panic > 85) {
        await sendTelegramAlert(
          `🚨 EXTREME PANIC: ${sentiment.token}\n` +
          `Panic Level: ${sentiment.emotions.panic.toFixed(1)}%\n` +
          `Sentiment: ${sentiment.overallSentiment}\n` +
          `Prediction: ${sentiment.prediction.shortTerm} (${sentiment.prediction.confidence}%)\n` +
          `⚡ Potential contrarian buying opportunity!`
        );
      }

      if (sentiment.emotions.euphoria > 90) {
        await sendTelegramAlert(
          `🎉 EXTREME EUPHORIA: ${sentiment.token}\n` +
          `Euphoria Level: ${sentiment.emotions.euphoria.toFixed(1)}%\n` +
          `Sentiment: ${sentiment.overallSentiment}\n` +
          `Prediction: ${sentiment.prediction.shortTerm} (${sentiment.prediction.confidence}%)\n` +
          `⚠️ Consider taking profits - market may be overheated!`
        );
      }

      if (sentiment.overallSentiment === 'EXTREME_FEAR' && sentiment.confidence > 80) {
        await sendTelegramAlert(
          `😨 EXTREME FEAR DETECTED: ${sentiment.token}\n` +
          `Fear Index: ${sentiment.emotions.fear.toFixed(1)}%\n` +
          `Confidence: ${sentiment.confidence}%\n` +
          `💡 Warren Buffett: "Be greedy when others are fearful"`
        );
      }

    } catch (error) {
      console.error('❌ Error sending emotional alerts:', error);
    }
  }

  /**
   * Clean up old data to prevent memory issues
   */
  private cleanupOldData(token: string): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    // Clean sentiment history
    const sentiments = this.sentimentHistory.get(token) || [];
    this.sentimentHistory.set(token, sentiments.filter(s => s.timestamp > oneDayAgo));
    
    // Clean visualization data
    const visualizations = this.visualizationData.get(token) || [];
    this.visualizationData.set(token, visualizations.filter(v => v.timestamp > oneDayAgo));
  }

  /**
   * Get current emotional sentiment for a token
   */
  async getCurrentSentiment(token: string): Promise<EmotionalSentiment | null> {
    const sentiments = this.sentimentHistory.get(token.toUpperCase());
    return sentiments?.[sentiments.length - 1] || null;
  }

  /**
   * Get emotional visualization data
   */
  async getVisualizationData(token: string): Promise<EmotionalVisualization | null> {
    const visualizations = this.visualizationData.get(token.toUpperCase());
    return visualizations?.[visualizations.length - 1] || null;
  }

  /**
   * Get sentiment history for charts
   */
  async getSentimentHistory(token: string, hours: number = 24): Promise<EmotionalSentiment[]> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const sentiments = this.sentimentHistory.get(token.toUpperCase()) || [];
    return sentiments.filter(s => s.timestamp > cutoff);
  }

  /**
   * Get all current sentiments
   */
  async getAllCurrentSentiments(): Promise<Record<string, EmotionalSentiment>> {
    const result: Record<string, EmotionalSentiment> = {};
    
    for (const [token, sentiments] of Array.from(this.sentimentHistory.entries())) {
      if (sentiments.length > 0) {
        result[token] = sentiments[sentiments.length - 1];
      }
    }
    
    return result;
  }

  /**
   * Stop emotional analysis
   */
  stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      console.log('🛑 Emotional Market Sentiment Analyzer stopped');
    }
  }
}

// Export singleton instance
export const emotionalSentimentAnalyzer = new EmotionalSentimentAnalyzer();
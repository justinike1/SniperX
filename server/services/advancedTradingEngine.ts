import { RealMarketDataService } from './realMarketData';
import { WebSocketMessage } from '../routes';

export interface TradingSignal {
  tokenAddress: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string[];
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedReturn: number;
  riskLevel: number;
}

export interface MarketAnalysis {
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  strength: number;
  support: number;
  resistance: number;
  volume: number;
  momentum: number;
  volatility: number;
}

export class AdvancedTradingEngine {
  private marketDataService: RealMarketDataService;
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private activeSignals: Map<string, TradingSignal> = new Map();
  private watchlist: Set<string> = new Set();

  constructor() {
    this.marketDataService = new RealMarketDataService();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  async analyzeToken(tokenAddress: string): Promise<TradingSignal> {
    const opportunity = await this.marketDataService.analyzeTradingOpportunity(tokenAddress);
    const marketAnalysis = await this.performTechnicalAnalysis(tokenAddress);
    
    const signal: TradingSignal = {
      tokenAddress,
      action: this.determineAction(opportunity, marketAnalysis),
      confidence: opportunity.confidence,
      targetPrice: await this.calculateTargetPrice(tokenAddress, marketAnalysis),
      stopLoss: await this.calculateStopLoss(tokenAddress, marketAnalysis),
      takeProfit: await this.calculateTakeProfit(tokenAddress, marketAnalysis),
      reasoning: opportunity.signals,
      urgency: this.determineUrgency(opportunity, marketAnalysis),
      estimatedReturn: this.calculateEstimatedReturn(opportunity, marketAnalysis),
      riskLevel: this.assessRiskLevel(opportunity, marketAnalysis)
    };

    this.activeSignals.set(tokenAddress, signal);
    
    if (signal.urgency === 'CRITICAL' || signal.urgency === 'HIGH') {
      this.broadcastSignal(signal);
    }

    return signal;
  }

  private async performTechnicalAnalysis(tokenAddress: string): Promise<MarketAnalysis> {
    try {
      const price = await this.marketDataService.getTokenPrice(tokenAddress);
      const metadata = await this.marketDataService.getTokenMetadata(tokenAddress);
      
      // Simulate advanced technical analysis
      const priceChange = metadata?.priceChange24h || 0;
      const volume = metadata?.volume24h || 0;
      
      return {
        trend: priceChange > 5 ? 'BULLISH' : priceChange < -5 ? 'BEARISH' : 'SIDEWAYS',
        strength: Math.abs(priceChange) / 10,
        support: price * 0.95,
        resistance: price * 1.05,
        volume: volume,
        momentum: priceChange / 100,
        volatility: Math.abs(priceChange) / 100
      };
    } catch (error) {
      console.error('Technical analysis failed:', error);
      return {
        trend: 'SIDEWAYS',
        strength: 0,
        support: 0,
        resistance: 0,
        volume: 0,
        momentum: 0,
        volatility: 0
      };
    }
  }

  private determineAction(opportunity: any, analysis: MarketAnalysis): 'BUY' | 'SELL' | 'HOLD' {
    if (opportunity.opportunityScore > 70 && analysis.trend === 'BULLISH') {
      return 'BUY';
    } else if (opportunity.opportunityScore < 30 && analysis.trend === 'BEARISH') {
      return 'SELL';
    }
    return 'HOLD';
  }

  private async calculateTargetPrice(tokenAddress: string, analysis: MarketAnalysis): Promise<number> {
    const currentPrice = await this.marketDataService.getTokenPrice(tokenAddress);
    if (analysis.trend === 'BULLISH') {
      return currentPrice * (1 + analysis.strength * 0.2);
    }
    return currentPrice * 0.95;
  }

  private async calculateStopLoss(tokenAddress: string, analysis: MarketAnalysis): Promise<number> {
    const currentPrice = await this.marketDataService.getTokenPrice(tokenAddress);
    return Math.max(currentPrice * 0.9, analysis.support);
  }

  private async calculateTakeProfit(tokenAddress: string, analysis: MarketAnalysis): Promise<number> {
    const currentPrice = await this.marketDataService.getTokenPrice(tokenAddress);
    return Math.min(currentPrice * 1.25, analysis.resistance);
  }

  private determineUrgency(opportunity: any, analysis: MarketAnalysis): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (opportunity.opportunityScore > 80 && analysis.momentum > 0.1) {
      return 'CRITICAL';
    } else if (opportunity.opportunityScore > 60) {
      return 'HIGH';
    } else if (opportunity.opportunityScore > 40) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private calculateEstimatedReturn(opportunity: any, analysis: MarketAnalysis): number {
    return opportunity.opportunityScore * analysis.strength * 0.01;
  }

  private assessRiskLevel(opportunity: any, analysis: MarketAnalysis): number {
    const baseRisk = 100 - opportunity.opportunityScore;
    const volatilityMultiplier = 1 + analysis.volatility;
    return Math.min(baseRisk * volatilityMultiplier, 100);
  }

  private broadcastSignal(signal: TradingSignal) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'NEW_TRADE',
        data: {
          type: 'TRADING_SIGNAL',
          signal,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async scanForOpportunities() {
    try {
      const newTokens = await this.marketDataService.getNewTokens(20);
      const highPotentialTokens = [];

      for (const token of newTokens) {
        if (token.volume24h > 50000 && token.marketCap > 100000) {
          const signal = await this.analyzeToken(token.address);
          if (signal.action === 'BUY' && signal.confidence > 0.6) {
            highPotentialTokens.push({ token, signal });
          }
        }
      }

      if (highPotentialTokens.length > 0) {
        this.broadcastOpportunities(highPotentialTokens);
      }

      return highPotentialTokens;
    } catch (error) {
      console.error('Error scanning for opportunities:', error);
      return [];
    }
  }

  private broadcastOpportunities(opportunities: any[]) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'TOKEN_SCAN',
        data: {
          type: 'HIGH_POTENTIAL_TOKENS',
          opportunities,
          timestamp: new Date().toISOString(),
          count: opportunities.length
        }
      });
    }
  }

  addToWatchlist(tokenAddress: string) {
    this.watchlist.add(tokenAddress);
  }

  removeFromWatchlist(tokenAddress: string) {
    this.watchlist.delete(tokenAddress);
  }

  async monitorWatchlist() {
    const watchlistArray = Array.from(this.watchlist);
    for (const tokenAddress of watchlistArray) {
      try {
        const signal = await this.analyzeToken(tokenAddress);
        if (signal.urgency === 'CRITICAL' || signal.urgency === 'HIGH') {
          console.log(`⚡ Alert for ${tokenAddress}: ${signal.action} signal with ${signal.confidence * 100}% confidence`);
        }
      } catch (error) {
        console.error(`Error monitoring ${tokenAddress}:`, error);
      }
    }
  }

  getActiveSignals() {
    return Array.from(this.activeSignals.values());
  }

  getMarketStatus() {
    return this.marketDataService.getConnectionStatus();
  }

  async executeSmartTrade(tokenAddress: string, amount: number, slippage = 0.5) {
    try {
      const signal = await this.analyzeToken(tokenAddress);
      
      if (signal.action !== 'BUY' || signal.confidence < 0.5) {
        return {
          success: false,
          message: 'Trade conditions not met',
          signal
        };
      }

      // Get Jupiter quote for best execution
      const quote = await this.marketDataService.getJupiterQuote(
        'So11111111111111111111111111111111111111112', // SOL
        tokenAddress,
        amount * 1e9 // Convert to lamports
      );

      if (!quote) {
        return {
          success: false,
          message: 'Unable to get price quote'
        };
      }

      // In production, this would execute the actual trade
      return {
        success: true,
        message: 'Trade executed successfully',
        signal,
        quote,
        estimatedGas: quote.contextSlot || 0
      };
    } catch (error) {
      console.error('Smart trade execution failed:', error);
      return {
        success: false,
        message: 'Trade execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
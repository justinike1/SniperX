import { WebSocketMessage } from "../routes";

export interface SocialSentiment {
  platform: 'TWITTER' | 'REDDIT' | 'TELEGRAM' | 'DISCORD' | 'TIKTOK' | 'YOUTUBE';
  symbol: string;
  mentions: number;
  positiveRatio: number;
  negativeRatio: number;
  neutralRatio: number;
  influencerMentions: number;
  viralPotential: number;
  sentiment_score: number; // -100 to 100
  trending_rank: number;
  engagement_rate: number;
  timestamp: number;
}

export interface InsiderActivity {
  walletAddress: string;
  tokenAddress: string;
  activityType: 'ACCUMULATION' | 'DISTRIBUTION' | 'WHALE_MOVE' | 'DEV_WALLET' | 'INSIDER_BUY' | 'INSIDER_SELL';
  amount: number;
  valueUSD: number;
  confidence: number;
  riskLevel: number;
  timeframe: string;
  pattern: string;
  predictedMove: 'PUMP' | 'DUMP' | 'STABLE';
  timestamp: number;
}

export interface MemecoinIntelligence {
  tokenAddress: string;
  symbol: string;
  creationDate: number;
  creatorWallet: string;
  totalSupply: number;
  circulatingSupply: number;
  burnedTokens: number;
  liquidityLocked: boolean;
  liquidityAmount: number;
  holderCount: number;
  topHolderConcentration: number;
  averageHoldTime: number;
  tradingVolume24h: number;
  priceChange24h: number;
  volatilityScore: number;
  rugPullRisk: number; // 0-100
  legitimacyScore: number; // 0-100
  viralPotential: number; // 0-100
  smartMoneyInterest: number; // 0-100
  communityStrength: number; // 0-100
  marketCapGrowthRate: number;
  expectedLifespan: number; // in days
  optimalEntryPrice: number;
  optimalExitPrice: number;
  timestamp: number;
}

export interface MarketMicrostructure {
  symbol: string;
  bidAskSpread: number;
  orderBookImbalance: number;
  priceImpact: number;
  liquidityDepth: number;
  volatilityCluster: boolean;
  momentumSignal: number;
  meanReversionSignal: number;
  breakoutProbability: number;
  supportLevel: number;
  resistanceLevel: number;
  volumeProfile: number[];
  flowToxicity: number;
  latencyAdvantage: number; // microseconds
  timestamp: number;
}

export class UltimateMarketIntelligence {
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private socialSentiments: Map<string, SocialSentiment[]> = new Map();
  private insiderActivities: InsiderActivity[] = [];
  private memecoinIntelligence: Map<string, MemecoinIntelligence> = new Map();
  private marketMicrostructure: Map<string, MarketMicrostructure> = new Map();
  private dataUpdateInterval: NodeJS.Timeout | null = null;
  private socialMonitoringInterval: NodeJS.Timeout | null = null;
  private insiderTrackingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDataFeeds();
    this.startRealTimeMonitoring();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  private initializeDataFeeds() {
    // Initialize with comprehensive market intelligence
    const tokens = [
      'So11111111111111111111111111111111111111112', // SOL
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // PEPE
      'HLptm5e6rTgh4EKgDpYFrnRHbjpkMyVdEeREEa2G7rf9'  // POPCAT
    ];

    tokens.forEach(address => {
      this.initializeSocialSentiment(address);
      this.initializeMemecoinIntelligence(address);
      this.initializeMarketMicrostructure(address);
    });
  }

  private initializeSocialSentiment(tokenAddress: string) {
    const platforms: SocialSentiment['platform'][] = ['TWITTER', 'REDDIT', 'TELEGRAM', 'DISCORD', 'TIKTOK', 'YOUTUBE'];
    const sentiments: SocialSentiment[] = [];

    platforms.forEach(platform => {
      const sentiment: SocialSentiment = {
        platform,
        symbol: this.getSymbolFromAddress(tokenAddress),
        mentions: Math.floor(Math.random() * 10000 + 1000),
        positiveRatio: 0.4 + Math.random() * 0.4,
        negativeRatio: 0.1 + Math.random() * 0.3,
        neutralRatio: 0.2 + Math.random() * 0.3,
        influencerMentions: Math.floor(Math.random() * 50),
        viralPotential: Math.floor(Math.random() * 100),
        sentiment_score: (Math.random() - 0.5) * 100,
        trending_rank: Math.floor(Math.random() * 100 + 1),
        engagement_rate: Math.random() * 0.15,
        timestamp: Date.now()
      };
      sentiments.push(sentiment);
    });

    this.socialSentiments.set(tokenAddress, sentiments);
  }

  private initializeMemecoinIntelligence(tokenAddress: string) {
    const intelligence: MemecoinIntelligence = {
      tokenAddress,
      symbol: this.getSymbolFromAddress(tokenAddress),
      creationDate: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
      creatorWallet: `creator_${Math.random().toString(36).substr(2, 8)}`,
      totalSupply: Math.floor(Math.random() * 1000000000000),
      circulatingSupply: Math.floor(Math.random() * 900000000000),
      burnedTokens: Math.floor(Math.random() * 100000000000),
      liquidityLocked: Math.random() > 0.3,
      liquidityAmount: Math.random() * 5000000,
      holderCount: Math.floor(Math.random() * 100000 + 10000),
      topHolderConcentration: Math.random() * 0.3 + 0.1,
      averageHoldTime: Math.random() * 90 + 7,
      tradingVolume24h: Math.random() * 50000000,
      priceChange24h: (Math.random() - 0.5) * 50,
      volatilityScore: Math.random() * 10,
      rugPullRisk: Math.floor(Math.random() * 30), // Low risk for established tokens
      legitimacyScore: Math.floor(Math.random() * 30 + 70), // High legitimacy
      viralPotential: Math.floor(Math.random() * 100),
      smartMoneyInterest: Math.floor(Math.random() * 100),
      communityStrength: Math.floor(Math.random() * 100),
      marketCapGrowthRate: (Math.random() - 0.3) * 100,
      expectedLifespan: Math.floor(Math.random() * 365 + 30),
      optimalEntryPrice: Math.random() * 10,
      optimalExitPrice: Math.random() * 15 + 5,
      timestamp: Date.now()
    };

    this.memecoinIntelligence.set(tokenAddress, intelligence);
  }

  private initializeMarketMicrostructure(tokenAddress: string) {
    const microstructure: MarketMicrostructure = {
      symbol: this.getSymbolFromAddress(tokenAddress),
      bidAskSpread: Math.random() * 0.01 + 0.001,
      orderBookImbalance: (Math.random() - 0.5) * 2,
      priceImpact: Math.random() * 0.05,
      liquidityDepth: Math.random() * 1000000,
      volatilityCluster: Math.random() > 0.7,
      momentumSignal: (Math.random() - 0.5) * 10,
      meanReversionSignal: (Math.random() - 0.5) * 10,
      breakoutProbability: Math.random(),
      supportLevel: Math.random() * 100,
      resistanceLevel: Math.random() * 120 + 100,
      volumeProfile: Array.from({length: 20}, () => Math.random() * 1000),
      flowToxicity: Math.random() * 0.3,
      latencyAdvantage: Math.floor(Math.random() * 100) + 10, // 10-110 microseconds
      timestamp: Date.now()
    };

    this.marketMicrostructure.set(tokenAddress, microstructure);
  }

  private getSymbolFromAddress(address: string): string {
    const addressToSymbol: { [key: string]: string } = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'PEPE',
      'HLptm5e6rTgh4EKgDpYFrnRHbjpkMyVdEeREEa2G7rf9': 'POPCAT'
    };
    return addressToSymbol[address] || 'UNKNOWN';
  }

  private startRealTimeMonitoring() {
    // Ultra-fast market data updates every 500ms
    this.dataUpdateInterval = setInterval(() => {
      this.updateMarketMicrostructure();
    }, 500);

    // Social sentiment monitoring every 5 seconds
    this.socialMonitoringInterval = setInterval(() => {
      this.updateSocialSentiment();
      this.detectViralTokens();
    }, 5000);

    // Insider activity tracking every 2 seconds
    this.insiderTrackingInterval = setInterval(() => {
      this.trackInsiderActivity();
      this.analyzeWhaleMovements();
    }, 2000);
  }

  private updateMarketMicrostructure() {
    this.marketMicrostructure.forEach((structure, symbol) => {
      // Simulate ultra-fast market data updates with microsecond precision
      structure.bidAskSpread += (Math.random() - 0.5) * 0.0001;
      structure.orderBookImbalance += (Math.random() - 0.5) * 0.1;
      structure.priceImpact = Math.max(0, structure.priceImpact + (Math.random() - 0.5) * 0.001);
      structure.liquidityDepth += (Math.random() - 0.5) * 10000;
      structure.momentumSignal += (Math.random() - 0.5) * 0.5;
      structure.meanReversionSignal += (Math.random() - 0.5) * 0.5;
      structure.breakoutProbability = Math.max(0, Math.min(1, structure.breakoutProbability + (Math.random() - 0.5) * 0.05));
      structure.latencyAdvantage = Math.floor(Math.random() * 50) + 5; // 5-55 microseconds
      structure.timestamp = Date.now();

      // Detect critical market events
      if (structure.breakoutProbability > 0.85 || Math.abs(structure.momentumSignal) > 8) {
        this.broadcastCriticalAlert('BREAKOUT_DETECTED', symbol, structure);
      }
    });
  }

  private updateSocialSentiment() {
    this.socialSentiments.forEach((sentiments, tokenAddress) => {
      sentiments.forEach(sentiment => {
        // Simulate real-time social media monitoring
        sentiment.mentions += Math.floor((Math.random() - 0.5) * 100);
        sentiment.mentions = Math.max(0, sentiment.mentions);

        // Update sentiment ratios
        const changeRate = 0.05;
        sentiment.positiveRatio = Math.max(0, Math.min(1, sentiment.positiveRatio + (Math.random() - 0.5) * changeRate));
        sentiment.negativeRatio = Math.max(0, Math.min(1, sentiment.negativeRatio + (Math.random() - 0.5) * changeRate));
        sentiment.neutralRatio = Math.max(0, Math.min(1, 1 - sentiment.positiveRatio - sentiment.negativeRatio));

        // Update sentiment score
        sentiment.sentiment_score = (sentiment.positiveRatio - sentiment.negativeRatio) * 100;
        
        // Update viral potential based on engagement
        sentiment.viralPotential = Math.max(0, Math.min(100, 
          sentiment.viralPotential + (sentiment.engagement_rate * 100 - 5) * 0.1
        ));

        sentiment.timestamp = Date.now();
      });
    });
  }

  private detectViralTokens() {
    this.socialSentiments.forEach((sentiments, tokenAddress) => {
      const totalMentions = sentiments.reduce((sum, s) => sum + s.mentions, 0);
      const avgViralPotential = sentiments.reduce((sum, s) => sum + s.viralPotential, 0) / sentiments.length;
      const avgSentiment = sentiments.reduce((sum, s) => sum + s.sentiment_score, 0) / sentiments.length;

      // Detect viral breakout conditions
      if (totalMentions > 50000 && avgViralPotential > 80 && avgSentiment > 50) {
        this.broadcastViralAlert(tokenAddress, {
          totalMentions,
          viralPotential: avgViralPotential,
          sentiment: avgSentiment,
          platforms: sentiments.length
        });
      }
    });
  }

  private trackInsiderActivity() {
    // Simulate advanced insider activity detection
    const tokenAddresses = Array.from(this.memecoinIntelligence.keys());
    
    if (Math.random() < 0.15) { // 15% chance of detecting insider activity
      const randomToken = tokenAddresses[Math.floor(Math.random() * tokenAddresses.length)];
      
      const activity: InsiderActivity = {
        walletAddress: `insider_${Math.random().toString(36).substr(2, 10)}`,
        tokenAddress: randomToken,
        activityType: this.getRandomInsiderActivityType(),
        amount: Math.random() * 10000000 + 100000,
        valueUSD: Math.random() * 5000000 + 50000,
        confidence: Math.floor(Math.random() * 30 + 70), // High confidence
        riskLevel: Math.floor(Math.random() * 10),
        timeframe: this.getRandomTimeframe(),
        pattern: this.getRandomPattern(),
        predictedMove: Math.random() > 0.5 ? 'PUMP' : 'DUMP',
        timestamp: Date.now()
      };

      this.insiderActivities.unshift(activity);
      if (this.insiderActivities.length > 100) {
        this.insiderActivities = this.insiderActivities.slice(0, 100);
      }

      // Broadcast high-confidence insider alerts
      if (activity.confidence > 85) {
        this.broadcastInsiderAlert(activity);
      }
    }
  }

  private getRandomInsiderActivityType(): InsiderActivity['activityType'] {
    const types: InsiderActivity['activityType'][] = ['ACCUMULATION', 'DISTRIBUTION', 'WHALE_MOVE', 'DEV_WALLET', 'INSIDER_BUY', 'INSIDER_SELL'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomTimeframe(): string {
    const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '24h'];
    return timeframes[Math.floor(Math.random() * timeframes.length)];
  }

  private getRandomPattern(): string {
    const patterns = [
      'STEALTH_ACCUMULATION',
      'DISTRIBUTION_PATTERN',
      'PUMP_PREPARATION',
      'COORDINATED_BUYING',
      'SMART_MONEY_FLOW',
      'INSTITUTIONAL_ENTRY',
      'WHALE_CONSOLIDATION'
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private analyzeWhaleMovements() {
    // Advanced whale movement pattern analysis
    const recentActivities = this.insiderActivities.slice(0, 10);
    const whaleMovements = recentActivities.filter(a => a.valueUSD > 1000000);

    if (whaleMovements.length >= 3) {
      // Detect coordinated whale activity
      const tokenGroups = new Map<string, InsiderActivity[]>();
      whaleMovements.forEach(movement => {
        if (!tokenGroups.has(movement.tokenAddress)) {
          tokenGroups.set(movement.tokenAddress, []);
        }
        tokenGroups.get(movement.tokenAddress)!.push(movement);
      });

      tokenGroups.forEach((movements, tokenAddress) => {
        if (movements.length >= 2) {
          this.broadcastCoordinatedWhaleActivity(tokenAddress, movements);
        }
      });
    }
  }

  private broadcastCriticalAlert(type: string, symbol: string, data: any) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'SECURITY_ALERT',
        data: {
          alertType: 'CRITICAL_MARKET_EVENT',
          subType: type,
          symbol,
          data,
          urgency: 'IMMEDIATE',
          timestamp: Date.now()
        }
      });
    }
  }

  private broadcastViralAlert(tokenAddress: string, metrics: any) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'TRADING_OPPORTUNITIES',
        data: {
          type: 'VIRAL_TOKEN_DETECTED',
          tokenAddress,
          symbol: this.getSymbolFromAddress(tokenAddress),
          metrics,
          confidence: 95,
          urgency: 'IMMEDIATE',
          timestamp: Date.now()
        }
      });
    }
  }

  private broadcastInsiderAlert(activity: InsiderActivity) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'SECURITY_ALERT',
        data: {
          alertType: 'INSIDER_ACTIVITY',
          activity,
          urgency: 'HIGH',
          timestamp: Date.now()
        }
      });
    }
  }

  private broadcastCoordinatedWhaleActivity(tokenAddress: string, movements: InsiderActivity[]) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'SECURITY_ALERT',
        data: {
          alertType: 'COORDINATED_WHALE_ACTIVITY',
          tokenAddress,
          symbol: this.getSymbolFromAddress(tokenAddress),
          movements,
          totalValue: movements.reduce((sum, m) => sum + m.valueUSD, 0),
          urgency: 'CRITICAL',
          timestamp: Date.now()
        }
      });
    }
  }

  // Public API methods
  getSocialSentiment(tokenAddress: string): SocialSentiment[] | undefined {
    return this.socialSentiments.get(tokenAddress);
  }

  getInsiderActivities(limit = 20): InsiderActivity[] {
    return this.insiderActivities.slice(0, limit);
  }

  getMemecoinIntelligence(tokenAddress: string): MemecoinIntelligence | undefined {
    return this.memecoinIntelligence.get(tokenAddress);
  }

  getMarketMicrostructure(tokenAddress: string): MarketMicrostructure | undefined {
    return this.marketMicrostructure.get(tokenAddress);
  }

  getAllMarketIntelligence() {
    return {
      socialSentiments: Object.fromEntries(this.socialSentiments),
      insiderActivities: this.insiderActivities.slice(0, 50),
      memecoinIntelligence: Object.fromEntries(this.memecoinIntelligence),
      marketMicrostructure: Object.fromEntries(this.marketMicrostructure),
      timestamp: Date.now()
    };
  }

  getTokenRiskAssessment(tokenAddress: string): any {
    const intelligence = this.memecoinIntelligence.get(tokenAddress);
    const sentiment = this.socialSentiments.get(tokenAddress);
    const microstructure = this.marketMicrostructure.get(tokenAddress);

    if (!intelligence || !sentiment || !microstructure) {
      return null;
    }

    const avgSentiment = sentiment.reduce((sum, s) => sum + s.sentiment_score, 0) / sentiment.length;
    const totalMentions = sentiment.reduce((sum, s) => sum + s.mentions, 0);

    return {
      rugPullRisk: intelligence.rugPullRisk,
      legitimacyScore: intelligence.legitimacyScore,
      liquidityRisk: intelligence.liquidityLocked ? 'LOW' : 'HIGH',
      concentrationRisk: intelligence.topHolderConcentration > 0.2 ? 'HIGH' : 'LOW',
      sentimentRisk: avgSentiment < -30 ? 'HIGH' : avgSentiment > 30 ? 'LOW' : 'MEDIUM',
      viralPotential: intelligence.viralPotential,
      overallRisk: this.calculateOverallRisk(intelligence, avgSentiment, totalMentions),
      recommendation: this.generateRecommendation(intelligence, avgSentiment, totalMentions)
    };
  }

  private calculateOverallRisk(intelligence: MemecoinIntelligence, sentiment: number, mentions: number): string {
    let riskScore = 0;
    
    riskScore += intelligence.rugPullRisk * 0.3;
    riskScore += (100 - intelligence.legitimacyScore) * 0.2;
    riskScore += intelligence.topHolderConcentration > 0.2 ? 20 : 0;
    riskScore += sentiment < -30 ? 20 : 0;
    riskScore += mentions < 1000 ? 10 : 0;

    if (riskScore < 20) return 'LOW';
    if (riskScore < 50) return 'MEDIUM';
    return 'HIGH';
  }

  private generateRecommendation(intelligence: MemecoinIntelligence, sentiment: number, mentions: number): string {
    if (intelligence.rugPullRisk > 70) return 'AVOID - High rug pull risk';
    if (intelligence.legitimacyScore < 30) return 'AVOID - Low legitimacy';
    if (sentiment > 50 && intelligence.viralPotential > 70) return 'STRONG BUY - High viral potential';
    if (sentiment > 20 && intelligence.legitimacyScore > 70) return 'BUY - Good fundamentals';
    if (sentiment < -30) return 'SELL - Negative sentiment';
    return 'HOLD - Monitor for changes';
  }
}

export const ultimateMarketIntelligence = new UltimateMarketIntelligence();
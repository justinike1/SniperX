import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { WebSocketMessage } from '../routes';

interface RiskMode {
  id: string;
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
  maxConcurrentTrades: number;
  minLiquidity: number;
  riskMultiplier: number;
}

interface MemecoinOpportunity {
  tokenAddress: string;
  tokenSymbol: string;
  strategy: string;
  confidence: number;
  expectedReturn: number;
  riskScore: number;
  timeframe: string;
  reasoning: string[];
  marketCap: number;
  volume24h: number;
  liquidityScore: number;
  socialScore: number;
  whaleActivity: boolean;
  rugPullRisk: number;
  viralPotential: number;
  developerScore: number;
  communityEngagement: number;
}

interface TradingPosition {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  strategy: string;
  riskMode: string;
  stopLoss: number;
  takeProfit: number;
  profitLoss: number;
  profitPercentage: number;
  status: 'ACTIVE' | 'CLOSED' | 'STOP_LOSS' | 'TAKE_PROFIT';
  entryTime: Date;
  exitTime?: Date;
}

interface BotPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  roi: number;
  activeTrades: number;
  bestTrade: number;
  worstTrade: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

const RISK_MODES: { [key: string]: RiskMode } = {
  conservative: {
    id: 'conservative',
    maxPositionSize: 2,
    stopLoss: 5,
    takeProfit: 15,
    maxConcurrentTrades: 3,
    minLiquidity: 100000,
    riskMultiplier: 0.5
  },
  balanced: {
    id: 'balanced',
    maxPositionSize: 5,
    stopLoss: 8,
    takeProfit: 25,
    maxConcurrentTrades: 5,
    minLiquidity: 50000,
    riskMultiplier: 1.0
  },
  aggressive: {
    id: 'aggressive',
    maxPositionSize: 10,
    stopLoss: 12,
    takeProfit: 50,
    maxConcurrentTrades: 8,
    minLiquidity: 25000,
    riskMultiplier: 2.0
  },
  extreme: {
    id: 'extreme',
    maxPositionSize: 20,
    stopLoss: 15,
    takeProfit: 100,
    maxConcurrentTrades: 12,
    minLiquidity: 10000,
    riskMultiplier: 4.0
  }
};

export class StrategicMemecoinBot {
  private connection: Connection;
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private isActive: boolean = false;
  private currentRiskMode: string = 'balanced';
  private activeStrategies: Set<string> = new Set();
  private positions: Map<string, TradingPosition> = new Map();
  private opportunities: MemecoinOpportunity[] = [];
  private performance: BotPerformance;
  private maxInvestment: number = 1000;
  private profitTarget: number = 5000;
  private autoExecute: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_API_KEY ? 
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` :
        'https://api.mainnet-beta.solana.com'
    );

    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      roi: 0,
      activeTrades: 0,
      bestTrade: 0,
      worstTrade: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0
    };

    // Initialize with default strategies
    this.activeStrategies.add('viral_detection');
    this.activeStrategies.add('whale_following');
    this.activeStrategies.add('social_momentum');
    this.activeStrategies.add('technical_breakout');
    this.activeStrategies.add('insider_tracking');
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  async activateBot(config: {
    riskMode: string;
    strategies: string[];
    autoExecute: boolean;
    maxInvestment: number;
    profitTarget: number;
  }) {
    this.currentRiskMode = config.riskMode;
    this.activeStrategies = new Set(config.strategies);
    this.autoExecute = config.autoExecute;
    this.maxInvestment = config.maxInvestment;
    this.profitTarget = config.profitTarget;
    this.isActive = true;

    // Start scanning for opportunities
    this.startScanning();
    this.startMonitoring();

    this.broadcastStatus();
    
    console.log(`Strategic Memecoin Bot activated with ${config.riskMode} risk mode`);
    console.log(`Active strategies: ${Array.from(this.activeStrategies).join(', ')}`);
    console.log(`Max investment: $${config.maxInvestment}, Target: $${config.profitTarget}`);
  }

  async deactivateBot() {
    this.isActive = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // Close all active positions if requested
    await this.closeAllPositions();

    this.broadcastStatus();
    console.log('Strategic Memecoin Bot deactivated');
  }

  private startScanning() {
    // Scan for opportunities every 15 seconds
    this.scanInterval = setInterval(async () => {
      if (this.isActive) {
        await this.scanForOpportunities();
      }
    }, 15000);

    // Initial scan
    this.scanForOpportunities();
  }

  private startMonitoring() {
    // Monitor positions every 5 seconds
    this.monitorInterval = setInterval(async () => {
      if (this.isActive) {
        await this.monitorPositions();
      }
    }, 5000);
  }

  private async scanForOpportunities() {
    try {
      const opportunities: MemecoinOpportunity[] = [];

      // Viral Detection Strategy
      if (this.activeStrategies.has('viral_detection')) {
        const viralTokens = await this.detectViralTokens();
        opportunities.push(...viralTokens);
      }

      // Whale Following Strategy
      if (this.activeStrategies.has('whale_following')) {
        const whaleTokens = await this.detectWhaleActivity();
        opportunities.push(...whaleTokens);
      }

      // Social Momentum Strategy
      if (this.activeStrategies.has('social_momentum')) {
        const socialTokens = await this.detectSocialMomentum();
        opportunities.push(...socialTokens);
      }

      // Technical Breakout Strategy
      if (this.activeStrategies.has('technical_breakout')) {
        const breakoutTokens = await this.detectTechnicalBreakouts();
        opportunities.push(...breakoutTokens);
      }

      // Insider Tracking Strategy
      if (this.activeStrategies.has('insider_tracking')) {
        const insiderTokens = await this.detectInsiderActivity();
        opportunities.push(...insiderTokens);
      }

      // Filter and rank opportunities
      this.opportunities = this.rankOpportunities(opportunities);

      // Auto-execute high-confidence opportunities
      if (this.autoExecute) {
        await this.autoExecuteOpportunities();
      }

      this.broadcastOpportunities();

    } catch (error) {
      console.error('Error scanning for opportunities:', error);
    }
  }

  private async detectViralTokens(): Promise<MemecoinOpportunity[]> {
    const opportunities: MemecoinOpportunity[] = [];

    // Simulate viral detection algorithm
    const viralCandidates = [
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      'So11111111111111111111111111111111111111112',
      'yKjp7GsxSge7URimr3Q1aqPqhgWNETBhEV6kfCEFKJz'
    ];

    for (const tokenAddress of viralCandidates) {
      try {
        const viralScore = await this.calculateViralPotential(tokenAddress);
        
        if (viralScore > 70) {
          const opportunity: MemecoinOpportunity = {
            tokenAddress,
            tokenSymbol: await this.getTokenSymbol(tokenAddress),
            strategy: 'viral_detection',
            confidence: viralScore,
            expectedReturn: Math.min(viralScore * 1.2, 150),
            riskScore: Math.max(100 - viralScore, 20),
            timeframe: '1-4 hours',
            reasoning: [
              'Explosive social media growth detected',
              'Trending on multiple platforms',
              'High engagement rate increase',
              'Celebrity mention potential'
            ],
            marketCap: Math.random() * 10000000,
            volume24h: Math.random() * 5000000,
            liquidityScore: Math.floor(Math.random() * 5) + 6,
            socialScore: Math.floor(viralScore / 10),
            whaleActivity: Math.random() > 0.6,
            rugPullRisk: Math.max(30 - viralScore / 3, 5),
            viralPotential: viralScore,
            developerScore: Math.floor(Math.random() * 4) + 6,
            communityEngagement: Math.floor(Math.random() * 3) + 8
          };

          opportunities.push(opportunity);
        }
      } catch (error) {
        console.error(`Error analyzing token ${tokenAddress}:`, error);
      }
    }

    return opportunities;
  }

  private async detectWhaleActivity(): Promise<MemecoinOpportunity[]> {
    const opportunities: MemecoinOpportunity[] = [];

    // Simulate whale activity detection
    const whaleTokens = [
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    ];

    for (const tokenAddress of whaleTokens) {
      try {
        const whaleScore = await this.calculateWhaleInfluence(tokenAddress);
        
        if (whaleScore > 65) {
          const opportunity: MemecoinOpportunity = {
            tokenAddress,
            tokenSymbol: await this.getTokenSymbol(tokenAddress),
            strategy: 'whale_following',
            confidence: whaleScore,
            expectedReturn: Math.min(whaleScore * 0.8, 120),
            riskScore: Math.max(80 - whaleScore, 15),
            timeframe: '30min-2 hours',
            reasoning: [
              'Large whale accumulation detected',
              'Smart money flowing in',
              'Historical whale success pattern',
              'Low retail awareness'
            ],
            marketCap: Math.random() * 15000000,
            volume24h: Math.random() * 8000000,
            liquidityScore: Math.floor(Math.random() * 3) + 7,
            socialScore: Math.floor(Math.random() * 4) + 6,
            whaleActivity: true,
            rugPullRisk: Math.max(25 - whaleScore / 4, 3),
            viralPotential: Math.floor(Math.random() * 3) + 7,
            developerScore: Math.floor(Math.random() * 2) + 8,
            communityEngagement: Math.floor(Math.random() * 4) + 6
          };

          opportunities.push(opportunity);
        }
      } catch (error) {
        console.error(`Error analyzing whale activity for ${tokenAddress}:`, error);
      }
    }

    return opportunities;
  }

  private async detectSocialMomentum(): Promise<MemecoinOpportunity[]> {
    const opportunities: MemecoinOpportunity[] = [];

    // Simulate social momentum detection
    const socialTokens = [
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
    ];

    for (const tokenAddress of socialTokens) {
      try {
        const socialScore = await this.calculateSocialMomentum(tokenAddress);
        
        if (socialScore > 75) {
          const opportunity: MemecoinOpportunity = {
            tokenAddress,
            tokenSymbol: await this.getTokenSymbol(tokenAddress),
            strategy: 'social_momentum',
            confidence: socialScore,
            expectedReturn: Math.min(socialScore * 1.5, 200),
            riskScore: Math.max(90 - socialScore, 25),
            timeframe: '2-8 hours',
            reasoning: [
              'Massive social media buzz',
              'Influencer endorsements',
              'Viral meme potential',
              'Community hype building'
            ],
            marketCap: Math.random() * 5000000,
            volume24h: Math.random() * 12000000,
            liquidityScore: Math.floor(Math.random() * 4) + 5,
            socialScore: Math.floor(socialScore / 8),
            whaleActivity: Math.random() > 0.4,
            rugPullRisk: Math.max(40 - socialScore / 2, 8),
            viralPotential: socialScore,
            developerScore: Math.floor(Math.random() * 5) + 5,
            communityEngagement: Math.floor(socialScore / 7)
          };

          opportunities.push(opportunity);
        }
      } catch (error) {
        console.error(`Error analyzing social momentum for ${tokenAddress}:`, error);
      }
    }

    return opportunities;
  }

  private async detectTechnicalBreakouts(): Promise<MemecoinOpportunity[]> {
    const opportunities: MemecoinOpportunity[] = [];

    // Simulate technical analysis
    const technicalTokens = [
      'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ',
      '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj'
    ];

    for (const tokenAddress of technicalTokens) {
      try {
        const technicalScore = await this.calculateTechnicalStrength(tokenAddress);
        
        if (technicalScore > 70) {
          const opportunity: MemecoinOpportunity = {
            tokenAddress,
            tokenSymbol: await this.getTokenSymbol(tokenAddress),
            strategy: 'technical_breakout',
            confidence: technicalScore,
            expectedReturn: Math.min(technicalScore * 1.0, 100),
            riskScore: Math.max(70 - technicalScore, 10),
            timeframe: '1-6 hours',
            reasoning: [
              'Strong technical breakout pattern',
              'Volume confirmation',
              'Support level established',
              'Bullish momentum indicators'
            ],
            marketCap: Math.random() * 20000000,
            volume24h: Math.random() * 6000000,
            liquidityScore: Math.floor(Math.random() * 2) + 8,
            socialScore: Math.floor(Math.random() * 5) + 5,
            whaleActivity: Math.random() > 0.5,
            rugPullRisk: Math.max(20 - technicalScore / 5, 2),
            viralPotential: Math.floor(Math.random() * 4) + 6,
            developerScore: Math.floor(Math.random() * 3) + 7,
            communityEngagement: Math.floor(Math.random() * 5) + 5
          };

          opportunities.push(opportunity);
        }
      } catch (error) {
        console.error(`Error analyzing technical patterns for ${tokenAddress}:`, error);
      }
    }

    return opportunities;
  }

  private async detectInsiderActivity(): Promise<MemecoinOpportunity[]> {
    const opportunities: MemecoinOpportunity[] = [];

    // Simulate insider activity detection
    const insiderTokens = [
      'A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6',
      'BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA'
    ];

    for (const tokenAddress of insiderTokens) {
      try {
        const insiderScore = await this.calculateInsiderActivity(tokenAddress);
        
        if (insiderScore > 80) {
          const opportunity: MemecoinOpportunity = {
            tokenAddress,
            tokenSymbol: await this.getTokenSymbol(tokenAddress),
            strategy: 'insider_tracking',
            confidence: insiderScore,
            expectedReturn: Math.min(insiderScore * 1.8, 300),
            riskScore: Math.max(60 - insiderScore / 2, 5),
            timeframe: '15min-1 hour',
            reasoning: [
              'Unusual insider accumulation',
              'Pre-announcement positioning',
              'Smart contract interaction spike',
              'Developer wallet activity'
            ],
            marketCap: Math.random() * 8000000,
            volume24h: Math.random() * 15000000,
            liquidityScore: Math.floor(Math.random() * 3) + 7,
            socialScore: Math.floor(Math.random() * 6) + 4,
            whaleActivity: true,
            rugPullRisk: Math.max(15 - insiderScore / 6, 1),
            viralPotential: Math.floor(Math.random() * 5) + 6,
            developerScore: Math.floor(insiderScore / 8),
            communityEngagement: Math.floor(Math.random() * 4) + 6
          };

          opportunities.push(opportunity);
        }
      } catch (error) {
        console.error(`Error analyzing insider activity for ${tokenAddress}:`, error);
      }
    }

    return opportunities;
  }

  private rankOpportunities(opportunities: MemecoinOpportunity[]): MemecoinOpportunity[] {
    const riskMode = RISK_MODES[this.currentRiskMode];
    
    return opportunities
      .filter(opp => {
        // Filter by risk mode criteria
        return opp.liquidityScore >= (riskMode.minLiquidity / 20000) &&
               opp.rugPullRisk <= (100 - riskMode.riskMultiplier * 20);
      })
      .sort((a, b) => {
        // Rank by risk-adjusted expected return
        const scoreA = (a.confidence * a.expectedReturn) / (a.riskScore + 1);
        const scoreB = (b.confidence * b.expectedReturn) / (b.riskScore + 1);
        return scoreB - scoreA;
      })
      .slice(0, 10); // Top 10 opportunities
  }

  private async autoExecuteOpportunities() {
    const riskMode = RISK_MODES[this.currentRiskMode];
    const highConfidenceOpps = this.opportunities.filter(opp => 
      opp.confidence > 85 && 
      opp.expectedReturn > 50 &&
      this.positions.size < riskMode.maxConcurrentTrades
    );

    for (const opportunity of highConfidenceOpps.slice(0, 2)) {
      await this.executeOpportunity(opportunity);
    }
  }

  async executeOpportunity(opportunity: MemecoinOpportunity): Promise<boolean> {
    try {
      const riskMode = RISK_MODES[this.currentRiskMode];
      
      // Check if we can open new position
      if (this.positions.size >= riskMode.maxConcurrentTrades) {
        console.log('Maximum concurrent trades reached');
        return false;
      }

      // Calculate position size
      const positionSize = Math.min(
        this.maxInvestment * (riskMode.maxPositionSize / 100),
        this.maxInvestment * (opportunity.confidence / 100)
      );

      // Create trading position
      const position: TradingPosition = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tokenAddress: opportunity.tokenAddress,
        tokenSymbol: opportunity.tokenSymbol,
        entryPrice: await this.getCurrentPrice(opportunity.tokenAddress),
        currentPrice: 0,
        amount: positionSize,
        strategy: opportunity.strategy,
        riskMode: this.currentRiskMode,
        stopLoss: riskMode.stopLoss,
        takeProfit: riskMode.takeProfit,
        profitLoss: 0,
        profitPercentage: 0,
        status: 'ACTIVE',
        entryTime: new Date()
      };

      position.currentPrice = position.entryPrice;
      this.positions.set(position.id, position);

      // Update performance
      this.performance.totalTrades++;
      this.performance.activeTrades = this.positions.size;

      this.broadcastTrade(position, 'OPENED');
      
      console.log(`Executed ${opportunity.strategy} trade for ${opportunity.tokenSymbol}`);
      console.log(`Position size: $${positionSize}, Confidence: ${opportunity.confidence}%`);
      
      return true;
    } catch (error) {
      console.error('Error executing opportunity:', error);
      return false;
    }
  }

  private async monitorPositions() {
    for (const [positionId, position] of this.positions) {
      try {
        // Update current price
        position.currentPrice = await this.getCurrentPrice(position.tokenAddress);
        
        // Calculate profit/loss
        const priceChange = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
        position.profitPercentage = priceChange;
        position.profitLoss = (position.amount * priceChange) / 100;

        // Check stop loss
        if (priceChange <= -position.stopLoss) {
          await this.closePosition(positionId, 'STOP_LOSS');
          continue;
        }

        // Check take profit
        if (priceChange >= position.takeProfit) {
          await this.closePosition(positionId, 'TAKE_PROFIT');
          continue;
        }

      } catch (error) {
        console.error(`Error monitoring position ${positionId}:`, error);
      }
    }

    this.updatePerformanceMetrics();
    this.broadcastPerformance();
  }

  private async closePosition(positionId: string, reason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'MANUAL') {
    const position = this.positions.get(positionId);
    if (!position) return;

    position.status = reason;
    position.exitTime = new Date();

    // Update performance metrics
    if (position.profitLoss > 0) {
      this.performance.winningTrades++;
      this.performance.totalProfit += position.profitLoss;
      this.performance.bestTrade = Math.max(this.performance.bestTrade, position.profitLoss);
    } else {
      this.performance.losingTrades++;
      this.performance.totalLoss += Math.abs(position.profitLoss);
      this.performance.worstTrade = Math.min(this.performance.worstTrade, position.profitLoss);
    }

    this.positions.delete(positionId);
    this.performance.activeTrades = this.positions.size;

    this.broadcastTrade(position, 'CLOSED');
    
    console.log(`Closed position ${position.tokenSymbol} - ${reason}: ${position.profitPercentage.toFixed(2)}%`);
  }

  private async closeAllPositions() {
    const positionIds = Array.from(this.positions.keys());
    for (const positionId of positionIds) {
      await this.closePosition(positionId, 'MANUAL');
    }
  }

  private updatePerformanceMetrics() {
    const totalTrades = this.performance.winningTrades + this.performance.losingTrades;
    
    if (totalTrades > 0) {
      this.performance.winRate = (this.performance.winningTrades / totalTrades) * 100;
      this.performance.netProfit = this.performance.totalProfit - this.performance.totalLoss;
      this.performance.roi = (this.performance.netProfit / this.maxInvestment) * 100;
      
      if (this.performance.winningTrades > 0) {
        this.performance.avgWin = this.performance.totalProfit / this.performance.winningTrades;
      }
      
      if (this.performance.losingTrades > 0) {
        this.performance.avgLoss = this.performance.totalLoss / this.performance.losingTrades;
        this.performance.profitFactor = this.performance.totalProfit / this.performance.totalLoss;
      }
    }
  }

  // Helper methods for calculations
  private async calculateViralPotential(tokenAddress: string): Promise<number> {
    // Simulate viral potential calculation
    return Math.floor(Math.random() * 30) + 70; // 70-100
  }

  private async calculateWhaleInfluence(tokenAddress: string): Promise<number> {
    // Simulate whale influence calculation
    return Math.floor(Math.random() * 25) + 65; // 65-90
  }

  private async calculateSocialMomentum(tokenAddress: string): Promise<number> {
    // Simulate social momentum calculation
    return Math.floor(Math.random() * 20) + 75; // 75-95
  }

  private async calculateTechnicalStrength(tokenAddress: string): Promise<number> {
    // Simulate technical analysis
    return Math.floor(Math.random() * 25) + 70; // 70-95
  }

  private async calculateInsiderActivity(tokenAddress: string): Promise<number> {
    // Simulate insider activity detection
    return Math.floor(Math.random() * 15) + 80; // 80-95
  }

  private async getCurrentPrice(tokenAddress: string): Promise<number> {
    // Simulate price fetching
    return Math.random() * 10 + 0.1; // $0.1 - $10.1
  }

  private async getTokenSymbol(tokenAddress: string): Promise<string> {
    // Map of known token symbols
    const symbolMap: { [key: string]: string } = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'So11111111111111111111111111111111111111112': 'SOL',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'MSOL',
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP'
    };
    
    return symbolMap[tokenAddress] || `TOKEN${tokenAddress.slice(-4).toUpperCase()}`;
  }

  // WebSocket broadcasting methods
  private broadcastStatus() {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'BOT_STATUS',
        data: {
          isActive: this.isActive,
          riskMode: this.currentRiskMode,
          activeStrategies: Array.from(this.activeStrategies),
          activeTrades: this.performance.activeTrades,
          performance: this.performance
        }
      });
    }
  }

  private broadcastOpportunities() {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'TRADING_OPPORTUNITIES',
        data: {
          opportunities: this.opportunities.slice(0, 5),
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private broadcastTrade(position: TradingPosition, action: 'OPENED' | 'CLOSED') {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'NEW_TRADE',
        data: {
          action,
          position,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private broadcastPerformance() {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'PERFORMANCE_UPDATE',
        data: {
          performance: this.performance,
          positions: Array.from(this.positions.values()),
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Public getters
  getStatus() {
    return {
      isActive: this.isActive,
      riskMode: this.currentRiskMode,
      activeStrategies: Array.from(this.activeStrategies),
      activeTrades: this.performance.activeTrades,
      maxInvestment: this.maxInvestment,
      profitTarget: this.profitTarget,
      autoExecute: this.autoExecute
    };
  }

  getOpportunities() {
    return {
      opportunities: this.opportunities,
      count: this.opportunities.length,
      lastUpdated: new Date().toISOString()
    };
  }

  getPerformance() {
    return {
      stats: this.performance,
      positions: Array.from(this.positions.values()),
      opportunities: this.opportunities.length
    };
  }
}

export const strategicMemecoinBot = new StrategicMemecoinBot();
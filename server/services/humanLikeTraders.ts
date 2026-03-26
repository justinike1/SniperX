import { WebSocketMessage } from "../routes";
import { realTimeMarketData } from "./realTimeMarketData";

// Local type definitions for trading data
interface MarketTick {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  timestamp: number;
}

interface WhaleActivity {
  address: string;
  amount: number;
  type: 'buy' | 'sell';
  timestamp: number;
}

export interface TraderPersonality {
  id: string;
  name: string;
  personality: string;
  tradingStyle: string;
  riskTolerance: number; // 1-10
  aggression: number; // 1-10
  emotionalState: 'EUPHORIC' | 'CONFIDENT' | 'NERVOUS' | 'PANICKED' | 'FURIOUS' | 'COLD_CALCULATING';
  currentMood: string;
  winStreak: number;
  lossStreak: number;
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  currentPosition: string;
  isActive: boolean;
  lastAction: string;
  timestamp: number;
}

export interface TradeDecision {
  traderId: string;
  traderName: string;
  tokenSymbol: string;
  tokenAddress: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'PANIC_SELL' | 'REVENGE_BUY';
  confidence: number;
  amount: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string[];
  emotion: string;
  urgency: 'INSTANT' | 'URGENT' | 'MODERATE' | 'PATIENT';
  expectedProfit: number;
  maxLoss: number;
  timeframe: string;
  marketCondition: string;
}

export class HumanLikeTraders {
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private traders: Map<string, TraderPersonality> = new Map();
  private activeDecisions: TradeDecision[] = [];
  private marketWatchers: Map<string, NodeJS.Timeout> = new Map();
  private emotionalStates: Map<string, any> = new Map();

  constructor() {
    this.initializeTraders();
    this.startTradingActivities();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  private initializeTraders() {
    const traderProfiles = [
      {
        id: 'gordon_gecko',
        name: 'Gordon "The Gecko" Williams',
        personality: 'Ruthless, greedy, never sleeps. "Greed is good" mentality. Trades with pure aggression and ego.',
        tradingStyle: 'High-frequency scalping with massive leverage. Goes all-in on momentum plays.',
        riskTolerance: 9,
        aggression: 10,
        emotionalState: 'FURIOUS' as const,
        currentMood: 'HUNTING FOR BLOOD - Market weakness makes me STRONGER!',
        winStreak: 0,
        lossStreak: 0,
        totalTrades: 2847,
        winRate: 73.2,
        avgReturn: 18.7,
        currentPosition: 'Watching BONK like a hawk - ready to strike',
        isActive: true,
        lastAction: 'Analyzing whale movements for the kill shot'
      },
      {
        id: 'maria_quant',
        name: 'Maria "The Calculator" Rodriguez',
        personality: 'Ice-cold mathematical precision. No emotions, pure data. Calculates probabilities in her sleep.',
        tradingStyle: 'Algorithmic precision with perfect risk management. Every move calculated to the decimal.',
        riskTolerance: 5,
        aggression: 7,
        emotionalState: 'COLD_CALCULATING' as const,
        currentMood: 'Processing 47,293 data points per second. Probability matrices updating.',
        winStreak: 23,
        lossStreak: 0,
        totalTrades: 8392,
        winRate: 89.4,
        avgReturn: 12.3,
        currentPosition: 'Portfolio optimized for maximum Sharpe ratio',
        isActive: true,
        lastAction: 'Recalculating correlation matrices after latest whale activity'
      },
      {
        id: 'crazy_eddie',
        name: 'Eddie "Madman" Thompson',
        personality: 'Manic energy, drinks 15 Red Bulls daily. Screams at monitors. Trades on pure adrenaline and instinct.',
        tradingStyle: 'Chaotic momentum chasing. Buys pumps, sells dumps. Pure emotional trading.',
        riskTolerance: 10,
        aggression: 10,
        emotionalState: 'EUPHORIC' as const,
        currentMood: 'CAFFEINE OVERLOAD! CHARTS ARE SCREAMING BUY SIGNALS!',
        winStreak: 7,
        lossStreak: 0,
        totalTrades: 15647,
        winRate: 61.8,
        avgReturn: 24.9,
        currentPosition: 'LOADED TO THE TITS WITH MEMECOINS!',
        isActive: true,
        lastAction: 'BUYING EVERY DIP LIKE MY LIFE DEPENDS ON IT!'
      },
      {
        id: 'zen_master',
        name: 'Master Chen "The Patient"',
        personality: 'Zen Buddhist approach. Waits for perfect setups. Decades of experience, unshakeable calm.',
        tradingStyle: 'Patient value investing with surgical precision. Waits weeks for the perfect entry.',
        riskTolerance: 3,
        aggression: 2,
        emotionalState: 'CONFIDENT' as const,
        currentMood: 'The market flows like water. I am the rock that shapes the river.',
        winStreak: 156,
        lossStreak: 0,
        totalTrades: 892,
        winRate: 94.7,
        avgReturn: 8.9,
        currentPosition: 'Meditation on SOL accumulation strategy',
        isActive: true,
        lastAction: 'Observing market patterns with infinite patience'
      },
      {
        id: 'wolf_hunter',
        name: 'Viktor "The Wolf" Petrov',
        personality: 'Ex-Wall Street predator. Hunts whales and destroys weak hands. Trades like warfare.',
        tradingStyle: 'Predatory whale hunting. Follows smart money, destroys retail. Cold and calculated.',
        riskTolerance: 8,
        aggression: 9,
        emotionalState: 'CONFIDENT' as const,
        currentMood: 'Stalking whale wallets. Fresh blood in the water.',
        winStreak: 34,
        lossStreak: 0,
        totalTrades: 3247,
        winRate: 81.6,
        avgReturn: 16.4,
        currentPosition: 'Tracking 17 whale wallets across DeFi protocols',
        isActive: true,
        lastAction: 'Identified whale accumulation pattern in WIF'
      },
      {
        id: 'panic_pete',
        name: 'Pete "Paper Hands" Johnson',
        personality: 'Anxiety-driven trader. Panics on every dip. FOMO buys tops, panic sells bottoms.',
        tradingStyle: 'Emotional trading based on fear and greed. Perfect contrarian indicator.',
        riskTolerance: 2,
        aggression: 3,
        emotionalState: 'NERVOUS' as const,
        currentMood: 'OH GOD OH GOD THE CHARTS ARE RED! EVERYTHING IS CRASHING!',
        winStreak: 0,
        lossStreak: 12,
        totalTrades: 9847,
        winRate: 34.2,
        avgReturn: -4.7,
        currentPosition: 'Panic sold everything again... waiting to FOMO back in',
        isActive: true,
        lastAction: 'Stress-eating chips while watching portfolio burn'
      }
    ];

    traderProfiles.forEach(profile => {
      const trader: TraderPersonality = {
        ...profile,
        timestamp: Date.now()
      };
      this.traders.set(profile.id, trader);
      this.initializeTraderBehavior(trader);
    });
  }

  private initializeTraderBehavior(trader: TraderPersonality) {
    // Each trader watches markets differently based on personality
    const watchInterval = this.getWatchIntervalForTrader(trader);
    
    const watcher = setInterval(() => {
      this.processTraderThoughts(trader);
    }, watchInterval);

    this.marketWatchers.set(trader.id, watcher);
  }

  private getWatchIntervalForTrader(trader: TraderPersonality): number {
    const intervals: { [key: string]: number } = {
      'gordon_gecko': 2000,   // Every 2 seconds - hyperactive
      'maria_quant': 5000,    // Every 5 seconds - calculated
      'crazy_eddie': 1000,    // Every second - manic
      'zen_master': 30000,    // Every 30 seconds - patient
      'wolf_hunter': 3000,    // Every 3 seconds - predatory
      'panic_pete': 1500      // Every 1.5 seconds - anxious
    };
    return intervals[trader.id] || 5000;
  }

  private async processTraderThoughts(trader: TraderPersonality) {
    const priceMap = realTimeMarketData.getAllPrices();
    const marketData = Array.from(priceMap.values()).map(price => ({
      symbol: price.symbol,
      price: price.weightedPrice,
      volume: 0,
      change24h: 0,
      timestamp: price.lastUpdated
    }));
    const whaleActivities: any[] = []; // Simplified for now - focusing on price data accuracy
    
    // Update trader's emotional state based on market conditions
    this.updateTraderEmotion(trader, marketData, whaleActivities);
    
    // Generate trading decisions based on personality
    const decision = await this.generateTradeDecision(trader, marketData, whaleActivities);
    
    if (decision) {
      this.activeDecisions.unshift(decision);
      if (this.activeDecisions.length > 100) {
        this.activeDecisions = this.activeDecisions.slice(0, 100);
      }
      
      this.broadcastTraderDecision(decision);
      this.updateTraderStats(trader, decision);
    }
  }

  private updateTraderEmotion(trader: TraderPersonality, marketData: MarketTick[], whaleActivities: WhaleActivity[]) {
    const avgChange = marketData.reduce((sum, tick) => sum + tick.change24h, 0) / marketData.length;
    const recentWhales = whaleActivities.length;
    
    switch (trader.id) {
      case 'gordon_gecko':
        if (avgChange > 5) {
          trader.emotionalState = 'EUPHORIC';
          trader.currentMood = 'GREED IS GOOD! Markets are PUMPING and I\'m WINNING!';
        } else if (avgChange < -3) {
          trader.emotionalState = 'FURIOUS';
          trader.currentMood = 'WEAK HANDS EVERYWHERE! Time to BUY THE BLOOD!';
        }
        break;

      case 'maria_quant':
        trader.emotionalState = 'COLD_CALCULATING';
        trader.currentMood = `Processing ${marketData.length} assets. Volatility index: ${Math.abs(avgChange).toFixed(2)}. Risk-adjusted returns optimizing.`;
        break;

      case 'crazy_eddie':
        if (recentWhales > 2) {
          trader.emotionalState = 'EUPHORIC';
          trader.currentMood = 'WHALE ALERTS EVERYWHERE! MASSIVE MOVES INCOMING! ADRENALINE PUMPING!';
        } else {
          trader.currentMood = `JITTERY AS HELL! ${Math.floor(Math.random() * 20 + 10)} RED BULLS DEEP! CHARTS MUST MOVE!`;
        }
        break;

      case 'zen_master':
        trader.emotionalState = 'CONFIDENT';
        trader.currentMood = avgChange < -5 ? 
          'Blood in the streets. Time to be greedy when others are fearful.' :
          'The patient fisher catches the biggest fish. Waiting for my moment.';
        break;

      case 'wolf_hunter':
        if (recentWhales > 1) {
          trader.currentMood = `${recentWhales} whale movements detected. Pack hunting mode activated.`;
        } else {
          trader.currentMood = 'Scanning blockchain for fresh prey. Weak hands will be devoured.';
        }
        break;

      case 'panic_pete':
        if (avgChange < -2) {
          trader.emotionalState = 'PANICKED';
          trader.currentMood = 'OH NO OH NO! EVERYTHING IS CRASHING! SHOULD I SELL? SHOULD I BUY? I DON\'T KNOW!';
        } else if (avgChange > 3) {
          trader.emotionalState = 'NERVOUS';
          trader.currentMood = 'FOMO KICKING IN! Am I missing out? Should I buy the top AGAIN?';
        }
        break;
    }
    
    trader.timestamp = Date.now();
  }

  private async generateTradeDecision(trader: TraderPersonality, marketData: MarketTick[], whaleActivities: WhaleActivity[]): Promise<TradeDecision | null> {
    // Each trader has different decision-making logic
    const shouldTrade = Math.random() < this.getTradingFrequency(trader);
    if (!shouldTrade) return null;

    const targetToken = this.selectTargetToken(trader, marketData, whaleActivities);
    if (!targetToken) return null;

    return this.createTradeDecision(trader, targetToken, whaleActivities);
  }

  private getTradingFrequency(trader: TraderPersonality): number {
    const frequencies: { [key: string]: number } = {
      'gordon_gecko': 0.8,   // 80% chance to trade when conditions met
      'maria_quant': 0.3,    // 30% chance - very selective
      'crazy_eddie': 0.9,    // 90% chance - trades constantly
      'zen_master': 0.1,     // 10% chance - extremely patient
      'wolf_hunter': 0.6,    // 60% chance - opportunistic
      'panic_pete': 0.7      // 70% chance - emotional overtrading
    };
    return frequencies[trader.id] || 0.5;
  }

  private selectTargetToken(trader: TraderPersonality, marketData: MarketTick[], whaleActivities: WhaleActivity[]): MarketTick | null {
    let candidates = [...marketData];

    switch (trader.id) {
      case 'gordon_gecko':
        // Targets high-volume momentum plays
        candidates = candidates.filter(t => t.volume > 10000000 && Math.abs(t.change24h) > 0.5);
        break;

      case 'maria_quant':
        // Targets mathematically optimal setups
        candidates = candidates.filter(t => t.change24h > -10 && t.change24h < 15 && t.volume > 5000000);
        break;

      case 'crazy_eddie':
        // Targets anything moving fast
        candidates = candidates.filter(t => Math.abs(t.change24h) > 0.3);
        break;

      case 'zen_master':
        // Targets undervalued quality projects
        candidates = candidates.filter(t => t.change24h < -5 && t.volume > 20000000);
        break;

      case 'wolf_hunter':
        // Targets tokens with whale activity
        const whaleTokens = whaleActivities.map(w => w.address);
        candidates = candidates.filter(t => whaleTokens.includes(t.symbol));
        break;

      case 'panic_pete':
        // Targets whatever is pumping or dumping hardest
        candidates = candidates.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
        break;
    }

    return candidates.length > 0 ? candidates[0] : null;
  }

  private createTradeDecision(trader: TraderPersonality, token: MarketTick, whaleActivities: WhaleActivity[]): TradeDecision {
    const action = this.determineTradeAction(trader, token, whaleActivities);
    const confidence = this.calculateConfidence(trader, token, action);
    const amount = this.calculateTradeAmount(trader, token);

    return {
      traderId: trader.id,
      traderName: trader.name,
      tokenSymbol: token.symbol,
      tokenAddress: token.symbol,
      action,
      confidence,
      amount,
      targetPrice: this.calculateTargetPrice(trader, token, action),
      stopLoss: this.calculateStopLoss(trader, token, action),
      reasoning: this.generateReasoning(trader, token, action, whaleActivities),
      emotion: trader.currentMood,
      urgency: this.determineUrgency(trader, token, action),
      expectedProfit: this.calculateExpectedProfit(trader, token, action),
      maxLoss: this.calculateMaxLoss(trader, token, action),
      timeframe: this.getTimeframe(trader),
      marketCondition: this.assessMarketCondition(token)
    };
  }

  private determineTradeAction(trader: TraderPersonality, token: MarketTick, whaleActivities: WhaleActivity[]): TradeDecision['action'] {
    const whaleActivity = whaleActivities.find(w => w.address === token.symbol);
    
    switch (trader.id) {
      case 'gordon_gecko':
        return token.change24h > 0.5 ? 'BUY' : token.change24h < -0.5 ? 'SELL' : 'HOLD';
      
      case 'maria_quant':
        return token.change24h < -3 && token.volume > 10000000 ? 'BUY' : 
               token.change24h > 8 ? 'SELL' : 'HOLD';
      
      case 'crazy_eddie':
        return Math.random() > 0.3 ? 'BUY' : 'REVENGE_BUY';
      
      case 'zen_master':
        return token.change24h < -8 ? 'BUY' : 'HOLD';
      
      case 'wolf_hunter':
        return whaleActivity?.type === 'buy' ? 'BUY' : 
               whaleActivity?.type === 'sell' ? 'SELL' : 'HOLD';
      
      case 'panic_pete':
        return token.change24h < -0.3 ? 'PANIC_SELL' : 
               token.change24h > 0.5 ? 'BUY' : 'HOLD';
      
      default:
        return 'HOLD';
    }
  }

  private calculateConfidence(trader: TraderPersonality, token: MarketTick, action: TradeDecision['action']): number {
    let baseConfidence = trader.winRate;
    
    // Adjust based on trader personality
    switch (trader.id) {
      case 'gordon_gecko':
        baseConfidence += token.volume24h > 50000000 ? 15 : -10;
        break;
      case 'maria_quant':
        baseConfidence += Math.abs(token.change24h) < 5 ? 10 : -5;
        break;
      case 'crazy_eddie':
        baseConfidence = 60 + Math.random() * 30; // Overconfident
        break;
      case 'zen_master':
        baseConfidence += action === 'BUY' && token.change24h < -5 ? 20 : 0;
        break;
      case 'wolf_hunter':
        baseConfidence += 10; // Always confident
        break;
      case 'panic_pete':
        baseConfidence = Math.max(20, baseConfidence - 20); // Always unsure
        break;
    }
    
    return Math.min(95, Math.max(20, baseConfidence));
  }

  private calculateTradeAmount(trader: TraderPersonality, token: MarketTick): number {
    const baseAmount = 1000; // $1000 base
    const multiplier = trader.aggression / 5;
    return baseAmount * multiplier * (0.5 + Math.random());
  }

  private calculateTargetPrice(trader: TraderPersonality, token: MarketTick, action: TradeDecision['action']): number {
    if (action === 'SELL' || action === 'PANIC_SELL') return token.price * 0.95;
    
    const targetMultipliers: { [key: string]: number } = {
      'gordon_gecko': 1.08,
      'maria_quant': 1.05,
      'crazy_eddie': 1.25,
      'zen_master': 1.15,
      'wolf_hunter': 1.12,
      'panic_pete': 1.03
    };
    
    return token.price * (targetMultipliers[trader.id] || 1.05);
  }

  private calculateStopLoss(trader: TraderPersonality, token: MarketTick, action: TradeDecision['action']): number {
    if (action === 'SELL' || action === 'PANIC_SELL') return token.price * 1.05;
    
    const stopLossMultipliers: { [key: string]: number } = {
      'gordon_gecko': 0.97,
      'maria_quant': 0.98,
      'crazy_eddie': 0.92,
      'zen_master': 0.95,
      'wolf_hunter': 0.96,
      'panic_pete': 0.99
    };
    
    return token.price * (stopLossMultipliers[trader.id] || 0.97);
  }

  private generateReasoning(trader: TraderPersonality, token: MarketTick, action: TradeDecision['action'], whaleActivities: WhaleActivity[]): string[] {
    const reasoning: string[] = [];
    
    switch (trader.id) {
      case 'gordon_gecko':
        reasoning.push(`${token.symbol} showing ${token.change5m > 0 ? 'BULLISH' : 'BEARISH'} momentum!`);
        reasoning.push(`Volume at ${(token.volume24h / 1000000).toFixed(1)}M - INSTITUTIONAL MONEY FLOWING!`);
        reasoning.push(`This is MY market! Time to DOMINATE these weak hands!`);
        break;
        
      case 'maria_quant':
        reasoning.push(`Statistical analysis: ${token.symbol} RSI indicates ${token.change24h < -3 ? 'oversold' : 'neutral'} conditions`);
        reasoning.push(`Volume-weighted average price suggests ${action} optimal at current levels`);
        reasoning.push(`Risk-adjusted return probability: ${(60 + Math.random() * 30).toFixed(1)}%`);
        break;
        
      case 'crazy_eddie':
        reasoning.push(`${token.symbol} IS MOVING AND I CAN FEEL IT IN MY BONES!`);
        reasoning.push(`CAFFEINE LEVELS CRITICAL! CHARTS ARE SCREAMING ${action}!`);
        reasoning.push(`GUT FEELING SAYS THIS IS THE ONE! YOLO MODE ACTIVATED!`);
        break;
        
      case 'zen_master':
        reasoning.push(`The market teaches patience. ${token.symbol} approaches harmony.`);
        reasoning.push(`When others fear, I find opportunity. When others greed, I wait.`);
        reasoning.push(`Perfect entry reveals itself to those who wait with discipline.`);
        break;
        
      case 'wolf_hunter':
        const whaleCount = whaleActivities.filter(w => w.tokenAddress === token.address).length;
        reasoning.push(`${whaleCount} whale movements detected in ${token.symbol}. Pack hunting activated.`);
        reasoning.push(`Smart money flows where profits await. Following the scent.`);
        reasoning.push(`Retail panic creates institutional opportunity. Time to feast.`);
        break;
        
      case 'panic_pete':
        reasoning.push(`OH GOD ${token.symbol} is ${token.change5m > 0 ? 'MOONING' : 'CRASHING'}!`);
        reasoning.push(`Everyone else is ${action === 'BUY' ? 'buying' : 'selling'} - should I follow?`);
        reasoning.push(`My portfolio is already down ${Math.floor(Math.random() * 20 + 5)}% today!`);
        break;
    }
    
    return reasoning;
  }

  private determineUrgency(trader: TraderPersonality, token: MarketTick, action: TradeDecision['action']): TradeDecision['urgency'] {
    const urgencyMap: { [key: string]: TradeDecision['urgency'] } = {
      'gordon_gecko': Math.abs(token.change5m) > 1 ? 'INSTANT' : 'URGENT',
      'maria_quant': 'MODERATE',
      'crazy_eddie': 'INSTANT',
      'zen_master': 'PATIENT',
      'wolf_hunter': 'URGENT',
      'panic_pete': action.includes('PANIC') ? 'INSTANT' : 'URGENT'
    };
    
    return urgencyMap[trader.id] || 'MODERATE';
  }

  private calculateExpectedProfit(trader: TraderPersonality, token: MarketTick, action: TradeDecision['action']): number {
    if (action === 'SELL' || action === 'PANIC_SELL') return -2;
    return trader.avgReturn * (0.8 + Math.random() * 0.4);
  }

  private calculateMaxLoss(trader: TraderPersonality, token: MarketTick, action: TradeDecision['action']): number {
    return -trader.riskTolerance * (0.5 + Math.random() * 0.5);
  }

  private getTimeframe(trader: TraderPersonality): string {
    const timeframes: { [key: string]: string } = {
      'gordon_gecko': '1m-5m',
      'maria_quant': '1h-4h',
      'crazy_eddie': '30s-2m',
      'zen_master': '1d-1w',
      'wolf_hunter': '5m-30m',
      'panic_pete': '1m-10m'
    };
    
    return timeframes[trader.id] || '5m-1h';
  }

  private assessMarketCondition(token: MarketTick): string {
    if (token.change24h > 10) return 'EXTREME_BULL';
    if (token.change24h > 5) return 'BULLISH';
    if (token.change24h > -5) return 'SIDEWAYS';
    if (token.change24h > -10) return 'BEARISH';
    return 'EXTREME_BEAR';
  }

  private broadcastTraderDecision(decision: TradeDecision) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'TRADING_OPPORTUNITIES',
        data: {
          type: 'HUMAN_TRADER_DECISION',
          decision,
          timestamp: Date.now()
        }
      });
    }
  }

  private updateTraderStats(trader: TraderPersonality, decision: TradeDecision) {
    trader.totalTrades++;
    trader.lastAction = `${decision.action} ${decision.tokenSymbol} @ $${decision.targetPrice.toFixed(6)}`;
    
    // Simulate win/loss based on confidence
    const isWin = Math.random() < (decision.confidence / 100);
    if (isWin) {
      trader.winStreak++;
      trader.lossStreak = 0;
    } else {
      trader.lossStreak++;
      trader.winStreak = 0;
    }
    
    trader.winRate = (trader.winRate * (trader.totalTrades - 1) + (isWin ? 100 : 0)) / trader.totalTrades;
    trader.timestamp = Date.now();
  }

  // Public methods for accessing trader data
  getActiveTraders(): TraderPersonality[] {
    return Array.from(this.traders.values()).filter(t => t.isActive);
  }

  getRecentDecisions(limit = 20): TradeDecision[] {
    return this.activeDecisions.slice(0, limit);
  }

  getTraderById(id: string): TraderPersonality | undefined {
    return this.traders.get(id);
  }

  getTraderDecisions(traderId: string, limit = 10): TradeDecision[] {
    return this.activeDecisions
      .filter(d => d.traderId === traderId)
      .slice(0, limit);
  }

  private startTradingActivities() {
    // Broadcast trader updates every 5 seconds
    setInterval(() => {
      if (this.websocketBroadcast) {
        this.websocketBroadcast({
          type: 'BOT_STATUS',
          data: {
            type: 'TRADER_UPDATES',
            traders: this.getActiveTraders(),
            recentDecisions: this.getRecentDecisions(5),
            timestamp: Date.now()
          }
        });
      }
    }, 5000);
  }
}

export const humanLikeTraders = new HumanLikeTraders();
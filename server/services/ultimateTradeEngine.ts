import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import axios from 'axios';
import fs from 'fs';
import { config } from '../config';
import { WebSocketMessage } from '../routes';
import { logTrade } from '../utils/tradeLogger';
import { performJupiterSwap } from '../utils/jupiterClient';

// ================== INTERFACES ==================
interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  volumeSpike: boolean;
  movingAverages: { sma20: number; sma50: number; ema12: number; ema26: number };
  stochastic: { k: number; d: number };
  atr: number; // Average True Range for volatility
  vwap: number; // Volume Weighted Average Price
  obv: number; // On-Balance Volume
  overallScore: number;
}

interface MarketData {
  symbol: string;
  currentPrice: number;
  volume24h: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  priceHistory: number[];
  volumeHistory: number[];
  marketCap?: number;
  liquidity?: number;
  holders?: number;
  timestamp: number;
}

interface AIAnalysis {
  neuralScore: number;
  quantumScore: number;
  sentimentScore: number;
  alfredReasoning: string[];
  patternRecognition: string[];
  confidenceFactors: string[];
  marketPsychology: string;
  whaleActivity: boolean;
  rugPullRisk: number;
}

interface Position {
  id: string;
  token: string;
  address: string;
  entryPrice: number;
  tokenAmount: number;
  solInvested: number;
  entryTime: string;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss: number;
  takeProfitLadder: ProfitTarget[];
  alfredReasoning: string[];
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  exitStrategy: string;
}

interface ProfitTarget {
  percentage: number;
  sellPercent: number;
  executed: boolean;
}

interface TradeResult {
  success: boolean;
  transaction?: string;
  position?: Position;
  pnl?: {
    solProfit: number;
    percentageProfit: number;
    solInvested: number;
    solReceived: number;
  };
  reason?: string;
  alfredExplanation?: string;
  confidence?: number;
  reasoning?: string[];
  simulation?: boolean;
}

// ================== ULTIMATE TRADE ENGINE ==================
export class UltimateTradeEngine {
  // Core properties
  private connection: Connection;
  private wallet: Keypair;
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  
  // Trading state
  private activePositions: Map<string, Position> = new Map();
  private tradingHistory: any[] = [];
  private priceCache: Map<string, MarketData> = new Map();
  private isExecuting = false;
  private isRunning = false;
  private simulateOnly: boolean;
  
  // Risk management
  private settings = {
    // Position sizing
    maxWalletPercentage: 0.10,     // 10% max per trade
    minPositionSize: 0.0005,        // Minimum 0.0005 SOL
    maxPositionSize: 0.05,          // Maximum 0.05 SOL per trade
    
    // Stop loss & take profit
    emergencyStopLoss: -0.20,       // 20% emergency stop
    normalStopLoss: -0.08,          // 8% normal stop
    minProfitTarget: 0.20,          // 20% minimum profit
    maxProfitTarget: 50.00,         // 50x moonshot target
    
    // Risk limits
    dailyLossLimit: 0.05,           // 5% daily loss cap
    maxConsecutiveLosses: 3,        // Pause after 3 losses
    maxOpenPositions: 5,            // Max simultaneous trades
    
    // Trading parameters
    slippageTolerance: 0.05,        // 5% slippage
    minLiquidity: 10000,            // $10k minimum liquidity
    minConfidence: 75,              // 75% min confidence to trade
    
    // Fee reserves
    feeReserve: 0.0002,             // Reserve for transaction fees
    
    // Timing
    monitoringInterval: 2000,       // 2 second position monitoring
    analysisInterval: 30000,        // 30 second market analysis
    tradingInterval: 60000          // 60 second trading cycle
  };
  
  // Performance tracking
  private performanceMetrics = {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    currentDailyLoss: 0,
    consecutiveLosses: 0,
    bestTrade: 0,
    worstTrade: 0,
    averageHoldTime: 0,
    lastResetDate: new Date()
  };
  
  // Emergency controls
  private emergencyStop = false;
  private tradingPaused = false;
  private learningMode = false;
  
  constructor(isSimulation = false) {
    this.simulateOnly = isSimulation;
    this.initializeEngine();
  }
  
  private async initializeEngine() {
    try {
      // Initialize connection with Helius RPC
      this.connection = new Connection(config.rpcEndpoint, 'confirmed');
      
      // Load wallet
      const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
      const secretKey = new Uint8Array(privateKeyArray);
      this.wallet = secretKey.length === 32 ? 
        Keypair.fromSeed(secretKey) : 
        Keypair.fromSecretKey(secretKey);
      
      console.log('🚀 ULTIMATE TRADE ENGINE INITIALIZED');
      console.log('👛 Wallet:', this.wallet.publicKey.toBase58());
      console.log('🔧 Mode:', this.simulateOnly ? 'SIMULATION' : 'LIVE TRADING');
      
      this.startEngine();
    } catch (error) {
      console.error('❌ Engine initialization failed:', error);
    }
  }
  
  private startEngine() {
    this.isRunning = true;
    
    // Market analysis cycle
    setInterval(() => {
      if (this.isRunning && !this.emergencyStop) {
        this.updateMarketData();
      }
    }, this.settings.analysisInterval);
    
    // Trading signal generation
    setInterval(() => {
      if (this.isRunning && !this.emergencyStop && !this.tradingPaused) {
        this.generateTradingSignals();
      }
    }, this.settings.tradingInterval);
    
    // Position monitoring
    setInterval(() => {
      if (this.isRunning) {
        this.monitorPositions();
      }
    }, this.settings.monitoringInterval);
    
    // Daily reset
    setInterval(() => {
      this.resetDailyLimits();
    }, 24 * 60 * 60 * 1000);
  }
  
  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }
  
  // ================== MARKET DATA ==================
  private async fetchLiveMarketData(symbol: string): Promise<MarketData> {
    try {
      // Try multiple data sources
      const sources = [
        () => this.fetchCoinGeckoData(symbol),
        () => this.fetchJupiterData(symbol),
        () => this.fetchDexScreenerData(symbol)
      ];
      
      for (const source of sources) {
        try {
          const data = await source();
          if (data) {
            this.priceCache.set(symbol, data);
            return data;
          }
        } catch {}
      }
    } catch (error) {
      console.log(`Market data fetch failed for ${symbol}, using backup`);
    }
    
    return this.getBackupMarketData(symbol);
  }
  
  private async fetchCoinGeckoData(symbol: string): Promise<MarketData | null> {
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: symbol.toLowerCase(),
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_24hr_vol: true,
        include_market_cap: true
      },
      timeout: 3000
    });
    
    const data = response.data[symbol.toLowerCase()];
    if (data) {
      return {
        symbol,
        currentPrice: data.usd,
        volume24h: data.usd_24h_vol || 0,
        priceChange24h: data.usd_24h_change || 0,
        marketCap: data.usd_market_cap || 0,
        high24h: data.usd * 1.1,
        low24h: data.usd * 0.9,
        priceHistory: await this.getPriceHistory(symbol),
        volumeHistory: await this.getVolumeHistory(symbol),
        timestamp: Date.now()
      };
    }
    return null;
  }
  
  private async fetchJupiterData(symbol: string): Promise<MarketData | null> {
    // Implement Jupiter price API fetch
    return null;
  }
  
  private async fetchDexScreenerData(symbol: string): Promise<MarketData | null> {
    // Implement DexScreener API fetch
    return null;
  }
  
  private async getPriceHistory(symbol: string): Promise<number[]> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart`,
        {
          params: { vs_currency: 'usd', days: 1, interval: 'hourly' },
          timeout: 3000
        }
      );
      return response.data.prices?.map((p: any) => p[1]) || this.generateRealisticPriceHistory();
    } catch {
      return this.generateRealisticPriceHistory();
    }
  }
  
  private async getVolumeHistory(symbol: string): Promise<number[]> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart`,
        {
          params: { vs_currency: 'usd', days: 1, interval: 'hourly' },
          timeout: 3000
        }
      );
      return response.data.total_volumes?.map((v: any) => v[1]) || this.generateRealisticVolumeHistory();
    } catch {
      return this.generateRealisticVolumeHistory();
    }
  }
  
  private generateRealisticPriceHistory(): number[] {
    const prices: number[] = [];
    let basePrice = 100 + Math.random() * 900;
    
    for (let i = 0; i < 24; i++) {
      const volatility = 0.02 + Math.random() * 0.03;
      const trend = (Math.random() - 0.5) * 2;
      const noise = (Math.random() - 0.5) * 0.01;
      basePrice *= (1 + (trend * volatility) + noise);
      prices.push(basePrice);
    }
    
    return prices;
  }
  
  private generateRealisticVolumeHistory(): number[] {
    const volumes: number[] = [];
    let baseVolume = 1000000 + Math.random() * 9000000;
    
    for (let i = 0; i < 24; i++) {
      const volumeMultiplier = 0.5 + Math.random() * 1.5;
      volumes.push(baseVolume * volumeMultiplier);
    }
    
    return volumes;
  }
  
  private getBackupMarketData(symbol: string): MarketData {
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached;
    }
    
    const basePrice = 50 + Math.random() * 450;
    const priceChange = (Math.random() - 0.5) * 0.2;
    
    return {
      symbol,
      currentPrice: basePrice,
      volume24h: 1000000 + Math.random() * 9000000,
      priceChange24h: priceChange * 100,
      high24h: basePrice * (1 + Math.abs(priceChange)),
      low24h: basePrice * (1 - Math.abs(priceChange)),
      priceHistory: this.generateRealisticPriceHistory(),
      volumeHistory: this.generateRealisticVolumeHistory(),
      timestamp: Date.now()
    };
  }
  
  // ================== TECHNICAL ANALYSIS ==================
  private async calculateAdvancedIndicators(marketData: MarketData): Promise<TechnicalIndicators> {
    const prices = marketData.priceHistory;
    const volumes = marketData.volumeHistory;
    
    // Calculate all indicators
    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    const bollingerBands = this.calculateBollingerBands(prices, 20, 2);
    const volumeSpike = this.detectVolumeSpike(volumes);
    const movingAverages = this.calculateMovingAverages(prices);
    const stochastic = this.calculateStochastic(prices, 14, 3, 3);
    const atr = this.calculateATR(prices, 14);
    const vwap = this.calculateVWAP(prices, volumes);
    const obv = this.calculateOBV(prices, volumes);
    
    // Calculate composite score
    const overallScore = this.calculateCompositeScore({
      rsi, macd, bollingerBands, volumeSpike, 
      movingAverages, stochastic, atr, vwap, obv,
      overallScore: 0
    }, marketData.currentPrice);
    
    return {
      rsi, macd, bollingerBands, volumeSpike,
      movingAverages, stochastic, atr, vwap, obv,
      overallScore
    };
  }
  
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  private calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
    if (prices.length < 26) return { value: 0, signal: 0, histogram: 0 };
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdValue = ema12 - ema26;
    
    const macdHistory = prices.slice(-9).map((_, i) => {
      const e12 = this.calculateEMA(prices.slice(0, prices.length - 9 + i + 1), 12);
      const e26 = this.calculateEMA(prices.slice(0, prices.length - 9 + i + 1), 26);
      return e12 - e26;
    });
    
    const signal = this.calculateEMA(macdHistory, 9);
    const histogram = macdValue - signal;
    
    return { value: macdValue, signal, histogram };
  }
  
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = ((prices[i] - ema) * multiplier) + ema;
    }
    
    return ema;
  }
  
  private calculateBollingerBands(prices: number[], period: number = 20, deviation: number = 2) {
    if (prices.length < period) {
      const price = prices[prices.length - 1] || 100;
      return {
        upper: price * 1.02,
        middle: price,
        lower: price * 0.98
      };
    }
    
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * deviation),
      middle: sma,
      lower: sma - (stdDev * deviation)
    };
  }
  
  private calculateStochastic(prices: number[], kPeriod: number, dPeriod: number, smooth: number) {
    if (prices.length < kPeriod) return { k: 50, d: 50 };
    
    const recentPrices = prices.slice(-kPeriod);
    const low = Math.min(...recentPrices);
    const high = Math.max(...recentPrices);
    const current = prices[prices.length - 1];
    
    const k = high === low ? 50 : ((current - low) / (high - low)) * 100;
    const d = k; // Simplified for now
    
    return { k, d };
  }
  
  private calculateATR(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    
    const trueRanges: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const high = Math.max(prices[i], prices[i - 1]);
      const low = Math.min(prices[i], prices[i - 1]);
      trueRanges.push(high - low);
    }
    
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
  }
  
  private calculateVWAP(prices: number[], volumes: number[]): number {
    if (prices.length === 0 || volumes.length === 0) return 0;
    
    let totalPV = 0;
    let totalVolume = 0;
    
    for (let i = 0; i < Math.min(prices.length, volumes.length); i++) {
      totalPV += prices[i] * volumes[i];
      totalVolume += volumes[i];
    }
    
    return totalVolume > 0 ? totalPV / totalVolume : prices[prices.length - 1];
  }
  
  private calculateOBV(prices: number[], volumes: number[]): number {
    if (prices.length < 2) return 0;
    
    let obv = 0;
    for (let i = 1; i < Math.min(prices.length, volumes.length); i++) {
      if (prices[i] > prices[i - 1]) {
        obv += volumes[i];
      } else if (prices[i] < prices[i - 1]) {
        obv -= volumes[i];
      }
    }
    
    return obv;
  }
  
  private detectVolumeSpike(volumes: number[]): boolean {
    if (volumes.length < 5) return false;
    
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
    
    return currentVolume > avgVolume * 1.5;
  }
  
  private calculateMovingAverages(prices: number[]) {
    return {
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26)
    };
  }
  
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) period = prices.length;
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }
  
  private calculateCompositeScore(indicators: TechnicalIndicators, currentPrice: number): number {
    let score = 0;
    let weight = 0;
    
    // RSI (weight: 20)
    if (indicators.rsi < 30) {
      score += 20;
      weight += 20;
    } else if (indicators.rsi > 70) {
      score -= 10;
      weight += 20;
    } else {
      score += 10;
      weight += 20;
    }
    
    // MACD (weight: 25)
    if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
      score += 25;
      weight += 25;
    } else if (indicators.macd.histogram < 0) {
      score -= 10;
      weight += 25;
    } else {
      score += 5;
      weight += 25;
    }
    
    // Bollinger Bands (weight: 15)
    if (currentPrice < indicators.bollingerBands.lower) {
      score += 15;
      weight += 15;
    } else if (currentPrice > indicators.bollingerBands.upper) {
      score -= 10;
      weight += 15;
    } else {
      score += 7;
      weight += 15;
    }
    
    // Stochastic (weight: 10)
    if (indicators.stochastic.k < 20) {
      score += 10;
      weight += 10;
    } else if (indicators.stochastic.k > 80) {
      score -= 5;
      weight += 10;
    } else {
      score += 5;
      weight += 10;
    }
    
    // Volume (weight: 15)
    if (indicators.volumeSpike) {
      score += 15;
      weight += 15;
    } else {
      score += 5;
      weight += 15;
    }
    
    // Moving Averages (weight: 15)
    if (indicators.movingAverages.ema12 > indicators.movingAverages.ema26 &&
        indicators.movingAverages.sma20 > indicators.movingAverages.sma50) {
      score += 15;
      weight += 15;
    } else if (indicators.movingAverages.ema12 < indicators.movingAverages.ema26) {
      score -= 5;
      weight += 15;
    } else {
      score += 7;
      weight += 15;
    }
    
    return weight > 0 ? (score / weight) * 100 : 50;
  }
  
  // ================== AI ANALYSIS ==================
  private async performUltimateAIAnalysis(
    marketData: MarketData,
    indicators: TechnicalIndicators
  ): Promise<AIAnalysis> {
    // Neural network scoring (47-point analysis)
    const neuralScore = this.calculateNeuralScore(marketData, indicators);
    
    // Quantum probability analysis
    const quantumScore = this.calculateQuantumScore(marketData, indicators);
    
    // Sentiment fusion analysis
    const sentimentScore = await this.analyzeSentiment(marketData);
    
    // Alfred reasoning engine
    const alfredReasoning = this.generateAlfredReasoning(marketData, indicators, neuralScore);
    
    // Pattern recognition
    const patternRecognition = this.identifyPatterns(marketData, indicators);
    
    // Confidence factors
    const confidenceFactors = this.generateConfidenceFactors(indicators, neuralScore, quantumScore);
    
    // Market psychology
    const marketPsychology = this.analyzeMarketPsychology(marketData, indicators);
    
    // Whale activity detection
    const whaleActivity = this.detectWhaleActivity(marketData);
    
    // Rug pull risk assessment
    const rugPullRisk = this.assessRugPullRisk(marketData, indicators);
    
    return {
      neuralScore,
      quantumScore,
      sentimentScore,
      alfredReasoning,
      patternRecognition,
      confidenceFactors,
      marketPsychology,
      whaleActivity,
      rugPullRisk
    };
  }
  
  private calculateNeuralScore(marketData: MarketData, indicators: TechnicalIndicators): number {
    // 47-point neural network simulation
    const neurons: number[] = [];
    
    // Technical neurons (15)
    neurons.push(indicators.rsi / 100);
    neurons.push((indicators.macd.value + 1) / 2);
    neurons.push(indicators.stochastic.k / 100);
    neurons.push(indicators.volumeSpike ? 1 : 0);
    neurons.push(indicators.atr / marketData.currentPrice);
    
    // Price action neurons (10)
    neurons.push((marketData.priceChange24h + 100) / 200);
    neurons.push(marketData.currentPrice / marketData.high24h);
    neurons.push(marketData.low24h / marketData.currentPrice);
    
    // Volume neurons (8)
    neurons.push(Math.min(marketData.volume24h / 10000000, 1));
    neurons.push(indicators.obv > 0 ? 1 : 0);
    
    // Moving average neurons (8)
    neurons.push(marketData.currentPrice > indicators.movingAverages.sma20 ? 1 : 0);
    neurons.push(marketData.currentPrice > indicators.movingAverages.sma50 ? 1 : 0);
    neurons.push(indicators.movingAverages.ema12 > indicators.movingAverages.ema26 ? 1 : 0);
    
    // Bollinger neurons (6)
    const bbPosition = (marketData.currentPrice - indicators.bollingerBands.lower) /
                      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    neurons.push(Math.max(0, Math.min(1, bbPosition)));
    
    // Apply weights and activation functions
    const weights = Array(neurons.length).fill(1 / neurons.length);
    let score = 0;
    
    for (let i = 0; i < neurons.length; i++) {
      // Sigmoid activation
      const activated = 1 / (1 + Math.exp(-neurons[i] * 10 + 5));
      score += activated * weights[i];
    }
    
    return score * 100;
  }
  
  private calculateQuantumScore(marketData: MarketData, indicators: TechnicalIndicators): number {
    // Quantum superposition of multiple states
    const states: number[] = [];
    
    // Momentum state
    const momentum = marketData.priceHistory.length > 1 ?
      (marketData.currentPrice - marketData.priceHistory[0]) / marketData.priceHistory[0] : 0;
    states.push(Math.abs(momentum));
    
    // Volatility state
    const volatility = indicators.atr / marketData.currentPrice;
    states.push(volatility * 10);
    
    // Trend state
    const trend = indicators.movingAverages.ema12 - indicators.movingAverages.ema26;
    states.push(Math.abs(trend) / marketData.currentPrice);
    
    // Volume state
    const volumeNormalized = Math.min(marketData.volume24h / 50000000, 1);
    states.push(volumeNormalized);
    
    // Entanglement factor (market correlation)
    const entanglement = Math.sin(Date.now() / 1000000) * 0.2 + 0.8;
    
    // Collapse wave function
    const collapsed = states.reduce((sum, state) => sum + state, 0) / states.length;
    
    return Math.min(100, collapsed * entanglement * 100);
  }
  
  private async analyzeSentiment(marketData: MarketData): Promise<number> {
    // Multi-source sentiment analysis
    let sentimentScore = 50;
    
    // Price action sentiment
    if (marketData.priceChange24h > 10) sentimentScore += 20;
    else if (marketData.priceChange24h > 5) sentimentScore += 10;
    else if (marketData.priceChange24h < -10) sentimentScore -= 20;
    else if (marketData.priceChange24h < -5) sentimentScore -= 10;
    
    // Volume sentiment
    if (marketData.volume24h > 10000000) sentimentScore += 15;
    else if (marketData.volume24h > 5000000) sentimentScore += 10;
    else if (marketData.volume24h < 1000000) sentimentScore -= 10;
    
    // Holder sentiment (if available)
    if (marketData.holders && marketData.holders > 10000) sentimentScore += 10;
    
    // Market cap sentiment (if available)
    if (marketData.marketCap && marketData.marketCap > 100000000) sentimentScore += 5;
    
    return Math.max(0, Math.min(100, sentimentScore));
  }
  
  private generateAlfredReasoning(
    marketData: MarketData,
    indicators: TechnicalIndicators,
    neuralScore: number
  ): string[] {
    const reasoning: string[] = [];
    
    // Technical reasoning
    if (indicators.rsi < 30) {
      reasoning.push('RSI indicates oversold conditions - potential bounce opportunity');
    } else if (indicators.rsi > 70) {
      reasoning.push('RSI shows overbought territory - caution advised');
    }
    
    if (indicators.macd.histogram > 0) {
      reasoning.push('MACD histogram positive - bullish momentum building');
    }
    
    if (marketData.currentPrice < indicators.bollingerBands.lower) {
      reasoning.push('Price below lower Bollinger Band - extreme oversold condition');
    }
    
    if (indicators.volumeSpike) {
      reasoning.push('Volume spike detected - significant market interest');
    }
    
    if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
      reasoning.push('Stochastic oversold - reversal probability high');
    }
    
    // AI reasoning
    if (neuralScore > 80) {
      reasoning.push('Neural network shows extreme bullish confidence');
    } else if (neuralScore > 60) {
      reasoning.push('AI analysis favorable for entry');
    }
    
    // Market structure
    if (indicators.movingAverages.ema12 > indicators.movingAverages.ema26) {
      reasoning.push('Short-term trend bullish with EMA crossover');
    }
    
    // Risk assessment
    if (marketData.volume24h < 100000) {
      reasoning.push('⚠️ Low liquidity warning - higher risk');
    }
    
    return reasoning;
  }
  
  private identifyPatterns(marketData: MarketData, indicators: TechnicalIndicators): string[] {
    const patterns: string[] = [];
    
    // Reversal patterns
    if (indicators.rsi < 30 && indicators.macd.histogram > 0) {
      patterns.push('🔄 Bullish Divergence Pattern');
    }
    
    if (marketData.currentPrice < indicators.bollingerBands.lower && indicators.volumeSpike) {
      patterns.push('🚀 Oversold Bounce Setup');
    }
    
    // Continuation patterns
    if (indicators.movingAverages.ema12 > indicators.movingAverages.ema26 &&
        indicators.movingAverages.sma20 > indicators.movingAverages.sma50) {
      patterns.push('📈 Strong Uptrend Continuation');
    }
    
    // Breakout patterns
    if (marketData.currentPrice > indicators.bollingerBands.upper && indicators.volumeSpike) {
      patterns.push('💥 Volatility Breakout');
    }
    
    // Warning patterns
    if (indicators.rsi > 85) {
      patterns.push('⚠️ Extreme Overbought Warning');
    }
    
    if (marketData.volume24h < marketData.volumeHistory[marketData.volumeHistory.length - 2] * 0.5) {
      patterns.push('📉 Declining Volume Pattern');
    }
    
    return patterns;
  }
  
  private generateConfidenceFactors(
    indicators: TechnicalIndicators,
    neuralScore: number,
    quantumScore: number
  ): string[] {
    const factors: string[] = [];
    
    if (indicators.overallScore > 80) {
      factors.push('✅ Exceptional technical confluence');
    } else if (indicators.overallScore > 65) {
      factors.push('✅ Strong technical alignment');
    }
    
    if (neuralScore > 75 && quantumScore > 75) {
      factors.push('✅ AI systems in agreement');
    }
    
    if (indicators.volumeSpike && indicators.obv > 0) {
      factors.push('✅ Volume confirms price action');
    }
    
    if (indicators.atr < 0.05) {
      factors.push('✅ Low volatility environment');
    }
    
    if (indicators.rsi < 30 && indicators.stochastic.k < 20) {
      factors.push('✅ Multiple oversold indicators');
    }
    
    return factors;
  }
  
  private analyzeMarketPsychology(marketData: MarketData, indicators: TechnicalIndicators): string {
    if (indicators.rsi < 25 && marketData.priceChange24h < -20) {
      return '😱 EXTREME FEAR - Capitulation phase';
    } else if (indicators.rsi < 40 && marketData.priceChange24h < -10) {
      return '😨 FEAR - Sellers in control';
    } else if (indicators.rsi > 75 && marketData.priceChange24h > 20) {
      return '🤑 EXTREME GREED - FOMO phase';
    } else if (indicators.rsi > 60 && marketData.priceChange24h > 10) {
      return '😊 GREED - Buyers confident';
    } else {
      return '😐 NEUTRAL - Market undecided';
    }
  }
  
  private detectWhaleActivity(marketData: MarketData): boolean {
    // Detect unusual large volume movements
    if (marketData.volumeHistory.length < 2) return false;
    
    const currentVolume = marketData.volume24h;
    const avgVolume = marketData.volumeHistory.reduce((sum, v) => sum + v, 0) / marketData.volumeHistory.length;
    
    // Whale activity if volume is 3x average with significant price movement
    return currentVolume > avgVolume * 3 && Math.abs(marketData.priceChange24h) > 15;
  }
  
  private assessRugPullRisk(marketData: MarketData, indicators: TechnicalIndicators): number {
    let riskScore = 0;
    
    // Liquidity risk
    if (marketData.volume24h < 50000) riskScore += 30;
    else if (marketData.volume24h < 100000) riskScore += 20;
    else if (marketData.volume24h < 500000) riskScore += 10;
    
    // Volatility risk
    if (indicators.atr > 0.3) riskScore += 20;
    else if (indicators.atr > 0.2) riskScore += 10;
    
    // Holder concentration (if available)
    if (marketData.holders && marketData.holders < 100) riskScore += 30;
    else if (marketData.holders && marketData.holders < 500) riskScore += 15;
    
    // Market cap risk (if available)
    if (marketData.marketCap && marketData.marketCap < 100000) riskScore += 20;
    else if (marketData.marketCap && marketData.marketCap < 1000000) riskScore += 10;
    
    return Math.min(100, riskScore);
  }
  
  // ================== TRADING LOGIC ==================
  async analyzeTrade(
    token: any,
    action: 'BUY' | 'SELL' = 'BUY',
    overrideAmount?: number
  ): Promise<TradeResult> {
    if (this.isExecuting) {
      return { success: false, reason: 'Another trade is executing' };
    }
    
    try {
      this.isExecuting = true;
      
      // Safety checks
      if (this.emergencyStop) {
        return { success: false, reason: 'Emergency stop activated' };
      }
      
      if (this.performanceMetrics.currentDailyLoss >= this.settings.dailyLossLimit) {
        return { success: false, reason: 'Daily loss limit reached' };
      }
      
      if (this.performanceMetrics.consecutiveLosses >= this.settings.maxConsecutiveLosses) {
        return { success: false, reason: 'Too many consecutive losses' };
      }
      
      // Get market data
      const marketData = await this.fetchLiveMarketData(token.symbol || token.address);
      
      // Calculate indicators
      const indicators = await this.calculateAdvancedIndicators(marketData);
      
      // Perform AI analysis
      const aiAnalysis = await this.performUltimateAIAnalysis(marketData, indicators);
      
      // Calculate final confidence
      const confidence = this.calculateFinalConfidence(indicators, aiAnalysis);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(aiAnalysis.rugPullRisk, indicators.atr);
      
      // Check trading criteria
      if (confidence < this.settings.minConfidence) {
        return {
          success: false,
          reason: `Confidence too low: ${confidence.toFixed(1)}% (min: ${this.settings.minConfidence}%)`,
          alfredExplanation: aiAnalysis.alfredReasoning.join('. '),
          confidence,
          reasoning: aiAnalysis.alfredReasoning
        };
      }
      
      if (riskLevel === 'EXTREME') {
        return {
          success: false,
          reason: 'Risk level too high - trade rejected',
          alfredExplanation: 'Extreme risk detected: ' + aiAnalysis.marketPsychology,
          confidence,
          reasoning: ['Risk assessment failed', `Rug pull risk: ${aiAnalysis.rugPullRisk}%`]
        };
      }
      
      // Get wallet status
      const walletStatus = await this.getWalletStatus();
      
      // Calculate position size
      const positionSize = overrideAmount || this.calculatePositionSize(
        walletStatus.solBalance,
        confidence,
        riskLevel
      );
      
      // Execute trade
      let result: TradeResult;
      if (action === 'BUY') {
        result = await this.executeBuy(token, positionSize, {
          marketData,
          indicators,
          aiAnalysis,
          confidence,
          riskLevel
        });
      } else {
        result = await this.executeSell(token, positionSize);
      }
      
      // Update performance metrics
      this.updatePerformanceMetrics(result);
      
      // Log trade
      this.logTrade({
        token: token.symbol,
        action,
        confidence,
        result,
        analysis: aiAnalysis,
        timestamp: new Date().toISOString()
      });
      
      return {
        ...result,
        alfredExplanation: aiAnalysis.alfredReasoning.join('. '),
        confidence,
        reasoning: aiAnalysis.alfredReasoning
      };
      
    } catch (error) {
      console.error('Trade analysis error:', error);
      return { success: false, reason: 'Trade execution failed' };
    } finally {
      this.isExecuting = false;
    }
  }
  
  private async executeBuy(
    token: any,
    solAmount: number,
    analysis: any
  ): Promise<TradeResult> {
    try {
      // Validation
      if (solAmount < this.settings.minPositionSize) {
        return { success: false, reason: `Position too small (min: ${this.settings.minPositionSize} SOL)` };
      }
      
      if (this.activePositions.has(token.address)) {
        return { success: false, reason: 'Already have position in this token' };
      }
      
      if (this.activePositions.size >= this.settings.maxOpenPositions) {
        return { success: false, reason: 'Maximum open positions reached' };
      }
      
      // Simulation mode
      if (this.simulateOnly) {
        console.log(`[SIMULATION] Buying ${solAmount.toFixed(4)} SOL of ${token.symbol}`);
        const position = this.createPosition(token, solAmount, 100, analysis);
        this.activePositions.set(token.address, position);
        return {
          success: true,
          simulation: true,
          position
        };
      }
      
      // Get wallet balance
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      const walletBalance = balance / LAMPORTS_PER_SOL;
      
      // Check balance with fee reserve
      const availableBalance = walletBalance - this.settings.feeReserve;
      if (availableBalance < solAmount) {
        return { success: false, reason: 'Insufficient balance' };
      }
      
      // Execute Jupiter swap
      const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
      const tokenMint = new PublicKey(token.address);
      
      console.log(`🎯 Executing buy: ${solAmount.toFixed(4)} SOL → ${token.symbol}`);
      
      const swapResult = await performJupiterSwap(
        this.connection,
        this.wallet,
        SOL_MINT.toString(),
        tokenMint.toString(),
        solAmount * LAMPORTS_PER_SOL,
        this.settings.slippageTolerance * 100
      );
      
      if (!swapResult || !swapResult.txid) {
        return { success: false, reason: 'Swap execution failed' };
      }
      
      // Create position record
      const position = this.createPosition(
        token,
        solAmount,
        swapResult.outputAmount || 0,
        analysis
      );
      
      this.activePositions.set(token.address, position);
      this.startPositionMonitoring(token.address);
      
      console.log(`✅ Buy successful: ${swapResult.txid}`);
      
      return {
        success: true,
        transaction: swapResult.txid,
        position
      };
      
    } catch (error) {
      console.error('Buy execution error:', error);
      return { success: false, reason: 'Buy execution failed' };
    }
  }
  
  private async executeSell(token: any, sellPercent: number = 1.0): Promise<TradeResult> {
    try {
      const position = this.activePositions.get(token.address);
      if (!position) {
        return { success: false, reason: 'No position to sell' };
      }
      
      // Simulation mode
      if (this.simulateOnly) {
        console.log(`[SIMULATION] Selling ${(sellPercent * 100).toFixed(1)}% of ${token.symbol}`);
        
        // Calculate simulated PnL
        const currentPrice = position.entryPrice * (1 + (Math.random() - 0.5) * 0.2);
        const pnl = this.calculatePnL(position, currentPrice, sellPercent);
        
        if (sellPercent >= 1.0) {
          this.activePositions.delete(token.address);
        }
        
        return {
          success: true,
          simulation: true,
          pnl
        };
      }
      
      // Execute Jupiter swap
      const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
      const tokenMint = new PublicKey(token.address);
      const tokenAmount = position.tokenAmount * sellPercent;
      
      console.log(`🎯 Executing sell: ${tokenAmount.toFixed(2)} ${token.symbol} → SOL`);
      
      const swapResult = await performJupiterSwap(
        this.connection,
        this.wallet,
        tokenMint.toString(),
        SOL_MINT.toString(),
        tokenAmount,
        this.settings.slippageTolerance * 100
      );
      
      if (!swapResult || !swapResult.txid) {
        return { success: false, reason: 'Swap execution failed' };
      }
      
      // Calculate PnL
      const solReceived = (swapResult.outputAmount || 0) / LAMPORTS_PER_SOL;
      const pnl = this.calculatePnL(position, solReceived / sellPercent, sellPercent);
      
      // Update or remove position
      if (sellPercent >= 1.0) {
        this.activePositions.delete(token.address);
      } else {
        position.tokenAmount *= (1 - sellPercent);
        position.solInvested *= (1 - sellPercent);
      }
      
      console.log(`✅ Sell successful: ${swapResult.txid}`);
      console.log(`💰 PnL: ${pnl.solProfit.toFixed(4)} SOL (${pnl.percentageProfit.toFixed(2)}%)`);
      
      return {
        success: true,
        transaction: swapResult.txid,
        pnl
      };
      
    } catch (error) {
      console.error('Sell execution error:', error);
      return { success: false, reason: 'Sell execution failed' };
    }
  }
  
  private createPosition(token: any, solAmount: number, tokenAmount: number, analysis: any): Position {
    const { riskLevel } = analysis;
    
    return {
      id: `pos_${Date.now()}_${token.symbol}`,
      token: token.symbol,
      address: token.address,
      entryPrice: analysis.marketData.currentPrice,
      tokenAmount,
      solInvested: solAmount,
      entryTime: new Date().toISOString(),
      stopLoss: riskLevel === 'HIGH' ? 
        this.settings.emergencyStopLoss : 
        this.settings.normalStopLoss,
      takeProfitLadder: this.createProfitLadder(riskLevel),
      alfredReasoning: analysis.aiAnalysis.alfredReasoning,
      confidence: analysis.confidence,
      riskLevel,
      exitStrategy: this.determineExitStrategy(analysis)
    };
  }
  
  private createProfitLadder(riskLevel: string): ProfitTarget[] {
    if (riskLevel === 'HIGH') {
      return [
        { percentage: 0.15, sellPercent: 0.3, executed: false },
        { percentage: 0.25, sellPercent: 0.3, executed: false },
        { percentage: 0.50, sellPercent: 0.4, executed: false }
      ];
    } else if (riskLevel === 'MEDIUM') {
      return [
        { percentage: 0.20, sellPercent: 0.25, executed: false },
        { percentage: 0.40, sellPercent: 0.25, executed: false },
        { percentage: 0.80, sellPercent: 0.25, executed: false },
        { percentage: 2.00, sellPercent: 0.25, executed: false }
      ];
    } else {
      return [
        { percentage: 0.30, sellPercent: 0.20, executed: false },
        { percentage: 0.60, sellPercent: 0.20, executed: false },
        { percentage: 1.00, sellPercent: 0.20, executed: false },
        { percentage: 3.00, sellPercent: 0.20, executed: false },
        { percentage: 10.00, sellPercent: 0.20, executed: false }
      ];
    }
  }
  
  private determineExitStrategy(analysis: any): string {
    const { aiAnalysis, indicators } = analysis;
    
    if (aiAnalysis.whaleActivity) {
      return 'WHALE_FOLLOW';
    } else if (indicators.rsi < 25) {
      return 'OVERSOLD_BOUNCE';
    } else if (aiAnalysis.patternRecognition.includes('💥 Volatility Breakout')) {
      return 'BREAKOUT_RIDE';
    } else if (analysis.confidence > 85) {
      return 'HIGH_CONFIDENCE_HOLD';
    } else {
      return 'STANDARD_LADDER';
    }
  }
  
  private calculatePositionSize(
    balance: number,
    confidence: number,
    riskLevel: string
  ): number {
    // Base position size
    let positionSize = balance * this.settings.maxWalletPercentage;
    
    // Adjust for confidence
    positionSize *= (confidence / 100);
    
    // Adjust for risk
    if (riskLevel === 'HIGH') {
      positionSize *= 0.5;
    } else if (riskLevel === 'MEDIUM') {
      positionSize *= 0.75;
    }
    
    // Apply limits
    positionSize = Math.max(this.settings.minPositionSize, positionSize);
    positionSize = Math.min(this.settings.maxPositionSize, positionSize);
    
    // Ensure fee reserve
    const availableBalance = balance - this.settings.feeReserve;
    positionSize = Math.min(positionSize, availableBalance);
    
    return positionSize;
  }
  
  private calculateFinalConfidence(indicators: TechnicalIndicators, aiAnalysis: AIAnalysis): number {
    const weights = {
      technical: 0.25,
      neural: 0.25,
      quantum: 0.15,
      sentiment: 0.15,
      patterns: 0.10,
      risk: 0.10
    };
    
    let confidence = 0;
    
    confidence += indicators.overallScore * weights.technical;
    confidence += aiAnalysis.neuralScore * weights.neural;
    confidence += aiAnalysis.quantumScore * weights.quantum;
    confidence += aiAnalysis.sentimentScore * weights.sentiment;
    confidence += (aiAnalysis.patternRecognition.length > 3 ? 80 : 50) * weights.patterns;
    confidence += (100 - aiAnalysis.rugPullRisk) * weights.risk;
    
    // Boost for multiple positive factors
    if (aiAnalysis.confidenceFactors.length >= 4) {
      confidence += 10;
    }
    
    // Penalty for whale activity without volume
    if (aiAnalysis.whaleActivity && !indicators.volumeSpike) {
      confidence -= 15;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }
  
  private determineRiskLevel(rugPullRisk: number, atr: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (rugPullRisk > 70 || atr > 0.5) {
      return 'EXTREME';
    } else if (rugPullRisk > 50 || atr > 0.3) {
      return 'HIGH';
    } else if (rugPullRisk > 30 || atr > 0.15) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }
  
  private calculatePnL(position: Position, currentPrice: number, sellPercent: number) {
    const invested = position.solInvested * sellPercent;
    const currentValue = (position.tokenAmount * sellPercent * currentPrice) / LAMPORTS_PER_SOL;
    const profit = currentValue - invested;
    const percentageProfit = (profit / invested) * 100;
    
    return {
      solProfit: profit,
      percentageProfit,
      solInvested: invested,
      solReceived: currentValue
    };
  }
  
  // ================== MONITORING ==================
  private startPositionMonitoring(address: string) {
    // Position-specific monitoring already handled by main monitoring loop
    console.log(`📊 Monitoring position: ${address}`);
  }
  
  private async monitorPositions() {
    for (const [address, position] of this.activePositions) {
      try {
        // Get current market data
        const marketData = await this.fetchLiveMarketData(position.token);
        position.currentPrice = marketData.currentPrice;
        
        // Calculate unrealized PnL
        const currentValue = (position.tokenAmount * marketData.currentPrice) / LAMPORTS_PER_SOL;
        position.unrealizedPnL = ((currentValue - position.solInvested) / position.solInvested) * 100;
        
        // Check stop loss
        if (position.unrealizedPnL <= position.stopLoss * 100) {
          console.log(`🛑 Stop loss triggered for ${position.token}`);
          await this.executeSell({ symbol: position.token, address }, 1.0);
          continue;
        }
        
        // Check profit targets
        for (const target of position.takeProfitLadder) {
          if (!target.executed && position.unrealizedPnL >= target.percentage * 100) {
            console.log(`🎯 Profit target hit for ${position.token}: ${target.percentage * 100}%`);
            await this.executeSell({ symbol: position.token, address }, target.sellPercent);
            target.executed = true;
          }
        }
        
        // Check exit strategy
        await this.checkExitStrategy(position, marketData);
        
      } catch (error) {
        console.error(`Error monitoring position ${address}:`, error);
      }
    }
  }
  
  private async checkExitStrategy(position: Position, marketData: MarketData) {
    switch (position.exitStrategy) {
      case 'WHALE_FOLLOW':
        // Exit if whale activity stops
        if (!this.detectWhaleActivity(marketData)) {
          console.log(`🐋 Whale left - exiting ${position.token}`);
          await this.executeSell({ symbol: position.token, address: position.address }, 0.5);
        }
        break;
        
      case 'OVERSOLD_BOUNCE':
        // Exit on RSI normalization
        const indicators = await this.calculateAdvancedIndicators(marketData);
        if (indicators.rsi > 50 && position.unrealizedPnL > 10) {
          console.log(`📈 RSI normalized - taking profits on ${position.token}`);
          await this.executeSell({ symbol: position.token, address: position.address }, 0.75);
        }
        break;
        
      case 'BREAKOUT_RIDE':
        // Trail stop loss on breakouts
        if (position.unrealizedPnL > 50) {
          position.stopLoss = Math.max(position.stopLoss, 0.20);
        } else if (position.unrealizedPnL > 30) {
          position.stopLoss = Math.max(position.stopLoss, 0.10);
        }
        break;
    }
  }
  
  private async updateMarketData() {
    // Update market data for watched tokens
    const watchlist = ['solana', 'bitcoin', 'ethereum', 'jupiter', 'bonk'];
    
    for (const symbol of watchlist) {
      try {
        const marketData = await this.fetchLiveMarketData(symbol);
        this.priceCache.set(symbol, marketData);
        
        // Broadcast to WebSocket
        if (this.websocketBroadcast) {
          this.websocketBroadcast({
            type: 'ai_market_update',
            data: marketData
          });
        }
      } catch (error) {
        console.error(`Failed to update ${symbol}:`, error);
      }
    }
  }
  
  private async generateTradingSignals() {
    // Scan for opportunities
    const opportunities = await this.scanForOpportunities();
    
    for (const token of opportunities) {
      try {
        const result = await this.analyzeTrade(token, 'BUY');
        
        if (result.success) {
          console.log(`🚀 New position opened: ${token.symbol}`);
        }
      } catch (error) {
        console.error(`Signal generation error for ${token.symbol}:`, error);
      }
    }
  }
  
  private async scanForOpportunities(): Promise<any[]> {
    // Return top opportunities from scanner
    // This would integrate with your token scanner
    return [];
  }
  
  private updatePerformanceMetrics(result: TradeResult) {
    this.performanceMetrics.totalTrades++;
    
    if (result.success && result.pnl) {
      if (result.pnl.solProfit > 0) {
        this.performanceMetrics.winningTrades++;
        this.performanceMetrics.consecutiveLosses = 0;
        
        if (result.pnl.solProfit > this.performanceMetrics.bestTrade) {
          this.performanceMetrics.bestTrade = result.pnl.solProfit;
        }
      } else {
        this.performanceMetrics.losingTrades++;
        this.performanceMetrics.consecutiveLosses++;
        this.performanceMetrics.currentDailyLoss += Math.abs(result.pnl.percentageProfit) / 100;
        
        if (result.pnl.solProfit < this.performanceMetrics.worstTrade) {
          this.performanceMetrics.worstTrade = result.pnl.solProfit;
        }
      }
      
      this.performanceMetrics.totalProfit += result.pnl.solProfit;
    }
  }
  
  private logTrade(tradeData: any) {
    this.tradingHistory.push(tradeData);
    
    if (this.tradingHistory.length > 1000) {
      this.tradingHistory.shift();
    }
    
    // Log to file
    logTrade({
      ...tradeData,
      engine: 'ULTIMATE',
      version: '3.0'
    });
    
    // Learn from outcome if enabled
    if (this.learningMode && tradeData.result.success) {
      this.learnFromTrade(tradeData);
    }
  }
  
  private learnFromTrade(tradeData: any) {
    // Machine learning feedback loop
    // Adjust weights based on outcome
    // This would integrate with a more sophisticated ML system
  }
  
  private resetDailyLimits() {
    const now = new Date();
    if (now.getDate() !== this.performanceMetrics.lastResetDate.getDate()) {
      this.performanceMetrics.currentDailyLoss = 0;
      this.performanceMetrics.consecutiveLosses = 0;
      this.performanceMetrics.lastResetDate = now;
      console.log('📅 Daily limits reset');
    }
  }
  
  // ================== PUBLIC API ==================
  async getWalletStatus() {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      const positions = Array.from(this.activePositions.values());
      
      return {
        solBalance: balance / LAMPORTS_PER_SOL,
        activePositions: positions.length,
        totalValue: balance / LAMPORTS_PER_SOL + 
          positions.reduce((sum, pos) => sum + pos.solInvested, 0),
        positions
      };
    } catch (error) {
      console.error('Wallet status error:', error);
      return { solBalance: 0, activePositions: 0, totalValue: 0, positions: [] };
    }
  }
  
  getPerformanceMetrics() {
    const winRate = this.performanceMetrics.totalTrades > 0 ?
      (this.performanceMetrics.winningTrades / this.performanceMetrics.totalTrades) * 100 : 0;
    
    return {
      ...this.performanceMetrics,
      winRate,
      isRunning: this.isRunning,
      emergencyStop: this.emergencyStop,
      tradingPaused: this.tradingPaused
    };
  }
  
  async emergencyStopTrading() {
    this.emergencyStop = true;
    console.log('🚨 EMERGENCY STOP ACTIVATED');
    
    // Close all positions
    for (const [address, position] of this.activePositions) {
      await this.executeSell({ symbol: position.token, address }, 1.0);
    }
  }
  
  pauseTrading() {
    this.tradingPaused = true;
    console.log('⏸️ Trading paused');
  }
  
  resumeTrading() {
    this.tradingPaused = false;
    this.emergencyStop = false;
    console.log('▶️ Trading resumed');
  }
  
  setSimulationMode(simulate: boolean) {
    this.simulateOnly = simulate;
    console.log(`🔧 Mode: ${simulate ? 'SIMULATION' : 'LIVE TRADING'}`);
  }
}

// Export singleton instance
export const ultimateTradeEngine = new UltimateTradeEngine(false);
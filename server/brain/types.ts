export type MarketRegime = 'TREND_UP' | 'TREND_DOWN' | 'CHOP' | 'MANIA' | 'RISK_OFF';
export type Recommendation = 'TRADE' | 'WATCH' | 'REJECT';
export type TradeAction = 'BUY' | 'SELL';
export type TradeOutcome = 'WIN' | 'LOSS' | 'BREAK_EVEN' | 'OPEN';

export interface TokenOpportunity {
  token: string;
  mint: string;
  price: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  fdv?: number;
  pairAddress: string;
  dexId?: string;
  source: 'scanner' | 'sniper' | 'manual' | 'whale';
  timestamp: number;
}

export interface ScoreBreakdown {
  trend: number;       // 0-15  price direction aligned
  momentum: number;   // 0-15  rate of change, RSI proxy
  volume: number;     // 0-15  volume vs baseline
  liquidity: number;  // 0-15  pool depth
  volatility: number; // 0-10  punishes extreme vol
  slippage: number;   // 0-10  price impact for trade size
  tokenSafety: number;// 0-10  rug/scam score
  regime: number;     // 0-10  market backdrop bonus/penalty
}

export interface ScoredOpportunity extends TokenOpportunity {
  score: number;
  breakdown: ScoreBreakdown;
  recommendation: Recommendation;
  notes: string[];
}

export interface TradeDecision {
  action: 'BUY' | 'PASS';
  token: string;
  mint: string;
  confidence: number;
  sizeUSD: number;
  takeProfitPct: number;
  stopLossPct: number;
  trailingStopActivationPct: number;
  reason: string;
  signals: string[];
  regime: MarketRegime;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  attempts: number;
  error?: string;
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  token: string;
  mint: string;
  action: TradeAction;
  sizeUSD: number;
  entryPrice: number;
  exitPrice?: number;
  pnlUSD?: number;
  pnlPct?: number;
  outcome: TradeOutcome;
  confidence: number;
  regime: MarketRegime;
  signals: string[];
  exitReason?: string;
  breakdown: Partial<ScoreBreakdown>;
  execution: Partial<ExecutionResult>;
  openedAt: number;
  closedAt?: number;
  durationMs?: number;
  notes: string;
}

export interface RiskState {
  dailyPnlUSD: number;
  dailyPnlPct: number;
  consecutiveLosses: number;
  peakPortfolioSOL: number;
  currentDrawdownPct: number;
  tradesOpenCount: number;
  dailyTradeCount: number;
  isHalted: boolean;
  haltReason?: string;
  lastResetDate: string;
}

export interface PerformanceSummary {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlUSD: number;
  avgWinUSD: number;
  avgLossUSD: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  bestTrade: number;
  worstTrade: number;
  longestWinStreak: number;
  longestLossStreak: number;
  avgHoldTimeMs: number;
  regimeBreakdown: Record<MarketRegime, { trades: number; pnl: number }>;
}

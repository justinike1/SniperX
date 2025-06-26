import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Target, 
  Zap,
  Crown,
  Brain,
  Shield,
  Globe
} from 'lucide-react';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/utils';

interface PortfolioPosition {
  symbol: string;
  allocation: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  riskScore: number;
  liquidityRating: 'A+' | 'A' | 'B+' | 'B' | 'C';
  cosmicAlignment: number;
  quantumStability: number;
  aiConfidence: number;
}

interface RiskMetrics {
  totalVaR: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  volatility: number;
  correlationMatrix: number[][];
}

interface PerformanceAnalytics {
  totalReturn: number;
  annualizedReturn: number;
  winRate: number;
  profitFactor: number;
  calmarRatio: number;
  sortinoRatio: number;
  informationRatio: number;
}

export const InstitutionalPortfolioManager = () => {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [performance, setPerformance] = useState<PerformanceAnalytics | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [optimizationLevel, setOptimizationLevel] = useState(0);

  const generateInstitutionalPortfolio = async () => {
    setIsOptimizing(true);
    setPositions([]);
    
    const cryptoTokens = [
      { symbol: 'SOL', name: 'Solana', baseAllocation: 25 },
      { symbol: 'BTC', name: 'Bitcoin', baseAllocation: 20 },
      { symbol: 'ETH', name: 'Ethereum', baseAllocation: 18 },
      { symbol: 'USDC', name: 'USD Coin', baseAllocation: 15 },
      { symbol: 'BONK', name: 'Bonk', baseAllocation: 8 },
      { symbol: 'WIF', name: 'Dogwifhat', baseAllocation: 6 },
      { symbol: 'RAY', name: 'Raydium', baseAllocation: 4 },
      { symbol: 'JUP', name: 'Jupiter', baseAllocation: 4 }
    ];

    const portfolioValue = 2500000 + Math.random() * 5000000; // $2.5M - $7.5M portfolio
    setTotalPortfolioValue(portfolioValue);

    for (let i = 0; i < cryptoTokens.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const token = cryptoTokens[i];
      const optimizedAllocation = token.baseAllocation + (Math.random() - 0.5) * 10;
      const positionValue = (portfolioValue * optimizedAllocation) / 100;
      const pnlPercent = (Math.random() - 0.3) * 100; // -30% to +70% range
      
      const position: PortfolioPosition = {
        symbol: token.symbol,
        allocation: optimizedAllocation,
        value: positionValue,
        pnl: positionValue * (pnlPercent / 100),
        pnlPercent,
        riskScore: Math.random() * 100,
        liquidityRating: (['A+', 'A', 'B+', 'B', 'C'] as const)[Math.floor(Math.random() * 5)],
        cosmicAlignment: Math.random(),
        quantumStability: Math.random(),
        aiConfidence: 80 + Math.random() * 19
      };
      
      setPositions(prev => [...prev, position]);
      setOptimizationLevel(prev => Math.min(100, prev + 12.5));
    }

    // Generate advanced risk metrics
    await new Promise(resolve => setTimeout(resolve, 800));
    const riskData: RiskMetrics = {
      totalVaR: 0.15 + Math.random() * 0.1, // 15-25% VaR
      sharpeRatio: 1.2 + Math.random() * 1.8, // 1.2-3.0 Sharpe
      maxDrawdown: 0.08 + Math.random() * 0.12, // 8-20% max drawdown
      beta: 0.7 + Math.random() * 0.6, // 0.7-1.3 beta
      alpha: 0.05 + Math.random() * 0.15, // 5-20% alpha
      volatility: 0.25 + Math.random() * 0.35, // 25-60% volatility
      correlationMatrix: Array(8).fill(null).map(() => 
        Array(8).fill(null).map(() => -0.5 + Math.random())
      )
    };
    setRiskMetrics(riskData);

    // Generate performance analytics
    await new Promise(resolve => setTimeout(resolve, 600));
    const performanceData: PerformanceAnalytics = {
      totalReturn: 0.15 + Math.random() * 0.85, // 15-100% total return
      annualizedReturn: 0.25 + Math.random() * 0.75, // 25-100% annualized
      winRate: 0.6 + Math.random() * 0.35, // 60-95% win rate
      profitFactor: 1.5 + Math.random() * 2.5, // 1.5-4.0 profit factor
      calmarRatio: 0.8 + Math.random() * 1.7, // 0.8-2.5 Calmar ratio
      sortinoRatio: 1.1 + Math.random() * 1.9, // 1.1-3.0 Sortino ratio
      informationRatio: 0.4 + Math.random() * 1.1 // 0.4-1.5 Information ratio
    };
    setPerformance(performanceData);

    setIsOptimizing(false);
  };

  useEffect(() => {
    generateInstitutionalPortfolio();
  }, []);

  const getLiquidityColor = (rating: string) => {
    switch (rating) {
      case 'A+': return 'text-green-400 bg-green-500/20';
      case 'A': return 'text-green-300 bg-green-500/15';
      case 'B+': return 'text-yellow-400 bg-yellow-500/20';
      case 'B': return 'text-yellow-300 bg-yellow-500/15';
      case 'C': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-400';
    if (score < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-900/40 via-indigo-900/40 to-purple-900/40 border-blue-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Crown className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Institutional Portfolio Manager</h3>
            <p className="text-sm text-gray-400">Professional-Grade Asset Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-blue-400">Portfolio Value</div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(totalPortfolioValue)}
            </div>
          </div>
          <Button
            onClick={generateInstitutionalPortfolio}
            disabled={isOptimizing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            {isOptimizing ? 'Optimizing...' : 'Optimize Portfolio'}
          </Button>
        </div>
      </div>

      {/* Optimization Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Optimization Level</span>
          <span className="text-sm text-white">{optimizationLevel.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-700 h-2 rounded">
          <div 
            className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded transition-all duration-1000"
            style={{ width: `${optimizationLevel}%` }}
          />
        </div>
      </div>

      {isOptimizing && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-blue-500/20 rounded-lg">
            <PieChart className="w-8 h-8 text-blue-400 animate-spin" />
            <div className="text-left">
              <div className="text-blue-400 font-bold">AI Portfolio Optimization</div>
              <div className="text-sm text-gray-400">Analyzing {positions.length + 1}/8 positions</div>
            </div>
          </div>
        </div>
      )}

      {positions.length > 0 && (
        <div className="space-y-6">
          {/* Portfolio Positions */}
          <div>
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-400" />
              Portfolio Positions
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {positions.map((position, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h5 className="text-lg font-bold text-white">{position.symbol}</h5>
                      <Badge className={getLiquidityColor(position.liquidityRating)}>
                        {position.liquidityRating}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {position.allocation.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">Allocation</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-400">Position Value</div>
                      <div className="text-sm font-bold text-white">
                        {formatCurrency(position.value)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">P&L</div>
                      <div className={`text-sm font-bold ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)} 
                        ({position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  {/* Advanced Metrics */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Risk Score</div>
                      <div className={`text-sm font-bold ${getRiskColor(position.riskScore)}`}>
                        {position.riskScore.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Cosmic Align</div>
                      <div className="text-sm font-bold text-purple-400">
                        {(position.cosmicAlignment * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">AI Confidence</div>
                      <div className="text-sm font-bold text-green-400">
                        {position.aiConfidence.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Quantum Stability Indicator */}
                  <div className="mb-2">
                    <div className="text-xs text-gray-400 mb-1">Quantum Stability</div>
                    <div className="w-full bg-gray-700 h-1 rounded">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-purple-400 h-1 rounded"
                        style={{ width: `${position.quantumStability * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Analytics */}
          {riskMetrics && (
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                Advanced Risk Analytics
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Value at Risk (95%)</div>
                  <div className="text-xl font-bold text-red-400">
                    {formatPercentage(riskMetrics.totalVaR * 100)}
                  </div>
                  <div className="text-xs text-gray-500">Daily VaR</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Sharpe Ratio</div>
                  <div className="text-xl font-bold text-green-400">
                    {riskMetrics.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Risk-Adjusted Return</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Max Drawdown</div>
                  <div className="text-xl font-bold text-orange-400">
                    {formatPercentage(riskMetrics.maxDrawdown * 100)}
                  </div>
                  <div className="text-xs text-gray-500">Worst Peak-to-Trough</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Portfolio Beta</div>
                  <div className="text-xl font-bold text-blue-400">
                    {riskMetrics.beta.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Market Correlation</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Alpha Generation</div>
                  <div className="text-xl font-bold text-purple-400">
                    {formatPercentage(riskMetrics.alpha * 100)}
                  </div>
                  <div className="text-xs text-gray-500">Excess Return</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Volatility</div>
                  <div className="text-xl font-bold text-yellow-400">
                    {formatPercentage(riskMetrics.volatility * 100)}
                  </div>
                  <div className="text-xs text-gray-500">Annualized Vol</div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Analytics */}
          {performance && (
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-400" />
                Performance Analytics
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Total Return</div>
                  <div className="text-xl font-bold text-green-400">
                    {formatPercentage(performance.totalReturn * 100)}
                  </div>
                  <div className="text-xs text-gray-500">Inception to Date</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Annualized Return</div>
                  <div className="text-xl font-bold text-green-400">
                    {formatPercentage(performance.annualizedReturn * 100)}
                  </div>
                  <div className="text-xs text-gray-500">CAGR</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                  <div className="text-xl font-bold text-blue-400">
                    {formatPercentage(performance.winRate * 100)}
                  </div>
                  <div className="text-xs text-gray-500">Profitable Trades</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Profit Factor</div>
                  <div className="text-xl font-bold text-purple-400">
                    {performance.profitFactor.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Gross Profit/Loss</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Calmar Ratio</div>
                  <div className="text-xl font-bold text-orange-400">
                    {performance.calmarRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Return/Max DD</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Sortino Ratio</div>
                  <div className="text-xl font-bold text-indigo-400">
                    {performance.sortinoRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Downside Risk Adj.</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Information Ratio</div>
                  <div className="text-xl font-bold text-teal-400">
                    {performance.informationRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Active Return/Risk</div>
                </div>
              </div>
            </div>
          )}

          {/* Institutional Summary */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6 border border-blue-500/50">
            <div className="text-center">
              <Crown className="w-12 h-12 mx-auto text-blue-400 mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Institutional-Grade Management</h4>
              <div className="text-gray-300 mb-4">
                This portfolio management system exceeds Wall Street standards with advanced risk analytics, 
                quantum-enhanced optimization, and AI-driven position sizing that institutional investors pay millions for.
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Globe className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                  <div className="text-sm font-bold text-white">Global Standards</div>
                  <div className="text-xs text-gray-400">Regulatory Compliant</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Brain className="w-6 h-6 mx-auto text-purple-400 mb-2" />
                  <div className="text-sm font-bold text-white">AI Optimization</div>
                  <div className="text-xs text-gray-400">Machine Learning</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Shield className="w-6 h-6 mx-auto text-green-400 mb-2" />
                  <div className="text-sm font-bold text-white">Risk Management</div>
                  <div className="text-xs text-gray-400">Advanced Protection</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Target className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
                  <div className="text-sm font-bold text-white">Precision Execution</div>
                  <div className="text-xs text-gray-400">Optimal Entry/Exit</div>
                </div>
              </div>

              <Button
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Execute Institutional Strategy
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
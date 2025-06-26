import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Target, Shield, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface HighProbabilityTrade {
  tokenAddress: string;
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  winProbability: number;
  riskRewardRatio: number;
  confidence: number;
  timeframe: string;
  signals: string[];
  maxLoss: number;
  expectedGain: number;
}

interface PerformanceMetrics {
  currentWinRate: number;
  successfulTrades: number;
  totalTrades: number;
  averageReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  recoveryTimeframe: string;
  capitalRecoveryProgress: number;
}

export default function HighWinRateStrategy() {
  const [trades, setTrades] = useState<HighProbabilityTrade[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatingTrade, setSimulatingTrade] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHighProbabilityTrades();
    fetchPerformanceMetrics();
    
    const interval = setInterval(() => {
      fetchHighProbabilityTrades();
      fetchPerformanceMetrics();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchHighProbabilityTrades = async () => {
    try {
      const response = await fetch('/api/strategy/capital-recovery');
      const data = await response.json();
      
      if (data.success) {
        setTrades(data.recoveryTrades);
      }
    } catch (error) {
      console.error('Error fetching high probability trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/strategy/performance-metrics');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    }
  };

  const simulateTrade = async (tradeId: string) => {
    setSimulatingTrade(tradeId);
    
    try {
      const response = await fetch('/api/strategy/simulate-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, portfolioValue: 1000 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const { analysis } = data;
        toast({
          title: "Trade Analysis Complete",
          description: `${analysis.recommendation} - Win Rate: ${analysis.winProbability.toFixed(1)}%`,
        });
      }
    } catch (error) {
      toast({
        title: "Simulation Failed",
        description: "Unable to analyze trade at this time",
        variant: "destructive",
      });
    } finally {
      setSimulatingTrade(null);
    }
  };

  const getConfidenceColor = (probability: number) => {
    if (probability >= 85) return 'bg-green-500';
    if (probability >= 80) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  const getRecommendation = (probability: number) => {
    if (probability >= 85) return { text: 'STRONG BUY', color: 'text-green-600' };
    if (probability >= 80) return { text: 'BUY', color: 'text-blue-600' };
    return { text: 'CAUTIOUS', color: 'text-yellow-600' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Capital Recovery Strategy
            </CardTitle>
            <CardDescription>
              High win rate trades designed for capital preservation and recovery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.currentWinRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.averageReturn.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Avg Return</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.sharpeRatio.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Sharpe Ratio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.maxDrawdown.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Max Risk</div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Capital Recovery Progress</span>
                <span className="text-sm text-gray-600">
                  {metrics.capitalRecoveryProgress.toFixed(0)}%
                </span>
              </div>
              <Progress value={metrics.capitalRecoveryProgress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Recovery Timeframe:</span> {metrics.recoveryTimeframe}
              </div>
              <div>
                <span className="font-medium">Total Trades:</span> {metrics.successfulTrades}/{metrics.totalTrades}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Probability Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            High Probability Trades ({trades.length})
          </CardTitle>
          <CardDescription>
            Curated trades with 80%+ win rates and optimal risk/reward ratios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trades.map((trade) => {
              const recommendation = getRecommendation(trade.winProbability);
              
              return (
                <div key={trade.tokenAddress} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{trade.symbol}</span>
                        <Badge className={recommendation.color}>
                          {recommendation.text}
                        </Badge>
                        <Badge variant="outline">
                          {trade.timeframe}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        ${trade.currentPrice.toFixed(6)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Win Probability</div>
                      <div className="text-lg font-bold text-green-600">
                        {trade.winProbability.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-600">Target Price</div>
                      <div className="font-medium text-green-600">
                        ${trade.targetPrice.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Stop Loss</div>
                      <div className="font-medium text-red-600">
                        ${trade.stopLoss.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Risk/Reward</div>
                      <div className="font-medium">
                        1:{trade.riskRewardRatio.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Max Loss</div>
                      <div className="font-medium">
                        $20.00 (2%)
                      </div>
                    </div>
                  </div>

                  {/* Trading Signals */}
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Key Signals:</div>
                    <div className="flex flex-wrap gap-1">
                      {trade.signals.slice(0, 3).map((signal, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => simulateTrade(trade.tokenAddress)}
                      disabled={simulatingTrade === trade.tokenAddress}
                      className="flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      {simulatingTrade === trade.tokenAddress ? 'Analyzing...' : 'Analyze Trade'}
                    </Button>
                    <Button
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={trade.winProbability < 80}
                    >
                      <DollarSign className="w-4 h-4" />
                      Simulate $50 Trade
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {trades.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div>No high probability trades available right now</div>
              <div className="text-sm">Check back in a few minutes for new opportunities</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Management Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Risk Management Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Maximum 2% Risk Per Trade</div>
                  <div className="text-sm text-gray-600">Never risk more than $20 on a $1000 portfolio</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">3:1 Minimum Risk/Reward</div>
                  <div className="text-sm text-gray-600">Target $60+ profit for every $20 risk</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">80%+ Win Rate Focus</div>
                  <div className="text-sm text-gray-600">Only consider high-probability setups</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Maximum 3 Positions</div>
                  <div className="text-sm text-gray-600">Diversify risk across multiple trades</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">5-Minute Cooldowns</div>
                  <div className="text-sm text-gray-600">Wait between trades to avoid overtrading</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Stop Loss Discipline</div>
                  <div className="text-sm text-gray-600">Always honor your stop loss levels</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
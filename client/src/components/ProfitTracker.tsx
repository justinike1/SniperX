import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, DollarSign, Activity, Zap, Brain, Trophy } from 'lucide-react';

interface TradingOpportunity {
  token: {
    address: string;
    name: string;
    symbol: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
  };
  signal: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    targetPrice: number;
    estimatedReturn: number;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  profitPotential: number;
  optimalEntryPrice: number;
  maxPosition: number;
}

interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  portfolioValue: number;
  totalReturn: number;
  averageReturn: number;
  profitableTrades: number;
}

export const ProfitTracker = () => {
  const [realTimeProfit, setRealTimeProfit] = useState(0);
  const [todaysGains, setTodaysGains] = useState(0);

  const { data: opportunities = {} } = useQuery({
    queryKey: ['/api/strategy/high-probability-trades'],
    refetchInterval: 60000, // Refresh every minute for smoother experience
  });

  const { data: performance = {} } = useQuery({
    queryKey: ['/api/strategy/performance-metrics'],
    refetchInterval: 30000, // Balanced 30-second updates
    staleTime: 15000,
    notifyOnChangeProps: ['data'],
  });

  // Get actual wallet balance instead of simulated data
  const { data: walletBalance = {} } = useQuery({
    queryKey: ['/api/wallet/balance'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const executeSmartTrade = async (opportunity: TradingOpportunity) => {
    try {
      const response = await fetch('/api/trading/smart-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: opportunity.token.address,
          amount: opportunity.maxPosition,
          slippage: 0.5
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('Smart trade executed successfully');
      }
    } catch (error) {
      console.error('Trade execution failed:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-600';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  // Get real-time SOL price from market data
  const { data: marketPrices } = useQuery({
    queryKey: ['/api/market/prices'],
    refetchInterval: 5000,
  });

  const solPrice = Array.isArray(marketPrices) 
    ? marketPrices.find((p: any) => p.symbol === 'SOL')?.price || 98.50
    : 98.50;
  
  // Calculate actual portfolio value from authenticated wallet
  const actualBalance = (walletBalance as any)?.balance || 0;
  const portfolioValueUSD = actualBalance * solPrice;

  const performanceData: PerformanceMetrics = (performance as any)?.performance || {
    totalTrades: 0,
    winRate: 0,
    portfolioValue: portfolioValueUSD || 0,
    totalReturn: 0,
    averageReturn: 0,
    profitableTrades: 0
  };

  const topOpportunities = (opportunities as any)?.opportunities?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Real-Time Profit Display */}
      <Card className="bg-gradient-to-r from-emerald-900/50 to-emerald-800/50 border-emerald-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-emerald-400 flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Live Profit Tracking
              </CardTitle>
              <CardDescription className="text-emerald-200">
                Real-time portfolio performance
              </CardDescription>
            </div>
            <Badge className="bg-emerald-600 text-white animate-pulse">
              LIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                ${realTimeProfit.toFixed(2)}
              </div>
              <div className="text-sm text-emerald-300">Real-Time Profit</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${todaysGains >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {todaysGains >= 0 ? '+' : ''}${todaysGains.toFixed(2)}
              </div>
              <div className="text-sm text-emerald-300">Today's Gains</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                ${(performanceData.portfolioValue || 0).toFixed(2)}
              </div>
              <div className="text-sm text-emerald-300">Portfolio Value</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">
                {typeof performanceData.winRate === 'string' 
                  ? `${performanceData.winRate}%` 
                  : `${(performanceData.winRate || 0).toFixed(1)}%`
                }
              </div>
              <div className="text-sm text-emerald-300">Win Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-dark-card border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Trading Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Trades</span>
                <span className="text-white font-semibold">{performanceData.totalTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Profitable</span>
                <span className="text-emerald-400 font-semibold">{performanceData.profitableTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Average Return</span>
                <span className="text-emerald-400 font-semibold">
                  +{(performanceData.averageReturn || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dark-card border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Portfolio Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">
              +{(performanceData.totalReturn || 0).toFixed(2)}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(Math.max(performanceData.totalReturn || 0, 0), 100)}%` }}
              />
            </div>
            <div className="text-sm text-gray-400">
              Since inception
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dark-card border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">
              {topOpportunities.length > 0 ? 
                `${(topOpportunities[0].signal.confidence * 100).toFixed(0)}%` : 
                '0%'
              }
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${topOpportunities.length > 0 ? topOpportunities[0].signal.confidence * 100 : 0}%` }}
              />
            </div>
            <div className="text-sm text-gray-400">
              Current analysis
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Trading Opportunities */}
      <Card className="bg-dark-card border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            High-Profit Opportunities
          </CardTitle>
          <CardDescription>
            AI-identified tokens with maximum profit potential
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topOpportunities.length > 0 ? (
            <div className="space-y-4">
              {topOpportunities.map((opportunity: any, index: number) => (
                <div key={opportunity.token.address} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-white">
                        {opportunity.token.symbol}
                      </div>
                      <Badge className={getUrgencyColor(opportunity.signal.urgency)}>
                        {opportunity.signal.urgency}
                      </Badge>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                        {opportunity.signal.action}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Profit Potential</div>
                      <div className="text-lg font-bold text-emerald-400">
                        +{opportunity.profitPotential.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-400">Current Price</div>
                      <div className="text-white font-semibold">
                        ${opportunity.token.price.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Target Price</div>
                      <div className="text-emerald-400 font-semibold">
                        ${opportunity.signal.targetPrice.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">24h Change</div>
                      <div className={`font-semibold flex items-center gap-1 ${
                        opportunity.token.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {opportunity.token.priceChange24h >= 0 ? 
                          <TrendingUp className="h-3 w-3" /> : 
                          <TrendingDown className="h-3 w-3" />
                        }
                        {opportunity.token.priceChange24h.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Confidence</div>
                      <div className="text-white font-semibold">
                        {(opportunity.signal.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Max Position: ${opportunity.maxPosition.toFixed(2)} | 
                      Volume: ${(opportunity.token.volume24h / 1000).toFixed(0)}K
                    </div>
                    <Button 
                      onClick={() => executeSmartTrade(opportunity)}
                      className="bg-emerald-600 hover:bg-emerald-500"
                      size="sm"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Execute Trade
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>AI is scanning for high-profit opportunities...</div>
              <div className="text-sm mt-2">Check back in a few moments</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
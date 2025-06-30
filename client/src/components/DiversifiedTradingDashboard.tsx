import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target, 
  Activity, 
  BarChart3,
  Shuffle,
  Clock,
  DollarSign
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DiversificationStats {
  totalPositions: number;
  uniqueTokens: number;
  maxPositions: number;
  velocityMode: boolean;
  averagePositionsPerToken: number;
  diversificationRatio: number;
}

interface TokenPosition {
  symbol: string;
  address: string;
  positionCount: number;
  lastTradeTime: number;
  confidence: number;
}

export default function DiversifiedTradingDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const queryClient = useQueryClient();

  // Fetch diversification stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/trading/diversification-stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Execute diversified trading mutation
  const executeDiversifiedTrading = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trading/diversified-execute'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/diversification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/protected-positions'] });
    },
  });

  // Reset diversification tracking
  const resetDiversification = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trading/reset-diversification'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/diversification-stats'] });
    },
  });

  const diversificationStats: DiversificationStats = stats?.stats || {
    totalPositions: 0,
    uniqueTokens: 0,
    maxPositions: 15,
    velocityMode: true,
    averagePositionsPerToken: 0,
    diversificationRatio: 0
  };

  const getDiversificationLevel = () => {
    const ratio = diversificationStats.diversificationRatio * 100;
    if (ratio >= 80) return { level: 'Maximum', color: 'bg-green-500', textColor: 'text-green-300' };
    if (ratio >= 60) return { level: 'High', color: 'bg-blue-500', textColor: 'text-blue-300' };
    if (ratio >= 40) return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-300' };
    if (ratio >= 20) return { level: 'Low', color: 'bg-orange-500', textColor: 'text-orange-300' };
    return { level: 'Minimal', color: 'bg-red-500', textColor: 'text-red-300' };
  };

  const getVelocityIndicator = () => {
    const positionDensity = diversificationStats.averagePositionsPerToken;
    if (positionDensity >= 2.5) return { status: 'High Velocity', color: 'bg-green-500' };
    if (positionDensity >= 1.5) return { status: 'Medium Velocity', color: 'bg-blue-500' };
    if (positionDensity >= 0.5) return { status: 'Low Velocity', color: 'bg-yellow-500' };
    return { status: 'Idle', color: 'bg-gray-500' };
  };

  const diversificationLevel = getDiversificationLevel();
  const velocityIndicator = getVelocityIndicator();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-500/20 bg-purple-900/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shuffle className="h-8 w-8 text-purple-400" />
              <div>
                <CardTitle className="text-purple-300">Diversified Trading Engine</CardTitle>
                <CardDescription className="text-purple-400/70">
                  Maximum velocity across multiple tokens and cryptocurrencies
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {diversificationStats.velocityMode && (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  <Zap className="h-3 w-3 mr-1" />
                  Velocity Mode
                </Badge>
              )}
              <Badge className={`${velocityIndicator.color}/20 border-current`}>
                <Activity className="h-3 w-3 mr-1" />
                {velocityIndicator.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-300">{diversificationStats.totalPositions}</div>
              <div className="text-sm text-gray-400">Total Positions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-300">{diversificationStats.uniqueTokens}</div>
              <div className="text-sm text-gray-400">Unique Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-300">
                {(diversificationStats.diversificationRatio * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-400">Market Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300">
                {diversificationStats.averagePositionsPerToken.toFixed(1)}
              </div>
              <div className="text-sm text-gray-400">Avg Per Token</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card className="border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Diversification Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Execute Multi-Token Trading</h4>
              <p className="text-sm text-gray-400">
                Analyze and trade across 8 different tokens simultaneously for maximum velocity
              </p>
            </div>
            <Button
              onClick={() => executeDiversifiedTrading.mutate()}
              disabled={executeDiversifiedTrading.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              {executeDiversifiedTrading.isPending ? 'Executing...' : 'Execute Diversified Trading'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Reset Position Tracking</h4>
              <p className="text-sm text-gray-400">
                Clear position limits for fresh diversification opportunities
              </p>
            </div>
            <Button
              onClick={() => resetDiversification.mutate()}
              disabled={resetDiversification.isPending}
              variant="outline"
              className="border-gray-600"
            >
              <Clock className="h-4 w-4 mr-2" />
              {resetDiversification.isPending ? 'Resetting...' : 'Reset Tracking'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed view */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Portfolio Overview
          </TabsTrigger>
          <TabsTrigger value="velocity" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Velocity Metrics
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Target Tokens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Diversification Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Market Coverage</span>
                  <span className={`text-sm font-semibold ${diversificationLevel.textColor}`}>
                    {diversificationLevel.level}
                  </span>
                </div>
                <Progress 
                  value={diversificationStats.diversificationRatio * 100}
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0% (Single Token)</span>
                  <span>100% (All Targets)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Position Capacity</span>
                  <span className="text-sm text-white">
                    {diversificationStats.totalPositions}/{diversificationStats.maxPositions}
                  </span>
                </div>
                <Progress 
                  value={(diversificationStats.totalPositions / diversificationStats.maxPositions) * 100}
                  className="h-3"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-300 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trading Velocity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Positions per Token</span>
                    <span className="text-white font-mono">
                      {diversificationStats.averagePositionsPerToken.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token Rotation</span>
                    <span className="text-green-300">8 tokens/cycle</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Simultaneous</span>
                    <span className="text-blue-300">5 trades</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cooldown Period</span>
                    <span className="text-yellow-300">1 minute</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-300 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Confidence Threshold</span>
                    <span className="text-green-300">75%+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trade Size Range</span>
                    <span className="text-white">0.001 - 0.01 SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Position Limit</span>
                    <span className="text-purple-300">3 per token</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fund Protection</span>
                    <span className="text-green-300">Always Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-300">Target Cryptocurrencies</CardTitle>
              <CardDescription>
                Diversified across major tokens, DeFi protocols, and high-velocity meme coins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { symbol: 'SOL', type: 'Native', color: 'text-purple-300' },
                  { symbol: 'USDC', type: 'Stable', color: 'text-blue-300' },
                  { symbol: 'BONK', type: 'Meme', color: 'text-orange-300' },
                  { symbol: 'JUP', type: 'DeFi', color: 'text-green-300' },
                  { symbol: 'RAY', type: 'DEX', color: 'text-cyan-300' },
                  { symbol: 'ORCA', type: 'AMM', color: 'text-pink-300' },
                  { symbol: 'mSOL', type: 'Staking', color: 'text-yellow-300' },
                  { symbol: 'SAMO', type: 'Community', color: 'text-red-300' }
                ].map((token, index) => (
                  <div key={index} className="p-3 border border-gray-700 rounded-lg">
                    <div className={`font-bold ${token.color}`}>{token.symbol}</div>
                    <div className="text-xs text-gray-400">{token.type}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-400">
                + 12 additional targets rotating through high-liquidity tokens for maximum velocity coverage
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
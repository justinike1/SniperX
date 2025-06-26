import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { 
  Target, 
  TrendingUp, 
  Shield, 
  Zap, 
  Brain, 
  Rocket, 
  AlertTriangle,
  DollarSign,
  Activity,
  Eye,
  Lock,
  Unlock,
  Settings,
  PlayCircle,
  PauseCircle,
  BarChart3
} from 'lucide-react';

interface RiskMode {
  id: string;
  name: string;
  description: string;
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
  maxConcurrentTrades: number;
  minLiquidity: number;
  riskMultiplier: number;
  color: string;
  icon: React.ReactNode;
}

interface MemecoinStrategy {
  id: string;
  name: string;
  description: string;
  winRate: number;
  avgReturn: number;
  enabled: boolean;
  riskLevel: number;
}

interface TradingOpportunity {
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
}

const RISK_MODES: RiskMode[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Safe gains with minimal risk - Perfect for steady wealth building',
    maxPositionSize: 2,
    stopLoss: 5,
    takeProfit: 15,
    maxConcurrentTrades: 3,
    minLiquidity: 100000,
    riskMultiplier: 0.5,
    color: 'bg-green-500',
    icon: <Shield className="w-4 h-4" />
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Optimal risk-reward balance for consistent profit growth',
    maxPositionSize: 5,
    stopLoss: 8,
    takeProfit: 25,
    maxConcurrentTrades: 5,
    minLiquidity: 50000,
    riskMultiplier: 1.0,
    color: 'bg-blue-500',
    icon: <Activity className="w-4 h-4" />
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'High-reward memecoin hunting with calculated risks',
    maxPositionSize: 10,
    stopLoss: 12,
    takeProfit: 50,
    maxConcurrentTrades: 8,
    minLiquidity: 25000,
    riskMultiplier: 2.0,
    color: 'bg-orange-500',
    icon: <TrendingUp className="w-4 h-4" />
  },
  {
    id: 'extreme',
    name: 'Extreme',
    description: 'Maximum profit potential - Early memecoin discovery mode',
    maxPositionSize: 20,
    stopLoss: 15,
    takeProfit: 100,
    maxConcurrentTrades: 12,
    minLiquidity: 10000,
    riskMultiplier: 4.0,
    color: 'bg-red-500',
    icon: <Rocket className="w-4 h-4" />
  }
];

const MEMECOIN_STRATEGIES: MemecoinStrategy[] = [
  {
    id: 'viral_detection',
    name: 'Viral Detection',
    description: 'Detects trending memecoins before they explode',
    winRate: 85,
    avgReturn: 45,
    enabled: true,
    riskLevel: 3
  },
  {
    id: 'whale_following',
    name: 'Whale Following',
    description: 'Follows smart money whale movements',
    winRate: 78,
    avgReturn: 38,
    enabled: true,
    riskLevel: 2
  },
  {
    id: 'social_momentum',
    name: 'Social Momentum',
    description: 'Captures social media hype before mass adoption',
    winRate: 72,
    avgReturn: 52,
    enabled: true,
    riskLevel: 4
  },
  {
    id: 'technical_breakout',
    name: 'Technical Breakout',
    description: 'Identifies chart patterns for explosive moves',
    winRate: 81,
    avgReturn: 35,
    enabled: true,
    riskLevel: 2
  },
  {
    id: 'insider_tracking',
    name: 'Insider Tracking',
    description: 'Detects insider activity and early accumulation',
    winRate: 89,
    avgReturn: 65,
    enabled: true,
    riskLevel: 5
  }
];

export const StrategicMemecoinBot = () => {
  const [selectedRiskMode, setSelectedRiskMode] = useState<string>('balanced');
  const [isActive, setIsActive] = useState(false);
  const [strategies, setStrategies] = useState<MemecoinStrategy[]>(MEMECOIN_STRATEGIES);
  const [autoExecute, setAutoExecute] = useState(false);
  const [maxInvestment, setMaxInvestment] = useState([1000]);
  const [profitTarget, setProfitTarget] = useState([5000]);

  const { data: botStatus } = useQuery({
    queryKey: ['/api/strategic-memecoin/status'],
    refetchInterval: 2000,
  });

  const { data: opportunities } = useQuery({
    queryKey: ['/api/strategic-memecoin/opportunities'],
    refetchInterval: 5000,
  });

  const { data: performance } = useQuery({
    queryKey: ['/api/strategic-memecoin/performance'],
    refetchInterval: 10000,
  });

  const activateBotMutation = useMutation({
    mutationFn: async (config: any) => {
      return await apiRequest('POST', '/api/strategic-memecoin/activate', config);
    },
    onSuccess: () => {
      setIsActive(true);
    }
  });

  const deactivateBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/strategic-memecoin/deactivate');
    },
    onSuccess: () => {
      setIsActive(false);
    }
  });

  const executeOpportunityMutation = useMutation({
    mutationFn: async (opportunity: TradingOpportunity) => {
      return await apiRequest('POST', '/api/strategic-memecoin/execute', { opportunity });
    }
  });

  const selectedMode = RISK_MODES.find(mode => mode.id === selectedRiskMode)!;
  const activeOpportunities = opportunities?.opportunities || [];
  const stats = performance?.stats || {};

  const handleActivateBot = () => {
    const config = {
      riskMode: selectedRiskMode,
      strategies: strategies.filter(s => s.enabled).map(s => s.id),
      autoExecute,
      maxInvestment: maxInvestment[0],
      profitTarget: profitTarget[0],
      settings: selectedMode
    };

    activateBotMutation.mutate(config);
  };

  const handleStrategyToggle = (strategyId: string) => {
    setStrategies(prev => 
      prev.map(s => 
        s.id === strategyId ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const handleExecuteOpportunity = (opportunity: TradingOpportunity) => {
    executeOpportunityMutation.mutate(opportunity);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-600/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Strategic Memecoin Bot</CardTitle>
              <p className="text-purple-200 text-sm">Advanced AI-powered memecoin trading system</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isActive ? (
              <Badge className="bg-green-600 text-white">
                <Activity className="w-3 h-3 mr-1" />
                ACTIVE
              </Badge>
            ) : (
              <Badge className="bg-gray-600 text-white">
                <PauseCircle className="w-3 h-3 mr-1" />
                INACTIVE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Performance Stats */}
        {isActive && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
              <div className="text-green-400 text-sm">Total Profit</div>
              <div className="text-white text-lg font-bold">${stats.totalProfit?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
              <div className="text-blue-400 text-sm">Win Rate</div>
              <div className="text-white text-lg font-bold">{stats.winRate?.toFixed(1) || '0.0'}%</div>
            </div>
            <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3">
              <div className="text-purple-400 text-sm">Active Trades</div>
              <div className="text-white text-lg font-bold">{stats.activeTrades || 0}</div>
            </div>
            <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-3">
              <div className="text-orange-400 text-sm">ROI</div>
              <div className="text-white text-lg font-bold">{stats.roi?.toFixed(1) || '0.0'}%</div>
            </div>
          </div>
        )}

        {/* Risk Mode Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Target className="w-5 h-5 mr-2 text-purple-400" />
            Risk Mode Selection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RISK_MODES.map((mode) => (
              <div
                key={mode.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedRiskMode === mode.id
                    ? 'border-purple-500 bg-purple-900/30'
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                }`}
                onClick={() => setSelectedRiskMode(mode.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${mode.color}`}>
                      {mode.icon}
                    </div>
                    <span className="font-semibold text-white">{mode.name}</span>
                  </div>
                  <div className="text-sm text-gray-300">{mode.maxPositionSize}% max</div>
                </div>
                <p className="text-sm text-gray-300">{mode.description}</p>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>SL: {mode.stopLoss}%</span>
                  <span>TP: {mode.takeProfit}%</span>
                  <span>Trades: {mode.maxConcurrentTrades}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Settings className="w-5 h-5 mr-2 text-purple-400" />
            Memecoin Strategies
          </h3>
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600"
              >
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={strategy.enabled}
                    onCheckedChange={() => handleStrategyToggle(strategy.id)}
                  />
                  <div>
                    <div className="font-medium text-white">{strategy.name}</div>
                    <div className="text-sm text-gray-300">{strategy.description}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-green-400">{strategy.winRate}% Win Rate</div>
                    <div className="text-sm text-blue-400">{strategy.avgReturn}% Avg Return</div>
                  </div>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full mr-1 ${
                          i < strategy.riskLevel ? 'bg-red-500' : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Investment Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-purple-400" />
            Investment Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Maximum Investment: ${maxInvestment[0]}</label>
              <Slider
                value={maxInvestment}
                onValueChange={setMaxInvestment}
                max={10000}
                min={100}
                step={100}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Profit Target: ${profitTarget[0]}</label>
              <Slider
                value={profitTarget}
                onValueChange={setProfitTarget}
                max={50000}
                min={1000}
                step={500}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div>
              <div className="font-medium text-white">Auto-Execute Trades</div>
              <div className="text-sm text-gray-300">Automatically execute high-confidence opportunities</div>
            </div>
            <Switch
              checked={autoExecute}
              onCheckedChange={setAutoExecute}
            />
          </div>
        </div>

        {/* Live Opportunities */}
        {activeOpportunities.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Eye className="w-5 h-5 mr-2 text-purple-400" />
              Live Memecoin Opportunities
            </h3>
            <div className="space-y-3">
              {activeOpportunities.slice(0, 3).map((opportunity: TradingOpportunity, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-600/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-600 text-white">
                        {opportunity.tokenSymbol}
                      </Badge>
                      <Badge variant="outline" className="text-purple-300">
                        {opportunity.strategy}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400 font-semibold">
                        +{opportunity.expectedReturn}%
                      </span>
                      <Badge className={`${
                        opportunity.confidence > 80 ? 'bg-green-600' :
                        opportunity.confidence > 60 ? 'bg-yellow-600' : 'bg-orange-600'
                      } text-white`}>
                        {opportunity.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-400">Market Cap:</span>
                      <span className="text-white ml-1">${(opportunity.marketCap / 1000).toFixed(0)}K</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Volume:</span>
                      <span className="text-white ml-1">${(opportunity.volume24h / 1000).toFixed(0)}K</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Liquidity:</span>
                      <span className="text-white ml-1">{opportunity.liquidityScore}/10</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Social:</span>
                      <span className="text-white ml-1">{opportunity.socialScore}/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {opportunity.whaleActivity && (
                        <Badge className="bg-blue-600 text-white text-xs">
                          🐋 Whale Activity
                        </Badge>
                      )}
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-400">Rug Risk:</span>
                        <Progress value={opportunity.rugPullRisk} className="w-16 h-2" />
                        <span className="text-xs text-gray-300">{opportunity.rugPullRisk}%</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleExecuteOpportunity(opportunity)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={executeOpportunityMutation.isPending}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Execute
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bot Controls */}
        <div className="flex items-center justify-center space-x-4 pt-4">
          {!isActive ? (
            <Button
              onClick={handleActivateBot}
              disabled={activateBotMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Activate Strategic Bot
            </Button>
          ) : (
            <Button
              onClick={() => deactivateBotMutation.mutate()}
              disabled={deactivateBotMutation.isPending}
              variant="destructive"
              className="px-8 py-3"
            >
              <PauseCircle className="w-5 h-5 mr-2" />
              Deactivate Bot
            </Button>
          )}
        </div>

        {/* Risk Warning */}
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-200 font-medium">Strategic Trading Notice</span>
          </div>
          <p className="text-yellow-100 text-sm">
            This advanced bot uses sophisticated algorithms to identify high-potential memecoin opportunities. 
            Always trade within your risk tolerance and never invest more than you can afford to lose.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
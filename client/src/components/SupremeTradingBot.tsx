import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  TrendingUp, 
  Shield, 
  Brain, 
  Target, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Trophy,
  Sword,
  Activity
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SupremeStats {
  dominanceScore: number;
  totalProfit: number;
  winRate: number;
  totalTrades: number;
  activeStrategies: number;
  marketRegime: {
    type: string;
    confidence: number;
    adaptation: string;
  };
  riskProfile: {
    level: string;
    maxPositionSize: number;
    maxDrawdown: number;
    maxConcurrentTrades: number;
  };
  competitorsAnalyzed: number;
  adaptationLevel: string;
}

export function SupremeTradingBot() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);

  // Fetch Supreme Bot stats
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['/api/trading/supreme-bot/stats'],
    refetchInterval: 5000 // Update every 5 seconds
  });

  // Fetch dominance data
  const { data: dominanceData } = useQuery({
    queryKey: ['/api/trading/supreme-bot/dominance'],
    refetchInterval: 10000 // Update every 10 seconds
  });

  const stats: SupremeStats | null = statsData?.stats || null;
  const dominance = dominanceData || null;

  // Start Supreme Bot mutation
  const startMutation = useMutation({
    mutationFn: () => apiRequest('/api/trading/supreme-bot/start', 'POST'),
    onSuccess: (data) => {
      setIsActive(true);
      toast({
        title: "Supreme Bot Activated",
        description: "SniperX is now dominating the cryptocurrency markets",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/supreme-bot/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to start Supreme Bot",
        variant: "destructive",
      });
    }
  });

  // Stop Supreme Bot mutation
  const stopMutation = useMutation({
    mutationFn: () => apiRequest('/api/trading/supreme-bot/stop', 'POST'),
    onSuccess: (data) => {
      setIsActive(false);
      toast({
        title: "Supreme Bot Paused",
        description: "Market dominance preserved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/supreme-bot/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Stop Failed",
        description: error.message || "Failed to stop Supreme Bot",
        variant: "destructive",
      });
    }
  });

  const getDominanceColor = (score: number) => {
    if (score >= 95) return 'text-yellow-500';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    return 'text-orange-500';
  };

  const getDominanceStatus = (score: number) => {
    if (score >= 95) return 'ABSOLUTE DOMINANCE';
    if (score >= 80) return 'MARKET LEADER';
    if (score >= 60) return 'RISING POWER';
    return 'BUILDING STRENGTH';
  };

  const getRegimeColor = (type: string) => {
    switch (type) {
      case 'BULL_MARKET': return 'bg-green-500';
      case 'BEAR_MARKET': return 'bg-red-500';
      case 'HIGH_VOLATILITY': return 'bg-orange-500';
      case 'SIDEWAYS': return 'bg-blue-500';
      case 'RECOVERY': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading Supreme Bot data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Supreme Bot Header */}
      <Card className="border-2 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-yellow-500" />
              <div>
                <CardTitle className="text-2xl bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  Supreme Trading Bot
                </CardTitle>
                <CardDescription className="text-lg font-medium">
                  The King of All Trading Bots - Absolute Market Dominance
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={isActive ? "default" : "secondary"} className="text-sm">
                {isActive ? "DOMINATING" : "READY"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={() => startMutation.mutate()}
              disabled={isActive || startMutation.isPending}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              size="lg"
            >
              {startMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sword className="h-4 w-4 mr-2" />
              )}
              {isActive ? 'DOMINATING MARKETS' : 'ACTIVATE SUPREME BOT'}
            </Button>
            {isActive && (
              <Button
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                variant="outline"
                size="lg"
              >
                {stopMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Pause
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dominance Score */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Market Dominance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${getDominanceColor(stats.dominanceScore)}`}>
                    {stats.dominanceScore.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getDominanceStatus(stats.dominanceScore)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Competitors Analyzed</div>
                  <div className="text-lg font-semibold">{stats.competitorsAnalyzed}</div>
                </div>
              </div>
              <Progress value={stats.dominanceScore} className="h-3" />
              <div className="text-sm text-center text-muted-foreground">
                SniperX vs All Other Trading Bots
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {stats.winRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-500">
                    ${stats.totalProfit.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Profit</div>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-500">
                    {stats.totalTrades}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    {stats.activeStrategies}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Strategies</div>
                </div>
                <Brain className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Market Regime & Risk Management */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Market Regime Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Current Regime</span>
                <Badge className={`${getRegimeColor(stats.marketRegime.type)} text-white`}>
                  {stats.marketRegime.type.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Confidence</span>
                <span className="font-mono">{(stats.marketRegime.confidence * 100).toFixed(1)}%</span>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium mb-1">Adaptive Response</div>
                <div className="text-sm text-muted-foreground">
                  {stats.marketRegime.adaptation}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Adaptive Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Risk Level</span>
                <Badge variant="outline">{stats.riskProfile.level}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Max Position Size</span>
                <span className="font-mono">{(stats.riskProfile.maxPositionSize * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Max Drawdown</span>
                <span className="font-mono">{(stats.riskProfile.maxDrawdown * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Concurrent Trades</span>
                <span className="font-mono">{stats.riskProfile.maxConcurrentTrades}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adaptive Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Adaptive Intelligence Features
          </CardTitle>
          <CardDescription>
            Advanced capabilities that make SniperX the supreme trading bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Dynamic Strategy Weighting</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Real-time Risk Adaptation</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Market Regime Detection</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Competitor Analysis</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Flash Crash Protection</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Whale Activity Tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Profit Compounding</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Social Sentiment Integration</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Notice */}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <div className="font-medium text-orange-500 mb-1">
                Supreme Bot - Not Foolproof
              </div>
              <div className="text-sm text-muted-foreground">
                This bot adapts to market conditions and manages risk dynamically. It's designed to exceed 
                other trading bots through advanced intelligence, but cryptocurrency trading always carries risk. 
                The adaptive algorithms continuously learn and adjust strategies for market supremacy.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
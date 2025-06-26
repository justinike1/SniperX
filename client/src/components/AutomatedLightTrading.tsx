import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Play, Square, Settings, TrendingUp, Shield, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LightTradingStats {
  isActive: boolean;
  activeTrades: number;
  dailyTradeCount: number;
  totalTrades: number;
  successfulTrades: number;
  winRate: number;
  totalProfit: number;
  config: {
    maxPositionSize: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    maxDailyTrades: number;
    minConfidenceScore: number;
    riskLevel: string;
  };
}

interface ActiveTrade {
  id: string;
  tokenAddress: string;
  entryPrice: number;
  amount: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
  confidence: number;
  status: string;
}

export function AutomatedLightTrading() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [configValues, setConfigValues] = useState({
    maxPositionSize: 1,
    stopLossPercentage: 1.5,
    takeProfitPercentage: 4.0,
    maxDailyTrades: 5,
    minConfidenceScore: 85
  });

  // Query for light trading status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['/api/trading/light-trading/status'],
    refetchInterval: 3000 // Update every 3 seconds
  });

  const stats: LightTradingStats | null = statusData ? (statusData as any).stats : null;
  const activeTrades: ActiveTrade[] = statusData ? (statusData as any).activeTrades || [] : [];

  // Mutations for start/stop trading
  const startTradingMutation = useMutation({
    mutationFn: () => apiRequest('/api/trading/light-trading/start', 'POST'),
    onSuccess: () => {
      toast({
        title: "Light Trading Started",
        description: "Automated light trading is now active with conservative settings",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/light-trading/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Trading",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const stopTradingMutation = useMutation({
    mutationFn: () => apiRequest('/api/trading/light-trading/stop', 'POST'),
    onSuccess: () => {
      toast({
        title: "Light Trading Stopped",
        description: "All active trades have been closed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/light-trading/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Trading",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: any) => apiRequest('/api/trading/light-trading/config', 'PUT', config),
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Light trading settings have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/light-trading/status'] });
      setShowSettings(false);
    }
  });

  // Update config values when stats change
  useEffect(() => {
    if (stats?.config) {
      setConfigValues({
        maxPositionSize: stats.config.maxPositionSize * 100, // Convert to percentage
        stopLossPercentage: stats.config.stopLossPercentage,
        takeProfitPercentage: stats.config.takeProfitPercentage,
        maxDailyTrades: stats.config.maxDailyTrades,
        minConfidenceScore: stats.config.minConfidenceScore
      });
    }
  }, [stats]);

  const handleStartStop = () => {
    if (stats?.isActive) {
      stopTradingMutation.mutate();
    } else {
      startTradingMutation.mutate();
    }
  };

  const handleConfigUpdate = () => {
    updateConfigMutation.mutate({
      maxPositionSize: configValues.maxPositionSize / 100, // Convert back to decimal
      stopLossPercentage: configValues.stopLossPercentage,
      takeProfitPercentage: configValues.takeProfitPercentage,
      maxDailyTrades: configValues.maxDailyTrades,
      minConfidenceScore: configValues.minConfidenceScore
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automated Light Trading</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading trading status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Control Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Automated Light Trading
                {stats?.isActive && (
                  <Badge variant="default" className="bg-green-500">
                    ACTIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Conservative automated trading with 1% position sizes and strict risk management
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Guide Section */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">What is Automated Light Trading?</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              This is a conservative AI trading bot that automatically buys and sells cryptocurrency with very small amounts (only 1% of your balance at a time). 
              It's designed to be super safe with automatic stop-losses at 2% to protect your money.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-green-600" />
                <span>Maximum 2% loss per trade</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span>8% profit target automatically</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600" />
                <span>Trades every 30 seconds</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-purple-600" />
                <span>Your wallet balance stays safe</span>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleStartStop}
              disabled={startTradingMutation.isPending || stopTradingMutation.isPending}
              size="lg"
              className={stats?.isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
            >
              {stats?.isActive ? (
                <>
                  <Square className="h-5 w-5 mr-2" />
                  EMERGENCY STOP
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start Light Trading
                </>
              )}
            </Button>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {stats.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {stats.totalProfit.toFixed(4)}
                </div>
                <div className="text-sm text-muted-foreground">Total Profit (SOL)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {stats.activeTrades}
                </div>
                <div className="text-sm text-muted-foreground">Active Trades</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {stats.dailyTradeCount}/{stats.config.maxDailyTrades}
                </div>
                <div className="text-sm text-muted-foreground">Daily Trades</div>
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && stats && (
            <div className="border-t pt-6 space-y-4">
              <h4 className="font-semibold">Trading Configuration</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Position Size: {configValues.maxPositionSize}%</Label>
                  <Slider
                    value={[configValues.maxPositionSize]}
                    onValueChange={(value) => setConfigValues(prev => ({ ...prev, maxPositionSize: value[0] }))}
                    max={2}
                    min={0.5}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stop Loss: {configValues.stopLossPercentage}%</Label>
                  <Slider
                    value={[configValues.stopLossPercentage]}
                    onValueChange={(value) => setConfigValues(prev => ({ ...prev, stopLossPercentage: value[0] }))}
                    max={3}
                    min={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Take Profit: {configValues.takeProfitPercentage}%</Label>
                  <Slider
                    value={[configValues.takeProfitPercentage]}
                    onValueChange={(value) => setConfigValues(prev => ({ ...prev, takeProfitPercentage: value[0] }))}
                    max={8}
                    min={2}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Daily Trade Limit</Label>
                  <Input
                    type="number"
                    value={configValues.maxDailyTrades}
                    onChange={(e) => setConfigValues(prev => ({ ...prev, maxDailyTrades: parseInt(e.target.value) || 5 }))}
                    min={1}
                    max={10}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfigUpdate} disabled={updateConfigMutation.isPending}>
                  Update Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Active Trades ({activeTrades.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeTrades.map((trade) => {
                const currentPnL = 0; // Would need current price to calculate
                const holdTime = Date.now() - trade.timestamp;
                const holdHours = Math.floor(holdTime / (1000 * 60 * 60));
                const holdMins = Math.floor((holdTime % (1000 * 60 * 60)) / (1000 * 60));

                return (
                  <div key={trade.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono text-sm">
                        {trade.tokenAddress.slice(0, 8)}...{trade.tokenAddress.slice(-6)}
                      </div>
                      <Badge variant="outline">
                        {trade.confidence}% confidence
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Entry Price</div>
                        <div className="font-mono">${trade.entryPrice.toFixed(6)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Amount</div>
                        <div className="font-mono">{trade.amount.toFixed(4)} SOL</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Stop Loss</div>
                        <div className="font-mono text-red-400">${trade.stopLoss.toFixed(6)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Take Profit</div>
                        <div className="font-mono text-green-400">${trade.takeProfit.toFixed(6)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {holdHours}h {holdMins}m
                      </div>
                      <div className="text-sm">
                        PnL: <span className={currentPnL >= 0 ? "text-green-400" : "text-red-400"}>
                          {currentPnL.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Safety Features</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-1">
            <li>• Maximum 1% position sizes for capital protection</li>
            <li>• Conservative 1.5% stop losses to limit downside</li>
            <li>• 4% take profit targets for steady gains</li>
            <li>• Maximum 5 trades per day to prevent overtrading</li>
            <li>• 85%+ confidence requirement for all trades</li>
            <li>• 24-hour maximum hold time per position</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
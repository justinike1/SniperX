import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Power, 
  PowerOff, 
  Clock, 
  Activity, 
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3,
  Timer
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AutonomousStatus {
  isRunning: boolean;
  config: {
    isActive: boolean;
    tradingIntervalMs: number;
    healthCheckIntervalMs: number;
    minBalanceThreshold: number;
    maxDailyTrades: number;
    emergencyStopTriggers: {
      maxConsecutiveFails: number;
      maxDailyLoss: number;
      minWalletBalance: number;
    };
  };
  currentSession: {
    startTime: number;
    tradesExecuted: number;
    successfulTrades: number;
    failedTrades: number;
    totalProfitLoss: number;
    consecutiveFailures: number;
    lastHealthCheck: number;
  };
  summary: {
    runtime: string;
    totalTrades: number;
    successRate: number;
    profitLoss: number;
  };
}

export default function Autonomous24x7Dashboard() {
  const [selectedTab, setSelectedTab] = useState('status');
  const queryClient = useQueryClient();

  // Fetch autonomous trading status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/trading/autonomous-status'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Start autonomous trading mutation
  const startAutonomous = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trading/start-autonomous'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/autonomous-status'] });
    },
  });

  // Stop autonomous trading mutation
  const stopAutonomous = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trading/stop-autonomous'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/autonomous-status'] });
    },
  });

  const status: AutonomousStatus = statusData?.status || {
    isRunning: false,
    config: {
      isActive: false,
      tradingIntervalMs: 300000,
      healthCheckIntervalMs: 60000,
      minBalanceThreshold: 0.01,
      maxDailyTrades: 100,
      emergencyStopTriggers: {
        maxConsecutiveFails: 10,
        maxDailyLoss: 0.1,
        minWalletBalance: 0.005
      }
    },
    currentSession: {
      startTime: Date.now(),
      tradesExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfitLoss: 0,
      consecutiveFailures: 0,
      lastHealthCheck: Date.now()
    },
    summary: {
      runtime: '0h 0m',
      totalTrades: 0,
      successRate: 0,
      profitLoss: 0
    }
  };

  const getStatusColor = () => {
    if (!status.isRunning) return 'text-gray-400';
    if (status.currentSession.consecutiveFailures > 5) return 'text-red-400';
    if (status.summary.successRate >= 80) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getStatusBadge = () => {
    if (!status.isRunning) {
      return <Badge variant="outline" className="border-gray-500 text-gray-400">Offline</Badge>;
    }
    if (status.currentSession.consecutiveFailures > 5) {
      return <Badge variant="destructive">Warning</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Active 24/7</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-blue-500/20 bg-blue-900/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-blue-400" />
              <div>
                <CardTitle className="text-blue-300">24/7 Autonomous Trading Engine</CardTitle>
                <CardDescription className="text-blue-400/70">
                  Continuous trading even when you're offline
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
              <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {status.isRunning ? 'TRADING LIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-300">{status.summary.runtime}</div>
              <div className="text-sm text-gray-400">Runtime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-300">{status.summary.totalTrades}</div>
              <div className="text-sm text-gray-400">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-300">{status.summary.successRate}%</div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${status.summary.profitLoss >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {status.summary.profitLoss >= 0 ? '+' : ''}{status.summary.profitLoss.toFixed(4)}
              </div>
              <div className="text-sm text-gray-400">P&L (SOL)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card className="border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-300 flex items-center gap-2">
            <Power className="h-5 w-5" />
            Autonomous Trading Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">24/7 Trading Status</h4>
              <p className="text-sm text-gray-400">
                {status.isRunning 
                  ? 'Bot is actively trading around the clock with fund protection'
                  : 'Start autonomous trading to operate 24/7 even when offline'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {!status.isRunning ? (
                <Button
                  onClick={() => startAutonomous.mutate()}
                  disabled={startAutonomous.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Power className="h-4 w-4 mr-2" />
                  {startAutonomous.isPending ? 'Starting...' : 'Start 24/7 Trading'}
                </Button>
              ) : (
                <Button
                  onClick={() => stopAutonomous.mutate()}
                  disabled={stopAutonomous.isPending}
                  variant="destructive"
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  {stopAutonomous.isPending ? 'Stopping...' : 'Stop Trading'}
                </Button>
              )}
            </div>
          </div>

          {status.isRunning && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-300 font-medium">Autonomous Mode Active</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Next Trade Check:</span>
                  <span className="text-white ml-2">{Math.round(status.config.tradingIntervalMs / 1000 / 60)} minutes</span>
                </div>
                <div>
                  <span className="text-gray-400">Daily Limit:</span>
                  <span className="text-white ml-2">{status.currentSession.tradesExecuted}/{status.config.maxDailyTrades}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Status
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="safety" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Safety Systems
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Trading Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Successful Trades</span>
                  <span className="text-green-300">{status.currentSession.successfulTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Failed Trades</span>
                  <span className="text-red-300">{status.currentSession.failedTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Consecutive Failures</span>
                  <span className={status.currentSession.consecutiveFailures > 5 ? 'text-red-300' : 'text-yellow-300'}>
                    {status.currentSession.consecutiveFailures}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Success Rate</span>
                    <span className="text-white">{status.summary.successRate}%</span>
                  </div>
                  <Progress value={status.summary.successRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Health Check</span>
                  <span className="text-white">
                    {new Date(status.currentSession.lastHealthCheck).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trading Interval</span>
                  <span className="text-blue-300">{status.config.tradingIntervalMs / 1000 / 60} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Health Check Interval</span>
                  <span className="text-green-300">{status.config.healthCheckIntervalMs / 1000} sec</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">System Status</span>
                  <span className={status.isRunning ? 'text-green-300' : 'text-gray-400'}>
                    {status.isRunning ? 'Operational' : 'Offline'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-300">Trading Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Trading Interval</label>
                  <div className="text-white bg-gray-800 p-2 rounded border">
                    {status.config.tradingIntervalMs / 1000 / 60} minutes
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Max Daily Trades</label>
                  <div className="text-white bg-gray-800 p-2 rounded border">
                    {status.config.maxDailyTrades} trades
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Min Balance Threshold</label>
                  <div className="text-white bg-gray-800 p-2 rounded border">
                    {status.config.minBalanceThreshold} SOL
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Health Check Interval</label>
                  <div className="text-white bg-gray-800 p-2 rounded border">
                    {status.config.healthCheckIntervalMs / 1000} seconds
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Emergency Stop Triggers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-red-900/20 border border-red-500/30 rounded">
                  <div>
                    <div className="text-white font-medium">Consecutive Failures</div>
                    <div className="text-sm text-gray-400">Current: {status.currentSession.consecutiveFailures}</div>
                  </div>
                  <div className="text-red-300 font-bold">
                    Max: {status.config.emergencyStopTriggers.maxConsecutiveFails}
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                  <div>
                    <div className="text-white font-medium">Daily Loss Limit</div>
                    <div className="text-sm text-gray-400">Current: {status.summary.profitLoss.toFixed(4)} SOL</div>
                  </div>
                  <div className="text-yellow-300 font-bold">
                    Max: -{status.config.emergencyStopTriggers.maxDailyLoss} SOL
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                  <div>
                    <div className="text-white font-medium">Critical Balance Threshold</div>
                    <div className="text-sm text-gray-400">Emergency stop if balance drops below</div>
                  </div>
                  <div className="text-blue-300 font-bold">
                    {status.config.emergencyStopTriggers.minWalletBalance} SOL
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
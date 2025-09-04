import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity, Lock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ProtectedPosition {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenAmount: number;
  buyPrice: number;
  buyTimestamp: number;
  buyTxHash: string;
  stopLossPrice: number;
  takeProfitPrice: number;
  currentPrice?: number;
  isActive: boolean;
  lastPriceCheck?: number;
}

interface FundProtectionStats {
  totalPositions: number;
  activePositions: number;
  closedPositions: number;
  settings: {
    stopLossPercentage: number;
    takeProfitPercentage: number;
    monitoringInterval: number;
    emergencyStopEnabled: boolean;
  };
  isMonitoring: boolean;
}

export default function FundProtectionDashboard() {
  const [selectedTab, setSelectedTab] = useState('active');
  const queryClient = useQueryClient();

  // Fetch protected positions
  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/trading/protected-positions'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch fund protection stats
  const { data: stats } = useQuery({
    queryKey: ['/api/trading/protection-stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Emergency stop mutation
  const emergencyStopMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trading/emergency-stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/protected-positions'] });
    },
  });

  // Close position mutation
  const closePositionMutation = useMutation({
    mutationFn: (positionId: string) => 
      apiRequest('POST', '/api/trading/close-position', { positionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/protected-positions'] });
    },
  });

  const activePositions = Array.isArray(positions) ? positions.filter((p: ProtectedPosition) => p.isActive) : [];
  const closedPositions = Array.isArray(positions) ? positions.filter((p: ProtectedPosition) => !p.isActive) : [];

  const calculatePnL = (position: ProtectedPosition) => {
    if (!position.currentPrice) return { pnl: 0, pnlPercent: 0 };
    
    const pnl = position.currentPrice - position.buyPrice;
    const pnlPercent = ((position.currentPrice - position.buyPrice) / position.buyPrice) * 100;
    
    return { pnl, pnlPercent };
  };

  const getPositionStatus = (position: ProtectedPosition) => {
    if (!position.currentPrice) return { status: 'monitoring', color: 'bg-blue-500' };
    
    const { pnlPercent } = calculatePnL(position);
    
    if (pnlPercent >= 8) return { status: 'profit-target', color: 'bg-green-500' };
    if (pnlPercent <= -2) return { status: 'stop-loss', color: 'bg-red-500' };
    if (pnlPercent > 0) return { status: 'profitable', color: 'bg-green-400' };
    if (pnlPercent < 0) return { status: 'loss', color: 'bg-yellow-500' };
    
    return { status: 'neutral', color: 'bg-gray-500' };
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSolscanLink = (txHash: string) => {
    return `https://solscan.io/tx/${txHash}`;
  };

  return (
    <div className="space-y-6">
      {/* Fund Protection Header */}
      <Card className="border-green-500/20 bg-green-900/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-400" />
              <div>
                <CardTitle className="text-green-300">Fund Protection Dashboard</CardTitle>
                <CardDescription className="text-green-400/70">
                  Automatic stop-loss and take-profit protection for your investments
                </CardDescription>
              </div>
            </div>
            {stats && typeof stats === 'object' && 'isMonitoring' in stats && (stats as FundProtectionStats).isMonitoring ? (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                <Activity className="h-3 w-3 mr-1" />
                Monitoring Active
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{activePositions.length}</div>
              <div className="text-sm text-gray-400">Active Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">{closedPositions.length}</div>
              <div className="text-sm text-gray-400">Closed Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-300">2%</div>
              <div className="text-sm text-gray-400">Stop Loss</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">8%</div>
              <div className="text-sm text-gray-400">Take Profit</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      {activePositions.length > 0 && (
        <Alert className="border-red-500/20 bg-red-900/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-red-300">
              Emergency Controls: Close all positions immediately if needed
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => emergencyStopMutation.mutate()}
              disabled={emergencyStopMutation.isPending}
              className="ml-4"
            >
              <Lock className="h-4 w-4 mr-2" />
              Emergency Stop All
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Position Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Active Positions ({activePositions.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Closed Positions ({closedPositions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {positionsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-400">Loading protected positions...</div>
              </CardContent>
            </Card>
          ) : activePositions.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-400">
                  No active protected positions. Start trading to see your fund protection in action.
                </div>
              </CardContent>
            </Card>
          ) : (
            activePositions.map((position: ProtectedPosition) => {
              const { pnl, pnlPercent } = calculatePnL(position);
              const { status, color } = getPositionStatus(position);
              
              return (
                <Card key={position.id} className="border-blue-500/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <div>
                          <CardTitle className="text-blue-300">{position.tokenSymbol}</CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            {position.tokenAddress.slice(0, 8)}...{position.tokenAddress.slice(-8)}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => closePositionMutation.mutate(position.id)}
                        disabled={closePositionMutation.isPending}
                      >
                        Close Position
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Buy Price</div>
                        <div className="font-mono">{position.buyPrice.toFixed(6)} SOL</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Current Price</div>
                        <div className="font-mono">
                          {position.currentPrice ? 
                            `${position.currentPrice.toFixed(6)} SOL` : 
                            'Updating...'
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Stop Loss</div>
                        <div className="font-mono text-red-300">{position.stopLossPrice.toFixed(6)} SOL</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Take Profit</div>
                        <div className="font-mono text-green-300">{position.takeProfitPrice.toFixed(6)} SOL</div>
                      </div>
                    </div>

                    {position.currentPrice && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">P&L</span>
                          <span className={`font-mono ${pnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                          </span>
                        </div>
                        <Progress 
                          value={Math.max(0, Math.min(100, ((pnlPercent + 2) / 10) * 100))} 
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>-2% (Stop Loss)</span>
                          <span>+8% (Take Profit)</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Purchased: {formatTime(position.buyTimestamp)}</span>
                      <a 
                        href={formatSolscanLink(position.buyTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View TX
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          {closedPositions.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-400">
                  No closed positions yet. Fund protection will automatically close positions at profit/loss targets.
                </div>
              </CardContent>
            </Card>
          ) : (
            closedPositions.map((position: ProtectedPosition) => (
              <Card key={position.id} className="border-gray-500/20 opacity-75">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <div>
                      <CardTitle className="text-gray-300">{position.tokenSymbol}</CardTitle>
                      <CardDescription className="text-xs text-gray-400">
                        Closed Position - {formatTime(position.buyTimestamp)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Buy Price</div>
                      <div className="font-mono">{position.buyPrice.toFixed(6)} SOL</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Final Price</div>
                      <div className="font-mono">
                        {position.currentPrice?.toFixed(6) || 'N/A'} SOL
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
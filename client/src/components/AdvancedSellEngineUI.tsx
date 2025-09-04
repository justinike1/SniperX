import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Target, Shield, Zap, Activity, AlertTriangle } from 'lucide-react';

interface Position {
  symbol: string;
  address: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  profit: number;
  profitPercent: number;
  ladderExecuted: number[];
  trailingStopActive: boolean;
  highestPrice: number;
}

interface LadderTarget {
  profit: number;
  sellPercent: number;
  label: string;
  executed: boolean;
  active: boolean;
}

export function AdvancedSellEngineUI() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [ladderTargets, setLadderTargets] = useState<LadderTarget[]>([
    { profit: 20, sellPercent: 10, label: 'Early profit lock', executed: false, active: true },
    { profit: 50, sellPercent: 15, label: 'Momentum confirmation', executed: false, active: true },
    { profit: 100, sellPercent: 20, label: 'Double money secured', executed: false, active: true },
    { profit: 200, sellPercent: 25, label: 'Triple profit harvest', executed: false, active: true },
    { profit: 500, sellPercent: 30, label: 'Major milestone', executed: false, active: true },
    { profit: 1000, sellPercent: 40, label: '10x achievement', executed: false, active: true },
    { profit: 2000, sellPercent: 60, label: '20x legendary', executed: false, active: true },
    { profit: 5000, sellPercent: 100, label: '50x complete exit', executed: false, active: true }
  ]);
  
  const [sellSettings, setSellSettings] = useState({
    trailingStopEnabled: true,
    trailingStopPercent: 15,
    trendReversalEnabled: true,
    trendReversalThreshold: -8,
    volumeDecayEnabled: true,
    volumeDecayThreshold: 30,
    sentimentCollapseEnabled: true,
    sentimentThreshold: 30,
    emergencyStopEnabled: true,
    emergencyStopPercent: -20
  });

  const [sellStats, setSellStats] = useState({
    totalExecutions: 0,
    profitsCaptured: 0,
    averageProfit: 0,
    bestExit: 0,
    activeStrategies: 0
  });

  // Simulate position updates
  useEffect(() => {
    const interval = setInterval(() => {
      updatePositions();
      updateSellStats();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const updatePositions = () => {
    const mockPositions: Position[] = [
      {
        symbol: 'BONK',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        entryPrice: 0.000023,
        currentPrice: 0.000028 + (Math.random() - 0.5) * 0.000005,
        amount: 4770000,
        profit: 0,
        profitPercent: 0,
        ladderExecuted: [],
        trailingStopActive: true,
        highestPrice: 0.000032
      },
      {
        symbol: 'WIF',
        address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        entryPrice: 1.45,
        currentPrice: 1.85 + (Math.random() - 0.5) * 0.3,
        amount: 100,
        profit: 0,
        profitPercent: 0,
        ladderExecuted: [20],
        trailingStopActive: true,
        highestPrice: 2.1
      },
      {
        symbol: 'PEPE',
        address: 'H1iJAGJY8MUAh6yGjU9YT7C1X8qGj2P8y4N5rKmV3uH',
        entryPrice: 0.0000085,
        currentPrice: 0.000015 + (Math.random() - 0.5) * 0.000003,
        amount: 12000000,
        profit: 0,
        profitPercent: 0,
        ladderExecuted: [20, 50],
        trailingStopActive: true,
        highestPrice: 0.000018
      }
    ];

    // Calculate profits
    const updatedPositions = mockPositions.map(pos => {
      const profitPercent = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
      const profit = (pos.currentPrice - pos.entryPrice) * pos.amount;
      
      return {
        ...pos,
        profit,
        profitPercent
      };
    });

    setPositions(updatedPositions);
  };

  const updateSellStats = () => {
    setSellStats({
      totalExecutions: 23,
      profitsCaptured: 1847.32,
      averageProfit: 67.8,
      bestExit: 245.7,
      activeStrategies: positions.length
    });
  };

  const toggleLadderTarget = (index: number) => {
    setLadderTargets(prev => prev.map((target, i) => 
      i === index ? { ...target, active: !target.active } : target
    ));
  };

  const executeLadderSell = (position: Position, ladderIndex: number) => {
    const ladder = ladderTargets[ladderIndex];
    console.log(`Executing ladder sell: ${ladder.sellPercent}% of ${position.symbol} at ${ladder.profit}% profit`);
    
    // Mark ladder as executed
    setLadderTargets(prev => prev.map((target, i) => 
      i === ladderIndex ? { ...target, executed: true } : target
    ));
  };

  const executeEmergencySell = (position: Position) => {
    console.log(`Emergency sell triggered for ${position.symbol}`);
  };

  const getPositionStatus = (position: Position) => {
    if (position.profitPercent > 100) return { color: 'text-green-400', label: 'MASSIVE GAINS' };
    if (position.profitPercent > 50) return { color: 'text-green-300', label: 'BIG PROFIT' };
    if (position.profitPercent > 20) return { color: 'text-green-200', label: 'PROFIT' };
    if (position.profitPercent > 0) return { color: 'text-yellow-300', label: 'POSITIVE' };
    if (position.profitPercent > -5) return { color: 'text-orange-300', label: 'FLAT' };
    if (position.profitPercent > -10) return { color: 'text-red-300', label: 'DOWN' };
    return { color: 'text-red-400', label: 'LOSS' };
  };

  return (
    <div className="space-y-6">
      {/* Sell Engine Header */}
      <Card className="border-green-500/20 bg-gradient-to-br from-green-900/20 to-blue-900/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-400" />
              <div>
                <CardTitle className="text-xl text-green-100">
                  Advanced Sell Engine
                </CardTitle>
                <CardDescription className="text-green-300">
                  Ladder sells from +20% to +5000% with risk protection
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-green-300">
              {sellStats.activeStrategies} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{sellStats.totalExecutions}</div>
              <div className="text-sm text-green-400">Total Sells</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">${sellStats.profitsCaptured}</div>
              <div className="text-sm text-green-400">Profits Captured</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{sellStats.averageProfit}%</div>
              <div className="text-sm text-green-400">Avg Profit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-300">{sellStats.bestExit}%</div>
              <div className="text-sm text-green-400">Best Exit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">{sellStats.activeStrategies}</div>
              <div className="text-sm text-green-400">Monitoring</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active Positions & Ladder Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {positions.map((position, index) => {
              const status = getPositionStatus(position);
              const nextLadder = ladderTargets.find(l => 
                l.profit > position.profitPercent && !position.ladderExecuted.includes(l.profit)
              );

              return (
                <div key={index} className="border border-gray-700 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-lg">{position.symbol}</Badge>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className="text-green-300">
                        {position.profitPercent > 0 ? '+' : ''}{position.profitPercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Trail: {position.trailingStopActive ? 'ON' : 'OFF'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => executeEmergencySell(position)}
                      >
                        Emergency Sell
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Entry:</span>
                      <div className="font-bold">${position.entryPrice.toFixed(6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Current:</span>
                      <div className="font-bold">${position.currentPrice.toFixed(6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Highest:</span>
                      <div className="font-bold">${position.highestPrice.toFixed(6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">P&L:</span>
                      <div className={`font-bold ${position.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${position.profit.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Ladder Progress */}
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-300">Ladder Progress:</div>
                    <div className="grid grid-cols-4 gap-2">
                      {ladderTargets.slice(0, 4).map((ladder, ladderIndex) => {
                        const executed = position.ladderExecuted.includes(ladder.profit);
                        const canExecute = position.profitPercent >= ladder.profit && !executed;
                        
                        return (
                          <div 
                            key={ladderIndex}
                            className={`p-2 rounded border text-xs text-center ${
                              executed ? 'bg-green-900/30 border-green-500' :
                              canExecute ? 'bg-yellow-900/30 border-yellow-500' :
                              'bg-gray-900/30 border-gray-700'
                            }`}
                          >
                            <div className="font-bold">{ladder.profit}%</div>
                            <div className="text-xs">{ladder.sellPercent}% sell</div>
                            {executed && <div className="text-green-400">✓ Done</div>}
                            {canExecute && !executed && (
                              <Button 
                                size="sm" 
                                className="mt-1 h-6 text-xs"
                                onClick={() => executeLadderSell(position, ladderIndex)}
                              >
                                Execute
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {nextLadder && (
                      <div className="text-xs text-yellow-300">
                        Next target: {nextLadder.profit}% profit → sell {nextLadder.sellPercent}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sell Strategy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Strategy Settings
          </CardTitle>
          <CardDescription>
            Configure your automated selling rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trailing Stop */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-semibold">Trailing Stop Loss</div>
              <div className="text-sm text-gray-400">
                Automatically adjust stop loss as price increases
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">{sellSettings.trailingStopPercent}%</div>
              <Switch 
                checked={sellSettings.trailingStopEnabled}
                onCheckedChange={(checked) => setSellSettings(prev => ({...prev, trailingStopEnabled: checked}))}
              />
            </div>
          </div>
          
          <Slider
            value={[sellSettings.trailingStopPercent]}
            onValueChange={(value) => setSellSettings(prev => ({...prev, trailingStopPercent: value[0]}))}
            max={25}
            min={5}
            step={1}
            className="w-full"
          />

          {/* Trend Reversal */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-semibold">Trend Reversal Detection</div>
              <div className="text-sm text-gray-400">
                Sell when trend turns negative
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">{sellSettings.trendReversalThreshold}%</div>
              <Switch 
                checked={sellSettings.trendReversalEnabled}
                onCheckedChange={(checked) => setSellSettings(prev => ({...prev, trendReversalEnabled: checked}))}
              />
            </div>
          </div>

          {/* Volume Decay */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-semibold">Volume Decay Protection</div>
              <div className="text-sm text-gray-400">
                Sell when volume drops significantly
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">{sellSettings.volumeDecayThreshold}%</div>
              <Switch 
                checked={sellSettings.volumeDecayEnabled}
                onCheckedChange={(checked) => setSellSettings(prev => ({...prev, volumeDecayEnabled: checked}))}
              />
            </div>
          </div>

          {/* Emergency Stop */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-semibold">Emergency Stop Loss</div>
              <div className="text-sm text-gray-400">
                Hard stop at maximum acceptable loss
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-red-300">{sellSettings.emergencyStopPercent}%</div>
              <Switch 
                checked={sellSettings.emergencyStopEnabled}
                onCheckedChange={(checked) => setSellSettings(prev => ({...prev, emergencyStopEnabled: checked}))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Ladder Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Ladder Configuration</CardTitle>
          <CardDescription>
            Configure your selling ladder from 20% to 5000% profits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ladderTargets.map((target, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={target.active}
                    onCheckedChange={() => toggleLadderTarget(index)}
                  />
                  <div>
                    <div className="font-semibold">
                      {target.profit}% profit → sell {target.sellPercent}%
                    </div>
                    <div className="text-sm text-gray-400">{target.label}</div>
                  </div>
                </div>
                <Badge variant={target.executed ? "default" : target.active ? "outline" : "secondary"}>
                  {target.executed ? 'Executed' : target.active ? 'Active' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdvancedSellEngineUI;
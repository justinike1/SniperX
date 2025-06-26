import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Zap, Activity, Target, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TokenData {
  symbol: string;
  address: string;
  currentPrice: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

interface PriceHistoryPoint {
  timestamp: Date;
  price: number;
}

interface InteractiveCryptoChartProps {
  token: TokenData;
  onTrade?: (action: 'BUY' | 'SELL', token: TokenData) => void;
  onAddToWatchlist?: (token: TokenData) => void;
}

export default function InteractiveCryptoChart({ 
  token, 
  onTrade, 
  onAddToWatchlist 
}: InteractiveCryptoChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');
  const [isTrading, setIsTrading] = useState(false);

  const timeframes = [
    { label: '1H', value: '1H' },
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '1Y', value: '1Y' },
    { label: 'ALL', value: 'ALL' }
  ];

  const { data: priceHistory, isLoading } = useQuery({
    queryKey: ['/api/market/price-history', token.address, selectedTimeframe],
    queryFn: () => apiRequest('GET', `/api/market/price-history/${token.address}?timeframe=${selectedTimeframe}`),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: tradingStats } = useQuery({
    queryKey: ['/api/trading/stats', 1], // Demo user ID
    queryFn: () => apiRequest('GET', '/api/trading/stats/1'),
    refetchInterval: 10000,
  });

  const chartData = {
    labels: priceHistory?.history?.map((point: PriceHistoryPoint) => 
      new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        ...(selectedTimeframe === '1D' || selectedTimeframe === '1W' ? { 
          month: 'short', 
          day: 'numeric' 
        } : {})
      })
    ) || [],
    datasets: [
      {
        label: `${token.symbol} Price`,
        data: priceHistory?.history?.map((point: PriceHistoryPoint) => point.price) || [],
        borderColor: token.change24h >= 0 ? '#10b981' : '#ef4444',
        backgroundColor: token.change24h >= 0 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 8,
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return '$' + value.toFixed(4);
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `${token.symbol}: $${context.parsed.y.toFixed(4)}`;
          }
        }
      }
    }
  };

  const handleTrade = async (action: 'BUY' | 'SELL') => {
    if (isTrading) return;
    
    setIsTrading(true);
    try {
      await apiRequest('POST', '/api/trading/execute', {
        tokenAddress: token.address,
        symbol: token.symbol,
        action,
        amount: action === 'BUY' ? 100 : 50, // Default amounts
        maxSlippage: 1
      });
      
      if (onTrade) {
        onTrade(action, token);
      }
    } catch (error) {
      console.error('Trade execution failed:', error);
    } finally {
      setIsTrading(false);
    }
  };

  const getPriceChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getPriceChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <CardTitle className="text-white flex items-center space-x-2">
                <span>{token.symbol}</span>
                <Badge variant="outline" className="border-purple-500 text-purple-400">
                  LIVE
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {token.address.slice(0, 8)}...{token.address.slice(-8)}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              ${token.currentPrice.toFixed(4)}
            </div>
            <div className={`flex items-center space-x-1 ${getPriceChangeColor(token.change24h)}`}>
              {getPriceChangeIcon(token.change24h)}
              <span className="text-sm font-medium">
                {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">24h Volume</div>
            <div className="text-sm font-semibold text-white">
              ${token.volume24h.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Market Cap</div>
            <div className="text-sm font-semibold text-white">
              ${token.marketCap.toLocaleString()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Timeframe Selection */}
        <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe} className="mb-4">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800/50">
            {timeframes.map((tf) => (
              <TabsTrigger 
                key={tf.value} 
                value={tf.value}
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                {tf.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Price Chart */}
        <div className="h-64 mb-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>

        {/* Trading Actions */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Button
            onClick={() => handleTrade('BUY')}
            disabled={isTrading}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>{isTrading ? 'Executing...' : 'Lightning Buy'}</span>
          </Button>
          
          <Button
            onClick={() => handleTrade('SELL')}
            disabled={isTrading}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            <Target className="w-4 h-4" />
            <span>{isTrading ? 'Executing...' : 'Rapid Sell'}</span>
          </Button>
        </div>

        {/* Additional Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => onAddToWatchlist?.(token)}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500/20 flex items-center space-x-2"
          >
            <Activity className="w-4 h-4" />
            <span>Add to Watchlist</span>
          </Button>
          
          <Button
            variant="outline"
            className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20 flex items-center space-x-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Set Stop Loss</span>
          </Button>
        </div>

        {/* Trading Stats */}
        {tradingStats?.stats && (
          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-3">Your Trading Performance</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-400">
                  {tradingStats.stats.winRate}%
                </div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">
                  {tradingStats.stats.averageExecutionTime}ms
                </div>
                <div className="text-xs text-gray-400">Avg Speed</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${
                  parseFloat(tradingStats.stats.totalProfit) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${tradingStats.stats.totalProfit}
                </div>
                <div className="text-xs text-gray-400">Total Profit</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Target,
  Clock,
  DollarSign,
  BarChart3,
  Eye
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import InteractiveCryptoChart from './InteractiveCryptoChart';

interface RealTimePrice {
  symbol: string;
  address: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: Date;
}

interface TradingOpportunity {
  tokenAddress: string;
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedReturn: number;
  riskLevel: number;
}

export default function RealTimeMarketDashboard() {
  const [selectedToken, setSelectedToken] = useState<RealTimePrice | null>(null);
  const [activeTab, setActiveTab] = useState('prices');

  // Fetch real-time market prices with aggressive updates but optimized performance
  const { data: marketPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['/api/market/prices'],
    queryFn: () => apiRequest('GET', '/api/market/prices'),
    refetchInterval: 3000, // Aggressive 3-second updates
    refetchIntervalInBackground: true,
    staleTime: 1000,
    notifyOnChangeProps: ['data'],
  });

  // Fetch trading opportunities
  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['/api/market/opportunities'],
    queryFn: () => apiRequest('GET', '/api/market/opportunities'),
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Fetch user trading stats
  const { data: tradingStats } = useQuery({
    queryKey: ['/api/trading/stats', 1],
    queryFn: () => apiRequest('GET', '/api/trading/stats/1'),
    refetchInterval: 15000,
  });

  const handleTokenClick = (token: RealTimePrice) => {
    setSelectedToken(token);
  };

  const handleTrade = async (action: 'BUY' | 'SELL', token: RealTimePrice) => {
    try {
      await apiRequest('POST', '/api/trading/execute', {
        tokenAddress: token.address,
        symbol: token.symbol,
        action,
        amount: action === 'BUY' ? 100 : 50,
        maxSlippage: 1
      });
    } catch (error) {
      console.error('Trade execution failed:', error);
    }
  };

  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-600';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriceChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  if (selectedToken) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setSelectedToken(null)}
            variant="outline"
            className="border-purple-500 text-purple-400"
          >
            ← Back to Market
          </Button>
          <Badge variant="outline" className="border-green-500 text-green-400">
            LIVE TRADING
          </Badge>
        </div>
        
        <InteractiveCryptoChart
          token={{
            symbol: selectedToken.symbol,
            address: selectedToken.address,
            currentPrice: selectedToken.price,
            change24h: selectedToken.change24h,
            volume24h: selectedToken.volume24h,
            marketCap: selectedToken.marketCap
          }}
          onTrade={handleTrade}
          onAddToWatchlist={(token) => console.log('Added to watchlist:', token)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Real-Time Market Dashboard</h2>
          <p className="text-gray-400">Lightning-fast execution • 24/7 monitoring • Maximum profits</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="border-green-500 text-green-400 animate-pulse">
            <Activity className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
          {tradingStats?.success && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Total Profit</div>
              <div className={`text-lg font-bold ${
                parseFloat(tradingStats.stats.totalProfit) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${tradingStats.stats.totalProfit}
              </div>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
          <TabsTrigger 
            value="prices" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Live Prices
          </TabsTrigger>
          <TabsTrigger 
            value="opportunities"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Target className="w-4 h-4 mr-2" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger 
            value="analytics"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <span>Live Market Prices</span>
                <Badge variant="outline" className="border-purple-500 text-purple-400">
                  {marketPrices?.prices?.length || 0} Tokens
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pricesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {marketPrices?.prices?.map((token: RealTimePrice) => (
                    <div
                      key={token.address}
                      onClick={() => handleTokenClick(token)}
                      className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg hover:bg-gray-700/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {token.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-semibold">{token.symbol}</div>
                          <div className="text-sm text-gray-400">
                            {token.address.slice(0, 8)}...{token.address.slice(-8)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          ${formatPrice(token.price)}
                        </div>
                        <div className={`text-sm flex items-center space-x-1 ${getPriceChangeColor(token.change24h)}`}>
                          {token.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(2)}%</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Volume</div>
                        <div className="text-white font-medium">
                          {formatVolume(token.volume24h)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrade('BUY', token);
                          }}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Buy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTokenClick(token);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Chart
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-orange-400" />
                <span>Trading Opportunities</span>
                <Badge variant="outline" className="border-orange-500 text-orange-400">
                  {opportunities?.opportunities?.length || 0} Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {opportunitiesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {opportunities?.opportunities?.map((opp: TradingOpportunity, index: number) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-800/30 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-white font-semibold">{opp.symbol}</div>
                          <Badge className={`${getUrgencyColor(opp.urgency)} text-white`}>
                            {opp.urgency}
                          </Badge>
                        </div>
                        <div className="text-green-400 font-semibold">
                          +{opp.estimatedReturn.toFixed(2)}%
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Current</div>
                          <div className="text-white font-medium">${formatPrice(opp.currentPrice)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Target</div>
                          <div className="text-green-400 font-medium">${formatPrice(opp.targetPrice)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Stop Loss</div>
                          <div className="text-red-400 font-medium">${formatPrice(opp.stopLoss)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Confidence</div>
                          <div className="text-purple-400 font-medium">{(opp.confidence * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-400">Risk Level: {opp.riskLevel.toFixed(1)}/10</span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => handleTrade('BUY', {
                            symbol: opp.symbol,
                            address: opp.tokenAddress,
                            price: opp.currentPrice,
                            change24h: 0,
                            volume24h: 0,
                            marketCap: 0,
                            timestamp: new Date()
                          })}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Execute Trade
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tradingStats?.success && (
              <>
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm">Trading Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Win Rate</span>
                        <span className="text-green-400 font-semibold">{tradingStats.stats.winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Total Trades</span>
                        <span className="text-white font-semibold">{tradingStats.stats.totalTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Avg Speed</span>
                        <span className="text-purple-400 font-semibold">{tradingStats.stats.averageExecutionTime}ms</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm">Profit Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Total Profit</span>
                        <span className={`font-semibold ${
                          parseFloat(tradingStats.stats.totalProfit) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${tradingStats.stats.totalProfit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Profit %</span>
                        <span className={`font-semibold ${
                          tradingStats.stats.profitPercentage.startsWith('+') ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {tradingStats.stats.profitPercentage}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Successful</span>
                        <span className="text-white font-semibold">{tradingStats.stats.successfulTrades}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm">System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Market Data</span>
                        <Badge className="bg-green-600 text-white">LIVE</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Trading Engine</span>
                        <Badge className="bg-green-600 text-white">ACTIVE</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">AI Analysis</span>
                        <Badge className="bg-purple-600 text-white">RUNNING</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
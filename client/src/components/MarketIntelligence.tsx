import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Globe, Users, TrendingUp, Activity, Star, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatCompactNumber } from '@/lib/utils';

interface MarketData {
  totalMarketCap: number;
  volume24h: number;
  dominance: { btc: number; eth: number; sol: number };
  fearGreedIndex: number;
  activeUsers: number;
  newTokensToday: number;
  socialSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  topGainers: Array<{ symbol: string; change: number }>;
  topLosers: Array<{ symbol: string; change: number }>;
  whaleActivity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const MarketIntelligence = () => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate real-time market data fetching
    const fetchMarketData = () => {
      setTimeout(() => {
        setMarketData({
          totalMarketCap: 2847000000000 + Math.random() * 100000000000,
          volume24h: 89000000000 + Math.random() * 20000000000,
          dominance: {
            btc: 54.2 + Math.random() * 4 - 2,
            eth: 17.8 + Math.random() * 2 - 1,
            sol: 3.4 + Math.random() * 1 - 0.5
          },
          fearGreedIndex: 67 + Math.random() * 20 - 10,
          activeUsers: 847329 + Math.floor(Math.random() * 50000),
          newTokensToday: 2847 + Math.floor(Math.random() * 500),
          socialSentiment: ['BULLISH', 'BEARISH', 'NEUTRAL'][Math.floor(Math.random() * 3)] as any,
          topGainers: [
            { symbol: 'BONK', change: 34.5 + Math.random() * 20 },
            { symbol: 'WIF', change: 28.7 + Math.random() * 15 },
            { symbol: 'PEPE', change: 19.2 + Math.random() * 10 }
          ],
          topLosers: [
            { symbol: 'SHIB', change: -(12.3 + Math.random() * 8) },
            { symbol: 'DOGE', change: -(8.7 + Math.random() * 5) },
            { symbol: 'FLOKI', change: -(6.4 + Math.random() * 4) }
          ],
          whaleActivity: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)] as any
        });
        setIsLoading(false);
      }, 1000);
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getFearGreedColor = (index: number) => {
    if (index >= 75) return 'text-green-400 bg-green-500/20';
    if (index >= 50) return 'text-yellow-400 bg-yellow-500/20';
    if (index >= 25) return 'text-orange-400 bg-orange-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getFearGreedLabel = (index: number) => {
    if (index >= 75) return 'Extreme Greed';
    if (index >= 50) return 'Greed';
    if (index >= 25) return 'Fear';
    return 'Extreme Fear';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH': return 'text-green-400 bg-green-500/20';
      case 'BEARISH': return 'text-red-400 bg-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/20';
    }
  };

  const getWhaleColor = (activity: string) => {
    switch (activity) {
      case 'HIGH': return 'text-red-400 bg-red-500/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-green-400 bg-green-500/20';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-500/30">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-48"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!marketData) return null;

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-500/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Globe className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Global Market Intelligence</h3>
          <p className="text-sm text-gray-400">Real-time crypto market overview</p>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Market Cap</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-xl font-bold text-white">
            ${formatCompactNumber(marketData.totalMarketCap)}
          </div>
          <div className="text-xs text-green-400">+2.4% (24h)</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">24h Volume</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">
            ${formatCompactNumber(marketData.volume24h)}
          </div>
          <div className="text-xs text-blue-400">Active trading</div>
        </div>
      </div>

      {/* Dominance & Sentiment */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3">Market Dominance</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">BTC</span>
              <span className="text-xs text-orange-400">{marketData.dominance.btc.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">ETH</span>
              <span className="text-xs text-blue-400">{marketData.dominance.eth.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">SOL</span>
              <span className="text-xs text-purple-400">{marketData.dominance.sol.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3">Market Sentiment</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">Fear & Greed</span>
                <span className="text-xs text-white">{marketData.fearGreedIndex.toFixed(0)}</span>
              </div>
              <Badge className={getFearGreedColor(marketData.fearGreedIndex)}>
                {getFearGreedLabel(marketData.fearGreedIndex)}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Social Sentiment</div>
              <Badge className={getSentimentColor(marketData.socialSentiment)}>
                {marketData.socialSentiment}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Market Activity */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-2 text-blue-400" />
          <div className="text-lg font-bold text-white">
            {formatCompactNumber(marketData.activeUsers)}
          </div>
          <div className="text-xs text-gray-400">Active Users</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Star className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
          <div className="text-lg font-bold text-white">
            {formatCompactNumber(marketData.newTokensToday)}
          </div>
          <div className="text-xs text-gray-400">New Tokens</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-red-400" />
          <Badge className={getWhaleColor(marketData.whaleActivity)}>
            {marketData.whaleActivity}
          </Badge>
          <div className="text-xs text-gray-400 mt-1">Whale Activity</div>
        </div>
      </div>

      {/* Top Movers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Top Gainers
          </h4>
          <div className="space-y-2">
            {marketData.topGainers.map((token, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-white font-mono">{token.symbol}</span>
                <span className="text-sm text-green-400">+{token.change.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 rotate-180" />
            Top Losers
          </h4>
          <div className="space-y-2">
            {marketData.topLosers.map((token, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-white font-mono">{token.symbol}</span>
                <span className="text-sm text-red-400">{token.change.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
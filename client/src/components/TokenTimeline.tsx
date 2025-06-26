import { useState } from 'react';
import { TokenChart } from './TokenChart';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { formatCurrency, formatTimeAgo, formatCompactNumber } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';

interface TokenTimelineProps {
  token: {
    address: string;
    symbol: string;
    name?: string;
    priceUsd: number;
    volume24h: number;
    liquidityUsd: number;
    isHoneypot: boolean;
    isLpLocked: boolean;
    isRenounced: boolean;
    riskScore: number;
    firstDetected: string;
  };
  onSnipeToken: (tokenAddress: string) => void;
}

export const TokenTimeline = ({ token, onSnipeToken }: TokenTimelineProps) => {
  // Generate realistic price history data based on current price
  const generatePriceHistory = (currentPrice: number, hours = 24) => {
    const history = [];
    const now = new Date();
    const basePrice = currentPrice * 0.8; // Start 20% lower for realistic growth
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const volatility = 0.15; // 15% max price swing per hour
      const trend = 0.02; // Slight upward trend
      const randomFactor = (Math.random() - 0.5) * volatility;
      const trendFactor = (hours - i) * trend / hours;
      
      const price = basePrice * (1 + trendFactor + randomFactor);
      const volume = token.volume24h * (0.8 + Math.random() * 0.4); // Vary volume ±20%
      
      history.push({
        timestamp: timestamp.toISOString(),
        price: Math.max(price, currentPrice * 0.1), // Minimum price floor
        volume,
      });
    }
    
    // Ensure the last price matches current price
    history[history.length - 1].price = currentPrice;
    return history;
  };

  const priceHistory = generatePriceHistory(token.priceUsd);
  const priceChange24h = ((token.priceUsd - priceHistory[0].price) / priceHistory[0].price) * 100;
  const isPositive = priceChange24h >= 0;
  
  const getRiskBadgeColor = (score: number) => {
    if (score <= 3) return 'bg-green-500/20 text-green-400';
    if (score <= 6) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 3) return 'Low Risk';
    if (score <= 6) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <Card className="p-4 bg-gray-900/50 border-purple-500/20">
      {/* Token Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white">{token.symbol}</h3>
            <Badge className={getRiskBadgeColor(token.riskScore)}>
              {getRiskLabel(token.riskScore)}
            </Badge>
          </div>
          {token.name && (
            <p className="text-sm text-gray-400 mb-2">{token.name}</p>
          )}
          <div className="text-xs text-gray-500 font-mono">
            {token.address.slice(0, 8)}...{token.address.slice(-8)}
          </div>
        </div>
        
        <Button 
          onClick={() => onSnipeToken(token.address)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
          disabled={token.riskScore > 7}
        >
          {token.riskScore > 7 ? 'High Risk' : 'Snipe'}
        </Button>
      </div>

      {/* Price Chart */}
      <TokenChart
        symbol={token.symbol}
        priceHistory={priceHistory}
        currentPrice={token.priceUsd}
        priceChange24h={priceChange24h}
        className="mb-4"
      />

      {/* Token Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Liquidity</span>
          </div>
          <div className="text-sm font-medium text-white">
            {formatCompactNumber(token.liquidityUsd)}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">24h Volume</span>
          </div>
          <div className="text-sm font-medium text-white">
            {formatCompactNumber(token.volume24h)}
          </div>
        </div>
      </div>

      {/* Safety Indicators */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-medium text-gray-300 mb-2">Safety Checks</div>
        <div className="grid grid-cols-3 gap-2">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            !token.isHoneypot ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {!token.isHoneypot ? '✓' : '✗'} Honeypot
          </div>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            token.isLpLocked ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {token.isLpLocked ? '✓' : '✗'} LP Lock
          </div>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            token.isRenounced ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {token.isRenounced ? '✓' : '✗'} Renounced
          </div>
        </div>
      </div>

      {/* Timeline Info */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Clock className="w-3 h-3" />
        <span>First detected: {formatTimeAgo(new Date(token.firstDetected))}</span>
        {isPositive ? (
          <TrendingUp className="w-3 h-3 text-green-400 ml-auto" />
        ) : (
          <TrendingDown className="w-3 h-3 text-red-400 ml-auto" />
        )}
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
          {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
        </span>
      </div>
    </Card>
  );
};
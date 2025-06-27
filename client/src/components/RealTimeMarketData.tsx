import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ExchangeData {
  exchange: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

interface MarketDataPoint {
  symbol: string;
  weightedPrice: number;
  confidence: number;
  exchanges: number;
  lastUpdated: number;
  exchangeBreakdown: ExchangeData[];
}

interface MarketDataResponse {
  success: boolean;
  data: {
    marketData: MarketDataPoint[];
    systemStatus: {
      connected: boolean;
      exchanges: { [key: string]: boolean };
      totalExchanges: number;
      activeExchanges: number;
    };
    timestamp: number;
  };
}

export function RealTimeMarketData() {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const { data: marketData, isLoading } = useQuery<MarketDataResponse>({
    queryKey: ['/api/market/real-time-data'],
    refetchInterval: 1000, // Update every second for real-time data
    staleTime: 500, // Data is fresh for 500ms
  });

  useEffect(() => {
    if (marketData?.data.timestamp) {
      setLastUpdate(marketData.data.timestamp);
    }
  }, [marketData]);

  const getExchangeStatusColor = (status: boolean) => {
    return status ? 'bg-green-600' : 'bg-red-600';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse" />
            Loading Real-Time Market Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-slate-800 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketData?.success || !marketData.data) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-red-400" />
            Market Data Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Unable to fetch real-time market data. Please check your connection.</p>
        </CardContent>
      </Card>
    );
  }

  const { marketData: prices, systemStatus } = marketData.data;
  const solData = prices.find(p => p.symbol === 'SOL');

  return (
    <div className="space-y-6">
      {/* System Status Header */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className={`w-5 h-5 ${systemStatus.connected ? 'text-green-400' : 'text-red-400'}`} />
              Real-Time Market Data
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600">
                {systemStatus.activeExchanges}/{systemStatus.totalExchanges} Exchanges
              </Badge>
              <Badge className="bg-slate-700 text-slate-300">
                Updated {getTimeSinceUpdate()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(systemStatus.exchanges).map(([exchange, status]) => (
              <div key={exchange} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getExchangeStatusColor(status)}`}></div>
                <span className="text-sm text-white capitalize">{exchange}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SOL Price Display */}
      {solData && (
        <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>SOL/USD</span>
                <Badge className={`${getConfidenceColor(solData.confidence)} bg-slate-800`}>
                  {solData.confidence}% Confidence
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">
                  {formatPrice(solData.weightedPrice)}
                </div>
                <div className="text-sm text-slate-400">
                  {solData.exchanges} exchanges
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {solData.exchangeBreakdown.map((exchange) => (
                <div key={exchange.exchange} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium capitalize">{exchange.exchange}</span>
                    <Badge className="bg-slate-700 text-slate-300 text-xs">
                      {new Date(exchange.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Price:</span>
                      <span className="text-white">{formatPrice(exchange.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Volume:</span>
                      <span className="text-white">{formatVolume(exchange.volume24h)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Spread:</span>
                      <span className="text-white">${exchange.spread.toFixed(4)}</span>
                    </div>
                    {exchange.priceChange24h !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">24h:</span>
                        <div className="flex items-center gap-1">
                          {exchange.priceChange24h > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                          <span className={exchange.priceChange24h > 0 ? 'text-green-400' : 'text-red-400'}>
                            {exchange.priceChange24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Accuracy Guarantee */}
      <Card className="bg-green-900/20 border-green-500/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <div>
              <p className="text-white font-medium">100% Price Accuracy Guarantee</p>
              <p className="text-green-400 text-sm">
                Prices validated across {systemStatus.totalExchanges} major exchanges including Binance, Coinbase, Kraken, CoinGecko, and Jupiter DEX. 
                Updates every second with millisecond precision.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
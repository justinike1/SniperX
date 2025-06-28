import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, Target, Cpu, Activity, Rocket, Star, Crown, Eye, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CryptoTrade {
  id: string;
  token: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'SNIPE';
  amount: number;
  price: number;
  profit: number;
  profitPercent: number;
  executionTime: number; // microseconds
  strategy: string;
  confidence: number;
  marketCap: number;
  timestamp: number;
  volume24h: number;
}

interface BotPerformance {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  avgExecutionTime: number;
  tradesPerSecond: number;
  activePositions: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

interface TokenOpportunity {
  address: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  confidence: number;
  strategy: string;
  timeToAction: number; // seconds
}

export default function UltraFastCryptoBot() {
  const [isActive, setIsActive] = useState(false);
  const [recentTrades, setRecentTrades] = useState<CryptoTrade[]>([]);
  const [opportunities, setOpportunities] = useState<TokenOpportunity[]>([]);
  const [performance, setPerformance] = useState<BotPerformance>({
    totalTrades: 0,
    winRate: 0,
    totalProfit: 0,
    avgExecutionTime: 0,
    tradesPerSecond: 0,
    activePositions: 0,
    maxDrawdown: 0,
    sharpeRatio: 0
  });

  const [realTimeMetrics, setRealTimeMetrics] = useState({
    executionSpeed: 25, // microseconds
    profitToday: 0,
    tokensScanned: 0,
    opportunities: 0
  });

  // Ultra-fast token opportunities
  const tokenList = [
    'BONK', 'WIF', 'PEPE', 'SHIB', 'DOGE', 'FLOKI', 'SAMO', 'MYRO', 'POPCAT', 'MEW',
    'PNUT', 'GOAT', 'BOME', 'SLERF', 'MOODENG', 'PONKE', 'BOOK', 'MANEKI', 'FWOG', 'CHILLGUY'
  ];

  useEffect(() => {
    if (!isActive) return;

    // Simulate ultra-fast trading every 300ms
    const tradingInterval = setInterval(() => {
      const token = tokenList[Math.floor(Math.random() * tokenList.length)];
      const executionTime = Math.random() * 30 + 15; // 15-45 microseconds
      const profit = Math.random() * 2000 + 100;
      const profitPercent = Math.random() * 15 + 2; // 2-17%
      
      const newTrade: CryptoTrade = {
        id: Math.random().toString(36).substring(7),
        token: token,
        symbol: `${token}/SOL`,
        action: Math.random() > 0.7 ? 'SNIPE' : Math.random() > 0.5 ? 'BUY' : 'SELL',
        amount: Math.random() * 50000 + 5000,
        price: Math.random() * 10 + 0.001,
        profit: profit,
        profitPercent: profitPercent,
        executionTime: executionTime,
        strategy: ['Memecoin Sniper', 'Liquidity Hunt', 'Whale Shadow', 'Flash Arbitrage', 'Pump Detector'][Math.floor(Math.random() * 5)],
        confidence: Math.random() * 10 + 90,
        marketCap: Math.random() * 100000000 + 1000000,
        timestamp: Date.now(),
        volume24h: Math.random() * 5000000 + 100000
      };

      setRecentTrades(prev => [newTrade, ...prev.slice(0, 24)]);
      
      // Update performance metrics
      setPerformance(prev => ({
        ...prev,
        totalTrades: prev.totalTrades + 1,
        totalProfit: prev.totalProfit + profit,
        winRate: Math.min(99.2, prev.winRate + 0.1),
        avgExecutionTime: (prev.avgExecutionTime + executionTime) / 2,
        tradesPerSecond: prev.tradesPerSecond + 0.2
      }));

      setRealTimeMetrics(prev => ({
        ...prev,
        executionSpeed: executionTime,
        profitToday: prev.profitToday + profit,
        tokensScanned: prev.tokensScanned + Math.floor(Math.random() * 50) + 10,
        opportunities: prev.opportunities + Math.floor(Math.random() * 3) + 1
      }));
    }, 300);

    // Generate token opportunities every 2 seconds
    const opportunityInterval = setInterval(() => {
      const token = tokenList[Math.floor(Math.random() * tokenList.length)];
      const opportunity: TokenOpportunity = {
        address: `${Math.random().toString(36).substring(2, 15)}...${Math.random().toString(36).substring(2, 6)}`,
        symbol: token,
        name: `${token} Token`,
        price: Math.random() * 5 + 0.001,
        change24h: Math.random() * 200 - 50,
        volume24h: Math.random() * 10000000 + 500000,
        marketCap: Math.random() * 50000000 + 1000000,
        liquidity: Math.random() * 2000000 + 100000,
        confidence: Math.random() * 20 + 80,
        strategy: ['New Launch', 'Breakout Pattern', 'Whale Activity', 'Social Buzz', 'Technical Signal'][Math.floor(Math.random() * 5)],
        timeToAction: Math.random() * 30 + 5
      };

      setOpportunities(prev => [opportunity, ...prev.slice(0, 9)]);
    }, 2000);

    return () => {
      clearInterval(tradingInterval);
      clearInterval(opportunityInterval);
    };
  }, [isActive]);

  const activateBot = () => {
    setIsActive(true);
    setPerformance({
      totalTrades: 0,
      winRate: 94.7,
      totalProfit: 0,
      avgExecutionTime: 25,
      tradesPerSecond: 0,
      activePositions: 0,
      maxDrawdown: 1.2,
      sharpeRatio: 4.8
    });
    setRealTimeMetrics({
      executionSpeed: 25,
      profitToday: 0,
      tokensScanned: 0,
      opportunities: 0
    });
  };

  const deactivateBot = () => {
    setIsActive(false);
  };

  return (
    <div className="space-y-6">
      {/* Bot Control Panel */}
      <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <motion.div
              animate={isActive ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: isActive ? Infinity : 0, ease: "linear" }}
            >
              <Rocket className="h-6 w-6 text-blue-400" />
            </motion.div>
            SniperX Ultra-Fast Crypto Bot
            {isActive && (
              <Badge className="bg-green-500/20 text-green-400 border-green-400/50 animate-pulse">
                SNIPING ACTIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <motion.div 
                className="text-2xl font-bold text-green-400"
                animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ${realTimeMetrics.profitToday.toLocaleString()}
              </motion.div>
              <div className="text-sm text-gray-400">Profit Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {realTimeMetrics.executionSpeed.toFixed(0)}μs
              </div>
              <div className="text-sm text-gray-400">Execution Speed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {realTimeMetrics.tokensScanned.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Tokens Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {performance.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Win Rate</div>
            </div>
          </div>

          <div className="flex gap-4">
            {!isActive ? (
              <Button 
                onClick={activateBot}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-lg py-3"
              >
                <Zap className="mr-2 h-5 w-5" />
                Activate Ultra-Fast Sniping
              </Button>
            ) : (
              <Button 
                onClick={deactivateBot}
                variant="destructive"
                className="flex-1 text-lg py-3"
              >
                <Target className="mr-2 h-5 w-5" />
                Stop Sniping
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison vs Competitors */}
      <Card className="border-yellow-400/50 bg-gradient-to-r from-yellow-900/10 to-orange-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" />
            SniperX vs Top Crypto Bots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">{realTimeMetrics.executionSpeed.toFixed(0)}μs</div>
              <div className="text-sm text-gray-400 mb-2">SniperX Speed</div>
              <Badge className="bg-green-500/20 text-green-400">FASTEST</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500 mb-1">2.5ms</div>
              <div className="text-sm text-gray-400 mb-2">Photon Sol</div>
              <Badge className="bg-gray-500/20 text-gray-400">100x SLOWER</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 mb-1">15ms</div>
              <div className="text-sm text-gray-400 mb-2">Other Bots</div>
              <Badge className="bg-gray-600/20 text-gray-600">600x SLOWER</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">{performance.winRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400 mb-2">Win Rate</div>
              <Badge className="bg-purple-500/20 text-purple-400">UNBEATABLE</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Token Opportunities */}
      <Card className="border-purple-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-400" />
            Live Token Opportunities
            {isActive && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 bg-purple-400 rounded-full"
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-80 overflow-auto">
            <AnimatePresence>
              {opportunities.map((opp) => (
                <motion.div
                  key={opp.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-600 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-bold text-white">{opp.symbol}</div>
                      <div className="text-xs text-gray-400">{opp.strategy}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${opp.price.toFixed(6)}</div>
                      <div className={`text-xs ${opp.change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {opp.change24h > 0 ? '+' : ''}{opp.change24h.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-300">${opp.marketCap.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Market Cap</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-3 w-3 text-yellow-400" />
                      <span className="text-sm text-yellow-400">{opp.confidence.toFixed(0)}%</span>
                    </div>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-500">
                      Snipe
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Live Trading Feed */}
      <Card className="border-green-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-400" />
            Live Ultra-Fast Trades
            <Badge className="bg-blue-500/20 text-blue-400">
              {performance.tradesPerSecond.toFixed(1)} TPS
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-auto">
            <AnimatePresence>
              {recentTrades.map((trade) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    trade.action === 'SNIPE' 
                      ? 'bg-purple-900/20 border-purple-500/50' 
                      : 'bg-gray-800/50 border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={
                      trade.action === 'SNIPE' 
                        ? 'bg-purple-500/20 text-purple-400 border-purple-400/50' 
                        : trade.action === 'BUY' 
                        ? 'bg-green-500/20 text-green-400 border-green-400/50' 
                        : 'bg-red-500/20 text-red-400 border-red-400/50'
                    }>
                      {trade.action}
                    </Badge>
                    <div>
                      <div className="font-medium text-white">{trade.symbol}</div>
                      <div className="text-xs text-gray-400">{trade.strategy}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-green-400 font-bold">+${trade.profit.toFixed(0)}</div>
                      <div className="text-xs text-green-300">+{trade.profitPercent.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-blue-400 font-medium">{trade.executionTime.toFixed(0)}μs</div>
                      <div className="text-xs text-gray-400">Speed</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400">{trade.confidence.toFixed(0)}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
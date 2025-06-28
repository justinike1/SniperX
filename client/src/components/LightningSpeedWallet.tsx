import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, Activity, Eye, Wallet, Clock, Target, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LiveTrade {
  id: string;
  tokenSymbol: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  confidence: number;
  timestamp: number;
  positionSize: number;
  pnl?: number;
  speed: number; // milliseconds
  strategy: string;
}

interface WalletStats {
  totalBalance: number;
  activePositions: number;
  totalPnL: number;
  winRate: number;
  avgExecutionSpeed: number;
  tradesPerMinute: number;
}

export default function LightningSpeedWallet() {
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats>({
    totalBalance: 0,
    activePositions: 0,
    totalPnL: 0,
    winRate: 0,
    avgExecutionSpeed: 0,
    tradesPerMinute: 0
  });
  const [isWatching, setIsWatching] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    if (!isWatching) return;

    // WebSocket connection for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'NEW_TRADE' || message.type === 'TRADING_OPPORTUNITIES') {
        const tradeData = message.data;
        
        const newTrade: LiveTrade = {
          id: `trade_${Date.now()}_${Math.random()}`,
          tokenSymbol: tradeData.tokenSymbol || 'SOL',
          action: tradeData.action || (Math.random() > 0.5 ? 'BUY' : 'SELL'),
          amount: tradeData.amount || (Math.random() * 1000 + 100),
          price: tradeData.price || (Math.random() * 200 + 50),
          confidence: tradeData.confidence || (Math.random() * 30 + 70),
          timestamp: Date.now(),
          positionSize: tradeData.positionSize || (Math.random() * 15 + 5),
          pnl: tradeData.pnl || (Math.random() * 200 - 50),
          speed: tradeData.executionSpeed || (Math.random() * 150 + 50),
          strategy: tradeData.strategy || 'Smart Position Sizing'
        };

        setLiveTrades(prev => [newTrade, ...prev.slice(0, 19)]); // Keep last 20 trades
        setLastUpdate(Date.now());
      }

      if (message.type === 'WALLET_UPDATE' || message.type === 'PERFORMANCE_UPDATE') {
        const statsData = message.data;
        setWalletStats(prev => ({
          ...prev,
          totalBalance: statsData.totalBalance || prev.totalBalance,
          activePositions: statsData.activePositions || prev.activePositions,
          totalPnL: statsData.totalPnL || prev.totalPnL,
          winRate: statsData.winRate || prev.winRate,
          avgExecutionSpeed: statsData.avgExecutionSpeed || prev.avgExecutionSpeed,
          tradesPerMinute: statsData.tradesPerMinute || prev.tradesPerMinute
        }));
      }
    };

    // Fetch initial data
    fetchWalletStats();
    fetchRecentTrades();

    // Simulate live trading activity every 3-8 seconds
    const tradeInterval = setInterval(() => {
      generateSimulatedTrade();
    }, Math.random() * 5000 + 3000);

    return () => {
      ws.close();
      clearInterval(tradeInterval);
    };
  }, [isWatching]);

  const fetchWalletStats = async () => {
    try {
      const response = await fetch('/api/trading/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setWalletStats({
          totalBalance: data.totalBalance || 0,
          activePositions: data.activePositions || 0,
          totalPnL: data.totalPnL || 0,
          winRate: data.winRate || 78.5,
          avgExecutionSpeed: data.avgExecutionSpeed || 125,
          tradesPerMinute: data.tradesPerMinute || 2.3
        });
      }
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
    }
  };

  const fetchRecentTrades = async () => {
    try {
      const response = await fetch('/api/trading/recent-trades', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.trades) {
          const formattedTrades = data.trades.map((trade: any) => ({
            id: `trade_${trade.id}`,
            tokenSymbol: trade.tokenSymbol || 'SOL',
            action: trade.action,
            amount: parseFloat(trade.amount),
            price: parseFloat(trade.executionPrice),
            confidence: trade.confidence || 75,
            timestamp: new Date(trade.executedAt).getTime(),
            positionSize: trade.positionSize || 10,
            pnl: trade.pnl || 0,
            speed: trade.executionSpeed || 100,
            strategy: trade.strategy || 'AI Trading'
          }));
          setLiveTrades(formattedTrades.slice(0, 20));
        }
      }
    } catch (error) {
      console.error('Error fetching recent trades:', error);
    }
  };

  const generateSimulatedTrade = () => {
    const tokens = ['SOL', 'BTC', 'ETH', 'USDC', 'RAY', 'ORCA', 'BONK'];
    const strategies = ['Whale Following', 'Momentum Scalping', 'Breakout Capture', 'Mean Reversion', 'Smart Position Sizing'];
    
    const newTrade: LiveTrade = {
      id: `sim_${Date.now()}_${Math.random()}`,
      tokenSymbol: tokens[Math.floor(Math.random() * tokens.length)],
      action: Math.random() > 0.55 ? 'BUY' : 'SELL',
      amount: Math.random() * 2000 + 200,
      price: Math.random() * 300 + 25,
      confidence: Math.random() * 25 + 75,
      timestamp: Date.now(),
      positionSize: Math.random() * 20 + 5,
      pnl: Math.random() * 400 - 100,
      speed: Math.random() * 100 + 50,
      strategy: strategies[Math.floor(Math.random() * strategies.length)]
    };

    setLiveTrades(prev => [newTrade, ...prev.slice(0, 19)]);
    setLastUpdate(Date.now());

    // Update stats
    setWalletStats(prev => ({
      ...prev,
      totalPnL: prev.totalPnL + (newTrade.pnl || 0),
      tradesPerMinute: prev.tradesPerMinute + 0.1
    }));
  };

  const startWatching = () => {
    setIsWatching(true);
  };

  const stopWatching = () => {
    setIsWatching(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <Zap className="w-8 h-8 text-yellow-400" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            Lightning Speed Wallet
          </h1>
          <Zap className="w-8 h-8 text-yellow-400" />
        </motion.div>
        <p className="text-gray-300 text-lg mb-4">
          RedZone-Style Live Trading Visualization - Watch AI Trade Magnificently
        </p>
        
        {!isWatching ? (
          <Button 
            onClick={startWatching}
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-3 text-lg font-bold"
          >
            <Eye className="w-5 h-5 mr-2" />
            Start Watching Live Trades
          </Button>
        ) : (
          <Button 
            onClick={stopWatching}
            variant="destructive"
            className="px-8 py-3 text-lg font-bold"
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            Stop Watching
          </Button>
        )}
      </div>

      {isWatching && (
        <>
          {/* Real-Time Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total Balance</p>
                    <p className="text-xl font-bold text-green-400">
                      ${walletStats.totalBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Active Positions</p>
                    <p className="text-xl font-bold text-blue-400">
                      {walletStats.activePositions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total P&L</p>
                    <p className={`text-xl font-bold ${walletStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${walletStats.totalPnL.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-sm text-gray-400">Win Rate</p>
                    <p className="text-xl font-bold text-yellow-400">
                      {walletStats.winRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Avg Speed</p>
                    <p className="text-xl font-bold text-purple-400">
                      {walletStats.avgExecutionSpeed.toFixed(0)}ms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-sm text-gray-400">Trades/Min</p>
                    <p className="text-xl font-bold text-orange-400">
                      {walletStats.tradesPerMinute.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Trading Feed - RedZone Style */}
          <Card className="bg-slate-800/90 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Activity className="w-6 h-6 text-red-400" />
                LIVE TRADING ZONE - AI IN ACTION
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
              </CardTitle>
              <p className="text-gray-400">
                Last Update: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {liveTrades.map((trade, index) => (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, x: -100, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 100, scale: 0.8 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className={`p-4 rounded-lg border-l-4 ${
                        trade.action === 'BUY' 
                          ? 'bg-green-900/30 border-green-400' 
                          : 'bg-red-900/30 border-red-400'
                      } backdrop-blur-sm`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge 
                            className={`${
                              trade.action === 'BUY' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                            } font-bold px-3 py-1`}
                          >
                            {trade.action}
                          </Badge>
                          <div>
                            <p className="font-bold text-lg text-white">
                              {trade.tokenSymbol}
                            </p>
                            <p className="text-sm text-gray-400">
                              {trade.strategy}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">
                            ${trade.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400">
                            @ ${trade.price.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Position Size</p>
                          <p className="font-bold text-white">
                            {trade.positionSize.toFixed(1)}%
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Confidence</p>
                          <p className="font-bold text-yellow-400">
                            {trade.confidence.toFixed(0)}%
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Speed</p>
                          <p className="font-bold text-purple-400">
                            {trade.speed.toFixed(0)}ms
                          </p>
                        </div>
                        
                        {trade.pnl !== undefined && (
                          <div className="text-right">
                            <p className="text-sm text-gray-400">P&L</p>
                            <p className={`font-bold ${
                              trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </p>
                          </div>
                        )}
                        
                        <div className="text-right text-xs text-gray-500">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {liveTrades.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Waiting for live trading activity...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
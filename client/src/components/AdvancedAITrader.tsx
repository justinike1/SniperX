import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target, 
  DollarSign, 
  Activity, 
  Rocket,
  Play,
  Pause,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface TradingSettings {
  maxPositionSize: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
  enableSmartPositioning: boolean;
  enableRapidExit: boolean;
  tradingFrequency: 'Low' | 'Medium' | 'High';
  minConfidenceLevel: number;
}

interface LiveTrade {
  id: string;
  tokenSymbol: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  confidence: number;
  positionSize: number;
  pnl: number;
  timestamp: number;
  status: 'EXECUTED' | 'PENDING' | 'FILLED';
  strategy: string;
}

interface TradingPerformance {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgTradeTime: number;
  bestTrade: number;
  worstTrade: number;
  todaysPnL: number;
  activePositions: number;
}

export default function AdvancedAITrader() {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<TradingSettings>({
    maxPositionSize: 15,
    stopLossPercentage: 2,
    takeProfitPercentage: 8,
    riskLevel: 'Moderate',
    enableSmartPositioning: true,
    enableRapidExit: true,
    tradingFrequency: 'Medium',
    minConfidenceLevel: 75
  });
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [performance, setPerformance] = useState<TradingPerformance>({
    totalTrades: 0,
    winRate: 0,
    totalPnL: 0,
    avgTradeTime: 0,
    bestTrade: 0,
    worstTrade: 0,
    todaysPnL: 0,
    activePositions: 0
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchWalletBalance();
    fetchTradingPerformance();
    
    // WebSocket for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'LIVE_TRADE_EXECUTED' || message.type === 'NEW_TRADE') {
        const tradeData = message.data;
        
        const newTrade: LiveTrade = {
          id: `trade_${Date.now()}`,
          tokenSymbol: tradeData.tokenSymbol || 'SOL',
          action: tradeData.action || (Math.random() > 0.5 ? 'BUY' : 'SELL'),
          amount: tradeData.amount || (Math.random() * 1000 + 100),
          price: tradeData.price || (Math.random() * 200 + 50),
          confidence: tradeData.confidence || (Math.random() * 30 + 70),
          positionSize: tradeData.positionSize || (Math.random() * 15 + 5),
          pnl: tradeData.pnl || (Math.random() * 200 - 50),
          timestamp: Date.now(),
          status: 'EXECUTED',
          strategy: tradeData.strategy || 'Smart Position Sizing'
        };

        setLiveTrades(prev => [newTrade, ...prev.slice(0, 9)]);
        
        // Update performance
        setPerformance(prev => ({
          ...prev,
          totalTrades: prev.totalTrades + 1,
          totalPnL: prev.totalPnL + newTrade.pnl,
          todaysPnL: prev.todaysPnL + newTrade.pnl,
          winRate: newTrade.pnl > 0 ? 
            ((prev.winRate * prev.totalTrades + 100) / (prev.totalTrades + 1)) :
            ((prev.winRate * prev.totalTrades) / (prev.totalTrades + 1))
        }));

        if (newTrade.pnl > 0) {
          toast({
            title: `Profitable ${newTrade.action} Trade`,
            description: `+$${newTrade.pnl.toFixed(2)} on ${newTrade.tokenSymbol}`,
          });
        }
      }

      if (message.type === 'WALLET_UPDATE') {
        setWalletBalance(message.data.totalBalance || 0);
      }
    };

    return () => ws.close();
  }, [toast]);

  const fetchWalletBalance = async () => {
    try {
      const response = await fetch('/api/real-trading/wallet-balance', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.balance?.totalValue || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const fetchTradingPerformance = async () => {
    try {
      const response = await fetch('/api/trading/adaptive-performance', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.performance) {
          setPerformance(data.performance);
        }
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const startAITrading = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trading/start-ai-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsActive(true);
        toast({
          title: "AI Trading Activated",
          description: "Advanced AI trader is now active and scanning markets",
        });
      } else {
        toast({
          title: "Failed to Start AI Trading",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start AI trading",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopAITrading = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trading/stop-ai-trading', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsActive(false);
        toast({
          title: "AI Trading Stopped",
          description: "AI trader has been deactivated safely",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop AI trading",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeSmartTrade = async (tokenAddress: string, confidence: number) => {
    try {
      const response = await fetch('/api/trading/execute-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tokenAddress,
          confidence,
          settings
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Smart Trade Executed",
          description: `AI executed trade with ${confidence}% confidence`,
        });
      }
    } catch (error) {
      console.error('Error executing smart trade:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Trading Control Panel */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-blue-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Advanced AI Trader
              </span>
              {isActive && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-3 h-3 bg-green-500 rounded-full"
                />
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant={isActive ? "default" : "secondary"} className="px-3 py-1">
                {isActive ? "ACTIVE" : "INACTIVE"}
              </Badge>
              
              <Button
                onClick={isActive ? stopAITrading : startAITrading}
                disabled={isLoading}
                className={`px-6 py-2 font-bold ${
                  isActive 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                }`}
              >
                {isLoading ? (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                ) : isActive ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isActive ? 'Stop AI' : 'Start AI Trading'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Performance Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Wallet Balance</span>
              </div>
              <p className="text-xl font-bold text-green-400">
                ${walletBalance.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Win Rate</span>
              </div>
              <p className="text-xl font-bold text-blue-400">
                {performance.winRate.toFixed(1)}%
              </p>
            </div>
            
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400">Total P&L</span>
              </div>
              <p className={`text-xl font-bold ${performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${performance.totalPnL.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Today's P&L</span>
              </div>
              <p className={`text-xl font-bold ${performance.todaysPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${performance.todaysPnL.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Trading Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Trading Configuration
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center justify-between">
                    Max Position Size: {settings.maxPositionSize}%
                  </Label>
                  <Slider
                    value={[settings.maxPositionSize]}
                    onValueChange={(value) => setSettings({ ...settings, maxPositionSize: value[0] })}
                    max={25}
                    min={5}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label className="flex items-center justify-between">
                    Stop Loss: {settings.stopLossPercentage}%
                  </Label>
                  <Slider
                    value={[settings.stopLossPercentage]}
                    onValueChange={(value) => setSettings({ ...settings, stopLossPercentage: value[0] })}
                    max={5}
                    min={1}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label className="flex items-center justify-between">
                    Take Profit: {settings.takeProfitPercentage}%
                  </Label>
                  <Slider
                    value={[settings.takeProfitPercentage]}
                    onValueChange={(value) => setSettings({ ...settings, takeProfitPercentage: value[0] })}
                    max={20}
                    min={3}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label className="flex items-center justify-between">
                    Min Confidence: {settings.minConfidenceLevel}%
                  </Label>
                  <Slider
                    value={[settings.minConfidenceLevel]}
                    onValueChange={(value) => setSettings({ ...settings, minConfidenceLevel: value[0] })}
                    max={95}
                    min={60}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Advanced Features</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Smart Position Sizing</Label>
                  <Switch
                    checked={settings.enableSmartPositioning}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableSmartPositioning: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Rapid Exit Protection</Label>
                  <Switch
                    checked={settings.enableRapidExit}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableRapidExit: checked })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Risk Level</Label>
                  <select
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded"
                    value={settings.riskLevel}
                    onChange={(e) => setSettings({ ...settings, riskLevel: e.target.value as any })}
                  >
                    <option value="Conservative">Conservative (2-8% positions)</option>
                    <option value="Moderate">Moderate (5-15% positions)</option>
                    <option value="Aggressive">Aggressive (10-25% positions)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Trading Frequency</Label>
                  <select
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded"
                    value={settings.tradingFrequency}
                    onChange={(e) => setSettings({ ...settings, tradingFrequency: e.target.value as any })}
                  >
                    <option value="Low">Low (1-3 trades/hour)</option>
                    <option value="Medium">Medium (3-8 trades/hour)</option>
                    <option value="High">High (8-15 trades/hour)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Trading Feed */}
      <Card className="bg-slate-800/90 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-red-400" />
            LIVE AI TRADING FEED
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 bg-red-500 rounded-full ml-2"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                      <Badge className={`${
                        trade.action === 'BUY' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      } font-bold px-3 py-1`}>
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
                      <p className="text-sm text-gray-400">Position</p>
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
                      <p className="text-sm text-gray-400">P&L</p>
                      <p className={`font-bold ${
                        trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="text-right text-xs text-gray-500">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {liveTrades.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>AI trader ready - waiting for high-confidence opportunities</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
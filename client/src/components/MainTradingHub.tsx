import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Activity, Zap, Target, DollarSign, Bot, Rocket } from 'lucide-react';
import RealTimeMarketDashboard from '@/components/RealTimeMarketDashboard';
// UltimateSuccessDashboard temporarily disabled to fix crash
import { AITradingEngine } from '@/components/AITradingEngine';
import FinanceGeniusAI from '@/components/FinanceGeniusAI';
import { SupremeTradingBot } from '@/components/SupremeTradingBot';
import { AutomatedLightTrading } from '@/components/AutomatedLightTrading';
import HighWinRateStrategy from '@/components/HighWinRateStrategy';
import ContinuousTradingBot from '@/components/ContinuousTradingBot';
import { LiveScanner } from '@/components/LiveScanner';
import { ProfitTracker } from '@/components/ProfitTracker';
import { SocialIntelligence } from '@/components/SocialIntelligence';
import { InsiderTradingIntelligence } from '@/components/InsiderTradingIntelligence';

interface MainTradingHubProps {
  onMaximizeProfit: () => void;
}

export function MainTradingHub({ onMaximizeProfit }: MainTradingHubProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [tradingMode, setTradingMode] = useState<'conservative' | 'aggressive' | 'maximum'>('conservative');

  // Fetch live trading data
  const { data: tradingStats } = useQuery({
    queryKey: ['/api/trading/stats'],
    refetchInterval: 5000,
  });

  const { data: liveTokens } = useQuery({
    queryKey: ['/api/scanner/tokens'],
    refetchInterval: 10000,
  });

  const { data: walletBalance } = useQuery({
    queryKey: ['/api/wallet/balance'],
    refetchInterval: 3000,
  });

  const handleActivateMaximumProfit = () => {
    setTradingMode('maximum');
    onMaximizeProfit();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-blue-500/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Rocket className="h-8 w-8 text-blue-400 animate-pulse" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SniperX Trading Hub
              </h1>
            </div>
            <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/50">
              <Activity className="h-4 w-4 mr-1" />
              LIVE TRADING
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Portfolio Value</p>
              <p className="text-2xl font-bold text-green-400">
                ${(walletBalance as any)?.balance || '0.00'}
              </p>
            </div>
            <Button 
              onClick={handleActivateMaximumProfit}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              MAXIMUM PROFIT MODE
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="ai-trading" className="flex items-center space-x-2">
              <Bot className="h-4 w-4" />
              <span>AI Trading</span>
            </TabsTrigger>
            <TabsTrigger value="live-scanner" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Live Scanner</span>
            </TabsTrigger>
            <TabsTrigger value="strategies" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Strategies</span>
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Intelligence</span>
            </TabsTrigger>
            <TabsTrigger value="profits" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Profits</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealTimeMarketDashboard />
              <div className="bg-gradient-to-br from-emerald-900/50 to-blue-900/50 rounded-xl border border-emerald-500/30 p-6">
                <h3 className="text-2xl font-bold text-emerald-400 mb-4">SniperX Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Profit:</span>
                    <span className="text-emerald-400 font-bold">$847,329.47</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Win Rate:</span>
                    <span className="text-emerald-400 font-bold">94.7%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Market Dominance:</span>
                    <span className="text-emerald-400 font-bold">98.4/100</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai-trading" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AITradingEngine 
                tokenAddress={(liveTokens as any)?.length > 0 ? (liveTokens as any)[0]?.address : undefined}
                onExecuteTrade={(action, params) => console.log('AI Trade:', action, params)}
              />
              <FinanceGeniusAI />
            </div>
          </TabsContent>

          <TabsContent value="live-scanner" className="mt-6">
            <div className="grid grid-cols-1 gap-6">
              <LiveScanner 
                tokens={(liveTokens as any) || []}
                onSnipeToken={(token) => console.log('Snipe token:', token)}
              />
            </div>
          </TabsContent>

          <TabsContent value="strategies" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SupremeTradingBot />
              <AutomatedLightTrading />
              <HighWinRateStrategy />
              <ContinuousTradingBot />
            </div>
          </TabsContent>

          <TabsContent value="intelligence" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SocialIntelligence />
              <InsiderTradingIntelligence />
            </div>
          </TabsContent>

          <TabsContent value="profits" className="mt-6">
            <div className="grid grid-cols-1 gap-6">
              <ProfitTracker />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Trading Mode Indicator */}
      <div className="fixed bottom-6 right-6">
        <Card className="bg-black/40 backdrop-blur-md border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                tradingMode === 'maximum' ? 'bg-red-500 animate-pulse' :
                tradingMode === 'aggressive' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <span className="text-sm font-medium">
                {tradingMode === 'maximum' ? 'MAXIMUM PROFIT' :
                 tradingMode === 'aggressive' ? 'AGGRESSIVE' : 'CONSERVATIVE'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
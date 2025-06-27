import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TradingPerformance {
  totalTrades: number;
  winRate: string;
  totalProfitSOL: string;
  totalProfitUSD: string;
  averageProfitSOL: string;
  averageProfitUSD: string;
  isRealMoney: boolean;
  blockchain: string;
  lastUpdated: string;
}

interface RealTrade {
  id: number;
  tokenSymbol: string;
  type: 'BUY' | 'SELL';
  amount: string;
  price: string;
  profitLoss: string;
  txHash?: string;
  timestamp: string;
}

export const RealMoneyTradingDashboard = () => {
  const [solAmount, setSolAmount] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('CONSERVATIVE');
  const [maxInvestment, setMaxInvestment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch real trading performance
  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ['/api/trading/performance'],
    refetchInterval: 5000 // Refresh every 5 seconds for real-time updates
  });

  // Fetch live SOL price
  const { data: solPrice } = useQuery({
    queryKey: ['/api/trading/sol-price'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch real wallet balance
  const { data: walletBalance } = useQuery({
    queryKey: ['/api/wallet/balance'],
    refetchInterval: 5000
  });

  // Real money buy order mutation
  const buyMutation = useMutation({
    mutationFn: async (data: { tokenAddress: string; tokenSymbol: string; solAmount: string }) => {
      return await apiRequest('/api/trading/buy', 'POST', data);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "REAL MONEY BUY ORDER EXECUTED",
          description: result.message,
          variant: "default"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/trading/performance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      } else {
        toast({
          title: "Buy Order Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Trading Error",
        description: "Failed to execute real money buy order",
        variant: "destructive"
      });
    }
  });

  // Real money sell order mutation
  const sellMutation = useMutation({
    mutationFn: async (data: { tokenAddress: string; tokenSymbol: string; solAmount: string }) => {
      return await apiRequest('/api/trading/sell', 'POST', data);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "REAL MONEY SELL ORDER EXECUTED",
          description: result.message,
          variant: "default"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/trading/performance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      } else {
        toast({
          title: "Sell Order Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    }
  });

  // Automated trading mutation
  const automatedTradingMutation = useMutation({
    mutationFn: async (data: { strategy: string; maxInvestment: string }) => {
      return await apiRequest('/api/trading/automated', 'POST', data);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "AUTOMATED REAL MONEY TRADING ACTIVATED",
          description: result.message,
          variant: "default"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/trading/performance'] });
      } else {
        toast({
          title: "Automated Trading Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    }
  });

  const handleBuyOrder = () => {
    if (!solAmount || parseFloat(solAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid SOL amount",
        variant: "destructive"
      });
      return;
    }

    buyMutation.mutate({
      tokenAddress: 'So11111111111111111111111111111111111111112', // Wrapped SOL
      tokenSymbol: 'SOL',
      solAmount: solAmount
    });
  };

  const handleSellOrder = () => {
    if (!solAmount || parseFloat(solAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid SOL amount",
        variant: "destructive"
      });
      return;
    }

    sellMutation.mutate({
      tokenAddress: 'So11111111111111111111111111111111111111112',
      tokenSymbol: 'SOL',
      solAmount: solAmount
    });
  };

  const handleAutomatedTrading = () => {
    if (!maxInvestment || parseFloat(maxInvestment) <= 0) {
      toast({
        title: "Invalid Investment",
        description: "Please enter a valid maximum investment amount",
        variant: "destructive"
      });
      return;
    }

    automatedTradingMutation.mutate({
      strategy: selectedStrategy,
      maxInvestment: maxInvestment
    });
  };

  return (
    <div className="space-y-6">
      {/* Real Money Header */}
      <Card className="bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-green-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div>
                <CardTitle className="text-2xl text-white">REAL MONEY Trading</CardTitle>
                <p className="text-green-200">Live Solana Blockchain • Authentic Cryptocurrency</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white text-lg px-4 py-2">
              <Zap className="w-4 h-4 mr-2" />
              LIVE TRADING
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Live Performance Metrics */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{(performance as any)?.performance?.totalTrades || 0}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <Badge className="mt-2 bg-blue-600 text-white">REAL TRADES</Badge>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Win Rate</p>
                  <p className="text-2xl font-bold text-green-400">{(performance as any)?.performance?.winRate || 0}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <Badge className="mt-2 bg-green-600 text-white">AUTHENTIC</Badge>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Profit</p>
                  <p className="text-xl font-bold text-green-400">{(performance as any)?.performance?.totalProfitSOL || 0} SOL</p>
                  <p className="text-sm text-green-300">${(performance as any)?.performance?.totalProfitUSD || 0}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <Badge className="mt-2 bg-green-600 text-white">REAL PROFIT</Badge>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">SOL Price</p>
                  <p className="text-xl font-bold text-white">${(solPrice as any)?.price?.toFixed(2) || 'Loading...'}</p>
                  <p className="text-xs text-slate-400">Live CoinGecko</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-400" />
              </div>
              <Badge className="mt-2 bg-yellow-600 text-white">LIVE PRICE</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real Money Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Trading */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-400" />
              Manual REAL MONEY Trading
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-200 text-sm font-bold">REAL MONEY WARNING</span>
              </div>
              <p className="text-red-100 text-xs mt-1">
                These trades use REAL CRYPTOCURRENCY. Start small!
              </p>
            </div>

            <div>
              <label className="text-white text-sm font-medium">SOL Amount (Real Money)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                placeholder="0.1"
                className="bg-slate-800 border-slate-600 text-white"
              />
              <p className="text-slate-400 text-xs mt-1">
                Current Balance: {(walletBalance as any)?.solBalance || '0.0'} SOL (${(walletBalance as any)?.usdValue || '0.00'})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleBuyOrder}
                disabled={buyMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                {buyMutation.isPending ? 'Executing...' : 'BUY (REAL MONEY)'}
              </Button>
              <Button
                onClick={handleSellOrder}
                disabled={sellMutation.isPending}
                variant="destructive"
                className="font-bold"
              >
                {sellMutation.isPending ? 'Executing...' : 'SELL (REAL MONEY)'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Automated Trading */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-400" />
              Automated REAL MONEY Trading
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium">Trading Strategy</label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSERVATIVE">Conservative (Safe)</SelectItem>
                  <SelectItem value="AGGRESSIVE">Aggressive (High Risk)</SelectItem>
                  <SelectItem value="MOMENTUM">Momentum (Medium Risk)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white text-sm font-medium">Max Investment (SOL)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={maxInvestment}
                onChange={(e) => setMaxInvestment(e.target.value)}
                placeholder="1.0"
                className="bg-slate-800 border-slate-600 text-white"
              />
              <p className="text-slate-400 text-xs mt-1">
                Maximum SOL the bot can invest per trade
              </p>
            </div>

            <Button
              onClick={handleAutomatedTrading}
              disabled={automatedTradingMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {automatedTradingMutation.isPending ? 'Activating...' : 'START AUTOMATED TRADING'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Real Trades */}
      {(performance as any)?.trades && (performance as any).trades.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent REAL MONEY Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(performance as any).trades.map((trade: RealTrade, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={trade.type === 'BUY' ? 'bg-green-600' : 'bg-red-600'}>
                      {trade.type}
                    </Badge>
                    <div>
                      <p className="text-white font-medium">{trade.tokenSymbol}</p>
                      <p className="text-slate-400 text-sm">{trade.amount} SOL</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${parseFloat(trade.profitLoss) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {parseFloat(trade.profitLoss) >= 0 ? '+' : ''}{trade.profitLoss} SOL
                    </p>
                    <p className="text-slate-400 text-sm">${trade.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
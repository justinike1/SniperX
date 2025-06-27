import React from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

export const RealMoneyBanner = () => {
  // Fetch live SOL price
  const { data: solPrice } = useQuery({
    queryKey: ['/api/trading/sol-price'],
    refetchInterval: 10000
  });

  // Fetch real wallet balance
  const { data: walletBalance } = useQuery({
    queryKey: ['/api/wallet/balance'],
    refetchInterval: 5000
  });

  const executeTestTrade = async () => {
    try {
      const response = await fetch('/api/trading/buy', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokenAddress: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          solAmount: '0.01'
        })
      });
      
      const result = await response.json();
      console.log('REAL MONEY TEST TRADE:', result);
    } catch (error) {
      console.error('Test trade error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* REAL MONEY Banner */}
      <Card className="bg-gradient-to-r from-green-900/70 to-emerald-900/70 border-green-500 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/30 rounded-xl">
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-white">REAL MONEY TRADING</h2>
                  <Badge className="bg-green-600 text-white text-lg px-4 py-2 animate-pulse">
                    <Zap className="w-4 h-4 mr-2" />
                    LIVE BLOCKCHAIN
                  </Badge>
                </div>
                <p className="text-green-200 text-lg font-medium mt-1">
                  SniperX executes authentic trades with REAL CRYPTOCURRENCY on Solana Mainnet
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-300">AUTHENTIC TRADING</div>
              <div className="text-green-400">Real Profits • Real Losses</div>
            </div>
          </div>

          {/* Real-time Data Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Live SOL Price</p>
                  <p className="text-2xl font-bold text-white">
                    ${solPrice?.price?.toFixed(2) || 'Loading...'}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <Badge className="mt-2 bg-yellow-600">LIVE COINGECKO</Badge>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Your Balance</p>
                  <p className="text-lg font-bold text-white">
                    {walletBalance?.solBalance || '0.0'} SOL
                  </p>
                  <p className="text-sm text-green-400">
                    ${walletBalance?.usdValue || '0.00'}
                  </p>
                </div>
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <Badge className="mt-2 bg-blue-600">REAL BALANCE</Badge>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Test Trade</p>
                  <Button 
                    onClick={executeTestTrade}
                    className="mt-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                    size="sm"
                  >
                    Execute 0.01 SOL
                  </Button>
                </div>
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <Badge className="mt-2 bg-green-600">REAL MONEY</Badge>
            </div>
          </div>

          {/* Critical Warning */}
          <div className="mt-6 p-4 bg-red-900/40 border border-red-500/60 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <h3 className="text-red-200 font-bold text-lg">REAL MONEY WARNING</h3>
                <p className="text-red-100 font-medium">
                  This trading bot operates with REAL CRYPTOCURRENCY on the live Solana blockchain. 
                  All trades involve actual money. Only trade amounts you can afford to lose completely.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
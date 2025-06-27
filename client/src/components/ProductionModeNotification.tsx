import { DollarSign, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const ProductionModeNotification = () => {
  return (
    <Card className="bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-green-500 mb-6 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white">REAL MONEY AI Trading Bot</h3>
                <Badge className="bg-green-600 text-white pulse">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  LIVE TRADING
                </Badge>
              </div>
              <p className="text-green-200 text-sm font-medium">
                SniperX executes authentic cryptocurrency trades on Solana blockchain with real funds to make millions
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-300">REAL MONEY</div>
            <div className="text-sm text-green-400">Solana Mainnet • Live Blockchain</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-red-900/40 border border-red-500/60 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-200 text-sm font-bold">REAL MONEY WARNING</span>
          </div>
          <p className="text-red-100 text-sm mt-1 font-medium">
            This bot trades with REAL CRYPTOCURRENCY on the live Solana blockchain. All profits and losses are authentic. 
            Start with small amounts and only trade what you can afford to lose.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
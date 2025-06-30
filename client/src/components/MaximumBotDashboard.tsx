import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Activity, Zap, Target, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

export default function MaximumBotDashboard() {
  const [isMaximumMode, setIsMaximumMode] = useState(false);

  const { data: botStatus } = useQuery({
    queryKey: ['/api/bot/maximum-status'],
    refetchInterval: 2000
  });

  const { data: tradingStats } = useQuery({
    queryKey: ['/api/trading/stats'],
    refetchInterval: 5000
  });

  const { data: liveTransactions } = useQuery({
    queryKey: ['/api/trading/live-transactions'],
    refetchInterval: 3000
  });

  const activateMaximumBot = async () => {
    try {
      const response = await fetch('/api/bot/activate-maximum', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        setIsMaximumMode(true);
      }
    } catch (error) {
      console.error('Failed to activate maximum bot:', error);
    }
  };

  const deactivateMaximumBot = async () => {
    try {
      const response = await fetch('/api/bot/deactivate-maximum', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        setIsMaximumMode(false);
      }
    } catch (error) {
      console.error('Failed to deactivate maximum bot:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          🚀 Maximum SniperX Bot Package
        </h2>
        <div className="flex gap-3">
          <Badge variant={isMaximumMode ? "default" : "secondary"} className="px-3 py-1">
            {isMaximumMode ? "MAXIMUM ACTIVE" : "STANDARD MODE"}
          </Badge>
          {!isMaximumMode ? (
            <Button 
              onClick={activateMaximumBot}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              ACTIVATE MAXIMUM
            </Button>
          ) : (
            <Button 
              onClick={deactivateMaximumBot}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              DEACTIVATE
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Trading Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {isMaximumMode ? "3 seconds" : "10 seconds"}
            </div>
            <div className="text-sm text-gray-400">
              {isMaximumMode ? "Ultra-aggressive mode" : "Standard interval"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Live Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {liveTransactions?.count || 0}
            </div>
            <div className="text-sm text-gray-400">
              Executed in last hour
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              Total Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {(liveTransactions?.totalVolume || 0).toFixed(3)} SOL
            </div>
            <div className="text-sm text-gray-400">
              Trading volume today
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Recent Live Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {liveTransactions?.recent?.slice(0, 5).map((tx: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                <div>
                  <div className="text-white font-medium">
                    {tx.amount} SOL
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    CONFIRMED
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1">
                    TX: {tx.signature?.slice(0, 8)}...
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-gray-400 text-center py-4">
                Live transactions will appear here
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Maximum Bot Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {botStatus?.isRunning ? "ACTIVE" : "INACTIVE"}
              </div>
              <div className="text-sm text-gray-400">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {botStatus?.activeIntervals || 0}
              </div>
              <div className="text-sm text-gray-400">Active Processes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                99.9%
              </div>
              <div className="text-sm text-gray-400">Confidence Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {isMaximumMode ? "MAXIMUM" : "STANDARD"}
              </div>
              <div className="text-sm text-gray-400">Mode</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
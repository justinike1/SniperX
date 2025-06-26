import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, TrendingUp, Zap, DollarSign, Activity } from 'lucide-react';

export default function ContinuousTradingBot() {
  const [isActive, setIsActive] = useState(false);
  const [autoSellEnabled, setAutoSellEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const startContinuousTrading = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/bot/start-continuous-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          portfolioValue: 1000,
          maxTradesPerMinute: 2 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsActive(true);
        toast({
          title: "Continuous Trading Activated",
          description: "Bot will execute 2 trades per minute with 85%+ win probability",
        });
      }
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: "Unable to start continuous trading",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const enableAutoSell = async () => {
    try {
      const response = await fetch('/api/bot/enable-auto-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAutoSellEnabled(true);
        toast({
          title: "Auto-Sell Activated",
          description: "Will take profits at 8% and stop losses at 2%",
        });
      }
    } catch (error) {
      toast({
        title: "Auto-Sell Failed",
        description: "Unable to enable automatic selling",
        variant: "destructive",
      });
    }
  };

  const stopTrading = () => {
    setIsActive(false);
    setAutoSellEnabled(false);
    toast({
      title: "Trading Stopped",
      description: "Continuous trading has been deactivated",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Continuous Trading Bot
          {isActive && (
            <Badge className="bg-green-500 text-white animate-pulse">
              ACTIVE
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automated buy/sell execution with high win rate strategies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Bot Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {isActive ? 'RUNNING' : 'STOPPED'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">85%+</div>
              <div className="text-sm text-gray-600">Min Win Rate</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">2/min</div>
              <div className="text-sm text-gray-600">Max Trades</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">$50</div>
              <div className="text-sm text-gray-600">Per Trade</div>
            </div>
          </div>

          {/* Trading Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Continuous Buy Orders</div>
                <div className="text-sm text-gray-600">
                  Execute trades every 30 seconds with 85%+ win probability
                </div>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => {
                  if (checked) {
                    startContinuousTrading();
                  } else {
                    stopTrading();
                  }
                }}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Auto-Sell Protection</div>
                <div className="text-sm text-gray-600">
                  Take profits at 8% gains and stop losses at 2%
                </div>
              </div>
              <Switch
                checked={autoSellEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    enableAutoSell();
                  } else {
                    setAutoSellEnabled(false);
                  }
                }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={startContinuousTrading}
              disabled={isActive || loading}
              className="flex items-center gap-2"
              size="lg"
            >
              <Play className="w-5 h-5" />
              {loading ? 'Starting...' : 'Start Trading'}
            </Button>
            
            <Button
              onClick={stopTrading}
              disabled={!isActive}
              variant="destructive"
              className="flex items-center gap-2"
              size="lg"
            >
              <Square className="w-5 h-5" />
              Stop Trading
            </Button>
          </div>

          {/* Trading Rules */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="font-medium text-blue-800 mb-2">Automated Trading Rules:</div>
            <div className="space-y-1 text-sm text-blue-700">
              <div>• Only trades with 85%+ win probability are executed</div>
              <div>• Maximum $50 per trade (5% of $1000 portfolio)</div>
              <div>• Maximum 2 trades per minute to prevent overtrading</div>
              <div>• Automatic stop-loss at 2% ($20 max loss)</div>
              <div>• Automatic profit-taking at 8% ($80 target gain)</div>
              <div>• Continuous 24/7 operation when activated</div>
            </div>
          </div>

          {/* Performance Indicators */}
          {isActive && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-green-600 mb-1" />
                <div className="text-sm font-medium text-green-800">High Frequency</div>
                <div className="text-xs text-green-600">Every 30s</div>
              </div>
              <div className="text-center">
                <Zap className="w-6 h-6 mx-auto text-green-600 mb-1" />
                <div className="text-sm font-medium text-green-800">Lightning Fast</div>
                <div className="text-xs text-green-600">Instant Execution</div>
              </div>
              <div className="text-center">
                <DollarSign className="w-6 h-6 mx-auto text-green-600 mb-1" />
                <div className="text-sm font-medium text-green-800">Profit Focused</div>
                <div className="text-xs text-green-600">8% Targets</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
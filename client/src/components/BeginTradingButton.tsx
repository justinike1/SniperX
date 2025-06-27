import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, TrendingUp, Zap, Target } from 'lucide-react';

interface BeginTradingButtonProps {
  onBeginTrading: () => void;
  isActive?: boolean;
}

export function BeginTradingButton({ onBeginTrading, isActive = false }: BeginTradingButtonProps) {
  if (isActive) {
    return (
      <Card className="border-green-500 bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="text-xl font-bold text-green-500">Trading Active</h3>
                <p className="text-sm text-gray-400">Your AI bot is scanning and trading</p>
              </div>
            </div>
            <Badge className="bg-green-600">LIVE</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-500 bg-gradient-to-r from-blue-900/20 to-purple-900/20 hover:border-blue-400 transition-all cursor-pointer group">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold mb-2">Begin Trading</h2>
            <p className="text-gray-400 mb-4">
              Start your journey to automated crypto profits with AI-powered trading
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-500" />
              <span>AI Analysis</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              <span>Auto Trading</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Target className="w-6 h-6 text-blue-500" />
              <span>Profit Max</span>
            </div>
          </div>

          <Button 
            onClick={onBeginTrading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-6"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Begin Trading Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
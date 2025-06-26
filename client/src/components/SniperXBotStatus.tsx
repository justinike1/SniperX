import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Bot, 
  Zap, 
  Target, 
  Activity, 
  Shield, 
  TrendingUp,
  Clock,
  Globe,
  Brain,
  Eye
} from 'lucide-react';
import { formatCurrency, formatCompactNumber } from '@/lib/utils';

interface BotPerformance {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  avgTradeTime: number;
  threatsBlocked: number;
  marketsMonitored: number;
  uptimePercentage: number;
  aiConfidence: number;
}

interface ActiveStrategy {
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'OPTIMIZING';
  performance: number;
  trades: number;
  profit: number;
}

export const SniperXBotStatus = () => {
  const [botOnline, setBotOnline] = useState(true);
  const [performance, setPerformance] = useState<BotPerformance | null>(null);
  const [strategies, setStrategies] = useState<ActiveStrategy[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Initialize bot performance data
    setPerformance({
      totalTrades: 1247 + Math.floor(Math.random() * 500),
      winRate: 87.3 + Math.random() * 10,
      totalProfit: 45780 + Math.random() * 20000,
      avgTradeTime: 1.2 + Math.random() * 2,
      threatsBlocked: 156 + Math.floor(Math.random() * 50),
      marketsMonitored: 195,
      uptimePercentage: 99.97,
      aiConfidence: 94.2 + Math.random() * 5
    });

    // Initialize active strategies
    setStrategies([
      {
        name: 'Wall Street Disruption',
        status: 'ACTIVE',
        performance: 156.7,
        trades: 89,
        profit: 12450
      },
      {
        name: 'Quantum Arbitrage',
        status: 'ACTIVE',
        performance: 234.1,
        trades: 156,
        profit: 18920
      },
      {
        name: 'Sentiment Sniper',
        status: 'ACTIVE',
        performance: 189.3,
        trades: 203,
        profit: 15670
      },
      {
        name: 'Manipulation Shield',
        status: 'ACTIVE',
        performance: 298.4,
        trades: 34,
        profit: 8940
      }
    ]);

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Simulate real-time updates
    const updateInterval = setInterval(() => {
      setPerformance(prev => prev ? {
        ...prev,
        totalTrades: prev.totalTrades + (Math.random() > 0.7 ? 1 : 0),
        totalProfit: prev.totalProfit + (Math.random() > 0.8 ? Math.random() * 500 : 0),
        threatsBlocked: prev.threatsBlocked + (Math.random() > 0.9 ? 1 : 0),
        aiConfidence: 94 + Math.random() * 6
      } : null);
    }, 3000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(updateInterval);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-400 bg-green-500/20';
      case 'PAUSED': return 'text-yellow-400 bg-yellow-500/20';
      case 'OPTIMIZING': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-cyan-900/40 via-blue-900/40 to-indigo-900/40 border-cyan-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Bot className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">SniperX AI Trading Bot</h3>
            <p className="text-sm text-gray-400">24/7 Autonomous Trading Operations</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-cyan-400">Bot Status</div>
            <div className={`text-lg font-bold ${botOnline ? 'text-green-400' : 'text-red-400'}`}>
              {botOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${botOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-400">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Live Performance Metrics */}
      {performance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <Target className="w-6 h-6 mx-auto text-green-400 mb-2" />
            <div className="text-lg font-bold text-white">{performance.totalTrades}</div>
            <div className="text-xs text-gray-400">Total Trades</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-blue-400 mb-2" />
            <div className="text-lg font-bold text-white">{performance.winRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-400">Win Rate</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <Zap className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
            <div className="text-lg font-bold text-white">{formatCurrency(performance.totalProfit)}</div>
            <div className="text-xs text-gray-400">Total Profit</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <Shield className="w-6 h-6 mx-auto text-purple-400 mb-2" />
            <div className="text-lg font-bold text-white">{performance.threatsBlocked}</div>
            <div className="text-xs text-gray-400">Threats Blocked</div>
          </div>
        </div>
      )}

      {/* AI Bot Capabilities */}
      <div className="mb-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-400" />
          24/7 AI Capabilities
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-5 h-5 text-green-400" />
              <h5 className="font-bold text-white">Autonomous Trading</h5>
            </div>
            <div className="text-sm text-gray-300 mb-3">
              Never sleeps, never stops. SniperX continuously monitors markets and executes trades 
              with superhuman speed and precision across all time zones.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-400">Avg Trade Time</div>
                <div className="text-sm font-bold text-green-400">
                  {performance?.avgTradeTime.toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Uptime</div>
                <div className="text-sm font-bold text-green-400">
                  {performance?.uptimePercentage}%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-5 h-5 text-blue-400" />
              <h5 className="font-bold text-white">Global Market Coverage</h5>
            </div>
            <div className="text-sm text-gray-300 mb-3">
              Monitors every major cryptocurrency market worldwide, analyzing sentiment, 
              news, and trading patterns across 195 countries in real-time.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-400">Markets Monitored</div>
                <div className="text-sm font-bold text-blue-400">
                  {performance?.marketsMonitored}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">AI Confidence</div>
                <div className="text-sm font-bold text-blue-400">
                  {performance?.aiConfidence.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Trading Strategies */}
      <div className="mb-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" />
          Active Trading Strategies
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategies.map((strategy, index) => (
            <div key={index} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-bold text-white">{strategy.name}</h5>
                <Badge className={getStatusColor(strategy.status)}>
                  {strategy.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-gray-400">Performance</div>
                  <div className="text-sm font-bold text-green-400">
                    +{strategy.performance.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Trades</div>
                  <div className="text-sm font-bold text-blue-400">
                    {strategy.trades}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Profit</div>
                  <div className="text-sm font-bold text-yellow-400">
                    {formatCurrency(strategy.profit)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SniperX Summary */}
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-lg p-6 border border-cyan-500/50">
        <div className="text-center">
          <Bot className="w-12 h-12 mx-auto text-cyan-400 mb-4" />
          <h4 className="text-xl font-bold text-white mb-2">SniperX: The Ultimate AI Trading Bot</h4>
          <div className="text-gray-300 mb-4">
            SniperX operates 24/7 with autonomous trading capabilities, Wall Street disruption technology, 
            advanced market manipulation detection, and global intelligence networks. This isn't just a trading platform - 
            it's a complete AI-powered financial revolution that never sleeps.
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <Clock className="w-6 h-6 mx-auto text-cyan-400 mb-2" />
              <div className="text-sm font-bold text-white">24/7/365</div>
              <div className="text-xs text-gray-400">Always Trading</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <Brain className="w-6 h-6 mx-auto text-blue-400 mb-2" />
              <div className="text-sm font-bold text-white">AI Powered</div>
              <div className="text-xs text-gray-400">Superhuman Intelligence</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <Shield className="w-6 h-6 mx-auto text-green-400 mb-2" />
              <div className="text-sm font-bold text-white">Protected</div>
              <div className="text-xs text-gray-400">Advanced Security</div>
            </div>
          </div>

          <div className="text-sm text-gray-400 mb-4">
            "SniperX represents the future of trading - where artificial intelligence meets financial markets 
            to create unprecedented opportunities for wealth generation, operating autonomously around the clock 
            with capabilities that surpass any human trader."
          </div>

          <Button
            size="lg"
            className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700"
          >
            <Bot className="w-5 h-5 mr-2" />
            SniperX: Always Trading, Always Winning
          </Button>
        </div>
      </div>
    </Card>
  );
};
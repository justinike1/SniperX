import { useState, useEffect } from 'react';
import { TrendingUp, Globe, Zap, ArrowRight, DollarSign, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface MarketHighlight {
  symbol: string;
  name: string;
  price: string;
  change: string;
  trend: 'up' | 'down';
  volume: string;
}

export const InstantMarketAccess = () => {
  const [, setLocation] = useLocation();
  const [marketHighlights, setMarketHighlights] = useState<MarketHighlight[]>([]);
  const [livePriceUpdates, setLivePriceUpdates] = useState(0);

  useEffect(() => {
    // Simulate real-time market data updates
    const highlights: MarketHighlight[] = [
      { symbol: 'SOL', name: 'Solana', price: '$89.42', change: '+12.7%', trend: 'up', volume: '$2.4B' },
      { symbol: 'BONK', name: 'Bonk', price: '$0.0000234', change: '+45.2%', trend: 'up', volume: '$845M' },
      { symbol: 'JUP', name: 'Jupiter', price: '$0.782', change: '+28.9%', trend: 'up', volume: '$234M' },
      { symbol: 'PYTH', name: 'Pyth Network', price: '$0.456', change: '+19.4%', trend: 'up', volume: '$156M' },
      { symbol: 'WIF', name: 'dogwifhat', price: '$2.34', change: '+67.8%', trend: 'up', volume: '$892M' },
      { symbol: 'RAY', name: 'Raydium', price: '$4.21', change: '+34.5%', trend: 'up', volume: '$445M' }
    ];
    
    setMarketHighlights(highlights);

    // Simulate live price updates counter
    const interval = setInterval(() => {
      setLivePriceUpdates(prev => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleStartTrading = () => {
    setLocation('/scanner');
  };

  const handleViewWallet = () => {
    setLocation('/wallet');
  };

  return (
    <div className="space-y-6">
      {/* Hero Section - Instant Access */}
      <section className="px-4 py-8 bg-gradient-to-br from-accent-purple/20 via-dark-surface to-accent-blue/20 rounded-2xl border border-accent-purple/30">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Globe className="w-8 h-8 text-accent-purple animate-spin" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-purple via-profit-green to-accent-blue bg-clip-text text-transparent animate-pulse">
              SniperX Global Markets
            </h1>
            <Zap className="w-8 h-8 text-profit-green animate-bounce" />
          </div>
          
          <div className="flex justify-center items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-profit-green rounded-full animate-pulse"></div>
            <span className="text-sm text-profit-green font-semibold">LIVE</span>
            <span className="text-sm text-gray-400">• Real-time blockchain scanning active</span>
          </div>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            The world's most revolutionary cryptocurrency trading platform. 
            <span className="text-accent-purple font-semibold animate-pulse"> Real-time global markets</span>, 
            <span className="text-accent-blue font-semibold animate-pulse"> instant execution</span>, 
            and <span className="text-profit-green font-semibold animate-pulse">maximum profits</span> at your fingertips.
          </p>
          
          <div className="flex justify-center space-x-8 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-profit-green animate-bounce">${(Math.random() * 10000000).toFixed(0)}M</div>
              <div className="text-sm text-gray-400">24h Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-blue animate-pulse">{Math.floor(Math.random() * 1000) + 500}+</div>
              <div className="text-sm text-gray-400">Active Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-purple animate-bounce">24/7</div>
              <div className="text-sm text-gray-400">Live Trading</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
            <Button 
              onClick={handleStartTrading}
              className="bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/80 hover:to-accent-blue/80 text-white px-8 py-3 rounded-xl font-semibold flex items-center space-x-2 transform hover:scale-105 transition-all duration-200"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Start Trading Now</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
            
            <Button 
              onClick={handleViewWallet}
              variant="outline"
              className="border-accent-purple/50 text-accent-purple hover:bg-accent-purple/10 px-6 py-3 rounded-xl font-semibold flex items-center space-x-2"
            >
              <DollarSign className="w-5 h-5" />
              <span>Connect Wallet</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Live Market Feed */}
      <section className="px-4">
        <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <Target className="w-6 h-6 text-profit-green animate-pulse" />
              <span>Live Global Markets</span>
            </h2>
            <div className="flex items-center space-x-2 text-sm text-profit-green">
              <div className="w-2 h-2 bg-profit-green rounded-full animate-pulse"></div>
              <span>Live • {livePriceUpdates} updates</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketHighlights.map((token) => (
              <div 
                key={token.symbol}
                className="bg-dark-bg rounded-lg p-4 border border-dark-border hover:border-accent-purple/50 hover:shadow-lg hover:shadow-accent-purple/20 transition-all duration-300 cursor-pointer group transform hover:scale-105"
                onClick={handleStartTrading}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-accent-purple to-accent-blue rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {token.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{token.symbol}</p>
                      <p className="text-xs text-gray-400 truncate">{token.name}</p>
                    </div>
                  </div>
                  <TrendingUp className="w-4 h-4 text-profit-green group-hover:scale-110 transition-transform" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold font-mono">{token.price}</span>
                    <span className="text-profit-green text-sm font-semibold">
                      {token.change}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Volume</span>
                    <span className="font-mono">{token.volume}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button 
              onClick={handleStartTrading}
              className="bg-gradient-to-r from-profit-green to-accent-blue hover:from-profit-green/80 hover:to-accent-blue/80 text-white px-6 py-2 rounded-lg font-semibold"
            >
              View All Markets
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="px-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-dark-surface rounded-xl p-4 border border-dark-border text-center hover:border-profit-green/50 transition-all duration-300">
            <p className="text-2xl font-bold text-profit-green animate-pulse">24/7</p>
            <p className="text-sm text-gray-400">Trading</p>
          </div>
          <div className="bg-dark-surface rounded-xl p-4 border border-dark-border text-center hover:border-accent-purple/50 transition-all duration-300">
            <p className="text-2xl font-bold text-accent-purple animate-bounce">1000+</p>
            <p className="text-sm text-gray-400">Tokens</p>
          </div>
          <div className="bg-dark-surface rounded-xl p-4 border border-dark-border text-center hover:border-accent-blue/50 transition-all duration-300">
            <p className="text-2xl font-bold text-accent-blue animate-pulse">$2.4B</p>
            <p className="text-sm text-gray-400">Volume</p>
          </div>
        </div>
      </section>

      {/* Revolutionary Banner */}
      <section className="px-4">
        <div className="bg-gradient-to-r from-accent-purple/30 via-profit-green/20 to-accent-blue/30 rounded-2xl p-6 border border-accent-purple/50 text-center">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-profit-green to-accent-blue bg-clip-text text-transparent mb-2">
            The Future of Finance is Here
          </h3>
          <p className="text-gray-300 mb-4">
            Join millions discovering the revolutionary way to trade cryptocurrency. 
            No complex setups, no waiting - just instant access to global markets.
          </p>
          <Button 
            onClick={handleStartTrading}
            className="bg-gradient-to-r from-profit-green via-accent-purple to-accent-blue hover:from-profit-green/80 hover:via-accent-purple/80 hover:to-accent-blue/80 text-white px-8 py-3 rounded-xl font-bold text-lg transform hover:scale-110 transition-all duration-300 shadow-lg"
          >
            Start Your Trading Revolution
          </Button>
        </div>
      </section>
    </div>
  );
};
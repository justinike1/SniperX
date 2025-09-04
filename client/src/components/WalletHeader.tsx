import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Wallet, DollarSign, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

interface WalletData {
  address: string;
  balance: string;
  balanceUSD: string;
  profitLoss: string;
  profitPercentage: string;
  totalValue: string;
}

interface TradingStats {
  totalTrades: number;
  winRate: string;
  profitPercentage: string;
  totalProfit: string;
}

export function WalletHeader() {
  const [user, setUser] = useState<any>(null);
  const [animatingProfit, setAnimatingProfit] = useState(false);

  // Get current user
  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    checkUser();
  }, []);

  // Get wallet balance
  const { data: walletData } = useQuery<WalletData>({
    queryKey: [`/api/wallet/balance/${user?.id}`],
    enabled: !!user?.id,
    refetchInterval: 2000, // Update every 2 seconds
  });

  // Get trading stats for profit display
  const { data: tradingStats } = useQuery<{ success: boolean; stats: TradingStats }>({
    queryKey: ['/api/trading/stats', user?.id],
    enabled: !!user?.id,
    refetchInterval: 3000, // Update every 3 seconds
  });

  // Animate profit changes
  useEffect(() => {
    if (tradingStats?.stats?.profitPercentage) {
      setAnimatingProfit(true);
      const timer = setTimeout(() => setAnimatingProfit(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [tradingStats?.stats?.profitPercentage]);

  if (!user) return null;

  const profit = tradingStats?.stats?.profitPercentage || '+0.00%';
  const isPositive = profit.startsWith('+');
  const walletBalance = walletData ? parseFloat(walletData.balance) : 0;
  const balanceUSD = walletData ? parseFloat(walletData.balanceUSD) : 0;

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-purple-500/30 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Wallet Address & Balance */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Wallet className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex flex-col">
            <div className="text-xs text-gray-400 font-mono">
              {user.walletAddress ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-4)}` : 'Loading...'}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white">
                {walletBalance.toFixed(4)} SOL
              </span>
              <span className="text-sm text-gray-300">
                (${balanceUSD.toFixed(2)})
              </span>
              {walletBalance < 0.1 && (
                <Link href="/deposit">
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-green-500 text-green-400 hover:bg-green-500/20">
                    <Plus className="w-3 h-3 mr-1" />
                    Add SOL
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Real-Time Profit Display */}
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-400">AI Trader Profit</div>
            <div className={`flex items-center space-x-1 transition-all duration-300 ${
              animatingProfit ? 'scale-110 shadow-lg' : 'scale-100'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-lg font-bold ${
                isPositive ? 'text-green-400' : 'text-red-400'
              } ${animatingProfit ? 'animate-pulse' : ''}`}>
                {profit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Performance Bar */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">
            Trades: <span className="text-white font-semibold">{tradingStats?.stats?.totalTrades || 0}</span>
          </span>
          <span className="text-gray-400">
            Win Rate: <span className="text-green-400 font-semibold">{tradingStats?.stats?.winRate || '0.0'}%</span>
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 font-semibold text-xs">AI TRADING LIVE</span>
        </div>
      </div>
    </div>
  );
}
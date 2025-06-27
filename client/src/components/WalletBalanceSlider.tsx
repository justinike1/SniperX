import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, ArrowUpRight, DollarSign, Clock } from 'lucide-react';

export function WalletBalanceSlider() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch wallet balance
  const { data: walletBalance, isLoading } = useQuery({
    queryKey: ['/api/wallet/balance'],
    refetchInterval: 3000,
  });

  // Fetch user wallet info
  const { data: userWallet } = useQuery({
    queryKey: ['/api/user/wallet'],
    refetchInterval: 5000,
  });

  const balance = (walletBalance as any)?.balance || '0.0';
  const balanceFloat = parseFloat(balance);
  const isWaitingForFunds = balanceFloat === 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Card className="bg-black/90 backdrop-blur-md border-t border-blue-500/30 rounded-t-lg rounded-b-none">
        <CardContent className="p-0">
          {/* Slider Handle */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center py-2 cursor-pointer hover:bg-blue-500/10 transition-colors"
          >
            <div className="w-12 h-1 bg-gray-600 rounded-full" />
          </div>

          {/* Main Balance Display */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-full">
                  <Wallet className="h-5 w-5 text-blue-400" />
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-400">Wallet Balance</p>
                    {isWaitingForFunds && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                        <Clock className="h-3 w-3 mr-1" />
                        Waiting for funds
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold text-white">
                      ${isLoading ? '0.00' : balanceFloat.toFixed(2)}
                    </p>
                    {isWaitingForFunds && (
                      <span className="text-sm text-gray-400">SOL</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsExpanded(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Funds
                </Button>
                
                <Button 
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Waiting for Funds Message */}
            {isWaitingForFunds && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <DollarSign className="h-4 w-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-300 font-medium">Ready to receive funds</p>
                    <p className="text-xs text-yellow-400/80 mt-1">
                      Transfer SOL from Robinhood, Coinbase, or any exchange to start trading
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="px-6 pb-6 border-t border-gray-700">
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-400">Available</p>
                    <p className="text-lg font-semibold text-green-400">
                      ${balanceFloat.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-400">In Trading</p>
                    <p className="text-lg font-semibold text-blue-400">$0.00</p>
                  </div>
                </div>

                {(userWallet as any)?.wallet?.address && (
                  <div className="p-3 bg-gray-800/30 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
                    <p className="text-xs font-mono text-gray-300 break-all">
                      {(userWallet as any).wallet.address}
                    </p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Deposit
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 border-gray-600 text-gray-300"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Wallet, TrendingUp, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface WalletBalance {
  success: boolean;
  balance: number;
  address: string;
  timestamp: number;
}

interface Transaction {
  signature: string;
  timestamp: Date;
  status: string;
  amount: number;
  fee: number;
}

export default function LiveTradingDashboard() {
  const [liveTrading, setLiveTrading] = useState(false);
  const [tradeAmount, setTradeAmount] = useState('0.01');
  const [destination, setDestination] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch wallet balance
  const { data: walletData, isLoading: balanceLoading } = useQuery<WalletBalance>({
    queryKey: ['/api/wallet/balance'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch transaction history
  const { data: transactionData } = useQuery<{success: boolean, transactions: Transaction[]}>({
    queryKey: ['/api/wallet/transactions'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Toggle live trading
  const toggleLiveTradingMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const response = await fetch('/api/trading/toggle-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ enable })
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle live trading');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLiveTrading(data.liveTrading);
      toast({
        title: "Trading Mode Updated",
        description: data.message,
        variant: data.liveTrading ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle live trading",
        variant: "destructive",
      });
    }
  });

  // Execute live trade
  const executeTradeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/trading/execute-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          destination,
          amount: parseFloat(tradeAmount),
          confirm: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute trade');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.simulation) {
        toast({
          title: "Trade Simulated",
          description: `${data.message} - Signature: ${data.signature}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Trade Executed",
          description: `Live trade successful - ${data.signature}`,
          variant: "default",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Trade Failed",
        description: error.message || "Failed to execute trade",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Live Trading Status Banner */}
      <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-500">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-orange-700 dark:text-orange-300">
                LIVE SOLANA TRADING
              </CardTitle>
              <CardDescription className="text-orange-600 dark:text-orange-400">
                Real wallet integration with Solana Mainnet
              </CardDescription>
            </div>
            <div className="ml-auto">
              <Badge variant={liveTrading ? "default" : "secondary"} className="px-3 py-1">
                {liveTrading ? "LIVE" : "SAFE MODE"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallet Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Balance
            </CardTitle>
            <CardDescription>Real-time SOL balance</CardDescription>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {walletData?.balance?.toFixed(4) || '0.0000'} SOL
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Address: {walletData?.address || 'Loading...'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last updated: {walletData?.timestamp ? new Date(walletData.timestamp).toLocaleTimeString() : 'Never'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trading Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trading Controls
            </CardTitle>
            <CardDescription>Execute live SOL transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="live-trading">Live Trading Mode</Label>
              <Switch
                id="live-trading"
                checked={liveTrading}
                onCheckedChange={(checked) => toggleLiveTradingMutation.mutate(checked)}
                disabled={toggleLiveTradingMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination Address</Label>
              <Input
                id="destination"
                placeholder="Enter Solana address"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (SOL)</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0"
                max="0.1"
                placeholder="0.01"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Maximum: 0.1 SOL per trade
              </div>
            </div>

            <Button
              onClick={() => executeTradeMutation.mutate()}
              disabled={!destination || !tradeAmount || executeTradeMutation.isPending}
              className="w-full"
              variant={liveTrading ? "default" : "secondary"}
            >
              {executeTradeMutation.isPending ? (
                "Executing..."
              ) : liveTrading ? (
                "Execute Live Trade"
              ) : (
                "Simulate Trade (Safe Mode)"
              )}
            </Button>

            {!liveTrading && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Safe mode active - trades will be simulated
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest blockchain transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionData?.transactions?.length ? (
            <div className="space-y-3">
              {transactionData.transactions.slice(0, 5).map((tx, index) => (
                <div key={tx.signature} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Unknown time'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(4)} SOL
                    </div>
                    <Badge variant={tx.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety Warning */}
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <div className="font-semibold text-red-700 dark:text-red-300">
                Live Trading Safety Notice
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                Live trading involves real SOL transactions on Solana Mainnet. All trades are irreversible. 
                Maximum trade amount is limited to 0.1 SOL for safety. Enable live mode only when ready for real transactions.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Copy, Send, RefreshCw, Zap, CheckCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatAddress } from '@/lib/solana';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface UserWallet {
  address: string;
  balance: number;
  isReady: boolean;
  userId: number;
}

interface WalletResponse {
  success: boolean;
  wallet: UserWallet;
  message: string;
}

interface TransferRequest {
  toAddress: string;
  amount: number;
  memo?: string;
}

export const InstantWalletAccess = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendAddress, setSendAddress] = useState('');
  const [showSend, setShowSend] = useState(false);

  // Get user wallet instantly without authentication loops
  const { data: walletResponse, isLoading, error, refetch } = useQuery<WalletResponse>({
    queryKey: ['/api/instant-wallet/access'],
    retry: 1,
    staleTime: 60000,
    refetchInterval: 15000, // Refresh balance every 15 seconds
  });

  const wallet = (walletResponse as any)?.wallet;

  // Create wallet mutation for new users
  const createWalletMutation = useMutation({
    mutationFn: async () => await apiRequest('POST', '/api/instant-wallet/create', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instant-wallet/access'] });
      toast({
        title: "Wallet Created",
        description: "Your personal Solana wallet is ready for trading",
      });
    },
    onError: () => {
      toast({
        title: "Wallet Creation Failed",
        description: "Please try again in a moment",
        variant: "destructive",
      });
    }
  });

  // Send SOL mutation
  const sendSolMutation = useMutation({
    mutationFn: async (transfer: TransferRequest) => 
      await apiRequest('POST', '/api/instant-wallet/send', transfer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instant-wallet/access'] });
      setSendAmount('');
      setSendAddress('');
      setShowSend(false);
      toast({
        title: "Transfer Sent",
        description: "SOL transfer completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Transfer could not be completed",
        variant: "destructive",
      });
    }
  });

  const copyAddress = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = () => {
    if (!sendAmount || !sendAddress) {
      toast({
        title: "Missing Information",
        description: "Please enter amount and recipient address",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid SOL amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      toast({
        title: "Insufficient Balance",
        description: "Not enough SOL for this transfer",
        variant: "destructive",
      });
      return;
    }

    sendSolMutation.mutate({
      toAddress: sendAddress,
      amount,
      memo: 'SniperX Transfer'
    });
  };

  const refreshWallet = async () => {
    await refetch();
    toast({
      title: "Wallet Refreshed",
      description: "Latest balance retrieved from blockchain",
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto bg-black/40 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <Zap className="h-5 w-5" />
            Lightspeed Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Show create wallet option if no wallet exists
  if (!wallet || !wallet.address) {
    return (
      <Card className="w-full max-w-md mx-auto bg-black/40 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <Wallet className="h-5 w-5" />
            Create Your Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">
            Get instant access to your personal Solana wallet for trading and transfers
          </p>
          <Button 
            onClick={() => createWalletMutation.mutate()}
            disabled={createWalletMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {createWalletMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Wallet...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Create Instant Wallet
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-black/40 border-green-500/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Personal Wallet
          </div>
          <Badge variant="outline" className="border-green-500/50 text-green-400">
            Ready
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-white">
            {wallet.balance.toFixed(4)} SOL
          </div>
          <div className="text-sm text-gray-400">
            ≈ ${(wallet.balance * 98.50).toFixed(2)} USD
          </div>
        </div>

        {/* Wallet Address */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Your Address</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-gray-800 rounded text-xs text-green-400 font-mono">
              {formatAddress(wallet.address)}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={copyAddress}
              className="border-gray-600 hover:border-green-500"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setShowSend(!showSend)}
            variant="outline"
            className="border-blue-500/50 hover:border-blue-500 text-blue-400"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Button
            onClick={refreshWallet}
            variant="outline"
            className="border-gray-600 hover:border-green-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Send SOL Form */}
        {showSend && (
          <div className="space-y-3 p-3 bg-gray-900/50 rounded border border-blue-500/20">
            <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Send SOL
            </h4>
            <div className="space-y-2">
              <Input
                placeholder="Recipient address"
                value={sendAddress}
                onChange={(e) => setSendAddress(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
              <Input
                placeholder="Amount (SOL)"
                type="number"
                step="0.0001"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSend}
                  disabled={sendSolMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {sendSolMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send SOL
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowSend(false)}
                  variant="outline"
                  className="border-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-3">
          <span>Lightspeed Access</span>
          <span>User ID: {wallet.userId}</span>
        </div>
      </CardContent>
    </Card>
  );
};
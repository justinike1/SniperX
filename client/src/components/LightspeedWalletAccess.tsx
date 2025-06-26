import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Wallet, Copy, RefreshCw, Zap, CheckCircle } from 'lucide-react';
import { formatAddress } from '@/lib/solana';
import { useToast } from '@/hooks/use-toast';

interface LightspeedWallet {
  address: string;
  publicKey: string;
  balance: number;
  isReady: boolean;
}

interface WalletResponse {
  success: boolean;
  wallet: LightspeedWallet;
  message: string;
}

export const LightspeedWalletAccess = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Fetch wallet with instant access using working endpoint
  const { data: walletResponse, isLoading, error, refetch } = useQuery<WalletResponse>({
    queryKey: ['/api/instant-wallet/access'],
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // 30 seconds
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const wallet = walletResponse?.wallet;
  const currentBalance = wallet?.balance ?? 0;

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

  const refreshWallet = async () => {
    await refetch();
    toast({
      title: "Wallet Refreshed",
      description: "Latest wallet data retrieved",
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-400" />
            <Skeleton className="h-6 w-32 bg-blue-400/20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20 bg-blue-400/20" />
            <Skeleton className="h-8 w-24 bg-blue-400/20" />
          </div>
          <Skeleton className="h-10 w-full bg-blue-400/20" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 bg-blue-400/20" />
            <Skeleton className="h-9 w-20 bg-blue-400/20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !walletResponse?.success) {
    return (
      <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Wallet className="h-5 w-5" />
            Wallet Connection Issue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-300 text-sm">
            Unable to access wallet. Please try refreshing or contact support.
          </p>
          <Button 
            onClick={refreshWallet}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-400" />
            <span className="text-blue-100">Lightspeed Wallet</span>
          </div>
          {wallet?.isReady && (
            <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">SOL Balance</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-100">
              {currentBalance.toFixed(4)}
            </span>
            <span className="text-gray-400 text-sm">SOL</span>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Wallet Address</label>
          <div className="flex items-center gap-2 p-3 bg-dark-surface rounded-lg border border-gray-700">
            <code className="text-blue-300 text-sm flex-1 font-mono">
              {formatAddress(wallet?.address || '')}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyAddress}
              className="h-8 w-8 p-0 hover:bg-blue-600/20"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={refreshWallet}
            variant="outline"
            className="flex-1 border-blue-500/30 hover:bg-blue-600/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={copyAddress}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>

        {/* Wallet Status */}
        <div className="text-center text-xs text-gray-500">
          {wallet?.isReady ? (
            <span className="text-green-400">
              Wallet ready for instant trading
            </span>
          ) : (
            <span className="text-yellow-400">
              Initializing wallet connection...
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RefreshCw, Copy, Wallet, AlertTriangle } from 'lucide-react';
import { formatAddress } from '@/lib/solana';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FreshWallet {
  address: string;
  balance: number;
  isReady: boolean;
  userId: number;
  exchangeCompatibility: {
    robinhood: boolean;
    coinbase: boolean;
    binance: boolean;
    kraken: boolean;
    phantom: boolean;
  };
}

export const FreshWalletAccess = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [wallet, setWallet] = useState<FreshWallet | null>(null);
  const [copied, setCopied] = useState(false);

  // Get fresh wallet address - bypasses all caching
  const getFreshWalletMutation = useMutation({
    mutationFn: async () => {
      // Force fresh request with cache-busting
      const timestamp = Date.now();
      const response = await fetch(`/api/instant-wallet/access?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch fresh wallet');
      }
      
      const data = await response.json();
      return data.wallet;
    },
    onSuccess: (freshWallet: FreshWallet) => {
      setWallet(freshWallet);
      // Clear any cached wallet data
      queryClient.removeQueries({ queryKey: ['/api/instant-wallet/access'] });
      
      toast({
        title: "Fresh Wallet Generated",
        description: "New Solana address ready for Robinhood transfers",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Please try again to get a fresh wallet address",
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
        description: "Fresh Solana address copied - ready for Robinhood",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const validateForRobinhood = () => {
    if (!wallet?.address) return false;
    
    // Check if it's a valid Base58 Solana address (no "SniperX" fake addresses)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const isValid = base58Regex.test(wallet.address);
    const isNotFake = !wallet.address.includes('SniperX');
    
    return isValid && isNotFake;
  };

  if (!wallet) {
    return (
      <Card className="w-full max-w-md mx-auto bg-black/40 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <Wallet className="h-5 w-5" />
            Get Fresh Wallet Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-300">
            Generate a fresh Solana wallet address that works with Robinhood, Coinbase, and all major exchanges.
          </div>
          
          <div className="bg-amber-950/30 border border-amber-500/20 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
              <div className="text-xs text-amber-200">
                This bypasses any cached fake addresses and generates authentic Solana addresses compatible with all exchanges.
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => getFreshWalletMutation.mutate()}
            disabled={getFreshWalletMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {getFreshWalletMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Fresh Address...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Generate Fresh Wallet
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isRobinhoodReady = validateForRobinhood();

  return (
    <Card className={`w-full max-w-md mx-auto bg-black/40 ${
      isRobinhoodReady ? 'border-green-500/30' : 'border-red-500/30'
    }`}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${
          isRobinhoodReady ? 'text-green-400' : 'text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Fresh Wallet Address
          </div>
          <Badge 
            variant="outline" 
            className={`${
              isRobinhoodReady 
                ? 'border-green-500/50 text-green-400' 
                : 'border-red-500/50 text-red-400'
            }`}
          >
            {isRobinhoodReady ? 'Robinhood Ready' : 'Invalid'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address Display */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Your Fresh Address</label>
          <div className="flex items-center gap-2">
            <code className={`flex-1 p-2 rounded text-xs font-mono ${
              isRobinhoodReady 
                ? 'bg-green-900/20 text-green-400 border border-green-500/20' 
                : 'bg-red-900/20 text-red-400 border border-red-500/20'
            }`}>
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

        {/* Exchange Compatibility */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Exchange Compatibility</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`flex items-center gap-2 ${
              wallet.exchangeCompatibility.robinhood ? 'text-green-400' : 'text-red-400'
            }`}>
              <CheckCircle className="h-3 w-3" />
              Robinhood
            </div>
            <div className={`flex items-center gap-2 ${
              wallet.exchangeCompatibility.coinbase ? 'text-green-400' : 'text-red-400'
            }`}>
              <CheckCircle className="h-3 w-3" />
              Coinbase
            </div>
            <div className={`flex items-center gap-2 ${
              wallet.exchangeCompatibility.binance ? 'text-green-400' : 'text-red-400'
            }`}>
              <CheckCircle className="h-3 w-3" />
              Binance
            </div>
            <div className={`flex items-center gap-2 ${
              wallet.exchangeCompatibility.phantom ? 'text-green-400' : 'text-red-400'
            }`}>
              <CheckCircle className="h-3 w-3" />
              Phantom
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => getFreshWalletMutation.mutate()}
            disabled={getFreshWalletMutation.isPending}
            variant="outline"
            className="border-blue-500/50 hover:border-blue-500 text-blue-400"
          >
            {getFreshWalletMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            New Address
          </Button>
          <Button
            onClick={copyAddress}
            className="bg-green-600 hover:bg-green-700"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Address
          </Button>
        </div>

        {/* Status Message */}
        <div className={`text-center text-xs p-2 rounded ${
          isRobinhoodReady 
            ? 'bg-green-950/30 text-green-400 border border-green-500/20' 
            : 'bg-red-950/30 text-red-400 border border-red-500/20'
        }`}>
          {isRobinhoodReady 
            ? 'This address is ready for transfers from Robinhood and all major exchanges'
            : 'Invalid address format - please generate a new address'
          }
        </div>

        {/* Fresh Generation Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-3">
          <span>Fresh Generation</span>
          <span>User ID: {wallet.userId}</span>
        </div>
      </CardContent>
    </Card>
  );
};
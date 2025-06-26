import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Wallet, 
  ArrowRight, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';

interface WalletPlatform {
  platform: string;
  name: string;
  type: string;
  estimatedTime: string;
  fees: number;
  feePercentage: number;
  supported: boolean;
}

interface TransferRequest {
  fromPlatform: string;
  fromWalletAddress: string;
  amount: number;
  asset: string;
  urgency: 'standard' | 'fast' | 'instant';
}

export const WalletConnector = () => {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('SOL');
  const [urgency, setUrgency] = useState<'standard' | 'fast' | 'instant'>('standard');
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch supported platforms
  const { data: platforms = [], isLoading: platformsLoading } = useQuery({
    queryKey: ['/api/wallet/platforms'],
    retry: false,
  });

  // Get transfer options for current settings
  const { data: transferOptions = [], refetch: refetchOptions } = useQuery({
    queryKey: ['/api/wallet/transfer-options', amount, asset],
    enabled: !!(amount && parseFloat(amount) > 0),
    retry: false,
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (transferData: TransferRequest) => {
      const response = await apiRequest('POST', '/api/wallet/initiate-transfer', transferData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Transfer Initiated",
          description: `${data.message} Transfer ID: ${data.transferId}`,
        });
        setWalletAddress('');
        setAmount('');
      } else {
        toast({
          title: "Transfer Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Transfer Error",
        description: "Failed to initiate transfer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Wallet validation mutation
  const validateMutation = useMutation({
    mutationFn: async ({ address, platform }: { address: string; platform: string }) => {
      const response = await apiRequest('POST', '/api/wallet/validate', { address, platform });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: "Wallet Validated",
          description: "Wallet address is valid and ready for transfer.",
        });
      } else {
        toast({
          title: "Invalid Wallet",
          description: "Please check your wallet address and try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleConnectWallet = async () => {
    if (!selectedPlatform) {
      toast({
        title: "Select Platform",
        description: "Please select a wallet or exchange platform.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Handle different wallet types
      switch (selectedPlatform) {
        case 'phantom':
          await connectPhantom();
          break;
        case 'solflare':
          await connectSolflare();
          break;
        case 'metamask':
          await connectMetaMask();
          break;
        case 'coinbase':
          await connectCoinbase();
          break;
        case 'robinhood':
          await connectRobinhood();
          break;
        default:
          await connectGenericWallet();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to connect to wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const connectPhantom = async () => {
    if (typeof window !== 'undefined' && (window as any).solana) {
      try {
        const response = await (window as any).solana.connect();
        setWalletAddress(response.publicKey.toString());
        toast({
          title: "Phantom Connected",
          description: "Phantom wallet connected successfully!",
        });
      } catch (error) {
        throw new Error('Phantom connection failed');
      }
    } else {
      toast({
        title: "Phantom Not Found",
        description: "Please install Phantom wallet extension.",
        variant: "destructive",
      });
    }
  };

  const connectSolflare = async () => {
    if (typeof window !== 'undefined' && (window as any).solflare) {
      try {
        const response = await (window as any).solflare.connect();
        setWalletAddress(response.publicKey.toString());
        toast({
          title: "Solflare Connected",
          description: "Solflare wallet connected successfully!",
        });
      } catch (error) {
        throw new Error('Solflare connection failed');
      }
    } else {
      // Fallback for manual address entry
      toast({
        title: "Manual Entry Required",
        description: "Please enter your Solflare wallet address manually.",
      });
    }
  };

  const connectMetaMask = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        setWalletAddress(accounts[0]);
        toast({
          title: "MetaMask Connected",
          description: "MetaMask wallet connected successfully!",
        });
      } catch (error) {
        throw new Error('MetaMask connection failed');
      }
    } else {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask extension.",
        variant: "destructive",
      });
    }
  };

  const connectCoinbase = async () => {
    // Simulate Coinbase Wallet connection
    toast({
      title: "Coinbase Integration",
      description: "Enter your Coinbase Pro API credentials or wallet address.",
    });
  };

  const connectRobinhood = async () => {
    // Simulate Robinhood connection
    toast({
      title: "Robinhood Integration",
      description: "Enter your Robinhood account details for crypto transfer.",
    });
  };

  const connectGenericWallet = async () => {
    toast({
      title: "Manual Connection",
      description: "Please enter your wallet address manually below.",
    });
  };

  const handleTransfer = async () => {
    if (!selectedPlatform || !walletAddress || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid transfer amount.",
        variant: "destructive",
      });
      return;
    }

    const transferData: TransferRequest = {
      fromPlatform: selectedPlatform,
      fromWalletAddress: walletAddress,
      amount: parseFloat(amount),
      asset,
      urgency
    };

    transferMutation.mutate(transferData);
  };

  const validateWallet = () => {
    if (walletAddress && selectedPlatform) {
      validateMutation.mutate({ address: walletAddress, platform: selectedPlatform });
    }
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'instant': return 'bg-red-500';
      case 'fast': return 'bg-orange-500';
      default: return 'bg-green-500';
    }
  };

  const getUrgencyMultiplier = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'instant': return '2.5x';
      case 'fast': return '1.5x';
      default: return '1x';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Lightning-Fast Wallet Transfers
          </CardTitle>
          <CardDescription>
            Connect your wallet or exchange account for instant crypto transfers within seconds
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Select Your Platform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platformsLoading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">Loading platforms...</p>
              </div>
            ) : (
              ['phantom', 'coinbase', 'robinhood', 'solflare', 'binance', 'kraken', 'trust', 'metamask'].map((platform) => (
                <Button
                  key={platform}
                  variant={selectedPlatform === platform ? "default" : "outline"}
                  className="h-16 flex flex-col items-center gap-1"
                  onClick={() => setSelectedPlatform(platform)}
                >
                  <Wallet className="h-5 w-5" />
                  <span className="text-xs capitalize">{platform}</span>
                </Button>
              ))
            )}
          </div>

          {selectedPlatform && (
            <div className="pt-4">
              <Button 
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Connect {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Transfer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <div className="flex gap-2">
                <Input
                  id="wallet-address"
                  placeholder="Enter wallet address or connect above"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={validateWallet}
                  disabled={!walletAddress || validateMutation.isPending}
                >
                  {validateMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Transfer Speed</Label>
              <Select value={urgency} onValueChange={(value: any) => setUrgency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (1x fees)</SelectItem>
                  <SelectItem value="fast">Fast (1.5x fees)</SelectItem>
                  <SelectItem value="instant">Instant (2.5x fees)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Options */}
      {Array.isArray(transferOptions) && transferOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Transfer Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {(transferOptions as WalletPlatform[]).slice(0, 3).map((option: WalletPlatform, index: number) => (
                <div
                  key={option.platform}
                  className={`p-4 border rounded-lg ${
                    selectedPlatform === option.platform ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span className="font-medium">{option.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {option.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{option.estimatedTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${option.fees.toFixed(4)}</span>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs text-white ${getUrgencyColor(urgency)}`}>
                        {getUrgencyMultiplier(urgency)} fees
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execute Transfer */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleTransfer}
            disabled={transferMutation.isPending || !selectedPlatform || !walletAddress || !amount}
            className="w-full h-12 text-lg"
          >
            {transferMutation.isPending ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                Processing Transfer...
              </>
            ) : (
              <>
                <ArrowRight className="h-5 w-5 mr-2" />
                Initiate Lightning Transfer
              </>
            )}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>Instant</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>Low Fees</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✨ Revolutionary Transfer Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Lightning Speed</h4>
                  <p className="text-sm text-muted-foreground">
                    Transfers complete in 5-60 seconds depending on platform
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Bank-Level Security</h4>
                  <p className="text-sm text-muted-foreground">
                    Military-grade encryption and secure wallet management
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Minimal Fees</h4>
                  <p className="text-sm text-muted-foreground">
                    Industry-lowest transfer fees starting from 0.025%
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Universal Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Compatible with all major wallets and exchanges
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
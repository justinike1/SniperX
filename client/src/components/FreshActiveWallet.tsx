import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, CheckCircle, Wallet, Zap, ExternalLink, RefreshCw, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActiveWallet {
  address: string;
  isActive: boolean;
  solscanVerified: boolean;
  transferCapable: boolean;
  balance: string;
  createdAt: string;
}

interface TransferInstruction {
  fromPlatform: string;
  toAddress: string;
  steps: string[];
  estimatedTime: string;
  fees: string;
}

export function FreshActiveWallet() {
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('robinhood');
  const [activeWallet, setActiveWallet] = useState<ActiveWallet | null>(null);
  const [transferInstructions, setTransferInstructions] = useState<TransferInstruction | null>(null);

  // Create fresh active wallet
  const createFreshWalletMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/wallet/create-fresh', {});
    },
    onSuccess: (data) => {
      if (data.success) {
        setActiveWallet(data.wallet);
        toast({
          title: "Fresh Wallet Created",
          description: "Your new active wallet is ready for transfers",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create fresh wallet",
        variant: "destructive"
      });
    }
  });

  // Get transfer instructions
  const getTransferInstructionsMutation = useMutation({
    mutationFn: async ({ platform, address }: { platform: string; address: string }) => {
      return await apiRequest('POST', '/api/wallet/transfer-instructions', {
        fromPlatform: platform,
        toAddress: address
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        setTransferInstructions(data.instructions);
      }
    }
  });

  // Verify wallet with Solscan
  const verifySolscanMutation = useMutation({
    mutationFn: async (address: string) => {
      return await apiRequest('POST', '/api/wallet/verify-solscan', { address });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Solscan Verified",
          description: "Wallet is active and ready for transfers",
        });
      }
    }
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(true);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the address manually",
        variant: "destructive"
      });
    }
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    if (activeWallet) {
      getTransferInstructionsMutation.mutate({
        platform,
        address: activeWallet.address
      });
    }
  };

  useEffect(() => {
    if (activeWallet && selectedPlatform) {
      getTransferInstructionsMutation.mutate({
        platform: selectedPlatform,
        address: activeWallet.address
      });
    }
  }, [activeWallet, selectedPlatform]);

  const platforms = [
    { id: 'robinhood', name: 'Robinhood', icon: '🏦' },
    { id: 'coinbase', name: 'Coinbase', icon: '🔵' },
    { id: 'phantom', name: 'Phantom', icon: '👻' },
    { id: 'binance', name: 'Binance', icon: '🟡' }
  ];

  return (
    <div className="space-y-6">
      {/* Fresh Wallet Generation */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-500" />
            Fresh Active Wallet Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeWallet ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">
                Generate a fresh wallet address that's actively linked to Solscan and ready for transfers
              </p>
              <Button
                onClick={() => createFreshWalletMutation.mutate()}
                disabled={createFreshWalletMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                {createFreshWalletMutation.isPending ? 'Creating...' : 'Generate Fresh Wallet'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Wallet Address */}
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Wallet Address</Label>
                  <div className="flex gap-2">
                    <Badge className={activeWallet.solscanVerified ? "bg-green-600" : "bg-orange-600"}>
                      {activeWallet.solscanVerified ? "Solscan Verified" : "Verifying..."}
                    </Badge>
                    <Badge className={activeWallet.transferCapable ? "bg-blue-600" : "bg-gray-600"}>
                      {activeWallet.transferCapable ? "Transfer Ready" : "Not Ready"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={activeWallet.address}
                    readOnly
                    className="font-mono text-sm bg-gray-700 border-gray-600"
                  />
                  <Button
                    onClick={() => copyToClipboard(activeWallet.address)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {copiedAddress ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => verifySolscanMutation.mutate(activeWallet.address)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={verifySolscanMutation.isPending}
                  >
                    {verifySolscanMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Wallet Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-400">{activeWallet.balance} SOL</div>
                  <div className="text-xs text-gray-400">Balance</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${activeWallet.isActive ? 'text-green-400' : 'text-orange-400'}`}>
                    {activeWallet.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-xs text-gray-400">Status</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${activeWallet.solscanVerified ? 'text-green-400' : 'text-orange-400'}`}>
                    {activeWallet.solscanVerified ? 'Verified' : 'Pending'}
                  </div>
                  <div className="text-xs text-gray-400">Solscan</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${activeWallet.transferCapable ? 'text-green-400' : 'text-red-400'}`}>
                    {activeWallet.transferCapable ? 'Ready' : 'Not Ready'}
                  </div>
                  <div className="text-xs text-gray-400">Transfers</div>
                </div>
              </div>

              {/* Solscan Link */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://solscan.io/account/${activeWallet.address}`, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Solscan
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Instructions */}
      {activeWallet && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-green-500" />
              Quick Transfer Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedPlatform} onValueChange={handlePlatformChange}>
              <TabsList className="grid w-full grid-cols-4">
                {platforms.map(platform => (
                  <TabsTrigger key={platform.id} value={platform.id} className="text-xs">
                    {platform.icon} {platform.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {platforms.map(platform => (
                <TabsContent key={platform.id} value={platform.id} className="mt-4">
                  {transferInstructions && transferInstructions.fromPlatform.toLowerCase() === platform.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-500 rounded-lg">
                        <div>
                          <div className="font-semibold text-green-400">Transfer Time: {transferInstructions.estimatedTime}</div>
                          <div className="text-sm text-gray-400">Fees: {transferInstructions.fees}</div>
                        </div>
                        <Badge className="bg-green-600">Robinhood-Style Speed</Badge>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold">Step-by-Step Instructions:</h4>
                        {transferInstructions.steps.map((step, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                              {index + 1}
                            </div>
                            <div className="text-sm">{step}</div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
                        <div className="text-sm text-blue-300">
                          <strong>Pro Tip:</strong> Your wallet address is automatically verified on Solscan and ready to receive transfers instantly, just like Robinhood!
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <div className="text-sm text-gray-400 mt-2">Loading transfer instructions...</div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
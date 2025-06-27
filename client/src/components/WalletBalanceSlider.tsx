import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Plus, ArrowUpRight, DollarSign, Clock, Send, Download, Copy, ExternalLink, Shield } from 'lucide-react';

export function WalletBalanceSlider() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('receive');
  const [sendAmount, setSendAmount] = useState('');
  const [sendAddress, setSendAddress] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');

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

  const supportedPlatforms = [
    { name: 'Robinhood', icon: '🟢', type: 'exchange' },
    { name: 'Coinbase', icon: '🔵', type: 'exchange' },
    { name: 'Phantom', icon: '👻', type: 'wallet' },
    { name: 'Solflare', icon: '☀️', type: 'wallet' },
    { name: 'Binance', icon: '🟡', type: 'exchange' },
    { name: 'Kraken', icon: '🐙', type: 'exchange' },
    { name: 'Metamask', icon: '🦊', type: 'wallet' },
    { name: 'Trust Wallet', icon: '🛡️', type: 'wallet' }
  ];

  const handleCopyAddress = () => {
    if ((userWallet as any)?.wallet?.address) {
      navigator.clipboard.writeText((userWallet as any).wallet.address);
    }
  };

  // Solscan verification mutation
  const verifyWalletMutation = useMutation({
    mutationFn: async (address: string) => {
      return await apiRequest('POST', '/api/wallet/verify', { address });
    },
    onSuccess: (data) => {
      console.log('Wallet verified:', data);
      // Refresh wallet data
      queryClient.invalidateQueries({ queryKey: ['/api/user/wallet'] });
    },
    onError: (error) => {
      console.error('Verification failed:', error);
    }
  });

  const handleSendSolana = async () => {
    if (!sendAmount || !sendAddress) return;
    
    try {
      // Implementation for sending SOL across chains
      console.log('Sending', sendAmount, 'SOL to', sendAddress, 'via', selectedPlatform);
    } catch (error) {
      console.error('Send failed:', error);
    }
  };

  const handleVerifyWallet = () => {
    const address = (userWallet as any)?.wallet?.address;
    if (address) {
      verifyWalletMutation.mutate(address);
    }
  };

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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
                    <TabsTrigger value="receive" className="text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Receive
                    </TabsTrigger>
                    <TabsTrigger value="send" className="text-xs">
                      <Send className="h-3 w-3 mr-1" />
                      Send
                    </TabsTrigger>
                    <TabsTrigger value="verify" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Verify
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="receive" className="mt-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-green-300">Your SniperX Wallet</p>
                          <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                            Verified
                          </Badge>
                        </div>
                        {(userWallet as any)?.wallet?.address && (
                          <div>
                            <p className="text-xs font-mono text-gray-300 break-all mb-2">
                              {(userWallet as any).wallet.address}
                            </p>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={handleCopyAddress}
                              className="w-full border-green-500/50 text-green-300 hover:bg-green-500/20"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy Address
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm font-medium text-blue-300 mb-2">Supported Platforms</p>
                        <div className="grid grid-cols-2 gap-2">
                          {supportedPlatforms.map((platform) => (
                            <div key={platform.name} className="flex items-center space-x-2 p-2 bg-gray-800/50 rounded">
                              <span className="text-sm">{platform.icon}</span>
                              <span className="text-xs text-gray-300">{platform.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="send" className="mt-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Amount (SOL)</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          className="bg-gray-800/50 border-gray-600"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">To Address</label>
                        <Input
                          placeholder="Solana wallet address"
                          value={sendAddress}
                          onChange={(e) => setSendAddress(e.target.value)}
                          className="bg-gray-800/50 border-gray-600"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Platform</label>
                        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                          <SelectTrigger className="bg-gray-800/50 border-gray-600">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {supportedPlatforms.map((platform) => (
                              <SelectItem key={platform.name} value={platform.name}>
                                {platform.icon} {platform.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={handleSendSolana}
                        disabled={!sendAmount || !sendAddress}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send SOL
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="verify" className="mt-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Shield className="h-4 w-4 text-yellow-400" />
                          <p className="text-sm font-medium text-yellow-300">Solscan Verification</p>
                        </div>
                        <p className="text-xs text-yellow-400/80 mb-3">
                          Verify your wallet through Solscan for legal compliance and enhanced security
                        </p>
                        <Button 
                          size="sm"
                          className="w-full bg-yellow-600 hover:bg-yellow-700"
                          onClick={handleVerifyWallet}
                          disabled={verifyWalletMutation.isPending || !(userWallet as any)?.wallet?.address}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {verifyWalletMutation.isPending ? 'Verifying...' : 'Verify with Solscan'}
                        </Button>
                      </div>

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
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
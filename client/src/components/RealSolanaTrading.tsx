import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Send, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Target,
  Rocket
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface WalletBalance {
  sol: number;
  tokens: Map<string, { balance: number; value: number; symbol: string }>;
  totalValue: number;
}

interface LiveTrade {
  signature: string;
  tokenAddress: string;
  action: 'BUY' | 'SELL';
  amount: number;
  actualPrice: number;
  slippage: number;
  fee: number;
  timestamp: number;
  success: boolean;
}

interface NetworkStatus {
  slot: number;
  epoch: number;
  connected: boolean;
  rpcEndpoint: string;
}

export default function RealSolanaTrading() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [recentTrades, setRecentTrades] = useState<LiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  
  // Trading form state
  const [tradeForm, setTradeForm] = useState({
    tokenAddress: '',
    action: 'BUY' as 'BUY' | 'SELL',
    amount: '',
    maxSlippage: '3.0'
  });
  
  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    toAddress: '',
    amount: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    checkExistingWallet();
    fetchNetworkStatus();
    
    // WebSocket for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'WALLET_CREATED' || message.type === 'WALLET_UPDATE') {
        if (message.data.publicKey) {
          setWalletAddress(message.data.publicKey);
          setHasWallet(true);
        }
        if (message.data.balance !== undefined) {
          fetchWalletBalance();
        }
      }
      
      if (message.type === 'LIVE_TRADE_EXECUTED') {
        const tradeData = message.data;
        const newTrade: LiveTrade = {
          signature: tradeData.signature,
          tokenAddress: tradeData.tokenAddress,
          action: tradeData.action,
          amount: tradeData.amount,
          actualPrice: tradeData.actualPrice,
          slippage: tradeData.slippage,
          fee: tradeData.fee,
          timestamp: tradeData.timestamp,
          success: tradeData.success
        };
        
        setRecentTrades(prev => [newTrade, ...prev.slice(0, 9)]);
        
        toast({
          title: `${tradeData.action} Trade Executed`,
          description: `${tradeData.amount} SOL trade completed with ${tradeData.slippage.toFixed(2)}% slippage`,
          variant: tradeData.success ? "default" : "destructive"
        });
      }
    };

    return () => ws.close();
  }, [toast]);

  const checkExistingWallet = async () => {
    try {
      const response = await fetch('/api/real-trading/wallet-balance', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.wallet) {
          setWalletAddress(data.wallet);
          setBalance(data.balance);
          setHasWallet(true);
        }
      }
    } catch (error) {
      console.error('Error checking existing wallet:', error);
    }
  };

  const createWallet = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/real-trading/create-wallet', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWalletAddress(data.wallet.publicKey);
        setHasWallet(true);
        
        toast({
          title: "Real Solana Wallet Created",
          description: "Your wallet is ready for live trading on Solana mainnet"
        });
        
        fetchWalletBalance();
      } else {
        toast({
          title: "Wallet Creation Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create real Solana wallet",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!hasWallet) return;
    
    try {
      const response = await fetch('/api/real-trading/wallet-balance', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchNetworkStatus = async () => {
    try {
      const response = await fetch('/api/real-trading/network-status');
      
      if (response.ok) {
        const data = await response.json();
        setNetworkStatus(data.status);
      }
    } catch (error) {
      console.error('Error fetching network status:', error);
    }
  };

  const executeHighVolatilityTrade = async () => {
    if (!tradeForm.tokenAddress || !tradeForm.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all trading fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/real-trading/execute-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tokenAddress: tradeForm.tokenAddress,
          action: tradeForm.action,
          amount: parseFloat(tradeForm.amount),
          maxSlippage: parseFloat(tradeForm.maxSlippage)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: `${tradeForm.action} Trade Executed`,
          description: `Successfully executed ${tradeForm.amount} SOL trade`,
        });
        
        // Reset form and refresh balance
        setTradeForm({ ...tradeForm, tokenAddress: '', amount: '' });
        fetchWalletBalance();
      } else {
        toast({
          title: "Trade Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Trade Error",
        description: "Failed to execute high volatility trade",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeRealTransfer = async () => {
    if (!transferForm.toAddress || !transferForm.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in transfer address and amount",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/real-trading/transfer-sol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toAddress: transferForm.toAddress,
          amount: parseFloat(transferForm.amount)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "SOL Transfer Completed",
          description: `Successfully transferred ${transferForm.amount} SOL`,
        });
        
        // Reset form and refresh balance
        setTransferForm({ toAddress: '', amount: '' });
        fetchWalletBalance();
      } else {
        toast({
          title: "Transfer Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Transfer Error",
        description: "Failed to execute SOL transfer",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <Rocket className="w-8 h-8 text-purple-400" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            Real Solana Trading
          </h1>
          <Zap className="w-8 h-8 text-yellow-400" />
        </motion.div>
        <p className="text-gray-300 text-lg">
          High-Volatility Trading with Real Money on Solana Mainnet
        </p>
        
        {networkStatus && (
          <Badge className="mt-4 bg-green-500/20 text-green-400 border-green-500">
            <CheckCircle className="w-4 h-4 mr-2" />
            Connected to {networkStatus.rpcEndpoint} - Slot: {networkStatus.slot}
          </Badge>
        )}
      </div>

      {!hasWallet ? (
        /* Wallet Creation */
        <Card className="max-w-md mx-auto bg-slate-800/80 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-400" />
              Create Real Solana Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-semibold">Real Money Warning</p>
                  <p className="text-sm text-gray-300">
                    This will create a real Solana wallet for live trading. Only use real funds you can afford to lose.
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={createWallet}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating Wallet...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Create Real Solana Wallet
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Main Trading Interface */
        <div className="space-y-6">
          {/* Wallet Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Wallet className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Wallet Address</p>
                    <p className="font-mono text-sm break-all">
                      {walletAddress.substring(0, 8)}...{walletAddress.substring(-8)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">SOL Balance</p>
                    <p className="text-2xl font-bold text-green-400">
                      {balance?.sol.toFixed(4) || '0.0000'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Target className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total Value</p>
                    <p className="text-2xl font-bold text-blue-400">
                      ${balance?.totalValue.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trading Interface */}
          <Tabs defaultValue="trade" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trade">High-Volatility Trading</TabsTrigger>
              <TabsTrigger value="transfer">SOL Transfers</TabsTrigger>
              <TabsTrigger value="history">Trade History</TabsTrigger>
            </TabsList>

            <TabsContent value="trade" className="space-y-6">
              <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Execute High-Volatility Trade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Token Address</Label>
                      <Input
                        placeholder="Enter Solana token address"
                        value={tradeForm.tokenAddress}
                        onChange={(e) => setTradeForm({ ...tradeForm, tokenAddress: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label>Action</Label>
                      <select
                        className="w-full p-2 bg-slate-700 border border-slate-600 rounded"
                        value={tradeForm.action}
                        onChange={(e) => setTradeForm({ ...tradeForm, action: e.target.value as 'BUY' | 'SELL' })}
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label>Amount (SOL)</Label>
                      <Input
                        type="number"
                        placeholder="0.1"
                        step="0.001"
                        value={tradeForm.amount}
                        onChange={(e) => setTradeForm({ ...tradeForm, amount: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label>Max Slippage (%)</Label>
                      <Input
                        type="number"
                        placeholder="3.0"
                        step="0.1"
                        value={tradeForm.maxSlippage}
                        onChange={(e) => setTradeForm({ ...tradeForm, maxSlippage: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={executeHighVolatilityTrade}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  >
                    {isLoading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Executing Trade...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Execute {tradeForm.action} Trade
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfer">
              <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-400" />
                    Transfer SOL
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Recipient Address</Label>
                    <Input
                      placeholder="Enter Solana address"
                      value={transferForm.toAddress}
                      onChange={(e) => setTransferForm({ ...transferForm, toAddress: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label>Amount (SOL)</Label>
                    <Input
                      type="number"
                      placeholder="0.1"
                      step="0.001"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    />
                  </div>
                  
                  <Button
                    onClick={executeRealTransfer}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {isLoading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Sending Transfer...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send SOL
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-400" />
                    Recent Trades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {recentTrades.map((trade, index) => (
                        <motion.div
                          key={trade.signature}
                          initial={{ opacity: 0, x: -100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 100 }}
                          className={`p-4 rounded-lg border-l-4 ${
                            trade.action === 'BUY' 
                              ? 'bg-green-900/30 border-green-400' 
                              : 'bg-red-900/30 border-red-400'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <Badge className={trade.action === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                                {trade.action}
                              </Badge>
                              <p className="text-sm text-gray-400 mt-1">
                                {trade.amount.toFixed(4)} SOL @ ${trade.actualPrice.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">Slippage: {trade.slippage.toFixed(2)}%</p>
                              <p className="text-xs text-gray-500">
                                {new Date(trade.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {recentTrades.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No recent trades found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
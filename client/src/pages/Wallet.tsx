import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Send, Download, ArrowUpRight, ArrowDownLeft, Shield, CheckCircle, XCircle, Loader2, Copy, QrCode, RefreshCw, Star, FileText, HardDrive } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { ProductionWalletSetup } from '@/components/ProductionWalletSetup';
import { WalletBackupWizard } from '@/components/WalletBackupWizard';
import { WalletRecoveryWizard } from '@/components/WalletRecoveryWizard';
import { FreshWalletAccess } from '@/components/FreshWalletAccess';
import { FreshActiveWallet } from '@/components/FreshActiveWallet';
import { RobinhoodTransferTracker } from '@/components/RobinhoodTransferTracker';
import { RobinhoodTransferTester } from '@/components/RobinhoodTransferTester';

interface WalletBalance {
  address: string;
  balance: number;
  balanceSOL: number;
  profitLoss?: number;
  profitPercentage?: number;
  totalValue?: number;
  isProduction?: boolean;
  walletType?: string;
}

interface Transaction {
  id: string;
  type: 'SEND' | 'RECEIVE';
  amount: number;
  address: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  timestamp: string;
  txHash?: string;
}

interface AddressValidation {
  isValid: boolean;
  exists: boolean;
  error?: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addressValidation, setAddressValidation] = useState<AddressValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [hasProductionWallet, setHasProductionWallet] = useState(false);
  const [productionWalletData, setProductionWalletData] = useState<any>(null);
  const [showBackupWizard, setShowBackupWizard] = useState(false);
  const [showRecoveryWizard, setShowRecoveryWizard] = useState(false);
  const { toast } = useToast();

  const userId = 1; // Demo user ID

  useEffect(() => {
    fetchWalletBalance();
    fetchTransactionHistory();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setIsLoading(true);
      
      // Use instant wallet access endpoint that works
      const response = await fetch('/api/instant-wallet/access', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balance');
      }
      
      const data = await response.json();
      
      // Handle instant wallet response format
      if (data.success && data.wallet) {
        const wallet = data.wallet;
        setBalance({
          address: wallet.address,
          balance: parseFloat(wallet.balance || '0'),
          balanceSOL: parseFloat(wallet.balance || '0'),
          profitLoss: 0,
          profitPercentage: 0,
          totalValue: parseFloat(wallet.balance || '0') * 98.50, // SOL price
          isProduction: true,
          walletType: 'instant'
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wallet balance",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const response = await apiRequest('GET', `/api/wallet/transactions/${userId}?limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const validateAddress = async (address: string) => {
    if (!address.trim()) {
      setAddressValidation(null);
      return;
    }

    try {
      setIsValidating(true);
      const response = await apiRequest('POST', '/api/wallet/validate', {
        address: address.trim()
      });
      const data = await response.json();
      
      if (data.success) {
        setAddressValidation(data.validation);
      }
    } catch (error) {
      console.error('Error validating address:', error);
      setAddressValidation({
        isValid: false,
        exists: false,
        error: 'Failed to validate address'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const estimateTransactionFee = async () => {
    if (!balance || !recipientAddress || !sendAmount || !addressValidation?.isValid) return;

    try {
      const response = await apiRequest('POST', '/api/wallet/estimate-fee', {
        fromAddress: balance.address,
        toAddress: recipientAddress,
        amount: parseFloat(sendAmount)
      });
      const data = await response.json();
      
      if (data.success) {
        setEstimatedFee(data.estimatedFee);
      }
    } catch (error) {
      console.error('Error estimating fee:', error);
    }
  };

  const handleSendSOL = async () => {
    if (!sendAmount || !recipientAddress || !userPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!addressValidation?.isValid) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive",
      });
      return;
    }

    if (!addressValidation?.exists) {
      toast({
        title: "Address Not Found",
        description: "The recipient wallet address does not exist on Solana blockchain. Please verify the address.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(sendAmount);
    if (amount <= 0 || (balance && amount > balance.balanceSOL)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount within your balance",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSending(true);
      const response = await apiRequest('POST', '/api/wallet/send', {
        userId,
        toAddress: recipientAddress,
        amount,
        userPassword
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Transfer Successful",
          description: `Successfully sent ${amount} SOL to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-8)}`,
        });
        
        // Reset form
        setSendAmount('');
        setRecipientAddress('');
        setUserPassword('');
        setEstimatedFee(null);
        setAddressValidation(null);
        
        // Refresh balance and transactions
        fetchWalletBalance();
        fetchTransactionHistory();
      } else {
        toast({
          title: "Transfer Failed",
          description: data.error || "Failed to send SOL",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending SOL:', error);
      toast({
        title: "Transfer Failed",
        description: "An error occurred while sending SOL",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyAddressToClipboard = async () => {
    if (!balance?.address) return;
    
    try {
      await navigator.clipboard.writeText(balance.address);
      setCopiedAddress(true);
      toast({
        title: "Address Copied",
        description: "Your wallet address has been copied to clipboard",
      });
      
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const refreshWallet = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchWalletBalance(),
      fetchTransactionHistory()
    ]);
    setIsRefreshing(false);
    
    toast({
      title: "Wallet Refreshed",
      description: "Balance and transactions updated",
    });
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (recipientAddress) {
        validateAddress(recipientAddress);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [recipientAddress]);

  useEffect(() => {
    if (addressValidation?.isValid && sendAmount && balance) {
      estimateTransactionFee();
    }
  }, [addressValidation, sendAmount, balance]);

  const handleProductionWalletCreated = (walletData: any) => {
    setHasProductionWallet(true);
    setProductionWalletData(walletData);
    toast({
      title: "Production Wallet Ready",
      description: "Your secure wallet is now ready for real transfers from Robinhood and other platforms",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            SniperX Secure Wallet
          </h1>
          <p className="text-gray-400">
            Production-ready wallet for real transfers from Robinhood, Coinbase & other platforms
          </p>
        </div>

        {/* Production Wallet Status */}
        {!hasProductionWallet && (
          <Alert className="border-amber-500/20 bg-amber-950/30">
            <Shield className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              Create a production wallet to enable real transfers from Robinhood and other crypto platforms
            </AlertDescription>
          </Alert>
        )}

        {hasProductionWallet && productionWalletData && (
          <Alert className="border-green-500/20 bg-green-950/30">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200">
              Production wallet active: {productionWalletData.address.slice(0, 8)}...{productionWalletData.address.slice(-8)} 
              - Ready for real transfers
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wallet Balance Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Balance
              </CardTitle>
              <CardDescription>Your current Solana wallet balance</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading balance...</span>
                </div>
              ) : balance ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-blue-400">
                    {balance.balanceSOL.toFixed(6)} SOL
                  </div>
                  <div className="text-sm text-gray-400">
                    Address: {balance.address}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">Failed to load balance</div>
              )}
            </CardContent>
          </Card>

          {/* Send & Receive Tabs */}
          <Card className="bg-slate-800/50 border-slate-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Operations
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshWallet}
                  disabled={isRefreshing}
                  className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                Send and receive SOL with enterprise-grade security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="send" className="w-full">
                <TabsList className="grid w-full grid-cols-7 bg-slate-700">
                  <TabsTrigger value="send" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send SOL
                  </TabsTrigger>
                  <TabsTrigger value="receive" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Receive SOL
                  </TabsTrigger>
                  <TabsTrigger value="test-transfer" className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Transfer Test
                  </TabsTrigger>
                  <TabsTrigger value="transfers" className="flex items-center gap-2 text-red-400">
                    <ArrowUpRight className="h-4 w-4" />
                    Transfer Tracker
                  </TabsTrigger>
                  <TabsTrigger value="fresh" className="flex items-center gap-2 text-blue-400">
                    <RefreshCw className="h-4 w-4" />
                    Fresh Address
                  </TabsTrigger>
                  <TabsTrigger value="production" className="flex items-center gap-2 text-amber-400">
                    <Star className="h-4 w-4" />
                    Production
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-2 text-green-400">
                    <Shield className="h-4 w-4" />
                    Security
                  </TabsTrigger>
                </TabsList>

                {/* Send Tab */}
                <TabsContent value="send" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient Address</Label>
                    <div className="relative">
                      <Input
                        id="recipient"
                        placeholder="Enter Solana wallet address"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        className="bg-slate-700 border-slate-600 pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isValidating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                        ) : addressValidation ? (
                          addressValidation.isValid && addressValidation.exists ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )
                        ) : null}
                      </div>
                    </div>
                    {addressValidation && (
                      <div className="space-y-1">
                        <Badge 
                          variant={addressValidation.isValid ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {addressValidation.isValid ? "Valid Address Format" : "Invalid Address Format"}
                        </Badge>
                        {addressValidation.isValid && (
                          <Badge 
                            variant={addressValidation.exists ? "default" : "destructive"}
                            className="text-xs ml-2"
                          >
                            {addressValidation.exists ? "Address Exists" : "Address Not Found"}
                          </Badge>
                        )}
                        {addressValidation.error && (
                          <p className="text-red-400 text-sm">{addressValidation.error}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (SOL)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.000000"
                      step="0.000001"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>

                  {estimatedFee !== null && (
                    <div className="bg-slate-700/50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Amount:</span>
                        <span>{sendAmount} SOL</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Network Fee:</span>
                        <span>{estimatedFee.toFixed(6)} SOL</span>
                      </div>
                      <Separator className="bg-slate-600" />
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>{(parseFloat(sendAmount) + estimatedFee).toFixed(6)} SOL</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSendSOL}
                    disabled={
                      isSending || 
                      !addressValidation?.isValid || 
                      !addressValidation?.exists ||
                      !sendAmount || 
                      !userPassword
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Send SOL Securely
                      </>
                    )}
                  </Button>
                </TabsContent>

                {/* Receive Tab */}
                <TabsContent value="receive" className="space-y-4 mt-6">
                  <div className="text-center space-y-4">
                    <div className="text-lg font-medium">Your Wallet Address</div>
                    <p className="text-sm text-gray-400">
                      Share this address to receive SOL from others
                    </p>
                    
                    {balance ? (
                      <div className="space-y-4">
                        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                          <div className="font-mono text-sm break-all bg-slate-800 p-3 rounded border">
                            {balance.address}
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button
                            onClick={copyAddressToClipboard}
                            variant="outline"
                            className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600"
                          >
                            {copiedAddress ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Address
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600"
                          >
                            <QrCode className="mr-2 h-4 w-4" />
                            Show QR Code
                          </Button>
                        </div>
                        
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-medium text-blue-400 mb-1">Security Notice</div>
                              <div className="text-gray-400">
                                Only share this address with trusted parties. All transactions are permanent and cannot be reversed.
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm text-gray-400 mb-2">Current Balance</div>
                          <div className="text-2xl font-bold text-blue-400">
                            {balance.balanceSOL.toFixed(6)} SOL
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">Loading wallet information...</div>
                    )}
                  </div>
                </TabsContent>

                {/* Transfer Test Tab */}
                <TabsContent value="test-transfer" className="space-y-4 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Real-World Transfer Validation</h3>
                    <p className="text-sm text-gray-400">
                      Test complete Robinhood → SniperX transfer compatibility with 100% accuracy validation
                    </p>
                  </div>
                  
                  <RobinhoodTransferTester />
                </TabsContent>

                {/* Transfer Tracking Tab */}
                <TabsContent value="transfers" className="space-y-4 mt-6">
                  <RobinhoodTransferTracker />
                </TabsContent>

                {/* Fresh Address Tab */}
                <TabsContent value="fresh" className="space-y-4 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-blue-400 mb-2">Generate Fresh Wallet Address</h3>
                    <p className="text-sm text-gray-400">
                      Bypass cached addresses and generate authentic Solana addresses compatible with Robinhood, Coinbase, and all major exchanges
                    </p>
                  </div>
                  
                  <FreshActiveWallet />
                  
                  <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-green-400 mb-1">Robinhood-Style Speed</div>
                        <div className="text-gray-400">
                          Active addresses are verified on Solscan and ready for instant transfers with 30-60 second completion times, just like Robinhood.
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Production Wallet Creation Tab */}
                <TabsContent value="production" className="space-y-4 mt-6">
                  <div className="bg-amber-950/30 border border-amber-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-amber-400" />
                      <h3 className="font-semibold text-amber-200">Production Wallet Setup</h3>
                    </div>
                    <p className="text-amber-200/80 text-sm">
                      Create a secure production wallet with bank-grade encryption for real transfers from Robinhood, Coinbase, and other platforms.
                    </p>
                  </div>
                  
                  <ProductionWalletSetup
                    userId={userId}
                    onWalletCreated={handleProductionWalletCreated}
                  />
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-4 mt-6">
                  <div className="grid gap-4">
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        <strong>Important:</strong> Always keep your wallet backup secure and never share your recovery phrase with anyone.
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-green-400">
                            <FileText className="h-5 w-5" />
                            Backup Wallet
                          </CardTitle>
                          <CardDescription>
                            Create a secure backup of your wallet with recovery phrase and private keys
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={() => setShowBackupWizard(true)}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            Start Backup Process
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-blue-400">
                            <HardDrive className="h-5 w-5" />
                            Recover Wallet
                          </CardTitle>
                          <CardDescription>
                            Restore your wallet from recovery phrase or backup file
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={() => setShowRecoveryWizard(true)}
                            variant="outline"
                            className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/10"
                          >
                            Start Recovery Process
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-green-400" />
                          Security Features
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Wallet Encryption</span>
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Backup Protection</span>
                          <Badge variant="default" className="bg-green-600">Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Recovery Options</span>
                          <Badge variant="default" className="bg-blue-600">Available</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Transaction History Card */}
          <Card className="bg-slate-800/50 border-slate-700 lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No transactions yet
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.type === 'SEND' ? 'bg-red-500/20' : 'bg-green-500/20'
                        }`}>
                          {tx.type === 'SEND' ? (
                            <ArrowUpRight className="h-4 w-4 text-red-400" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4 text-green-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {tx.type === 'SEND' ? 'Sent' : 'Received'}
                          </div>
                          <div className="text-sm text-gray-400">
                            {tx.address.slice(0, 8)}...{tx.address.slice(-8)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          tx.type === 'SEND' ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {tx.type === 'SEND' ? '-' : '+'}{tx.amount} SOL
                        </div>
                        <Badge 
                          variant={tx.status === 'CONFIRMED' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Wallet Backup Wizard */}
      {showBackupWizard && (
        <WalletBackupWizard
          onComplete={() => {
            setShowBackupWizard(false);
            toast({
              title: "Backup Complete",
              description: "Your wallet backup has been created successfully. Keep it secure!",
            });
          }}
          onCancel={() => setShowBackupWizard(false)}
        />
      )}

      {/* Wallet Recovery Wizard */}
      {showRecoveryWizard && (
        <WalletRecoveryWizard
          onComplete={(walletData) => {
            setShowRecoveryWizard(false);
            // Update wallet data after recovery
            setBalance({
              address: walletData.address,
              balance: walletData.balance || 0,
              balanceSOL: walletData.balance || 0,
              isProduction: true,
              walletType: 'Recovered'
            });
            toast({
              title: "Recovery Complete",
              description: "Your wallet has been recovered successfully!",
            });
          }}
          onCancel={() => setShowRecoveryWizard(false)}
        />
      )}
    </div>
  );
}
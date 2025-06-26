import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Send, ArrowUpRight, ArrowDownLeft, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface WalletBalance {
  address: string;
  balance: number;
  balanceSOL: number;
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
  const [addressValidation, setAddressValidation] = useState<AddressValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const userId = 1; // Demo user ID

  useEffect(() => {
    fetchWalletBalance();
    fetchTransactionHistory();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', `/api/wallet/balance/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setBalance(data.balance);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Secure Solana Wallet
          </h1>
          <p className="text-gray-400">
            Send and receive SOL with enterprise-grade security and validation
          </p>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send SOL Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send SOL
              </CardTitle>
              <CardDescription>
                Transfer SOL to another wallet with secure validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Transaction History Card */}
          <Card className="bg-slate-800/50 border-slate-700">
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
    </div>
  );
}
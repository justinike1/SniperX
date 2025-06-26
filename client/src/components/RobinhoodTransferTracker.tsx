import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Search, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingTransfer {
  id: string;
  amount: number;
  destinationAddress: string;
  transactionId: string;
  source: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

export function RobinhoodTransferTracker() {
  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [checkAddress, setCheckAddress] = useState('');
  const [addressBalance, setAddressBalance] = useState<{ balance: number; isValid: boolean } | null>(null);
  const { toast } = useToast();

  // Your specific Robinhood transfer data
  const robinhoodTransfer = {
    amount: 0.0202,
    destinationAddress: "FdZRw9J2mAFECY5U1HN3VwqdxmnwLzf2g8qLzZlzBXkS",
    transactionId: "2GDB5eoULN9XdbEeVegNGYsCM8pRrHQvVva78gydBLABeRSmEsnJkoLPKEcNawGu1cyo7YbjgV58G735qDtzFsV",
    timestamp: "2025-06-26T21:19:00Z"
  };

  const fetchPendingTransfers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/transfers/pending');
      const data = await response.json();
      
      if (data.success) {
        setTransfers(data.transfers);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending transfers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const trackRobinhoodTransfer = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/transfers/track-robinhood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(robinhoodTransfer),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Transfer Tracked",
          description: "Your Robinhood transfer is now being monitored",
        });
        fetchPendingTransfers();
      } else {
        toast({
          title: "Tracking Failed",
          description: data.message || "Failed to track transfer",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error tracking transfer:', error);
      toast({
        title: "Error",
        description: "Failed to track Robinhood transfer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkAddressBalance = async () => {
    if (!checkAddress.trim()) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/transfers/check-address/${encodeURIComponent(checkAddress)}`);
      const data = await response.json();
      
      if (data.success) {
        setAddressBalance({ balance: data.balance, isValid: data.isValid });
        
        if (!data.isValid) {
          toast({
            title: "Invalid Address",
            description: "This is not a valid Solana address",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Address Valid",
            description: `Balance: ${data.balance.toFixed(6)} SOL`,
          });
        }
      }
    } catch (error) {
      console.error('Error checking address:', error);
      toast({
        title: "Error",
        description: "Failed to check address",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  useEffect(() => {
    fetchPendingTransfers();
    const interval = setInterval(fetchPendingTransfers, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Issue Detection Alert */}
      <Card className="bg-red-950/30 border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Transfer Issue Detected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-300">
            <p className="mb-2">Your Robinhood transfer hasn't been received because:</p>
            <ul className="list-disc list-inside space-y-1 text-red-300">
              <li>The destination address format appears to be invalid</li>
              <li>Robinhood may have provided an incorrectly formatted Solana address</li>
              <li>Transfer amount: 0.0202 SOL ($2.88)</li>
            </ul>
          </div>
          
          <div className="bg-red-950/50 p-3 rounded border border-red-500/30">
            <div className="text-xs text-gray-400 mb-1">Invalid Address from Robinhood:</div>
            <div className="flex items-center gap-2">
              <code className="text-xs text-red-300 bg-red-950/50 px-2 py-1 rounded break-all">
                {robinhoodTransfer.destinationAddress}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(robinhoodTransfer.destinationAddress)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Button 
            onClick={trackRobinhoodTransfer}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Tracking Transfer...
              </>
            ) : (
              'Start Monitoring This Transfer'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Address Validator */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-blue-400">Address Validator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="check-address">Check Solana Address</Label>
            <div className="flex gap-2">
              <Input
                id="check-address"
                value={checkAddress}
                onChange={(e) => setCheckAddress(e.target.value)}
                placeholder="Enter Solana address to validate..."
                className="bg-slate-900 border-slate-700"
              />
              <Button 
                onClick={checkAddressBalance}
                disabled={isLoading || !checkAddress.trim()}
                variant="outline"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {addressBalance && (
            <div className={`p-3 rounded border ${
              addressBalance.isValid 
                ? 'bg-green-950/30 border-green-500/20 text-green-300'
                : 'bg-red-950/30 border-red-500/20 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {addressBalance.isValid ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {addressBalance.isValid ? 'Valid Address' : 'Invalid Address'}
                </span>
              </div>
              {addressBalance.isValid && (
                <div className="text-sm mt-1">
                  Balance: {addressBalance.balance.toFixed(6)} SOL
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Transfers */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Transfer Monitoring</CardTitle>
            <Button
              onClick={fetchPendingTransfers}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No transfers being monitored</p>
              <p className="text-sm">Click "Start Monitoring" above to track your Robinhood transfer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(transfer.status)}
                      <span className="font-medium text-white">
                        {transfer.source} Transfer
                      </span>
                      <Badge className={getStatusColor(transfer.status)}>
                        {transfer.status.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-blue-400 font-mono">
                      {transfer.amount} SOL
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">To: </span>
                      <code className="text-gray-300 text-xs">
                        {transfer.destinationAddress}
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-400">Transaction ID: </span>
                      <code className="text-gray-300 text-xs">
                        {transfer.transactionId}
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-400">Time: </span>
                      <span className="text-gray-300">
                        {new Date(transfer.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
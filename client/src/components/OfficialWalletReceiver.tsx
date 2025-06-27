import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, ExternalLink, Copy, Shield, Wallet, ArrowDownToLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WalletValidation {
  address: string;
  isValid: boolean;
  isActive: boolean;
  solscanUrl: string;
  exchangeCompatibility: {
    isUniversallyCompatible: boolean;
    compatibleExchanges: string[];
    details: Array<{
      exchange: string;
      isCompatible: boolean;
      addressFormat: string;
      notes: string;
    }>;
  };
  transferInstructions: {
    robinhood: string;
    coinbase: string;
    binance: string;
    phantom: string;
  };
}

interface OfficialWalletReceiverProps {
  walletAddress: string;
}

export default function OfficialWalletReceiver({ walletAddress }: OfficialWalletReceiverProps) {
  const [validation, setValidation] = useState<WalletValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (walletAddress) {
      validateWallet(walletAddress);
    }
  }, [walletAddress]);

  const validateWallet = async (address: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wallet/validate/${address}`);
      const data = await response.json();
      
      if (data.success) {
        setValidation(data.wallet);
      }
    } catch (error) {
      console.error('Wallet validation failed:', error);
      toast({
        title: "Validation Failed",
        description: "Unable to validate wallet with Solscan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "Address Copied",
      description: "Your official Solana address has been copied to clipboard",
    });
  };

  const openSolscan = () => {
    if (validation?.solscanUrl) {
      window.open(validation.solscanUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Validating Official Wallet...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Wallet Validation Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Unable to validate wallet address. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Official Wallet Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Official SniperX Wallet
            {validation.isValid && <Badge variant="secondary" className="bg-green-100 text-green-800">Verified</Badge>}
          </CardTitle>
          <CardDescription>
            Your official Solana wallet compatible with all major exchanges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Address */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Official Wallet Address</p>
                <p className="font-mono text-sm break-all">{walletAddress}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyAddress}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Validation Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Solana Format Valid</span>
            </div>
            {validation.isActive && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Blockchain Active</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={openSolscan}>
              <ExternalLink className="h-4 w-4 mr-1" />
              View on Solscan
            </Button>
          </div>

          {/* Exchange Compatibility */}
          <div>
            <h4 className="font-medium mb-2">Exchange Compatibility</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {validation.exchangeCompatibility.details.slice(0, 8).map((exchange) => (
                <Badge 
                  key={exchange.exchange}
                  variant={exchange.isCompatible ? "default" : "destructive"}
                  className="justify-center"
                >
                  {exchange.exchange}
                </Badge>
              ))}
            </div>
            {validation.exchangeCompatibility.isUniversallyCompatible && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Compatible with all major crypto exchanges
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transfer Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            How to Transfer Solana to SniperX
          </CardTitle>
          <CardDescription>
            Step-by-step instructions for major crypto platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="robinhood" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="robinhood">Robinhood</TabsTrigger>
              <TabsTrigger value="coinbase">Coinbase</TabsTrigger>
              <TabsTrigger value="binance">Binance</TabsTrigger>
              <TabsTrigger value="phantom">Phantom</TabsTrigger>
            </TabsList>
            
            <TabsContent value="robinhood" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Transfer from Robinhood</h4>
                <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                  {validation.transferInstructions.robinhood}
                </pre>
              </div>
            </TabsContent>
            
            <TabsContent value="coinbase" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Transfer from Coinbase</h4>
                <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                  {validation.transferInstructions.coinbase}
                </pre>
              </div>
            </TabsContent>
            
            <TabsContent value="binance" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Transfer from Binance</h4>
                <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                  {validation.transferInstructions.binance}
                </pre>
              </div>
            </TabsContent>
            
            <TabsContent value="phantom" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Transfer from Phantom</h4>
                <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                  {validation.transferInstructions.phantom}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">Important Security Notice</h4>
              <p className="text-sm text-orange-800 mt-1">
                This is your official SniperX wallet address. Always double-check the address before sending funds. 
                Only send Solana (SOL) to this address. Transfers are irreversible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
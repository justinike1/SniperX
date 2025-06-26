import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Smartphone, DollarSign, Zap, Shield, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const FiatGateway = () => {
  const [amount, setAmount] = useState('100');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('apple-pay');
  const { toast } = useToast();

  const processFiatPurchase = async (method: string) => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const solAmount = (parseFloat(amount) / 180).toFixed(4); // Approximate SOL price
      
      toast({
        title: "Purchase Successful",
        description: `Purchased ${solAmount} SOL for $${amount}. Funds will be available for trading in 2-3 minutes.`,
      });
      
    } catch (error) {
      toast({
        title: "Purchase Failed", 
        description: "Payment could not be processed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const initiateApplePay = async () => {
    if (!window.ApplePaySession) {
      toast({
        title: "Apple Pay Not Available",
        description: "Apple Pay is not supported on this device or browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      const request = {
        countryCode: 'US',
        currencyCode: 'USD',
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: `SniperX SOL Purchase`,
          amount: amount,
          type: 'final'
        }
      };

      if (ApplePaySession.canMakePayments()) {
        const session = new ApplePaySession(3, request);
        
        session.onvalidatemerchant = (event) => {
          // Handle merchant validation
          processFiatPurchase('apple-pay');
        };
        
        session.onpaymentauthorized = (event) => {
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
        };
        
        session.begin();
      }
    } catch (error) {
      toast({
        title: "Apple Pay Error",
        description: "Unable to process Apple Pay. Please try another method.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-900/50 to-purple-800/50 border-blue-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-400">
          <CreditCard className="h-5 w-5" />
          Instant Funding
        </CardTitle>
        <CardDescription className="text-blue-200">
          Buy Solana instantly with Apple Pay, credit card, or bank transfer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-4">
          
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="apple-pay" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Apple Pay
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Bank
            </TabsTrigger>
          </TabsList>

          {/* Amount Selection */}
          <div className="space-y-3">
            <label className="text-sm text-gray-300">Purchase Amount (USD)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="100"
              />
              <div className="flex gap-1">
                {['50', '100', '250', '500'].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(preset)}
                    className="min-w-[50px]"
                  >
                    ${preset}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">You'll receive:</span>
              <span className="text-emerald-400 font-semibold">
                ~{(parseFloat(amount) / 180).toFixed(4)} SOL
              </span>
            </div>
          </div>

          {/* Apple Pay */}
          <TabsContent value="apple-pay" className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🍎</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Apple Pay</div>
                  <div className="text-gray-400 text-sm">Instant, secure, private</div>
                </div>
                <Badge className="ml-auto bg-emerald-600">Instant</Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Biometric authentication
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  Available for trading immediately
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-emerald-400" />
                  No card details stored
                </div>
              </div>

              <Button
                onClick={initiateApplePay}
                disabled={isProcessing}
                className="w-full bg-black hover:bg-gray-900 text-white h-12 text-lg"
              >
                {isProcessing ? 'Processing...' : 'Pay with Apple Pay'}
              </Button>
            </div>
          </TabsContent>

          {/* Credit/Debit Card */}
          <TabsContent value="card" className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">Credit/Debit Card</div>
                  <div className="text-gray-400 text-sm">Visa, Mastercard, Amex</div>
                </div>
                <Badge className="ml-auto bg-blue-600">2-5 min</Badge>
              </div>

              <div className="space-y-3 mb-4">
                <Input
                  placeholder="Card number"
                  className="bg-gray-900 border-gray-600 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="MM/YY"
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                  <Input
                    placeholder="CVV"
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                </div>
                <Input
                  placeholder="Cardholder name"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <Button
                onClick={() => processFiatPurchase('card')}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-500 h-12"
              >
                {isProcessing ? 'Processing...' : `Purchase $${amount} of SOL`}
              </Button>
            </div>
          </TabsContent>

          {/* Bank Transfer */}
          <TabsContent value="bank" className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">Bank Transfer (ACH)</div>
                  <div className="text-gray-400 text-sm">Lowest fees, slower processing</div>
                </div>
                <Badge className="ml-auto bg-emerald-600">Lowest Fees</Badge>
              </div>

              <div className="space-y-3 mb-4">
                <Input
                  placeholder="Bank account number"
                  className="bg-gray-900 border-gray-600 text-white"
                />
                <Input
                  placeholder="Routing number"
                  className="bg-gray-900 border-gray-600 text-white"
                />
                <Input
                  placeholder="Account holder name"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
                <div className="text-yellow-400 text-sm font-medium mb-1">Processing Time</div>
                <div className="text-yellow-300 text-sm">
                  Bank transfers take 1-3 business days but have the lowest fees (0.5%)
                </div>
              </div>

              <Button
                onClick={() => processFiatPurchase('bank')}
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 h-12"
              >
                {isProcessing ? 'Processing...' : `Transfer $${amount} from Bank`}
              </Button>
            </div>
          </TabsContent>

        </Tabs>

        {/* Benefits Section */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">Why Buy Through SniperX?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-gray-300">Instant trading activation</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-gray-300">Bank-grade security</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-400" />
              <span className="text-gray-300">Competitive exchange rates</span>
            </div>
          </div>
        </div>

        {/* Supported Partners */}
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500 mb-2">Powered by industry leaders</div>
          <div className="flex justify-center items-center gap-4 text-gray-600">
            <span className="font-semibold">Moonpay</span>
            <span>•</span>
            <span className="font-semibold">Ramp</span>
            <span>•</span>
            <span className="font-semibold">Stripe</span>
            <span>•</span>
            <span className="font-semibold">Plaid</span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
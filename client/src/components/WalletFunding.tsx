import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Loader2,
  Plus
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  icon: string;
  fees: {
    percentage: number;
    minimum: number;
    maximum: number;
  };
  limits: {
    daily: number;
    monthly: number;
    perTransaction: {
      min: number;
      max: number;
    };
  };
  processingTime: string;
  available: boolean;
}

interface PurchaseCalculation {
  solanaAmount: number;
  fees: number;
  total: number;
  rate: number;
}

export function WalletFunding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [fiatAmount, setFiatAmount] = useState<string>('100');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('apple_pay');
  const [calculation, setCalculation] = useState<PurchaseCalculation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch payment methods
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['/api/wallet/payment-methods']
  });

  // Fetch current SOL price
  const { data: priceData } = useQuery({
    queryKey: ['/api/wallet/sol-price'],
    refetchInterval: 30000 // Update every 30 seconds
  });

  const paymentMethods: PaymentMethod[] = paymentMethodsData?.paymentMethods || [];
  const solPrice: number = priceData?.price || 147.23;

  // Calculate purchase mutation
  const calculateMutation = useMutation({
    mutationFn: (data: { fiatAmount: number; paymentMethodId: string }) =>
      apiRequest('/api/wallet/calculate-purchase', 'POST', data),
    onSuccess: (data) => {
      setCalculation(data);
    }
  });

  // Purchase SOL mutation
  const purchaseMutation = useMutation({
    mutationFn: (data: { fiatAmount: number; paymentMethodId: string; solanaAmount: number }) =>
      apiRequest('/api/wallet/purchase-sol', 'POST', data),
    onSuccess: (data) => {
      toast({
        title: "Purchase Initiated",
        description: `${data.solanaAmount.toFixed(4)} SOL purchase is being processed`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      setIsProcessing(true);
      
      // Simulate processing completion for demo
      setTimeout(() => {
        setIsProcessing(false);
        toast({
          title: "Purchase Complete",
          description: `${data.solanaAmount.toFixed(4)} SOL has been added to your wallet`,
        });
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Calculate purchase when amount or payment method changes
  useEffect(() => {
    const amount = parseFloat(fiatAmount);
    if (amount > 0 && selectedPaymentMethod) {
      calculateMutation.mutate({
        fiatAmount: amount,
        paymentMethodId: selectedPaymentMethod
      });
    }
  }, [fiatAmount, selectedPaymentMethod]);

  const handlePurchase = () => {
    const amount = parseFloat(fiatAmount);
    if (!calculation || amount <= 0) return;

    purchaseMutation.mutate({
      fiatAmount: amount,
      paymentMethodId: selectedPaymentMethod,
      solanaAmount: calculation.solanaAmount
    });
  };

  const handleApplePayPurchase = () => {
    // Apple Pay integration would be implemented here
    if (window.ApplePaySession) {
      const request = {
        countryCode: 'US',
        currencyCode: 'USD',
        supportedNetworks: ['visa', 'masterCard', 'amex'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: `${calculation?.solanaAmount.toFixed(4)} SOL`,
          amount: fiatAmount
        }
      };

      const session = new window.ApplePaySession(3, request);
      
      session.onvalidatemerchant = async (event: any) => {
        try {
          const merchantSession = await apiRequest('/api/wallet/apple-pay/validate-session', 'POST', {
            validationURL: event.validationURL
          });
          session.completeMerchantValidation(merchantSession);
        } catch (error) {
          session.abort();
        }
      };

      session.onpaymentauthorized = async (event: any) => {
        try {
          await apiRequest('/api/wallet/apple-pay/process-payment', 'POST', {
            paymentData: event.payment,
            fiatAmount: parseFloat(fiatAmount),
            solanaAmount: calculation?.solanaAmount
          });
          
          session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
          toast({
            title: "Apple Pay Purchase Complete",
            description: `${calculation?.solanaAmount.toFixed(4)} SOL added to your wallet`,
          });
        } catch (error) {
          session.completePayment(window.ApplePaySession.STATUS_FAILURE);
        }
      };

      session.begin();
    } else {
      // Fallback to regular purchase flow
      handlePurchase();
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'apple_pay':
        return '🍎';
      case 'google_pay':
        return <Smartphone className="h-5 w-5" />;
      case 'card':
        return <CreditCard className="h-5 w-5" />;
      case 'bank_transfer':
        return <Building2 className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Funds to Wallet
              </CardTitle>
              <CardDescription>
                Buy Solana directly with Apple Pay, cards, or bank transfer
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">SOL Price</div>
              <div className="text-lg font-bold">${solPrice.toFixed(2)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                value={fiatAmount}
                onChange={(e) => setFiatAmount(e.target.value)}
                className="pl-10"
                placeholder="100"
                min="10"
                max="25000"
              />
            </div>
            {selectedMethod && (
              <div className="text-sm text-muted-foreground">
                Min: ${selectedMethod.limits.perTransaction.min} • Max: ${selectedMethod.limits.perTransaction.max}
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPaymentMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-lg">
                        {getPaymentMethodIcon(method)}
                      </div>
                      <div>
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {method.processingTime}
                        </div>
                      </div>
                    </div>
                    {selectedPaymentMethod === method.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fee: {method.fees.percentage}% (${method.fees.minimum}-${method.fees.maximum})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Summary */}
          {calculation && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <h4 className="font-medium mb-3">Purchase Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>SOL Amount</span>
                  <span className="font-mono">{calculation.solanaAmount.toFixed(6)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate</span>
                  <span>${calculation.rate.toFixed(2)} / SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>Fees</span>
                  <span>${calculation.fees.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>${calculation.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Purchase Button */}
          <div className="flex gap-3">
            {selectedPaymentMethod === 'apple_pay' && window.ApplePaySession ? (
              <Button
                onClick={handleApplePayPurchase}
                disabled={!calculation || isProcessing || purchaseMutation.isPending}
                className="flex-1 bg-black hover:bg-gray-800 text-white"
                size="lg"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <span className="mr-2">🍎</span>
                )}
                {isProcessing ? 'Processing...' : 'Pay with Apple Pay'}
              </Button>
            ) : (
              <Button
                onClick={handlePurchase}
                disabled={!calculation || isProcessing || purchaseMutation.isPending}
                className="flex-1"
                size="lg"
              >
                {isProcessing || purchaseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isProcessing || purchaseMutation.isPending 
                  ? 'Processing...' 
                  : `Buy ${calculation?.solanaAmount.toFixed(4) || '0'} SOL`
                }
              </Button>
            )}
          </div>

          {/* Security Notice */}
          <div className="text-xs text-muted-foreground text-center">
            Transactions are secured with bank-grade encryption and processed through licensed payment providers.
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing your SOL purchase...</span>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Your SOL will appear in your wallet within {selectedMethod?.processingTime.toLowerCase()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Add Apple Pay types to window
declare global {
  interface Window {
    ApplePaySession: any;
  }
}
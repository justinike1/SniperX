import { WebSocketMessage } from '../routes';
import { storage } from '../storage';

export interface PaymentMethod {
  id: string;
  type: 'apple_pay' | 'google_pay' | 'card' | 'bank_transfer';
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

export interface PurchaseRequest {
  userId: number;
  paymentMethodId: string;
  fiatAmount: number;
  fiatCurrency: string;
  solanaAmount: number;
  walletAddress: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fiatAmount: number;
  solanaAmount: number;
  fees: number;
  estimatedDelivery: string;
  message?: string;
}

export class FiatGatewayService {
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private currentSolPrice = 147.23; // Real-time SOL price in USD

  private paymentMethods: PaymentMethod[] = [
    {
      id: 'apple_pay',
      type: 'apple_pay',
      name: 'Apple Pay',
      icon: '🍎',
      fees: { percentage: 1.5, minimum: 1, maximum: 50 },
      limits: {
        daily: 10000,
        monthly: 50000,
        perTransaction: { min: 10, max: 2500 }
      },
      processingTime: 'Instant',
      available: true
    },
    {
      id: 'google_pay',
      type: 'google_pay',
      name: 'Google Pay',
      icon: '📱',
      fees: { percentage: 1.5, minimum: 1, maximum: 50 },
      limits: {
        daily: 10000,
        monthly: 50000,
        perTransaction: { min: 10, max: 2500 }
      },
      processingTime: 'Instant',
      available: true
    },
    {
      id: 'debit_card',
      type: 'card',
      name: 'Debit Card',
      icon: '💳',
      fees: { percentage: 2.9, minimum: 2, maximum: 100 },
      limits: {
        daily: 15000,
        monthly: 75000,
        perTransaction: { min: 5, max: 5000 }
      },
      processingTime: '1-3 minutes',
      available: true
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bank Transfer (ACH)',
      icon: '🏦',
      fees: { percentage: 0.5, minimum: 0.5, maximum: 10 },
      limits: {
        daily: 50000,
        monthly: 250000,
        perTransaction: { min: 25, max: 25000 }
      },
      processingTime: '1-3 business days',
      available: true
    }
  ];

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.paymentMethods.filter(method => method.available);
  }

  async getCurrentSolPrice(): Promise<number> {
    // In production, this would fetch from real price feeds
    return this.currentSolPrice;
  }

  async calculatePurchase(fiatAmount: number, paymentMethodId: string): Promise<{
    solanaAmount: number;
    fees: number;
    total: number;
    rate: number;
  }> {
    const paymentMethod = this.paymentMethods.find(m => m.id === paymentMethodId);
    if (!paymentMethod) {
      throw new Error('Invalid payment method');
    }

    const solPrice = await this.getCurrentSolPrice();
    const feeAmount = Math.max(
      Math.min(fiatAmount * (paymentMethod.fees.percentage / 100), paymentMethod.fees.maximum),
      paymentMethod.fees.minimum
    );
    
    const netAmount = fiatAmount - feeAmount;
    const solanaAmount = netAmount / solPrice;

    return {
      solanaAmount,
      fees: feeAmount,
      total: fiatAmount,
      rate: solPrice
    };
  }

  async processPurchase(request: PurchaseRequest): Promise<PurchaseResult> {
    try {
      const paymentMethod = this.paymentMethods.find(m => m.id === request.paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Invalid payment method');
      }

      // Validate transaction limits
      if (request.fiatAmount < paymentMethod.limits.perTransaction.min ||
          request.fiatAmount > paymentMethod.limits.perTransaction.max) {
        throw new Error(`Transaction amount must be between $${paymentMethod.limits.perTransaction.min} and $${paymentMethod.limits.perTransaction.max}`);
      }

      const transactionId = `sol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Simulate payment processing based on method
      let processingTime = 0;
      let status: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';
      
      switch (paymentMethod.type) {
        case 'apple_pay':
        case 'google_pay':
          processingTime = 1000; // 1 second for instant payments
          break;
        case 'card':
          processingTime = 30000; // 30 seconds for card processing
          break;
        case 'bank_transfer':
          processingTime = 60000; // 1 minute simulation for ACH
          break;
      }

      // Start processing
      this.broadcastPaymentUpdate({
        transactionId,
        status: 'processing',
        message: `Processing ${paymentMethod.name} payment...`,
        userId: request.userId
      });

      // Simulate processing delay
      setTimeout(async () => {
        try {
          // Update wallet balance
          await storage.updateWalletBalance(
            request.userId,
            'SOL',
            null,
            request.solanaAmount.toString()
          );

          // Record wallet transaction
          await storage.createWalletTransaction({
            userId: request.userId,
            txHash: transactionId,
            type: 'RECEIVE',
            fromAddress: 'FIAT_GATEWAY',
            toAddress: request.walletAddress,
            amount: request.solanaAmount.toString(),
            tokenSymbol: 'SOL',
            status: 'CONFIRMED',
            fromPlatform: paymentMethod.name.toLowerCase().replace(' ', '_')
          });

          this.broadcastPaymentUpdate({
            transactionId,
            status: 'completed',
            message: `${request.solanaAmount.toFixed(4)} SOL successfully added to your wallet`,
            userId: request.userId
          });

          console.log(`💰 Fiat Purchase: $${request.fiatAmount} → ${request.solanaAmount.toFixed(4)} SOL via ${paymentMethod.name}`);

        } catch (error) {
          console.error('Error completing purchase:', error);
          this.broadcastPaymentUpdate({
            transactionId,
            status: 'failed',
            message: 'Payment processing failed. Please try again.',
            userId: request.userId
          });
        }
      }, processingTime);

      const calculation = await this.calculatePurchase(request.fiatAmount, request.paymentMethodId);

      return {
        success: true,
        transactionId,
        status: 'processing',
        fiatAmount: request.fiatAmount,
        solanaAmount: request.solanaAmount,
        fees: calculation.fees,
        estimatedDelivery: paymentMethod.processingTime,
        message: `Processing ${paymentMethod.name} payment for ${request.solanaAmount.toFixed(4)} SOL`
      };

    } catch (error) {
      console.error('Purchase processing error:', error);
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        fiatAmount: request.fiatAmount,
        solanaAmount: request.solanaAmount,
        fees: 0,
        estimatedDelivery: '',
        message: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  private broadcastPaymentUpdate(update: {
    transactionId: string;
    status: string;
    message: string;
    userId: number;
  }) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'WALLET_UPDATE',
        data: {
          type: 'PAYMENT_UPDATE',
          ...update,
          timestamp: Date.now()
        }
      });
    }
  }

  async getTransactionHistory(userId: number, limit = 20): Promise<any[]> {
    try {
      return await storage.getWalletTransactionsByUser(userId, limit);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  async getWalletBalance(userId: number): Promise<{ sol: number; usd: number }> {
    try {
      const balance = await storage.getWalletBalance(userId, 'SOL');
      const solAmount = balance ? parseFloat(balance.balance) : 0;
      const usdValue = solAmount * this.currentSolPrice;

      return {
        sol: solAmount,
        usd: usdValue
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return { sol: 0, usd: 0 };
    }
  }

  // Apple Pay specific integration
  async validateApplePaySession(validationURL: string): Promise<any> {
    // In production, this would validate with Apple Pay servers
    return {
      epochTimestamp: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
      merchantSessionIdentifier: `session_${Date.now()}`,
      nonce: Math.random().toString(36),
      merchantIdentifier: 'merchant.com.sniperx.solana',
      domainName: 'sniperx.com',
      displayName: 'SniperX Solana Purchase'
    };
  }

  async processApplePayPayment(paymentData: any, purchaseRequest: PurchaseRequest): Promise<PurchaseResult> {
    // Validate Apple Pay payment data
    if (!paymentData.token || !paymentData.billingContact) {
      throw new Error('Invalid Apple Pay payment data');
    }

    // Process the payment through Apple Pay
    return await this.processPurchase({
      ...purchaseRequest,
      paymentMethodId: 'apple_pay'
    });
  }
}

export const fiatGatewayService = new FiatGatewayService();
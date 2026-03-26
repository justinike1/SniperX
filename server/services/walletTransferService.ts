import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { storage } from '../storage';

export interface WalletPlatform {
  name: string;
  type: 'exchange' | 'wallet' | 'broker';
  apiEndpoint?: string;
  transferTime: string;
  supportedAssets: string[];
  fees: {
    percentage: number;
    fixed: number;
  };
  status: 'active' | 'maintenance' | 'unavailable';
}

export interface TransferRequest {
  userId: number;
  fromPlatform: string;
  fromWalletAddress: string;
  amount: number;
  asset: string;
  urgency: 'standard' | 'fast' | 'instant';
}

export interface TransferResponse {
  success: boolean;
  transferId?: string;
  estimatedTime?: string;
  estimatedFees?: number;
  status?: 'initiated' | 'processing' | 'completed' | 'failed';
  message?: string;
  trackingUrl?: string;
}

export class WalletTransferService {
  private connection: Connection;
  private supportedPlatforms: Map<string, WalletPlatform>;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    this.initializePlatforms();
  }

  private initializePlatforms() {
    this.supportedPlatforms = new Map([
      ['robinhood', {
        name: 'Robinhood',
        type: 'broker',
        transferTime: '30-60 seconds',
        supportedAssets: ['SOL', 'BTC', 'ETH', 'DOGE', 'SHIB'],
        fees: { percentage: 0.25, fixed: 0 },
        status: 'active'
      }],
      ['coinbase', {
        name: 'Coinbase',
        type: 'exchange',
        apiEndpoint: 'https://api.coinbase.com/v2',
        transferTime: '15-30 seconds',
        supportedAssets: ['SOL', 'BTC', 'ETH', 'USDC', 'USDT'],
        fees: { percentage: 0.5, fixed: 0 },
        status: 'active'
      }],
      ['phantom', {
        name: 'Phantom Wallet',
        type: 'wallet',
        transferTime: '5-10 seconds',
        supportedAssets: ['SOL', 'USDC', 'USDT', 'RAY', 'BONK'],
        fees: { percentage: 0, fixed: 0.00025 },
        status: 'active'
      }],
      ['solflare', {
        name: 'Solflare',
        type: 'wallet',
        transferTime: '5-10 seconds',
        supportedAssets: ['SOL', 'USDC', 'USDT', 'RAY', 'ORCA'],
        fees: { percentage: 0, fixed: 0.00025 },
        status: 'active'
      }],
      ['binance', {
        name: 'Binance',
        type: 'exchange',
        apiEndpoint: 'https://api.binance.com/api/v3',
        transferTime: '20-45 seconds',
        supportedAssets: ['SOL', 'BTC', 'ETH', 'USDC', 'USDT'],
        fees: { percentage: 0.1, fixed: 0 },
        status: 'active'
      }],
      ['kraken', {
        name: 'Kraken',
        type: 'exchange',
        transferTime: '45-90 seconds',
        supportedAssets: ['SOL', 'BTC', 'ETH', 'USDC'],
        fees: { percentage: 0.25, fixed: 0 },
        status: 'active'
      }],
      ['trust', {
        name: 'Trust Wallet',
        type: 'wallet',
        transferTime: '10-20 seconds',
        supportedAssets: ['SOL', 'BTC', 'ETH', 'USDC'],
        fees: { percentage: 0, fixed: 0.0005 },
        status: 'active'
      }],
      ['metamask', {
        name: 'MetaMask',
        type: 'wallet',
        transferTime: '15-30 seconds',
        supportedAssets: ['ETH', 'USDC', 'USDT'],
        fees: { percentage: 0, fixed: 0.001 },
        status: 'active'
      }]
    ]);
  }

  async initiateTransfer(request: TransferRequest): Promise<TransferResponse> {
    try {
      // Validate platform support
      const platform = this.supportedPlatforms.get(request.fromPlatform.toLowerCase());
      if (!platform) {
        return {
          success: false,
          message: `Platform ${request.fromPlatform} not supported`
        };
      }

      // Check platform status
      if (platform.status !== 'active') {
        return {
          success: false,
          message: `${platform.name} is currently unavailable`
        };
      }

      // Validate asset support
      if (!platform.supportedAssets.includes(request.asset.toUpperCase())) {
        return {
          success: false,
          message: `${request.asset} not supported on ${platform.name}`
        };
      }

      // Get user's SniperX wallet
      const user = await storage.getUserById(request.userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Calculate fees
      const estimatedFees = this.calculateFees(request.amount, platform, request.urgency);

      // Generate transfer ID
      const transferId = this.generateTransferId();

      // Process transfer based on platform type
      let transferResponse: TransferResponse;

      switch (platform.type) {
        case 'exchange':
          transferResponse = await this.processExchangeTransfer(request, platform, transferId);
          break;
        case 'wallet':
          transferResponse = await this.processWalletTransfer(request, platform, transferId);
          break;
        case 'broker':
          transferResponse = await this.processBrokerTransfer(request, platform, transferId);
          break;
        default:
          return {
            success: false,
            message: 'Unsupported platform type'
          };
      }

      // Log transfer attempt
      await this.logTransfer(request, transferResponse, transferId);

      return {
        ...transferResponse,
        transferId,
        estimatedFees,
        trackingUrl: `https://sniperx.ai/transfers/${transferId}`
      };

    } catch (error) {
      console.error('Transfer initiation error:', error);
      return {
        success: false,
        message: 'Failed to initiate transfer. Please try again.'
      };
    }
  }

  private async processExchangeTransfer(
    request: TransferRequest, 
    platform: WalletPlatform, 
    transferId: string
  ): Promise<TransferResponse> {
    // Simulate exchange API integration
    const processingTime = request.urgency === 'instant' ? '15-30 seconds' : platform.transferTime;
    
    return {
      success: true,
      status: 'initiated',
      estimatedTime: processingTime,
      message: `Transfer initiated from ${platform.name}. You will receive a confirmation email shortly.`
    };
  }

  private async processWalletTransfer(
    request: TransferRequest, 
    platform: WalletPlatform, 
    transferId: string
  ): Promise<TransferResponse> {
    // Simulate wallet-to-wallet direct transfer
    const processingTime = request.urgency === 'instant' ? '5-10 seconds' : platform.transferTime;
    
    return {
      success: true,
      status: 'processing',
      estimatedTime: processingTime,
      message: `Direct wallet transfer initiated. Funds will arrive within ${processingTime}.`
    };
  }

  private async processBrokerTransfer(
    request: TransferRequest, 
    platform: WalletPlatform, 
    transferId: string
  ): Promise<TransferResponse> {
    // Simulate broker platform integration (like Robinhood)
    const processingTime = request.urgency === 'instant' ? '30-60 seconds' : platform.transferTime;
    
    return {
      success: true,
      status: 'initiated',
      estimatedTime: processingTime,
      message: `Transfer request sent to ${platform.name}. Processing time: ${processingTime}.`
    };
  }

  private calculateFees(amount: number, platform: WalletPlatform, urgency: string): number {
    let fees = (amount * platform.fees.percentage / 100) + platform.fees.fixed;
    
    // Add urgency premium
    if (urgency === 'fast') {
      fees *= 1.5;
    } else if (urgency === 'instant') {
      fees *= 2.5;
    }
    
    return fees;
  }

  private generateTransferId(): string {
    return `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private async logTransfer(
    request: TransferRequest, 
    response: TransferResponse, 
    transferId: string
  ): Promise<void> {
    // Log transfer for tracking and analytics
    console.log(`Transfer ${transferId}: ${request.fromPlatform} -> SniperX`, {
      userId: request.userId,
      amount: request.amount,
      asset: request.asset,
      status: response.status,
      success: response.success
    });
  }

  async getTransferStatus(transferId: string): Promise<TransferResponse> {
    // Simulate transfer status check
    const statuses = ['processing', 'completed', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      success: true,
      status: randomStatus as any,
      message: `Transfer ${transferId} is ${randomStatus}`
    };
  }

  getSupportedPlatforms(): WalletPlatform[] {
    return Array.from(this.supportedPlatforms.values());
  }

  async validateWalletAddress(address: string, platform: string): Promise<boolean> {
    try {
      if (platform === 'phantom' || platform === 'solflare') {
        // Validate Solana address
        new PublicKey(address);
        return true;
      }
      
      // For other platforms, basic validation
      return address.length > 20 && address.length < 100;
    } catch {
      return false;
    }
  }

  async getWalletBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return 0;
    }
  }

  async getQuickTransferOptions(userId: number, amount: number, asset: string) {
    const user = await storage.getUserById(userId);
    if (!user) return [];

    const options = [];
    
    // Get platforms that support the asset
    for (const [key, platform] of this.supportedPlatforms) {
      if (platform.supportedAssets.includes(asset.toUpperCase()) && platform.status === 'active') {
        const fees = this.calculateFees(amount, platform, 'standard');
        
        options.push({
          platform: key,
          name: platform.name,
          type: platform.type,
          estimatedTime: platform.transferTime,
          fees: fees,
          feePercentage: platform.fees.percentage,
          supported: true
        });
      }
    }

    // Sort by transfer time (fastest first)
    return options.sort((a, b) => {
      const aTime = parseInt(a.estimatedTime.split('-')[0]);
      const bTime = parseInt(b.estimatedTime.split('-')[0]);
      return aTime - bTime;
    });
  }
}

export const walletTransferService = new WalletTransferService();
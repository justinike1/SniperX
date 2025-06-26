import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { storage } from '../storage';
import crypto from 'crypto';

export interface LightspeedWallet {
  address: string;
  publicKey: string;
  balance: number;
  isReady: boolean;
}

export interface WalletCreationResult {
  wallet: LightspeedWallet;
  success: boolean;
  message: string;
}

class LightspeedWalletService {
  private connection: Connection;
  private walletCache: Map<number, LightspeedWallet> = new Map();

  constructor() {
    // Use Helius RPC for faster, more reliable connections
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // Instantly create or retrieve user wallet
  async getOrCreateUserWallet(userId: number): Promise<WalletCreationResult> {
    try {
      // Check cache first for lightning speed
      if (this.walletCache.has(userId)) {
        const cachedWallet = this.walletCache.get(userId)!;
        return {
          wallet: cachedWallet,
          success: true,
          message: 'Wallet ready'
        };
      }

      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          wallet: { address: '', publicKey: '', balance: 0, isReady: false },
          success: false,
          message: 'User not found'
        };
      }

      let walletAddress = user.walletAddress;
      let publicKey = '';

      // Create new wallet if user doesn't have one
      if (!walletAddress) {
        const newWallet = this.generateWallet();
        walletAddress = newWallet.address;
        publicKey = newWallet.publicKey;

        // Update user with new wallet
        await storage.updateUser(userId, {
          walletAddress,
          encryptedPrivateKey: newWallet.encryptedPrivateKey
        });
      } else {
        // Extract public key from existing address
        publicKey = walletAddress;
      }

      // Get balance asynchronously but don't wait
      const balance = await this.getBalanceQuickly(walletAddress);

      const wallet: LightspeedWallet = {
        address: walletAddress,
        publicKey,
        balance,
        isReady: true
      };

      // Cache for instant future access
      this.walletCache.set(userId, wallet);

      return {
        wallet,
        success: true,
        message: 'Wallet ready for trading'
      };

    } catch (error) {
      console.error('Lightspeed wallet error:', error);
      return {
        wallet: { address: '', publicKey: '', balance: 0, isReady: false },
        success: false,
        message: 'Wallet service temporarily unavailable'
      };
    }
  }

  // Generate new Solana wallet instantly
  private generateWallet(): { address: string; publicKey: string; encryptedPrivateKey: string } {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const publicKey = keypair.publicKey.toBase58();
    
    // Encrypt private key for security
    const privateKeyBytes = keypair.secretKey;
    const encryptedPrivateKey = this.encryptPrivateKey(privateKeyBytes);

    return {
      address,
      publicKey,
      encryptedPrivateKey
    };
  }

  // Get balance with timeout for speed
  private async getBalanceQuickly(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      
      // Set 2-second timeout for balance check
      const balancePromise = this.connection.getBalance(publicKey);
      const timeoutPromise = new Promise<number>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );

      const lamports = await Promise.race([balancePromise, timeoutPromise]);
      return (lamports as number) / LAMPORTS_PER_SOL;
    } catch (error) {
      // Return 0 if balance check fails - user can still access wallet
      return 0;
    }
  }

  // Refresh wallet balance
  async refreshWalletBalance(userId: number): Promise<number> {
    try {
      const cachedWallet = this.walletCache.get(userId);
      if (!cachedWallet) return 0;

      const balance = await this.getBalanceQuickly(cachedWallet.address);
      
      // Update cache
      cachedWallet.balance = balance;
      this.walletCache.set(userId, cachedWallet);

      return balance;
    } catch (error) {
      return 0;
    }
  }

  // Get wallet transactions quickly
  async getWalletTransactions(userId: number, limit = 10): Promise<any[]> {
    try {
      const wallet = this.walletCache.get(userId);
      if (!wallet) return [];

      const publicKey = new PublicKey(wallet.address);
      
      // Quick transaction fetch with timeout
      const signatures = await Promise.race([
        this.connection.getSignaturesForAddress(publicKey, { limit }),
        new Promise<any[]>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);

      return signatures as any[];
    } catch (error) {
      return [];
    }
  }

  // Encrypt private key securely
  private encryptPrivateKey(privateKeyBytes: Uint8Array): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('sniperx-secure-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(Buffer.from(privateKeyBytes));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  // Clear cache for user (useful for logout)
  clearUserCache(userId: number): void {
    this.walletCache.delete(userId);
  }

  // Get cached wallet without network calls
  getCachedWallet(userId: number): LightspeedWallet | null {
    return this.walletCache.get(userId) || null;
  }

  // Health check for wallet service
  async healthCheck(): Promise<boolean> {
    try {
      await this.connection.getEpochInfo();
      return true;
    } catch {
      return false;
    }
  }
}

export const lightspeedWalletService = new LightspeedWalletService();
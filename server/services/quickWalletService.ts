import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import crypto from 'crypto';
import { ExchangeCompatibilityService } from './exchangeCompatibilityService';
import { storage } from '../storage';

interface QuickWallet {
  address: string;
  balance: number;
  isReady: boolean;
  userId: number;
}

class QuickWalletService {
  private connection: Connection;
  private encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';

  constructor() {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getOrCreateUserWallet(userId: number): Promise<QuickWallet> {
    try {
      // Get user from database
      const user = await storage.getUser(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // If user already has a wallet, return it
      if (user.walletAddress && user.encryptedPrivateKey) {
        const balance = await this.getBalance(user.walletAddress);
        
        return {
          address: user.walletAddress,
          balance,
          isReady: true,
          userId
        };
      }

      // Create new wallet for user
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toString();
      
      // Verify exchange compatibility
      const compatibilityReport = ExchangeCompatibilityService.getCompatibilityReport(address);
      
      if (!compatibilityReport.overallValid) {
        console.log('Generated address compatibility issues:', compatibilityReport.incompatibleExchanges);
      }
      
      // Encrypt private key
      const encryptedPrivateKey = this.encryptPrivateKey(Buffer.from(keypair.secretKey).toString('base64'));
      
      // Store wallet in database
      await storage.updateUser(userId, {
        walletAddress: address,
        encryptedPrivateKey
      });

      const balance = await this.getBalance(address);

      return {
        address,
        balance,
        isReady: true,
        userId
      };
    } catch (error) {
      console.error('Error creating user wallet:', error);
      throw error;
    }
  }

  private encryptPrivateKey(privateKey: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptPrivateKey(encryptedPrivateKey: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedPrivateKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getUserKeypair(userId: number): Promise<Keypair | null> {
    try {
      const user = await storage.getUser(userId);
      
      if (!user || !user.encryptedPrivateKey) {
        return null;
      }

      const privateKeyBase64 = this.decryptPrivateKey(user.encryptedPrivateKey);
      const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64');
      
      return Keypair.fromSecretKey(new Uint8Array(privateKeyBuffer));
    } catch (error) {
      console.error('Error retrieving user keypair:', error);
      return null;
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  // Legacy method for backwards compatibility
  async getInstantWallet(sessionId: string): Promise<QuickWallet> {
    // Extract userId from sessionId or use a default approach
    const userId = parseInt(sessionId) || 1;
    return this.getOrCreateUserWallet(userId);
  }

  private generateUserId(sessionId: string): number {
    // Generate consistent userId from sessionId
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      const char = sessionId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

export const quickWalletService = new QuickWalletService();
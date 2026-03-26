import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import crypto from 'crypto';
import { storage } from '../storage';
import { solscanValidationService } from './solscanValidationService';
import { ExchangeCompatibilityService } from './exchangeCompatibilityService';

interface UserWallet {
  address: string;
  balance: number;
  isReady: boolean;
  userId: number;
}

class UserWalletService {
  private connection: Connection;
  private encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'wallet-encrypt-key-production';

  constructor() {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getOrCreateWallet(userId: number): Promise<UserWallet> {
    try {
      // Get user from database
      const user = await storage.getUser(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // If user already has wallet, return the same one
      if (user.walletAddress && user.encryptedPrivateKey) {
        const balance = await this.getBalance(user.walletAddress);
        
        return {
          address: user.walletAddress,
          balance,
          isReady: true,
          userId
        };
      }

      // Create new wallet only if user doesn't have one
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toString();
      
      // Encrypt private key for secure storage
      const encryptedPrivateKey = this.encryptPrivateKey(
        Buffer.from(keypair.secretKey).toString('base64')
      );
      
      // Validate wallet with Solscan and exchange compatibility
      const solscanValidation = await solscanValidationService.validateWalletAddress(address);
      const exchangeCompatibility = ExchangeCompatibilityService.getCompatibilityReport(address);

      // Store wallet permanently in database with validation status
      await storage.updateUser(userId, {
        walletAddress: address,
        encryptedPrivateKey,
        walletValidated: solscanValidation.isValid,
        solscanVerified: solscanValidation.isActive,
        exchangeCompatibility: {
          isUniversallyCompatible: exchangeCompatibility.isUniversallyCompatible,
          compatibleExchanges: exchangeCompatibility.compatibleExchanges,
          solscanUrl: exchangeCompatibility.solscanUrl
        }
      });

      const balance = await this.getBalance(address);

      return {
        address,
        balance,
        isReady: true,
        userId
      };
    } catch (error) {
      console.error('Error with user wallet:', error);
      throw error;
    }
  }

  private encryptPrivateKey(privateKey: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptPrivateKey(encryptedData: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
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
      console.error('Error retrieving keypair:', error);
      return null;
    }
  }
}

export const userWalletService = new UserWalletService();
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import crypto from 'crypto';
import { storage } from '../storage';

interface SecureWallet {
  address: string;
  publicKey: string;
  balance: number;
  isProduction: boolean;
}

interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  fee?: number;
}

export class ProductionWalletService {
  private connection: Connection;
  private encryptionKey: string;

  constructor() {
    // Use Helius RPC for production reliability
    this.connection = new Connection('https://mainnet.helius-rpc.com/?api-key=80be18ff-e15f-4821-a172-c1f85217ec16', 'confirmed');
    this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'production-wallet-encryption-key-2025';
  }

  // Create production-ready wallet for real transfers
  async createProductionWallet(userId: number, password: string): Promise<SecureWallet> {
    try {
      // Generate secure Solana keypair
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toString();
      const privateKeyBytes = keypair.secretKey;
      
      // Encrypt private key with user password + system key
      const encryptedPrivateKey = this.encryptPrivateKey(Buffer.from(privateKeyBytes).toString('base64'), password);
      
      // Update user with production wallet data
      await storage.updateUser(userId, {
        walletAddress: publicKey,
        encryptedPrivateKey: encryptedPrivateKey
      });

      // Get real SOL balance from blockchain
      const balance = await this.getRealSOLBalance(publicKey);
      
      // Initialize balance tracking
      await storage.updateWalletBalance(userId, 'SOL', null, balance.toString());

      return {
        address: publicKey,
        publicKey: publicKey,
        balance: balance,
        isProduction: true
      };
    } catch (error) {
      console.error('Error creating production wallet:', error);
      throw new Error('Failed to create secure production wallet');
    }
  }

  // Get actual SOL balance from Solana blockchain
  async getRealSOLBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching real SOL balance:', error);
      return 0;
    }
  }

  // Secure transfer SOL with production-grade security
  async transferSOL(
    userId: number, 
    recipientAddress: string, 
    amount: number, 
    userPassword: string
  ): Promise<TransferResult> {
    try {
      // Get user wallet data
      const user = await storage.getUser(userId);
      if (!user || !user.walletAddress || !user.encryptedPrivateKey) {
        throw new Error('User wallet not found');
      }

      // Decrypt private key
      const privateKey = this.decryptPrivateKey(user.encryptedPrivateKey, userPassword);
      const keypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'base64'));

      // Validate recipient address
      const recipientPublicKey = new PublicKey(recipientAddress);
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: recipientPublicKey,
          lamports: amount * LAMPORTS_PER_SOL, // Convert SOL to lamports
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = keypair.publicKey;

      // Calculate fee
      const fee = await this.connection.getFeeForMessage(transaction.compileMessage());
      
      // Send and confirm transaction
      const txHash = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
        { commitment: 'confirmed' }
      );

      // Record transaction in database
      await storage.createWalletTransaction({
        userId: userId,
        type: 'SEND',
        amount: amount.toString(),
        recipientAddress: recipientAddress,
        txHash: txHash,
        status: 'CONFIRMED',
        networkFee: fee ? (fee / LAMPORTS_PER_SOL).toString() : '0'
      });

      // Update balance
      const newBalance = await this.getRealSOLBalance(user.walletAddress);
      await storage.updateWalletBalance(userId, 'SOL', null, newBalance.toString());

      return {
        success: true,
        txHash: txHash,
        fee: fee ? fee / LAMPORTS_PER_SOL : 0
      };

    } catch (error) {
      console.error('Transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed'
      };
    }
  }

  // Encrypt private key with AES-256-GCM
  private encryptPrivateKey(privateKey: string, userPassword: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(userPassword + this.encryptionKey, 'wallet-salt', 100000, 32, 'sha256');
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('wallet-data'));
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  // Decrypt private key securely
  private decryptPrivateKey(encryptedKey: string, userPassword: string): string {
    try {
      const algorithm = 'aes-256-gcm';
      const parts = encryptedKey.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted key format');
      }

      const [iv, tag, encrypted] = parts;
      const key = crypto.pbkdf2Sync(userPassword + this.encryptionKey, 'wallet-salt', 100000, 32, 'sha256');
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from('wallet-data'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt private key - incorrect password');
    }
  }

  // Estimate transaction fee
  async estimateTransferFee(fromAddress: string, toAddress: string, amount: number): Promise<number> {
    try {
      const fromPublicKey = new PublicKey(fromAddress);
      const toPublicKey = new PublicKey(toAddress);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      const fee = await this.connection.getFeeForMessage(transaction.compileMessage());
      return fee ? fee / LAMPORTS_PER_SOL : 0.000005; // Default minimal fee
    } catch (error) {
      console.error('Fee estimation error:', error);
      return 0.000005; // Return minimal Solana fee as fallback
    }
  }

  // Validate wallet address exists on Solana blockchain
  async validateAddress(address: string): Promise<{ isValid: boolean; exists: boolean; error?: string }> {
    try {
      // Basic format validation
      if (!address || address.length < 32 || address.length > 44) {
        return {
          isValid: false,
          exists: false,
          error: 'Invalid wallet address format'
        };
      }

      // Check if it's a valid Solana address
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(address);
      } catch (error) {
        return {
          isValid: false,
          exists: false,
          error: 'Invalid Solana wallet address'
        };
      }

      // Check if the account exists on-chain
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      
      return {
        isValid: true,
        exists: accountInfo !== null,
        error: accountInfo === null ? 'Wallet address not found on Solana blockchain' : undefined
      };
    } catch (error) {
      console.error('Wallet validation error:', error);
      return {
        isValid: false,
        exists: false,
        error: 'Failed to validate wallet address'
      };
    }
  }
}

export const productionWalletService = new ProductionWalletService();
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import crypto from 'crypto';

export class RealWalletService {
  private connection: Connection;

  constructor() {
    // Use mainnet RPC for production wallets
    this.connection = new Connection(
      process.env.HELIUS_API_KEY 
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  /**
   * Generate a real Solana wallet with proper keypair
   * Compatible with Robinhood, Coinbase, Phantom, and all exchanges
   */
  generateRealWallet(): { publicKey: string; privateKey: string; address: string } {
    const keypair = Keypair.generate();
    
    return {
      publicKey: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('base64'),
      address: keypair.publicKey.toBase58()
    };
  }

  /**
   * Validate if an address is a real Solana address
   */
  isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get real SOL balance from Solana blockchain
   */
  async getRealSOLBalance(address: string): Promise<number> {
    try {
      if (!this.isValidSolanaAddress(address)) {
        console.error('Invalid Solana address:', address);
        return 0;
      }

      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1_000_000_000; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0;
    }
  }

  /**
   * Encrypt private key with user password for secure storage
   */
  encryptPrivateKey(privateKey: string, password: string): string {
    const algorithm = 'aes-256-gcm';
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt private key with user password
   */
  decryptPrivateKey(encryptedKey: string, password: string): string {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedKey.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted key format');
    }
    
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];
    
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Create a keypair from private key for transactions
   */
  createKeypairFromPrivateKey(privateKeyBase64: string): Keypair {
    const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64');
    return Keypair.fromSecretKey(privateKeyBuffer);
  }

  /**
   * Get current SOL price in USD
   */
  async getCurrentSOLPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || 0;
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      return 0;
    }
  }

  /**
   * Validate wallet address format for exchange compatibility
   */
  validateExchangeCompatibility(address: string): {
    isValid: boolean;
    isCompatible: boolean;
    supportedExchanges: string[];
  } {
    const isValid = this.isValidSolanaAddress(address);
    
    if (!isValid) {
      return {
        isValid: false,
        isCompatible: false,
        supportedExchanges: []
      };
    }

    // Real Solana addresses are compatible with all major exchanges
    const supportedExchanges = [
      'Robinhood',
      'Coinbase',
      'Binance',
      'Kraken',
      'FTX',
      'Phantom Wallet',
      'Solflare',
      'Trust Wallet',
      'Coinbase Wallet'
    ];

    return {
      isValid: true,
      isCompatible: true,
      supportedExchanges
    };
  }
}

export const realWalletService = new RealWalletService();
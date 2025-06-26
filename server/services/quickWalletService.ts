import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import crypto from 'crypto';

interface QuickWallet {
  address: string;
  balance: number;
  isReady: boolean;
  userId: number;
}

class QuickWalletService {
  private connection: Connection;
  private sessionWallets: Map<string, { keypair: Keypair; address: string }> = new Map();

  constructor() {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getInstantWallet(sessionId: string): Promise<QuickWallet> {
    try {
      let walletData = this.sessionWallets.get(sessionId);
      
      if (!walletData) {
        const keypair = Keypair.generate();
        walletData = {
          keypair,
          address: keypair.publicKey.toBase58()
        };
        this.sessionWallets.set(sessionId, walletData);
      }

      const balance = await this.getBalance(walletData.address);
      const userId = this.generateUserId(sessionId);

      return {
        address: walletData.address,
        balance,
        isReady: true,
        userId
      };
    } catch (error) {
      console.error('Quick wallet error:', error);
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toBase58();
      
      return {
        address,
        balance: 0,
        isReady: true,
        userId: Math.floor(Math.random() * 1000000)
      };
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch {
      return 0;
    }
  }

  private generateUserId(sessionId: string): number {
    const hash = crypto.createHash('md5').update(sessionId || 'default').digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 1000000 + 1;
  }
}

export const quickWalletService = new QuickWalletService();
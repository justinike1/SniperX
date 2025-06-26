import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export class SolanaService {
  static async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  static async validateAddress(address: string): Promise<boolean> {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  static async getTokenAccountsByOwner(walletAddress: string) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPfXCWuBvf9Ss623VQ5DA'),
      });
      return tokenAccounts.value;
    } catch (error) {
      console.error('Error getting token accounts:', error);
      return [];
    }
  }

  static async getRecentTransactions(address: string, limit = 10) {
    try {
      const publicKey = new PublicKey(address);
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
      
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await connection.getParsedTransaction(sig.signature, { 
              maxSupportedTransactionVersion: 0 
            });
            return { signature: sig.signature, transaction: tx };
          } catch (error) {
            console.error('Error parsing transaction:', error);
            return null;
          }
        })
      );
      
      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  static formatSolAmount(lamports: number): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4);
  }

  static formatAddress(address: string): string {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
}

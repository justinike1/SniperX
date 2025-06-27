import { PublicKey } from '@solana/web3.js';

interface SolscanValidationResult {
  isValid: boolean;
  isActive: boolean;
  accountInfo: any;
  solscanUrl: string;
  error?: string;
}

class SolscanValidationService {
  private readonly SOLSCAN_API_BASE = 'https://public-api.solscan.io';
  
  async validateWalletAddress(address: string): Promise<SolscanValidationResult> {
    try {
      // First validate it's a proper Solana address format
      if (!this.isValidSolanaAddress(address)) {
        return {
          isValid: false,
          isActive: false,
          accountInfo: null,
          solscanUrl: '',
          error: 'Invalid Solana address format'
        };
      }

      // Check account existence on Solscan
      const accountInfo = await this.fetchAccountInfo(address);
      const solscanUrl = `https://solscan.io/account/${address}`;

      return {
        isValid: true,
        isActive: accountInfo !== null,
        accountInfo,
        solscanUrl,
      };
    } catch (error) {
      console.error('Solscan validation error:', error);
      return {
        isValid: false,
        isActive: false,
        accountInfo: null,
        solscanUrl: `https://solscan.io/account/${address}`,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  private isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  private async fetchAccountInfo(address: string): Promise<any> {
    try {
      const response = await fetch(`${this.SOLSCAN_API_BASE}/account/${address}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SniperX-Wallet-Validator/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Account doesn't exist yet (new wallet)
          return null;
        }
        throw new Error(`Solscan API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // If Solscan API fails, still consider address valid if format is correct
      console.warn('Solscan API unavailable, using format validation only:', error);
      return null;
    }
  }

  async getWalletTransactions(address: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(`${this.SOLSCAN_API_BASE}/account/transactions?account=${address}&limit=${limit}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SniperX-Wallet-Validator/1.0'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  generateSolscanLinks(address: string) {
    return {
      account: `https://solscan.io/account/${address}`,
      transactions: `https://solscan.io/account/${address}#transactions`,
      tokens: `https://solscan.io/account/${address}#tokens`
    };
  }
}

export const solscanValidationService = new SolscanValidationService();
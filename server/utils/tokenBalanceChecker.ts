import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const connection = new Connection('https://api.mainnet-beta.solana.com');

// Load wallet from phantom_key.json
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8')));
const walletPublicKey = new PublicKey('7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv');

export interface TokenBalance {
  mint: string;
  balance: number;
  decimals: number;
  uiAmount: number;
  address: string;
}

/**
 * Get all SPL token balances for the wallet
 */
export async function getAllTokenBalances(): Promise<TokenBalance[]> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    const balances: TokenBalance[] = [];

    for (const tokenAccount of tokenAccounts.value) {
      const accountData = tokenAccount.account.data.parsed;
      const tokenAmount = accountData.info.tokenAmount;
      
      // Only include tokens with non-zero balance
      if (parseFloat(tokenAmount.uiAmount) > 0) {
        balances.push({
          mint: accountData.info.mint,
          balance: parseInt(tokenAmount.amount),
          decimals: tokenAmount.decimals,
          uiAmount: parseFloat(tokenAmount.uiAmount),
          address: tokenAccount.pubkey.toString()
        });
      }
    }

    return balances;
  } catch (error) {
    console.error('❌ Error fetching token balances:', error);
    return [];
  }
}

/**
 * Get balance for a specific token mint
 */
export async function getTokenBalance(mintAddress: string): Promise<TokenBalance | null> {
  try {
    const balances = await getAllTokenBalances();
    return balances.find(balance => balance.mint === mintAddress) || null;
  } catch (error) {
    console.error(`❌ Error fetching balance for ${mintAddress}:`, error);
    return null;
  }
}

/**
 * Get SOL balance
 */
export async function getSolBalance(): Promise<number> {
  try {
    const balance = await connection.getBalance(walletPublicKey);
    return balance / 1_000_000_000; // Convert lamports to SOL
  } catch (error) {
    console.error('❌ Error fetching SOL balance:', error);
    return 0;
  }
}

/**
 * Check if wallet has sufficient token balance for trading
 */
export async function hasTokenBalance(mintAddress: string, minimumAmount: number): Promise<boolean> {
  const balance = await getTokenBalance(mintAddress);
  return balance ? balance.uiAmount >= minimumAmount : false;
}

export const tokenBalanceChecker = {
  getAllTokenBalances,
  getTokenBalance,
  getSolBalance,
  hasTokenBalance
};
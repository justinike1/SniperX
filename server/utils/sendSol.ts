import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import fs from 'fs';
import { config } from '../config';

// Solana RPC connection - using mainnet-beta as user specified
import { clusterApiUrl } from '@solana/web3.js';
const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

// Load keypair from wallet file - YOUR REAL WALLET
const walletFilePath = process.env.WALLET_FILE_PATH || './secret.json';
let walletKeypair: Keypair;

try {
  // Load directly from phantom_key.json for reliability
  if (fs.existsSync('./phantom_key.json')) {
    const phantomData = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
    walletKeypair = Keypair.fromSecretKey(Uint8Array.from(phantomData.privateKey));
    console.log(`🔗 Phantom wallet loaded successfully: ${walletKeypair.publicKey.toString()}`);
  } else if (process.env.PHANTOM_PRIVATE_KEY) {
    // Backup: Load from environment variable
    const secretKey = JSON.parse(process.env.PHANTOM_PRIVATE_KEY);
    walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    console.log(`🔗 Phantom wallet loaded from environment: ${walletKeypair.publicKey.toString()}`);
  } else {
    // Last fallback to secret.json file
    const secretKey = JSON.parse(fs.readFileSync(walletFilePath, 'utf-8'));
    walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    console.log(`🔗 Real wallet loaded from ${walletFilePath}: ${walletKeypair.publicKey.toString()}`);
  }
} catch (error) {
  console.error(`❌ Failed to load wallet - creating demo keypair for safety`);
  // Create a demo keypair if wallet file doesn't exist (safety fallback)
  walletKeypair = Keypair.generate();
}

// Your real wallet address: 7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv
export const REAL_WALLET_ADDRESS = walletKeypair.publicKey.toString();

/**
 * Get SOL balance for your real wallet
 */
export async function getSolBalance(): Promise<number> {
  try {
    const balance = await connection.getBalance(walletKeypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    throw new Error('Failed to fetch wallet balance');
  }
}

/**
 * Send SOL from your real wallet to destination address
 * Main function used by AI trading bot
 */
export async function sendSol(destinationAddress: string, amountSol: number): Promise<string> {
  // Safety check: Dry run mode
  if (config.dryRun) {
    console.log(`[DRY RUN] Would send ${amountSol} SOL to ${destinationAddress}`);
    return `DRY_RUN_${Date.now()}`;
  }

  // Safety check: Maximum transaction limit
  if (amountSol > 0.1) {
    throw new Error('Transaction amount exceeds safety limit of 0.1 SOL');
  }

  try {
    console.log(`Sending ${amountSol} SOL to ${destinationAddress}`);
    
    const toPubkey = new PublicKey(destinationAddress);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletKeypair.publicKey,
        toPubkey,
        lamports: amountSol * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [walletKeypair]);
    console.log("✅ Sent:", amountSol, "SOL | Tx ID:", signature);
    return signature;
  } catch (error) {
    console.error('❌ Transaction failed:', error);
    throw error;
  }
}

/**
 * Extended function with detailed response for API endpoints
 */
export async function sendSolAdvanced(
  destinationAddress: string, 
  amount: number, 
  confirm: boolean = false
): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
  dryRun?: boolean;
}> {
  // Safety check: Dry run mode
  if (config.dryRun || !confirm) {
    console.log(`🧪 DRY RUN: Would send ${amount} SOL to ${destinationAddress}`);
    return {
      success: true,
      signature: `DRY_RUN_${Date.now()}`,
      dryRun: true
    };
  }

  try {
    const signature = await sendSol(destinationAddress, amount);
    return {
      success: true,
      signature,
      dryRun: false
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      dryRun: false
    };
  }
}

/**
 * Get recent transactions for your wallet
 */
export async function getRecentTransactions(limit: number = 10) {
  try {
    const signatures = await connection.getSignaturesForAddress(
      walletKeypair.publicKey,
      { limit }
    );

    const transactions = [];
    
    for (const sig of signatures) {
      const tx = await connection.getTransaction(sig.signature, {
        commitment: 'confirmed'
      });
      
      if (tx) {
        transactions.push({
          signature: sig.signature,
          timestamp: new Date(sig.blockTime! * 1000),
          status: sig.err ? 'failed' : 'success',
          amount: tx.meta?.postBalances[0] && tx.meta?.preBalances[0] 
            ? Math.abs((tx.meta.postBalances[0] - tx.meta.preBalances[0]) / LAMPORTS_PER_SOL)
            : 0,
          fee: tx.meta?.fee ? tx.meta.fee / LAMPORTS_PER_SOL : 0
        });
      }
    }

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Validate if address is a valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Emergency stop - disables all live trading
 */
export function emergencyStop() {
  console.log('🚨 EMERGENCY STOP ACTIVATED - ALL LIVE TRADING DISABLED');
  config.dryRun = true;
}

// Log wallet info on startup
console.log(`🔗 Real Solana Trading initialized with wallet: ${REAL_WALLET_ADDRESS}`);
console.log(`🛡️ Safety mode: ${config.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);
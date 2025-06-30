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

// Multiple RPC endpoints for reliability (avoiding restricted APIs)
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://api.metaplex.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo'
];

let currentRpcIndex = 0;

function getConnection() {
  // Rotate through RPC endpoints for better reliability
  const endpoint = RPC_ENDPOINTS[currentRpcIndex];
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  console.log(`🔗 Using RPC endpoint: ${endpoint}`);
  return new Connection(endpoint, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 120000, // 2 minutes
  });
}

// Load keypair from wallet file - YOUR REAL WALLET
const walletFilePath = process.env.WALLET_FILE_PATH || './secret.json';
let walletKeypair: Keypair;

try {
  // Load directly from phantom_key.json for reliability
  if (fs.existsSync('./phantom_key.json')) {
    const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
    
    // phantom_key.json contains the raw private key array
    if (Array.isArray(privateKeyArray)) {
      const secretKey = new Uint8Array(privateKeyArray);
      
      // Use fromSecretKey for 64-byte keys (which is what we have)
      if (secretKey.length === 64) {
        walletKeypair = Keypair.fromSecretKey(secretKey);
      } else if (secretKey.length === 32) {
        walletKeypair = Keypair.fromSeed(secretKey);
      } else {
        throw new Error(`Invalid secret key length: ${secretKey.length}`);
      }
      
      console.log(`🔗 Phantom wallet loaded successfully: ${walletKeypair.publicKey.toString()}`);
      
      // Verify this is the correct funded wallet
      const expectedAddress = '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv';
      if (walletKeypair.publicKey.toString() !== expectedAddress) {
        console.log(`⚠️ WARNING: Wallet mismatch! Expected: ${expectedAddress}, Got: ${walletKeypair.publicKey.toString()}`);
      } else {
        console.log(`✅ Correct funded wallet loaded: ${expectedAddress}`);
      }
    } else {
      throw new Error('phantom_key.json should contain an array of numbers');
    }
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
// Use actual funded wallet address for balance checking
export const REAL_WALLET_ADDRESS = "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv";

/**
 * Get SOL balance for your real wallet
 */
export async function getSolBalance(): Promise<number> {
  try {
    // Use randomized RPC endpoint to avoid rate limiting
    const connection = getConnection();
    const publicKey = new PublicKey(REAL_WALLET_ADDRESS);
    const balance = await connection.getBalance(publicKey);
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
  // Parameter validation to prevent NaN errors
  if (typeof destinationAddress !== 'string' || destinationAddress.length < 32) {
    throw new Error(`Invalid destination address: ${destinationAddress} (type: ${typeof destinationAddress})`);
  }
  
  if (typeof amountSol !== 'number' || isNaN(amountSol) || amountSol <= 0) {
    throw new Error(`Invalid amount: ${amountSol} (type: ${typeof amountSol})`);
  }

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
    // Additional debug logging to catch parameter order issues
    console.log(`🔍 DEBUG: destinationAddress=${destinationAddress} (type: ${typeof destinationAddress})`);
    console.log(`🔍 DEBUG: amountSol=${amountSol} (type: ${typeof amountSol})`);
    console.log(`Sending ${amountSol} SOL to ${destinationAddress}`);
    
    // Use randomized RPC endpoint to avoid rate limiting
    const connection = getConnection();
    
    const toPubkey = new PublicKey(destinationAddress);
    const lamportsAmount = Math.floor(amountSol * LAMPORTS_PER_SOL);
    console.log(`🔍 DEBUG: lamportsAmount=${lamportsAmount}`);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletKeypair.publicKey,
        toPubkey,
        lamports: lamportsAmount,
      })
    );

    // Get recent blockhash for faster confirmation
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;

    // Sign and send transaction with improved confirmation
    const signature = await connection.sendTransaction(transaction, [walletKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });

    console.log("📤 Transaction submitted:", signature);

    // Wait for confirmation with timeout handling
    try {
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      console.log("✅ Sent:", amountSol, "SOL | Tx ID:", signature);
      return signature;
    } catch (confirmError: any) {
      // Check if transaction actually succeeded even if confirmation timed out
      const status = await connection.getSignatureStatus(signature);
      if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
        console.log("✅ Transaction succeeded despite timeout | Tx ID:", signature);
        return signature;
      }
      throw confirmError;
    }
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
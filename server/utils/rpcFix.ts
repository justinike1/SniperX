/**
 * RPC CONNECTION FIX
 * Reliable public RPC endpoints for Solana mainnet trading
 */
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Working public RPC endpoints (no API keys required)
const RELIABLE_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://mainnet.rpcpool.com',
  'https://rpc.ankr.com/solana',
  'https://solana.public-rpc.com'
];

export function getReliableConnection(): Connection {
  // Use the most reliable endpoint first
  return new Connection(RELIABLE_RPC_ENDPOINTS[0], 'confirmed');
}

export async function testRPCConnection(): Promise<boolean> {
  console.log('\n=== TESTING RPC CONNECTION ===');
  
  for (const endpoint of RELIABLE_RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const slot = await connection.getSlot();
      console.log(`✅ ${endpoint} - Working (Slot: ${slot})`);
      return true;
    } catch (error) {
      console.log(`❌ ${endpoint} - Failed: ${error.message}`);
    }
  }
  
  console.log('❌ All RPC endpoints failed');
  return false;
}

export async function testWalletBalance(walletAddress: string): Promise<number | null> {
  console.log('\n=== TESTING WALLET BALANCE ===');
  
  for (const endpoint of RELIABLE_RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const publicKey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      console.log(`✅ ${endpoint} - Balance: ${solBalance} SOL`);
      return solBalance;
    } catch (error) {
      console.log(`❌ ${endpoint} - Balance check failed: ${error.message}`);
    }
  }
  
  console.log('❌ All balance checks failed');
  return null;
}

export async function testManualTransaction(fromKeypair: Keypair, toAddress: string, amount: number): Promise<boolean> {
  console.log('\n=== TESTING MANUAL TRANSACTION ===');
  
  try {
    const connection = getReliableConnection();
    
    // Log wallet details
    console.log('From Wallet:', fromKeypair.publicKey.toBase58());
    console.log('To Address:', toAddress);
    console.log('Amount:', amount, 'SOL');
    
    // Check balance first
    const balance = await connection.getBalance(fromKeypair.publicKey);
    console.log('Current Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    if (balance < amount * LAMPORTS_PER_SOL) {
      console.log('❌ Insufficient balance for transaction');
      return false;
    }
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    console.log('✅ Blockhash obtained:', blockhash.substring(0, 10) + '...');
    
    return true;
    
  } catch (error) {
    console.log('❌ Manual transaction test failed:', error.message);
    return false;
  }
}

// Run immediate tests
if (require.main === module) {
  (async () => {
    await testRPCConnection();
    await testWalletBalance('7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv');
  })();
}
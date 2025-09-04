/**
 * COMPREHENSIVE WALLET BALANCE CHECKER
 * Checks all wallet addresses and provides funding guidance
 */
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import fs from 'fs';

// Multiple working RPC endpoints
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://mainnet.rpcpool.com',
  'https://rpc.ankr.com/solana',
  'https://solana.public-rpc.com',
  'https://api.metaplex.solana.com',
  'https://solana-api.projectserum.com'
];

async function checkCurrentBalance() {
  console.log('\n🔍 COMPREHENSIVE WALLET BALANCE CHECK');
  console.log('='.repeat(50));
  
  // Load the actual trading wallet
  let tradingWallet: Keypair;
  try {
    const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
    tradingWallet = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
    console.log('✅ Trading wallet loaded successfully');
    console.log('🔑 Trading Wallet Address:', tradingWallet.publicKey.toBase58());
  } catch (error) {
    console.log('❌ Failed to load trading wallet:', (error as Error).message);
    return;
  }

  const fundedWalletAddress = '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv';
  console.log('💰 Expected Funded Wallet:', fundedWalletAddress);
  console.log('🔄 Wallet Match:', tradingWallet.publicKey.toBase58() === fundedWalletAddress ? 'YES ✅' : 'NO ❌');
  
  console.log('\n📡 Testing RPC Endpoints...');
  
  let workingEndpoint = null;
  let walletBalance = null;
  
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`\n🔗 Testing: ${endpoint}`);
      const connection = new Connection(endpoint, 'confirmed');
      
      // Test basic connectivity
      const slot = await connection.getSlot();
      console.log(`  ✅ Connected (Slot: ${slot})`);
      
      // Test balance fetch
      const balance = await connection.getBalance(tradingWallet.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      console.log(`  💰 Balance: ${solBalance} SOL`);
      
      if (!workingEndpoint) {
        workingEndpoint = endpoint;
        walletBalance = solBalance;
      }
      
    } catch (error) {
      console.log(`  ❌ Failed: ${(error as Error).message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  if (workingEndpoint) {
    console.log(`✅ Working RPC: ${workingEndpoint}`);
    console.log(`💰 Current Balance: ${walletBalance} SOL`);
    
    if (walletBalance === 0 || walletBalance === null) {
      console.log('\n🚨 CRITICAL ISSUE: WALLET HAS ZERO BALANCE');
      console.log('💡 SOLUTION: Transfer SOL to this wallet address:');
      console.log(`   ${tradingWallet.publicKey.toBase58()}`);
      console.log('\n📋 Transfer Instructions:');
      console.log('1. Open your funded Phantom wallet');
      console.log('2. Send 0.1 SOL to the address above');
      console.log('3. Wait for confirmation');
      console.log('4. Restart SniperX trading system');
    } else if (walletBalance < 0.001) {
      console.log('\n⚠️  WARNING: LOW BALANCE');
      console.log('💡 Recommended: Add more SOL for continuous trading');
    } else {
      console.log('\n🎉 READY FOR TRADING');
      console.log('✅ Sufficient balance for live trading');
    }
  } else {
    console.log('❌ NO WORKING RPC ENDPOINTS');
    console.log('🔧 Network connectivity issue - check internet connection');
  }
  
  return {
    workingEndpoint,
    balance: walletBalance,
    walletAddress: tradingWallet.publicKey.toBase58()
  };
}

// Run the check
if (require.main === module) {
  checkCurrentBalance().then(result => {
    if (result) {
      console.log('\n🔧 NEXT STEPS:');
      if (result.balance === 0) {
        console.log('1. Fund the wallet with SOL');
        console.log('2. Restart the trading system');
      } else {
        console.log('1. Update RPC endpoint in sendSol.ts');
        console.log('2. Restart trading with working connection');
      }
    }
    process.exit(0);
  });
}

export { checkCurrentBalance };

// Default export and alias for compatibility
export default checkCurrentBalance;
export const checkWalletBalance = checkCurrentBalance;
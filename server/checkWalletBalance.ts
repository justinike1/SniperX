/**
 * COMPREHENSIVE WALLET BALANCE CHECKER
 * Checks all wallet addresses and provides funding guidance
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Multiple RPC endpoints for reliability
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-api.projectserum.com',
  'https://api.metaplex.solana.com',
];

async function checkCurrentBalance() {
  console.log('🔍 COMPREHENSIVE WALLET BALANCE CHECK');
  console.log('=====================================');
  
  const walletsToCheck = [
    { name: 'Primary Trading Wallet', address: '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv' },
    { name: 'Alternative Wallet', address: 'F9J32TiWS7Ltrf6CFYtjoiCwZbST8GjuKrbKqSUfNtG2' },
  ];

  for (const wallet of walletsToCheck) {
    console.log(`\n📍 Checking ${wallet.name}:`);
    console.log(`   Address: ${wallet.address}`);
    
    let balance = 0;
    let success = false;
    
    // Try multiple RPC endpoints
    for (const rpc of RPC_ENDPOINTS) {
      try {
        const connection = new Connection(rpc, 'confirmed');
        const publicKey = new PublicKey(wallet.address);
        const lamports = await connection.getBalance(publicKey);
        balance = lamports / LAMPORTS_PER_SOL;
        
        console.log(`   ✅ Balance: ${balance.toFixed(6)} SOL (via ${rpc})`);
        success = true;
        break;
      } catch (error) {
        console.log(`   ❌ Failed via ${rpc}: ${error.message}`);
      }
    }
    
    if (!success) {
      console.log(`   ⚠️  Could not fetch balance for ${wallet.name}`);
    } else {
      // Analyze balance status
      if (balance === 0) {
        console.log(`   🚨 CRITICAL: ${wallet.name} has ZERO balance - needs funding immediately`);
        console.log(`   📝 To fund this wallet:`);
        console.log(`      1. Open Phantom wallet`);
        console.log(`      2. Send SOL to: ${wallet.address}`);
        console.log(`      3. Minimum recommended: 0.1 SOL for testing`);
        console.log(`      4. For live trading: 1-5 SOL recommended`);
      } else if (balance < 0.01) {
        console.log(`   ⚠️  LOW BALANCE: ${wallet.name} has insufficient funds for trading`);
        console.log(`   💡 Need at least 0.01 SOL for basic transactions`);
      } else if (balance < 0.1) {
        console.log(`   ⚠️  MINIMAL BALANCE: ${wallet.name} can execute limited transactions`);
        console.log(`   💡 Recommended to add more SOL for continuous trading`);
      } else {
        console.log(`   ✅ SUFFICIENT BALANCE: ${wallet.name} ready for live trading`);
        console.log(`   💰 Can execute approximately ${Math.floor(balance / 0.001)} trades at 0.001 SOL each`);
      }
    }
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Fund the primary wallet with SOL from your exchange (Phantom, Coinbase, etc.)');
  console.log('2. Verify balance appears in checks above');
  console.log('3. Platform will automatically resume live trading once funded');
  console.log('4. Monitor Telegram alerts for trade execution confirmations');
}

// Self-executing check (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  checkCurrentBalance().catch(console.error);
}

export { checkCurrentBalance };
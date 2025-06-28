import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import { Keypair } from '@solana/web3.js';

async function checkTransactionHistory() {
  console.log('🔍 Checking transaction history for wallet...');
  
  try {
    // Load wallet from phantom_key.json
    const phantomData = JSON.parse(fs.readFileSync('phantom_key.json', 'utf8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(phantomData.privateKey));
    const walletAddress = keypair.publicKey.toBase58();
    
    console.log('📍 Wallet address:', walletAddress);
    
    // Connect to mainnet
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    
    // Check recent transactions
    console.log('🔍 Fetching recent transactions...');
    const signatures = await connection.getSignaturesForAddress(
      keypair.publicKey,
      { limit: 10 }
    );
    
    console.log(`📊 Found ${signatures.length} recent transactions`);
    
    if (signatures.length > 0) {
      console.log('\n📋 Recent transaction signatures:');
      signatures.forEach((sig, index) => {
        console.log(`${index + 1}. ${sig.signature} (${sig.confirmationStatus || 'confirmed'})`);
        if (sig.err) {
          console.log(`   ❌ Error: ${JSON.stringify(sig.err)}`);
        }
      });
      
      // Check the most recent transaction details
      const latestTx = await connection.getTransaction(signatures[0].signature);
      if (latestTx) {
        console.log('\n💰 Latest transaction details:');
        console.log('   Block time:', new Date(latestTx.blockTime! * 1000).toLocaleString());
        console.log('   Pre balance:', latestTx.meta?.preBalances?.[0] || 0, 'lamports');
        console.log('   Post balance:', latestTx.meta?.postBalances?.[0] || 0, 'lamports');
      }
    } else {
      console.log('📭 No transactions found for this wallet');
    }
    
    // Double-check current balance
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`\n💰 Current balance: ${balance} lamports (${balance / 1e9} SOL)`);
    
    // Check if wallet exists on devnet or testnet
    console.log('\n🔍 Checking other networks...');
    const devnetConnection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const devnetBalance = await devnetConnection.getBalance(keypair.publicKey);
    console.log(`📍 Devnet balance: ${devnetBalance / 1e9} SOL`);
    
    const testnetConnection = new Connection(clusterApiUrl("testnet"), "confirmed");
    const testnetBalance = await testnetConnection.getBalance(keypair.publicKey);
    console.log(`📍 Testnet balance: ${testnetBalance / 1e9} SOL`);
    
    return {
      mainnetBalance: balance / 1e9,
      devnetBalance: devnetBalance / 1e9,
      testnetBalance: testnetBalance / 1e9,
      transactionCount: signatures.length
    };
    
  } catch (error) {
    console.error('❌ Error checking transaction history:', error);
    return null;
  }
}

checkTransactionHistory().then((result) => {
  if (result) {
    console.log('\n📊 SUMMARY:');
    console.log(`Mainnet: ${result.mainnetBalance} SOL`);
    console.log(`Devnet: ${result.devnetBalance} SOL`);
    console.log(`Testnet: ${result.testnetBalance} SOL`);
    console.log(`Recent transactions: ${result.transactionCount}`);
    
    if (result.mainnetBalance === 0 && result.devnetBalance === 0 && result.testnetBalance === 0) {
      console.log('\n💡 SUGGESTION: Check if SOL was sent to the correct address:');
      console.log('   F9J32TiWS7Ltrf6CFYtjoiCwZbST8GjuKrbKqSUfNtG2');
    }
  }
});
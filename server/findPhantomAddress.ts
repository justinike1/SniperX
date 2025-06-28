import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import { Keypair } from '@solana/web3.js';

async function findPhantomWalletWithFunds() {
  console.log('🔍 Searching for Phantom wallet with 0.10192 SOL...');
  
  try {
    // Check our current configured address
    const phantomData = JSON.parse(fs.readFileSync('phantom_key.json', 'utf8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(phantomData.privateKey));
    const configuredAddress = keypair.publicKey.toBase58();
    
    console.log('📍 Configured address:', configuredAddress);
    
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log(`💰 Balance: ${solBalance} SOL`);
    
    if (Math.abs(solBalance - 0.10192) < 0.001) {
      console.log('✅ FOUND! This is the correct wallet with your SOL');
      return { address: configuredAddress, balance: solBalance, found: true };
    } else {
      console.log('❌ This wallet does not match the 0.10192 SOL shown in Phantom');
      console.log('');
      console.log('💡 POSSIBLE SOLUTIONS:');
      console.log('1. The SOL might be in a different Phantom account/wallet');
      console.log('2. You might need to export a different private key from Phantom');
      console.log('3. The SOL might be in a sub-account or token account');
      console.log('');
      console.log('🔧 TO FIX:');
      console.log('1. In Phantom, go to Settings → Export Private Key');
      console.log('2. Copy the private key for the wallet showing 0.10192 SOL');
      console.log('3. Send me the new private key to update the system');
      
      return { address: configuredAddress, balance: solBalance, found: false };
    }
    
  } catch (error) {
    console.error('❌ Error checking wallet:', error);
    return null;
  }
}

findPhantomWalletWithFunds().then((result) => {
  if (result) {
    if (result.found) {
      console.log('\n🚀 READY FOR AUTONOMOUS TRADING');
      console.log('✅ System will detect the funds and start trading shortly');
    } else {
      console.log('\n⚠️  WALLET MISMATCH DETECTED');
      console.log('Need to sync the correct Phantom wallet with 0.10192 SOL');
    }
  }
});
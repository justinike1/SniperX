import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

async function findWalletWithFunds() {
  console.log('🔍 Searching for wallet with 0.10192 SOL...');
  
  const mnemonic = "woman burst typical spring thunder animal enact heart enable mandate entry affair";
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
  
  // Try different derivation paths that Phantom might use
  const derivationPaths = [
    "m/44'/501'/0'/0'",    // Standard Solana path
    "m/44'/501'/0'",       // Alternative path
    "m/44'/501'/1'/0'",    // Second account
    "m/44'/501'/2'/0'",    // Third account
    "m/44'/501'/0'/1'",    // Second address in first account
    "m/44'/501'/0'/0'/0'", // Extended path
  ];
  
  for (let i = 0; i < derivationPaths.length; i++) {
    try {
      const derivationPath = derivationPaths[i];
      const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      const address = keypair.publicKey.toBase58();
      
      console.log(`\n📍 Path ${i + 1}: ${derivationPath}`);
      console.log(`Address: ${address}`);
      
      const balance = await connection.getBalance(keypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      console.log(`Balance: ${solBalance} SOL`);
      
      if (Math.abs(solBalance - 0.10192) < 0.001) {
        console.log('✅ FOUND! This is your wallet with 0.10192 SOL');
        
        // Update phantom_key.json with correct wallet
        const walletData = {
          address: address,
          privateKey: Array.from(keypair.secretKey)
        };
        
        const fs = await import('fs');
        fs.writeFileSync('phantom_key.json', JSON.stringify(walletData, null, 2));
        
        console.log('🚀 Updated phantom_key.json with correct wallet');
        console.log('✅ SniperX trading system now connected to funded wallet');
        return { address, balance: solBalance, path: derivationPath };
      }
      
    } catch (error) {
      console.log(`❌ Error with path ${derivationPaths[i]}:`, error.message);
    }
  }
  
  console.log('\n⚠️  No wallet found with 0.10192 SOL');
  console.log('💡 The SOL might be in a different account or the recovery phrase might be for a different wallet');
  
  return null;
}

findWalletWithFunds().then((result) => {
  if (result) {
    console.log(`\n🎯 SUCCESS: Found wallet ${result.address} with ${result.balance} SOL`);
    console.log(`🔧 Using derivation path: ${result.path}`);
  } else {
    console.log('\n🔍 Need to check if this recovery phrase belongs to the wallet showing 0.10192 SOL in Phantom');
  }
});
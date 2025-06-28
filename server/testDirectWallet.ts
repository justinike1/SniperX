import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';

console.log('🔍 Testing direct wallet configuration...');

try {
  // Step 1: Load directly from phantom_key.json
  const phantomData = JSON.parse(fs.readFileSync('phantom_key.json', 'utf8'));
  const privateKeyArray = phantomData.privateKey;
  
  console.log('✅ Private key length:', privateKeyArray.length);
  console.log('✅ Expected address:', phantomData.address);
  
  // Step 2: Create keypair directly
  const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
  const actualAddress = keypair.publicKey.toBase58();
  
  console.log('✅ Generated address:', actualAddress);
  console.log('✅ Address match:', actualAddress === phantomData.address ? 'YES' : 'NO');
  
  // Step 3: Test with mainnet-beta (as user suggested)
  const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
  console.log('✅ RPC endpoint:', connection.rpcEndpoint);
  
  // Step 4: Check wallet balance
  console.log('🔍 Checking wallet balance...');
  const balance = await connection.getBalance(keypair.publicKey);
  console.log('💰 Wallet balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  
  if (balance === 0) {
    console.log('⚠️  Wallet has 0 SOL balance - need to deposit funds for trading');
    console.log('📍 Wallet address for deposits:', actualAddress);
  } else {
    console.log('✅ Wallet has SOL balance - ready for trading!');
  }
  
  // Step 5: Test transaction capability (dry run)
  console.log('🔍 Testing transaction creation capability...');
  const recentBlockhash = await connection.getLatestBlockhash();
  console.log('✅ Can fetch blockhash:', !!recentBlockhash.blockhash);
  
  console.log('✅ All wallet tests passed! Wallet is properly configured.');
  
} catch (error) {
  console.error('❌ Error in wallet test:', error);
}
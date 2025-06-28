import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';

console.log('🔍 Testing wallet configuration...');

// Test 1: Check environment variable
console.log('Environment variable PHANTOM_PRIVATE_KEY exists:', !!process.env.PHANTOM_PRIVATE_KEY);
console.log('Length of PHANTOM_PRIVATE_KEY:', process.env.PHANTOM_PRIVATE_KEY?.length);

try {
  // Test 2: Parse the private key
  const secretKey = JSON.parse(process.env.PHANTOM_PRIVATE_KEY!);
  console.log('Parsed secret key length:', secretKey.length);
  console.log('First few bytes:', secretKey.slice(0, 10));
  
  // Test 3: Create keypair
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log('✅ Wallet address:', keypair.publicKey.toBase58());
  
  // Test 4: Check if it matches expected address
  const expectedAddress = 'F9J32TiWS7Ltrf6CFYtjoiCwZbST8GjuKrbKqSUfNtG2';
  const actualAddress = keypair.publicKey.toBase58();
  console.log('Expected address:', expectedAddress);
  console.log('Actual address:  ', actualAddress);
  console.log('Address match:', actualAddress === expectedAddress ? '✅ YES' : '❌ NO');
  
  // Test 5: Check RPC connection and cluster
  const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
  console.log('RPC endpoint:', connection.rpcEndpoint);
  
  // Test 6: Check wallet balance
  const balance = await connection.getBalance(keypair.publicKey);
  console.log('Wallet balance:', balance / 1e9, 'SOL');
  
} catch (error) {
  console.error('❌ Error testing wallet:', error);
}
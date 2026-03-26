/**
 * WALLET VERIFICATION SYSTEM
 * Confirms the wallet being funded matches the wallet used for trading
 */
import { Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';

export function verifyWalletConfiguration() {
  console.log('\n=== WALLET VERIFICATION SYSTEM ===');
  
  try {
    // Check phantom_key.json file
    if (fs.existsSync('./phantom_key.json')) {
      const phantomData = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
      console.log('📄 phantom_key.json found');
      
      if (phantomData.privateKey && Array.isArray(phantomData.privateKey)) {
        const keypair = Keypair.fromSecretKey(Uint8Array.from(phantomData.privateKey));
        const walletAddress = keypair.publicKey.toBase58();
        console.log('🔑 Bot Trading Wallet:', walletAddress);
        console.log('💰 Funded Wallet:', '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv');
        
        if (walletAddress === '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv') {
          console.log('✅ WALLET MATCH CONFIRMED - Trading from funded wallet');
          return { success: true, walletAddress, isMatching: true };
        } else {
          console.log('❌ WALLET MISMATCH - Bot trading from different wallet');
          return { success: false, walletAddress, isMatching: false };
        }
      }
    }
    
    // Check environment variable
    if (process.env.PHANTOM_PRIVATE_KEY) {
      const secretKey = JSON.parse(process.env.PHANTOM_PRIVATE_KEY);
      const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      const walletAddress = keypair.publicKey.toBase58();
      console.log('🔑 Bot Trading Wallet (ENV):', walletAddress);
      console.log('💰 Funded Wallet:', '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv');
      
      if (walletAddress === '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv') {
        console.log('✅ WALLET MATCH CONFIRMED - Trading from funded wallet');
        return { success: true, walletAddress, isMatching: true };
      } else {
        console.log('❌ WALLET MISMATCH - Bot trading from different wallet');
        return { success: false, walletAddress, isMatching: false };
      }
    }
    
    console.log('❌ No wallet configuration found');
    return { success: false, walletAddress: null, isMatching: false };
    
  } catch (error) {
    console.error('❌ Wallet verification failed:', error);
    return { success: false, error: error.message };
  }
}

// Run verification
const result = verifyWalletConfiguration();
export default result;
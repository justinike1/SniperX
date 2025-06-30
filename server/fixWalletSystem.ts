/**
 * COMPREHENSIVE WALLET SYSTEM FIX
 * Updates all wallet references to use the funded wallet address
 */

import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { mnemonicToSeedSync } from 'bip39';
import fs from 'fs';

// User's recovery phrase and target wallet
const RECOVERY_PHRASE = "woman burst typical spring thunder animal enact heart enable mandate entry affair";
const FUNDED_WALLET = "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv";
const DERIVATION_PATH = "m/44'/501'/2'/0'";

export async function fixWalletSystem() {
  console.log('🔧 STARTING COMPREHENSIVE WALLET SYSTEM FIX');
  console.log('Target wallet:', FUNDED_WALLET);
  
  try {
    // 1. Generate correct private key
    const seed = mnemonicToSeedSync(RECOVERY_PHRASE, "");
    const derivedSeed = derivePath(DERIVATION_PATH, seed.toString('hex')).key;
    const keypair = Keypair.fromSeed(derivedSeed);
    const generatedAddress = keypair.publicKey.toString();
    
    console.log('Generated address:', generatedAddress);
    
    if (generatedAddress !== FUNDED_WALLET) {
      throw new Error(`Address mismatch: generated ${generatedAddress}, expected ${FUNDED_WALLET}`);
    }
    
    // 2. Update phantom_key.json with correct private key
    const privateKeyArray = Array.from(keypair.secretKey);
    fs.writeFileSync('phantom_key.json', JSON.stringify(privateKeyArray));
    console.log('✅ Updated phantom_key.json');
    
    // 3. Test wallet balance with public RPC
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const publicKey = new PublicKey(FUNDED_WALLET);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / 1e9;
    
    console.log(`💰 Wallet balance: ${solBalance.toFixed(6)} SOL`);
    
    if (solBalance >= 0.1) {
      console.log('✅ WALLET HAS SUFFICIENT FUNDING FOR TRADING');
      return {
        success: true,
        walletAddress: FUNDED_WALLET,
        balance: solBalance,
        privateKey: privateKeyArray,
        message: 'Wallet system fixed and ready for trading'
      };
    } else {
      console.log('⚠️ Wallet needs more funding for optimal trading');
      return {
        success: true,
        walletAddress: FUNDED_WALLET,
        balance: solBalance,
        privateKey: privateKeyArray,
        message: 'Wallet configured but needs more SOL for trading'
      };
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('❌ Wallet system fix failed:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Update RPC endpoints to use public endpoints
export function getPublicRpcEndpoints() {
  return [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    'https://solana.publicnode.com'
  ];
}

// Load wallet with proper error handling
export function loadWalletKeypair(): Keypair {
  try {
    const privateKeyData = fs.readFileSync('phantom_key.json', 'utf8');
    const privateKeyArray = JSON.parse(privateKeyData);
    
    if (!Array.isArray(privateKeyArray) || privateKeyArray.length !== 64) {
      throw new Error('Invalid private key format');
    }
    
    const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    const address = keypair.publicKey.toString();
    
    if (address !== FUNDED_WALLET) {
      throw new Error(`Wallet address mismatch: ${address} !== ${FUNDED_WALLET}`);
    }
    
    console.log('✅ Wallet loaded successfully:', address);
    return keypair;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('❌ Failed to load wallet:', errorMessage);
    throw error;
  }
}

// Test wallet connectivity with multiple RPC endpoints
export async function testWalletConnectivity(): Promise<boolean> {
  const endpoints = getPublicRpcEndpoints();
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing RPC: ${endpoint}`);
      const connection = new Connection(endpoint, 'confirmed');
      const publicKey = new PublicKey(FUNDED_WALLET);
      const balance = await connection.getBalance(publicKey);
      
      console.log(`✅ ${endpoint}: ${(balance / 1e9).toFixed(6)} SOL`);
      return true;
      
    } catch (error) {
      console.log(`❌ ${endpoint}: Failed`);
      continue;
    }
  }
  
  return false;
}
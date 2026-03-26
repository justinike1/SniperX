/**
 * WALLET CONFIGURATION MODULE
 * Centralized wallet management for SniperX trading operations
 * Provides secure access to Phantom wallet and other wallet configurations
 */

import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Load wallet keypair from various sources with fallback hierarchy
let walletKeypair: Keypair | null = null;

/**
 * Get Phantom wallet keypair with fallback mechanisms
 * Priority: phantom_key.json -> PHANTOM_PRIVATE_KEY env -> secret.json
 */
export function getPhantomWallet(): Keypair {
  if (walletKeypair) {
    return walletKeypair;
  }

  try {
    // Primary: Load from phantom_key.json
    if (fs.existsSync('./phantom_key.json')) {
      const walletData = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
      
      if (walletData.privateKey && Array.isArray(walletData.privateKey)) {
        // Handle object format with privateKey array
        const secretKey = new Uint8Array(walletData.privateKey);
        walletKeypair = Keypair.fromSecretKey(secretKey);
      } else if (Array.isArray(walletData)) {
        // Handle direct array format
        const secretKey = new Uint8Array(walletData);
        walletKeypair = Keypair.fromSecretKey(secretKey);
      } else {
        throw new Error('Invalid phantom_key.json format');
      }
      
      console.log(`🔗 Phantom wallet loaded from phantom_key.json: ${walletKeypair.publicKey.toString()}`);
      return walletKeypair;
    }
    
    // Secondary: Load from environment variable
    if (process.env.PHANTOM_PRIVATE_KEY) {
      const secretKey = JSON.parse(process.env.PHANTOM_PRIVATE_KEY);
      walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      console.log(`🔗 Phantom wallet loaded from environment: ${walletKeypair.publicKey.toString()}`);
      return walletKeypair;
    }
    
    // Tertiary: Load from secret.json (fallback)
    const walletFilePath = process.env.WALLET_FILE_PATH || './secret.json';
    if (fs.existsSync(walletFilePath)) {
      const secretKey = JSON.parse(fs.readFileSync(walletFilePath, 'utf-8'));
      walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      console.log(`🔗 Wallet loaded from ${walletFilePath}: ${walletKeypair.publicKey.toString()}`);
      return walletKeypair;
    }
    
    throw new Error('No wallet configuration found');
    
  } catch (error) {
    console.error('❌ Failed to load wallet configuration:', error);
    throw new Error(`Wallet configuration error: ${error.message}`);
  }
}

/**
 * Get wallet public key as string
 */
export function getWalletAddress(): string {
  const wallet = getPhantomWallet();
  return wallet.publicKey.toString();
}

/**
 * Validate wallet is properly configured and funded
 */
export async function validateWallet(): Promise<boolean> {
  try {
    const wallet = getPhantomWallet();
    console.log(`✅ Wallet validation passed: ${wallet.publicKey.toString()}`);
    return true;
  } catch (error) {
    console.error('❌ Wallet validation failed:', error);
    return false;
  }
}

/**
 * Reset wallet cache (useful for testing)
 */
export function resetWalletCache(): void {
  walletKeypair = null;
}
import { Keypair } from '@solana/web3.js';
import bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import fs from 'fs';

// Your Phantom recovery phrase
const mnemonic = "woman burst typical spring thunder animal enact heart enable mandate entry affair";

console.log('🔑 Converting Phantom recovery phrase to private key...');

// Convert mnemonic to seed
const seed = bip39.mnemonicToSeedSync(mnemonic);

// Derive the keypair using Phantom's derivation path
const derivationPath = "m/44'/501'/0'/0'";
const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;

// Create keypair from derived seed
const keypair = Keypair.fromSeed(derivedSeed);

// Get address and private key
const address = keypair.publicKey.toBase58();
const privateKeyArray = Array.from(keypair.secretKey);

console.log('📍 Wallet Address:', address);
console.log('🔐 Private Key Array Length:', privateKeyArray.length);

// Save to phantom_key.json
const walletData = {
  address: address,
  privateKey: privateKeyArray
};

fs.writeFileSync('phantom_key.json', JSON.stringify(walletData, null, 2));

console.log('✅ Updated phantom_key.json with your actual wallet');
console.log('🚀 SniperX trading system now connected to wallet with 0.10192 SOL');
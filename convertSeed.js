import { Keypair } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { mnemonicToSeedSync } from 'bip39';

// Your seed phrase
const mnemonic = "woman burst typical spring thunder animal enact heart enable mandate entry affair";

// Convert to seed
const seed = mnemonicToSeedSync(mnemonic, "");

// Derive the wallet using standard Phantom derivation path
const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;

// Create keypair
const keypair = Keypair.fromSeed(derivedSeed);

console.log('Wallet Address:', keypair.publicKey.toString());
console.log('Private Key Array:', JSON.stringify(Array.from(keypair.secretKey)));

// Also save to environment format
console.log('Environment Variable Format:');
console.log('PHANTOM_PRIVATE_KEY=' + JSON.stringify(Array.from(keypair.secretKey)));
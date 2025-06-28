// convertKey.js

import bs58 from 'bs58';
import fs from 'fs';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

// Your seed phrase (mnemonic)
const seedPhrase = 'woman burst typical spring thunder animal enact heart enable mandate entry affair';

console.log("🔑 Converting seed phrase to Solana private key...");

if (!seedPhrase || seedPhrase === 'PUT_YOUR_SEED_PHRASE_HERE') {
  console.log("⚠️  Please add your 12-word seed phrase");
  process.exit(0);
}

try {
  // Convert seed phrase to seed
  const seed = bip39.mnemonicToSeedSync(seedPhrase);
  
  // Derive Solana keypair (using standard derivation path)
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedSeed);
  
  // Get private key as array
  const privateKeyArray = Array.from(keypair.secretKey);
  
  console.log("✅ Wallet Address:", keypair.publicKey.toString());
  console.log("✅ Private Key JSON Array:");
  console.log(JSON.stringify(privateKeyArray, null, 2));
  
  // Save to file
  const output = {
    address: keypair.publicKey.toString(),
    privateKey: privateKeyArray
  };
  
  fs.writeFileSync("phantom_key.json", JSON.stringify(output, null, 2));
  console.log("✅ Saved to phantom_key.json");
  
} catch (err) {
  console.error("❌ Error converting seed phrase:", err.message);
}
import bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import bs58 from 'bs58';
import fs from 'fs';
import { Keypair, PublicKey } from '@solana/web3.js';

// Your seed phrase
const seedPhrase = 'woman burst typical spring thunder animal enact heart enable mandate entry affair';

(async () => {
  console.log('🔧 FIXING WALLET DERIVATION WITH PROPER PHANTOM PATH');
  console.log('='.repeat(60));

  try {
    // Convert mnemonic to seed buffer
    const seed = await bip39.mnemonicToSeed(seedPhrase);
    console.log('✅ Seed generated from mnemonic');

    // Derive key using Phantom's derivation path
    const derived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
    console.log('✅ Key derived using Phantom path: m/44\'/501\'/0\'/0\'');

    // This is the secret key (Uint8Array of 64 bytes)
    const secretKey = derived.key;
    console.log(`✅ Secret key length: ${secretKey.length} bytes`);

    // Create keypair using fromSeed for 32-byte keys
    const keypair = Keypair.fromSeed(secretKey);
    const address = keypair.publicKey.toString();
    console.log(`✅ Generated address: ${address}`);

    // Create the proper phantom_key.json format
    const walletData = {
      address: address,
      privateKey: Array.from(secretKey)
    };

    // Save it to phantom_key.json
    fs.writeFileSync("phantom_key.json", JSON.stringify(walletData, null, 2));
    console.log('✅ phantom_key.json updated with proper derivation!');

    console.log('\n📊 WALLET VERIFICATION:');
    console.log(`   Address: ${address}`);
    console.log(`   Private key array length: ${walletData.privateKey.length}`);
    console.log(`   Ready for SniperX integration`);

  } catch (error) {
    console.error('❌ Error fixing wallet derivation:', error);
  }
})();
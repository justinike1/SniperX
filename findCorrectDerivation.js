import { Keypair } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { mnemonicToSeedSync } from 'bip39';

const mnemonic = "woman burst typical spring thunder animal enact heart enable mandate entry affair";
const targetAddress = "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv";

console.log('🔍 Searching for correct derivation path...');
console.log('Target address:', targetAddress);

const seed = mnemonicToSeedSync(mnemonic, "");

// Try different derivation paths
const paths = [
  "m/44'/501'/0'/0'",
  "m/44'/501'/0'",
  "m/44'/501'/1'/0'", 
  "m/44'/501'/0'/1'",
  "m/44'/501'/2'/0'",
  "m/44'/501'/0'/2'",
  "m/44'/501'/3'/0'",
  "m/44'/501'/0'/3'",
  "m/44'/501'/4'/0'",
  "m/44'/501'/0'/4'",
  "m/44'/501'/5'/0'",
  "m/44'/501'/0'/5'"
];

console.log('\n📊 Testing derivation paths:');

for (let i = 0; i < paths.length; i++) {
  try {
    const path = paths[i];
    const derivedSeed = derivePath(path, seed.toString('hex')).key;
    const keypair = Keypair.fromSeed(derivedSeed);
    const address = keypair.publicKey.toString();
    
    console.log(`${i + 1}. ${path} -> ${address}`);
    
    if (address === targetAddress) {
      console.log('\n🎉 FOUND CORRECT DERIVATION PATH!');
      console.log('Path:', path);
      console.log('Address:', address);
      console.log('Private Key:', JSON.stringify(Array.from(keypair.secretKey)));
      
      // Save the correct keys
      import('fs').then(fs => {
        const keyData = {
          address: address,
          privateKey: Array.from(keypair.secretKey),
          derivationPath: path
        };
        fs.writeFileSync('phantom_key_correct.json', JSON.stringify(keyData, null, 2));
        console.log('✅ Saved correct keys to phantom_key_correct.json');
      });
      
      break;
    }
  } catch (error) {
    console.log(`${i + 1}. ${paths[i]} -> ERROR: ${error.message}`);
  }
}

console.log('\n🔍 Search complete.');
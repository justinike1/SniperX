// convertKey.js

import bs58 from 'bs58';
import fs from 'fs';

// Replace this with your Base58 Phantom private key
const base58PrivateKey = 'PUT_YOUR_BASE58_KEY_HERE';

console.log("📋 Instructions:");
console.log("1. Get your Phantom wallet private key (Base58 format)");
console.log("2. Replace 'PUT_YOUR_BASE58_KEY_HERE' with your actual key");
console.log("3. Run: node convertKey.js");
console.log("4. Copy the JSON array output to PHANTOM_PRIVATE_KEY environment variable");
console.log("");

if (base58PrivateKey === 'PUT_YOUR_BASE58_KEY_HERE') {
  console.log("⚠️  Please replace the placeholder with your actual Phantom private key");
  process.exit(0);
}

try {
  const decoded = bs58.decode(base58PrivateKey);
  
  if (decoded.length !== 64) {
    console.error("❌ Invalid key: should decode to 64 bytes.");
    process.exit(1);
  }

  const keyArray = Array.from(decoded);
  console.log("✅ JSON array format:");
  console.log(JSON.stringify(keyArray, null, 2));

  // Optional: save to file
  fs.writeFileSync("phantom_key.json", JSON.stringify(keyArray, null, 2));
} catch (err) {
  console.error("❌ Error decoding key:", err.message);
}
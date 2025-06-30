import { Keypair } from '@solana/web3.js';
import fs from 'fs';

export function loadPhantomKeypair(): Keypair {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync('./phantom-key.json', 'utf8')));
  return Keypair.fromSecretKey(secretKey);
}

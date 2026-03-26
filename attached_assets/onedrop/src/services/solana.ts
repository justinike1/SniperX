import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { env } from '../config.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

let _kp: Keypair | null = null;
let _conn: Connection | null = null;

export function connection() { if (!_conn) _conn = new Connection(env.SOLANA_RPC_URL, { commitment: 'confirmed' }); return _conn; }
export function loadKeypair(): Keypair {
  if (_kp) return _kp;
  const seed = bip39.mnemonicToSeedSync(env.WALLET_MNEMONIC);
  const { key } = derivePath(`m/44'/501'/0'/0'`, seed.toString('hex'));
  _kp = Keypair.fromSeed(key);
  return _kp;
}
export async function signAndSendSwapTransaction(base64Tx: string) {
  const kp = loadKeypair();
  const tx = VersionedTransaction.deserialize(Buffer.from(base64Tx, 'base64'));
  tx.sign([kp]);
  const conn = connection();
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  const conf = await conn.confirmTransaction(sig, 'confirmed');
  return { signature: sig, confirmation: conf };
}

// Adapter to bridge professional SniperX Prime with existing wallet setup
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";

let cachedConnection: Connection | null = null;
let cachedWallet: Keypair | null = null;

export function conn(): Connection {
  if (!cachedConnection) {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    cachedConnection = new Connection(rpcUrl, "confirmed");
  }
  return cachedConnection;
}

export function loadWallet(): Keypair {
  if (!cachedWallet) {
    try {
      const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
      const secretKey = new Uint8Array(privateKeyArray);
      
      if (secretKey.length === 32) {
        cachedWallet = Keypair.fromSeed(secretKey);
      } else if (secretKey.length === 64) {
        cachedWallet = Keypair.fromSecretKey(secretKey);
      } else {
        throw new Error(`Invalid secret key length: ${secretKey.length}`);
      }
    } catch (error) {
      console.error('❌ Failed to load wallet:', error);
      throw error;
    }
  }
  return cachedWallet;
}

export async function getBalance(pubkey: string): Promise<number> {
  const { PublicKey } = await import("@solana/web3.js");
  const lamports = await conn().getBalance(new PublicKey(pubkey), "confirmed");
  return lamports / 1e9;
}
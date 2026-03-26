
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import fs from "fs";
import { env } from "./env";
let conns: Connection[] | null = null; let idx = 0;
export function conn(): Connection { if (!conns) conns = env().SOLANA_RPC_URLS.map(u => new Connection(u, "confirmed")); return conns[idx]; }
export function rotateConn(): Connection { conn(); idx = (idx + 1) % (conns as Connection[]).length; return (conns as Connection[])[idx]; }
export async function getBalance(pubkey: string): Promise<number> { const lamports = await conn().getBalance(new PublicKey(pubkey), "confirmed"); return lamports / LAMPORTS_PER_SOL; }
export function loadWallet(): Keypair { const p = env().WALLET_PRIVATE_KEY_PATH; if (!p) throw new Error("WALLET_PRIVATE_KEY_PATH required for live"); const arr = JSON.parse(fs.readFileSync(p, "utf-8")); const secret = new Uint8Array(arr); return secret.length === 32 ? Keypair.fromSeed(secret) : Keypair.fromSecretKey(secret); }

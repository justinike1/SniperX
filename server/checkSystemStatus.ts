// server/checkSystemStatus.ts
import { Keypair, Connection, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import fs from "fs";

// Load wallet from phantom_key.json
const walletData = JSON.parse(fs.readFileSync("phantom_key.json", "utf8"));
const secretKey = Uint8Array.from(walletData);
const keypair = Keypair.fromSecretKey(secretKey);
const publicKey = keypair.publicKey.toBase58();

const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

console.log("🔑 Wallet Address:", publicKey);

(async () => {
  try {
    const balance = await connection.getBalance(keypair.publicKey);
    console.log("💰 Balance:", balance / LAMPORTS_PER_SOL, "SOL");

    // Check dryRun config
    const configRaw = fs.readFileSync("./server/config.ts", "utf8");
    const dryRunMatch = configRaw.match(/dryRun:\s*(true|false)/);
    const dryRun = dryRunMatch ? dryRunMatch[1] : "UNKNOWN";
    console.log("🧪 dryRun Mode:", dryRun.toUpperCase());

    // Check last transaction log
    const logRaw = fs.readFileSync("./server/logs/tradeLogs.json", "utf8");
    const logs = JSON.parse(logRaw);
    const last = logs[logs.length - 1];
    if (last && last.txHash) {
      console.log("🧾 Last TX Hash:", last.txHash);
      console.log(`🔎 View it on Solscan: https://solscan.io/tx/${last.txHash}`);
    } else {
      console.log("⚠️ No transactions found in tradeLogs.json");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();

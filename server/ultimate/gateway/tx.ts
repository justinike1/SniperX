
import { Connection, VersionedTransaction, Commitment } from "@solana/web3.js";
const MAX_RETRIES = Number(process.env.SX_MAX_RETRIES || 3);
const BASE_BACKOFF_MS = Number(process.env.SX_RETRY_BACKOFF_MS || 500);
function sleep(ms: number){ return new Promise(res => setTimeout(res, ms)); }
export async function simulateVtx(connection: Connection, tx: VersionedTransaction): Promise<{ ok: boolean; err?: string; logs?: string[] }>{ 
  try { const sim = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true, sigVerify: true }); const value: any = sim.value; if (value.err) return { ok: false, err: JSON.stringify(value.err), logs: value.logs || [] }; return { ok: true, logs: value.logs || [] }; }
  catch (e: any) { return { ok: false, err: e?.message || "SIM_ERR" }; }
}
export async function sendVtxWithRetry(connection: Connection, tx: VersionedTransaction, commitment: Commitment = "confirmed" as Commitment): Promise<{ ok: boolean; sig?: string; err?: string }>{ 
  let attempt = 0; let lastErr = "";
  while (attempt < MAX_RETRIES) {
    try {
      const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: commitment, maxRetries: 3 });
      await connection.confirmTransaction(sig, commitment);
      return { ok: true, sig };
    } catch (e: any) {
      lastErr = e?.message || "SEND_ERR"; await sleep(BASE_BACKOFF_MS * (2 ** attempt)); attempt++;
    }
  } return { ok: false, err: lastErr || "RETRIES_EXHAUSTED" };
}

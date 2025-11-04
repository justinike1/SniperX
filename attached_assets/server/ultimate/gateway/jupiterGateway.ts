
import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { env } from "../../utils/env";
import { loadWallet, conn } from "../../utils/solana";
import type { TradeGateway, ExecResult } from "../types";
import { simulateVtx, sendVtxWithRetry } from "./tx";
const SOL_MINT = "So11111111111111111111111111111111111111112";
function jupUrl(path: string, qs?: Record<string, string | number>){ const base = "https://quote-api.jup.ag/v6"; const url = new URL(`${base}/${path}`); if (qs) for (const [k,v] of Object.entries(qs)) url.searchParams.set(k, String(v)); return url.toString(); }
export class JupiterGateway implements TradeGateway {
  private connection: Connection; private wallet: Keypair; private directOnly: boolean; private priorityLamports?: number;
  constructor() { this.connection = conn(); this.wallet = loadWallet(); this.directOnly = (process.env.JUP_DIRECT_ONLY || "false") === "true"; const pf = process.env.PRIORITY_FEE_LAMPORTS; this.priorityLamports = pf ? Number(pf) : undefined; }
  private async quote(inputMint: string, outputMint: string, amount: number){
    const slippageBps = Math.round((env().MAX_SLIPPAGE || 5) * 100);
    const url = jupUrl("quote", { inputMint, outputMint, amount, slippageBps, onlyDirectRoutes: this.directOnly ? "true" : "false" });
    const r = await fetch(url); if (!r.ok) throw new Error(`JUP_QUOTE_${r.status}`); const j = await r.json(); if (!j?.data?.length) throw new Error("JUP_NO_ROUTE"); return j.data[0];
  }
  private async swapTx(quoteResponse: any){
    const body = { quoteResponse, userPublicKey: this.wallet.publicKey.toBase58(), wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: this.priorityLamports ?? "auto" };
    const r = await fetch(jupUrl("swap"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`JUP_SWAP_${r.status}`);
    const j = await r.json(); const txBuf = Buffer.from(j.swapTransaction, "base64"); const tx = VersionedTransaction.deserialize(txBuf); tx.sign([this.wallet]); return tx;
  }
  async buy(tokenMint: string, amountSol: number): Promise<ExecResult> {
    try { const lamports = Math.floor(amountSol * 1_000_000_000); const route = await this.quote(SOL_MINT, tokenMint, lamports); const tx = await this.swapTx(route); const sim = await simulateVtx(this.connection, tx); if (!sim.ok) return { success: false, reason: `SIM_FAIL:${sim.err}` }; const send = await sendVtxWithRetry(this.connection, tx, "confirmed"); if (!send.ok) return { success: false, reason: send.err }; return { success: true, txid: send.sig }; }
    catch (e: any) { return { success: false, reason: e?.message || "JUP_BUY_ERR" }; }
  }
  async sell(tokenMint: string, amountTokens: number): Promise<ExecResult> {
    try { const { getMint } = await import("@solana/spl-token"); const info = await getMint(this.connection, new PublicKey(tokenMint)); const amount = Math.floor(amountTokens * 10 ** info.decimals); const route = await this.quote(tokenMint, SOL_MINT, amount); const tx = await this.swapTx(route); const sim = await simulateVtx(this.connection, tx); if (!sim.ok) return { success: false, reason: `SIM_FAIL:${sim.err}` }; const send = await sendVtxWithRetry(this.connection, tx, "confirmed"); if (!send.ok) return { success: false, reason: send.err }; return { success: true, txid: send.sig }; }
    catch (e: any) { return { success: false, reason: e?.message || "JUP_SELL_ERR" }; }
  }
  async short(): Promise<ExecResult> { return { success: false, reason: "SPOT_NO_SHORT" }; }
  async cover(): Promise<ExecResult> { return { success: false, reason: "SPOT_NO_COVER" }; }
}

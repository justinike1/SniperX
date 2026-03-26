
import { Connection, Keypair, Commitment } from "@solana/web3.js";
import { DriftClient, Wallet as DriftWallet, BN, PositionDirection, PerpMarkets } from "@drift-labs/sdk";
import { env } from "../../utils/env";
import { conn, loadWallet } from "../../utils/solana";
import type { TradeGateway, ExecResult } from "../types";
const MAX_RETRIES = Number(process.env.SX_MAX_RETRIES || 3);
const BASE_BACKOFF_MS = Number(process.env.SX_RETRY_BACKOFF_MS || 500);
function sleep(ms: number){ return new Promise(res => setTimeout(res, ms)); }
function shouldRetry(msg: string){ return /Blockhash not found|Transaction was not confirmed|0x1/.test(msg); }
export class DriftGateway implements TradeGateway {
  private connection: Connection; private wallet: Keypair; private client: DriftClient | null = null; private perpMarketIndex: number | null = null;
  constructor() { this.connection = conn(); this.wallet = loadWallet(); }
  private async ensureClient(): Promise<void> {
    if (this.client) return;
    const wallet = new DriftWallet(this.wallet);
    this.client = new DriftClient({ connection: this.connection, wallet, opts: { commitment: "confirmed" as Commitment }, env: env().SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet-beta" });
    await this.client.subscribe();
    const sym = process.env.DRIFT_PERP_SYMBOL || "SOL-PERP";
    const market = PerpMarkets[this.client.env()].find(m => m.symbol === sym);
    if (!market) throw new Error(`Perp market not found: ${sym}`);
    this.perpMarketIndex = market.marketIndex;
  }
  async buy(): Promise<ExecResult> { return { success: false, reason: "PERP_SPOT_UNSUPPORTED" }; }
  async sell(): Promise<ExecResult> { return { success: false, reason: "PERP_SPOT_UNSUPPORTED" }; }
  private async placeWithRetry(params: { direction: PositionDirection; baseQty: number; reduceOnly: boolean }): Promise<ExecResult> {
    let attempt = 0; let lastErr = "";
    while (attempt < MAX_RETRIES) {
      try {
        if (!this.client || this.perpMarketIndex === null) throw new Error("DRIFT_UNINIT");
        const res = await this.client.placePerpOrder({ marketIndex: this.perpMarketIndex, direction: params.direction, baseAssetAmount: new BN(Math.max(1, Math.floor(params.baseQty * 1e3))), reduceOnly: params.reduceOnly, immediateOrCancel: true });
        return { success: true, txid: res.txSig };
      } catch (e: any) {
        const msg = e?.message || "DRIFT_ERR";
        lastErr = msg;
        if (!shouldRetry(msg)) break;
        await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
        attempt++;
      }
    }
    return { success: false, reason: lastErr || "DRIFT_SEND_ERR" };
  }
  async short(_tokenMint: string, sizeSol: number, leverage: number): Promise<ExecResult> {
    try { await this.ensureClient(); if (!this.client) throw new Error("DRIFT_CLIENT_UNINIT"); if (this.perpMarketIndex === null) throw new Error("PERP_MARKET_UNSET");
      const priceData = await this.client.getOraclePriceDataForPerpMarket(this.perpMarketIndex); const price = Number(priceData.price) / 1e6; if (!(price > 0)) return { success: false, reason: "ORACLE_PRICE_INVALID" };
      const baseQty = Math.max(0, (sizeSol / price) * Math.min(leverage || 2, Number(process.env.PERP_MAX_LEVERAGE || 3)));
      return await this.placeWithRetry({ direction: PositionDirection.SHORT, baseQty, reduceOnly: false });
    } catch (e: any) { return { success: false, reason: e?.message || "DRIFT_SHORT_ERR" }; }
  }
  async cover(_tokenMint: string, sizeSol: number): Promise<ExecResult> {
    try { await this.ensureClient(); if (!this.client) throw new Error("DRIFT_CLIENT_UNINIT"); if (this.perpMarketIndex === null) throw new Error("PERP_MARKET_UNSET");
      const priceData = await this.client.getOraclePriceDataForPerpMarket(this.perpMarketIndex); const price = Number(priceData.price) / 1e6; if (!(price > 0)) return { success: false, reason: "ORACLE_PRICE_INVALID" };
      const baseQty = Math.max(0, sizeSol / price);
      return await this.placeWithRetry({ direction: PositionDirection.LONG, baseQty, reduceOnly: true });
    } catch (e: any) { return { success: false, reason: e?.message || "DRIFT_COVER_ERR" }; }
  }
}

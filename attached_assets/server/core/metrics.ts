
import client from "prom-client";
import type { Express } from "express";
import { env } from "../utils/env";
const reg = new client.Registry();
client.collectDefaultMetrics({ register: reg });
export const tradeCounter = new client.Counter({ name: "sniperx_trades_total", help: "Trades count", labelNames: ["type","result"] as const });
export const safetyBlocks = new client.Counter({ name: "sniperx_safety_blocks_total", help: "Blocked trades", labelNames: ["reason"] as const });
reg.registerMetric(tradeCounter); reg.registerMetric(safetyBlocks);
export function mountMetrics(app: Express) { if (!env().METRICS_ENABLED) return; app.get("/metrics", async (_req, res) => { res.setHeader("Content-Type", reg.contentType); res.send(await reg.metrics()); }); }

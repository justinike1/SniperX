
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { UltimateOrchestrator } from "../ultimate/orchestrator";
import { CompositeGateway } from "../ultimate/gateway/compositeGateway";
import { idempotency } from "../core/idempotency";
import { sse, publish } from "../realtime/events";
import { addEquity, getEquity } from "../state/equityStore";
import { getKpis, recordBlock, recordTradeOk } from "../state/kpi";
import { AlertManager } from "../realtime/alerts";
import { tradeCounter, safetyBlocks } from "../core/metrics";
import { env } from "../utils/env";

const cfgSchema = z.object({
  maxPerTradeSOL: z.number().positive().default(0.25),
  maxDailySOL: z.number().positive().default(1.0),
  minWalletSOL: z.number().nonnegative().default(0.05),
  maxVolPct: z.number().nonnegative().default(25),
  maxSlippagePct: z.number().nonnegative().default(5),
  kellyCapPct: z.number().nonnegative().default(0.2),
  riskOffDDPct: z.number().nonnegative().default(10),
  blockDDPct: z.number().nonnegative().default(25),
});
const signalSchema = z.object({
  wallet: z.object({ address: z.string(), balanceSOL: z.number(), dailySpentSOL: z.number() }),
  signals: z.array(z.object({ strategy: z.string(), tokenMint: z.string(), action: z.enum(["BUY","SELL","SHORT","COVER","HOLD"]), confidence: z.number().min(0).max(1), sizeHintPct: z.number().min(0).max(1).optional(), reason: z.string().optional() }))
});

export function mountUltimateRealtime(app: Express, cfg?: Partial<z.infer<typeof cfgSchema>>) {
  const merged = cfgSchema.parse(cfg || {});
  const gw = new CompositeGateway();
  const orch = new UltimateOrchestrator(merged, gw);
  const alerts = new AlertManager(merged.riskOffDDPct, merged.blockDDPct);

  app.get("/ultimate/events", sse);

  app.post("/ultimate/candle", (req: Request, res: Response) => {
    const { tokenMint, price, equitySOL, ts } = req.body || {};
    const nTs = typeof ts === "number" ? ts : Date.now();
    orch.onCandle(String(tokenMint), Number(price), Number(equitySOL ?? 0));
    addEquity({ ts: nTs, equity: Number(equitySOL ?? 0) });
    const k = getKpis();
    alerts.onDrawdown(k.currentDrawdownPct).catch(()=>{});
    publish("candle", { tokenMint, price, equitySOL, ts: nTs, ddPct: k.currentDrawdownPct });
    res.json({ ok: true });
  });

  app.get("/ultimate/equity", (_req, res) => res.json({ ok: true, points: getEquity() }));
  app.get("/ultimate/kpis", (_req, res) => res.json({ ok: true, kpis: getKpis() }));

  app.post("/ultimate/signal", idempotency(), async (req: Request, res: Response) => {
    const body = signalSchema.parse({ wallet: req.body?.wallet, signals: Array.isArray(req.body?.signals) ? req.body.signals : [req.body] });
    publish("signal", body);
    const result = await orch.onSignals(body.wallet, body.signals);
    if (result.decided !== "HOLD") {
      recordTradeOk();
      tradeCounter.inc({ type: String(result.decided).toLowerCase(), result: env().DRY_RUN ? "dry_run" : "ok" });
    } else if (result.reason && !["NO_SIGNAL","NO_PRICE"].includes(result.reason)) {
      recordBlock();
      safetyBlocks.inc({ reason: result.reason });
      alerts.onPolicyBlock(result.reason).catch(()=>{});
    }
    publish("decision", result);
    res.json({ success: result.decided !== "HOLD", ...result });
  });

  app.get("/ultimate/status", (_req, res) => res.json({ ok: true, config: merged, dryRun: env().DRY_RUN, spotLive: env().ENABLE_SPOT_LIVE, perpLive: env().ENABLE_PERP_LIVE }));
}

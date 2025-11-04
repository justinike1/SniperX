
import express from "express";
import cookieParser from "cookie-parser";
import { env } from "./utils/env";
import { logger } from "./utils/logger";
import { applySecurity } from "./middleware/security";
import { mountMetrics } from "./core/metrics";
import { mountHealth } from "./core/health";
import { notFound, errorHandler } from "./middleware/error";
import { mountUltimateRealtime } from "./routes/ultimate.realtime";

const e = env();
const app = express();
applySecurity(app);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
mountHealth(app);
mountMetrics(app);

mountUltimateRealtime(app, {
  maxPerTradeSOL: e.MAX_SPEND_PER_TRADE,
  maxDailySOL: e.MAX_DAILY_SPEND,
  minWalletSOL: e.MIN_WALLET_BALANCE,
  maxVolPct: e.MAX_VOLATILITY,
  maxSlippagePct: e.MAX_SLIPPAGE,
  kellyCapPct: 0.2,
  riskOffDDPct: e.RISK_OFF_DD_PCT,
  blockDDPct: e.BLOCK_DD_PCT
});

app.use(notFound);
app.use(errorHandler);
app.listen(e.PORT, () => logger.info({ port: e.PORT, env: e.NODE_ENV, dryRun: e.DRY_RUN }, "SniperX Prime ready"));

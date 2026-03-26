import express, { type NextFunction, type Request, type Response } from "express";
import { registerRoutes } from "./routes/professionalTrading";
import { setupTelegramCommands } from "./utils/telegramBotEnhanced";
import { registerTradeHandlers } from "./worker/handlers";
import { brain } from "./brain/index";
import { backtester, riskManager } from "./brain/index";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const startedAt = Date.now();
let telegramReady = false;
let brainReady = false;

app.get("/health", (_req, res) => {
  const uptimeS = Math.round((Date.now() - startedAt) / 1000);
  res.json({
    status: "ok",
    uptime: uptimeS,
    mode: backtester.getMode(),
    brain: brainReady ? "running" : "starting",
    telegram: telegramReady || !process.env.TELEGRAM_BOT_TOKEN ? "ok" : "starting",
    risk: riskManager.getState().isHalted ? "halted" : "active",
  });
});

app.get("/", (_req, res) => {
  res.sendFile("index.html", { root: "." });
});

registerRoutes(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

(async () => {
  const port = Number(process.env.PORT) || 5000;

  app.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    console.log(`[startup] SniperX API listening on :${port}`);
  });

  try {
    registerTradeHandlers();
    setupTelegramCommands();
    telegramReady = true;
    console.log("[startup] Telegram command handlers initialized");
  } catch (error) {
    console.error("[startup] Telegram initialization failed:", error);
  }

  try {
    await brain.start(false);
    brainReady = true;
    console.log(`[startup] Brain online | mode=${backtester.getMode()} | autopilot=OFF`);
  } catch (e) {
    console.error("[startup] Brain startup error:", e);
  }

  console.log("[startup] API ready. Primary flow: GET /api/pro/status -> POST /api/pro/trade -> GET /api/pro/report");
})();

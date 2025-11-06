import express, { type Request, Response, NextFunction } from "express";
import { registerProfessionalRoutes } from "./routes/professionalTrading";

// ONEDROP INTEGRATION: Enhanced Telegram + Worker Queue + Pyth Feeds
import { setupTelegramCommands } from "./utils/telegramBotEnhanced";
import { registerTradeHandlers } from "./worker/handlers";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", mode: "personal-trading-bot" });
});

// Register professional trading endpoints
registerProfessionalRoutes(app);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

(async () => {
  console.log("🤖 SNIPERX PERSONAL TRADING BOT");
  console.log("================================");
  console.log("");

  // INITIALIZE ONEDROP FEATURES - Enhanced Telegram, Worker Queue, Pyth Feeds
  setTimeout(() => {
    try {
      console.log("🎯 Initializing Telegram control system...");
      registerTradeHandlers();
      setupTelegramCommands();
      console.log("✅ Telegram bot active");
      console.log("📊 Pyth price feeds ready");
      console.log("⚙️ Trade queue operational");
      console.log("");
    } catch (error) {
      console.error("❌ Failed to initialize Telegram:", error);
    }
  }, 1000);

  // EMERGENCY RECOVERY DISABLED FOR MANUAL BOT MODE
  // (Emergency recovery caused RPC rate limits with constant monitoring)
  // User controls all trades manually via Telegram - no auto-monitoring needed

  // Autonomous trading disabled - manual Telegram control only
  setTimeout(() => {
    console.log("================================");
    console.log("🎯 BOT READY - Manual Control Mode");
    console.log("📱 Use Telegram to trade:");
    console.log("   /buy SOL 10 USD");
    console.log("   /sell BONK ALL");
    console.log("   /prices");
    console.log("   /status");
    console.log("💰 Trade when YOU decide");
    console.log("================================");
  }, 3000);

  // Start HTTP server (minimal, just for health checks and professional endpoints)
  const port = 5000;
  app.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`✓ Server listening on port ${port}`);
    console.log("");
  });
})();

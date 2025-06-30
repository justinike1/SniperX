import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// import "./continuousTrading"; // DISABLED - Only does SOL transfers without token swaps
import "./scheduledTrader"; // Auto-start scheduled trading with autoTradeTrigger
import { initializeDatabase } from "./initDatabase";

// Start automated sell monitoring system
import { startSellConditionMonitoring } from "./utils/sellLogic";

// Schedule daily P&L summary
import { sendDailySummary } from "./utils/telegramCommands";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database with demo data
  await initializeDatabase();
  
  const server = await registerRoutes(app);

  // Start automated sell monitoring system
  startSellConditionMonitoring();

  // Schedule daily P&L summary at 8 AM UTC
  function scheduleDailySummary() {
    const now = new Date();
    const nextSummary = new Date();
    nextSummary.setUTCHours(8, 0, 0, 0);
    
    if (nextSummary <= now) {
      nextSummary.setUTCDate(nextSummary.getUTCDate() + 1);
    }
    
    const timeUntilNext = nextSummary.getTime() - now.getTime();
    
    setTimeout(() => {
      sendDailySummary().catch(console.error);
      // Schedule next summary in 24 hours
      setInterval(() => {
        sendDailySummary().catch(console.error);
      }, 24 * 60 * 60 * 1000);
    }, timeUntilNext);
    
    console.log(`📊 Daily P&L summary scheduled for ${nextSummary.toUTCString()}`);
  }

  scheduleDailySummary();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

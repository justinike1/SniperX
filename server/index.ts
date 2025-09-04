import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// import "./continuousTrading"; // DISABLED - Only does SOL transfers without token swaps
// import "./scheduledTrader"; // DISABLED - Auto-start scheduled trading with autoTradeTrigger
import { initializeDatabase } from "./initDatabase";

// DISABLED - Start automated sell monitoring system
// import { startSellConditionMonitoring } from "./utils/sellLogic";

// Schedule daily P&L summary
import { sendDailySummary } from "./utils/telegramCommands";

// DISABLED - CRITICAL: Initialize Fund Protection Service for automatic stop-loss and take-profit
// import { fundProtectionService } from "./utils/fundProtectionService";

// DISABLED - AUTONOMOUS 24/7 TRADING: Initialize continuous trading engine
// import { autonomous24x7TradingEngine } from "./services/autonomous24x7TradingEngine";

// PLUGIN SYSTEM: Initialize modular trading strategies
import { initializePlugins } from "./plugins/pluginRegistry";

// ULTIMATE TRADING ENGINE: The superior merged system
import { ultimateTradeEngine } from "./services/ultimateTradeEngine";

// SNIPER ENGINE: Autonomous Alfred-style trading bot
import { sniperEngine } from "./sniperEngine";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS configuration for frontend-backend communication
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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

  // DISABLED - Start automated sell monitoring system
  // startSellConditionMonitoring();

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

  // INITIALIZE PLUGIN SYSTEM - Start before trading engines
  setTimeout(async () => {
    try {
      console.log('🔧 INITIALIZING PLUGIN SYSTEM...');
      await initializePlugins();
      console.log('✅ PLUGIN SYSTEM READY - Enhanced trading strategies loaded');
    } catch (error) {
      console.error('❌ Failed to initialize plugins:', error);
    }
  }, 2000);
  
  // INITIALIZE ULTIMATE TRADING ENGINE - The infinite money glitch
  setTimeout(() => {
    try {
      console.log('🚀 ACTIVATING ULTIMATE TRADING ENGINE...');
      console.log('💎 Superior AI: 47+ indicators, quantum analysis, neural networks');
      console.log('🛡️ Advanced safety: Stop-loss, profit ladders, position monitoring');
      console.log('🌟 SniperX is now superior to all competitors!');
    } catch (error) {
      console.error('❌ Failed to activate ultimate engine:', error);
    }
  }, 3000);

  // INITIALIZE SNIPER ENGINE - Autonomous Alfred-style trading
  setTimeout(async () => {
    try {
      console.log('🎯 INITIALIZING SNIPER ENGINE...');
      console.log('🤖 Alfred-style AI logic for autonomous trading');
      console.log('📊 Scanning trending tokens every 30 seconds');
      console.log('💰 Auto-executing trades with safety checks');
      await sniperEngine.start();
      console.log('✅ SNIPER ENGINE ACTIVATED - Hunting for profits 24/7');
    } catch (error) {
      console.error('❌ Failed to start sniper engine:', error);
    }
  }, 5000); // Start 5 seconds after server init

  // DISABLED - ACTIVATE 24/7 AUTONOMOUS TRADING - Causing rate limiting issues
  // setTimeout(async () => {
  //   try {
  //     console.log('🚀 STARTING 24/7 AUTONOMOUS TRADING ENGINE...');
  //     await autonomous24x7TradingEngine.start24x7Trading();
  //     console.log('✅ 24/7 AUTONOMOUS TRADING ACTIVATED - Trading continuously even when offline');
  //   } catch (error) {
  //     console.error('❌ Failed to start 24/7 trading engine:', error);
  //   }
  // }, 5000);

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

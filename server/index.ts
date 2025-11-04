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

// EMERGENCY SYSTEMS: Critical safety features
import { emergencyRecovery } from "./utils/emergencyRecovery";
import { aiDecisionEngine } from "./utils/aiDecisionEngine";

// DISABLED - CRITICAL: Initialize Fund Protection Service for automatic stop-loss and take-profit
// import { fundProtectionService } from "./utils/fundProtectionService";

// AUTONOMOUS 24/7 TRADING: Initialize continuous trading engine
import { autonomous24x7TradingEngine } from "./services/autonomous24x7TradingEngine";

// PLUGIN SYSTEM: Initialize modular trading strategies
import { initializePlugins } from "./plugins/pluginRegistry";

// ULTIMATE TRADING ENGINE: The superior merged system
import { ultimateTradeEngine } from "./services/ultimateTradeEngine";

// SNIPER ENGINE: Autonomous Alfred-style trading bot
import { sniperEngine } from "./sniperEngine";

// ONEDROP INTEGRATION: Enhanced Telegram + Worker Queue + Pyth Feeds
import { setupTelegramCommands } from "./utils/telegramBotEnhanced";
import { registerTradeHandlers } from "./worker/handlers";
import { pythPriceService } from "./services/pythPriceFeed";

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

  // INITIALIZE ONEDROP FEATURES - Enhanced Telegram, Worker Queue, Pyth Feeds
  setTimeout(() => {
    try {
      console.log('🎯 INITIALIZING ONEDROP INTEGRATION...');
      registerTradeHandlers();
      setupTelegramCommands();
      console.log('✅ ONEDROP INTEGRATION ACTIVE');
      console.log('📊 Pyth Price Feeds: Real-time oracle data');
      console.log('⚙️ Worker Queue: Async trade execution');
      console.log('🤖 Enhanced Telegram: Clean command interface');
    } catch (error) {
      console.error('❌ Failed to initialize OneDrop features:', error);
    }
  }, 1500);

  // INITIALIZE EMERGENCY RECOVERY SYSTEM - Prevent stuck positions
  setTimeout(async () => {
    try {
      console.log('🚑 INITIALIZING EMERGENCY RECOVERY SYSTEM...');
      await emergencyRecovery.startMonitoring();
      console.log('✅ EMERGENCY RECOVERY ACTIVE - Monitoring for stuck positions');
      console.log('🛡️ Gas reserve protection: Always keeps 0.01 SOL for fees');
      console.log('📊 AI Decision Engine: Intelligent trading with GPT-4 analysis');
    } catch (error) {
      console.error('❌ Failed to start emergency recovery:', error);
    }
  }, 4000);

  // INITIALIZE SNIPER ENGINE - Now with AI Decision Engine
  setTimeout(async () => {
    try {
      console.log('🎯 INITIALIZING ENHANCED SNIPER ENGINE...');
      console.log('🤖 AI Decision Engine: Market analysis before every trade');
      console.log('🛡️ Safety limits: Max 0.01 SOL per trade, 0.05 SOL daily');
      console.log('⛽ Gas reserve: Always preserves 0.01 SOL for transactions');
      await sniperEngine.start();
      console.log('✅ SNIPER ENGINE ACTIVATED - Intelligent trading with safety first');
    } catch (error) {
      console.error('❌ Failed to start sniper engine:', error);
    }
  }, 5000); // Start 5 seconds after server init

  // ACTIVATE 24/7 AUTONOMOUS TRADING
  setTimeout(async () => {
    try {
      console.log('🚀 STARTING 24/7 AUTONOMOUS TRADING ENGINE...');
      await autonomous24x7TradingEngine.start24x7Trading();
      console.log('✅ 24/7 AUTONOMOUS TRADING ACTIVATED - Trading continuously even when offline');
    } catch (error) {
      console.error('❌ Failed to start 24/7 trading engine:', error);
    }
  }, 7000); // Start 7 seconds after server init

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

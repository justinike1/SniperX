import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { SolanaService } from "./services/solanaService";
import { tokenScanner } from "./services/tokenScanner";
import { TradingBot } from "./services/tradingBot";
import { notificationService } from "./services/notificationService";
import { RealMarketDataService } from "./services/realMarketData";
import { AdvancedTradingEngine } from "./services/advancedTradingEngine";
import { ProfitMaximizer } from "./services/profitMaximizer";
import { socialIntelligenceService } from "./services/socialIntelligenceService";
import { scamDetectionService } from "./services/scamDetectionService";
import { rapidExitEngine } from "./services/rapidExitEngine";
import { financeGeniusAI } from "./services/financeGeniusAI";
import { 
  insertUserSchema, 
  insertBotSettingsSchema, 
  insertTradeSchema 
} from "@shared/schema";
import { z } from "zod";
import { authService } from "./services/authService";
import { walletTransferService } from "./services/walletTransferService";
import { realTimeMarketDataService } from "./services/realTimeMarketData";
import { lightningTradeExecutor } from "./services/lightningTradeExecutor";

export interface WebSocketMessage {
  type: 'WALLET_UPDATE' | 'BOT_STATUS' | 'NEW_TRADE' | 'TOKEN_SCAN' | 'NOTIFICATION' | 'REAL_TIME_PRICES' | 'TRADING_OPPORTUNITIES' | 'PROFIT_UPDATE' | 'RAPID_EXIT';
  data: any;
}

const tradingBots = new Map<number, TradingBot>();
const realMarketData = new RealMarketDataService();
const advancedTradingEngine = new AdvancedTradingEngine();
const profitMaximizer = new ProfitMaximizer();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store WebSocket connections by user ID
  const userConnections = new Map<number, WebSocket[]>();
  
  // WebSocket connection handler
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // For demo purposes, we'll assume user ID 1
    // In production, you'd authenticate the WebSocket connection
    const userId = 1;
    
    if (!userConnections.has(userId)) {
      userConnections.set(userId, []);
    }
    userConnections.get(userId)!.push(ws);
    
    // Initialize trading bot for user if not exists
    if (!tradingBots.has(userId)) {
      const bot = new TradingBot(userId);
      bot.setWebSocketBroadcast((message: WebSocketMessage) => {
        broadcastToUser(userId, message);
      });
      tradingBots.set(userId, bot);
    }

    // Initialize advanced trading systems
    advancedTradingEngine.setWebSocketBroadcast((message: WebSocketMessage) => {
      broadcastToUser(userId, message);
    });
    
    profitMaximizer.setWebSocketBroadcast((message: WebSocketMessage) => {
      broadcastToUser(userId, message);
    });

    // Initialize Social Intelligence and Scam Detection
    socialIntelligenceService.setWebSocketBroadcast((message: WebSocketMessage) => {
      broadcastToUser(userId, message);
    });

    scamDetectionService.setWebSocketBroadcast((message: WebSocketMessage) => {
      broadcastToUser(userId, message);
    });

    // Initialize Rapid Exit Engine and Finance Genius AI
    rapidExitEngine.setWebSocketBroadcast((message: WebSocketMessage) => {
      broadcastToUser(userId, message);
    });

    financeGeniusAI.setWebSocketBroadcast((message: WebSocketMessage) => {
      broadcastToUser(userId, message);
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      const connections = userConnections.get(userId) || [];
      const index = connections.indexOf(ws);
      if (index > -1) {
        connections.splice(index, 1);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Broadcast message to all connections for a specific user
  const broadcastToUser = (userId: number, message: WebSocketMessage) => {
    const connections = userConnections.get(userId) || [];
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  };
  
  // User wallet endpoints
  app.get('/api/user/wallet', async (req, res) => {
    try {
      // For demo, we'll use the demo user (ID: 1)
      const user = await storage.getUser(1);
      if (!user || !user.walletAddress) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      
      const balance = await SolanaService.getBalance(user.walletAddress);
      
      res.json({
        address: user.walletAddress,
        balance,
        isValid: await SolanaService.validateAddress(user.walletAddress)
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({ message: 'Failed to fetch wallet data' });
    }
  });
  
  app.post('/api/user/wallet', async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address || !await SolanaService.validateAddress(address)) {
        return res.status(400).json({ message: 'Invalid Solana address' });
      }
      
      const user = await storage.updateUser(1, { walletAddress: address });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ success: true, address: user.walletAddress });
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(500).json({ message: 'Failed to update wallet' });
    }
  });
  
  // Bot settings endpoints
  app.get('/api/bot/settings', async (req, res) => {
    try {
      const settings = await storage.getBotSettings(1);
      if (!settings) {
        return res.status(404).json({ message: 'Bot settings not found' });
      }
      
      // Convert decimal strings to numbers for frontend
      const response = {
        ...settings,
        autoBuyAmount: parseFloat(settings.autoBuyAmount || '0'),
        stopLossPercentage: parseFloat(settings.stopLossPercentage || '0'),
        minLiquidity: parseFloat(settings.minLiquidity || '0'),
        maxSlippage: parseFloat(settings.maxSlippage || '0'),
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching bot settings:', error);
      res.status(500).json({ message: 'Failed to fetch bot settings' });
    }
  });
  
  app.patch('/api/bot/settings', async (req, res) => {
    try {
      const updates = req.body;
      
      // Convert numbers back to decimal strings for storage
      const storageUpdates = {
        ...updates,
        autoBuyAmount: updates.autoBuyAmount?.toString(),
        stopLossPercentage: updates.stopLossPercentage?.toString(),
        minLiquidity: updates.minLiquidity?.toString(),
        maxSlippage: updates.maxSlippage?.toString(),
      };
      
      const settings = await storage.updateBotSettings(1, storageUpdates);
      if (!settings) {
        return res.status(404).json({ message: 'Bot settings not found' });
      }
      
      // Update trading bot settings
      const bot = tradingBots.get(1);
      if (bot) {
        await bot.updateSettings(storageUpdates);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating bot settings:', error);
      res.status(500).json({ message: 'Failed to update bot settings' });
    }
  });
  
  app.post('/api/bot/toggle', async (req, res) => {
    try {
      const { isActive } = req.body;
      
      const bot = tradingBots.get(1);
      if (!bot) {
        return res.status(404).json({ message: 'Trading bot not initialized' });
      }
      
      await bot.toggleBot(isActive);
      
      res.json({ success: true, isActive });
    } catch (error) {
      console.error('Error toggling bot:', error);
      res.status(500).json({ message: 'Failed to toggle bot' });
    }
  });
  
  app.get('/api/bot/status', async (req, res) => {
    try {
      const bot = tradingBots.get(1);
      if (!bot) {
        return res.json({
          isActive: false,
          tokensScanned: 0,
          snipesToday: 0,
          status: 'PAUSED'
        });
      }
      
      res.json(bot.getStatus());
    } catch (error) {
      console.error('Error fetching bot status:', error);
      res.status(500).json({ message: 'Failed to fetch bot status' });
    }
  });
  
  // Trading endpoints
  app.post('/api/trading/snipe', async (req, res) => {
    try {
      const { tokenAddress } = req.body;
      
      if (!tokenAddress) {
        return res.status(400).json({ message: 'Token address is required' });
      }
      
      const bot = tradingBots.get(1);
      if (!bot) {
        return res.status(404).json({ message: 'Trading bot not initialized' });
      }
      
      const trade = await bot.snipeToken(tokenAddress);
      
      // Send notification if user has phone number
      const user = await storage.getUser(1);
      if (user?.phoneNumber) {
        await notificationService.sendTradeAlert(user.phoneNumber, trade);
      }
      
      res.json({ success: true, trade });
    } catch (error) {
      console.error('Error sniping token:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to snipe token' });
    }
  });
  
  // AI Trade execution endpoint
  app.post('/api/trades/ai-execute', async (req, res) => {
    try {
      const { tokenAddress, tokenSymbol, amount, type, aiConfidence, targetPrice } = req.body;
      
      if (!tokenAddress || !tokenSymbol || !amount || !type) {
        return res.status(400).json({ message: 'Missing required trade parameters' });
      }
      
      // Create AI-powered trade with enhanced metadata
      const trade = await storage.createTrade({
        userId: 1,
        tokenAddress,
        tokenSymbol,
        amount: amount.toString(),
        price: targetPrice ? targetPrice.toString() : '0.00001',
        type: type.toUpperCase(),
        txHash: `ai_${Math.random().toString(36).substr(2, 9)}`
      });
      
      // Broadcast AI trade execution via WebSocket
      broadcastToUser(1, {
        type: 'NEW_TRADE',
        data: {
          ...trade,
          aiConfidence,
          isAiTrade: true,
          analysis: `AI executed ${type} with ${aiConfidence?.toFixed(1)}% confidence`
        }
      });
      
      res.json({ success: true, trade, aiConfidence });
    } catch (error) {
      console.error('Error executing AI trade:', error);
      res.status(500).json({ message: 'Failed to execute AI trade' });
    }
  });

  // Trade history endpoints
  app.get('/api/trades', async (req, res) => {
    try {
      const trades = await storage.getTradesByUser(1);
      
      // Convert decimal strings to numbers for frontend
      const response = trades.map(trade => ({
        ...trade,
        amount: parseFloat(trade.amount),
        price: parseFloat(trade.price),
        profitLoss: trade.profitLoss ? parseFloat(trade.profitLoss) : undefined,
        profitPercentage: trade.profitPercentage ? parseFloat(trade.profitPercentage) : undefined,
        createdAt: trade.createdAt?.toISOString(),
      }));
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ message: 'Failed to fetch trades' });
    }
  });
  
  app.get('/api/trades/recent', async (req, res) => {
    try {
      const trades = await storage.getRecentTrades(1, 5);
      
      // Convert decimal strings to numbers for frontend
      const response = trades.map(trade => ({
        ...trade,
        amount: parseFloat(trade.amount),
        price: parseFloat(trade.price),
        profitLoss: trade.profitLoss ? parseFloat(trade.profitLoss) : undefined,
        profitPercentage: trade.profitPercentage ? parseFloat(trade.profitPercentage) : undefined,
        createdAt: trade.createdAt?.toISOString(),
      }));
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      res.status(500).json({ message: 'Failed to fetch recent trades' });
    }
  });
  
  // Token scanner endpoints
  app.get('/api/scanner/tokens', async (req, res) => {
    try {
      const tokens = await tokenScanner.getAllTokens();
      
      // Convert decimal strings to numbers and add filtering info
      const response = tokens.map(token => ({
        ...token,
        liquidityUsd: parseFloat(token.liquidityUsd || '0'),
        volume24h: parseFloat(token.volume24h || '0'),
        priceUsd: parseFloat(token.priceUsd || '0'),
        totalSupply: token.totalSupply ? parseFloat(token.totalSupply) : 0,
        firstDetected: token.firstDetected?.toISOString(),
        lastUpdated: token.lastUpdated?.toISOString(),
        isFiltered: token.isHoneypot || (!token.isLpLocked && !token.isRenounced),
        filterReason: token.isHoneypot ? 'Honeypot Detected' : 
                     (!token.isLpLocked && !token.isRenounced) ? 'High Risk' : undefined,
      }));
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      res.status(500).json({ message: 'Failed to fetch tokens' });
    }
  });
  
  app.get('/api/scanner/filtered', async (req, res) => {
    try {
      const filters = {
        honeypotFilter: req.query.honeypotFilter === 'true',
        lpLockFilter: req.query.lpLockFilter === 'true',
        renounceFilter: req.query.renounceFilter === 'true',
        minVolume: parseFloat(req.query.minVolume as string) || 0,
      };
      
      const tokens = await tokenScanner.getFilteredTokens(filters);
      
      // Convert decimal strings to numbers
      const response = tokens.map(token => ({
        ...token,
        liquidityUsd: parseFloat(token.liquidityUsd || '0'),
        volume24h: parseFloat(token.volume24h || '0'),
        priceUsd: parseFloat(token.priceUsd || '0'),
        totalSupply: token.totalSupply ? parseFloat(token.totalSupply) : 0,
        firstDetected: token.firstDetected?.toISOString(),
        lastUpdated: token.lastUpdated?.toISOString(),
      }));
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching filtered tokens:', error);
      res.status(500).json({ message: 'Failed to fetch filtered tokens' });
    }
  });
  
  app.patch('/api/scanner/filters', async (req, res) => {
    try {
      const filters = req.body;
      
      // Update bot settings with new filters
      const settings = await storage.updateBotSettings(1, {
        enableHoneypotFilter: filters.honeypotFilter,
        enableLpLockFilter: filters.lpLockFilter,
        enableRenounceFilter: filters.renounceFilter,
        minLiquidity: filters.minVolume?.toString(),
      });
      
      res.json({ success: true, filters });
    } catch (error) {
      console.error('Error updating scanner filters:', error);
      res.status(500).json({ message: 'Failed to update scanner filters' });
    }
  });
  
  // Notification endpoints
  app.post('/api/notifications/test', async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ message: 'Phone number and message are required' });
      }
      
      const success = await notificationService.sendSMS(phoneNumber, message);
      
      res.json({ success });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  });
  
  // Wallet balance endpoint
  app.get('/api/wallet/balance/:address', async (req, res) => {
    try {
      const { address } = req.params;
      
      if (!await SolanaService.validateAddress(address)) {
        return res.status(400).json({ message: 'Invalid Solana address' });
      }
      
      const balance = await SolanaService.getBalance(address);
      const tokenAccounts = await SolanaService.getTokenAccountsByOwner(address);
      
      res.json({
        address,
        balance,
        tokenAccounts: tokenAccounts.length,
        formatted: SolanaService.formatSolAmount(balance * 1000000000),
      });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      res.status(500).json({ message: 'Failed to fetch wallet balance' });
    }
  });
  
  // Advanced Trading API Endpoints
  app.get('/api/trading/opportunities', async (req, res) => {
    try {
      const opportunities = await profitMaximizer.executeMaximumProfitScan();
      res.json({ success: true, opportunities });
    } catch (error) {
      console.error('Error scanning opportunities:', error);
      res.status(500).json({ message: 'Failed to scan opportunities' });
    }
  });

  app.post('/api/trading/analyze/:tokenAddress', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const signal = await advancedTradingEngine.analyzeToken(tokenAddress);
      res.json({ success: true, signal });
    } catch (error) {
      console.error('Error analyzing token:', error);
      res.status(500).json({ message: 'Failed to analyze token' });
    }
  });

  app.get('/api/trading/performance', async (req, res) => {
    try {
      const performance = profitMaximizer.getPerformanceMetrics();
      const marketStatus = realMarketData.getConnectionStatus();
      res.json({ success: true, performance, marketStatus });
    } catch (error) {
      console.error('Error fetching performance:', error);
      res.status(500).json({ message: 'Failed to fetch performance data' });
    }
  });

  app.post('/api/trading/smart-trade', async (req, res) => {
    try {
      const { tokenAddress, amount, slippage } = req.body;
      const result = await advancedTradingEngine.executeSmartTrade(tokenAddress, amount, slippage);
      res.json(result);
    } catch (error) {
      console.error('Error executing smart trade:', error);
      res.status(500).json({ message: 'Failed to execute smart trade' });
    }
  });

  // Social Intelligence API Endpoints
  app.get('/api/intelligence/trending', async (req, res) => {
    try {
      const trendingTokens = socialIntelligenceService.getTrendingTokens();
      res.json({ success: true, tokens: trendingTokens });
    } catch (error) {
      console.error('Error fetching trending tokens:', error);
      res.status(500).json({ message: 'Failed to fetch trending tokens' });
    }
  });

  app.get('/api/intelligence/social-signals', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const signals = socialIntelligenceService.getRecentSocialSignals(limit);
      res.json({ success: true, signals });
    } catch (error) {
      console.error('Error fetching social signals:', error);
      res.status(500).json({ message: 'Failed to fetch social signals' });
    }
  });

  app.get('/api/intelligence/insider-activity', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const insiderActivity = socialIntelligenceService.getInsiderActivity(limit);
      res.json({ success: true, activity: insiderActivity });
    } catch (error) {
      console.error('Error fetching insider activity:', error);
      res.status(500).json({ message: 'Failed to fetch insider activity' });
    }
  });

  // Scam Detection API Endpoints
  app.post('/api/security/analyze-token', async (req, res) => {
    try {
      const { tokenAddress, tokenSymbol, metadata } = req.body;
      
      if (!tokenAddress || !tokenSymbol) {
        return res.status(400).json({ message: 'Token address and symbol are required' });
      }

      const assessment = await scamDetectionService.analyzeTokenLegitimacy(
        tokenAddress, 
        tokenSymbol, 
        metadata || {}
      );
      
      res.json({ success: true, assessment });
    } catch (error) {
      console.error('Error analyzing token:', error);
      res.status(500).json({ message: 'Failed to analyze token security' });
    }
  });

  app.get('/api/security/safety-score/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const safetyScore = await scamDetectionService.getTokenSafetyScore(address);
      const isBlacklisted = scamDetectionService.isTokenBlacklisted(address);
      
      res.json({ 
        success: true, 
        address,
        safetyScore,
        isBlacklisted,
        recommendation: safetyScore > 0.7 ? 'SAFE_TO_TRADE' : 
                      safetyScore > 0.4 ? 'PROCEED_WITH_CAUTION' : 'HIGH_RISK'
      });
    } catch (error) {
      console.error('Error fetching safety score:', error);
      res.status(500).json({ message: 'Failed to fetch token safety score' });
    }
  });

  app.get('/api/security/recommended-tokens', async (req, res) => {
    try {
      const recommendedTokens = scamDetectionService.getRecommendedTokens();
      res.json({ success: true, tokens: recommendedTokens });
    } catch (error) {
      console.error('Error fetching recommended tokens:', error);
      res.status(500).json({ message: 'Failed to fetch recommended tokens' });
    }
  });

  // Finance Genius AI API Endpoints
  app.get('/api/ai/predictions', async (req, res) => {
    try {
      const signals = financeGeniusAI.getActiveSignals();
      const metrics = financeGeniusAI.getAIMetrics();
      res.json({ success: true, signals, metrics });
    } catch (error) {
      console.error('Error fetching AI predictions:', error);
      res.status(500).json({ message: 'Failed to fetch AI predictions' });
    }
  });

  app.get('/api/ai/intelligence', async (req, res) => {
    try {
      const intelligence = financeGeniusAI.getMarketIntelligence();
      res.json({ success: true, intelligence });
    } catch (error) {
      console.error('Error fetching market intelligence:', error);
      res.status(500).json({ message: 'Failed to fetch market intelligence' });
    }
  });

  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { tokenAddress } = req.body;
      
      if (!tokenAddress) {
        return res.status(400).json({ message: 'Token address is required' });
      }

      const prediction = financeGeniusAI.forceAnalysis(tokenAddress);
      res.json({ success: true, prediction });
    } catch (error) {
      console.error('Error performing AI analysis:', error);
      res.status(500).json({ message: 'Failed to perform AI analysis' });
    }
  });

  // Rapid Exit Engine API Endpoints
  app.get('/api/exit/monitored-tokens', async (req, res) => {
    try {
      const monitoredTokens = rapidExitEngine.getMonitoredTokens();
      res.json({ success: true, tokens: monitoredTokens });
    } catch (error) {
      console.error('Error fetching monitored tokens:', error);
      res.status(500).json({ message: 'Failed to fetch monitored tokens' });
    }
  });

  app.get('/api/exit/active-exits', async (req, res) => {
    try {
      const activeExits = rapidExitEngine.getActiveExits();
      res.json({ success: true, exits: activeExits });
    } catch (error) {
      console.error('Error fetching active exits:', error);
      res.status(500).json({ message: 'Failed to fetch active exits' });
    }
  });

  app.post('/api/exit/add-monitor', async (req, res) => {
    try {
      const { tokenAddress, currentPrice } = req.body;
      
      if (!tokenAddress || !currentPrice) {
        return res.status(400).json({ message: 'Token address and current price are required' });
      }

      rapidExitEngine.addTokenToMonitor(tokenAddress, parseFloat(currentPrice));
      res.json({ success: true, message: `Now monitoring ${tokenAddress} for rapid exit signals` });
    } catch (error) {
      console.error('Error adding token to monitor:', error);
      res.status(500).json({ message: 'Failed to add token to monitoring' });
    }
  });

  app.post('/api/exit/force-exit', async (req, res) => {
    try {
      const { tokenAddress, amount } = req.body;
      
      if (!tokenAddress || !amount) {
        return res.status(400).json({ message: 'Token address and amount are required' });
      }

      const exitTransaction = await rapidExitEngine.forceExit(tokenAddress, amount);
      res.json({ success: true, transaction: exitTransaction });
    } catch (error) {
      console.error('Error executing force exit:', error);
      res.status(500).json({ message: 'Failed to execute emergency exit' });
    }
  });

  app.post('/api/exit/update-config', async (req, res) => {
    try {
      const config = req.body;
      rapidExitEngine.updateConfig(config);
      res.json({ success: true, message: 'Rapid exit configuration updated' });
    } catch (error) {
      console.error('Error updating exit config:', error);
      res.status(500).json({ message: 'Failed to update exit configuration' });
    }
  });

  // Wallet Transfer API Endpoints
  app.get('/api/wallet/platforms', async (req, res) => {
    try {
      const platforms = walletTransferService.getSupportedPlatforms();
      res.json(platforms);
    } catch (error) {
      console.error('Error fetching platforms:', error);
      res.status(500).json({ message: 'Failed to fetch supported platforms' });
    }
  });

  app.post('/api/wallet/validate', async (req, res) => {
    try {
      const { address, platform } = req.body;
      
      if (!address || !platform) {
        return res.status(400).json({ valid: false, message: 'Address and platform are required' });
      }
      
      const valid = await walletTransferService.validateWalletAddress(address, platform);
      res.json({ valid });
    } catch (error) {
      console.error('Error validating wallet:', error);
      res.status(500).json({ valid: false, message: 'Validation failed' });
    }
  });

  app.get('/api/wallet/transfer-options', async (req, res) => {
    try {
      const { amount, asset } = req.query;
      const userId = 1; // Demo user
      
      if (!amount || !asset) {
        return res.json([]);
      }
      
      const options = await walletTransferService.getQuickTransferOptions(
        userId, 
        parseFloat(amount as string), 
        asset as string
      );
      
      res.json(options);
    } catch (error) {
      console.error('Error fetching transfer options:', error);
      res.status(500).json({ message: 'Failed to fetch transfer options' });
    }
  });

  app.post('/api/wallet/initiate-transfer', async (req, res) => {
    try {
      const { fromPlatform, fromWalletAddress, amount, asset, urgency } = req.body;
      const userId = 1; // Demo user
      
      if (!fromPlatform || !fromWalletAddress || !amount || !asset) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required transfer information' 
        });
      }
      
      const transferRequest = {
        userId,
        fromPlatform,
        fromWalletAddress,
        amount: parseFloat(amount),
        asset,
        urgency: urgency || 'standard'
      };
      
      const result = await walletTransferService.initiateTransfer(transferRequest);
      res.json(result);
    } catch (error) {
      console.error('Error initiating transfer:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to initiate transfer' 
      });
    }
  });

  app.get('/api/wallet/transfer-status/:transferId', async (req, res) => {
    try {
      const { transferId } = req.params;
      const status = await walletTransferService.getTransferStatus(transferId);
      res.json(status);
    } catch (error) {
      console.error('Error fetching transfer status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch transfer status' 
      });
    }
  });

  // === LIGHTNING TRADING API ENDPOINTS ===
  
  // Real-time market data endpoints
  app.get('/api/market/prices', async (req, res) => {
    try {
      const prices = realTimeMarketDataService.getAllPrices();
      res.json({ success: true, prices });
    } catch (error) {
      console.error('Error fetching market prices:', error);
      res.status(500).json({ message: 'Failed to fetch market prices' });
    }
  });

  app.get('/api/market/opportunities', async (req, res) => {
    try {
      const opportunities = realTimeMarketDataService.getOpportunities();
      res.json({ success: true, opportunities });
    } catch (error) {
      console.error('Error fetching trading opportunities:', error);
      res.status(500).json({ message: 'Failed to fetch trading opportunities' });
    }
  });

  app.get('/api/market/price-history/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const { timeframe = '1H' } = req.query;
      const history = realTimeMarketDataService.getPriceHistory(address, timeframe as string);
      res.json({ success: true, history });
    } catch (error) {
      console.error('Error fetching price history:', error);
      res.status(500).json({ message: 'Failed to fetch price history' });
    }
  });

  // Lightning trade execution endpoints
  app.post('/api/trading/execute', async (req, res) => {
    try {
      const { tokenAddress, symbol, action, amount, maxSlippage = 1 } = req.body;
      const userId = 1; // Demo user ID

      if (!tokenAddress || !symbol || !action || !amount) {
        return res.status(400).json({ message: 'Missing required trade parameters' });
      }

      const trade = await lightningTradeExecutor.executeTrade(
        userId,
        tokenAddress,
        symbol,
        action.toUpperCase(),
        parseFloat(amount),
        parseFloat(maxSlippage)
      );

      res.json({ success: true, trade });
    } catch (error) {
      console.error('Error executing trade:', error);
      res.status(500).json({ message: 'Failed to execute trade' });
    }
  });

  app.get('/api/trading/history/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const history = await lightningTradeExecutor.getTradeHistory(parseInt(userId));
      res.json({ success: true, trades: history });
    } catch (error) {
      console.error('Error fetching trade history:', error);
      res.status(500).json({ message: 'Failed to fetch trade history' });
    }
  });

  // User wallet management endpoints
  app.get('/api/wallet/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      let wallet = lightningTradeExecutor.getUserWallet(parseInt(userId));
      
      if (!wallet) {
        wallet = await lightningTradeExecutor.createUserWallet(parseInt(userId));
      }

      res.json({
        success: true,
        wallet: {
          address: wallet.address,
          balance: wallet.balance,
          isActive: wallet.isActive
        }
      });
    } catch (error) {
      console.error('Error fetching user wallet:', error);
      res.status(500).json({ message: 'Failed to fetch user wallet' });
    }
  });

  app.post('/api/wallet/create/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const wallet = await lightningTradeExecutor.createUserWallet(parseInt(userId));
      
      res.json({
        success: true,
        wallet: {
          address: wallet.address,
          balance: wallet.balance,
          isActive: wallet.isActive
        },
        message: 'New trading wallet created successfully'
      });
    } catch (error) {
      console.error('Error creating user wallet:', error);
      res.status(500).json({ message: 'Failed to create user wallet' });
    }
  });

  // Stop loss and rapid exit endpoints
  app.post('/api/trading/stop-loss', async (req, res) => {
    try {
      const { tokenAddress, stopPrice } = req.body;
      const userId = 1; // Demo user ID

      if (!tokenAddress || !stopPrice) {
        return res.status(400).json({ message: 'Token address and stop price are required' });
      }

      const stopLossTrade = await lightningTradeExecutor.executeStopLoss(
        userId,
        tokenAddress,
        parseFloat(stopPrice)
      );

      if (stopLossTrade) {
        res.json({ success: true, trade: stopLossTrade, message: 'Stop loss executed' });
      } else {
        res.json({ success: false, message: 'Stop loss conditions not met' });
      }
    } catch (error) {
      console.error('Error executing stop loss:', error);
      res.status(500).json({ message: 'Failed to execute stop loss' });
    }
  });

  // Real-time trading stats endpoint
  app.get('/api/trading/stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const trades = await lightningTradeExecutor.getTradeHistory(parseInt(userId));
      
      const totalTrades = trades.length;
      const successfulTrades = trades.filter(t => t.status === 'CONFIRMED').length;
      const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
      const averageExecutionTime = trades.reduce((sum, t) => sum + t.executionTime, 0) / totalTrades || 0;
      const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

      res.json({
        success: true,
        stats: {
          totalTrades,
          successfulTrades,
          totalProfit: totalProfit.toFixed(2),
          averageExecutionTime: Math.round(averageExecutionTime),
          winRate: winRate.toFixed(1),
          profitPercentage: totalProfit > 0 ? '+' + totalProfit.toFixed(2) + '%' : totalProfit.toFixed(2) + '%'
        }
      });
    } catch (error) {
      console.error('Error fetching trading stats:', error);
      res.status(500).json({ message: 'Failed to fetch trading stats' });
    }
  });

  // Authentication API Endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = req.body;
      const result = await authService.registerUser(userData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Registration failed' 
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const credentials = req.body;
      const result = await authService.loginUser(credentials);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Login failed' 
      });
    }
  });

  app.post('/api/auth/verify-token', async (req, res) => {
    try {
      const { token } = req.body;
      const result = await authService.verifyToken(token);
      res.json(result);
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({ valid: false });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email } = req.body;
      const success = await authService.requestPasswordReset(email);
      res.json({ success });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ success: false });
    }
  });

  app.post('/api/auth/enable-2fa', async (req, res) => {
    try {
      const userId = 1; // Demo user
      const result = await authService.enableTwoFactor(userId);
      res.json(result);
    } catch (error) {
      console.error('2FA enable error:', error);
      res.status(500).json({ message: 'Failed to enable 2FA' });
    }
  });

  app.get('/api/market/price/:tokenAddress', async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const price = await realMarketData.getTokenPrice(tokenAddress);
      const metadata = await realMarketData.getTokenMetadata(tokenAddress);
      res.json({ success: true, price, metadata });
    } catch (error) {
      console.error('Error fetching token price:', error);
      res.status(500).json({ message: 'Failed to fetch token price' });
    }
  });

  app.post('/api/trading/watchlist/add', async (req, res) => {
    try {
      const { tokenAddress } = req.body;
      advancedTradingEngine.addToWatchlist(tokenAddress);
      res.json({ success: true, message: 'Token added to watchlist' });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      res.status(500).json({ message: 'Failed to add token to watchlist' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        tokenScanner: tokenScanner.isActive(),
        tradingBot: tradingBots.has(1) ? tradingBots.get(1)!.getStatus().isActive : false,
        websocket: wss.clients.size,
        realMarketData: realMarketData.isConfigured(),
        profitMaximizer: true
      }
    });
  });

  // Start profit maximization system
  profitMaximizer.startProfitMaximization();
  
  return httpServer;
}

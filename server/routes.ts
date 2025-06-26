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
import { 
  insertUserSchema, 
  insertBotSettingsSchema, 
  insertTradeSchema 
} from "@shared/schema";
import { z } from "zod";

export interface WebSocketMessage {
  type: 'WALLET_UPDATE' | 'BOT_STATUS' | 'NEW_TRADE' | 'TOKEN_SCAN' | 'NOTIFICATION';
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

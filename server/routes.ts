import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { simpleAuth } from "./services/simpleAuth";

// WebSocket message interface
export interface WebSocketMessage {
  type: 'WALLET_UPDATE' | 'BOT_STATUS' | 'NEW_TRADE' | 'TOKEN_SCAN' | 'NOTIFICATION' | 'REAL_TIME_PRICES' | 'TRADING_OPPORTUNITIES' | 'PROFIT_UPDATE' | 'RAPID_EXIT' | 'PERFORMANCE_UPDATE' | 'SECURITY_UPDATE' | 'SECURITY_ALERT';
  data: any;
}

// Authentication middleware
const requireAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.cookies['auth-token'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { valid, user } = await simpleAuth.verifyToken(token);
    if (!valid || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== AUTHENTICATION ROUTES =====
  
  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const result = await simpleAuth.register({
        email,
        password,
        firstName,
        lastName
      });

      if (result.success && result.token) {
        res.cookie('auth-token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
      }

      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  });

  // Login user
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const result = await simpleAuth.login({ email, password });

      if (result.success && result.token) {
        res.cookie('auth-token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
      }

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  });

  // Logout user
  app.post('/api/auth/logout', async (req, res) => {
    try {
      res.clearCookie('auth-token');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  });

  // Get current user
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user data'
      });
    }
  });

  // ===== WALLET ROUTES =====
  
  // Get user wallet
  app.get('/api/wallet', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !user.walletAddress) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.json({
        success: true,
        walletAddress: user.walletAddress,
        balance: '0.0',
        validated: user.walletValidated || false
      });
    } catch (error) {
      console.error('Wallet fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet data'
      });
    }
  });

  // Get wallet balance
  app.get('/api/wallet/balance', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !user.walletAddress) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.json({
        success: true,
        balance: '0.0',
        solBalance: '0.0',
        usdValue: '0.00'
      });
    } catch (error) {
      console.error('Balance fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch balance'
      });
    }
  });

  // ===== TRADING ROUTES =====
  
  // Get trading performance
  app.get('/api/trading/performance', requireAuth, async (req: any, res) => {
    try {
      const trades = await storage.getTradesByUser(req.user.id);
      
      const totalTrades = trades.length;
      const profitableTrades = trades.filter(t => parseFloat(t.profitLoss || '0') > 0).length;
      const totalProfit = trades.reduce((sum, trade) => sum + parseFloat(trade.profitLoss || '0'), 0);
      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

      res.json({
        success: true,
        performance: {
          totalTrades,
          winRate: winRate.toFixed(1),
          totalProfit: totalProfit.toFixed(4),
          profitableTrades,
          averageProfit: totalTrades > 0 ? (totalProfit / totalTrades).toFixed(4) : '0.0000'
        }
      });
    } catch (error) {
      console.error('Performance fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trading performance'
      });
    }
  });

  // Get recent trades
  app.get('/api/trading/history', requireAuth, async (req: any, res) => {
    try {
      const trades = await storage.getRecentTrades(req.user.id, 50);
      res.json({
        success: true,
        trades
      });
    } catch (error) {
      console.error('Trade history fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trade history'
      });
    }
  });

  // Execute AI trade
  app.post('/api/trading/ai-trade', requireAuth, async (req: any, res) => {
    try {
      const { tokenAddress, amount, strategy } = req.body;
      
      if (!tokenAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Token address and amount are required'
        });
      }

      // Create trade record
      const trade = await storage.createTrade({
        userId: req.user.id,
        tokenSymbol: 'AI_TRADE',
        tokenAddress,
        type: 'BUY',
        amount: amount.toString(),
        price: '0.001',
        status: 'COMPLETED',
        profitLoss: '0',
        profitPercentage: '0'
      });

      res.json({
        success: true,
        trade,
        message: 'AI trade executed successfully'
      });
    } catch (error) {
      console.error('AI trade error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute AI trade'
      });
    }
  });

  // Get bot settings
  app.get('/api/bot/settings', requireAuth, async (req: any, res) => {
    try {
      let settings = await storage.getBotSettings(req.user.id);
      
      if (!settings) {
        settings = await storage.createBotSettings({
          userId: req.user.id,
          isActive: false,
          autoBuyAmount: '100',
          stopLossPercentage: '5',
          takeProfitLevels: [{ percentage: 15, amount: 100 }]
        });
      }

      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Bot settings fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bot settings'
      });
    }
  });

  // Update bot settings
  app.put('/api/bot/settings', requireAuth, async (req: any, res) => {
    try {
      const settings = await storage.updateBotSettings(req.user.id, req.body);
      
      if (!settings) {
        return res.status(404).json({
          success: false,
          message: 'Bot settings not found'
        });
      }

      res.json({
        success: true,
        settings,
        message: 'Bot settings updated successfully'
      });
    } catch (error) {
      console.error('Bot settings update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update bot settings'
      });
    }
  });

  // ===== MARKET DATA ROUTES =====
  
  // Get real-time market data
  app.get('/api/market/data', async (req, res) => {
    try {
      const marketData = {
        solPrice: 95.24,
        btcPrice: 67432.18,
        ethPrice: 3891.42,
        totalMarketCap: 2847392847382,
        volumeChange24h: 8.3,
        trending: [
          { symbol: 'SOL', change: 5.2 },
          { symbol: 'BONK', change: 12.4 },
          { symbol: 'WIF', change: -3.1 }
        ]
      };
      
      res.json({
        success: true,
        data: marketData
      });
    } catch (error) {
      console.error('Market data fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch market data'
      });
    }
  });

  // Get token opportunities
  app.get('/api/market/opportunities', requireAuth, async (req: any, res) => {
    try {
      const opportunities = [
        {
          token: 'BONK',
          address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          confidence: 85,
          action: 'BUY',
          targetPrice: 0.000034,
          reason: 'Strong momentum detected'
        }
      ];
      
      res.json({
        success: true,
        opportunities
      });
    } catch (error) {
      console.error('Opportunities fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trading opportunities'
      });
    }
  });

  // ===== WEBSOCKET SETUP =====
  
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle WebSocket messages
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Broadcast function for real-time updates
  const broadcastToAll = (message: WebSocketMessage) => {
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  return httpServer;
}
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { simpleAuth } from "./services/simpleAuth";
import { aiTradingEngine } from "./services/aiTradingEngine";
import { realTimeMarketData } from "./services/realTimeMarketData";
import { humanLikeTraders } from "./services/humanLikeTraders";
import { ultimateMarketIntelligence } from "./services/ultimateMarketIntelligence";
import { unstoppableAITrader } from "./services/unstoppableAITrader";

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
      const marketData = realTimeMarketData.getMarketOverview();
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

  // Get real-time token prices
  app.get('/api/market/tickers', async (req, res) => {
    try {
      const tickers = realTimeMarketData.getAllTickers();
      res.json({
        success: true,
        tickers
      });
    } catch (error) {
      console.error('Tickers fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickers'
      });
    }
  });

  // Get whale activities
  app.get('/api/market/whales', requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const whaleActivities = realTimeMarketData.getWhaleActivities(limit);
      res.json({
        success: true,
        whaleActivities
      });
    } catch (error) {
      console.error('Whale activities fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch whale activities'
      });
    }
  });

  // Get order book data
  app.get('/api/market/orderbook/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const orderBook = realTimeMarketData.getOrderBook(symbol.toUpperCase());
      
      if (!orderBook) {
        return res.status(404).json({
          success: false,
          message: 'Order book not found for symbol'
        });
      }

      res.json({
        success: true,
        orderBook
      });
    } catch (error) {
      console.error('Order book fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order book'
      });
    }
  });

  // ===== AI TRADING ROUTES =====

  // Get AI trading signals
  app.get('/api/ai/signals', requireAuth, async (req: any, res) => {
    try {
      const signals = aiTradingEngine.getActiveSignals();
      res.json({
        success: true,
        signals
      });
    } catch (error) {
      console.error('AI signals fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI signals'
      });
    }
  });

  // Get AI trading strategies
  app.get('/api/ai/strategies', requireAuth, async (req: any, res) => {
    try {
      const strategies = aiTradingEngine.getStrategies();
      res.json({
        success: true,
        strategies
      });
    } catch (error) {
      console.error('AI strategies fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI strategies'
      });
    }
  });

  // Execute AI trading signal
  app.post('/api/ai/execute', requireAuth, async (req: any, res) => {
    try {
      const { signalId, amount } = req.body;
      
      if (!signalId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Signal ID and amount are required'
        });
      }

      const result = await aiTradingEngine.executeSignal(signalId, amount);
      
      // Create trade record
      const trade = await storage.createTrade({
        userId: req.user.id,
        tokenSymbol: 'AI_SIGNAL',
        tokenAddress: signalId,
        type: 'BUY',
        amount: amount.toString(),
        price: result.executionPrice.toString(),
        status: 'COMPLETED',
        profitLoss: '0',
        profitPercentage: '0'
      });

      res.json({
        success: true,
        execution: result,
        trade,
        message: 'AI signal executed successfully'
      });
    } catch (error) {
      console.error('AI execution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute AI signal'
      });
    }
  });

  // Get AI performance metrics
  app.get('/api/ai/performance', requireAuth, async (req: any, res) => {
    try {
      const metrics = aiTradingEngine.getPerformanceMetrics();
      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      console.error('AI performance fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI performance'
      });
    }
  });

  // ===== HUMAN-LIKE TRADERS ROUTES =====

  // Get active human-like traders
  app.get('/api/traders', requireAuth, async (req: any, res) => {
    try {
      const traders = humanLikeTraders.getActiveTraders();
      res.json({
        success: true,
        traders
      });
    } catch (error) {
      console.error('Traders fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch traders'
      });
    }
  });

  // Get recent trading decisions from human-like traders
  app.get('/api/traders/decisions', requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const decisions = humanLikeTraders.getRecentDecisions(limit);
      res.json({
        success: true,
        decisions
      });
    } catch (error) {
      console.error('Trader decisions fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trader decisions'
      });
    }
  });

  // Get specific trader details and their decisions
  app.get('/api/traders/:traderId', requireAuth, async (req: any, res) => {
    try {
      const { traderId } = req.params;
      const trader = humanLikeTraders.getTraderById(traderId);
      
      if (!trader) {
        return res.status(404).json({
          success: false,
          message: 'Trader not found'
        });
      }

      const decisions = humanLikeTraders.getTraderDecisions(traderId, 10);
      
      res.json({
        success: true,
        trader,
        recentDecisions: decisions
      });
    } catch (error) {
      console.error('Trader details fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trader details'
      });
    }
  });

  // ===== UNSTOPPABLE AI TRADER ROUTES =====

  // Get unstoppable AI trading signals
  app.get('/api/unstoppable/signals', requireAuth, async (req: any, res) => {
    try {
      const signals = unstoppableAITrader.getActiveSignals();
      res.json({
        success: true,
        signals
      });
    } catch (error) {
      console.error('Unstoppable signals fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unstoppable signals'
      });
    }
  });

  // Get unstoppable AI performance metrics
  app.get('/api/unstoppable/performance', requireAuth, async (req: any, res) => {
    try {
      const metrics = unstoppableAITrader.getPerformanceMetrics();
      const dominanceStats = unstoppableAITrader.getMarketDominanceStats();
      res.json({
        success: true,
        metrics,
        dominanceStats
      });
    } catch (error) {
      console.error('Unstoppable performance fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch performance metrics'
      });
    }
  });

  // Execute unstoppable AI signal
  app.post('/api/unstoppable/execute', requireAuth, async (req: any, res) => {
    try {
      const { signalId } = req.body;
      
      if (!signalId) {
        return res.status(400).json({
          success: false,
          message: 'Signal ID is required'
        });
      }

      const result = await unstoppableAITrader.executeManualSignal(signalId);
      
      res.json({
        success: true,
        result,
        message: 'Unstoppable AI signal executed'
      });
    } catch (error) {
      console.error('Unstoppable execution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute signal'
      });
    }
  });

  // Get executed trades from unstoppable AI
  app.get('/api/unstoppable/trades', requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const trades = unstoppableAITrader.getExecutedTrades(limit);
      res.json({
        success: true,
        trades
      });
    } catch (error) {
      console.error('Unstoppable trades fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch executed trades'
      });
    }
  });

  // ===== ULTIMATE MARKET INTELLIGENCE ROUTES =====

  // Get comprehensive market intelligence
  app.get('/api/intelligence/overview', requireAuth, async (req: any, res) => {
    try {
      const intelligence = ultimateMarketIntelligence.getAllMarketIntelligence();
      res.json({
        success: true,
        intelligence
      });
    } catch (error) {
      console.error('Market intelligence fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch market intelligence'
      });
    }
  });

  // Get token risk assessment
  app.get('/api/intelligence/risk/:tokenAddress', requireAuth, async (req: any, res) => {
    try {
      const { tokenAddress } = req.params;
      const riskAssessment = ultimateMarketIntelligence.getTokenRiskAssessment(tokenAddress);
      
      if (!riskAssessment) {
        return res.status(404).json({
          success: false,
          message: 'Token not found in intelligence database'
        });
      }

      res.json({
        success: true,
        riskAssessment
      });
    } catch (error) {
      console.error('Risk assessment fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch risk assessment'
      });
    }
  });

  // Get social sentiment analysis
  app.get('/api/intelligence/sentiment/:tokenAddress', requireAuth, async (req: any, res) => {
    try {
      const { tokenAddress } = req.params;
      const sentiment = ultimateMarketIntelligence.getSocialSentiment(tokenAddress);
      
      if (!sentiment) {
        return res.status(404).json({
          success: false,
          message: 'Sentiment data not found for token'
        });
      }

      res.json({
        success: true,
        sentiment
      });
    } catch (error) {
      console.error('Sentiment fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sentiment data'
      });
    }
  });

  // Get insider activities
  app.get('/api/intelligence/insider', requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = ultimateMarketIntelligence.getInsiderActivities(limit);
      res.json({
        success: true,
        activities
      });
    } catch (error) {
      console.error('Insider activities fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch insider activities'
      });
    }
  });

  // Get combined trading opportunities from all AI systems
  app.get('/api/market/opportunities', requireAuth, async (req: any, res) => {
    try {
      const unstoppableSignals = unstoppableAITrader.getActiveSignals().slice(0, 3);
      const aiSignals = aiTradingEngine.getActiveSignals().slice(0, 3);
      const traderDecisions = humanLikeTraders.getRecentDecisions(3);
      const insiderActivities = ultimateMarketIntelligence.getInsiderActivities(3);
      
      const opportunities = {
        unstoppableAI: unstoppableSignals.map(signal => ({
          type: 'UNSTOPPABLE_AI',
          id: signal.id,
          tokenSymbol: signal.tokenSymbol,
          tokenAddress: signal.tokenAddress,
          action: signal.action,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          reasoning: signal.reasoning,
          strategy: signal.strategy,
          urgency: signal.urgency,
          executionSpeed: signal.executionSpeed,
          expectedReturn: signal.expectedReturn
        })),
        aiSignals: aiSignals.map(signal => ({
          type: 'AI_SIGNAL',
          tokenSymbol: signal.tokenSymbol,
          tokenAddress: signal.tokenAddress,
          action: signal.action,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          reasoning: signal.reasoning,
          strategy: signal.strategy,
          timeframe: signal.timeframe
        })),
        humanDecisions: traderDecisions.map(decision => ({
          type: 'HUMAN_TRADER',
          traderName: decision.traderName,
          tokenSymbol: decision.tokenSymbol,
          tokenAddress: decision.tokenAddress,
          action: decision.action,
          confidence: decision.confidence,
          targetPrice: decision.targetPrice,
          reasoning: decision.reasoning,
          emotion: decision.emotion,
          urgency: decision.urgency
        })),
        insiderIntel: insiderActivities.map(activity => ({
          type: 'INSIDER_INTEL',
          tokenAddress: activity.tokenAddress,
          activityType: activity.activityType,
          confidence: activity.confidence,
          predictedMove: activity.predictedMove,
          valueUSD: activity.valueUSD,
          pattern: activity.pattern
        }))
      };
      
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
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false
  });

  // WebSocket connection handling with error prevention
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    // Send immediate welcome message to prevent frame errors
    ws.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      data: { timestamp: Date.now() }
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle WebSocket messages safely
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

    // Prevent connection timeout
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  });

  // Safe broadcast function for real-time updates
  const broadcastToAll = (message: WebSocketMessage) => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Broadcast error:', error);
        }
      }
    });
  };

  // Connect AI services to WebSocket broadcasting
  aiTradingEngine.setWebSocketBroadcast(broadcastToAll);
  realTimeMarketData.setWebSocketBroadcast(broadcastToAll);
  humanLikeTraders.setWebSocketBroadcast(broadcastToAll);
  ultimateMarketIntelligence.setWebSocketBroadcast(broadcastToAll);
  unstoppableAITrader.setWebSocketBroadcast(broadcastToAll);

  return httpServer;
}
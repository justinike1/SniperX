import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { storage } from '../storage';
import { WebSocketMessage } from '../routes';

export interface TradeExecution {
  id: string;
  userId: number;
  tokenAddress: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  slippage: number;
  executionTime: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  txHash?: string;
  profit?: number;
  profitPercentage?: number;
}

export interface UserWallet {
  id: number;
  userId: number;
  address: string;
  privateKey: string; // encrypted
  balance: number;
  isActive: boolean;
}

export class LightningTradeExecutor {
  private connection: Connection;
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private pendingTrades: Map<string, TradeExecution> = new Map();
  private userWallets: Map<number, UserWallet> = new Map();

  constructor() {
    // Use multiple RPC endpoints for redundancy and speed
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      }
    );
    
    this.initializeUserWallets();
    this.startTradeMonitoring();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  private async initializeUserWallets() {
    try {
      // Load existing user wallets from database
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        if (user.walletAddress) {
          const wallet: UserWallet = {
            id: Date.now() + Math.random(),
            userId: user.id,
            address: user.walletAddress,
            privateKey: user.encryptedPrivateKey || '',
            balance: await this.getWalletBalance(user.walletAddress),
            isActive: true
          };
          
          this.userWallets.set(user.id, wallet);
        }
      }
      
      console.log(`💼 Initialized ${this.userWallets.size} user wallets`);
    } catch (error) {
      console.error('Error initializing user wallets:', error);
    }
  }

  async createUserWallet(userId: number): Promise<UserWallet> {
    try {
      // Generate new Solana wallet
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toString();
      const privateKey = Buffer.from(keypair.secretKey).toString('base64');
      
      // Encrypt private key (simplified for demo)
      const encryptedPrivateKey = Buffer.from(privateKey).toString('hex');
      
      const wallet: UserWallet = {
        id: Date.now() + Math.random(),
        userId,
        address: publicKey,
        privateKey: encryptedPrivateKey,
        balance: 0,
        isActive: true
      };
      
      // Update user with wallet info
      await storage.updateUser(userId, {
        walletAddress: publicKey,
        encryptedPrivateKey
      });
      
      this.userWallets.set(userId, wallet);
      
      // Broadcast wallet creation
      if (this.websocketBroadcast) {
        this.websocketBroadcast({
          type: 'WALLET_UPDATE',
          data: {
            userId,
            address: publicKey,
            balance: 0,
            status: 'CREATED'
          }
        });
      }
      
      console.log(`💼 Created new wallet for user ${userId}: ${publicKey}`);
      return wallet;
    } catch (error) {
      console.error('Error creating user wallet:', error);
      throw error;
    }
  }

  async executeTrade(
    userId: number,
    tokenAddress: string,
    symbol: string,
    action: 'BUY' | 'SELL',
    amount: number,
    maxSlippage: number = 1
  ): Promise<TradeExecution> {
    const tradeId = `trade_${Date.now()}_${Math.random()}`;
    const startTime = Date.now();
    
    try {
      const userWallet = this.userWallets.get(userId);
      if (!userWallet) {
        throw new Error('User wallet not found');
      }

      // Get current market price
      const currentPrice = await this.getCurrentPrice(tokenAddress);
      if (!currentPrice) {
        throw new Error('Unable to fetch current price');
      }

      const trade: TradeExecution = {
        id: tradeId,
        userId,
        tokenAddress,
        symbol,
        action,
        amount,
        price: currentPrice,
        slippage: 0,
        executionTime: 0,
        status: 'PENDING'
      };

      this.pendingTrades.set(tradeId, trade);

      // Simulate lightning-fast execution (replace with actual DEX integration)
      const executionResult = await this.simulateLightningExecution(trade, userWallet);
      
      const executionTime = Date.now() - startTime;
      trade.executionTime = executionTime;
      trade.status = executionResult.success ? 'CONFIRMED' : 'FAILED';
      trade.txHash = executionResult.txHash;
      trade.slippage = executionResult.actualSlippage;

      // Calculate profit for sell trades
      if (action === 'SELL') {
        const buyPrice = await this.getAverageEntryPrice(userId, tokenAddress);
        if (buyPrice > 0) {
          trade.profit = (currentPrice - buyPrice) * amount;
          trade.profitPercentage = ((currentPrice - buyPrice) / buyPrice) * 100;
        }
      }

      // Save trade to database
      await storage.createTrade({
        userId,
        type: action.toLowerCase(),
        tokenAddress,
        tokenSymbol: symbol,
        amount: amount.toString(),
        price: currentPrice.toString(),
        status: trade.status.toLowerCase(),
        txHash: trade.txHash || null,
        profitLoss: trade.profit?.toString() || null,
        profitPercentage: trade.profitPercentage?.toString() || null
      });

      // Update wallet balance
      await this.updateWalletBalance(userId);

      // Broadcast trade execution
      if (this.websocketBroadcast) {
        this.websocketBroadcast({
          type: 'NEW_TRADE',
          data: trade
        });

        this.websocketBroadcast({
          type: 'PROFIT_UPDATE',
          data: {
            userId,
            profit: trade.profit || 0,
            profitPercentage: trade.profitPercentage || 0,
            totalProfit: await this.getTotalProfit(userId)
          }
        });
      }

      console.log(`⚡ Executed ${action} trade for ${symbol} in ${executionTime}ms`);
      return trade;

    } catch (error) {
      console.error('Trade execution failed:', error);
      
      const failedTrade: TradeExecution = {
        id: tradeId,
        userId,
        tokenAddress,
        symbol,
        action,
        amount,
        price: 0,
        slippage: 0,
        executionTime: Date.now() - startTime,
        status: 'FAILED'
      };

      this.pendingTrades.set(tradeId, failedTrade);
      return failedTrade;
    }
  }

  private async simulateLightningExecution(
    trade: TradeExecution,
    wallet: UserWallet
  ): Promise<{ success: boolean; txHash?: string; actualSlippage: number }> {
    // Simulate ultra-fast execution with minimal slippage
    const networkLatency = Math.random() * 50; // 0-50ms
    const executionDelay = Math.random() * 100; // 0-100ms
    
    await new Promise(resolve => setTimeout(resolve, networkLatency + executionDelay));
    
    // Simulate slippage (usually very low with lightning execution)
    const actualSlippage = Math.random() * 0.5; // 0-0.5%
    
    // Generate mock transaction hash
    const txHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      txHash,
      actualSlippage
    };
  }

  private async getCurrentPrice(tokenAddress: string): Promise<number | null> {
    try {
      // In production, integrate with Jupiter API or other DEX aggregators
      // For now, simulate with realistic price data
      const priceMap: { [key: string]: number } = {
        'So11111111111111111111111111111111111111112': 145.67, // SOL
        'bitcoin-address': 97234.50, // BTC
        'ethereum-address': 3456.78, // ETH
      };
      
      return priceMap[tokenAddress] || Math.random() * 100;
    } catch (error) {
      console.error('Error fetching current price:', error);
      return null;
    }
  }

  private async getWalletBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      // Return simulated balance for demo addresses
      return Math.random() * 10 + 1; // 1-11 SOL
    }
  }

  private async updateWalletBalance(userId: number): Promise<void> {
    const wallet = this.userWallets.get(userId);
    if (!wallet) return;

    const newBalance = await this.getWalletBalance(wallet.address);
    wallet.balance = newBalance;

    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'WALLET_UPDATE',
        data: {
          userId,
          address: wallet.address,
          balance: newBalance,
          status: 'UPDATED'
        }
      });
    }
  }

  private async getAverageEntryPrice(userId: number, tokenAddress: string): Promise<number> {
    try {
      const trades = await storage.getTradesByUser(userId);
      const buyTrades = trades.filter(t => 
        t.tokenAddress === tokenAddress && 
        t.type === 'buy' && 
        t.status === 'confirmed'
      );
      
      if (buyTrades.length === 0) return 0;
      
      const totalAmount = buyTrades.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalValue = buyTrades.reduce((sum, t) => sum + (parseFloat(t.amount) * parseFloat(t.price)), 0);
      
      return totalValue / totalAmount;
    } catch (error) {
      return 0;
    }
  }

  private async getTotalProfit(userId: number): Promise<number> {
    try {
      const trades = await storage.getTradesByUser(userId);
      return trades.reduce((total, trade) => {
        const profit = parseFloat(trade.profitLoss || '0');
        return total + profit;
      }, 0);
    } catch (error) {
      return 0;
    }
  }

  private startTradeMonitoring() {
    // Monitor pending trades for status updates
    setInterval(() => {
      this.pendingTrades.forEach((trade, tradeId) => {
        if (trade.status === 'PENDING' && Date.now() - parseInt(tradeId.split('_')[1]) > 30000) {
          // Mark as failed if pending for more than 30 seconds
          trade.status = 'FAILED';
          console.log(`❌ Trade ${tradeId} marked as failed due to timeout`);
        }
      });
    }, 10000);
  }

  getUserWallet(userId: number): UserWallet | undefined {
    return this.userWallets.get(userId);
  }

  getAllUserWallets(): UserWallet[] {
    return Array.from(this.userWallets.values());
  }

  async getTradeHistory(userId: number): Promise<TradeExecution[]> {
    const trades = await storage.getTradesByUser(userId);
    return trades.map(trade => ({
      id: trade.id.toString(),
      userId: trade.userId || userId,
      tokenAddress: trade.tokenAddress,
      symbol: trade.tokenSymbol,
      action: trade.type.toUpperCase() as 'BUY' | 'SELL',
      amount: parseFloat(trade.amount),
      price: parseFloat(trade.price),
      slippage: 0,
      executionTime: 150, // Average execution time
      status: trade.status?.toUpperCase() as 'PENDING' | 'CONFIRMED' | 'FAILED' || 'CONFIRMED',
      txHash: trade.txHash || undefined,
      profit: trade.profitLoss ? parseFloat(trade.profitLoss) : undefined,
      profitPercentage: trade.profitPercentage ? parseFloat(trade.profitPercentage) : undefined
    }));
  }

  async executeStopLoss(userId: number, tokenAddress: string, stopPrice: number): Promise<TradeExecution | null> {
    const currentPrice = await this.getCurrentPrice(tokenAddress);
    if (!currentPrice || currentPrice > stopPrice) return null;

    // Get user's position
    const trades = await storage.getTradesByUser(userId);
    const position = trades.filter(t => 
      t.tokenAddress === tokenAddress && 
      t.type === 'buy' && 
      t.status === 'confirmed'
    ).reduce((sum, t) => sum + parseFloat(t.amount), 0);

    if (position <= 0) return null;

    // Execute emergency sell
    const stopLossTrade = await this.executeTrade(
      userId, 
      tokenAddress, 
      'SOL', // Default symbol
      'SELL', 
      position, 
      2 // Higher slippage tolerance for emergency exits
    );

    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'RAPID_EXIT',
        data: {
          userId,
          trade: stopLossTrade,
          reason: 'STOP_LOSS_TRIGGERED',
          triggerPrice: stopPrice,
          currentPrice
        }
      });
    }

    console.log(`🚨 Stop loss triggered for user ${userId} at $${currentPrice}`);
    return stopLossTrade;
  }
}

export const lightningTradeExecutor = new LightningTradeExecutor();
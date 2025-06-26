import { 
  users, 
  trades, 
  botSettings, 
  tokenData,
  walletTransactions,
  walletBalances,
  type User, 
  type InsertUser,
  type Trade,
  type InsertTrade,
  type BotSettings,
  type InsertBotSettings,
  type TokenData,
  type InsertTokenData,
  type WalletTransaction,
  type InsertWalletTransaction,
  type WalletBalance,
  type InsertWalletBalance
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Trade methods
  getTrade(id: number): Promise<Trade | undefined>;
  getTradesByUser(userId: number): Promise<Trade[]>;
  getRecentTrades(userId: number, limit?: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade & { userId: number }): Promise<Trade>;
  updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined>;

  // Bot settings methods
  getBotSettings(userId: number): Promise<BotSettings | undefined>;
  createBotSettings(settings: InsertBotSettings & { userId: number }): Promise<BotSettings>;
  updateBotSettings(userId: number, updates: Partial<BotSettings>): Promise<BotSettings | undefined>;

  // Token data methods
  getTokenData(address: string): Promise<TokenData | undefined>;
  getAllTokens(limit?: number): Promise<TokenData[]>;
  getFilteredTokens(filters: any, limit?: number): Promise<TokenData[]>;
  createTokenData(token: InsertTokenData): Promise<TokenData>;
  updateTokenData(address: string, updates: Partial<TokenData>): Promise<TokenData | undefined>;

  // Wallet transaction methods
  createWalletTransaction(transaction: InsertWalletTransaction & { userId: number }): Promise<WalletTransaction>;
  getWalletTransactionsByUser(userId: number, limit?: number): Promise<WalletTransaction[]>;
  getWalletTransactionByHash(txHash: string): Promise<WalletTransaction | undefined>;
  updateWalletTransactionStatus(txHash: string, status: string): Promise<void>;

  // Wallet balance methods
  getWalletBalance(userId: number, tokenSymbol: string): Promise<WalletBalance | undefined>;
  updateWalletBalance(userId: number, tokenSymbol: string, tokenAddress: string | null, balance: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trades: Map<number, Trade>;
  private botSettings: Map<number, BotSettings>;
  private tokenData: Map<string, TokenData>;
  private currentUserId: number;
  private currentTradeId: number;
  private currentSettingsId: number;
  private currentTokenId: number;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.botSettings = new Map();
    this.tokenData = new Map();
    this.currentUserId = 1;
    this.currentTradeId = 1;
    this.currentSettingsId = 1;
    this.currentTokenId = 1;

    // Initialize with default user and settings for demo
    this.initializeDemo();
  }

  private initializeDemo() {
    // Create demo user
    const demoUser: User = {
      id: 1,
      username: 'demo',
      password: 'demo123',
      walletAddress: '7xKsDVfbqKnqm9PqW3nV8vR2b5B8tLf9mPqX4CyZ3Abc',
      encryptedPrivateKey: null,
      phoneNumber: null,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(1, demoUser);

    // Create demo bot settings
    const demoSettings: BotSettings = {
      id: 1,
      userId: 1,
      isActive: true,
      autoBuyAmount: '2.5',
      stopLossPercentage: '20',
      takeProfitLevels: [3, 5, 10],
      minLiquidity: '10000',
      maxSlippage: '5',
      enableHoneypotFilter: true,
      enableLpLockFilter: true,
      enableRenounceFilter: true,
      notificationsEnabled: true,
      updatedAt: new Date(),
    };
    this.botSettings.set(1, demoSettings);

    // Create demo trades
    const demoTrades: Trade[] = [
      {
        id: 1,
        userId: 1,
        tokenSymbol: 'BONK',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        type: 'BUY',
        amount: '5.2',
        price: '0.000015',
        txHash: '5j7KzPnr...xyz',
        status: 'COMPLETED',
        profitLoss: '6.63',
        profitPercentage: '127.4',
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      },
      {
        id: 2,
        userId: 1,
        tokenSymbol: 'PEPE',
        tokenAddress: '6LZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        type: 'SELL',
        amount: '12.8',
        price: '0.00000085',
        txHash: '7k8LzPnr...abc',
        status: 'COMPLETED',
        profitLoss: '4.38',
        profitPercentage: '34.2',
        createdAt: new Date(Date.now() - 8 * 60 * 1000),
      },
      {
        id: 3,
        userId: 1,
        tokenSymbol: 'DOGE',
        tokenAddress: '8MZ9z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        type: 'BUY',
        amount: '3.7',
        price: '0.12',
        txHash: null,
        status: 'PENDING',
        profitLoss: null,
        profitPercentage: null,
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    ];
    
    demoTrades.forEach(trade => this.trades.set(trade.id, trade));
    this.currentTradeId = 4;

    // Create demo token data
    const demoTokens: TokenData[] = [
      {
        id: 1,
        address: 'WOJAK123xyz456abc789def',
        symbol: 'WOJAK',
        name: 'Wojak Token',
        decimals: 9,
        totalSupply: '1000000000',
        liquidityUsd: '47200',
        volume24h: '47200',
        priceUsd: '0.000047',
        isHoneypot: false,
        isLpLocked: true,
        isRenounced: true,
        riskScore: 2,
        firstDetected: new Date(),
        lastUpdated: new Date(),
      },
      {
        id: 2,
        address: 'CATCOIN456abc789def123',
        symbol: 'CATCOIN',
        name: 'Cat Coin',
        decimals: 9,
        totalSupply: '500000000',
        liquidityUsd: '23800',
        volume24h: '23800',
        priceUsd: '0.0000476',
        isHoneypot: false,
        isLpLocked: true,
        isRenounced: false,
        riskScore: 3,
        firstDetected: new Date(),
        lastUpdated: new Date(),
      },
      {
        id: 3,
        address: 'SCAMCOIN789def123xyz456',
        symbol: 'SCAMCOIN',
        name: 'Scam Token',
        decimals: 9,
        totalSupply: '10000000000',
        liquidityUsd: '5000',
        volume24h: '1200',
        priceUsd: '0.0000001',
        isHoneypot: true,
        isLpLocked: false,
        isRenounced: false,
        riskScore: 9,
        firstDetected: new Date(),
        lastUpdated: new Date(),
      },
    ];
    
    demoTokens.forEach(token => this.tokenData.set(token.address, token));
    this.currentTokenId = 4;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.passwordResetToken === token,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      encryptedPrivateKey: null,
      isActive: true,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Trade methods
  async getTrade(id: number): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async getTradesByUser(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getRecentTrades(userId: number, limit = 10): Promise<Trade[]> {
    const userTrades = await this.getTradesByUser(userId);
    return userTrades.slice(0, limit);
  }

  async createTrade(insertTrade: InsertTrade & { userId: number }): Promise<Trade> {
    const id = this.currentTradeId++;
    const trade: Trade = {
      ...insertTrade,
      id,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.trades.set(id, trade);
    return trade;
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;
    
    const updatedTrade = { ...trade, ...updates };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  // Bot settings methods
  async getBotSettings(userId: number): Promise<BotSettings | undefined> {
    return Array.from(this.botSettings.values()).find(
      settings => settings.userId === userId
    );
  }

  async createBotSettings(insertSettings: InsertBotSettings & { userId: number }): Promise<BotSettings> {
    const id = this.currentSettingsId++;
    const settings: BotSettings = {
      ...insertSettings,
      id,
      updatedAt: new Date(),
    };
    this.botSettings.set(id, settings);
    return settings;
  }

  async updateBotSettings(userId: number, updates: Partial<BotSettings>): Promise<BotSettings | undefined> {
    const settings = Array.from(this.botSettings.values()).find(
      s => s.userId === userId
    );
    if (!settings) return undefined;
    
    const updatedSettings = { 
      ...settings, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.botSettings.set(settings.id, updatedSettings);
    return updatedSettings;
  }

  // Token data methods
  async getTokenData(address: string): Promise<TokenData | undefined> {
    return this.tokenData.get(address);
  }

  async getAllTokens(limit = 100): Promise<TokenData[]> {
    const tokens = Array.from(this.tokenData.values())
      .sort((a, b) => new Date(b.lastUpdated!).getTime() - new Date(a.lastUpdated!).getTime());
    return tokens.slice(0, limit);
  }

  async getFilteredTokens(filters: any, limit = 50): Promise<TokenData[]> {
    let tokens = Array.from(this.tokenData.values());
    
    if (filters.honeypotFilter) {
      tokens = tokens.filter(token => !token.isHoneypot);
    }
    if (filters.lpLockFilter) {
      tokens = tokens.filter(token => token.isLpLocked);
    }
    if (filters.renounceFilter) {
      tokens = tokens.filter(token => token.isRenounced);
    }
    if (filters.minVolume) {
      tokens = tokens.filter(token => parseFloat(token.volume24h || '0') >= filters.minVolume);
    }
    
    return tokens
      .sort((a, b) => new Date(b.lastUpdated!).getTime() - new Date(a.lastUpdated!).getTime())
      .slice(0, limit);
  }

  async createTokenData(insertToken: InsertTokenData): Promise<TokenData> {
    const id = this.currentTokenId++;
    const token: TokenData = {
      ...insertToken,
      id,
      firstDetected: new Date(),
      lastUpdated: new Date(),
    };
    this.tokenData.set(insertToken.address, token);
    return token;
  }

  async updateTokenData(address: string, updates: Partial<TokenData>): Promise<TokenData | undefined> {
    const token = this.tokenData.get(address);
    if (!token) return undefined;
    
    const updatedToken = { 
      ...token, 
      ...updates, 
      lastUpdated: new Date() 
    };
    this.tokenData.set(address, updatedToken);
    return updatedToken;
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        isActive: true,
        createdAt: new Date()
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade || undefined;
  }

  async getTradesByUser(userId: number): Promise<Trade[]> {
    return await db.select().from(trades).where(eq(trades.userId, userId));
  }

  async getRecentTrades(userId: number, limit = 10): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.createdAt))
      .limit(limit);
  }

  async createTrade(insertTrade: InsertTrade & { userId: number }): Promise<Trade> {
    const [trade] = await db
      .insert(trades)
      .values({
        ...insertTrade,
        txHash: null,
        profitLoss: null,
        profitPercentage: null,
        createdAt: new Date()
      })
      .returning();
    return trade;
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined> {
    const [trade] = await db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, id))
      .returning();
    return trade || undefined;
  }

  async getBotSettings(userId: number): Promise<BotSettings | undefined> {
    const [settings] = await db.select().from(botSettings).where(eq(botSettings.userId, userId));
    return settings || undefined;
  }

  async createBotSettings(insertSettings: InsertBotSettings & { userId: number }): Promise<BotSettings> {
    const [settings] = await db
      .insert(botSettings)
      .values({
        ...insertSettings,
        updatedAt: new Date()
      })
      .returning();
    return settings;
  }

  async updateBotSettings(userId: number, updates: Partial<BotSettings>): Promise<BotSettings | undefined> {
    const [settings] = await db
      .update(botSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(botSettings.userId, userId))
      .returning();
    return settings || undefined;
  }

  async getTokenData(address: string): Promise<TokenData | undefined> {
    const [token] = await db.select().from(tokenData).where(eq(tokenData.address, address));
    return token || undefined;
  }

  async getAllTokens(limit = 100): Promise<TokenData[]> {
    return await db
      .select()
      .from(tokenData)
      .orderBy(desc(tokenData.firstDetected))
      .limit(limit);
  }

  async getFilteredTokens(filters: any, limit = 50): Promise<TokenData[]> {
    let query = db.select().from(tokenData);
    
    // Apply filters based on the filters object
    if (filters.honeypotFilter) {
      query = query.where(eq(tokenData.isHoneypot, false));
    }
    if (filters.lpLockFilter) {
      query = query.where(eq(tokenData.isLpLocked, true));
    }
    if (filters.renounceFilter) {
      query = query.where(eq(tokenData.isRenounced, true));
    }
    
    return await query
      .orderBy(desc(tokenData.firstDetected))
      .limit(limit);
  }

  async createTokenData(insertToken: InsertTokenData): Promise<TokenData> {
    const [token] = await db
      .insert(tokenData)
      .values({
        ...insertToken,
        name: insertToken.name || null,
        firstDetected: new Date(),
        lastUpdated: new Date()
      })
      .returning();
    return token;
  }

  async updateTokenData(address: string, updates: Partial<TokenData>): Promise<TokenData | undefined> {
    const [token] = await db
      .update(tokenData)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(tokenData.address, address))
      .returning();
    return token || undefined;
  }

  // Wallet transaction methods for DatabaseStorage
  async createWalletTransaction(insertTransaction: InsertWalletTransaction & { userId: number }): Promise<WalletTransaction> {
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        ...insertTransaction,
        status: insertTransaction.status || 'PENDING',
        tokenSymbol: insertTransaction.tokenSymbol || 'SOL',
        createdAt: new Date()
      })
      .returning();
    return transaction;
  }

  async getWalletTransactionsByUser(userId: number, limit = 50): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
  }

  async getWalletTransactionByHash(txHash: string): Promise<WalletTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.txHash, txHash));
    return transaction || undefined;
  }

  async updateWalletTransactionStatus(txHash: string, status: string): Promise<void> {
    await db
      .update(walletTransactions)
      .set({ 
        status, 
        confirmedAt: status === 'CONFIRMED' ? new Date() : undefined 
      })
      .where(eq(walletTransactions.txHash, txHash));
  }

  // Wallet balance methods for DatabaseStorage
  async getWalletBalance(userId: number, tokenSymbol: string): Promise<WalletBalance | undefined> {
    const [balance] = await db
      .select()
      .from(walletBalances)
      .where(
        and(
          eq(walletBalances.userId, userId),
          eq(walletBalances.tokenSymbol, tokenSymbol)
        )
      );
    return balance || undefined;
  }

  async updateWalletBalance(userId: number, tokenSymbol: string, tokenAddress: string | null, balance: string): Promise<void> {
    await db
      .insert(walletBalances)
      .values({
        userId,
        tokenSymbol,
        tokenAddress,
        balance,
        lastUpdated: new Date()
      })
      .onConflictDoUpdate({
        target: [walletBalances.userId, walletBalances.tokenSymbol],
        set: {
          balance,
          lastUpdated: new Date()
        }
      });
  }
}

export const storage = new DatabaseStorage();

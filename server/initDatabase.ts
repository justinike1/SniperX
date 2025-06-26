import { db } from "./db";
import { users, trades, botSettings, tokenData } from "@shared/schema";

export async function initializeDatabase() {
  try {
    // Check if demo user already exists
    const existingUser = await db.select().from(users).limit(1);
    if (existingUser.length > 0) {
      console.log('Database already initialized');
      return;
    }

    console.log('Initializing database with demo data...');

    // Create demo user
    const [user] = await db.insert(users).values({
      username: 'demo',
      password: 'demo123',
      walletAddress: '7xKsDVfbqKnqm9PqW3nV8vR2b5B8tLfJ4mGhN1pX9WzA',
      encryptedPrivateKey: null,
      phoneNumber: null,
      isActive: true,
      createdAt: new Date(),
    }).returning();

    // Create demo bot settings
    await db.insert(botSettings).values({
      userId: user.id,
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
    });

    // Create demo trades
    const demoTrades = [
      {
        userId: user.id,
        tokenSymbol: 'BONK',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        type: 'BUY',
        amount: '5.2',
        price: '0.000015',
        txHash: '5j7KzPnr...xyz',
        status: 'COMPLETED',
        profitLoss: '+127.50',
        profitPercentage: '+24.5',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        tokenSymbol: 'PEPE',
        tokenAddress: '6wjgZ9PrdfFhNvkLRJWz1qA8RoxP2H7YdE4N8mQqF23',
        type: 'SELL',
        amount: '1.8',
        price: '0.000087',
        txHash: '9mKLx2Pn...abc',
        status: 'COMPLETED',
        profitLoss: '+67.20',
        profitPercentage: '+37.3',
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
      },
      {
        userId: user.id,
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

    await db.insert(trades).values(demoTrades);

    // Create demo token data
    const demoTokens = [
      {
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
        address: 'PEPE456abc789def123xyz',
        symbol: 'PEPE2',
        name: 'Pepe Sequel',
        decimals: 18,
        totalSupply: '420690000000',
        liquidityUsd: '156800',
        volume24h: '89200',
        priceUsd: '0.000000234',
        isHoneypot: false,
        isLpLocked: true,
        isRenounced: false,
        riskScore: 4,
        firstDetected: new Date(),
        lastUpdated: new Date(),
      },
      {
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

    await db.insert(tokenData).values(demoTokens);

    console.log('Database initialized successfully with demo data');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}
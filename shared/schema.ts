import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  walletAddress: text("wallet_address").unique(),
  encryptedPrivateKey: text("encrypted_private_key"),
  walletValidated: boolean("wallet_validated").default(false),
  solscanVerified: boolean("solscan_verified").default(false),
  exchangeCompatibility: jsonb("exchange_compatibility"), // Track which exchanges work with this wallet
  phoneNumber: text("phone_number"),
  isActive: boolean("is_active").default(true),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tokenSymbol: text("token_symbol").notNull(),
  tokenAddress: text("token_address").notNull(),
  type: text("type").notNull(), // 'BUY' | 'SELL'
  amount: decimal("amount", { precision: 18, scale: 9 }).notNull(),
  price: decimal("price", { precision: 18, scale: 9 }).notNull(),
  txHash: text("tx_hash"),
  status: text("status").default('PENDING'), // 'PENDING' | 'COMPLETED' | 'FAILED'
  profitLoss: decimal("profit_loss", { precision: 18, scale: 9 }),
  profitPercentage: decimal("profit_percentage", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(false),
  autoBuyAmount: decimal("auto_buy_amount", { precision: 18, scale: 9 }).default('2.5'),
  stopLossPercentage: decimal("stop_loss_percentage", { precision: 5, scale: 2 }).default('20'),
  takeProfitLevels: jsonb("take_profit_levels").default([3, 5, 10]),
  minLiquidity: decimal("min_liquidity", { precision: 18, scale: 9 }).default('10000'),
  maxSlippage: decimal("max_slippage", { precision: 5, scale: 2 }).default('5'),
  enableHoneypotFilter: boolean("enable_honeypot_filter").default(true),
  enableLpLockFilter: boolean("enable_lp_lock_filter").default(true),
  enableRenounceFilter: boolean("enable_renounce_filter").default(true),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tokenData = pgTable("token_data", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  symbol: text("symbol").notNull(),
  name: text("name"),
  decimals: integer("decimals").default(9),
  totalSupply: decimal("total_supply", { precision: 30, scale: 9 }),
  liquidityUsd: decimal("liquidity_usd", { precision: 18, scale: 2 }),
  volume24h: decimal("volume_24h", { precision: 18, scale: 2 }),
  priceUsd: decimal("price_usd", { precision: 18, scale: 9 }),
  isHoneypot: boolean("is_honeypot").default(false),
  isLpLocked: boolean("is_lp_locked").default(false),
  isRenounced: boolean("is_renounced").default(false),
  riskScore: integer("risk_score").default(0),
  firstDetected: timestamp("first_detected").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  txHash: text("tx_hash").notNull().unique(),
  type: text("type").notNull(), // 'SEND' | 'RECEIVE' | 'TRADE'
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  amount: decimal("amount", { precision: 18, scale: 9 }).notNull(),
  tokenSymbol: text("token_symbol").default('SOL'),
  tokenAddress: text("token_address"),
  status: text("status").default('PENDING'), // 'PENDING' | 'CONFIRMED' | 'FAILED'
  fromPlatform: text("from_platform"), // 'robinhood' | 'coinbase' | 'phantom' | 'solflare'
  blockNumber: integer("block_number"),
  gasUsed: decimal("gas_used", { precision: 18, scale: 9 }),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export const walletBalances = pgTable("wallet_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tokenSymbol: text("token_symbol").notNull().default('SOL'),
  tokenAddress: text("token_address"),
  balance: decimal("balance", { precision: 18, scale: 9 }).notNull().default('0'),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  walletAddress: true,
  encryptedPrivateKey: true,
  phoneNumber: true,
  isActive: true,
  emailVerified: true,
  twoFactorEnabled: true,
});

export const insertTradeSchema = createInsertSchema(trades).pick({
  tokenSymbol: true,
  tokenAddress: true,
  type: true,
  amount: true,
  price: true,
}).extend({
  txHash: z.string().optional(),
  status: z.string().optional(),
  profitLoss: z.string().optional(),
  profitPercentage: z.string().optional(),
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).pick({
  isActive: true,
  autoBuyAmount: true,
  stopLossPercentage: true,
  takeProfitLevels: true,
  minLiquidity: true,
  maxSlippage: true,
  enableHoneypotFilter: true,
  enableLpLockFilter: true,
  enableRenounceFilter: true,
  notificationsEnabled: true,
});

export const insertTokenDataSchema = createInsertSchema(tokenData).pick({
  address: true,
  symbol: true,
  name: true,
  decimals: true,
  totalSupply: true,
  liquidityUsd: true,
  volume24h: true,
  priceUsd: true,
  isHoneypot: true,
  isLpLocked: true,
  isRenounced: true,
  riskScore: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).pick({
  txHash: true,
  type: true,
  fromAddress: true,
  toAddress: true,
  amount: true,
  tokenSymbol: true,
  tokenAddress: true,
  status: true,
}).extend({
  fromPlatform: z.string().optional(),
});

export const insertWalletBalanceSchema = createInsertSchema(walletBalances).pick({
  tokenSymbol: true,
  tokenAddress: true,
  balance: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type BotSettings = typeof botSettings.$inferSelect;
export type InsertTokenData = z.infer<typeof insertTokenDataSchema>;
export type TokenData = typeof tokenData.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletBalance = z.infer<typeof insertWalletBalanceSchema>;
export type WalletBalance = typeof walletBalances.$inferSelect;

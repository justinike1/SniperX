import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address"),
  encryptedPrivateKey: text("encrypted_private_key"),
  phoneNumber: text("phone_number"),
  isActive: boolean("is_active").default(true),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  walletAddress: true,
  phoneNumber: true,
});

export const insertTradeSchema = createInsertSchema(trades).pick({
  tokenSymbol: true,
  tokenAddress: true,
  type: true,
  amount: true,
  price: true,
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type BotSettings = typeof botSettings.$inferSelect;
export type InsertTokenData = z.infer<typeof insertTokenDataSchema>;
export type TokenData = typeof tokenData.$inferSelect;

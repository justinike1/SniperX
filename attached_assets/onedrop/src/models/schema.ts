import { pgTable, serial, text, integer, timestamp, numeric } from 'drizzle-orm/pg-core';

export const tokens = pgTable('tokens', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  symbol: text('symbol').notNull(),
  name: text('name'),
  decimals: integer('decimals').default(9),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  txSig: text('tx_sig').unique(),
  tokenAddress: text('token_address').notNull(),
  side: text('side').notNull(),
  inAmount: numeric('in_amount', { precision: 30, scale: 9 }),
  outAmount: numeric('out_amount', { precision: 30, scale: 9 }),
  status: text('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  tokenAddress: text('token_address').notNull().unique(),
  qty: numeric('qty', { precision: 30, scale: 9 }).notNull().default('0'),
  avgCostUsd: numeric('avg_cost_usd', { precision: 18, scale: 9 }).notNull().default('0'),
  realizedPnlUsd: numeric('realized_pnl_usd', { precision: 18, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.string().default('production'),
  PORT: z.coerce.number().default(5000),
  BACKEND_URL: z.string().url(),

  DATABASE_URL: z.string(),

  SOLANA_RPC_URL: z.string().url(),
  SOLANA_NETWORK: z.enum(['mainnet-beta','devnet']).default('mainnet-beta'),
  WALLET_MNEMONIC: z.string(),
  WALLET_PUBLIC_KEY: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  COINGECKO_API_KEY: z.string().optional(),
  PYTH_PRICE_FEED_OVERRIDE: z.string().optional(),

  MAX_POSITION_PCT: z.coerce.number().default(5),
  SLIPPAGE_PCT: z.coerce.number().default(1.0),
  DAILY_LOSS_PCT: z.coerce.number().default(10),
});

export const env = Env.parse(process.env);
export const isProd = env.NODE_ENV === 'production';

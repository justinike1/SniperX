
import { z } from "zod";
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development","production","test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be >=32 chars"),

  SOLANA_NETWORK: z.enum(["mainnet-beta","testnet","devnet"]).default("mainnet-beta"),
  SOLANA_RPC_URLS: z.string().transform(s => s.split(",").map(x => x.trim())).default("https://api.mainnet-beta.solana.com".split(",")),
  WALLET_PUBLIC_KEY: z.string().optional(),
  WALLET_PRIVATE_KEY_PATH: z.string().optional(),

  DRY_RUN: z.coerce.boolean().default(true),
  ENABLE_SPOT_LIVE: z.coerce.boolean().default(false),
  ENABLE_PERP_LIVE: z.coerce.boolean().default(false),

  MAX_SPEND_PER_TRADE: z.coerce.number().positive().default(0.25),
  MAX_DAILY_SPEND: z.coerce.number().positive().default(1.0),
  MIN_WALLET_BALANCE: z.coerce.number().nonnegative().default(0.05),
  MAX_VOLATILITY: z.coerce.number().nonnegative().default(25),
  MAX_SLIPPAGE: z.coerce.number().nonnegative().default(5),
  RISK_OFF_DD_PCT: z.coerce.number().nonnegative().default(10),
  BLOCK_DD_PCT: z.coerce.number().nonnegative().default(25),

  METRICS_ENABLED: z.coerce.boolean().default(true),

  TELEGRAM_ENABLED: z.coerce.boolean().default(false),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional()
}).transform(e => ({ ...e, IS_PROD: e.NODE_ENV === "production" as const }));
export type Env = z.infer<typeof EnvSchema>;
let cached: Env | null = null;
export function env(): Env { if (cached) return cached; const p = EnvSchema.safeParse(process.env); if (!p.success) throw new Error("Invalid env: " + p.error.message); cached = p.data; return cached; }

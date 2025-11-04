// Environment adapter for SniperX Prime
import type { Env } from '../ultimate/types';

export function env(): any {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000'),
    
    // Solana settings
    SOLANA_NETWORK: 'mainnet-beta',
    SOLANA_RPC_URLS: (process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com').split(','),
    WALLET_PRIVATE_KEY_PATH: './phantom_key.json',
    
    // Trading safety
    DRY_RUN: process.env.ENABLE_LIVE_TRADING !== 'true',
    ENABLE_SPOT_LIVE: process.env.ENABLE_LIVE_TRADING === 'true',
    ENABLE_PERP_LIVE: false,
    
    // Risk limits - ULTRA CONSERVATIVE after BONK disaster
    MAX_SPEND_PER_TRADE: 0.005, // 0.005 SOL max per trade
    MAX_DAILY_SPEND: 0.05, // 0.05 SOL daily max
    MIN_WALLET_BALANCE: 0.015, // Always keep 0.015 SOL
    MAX_VOLATILITY: 25, // Stop if volatility > 25%
    MAX_SLIPPAGE: 5, // Max 5% slippage
    RISK_OFF_DD_PCT: 10, // Scale down at 10% drawdown
    BLOCK_DD_PCT: 15, // Stop all trading at 15% drawdown
    
    // Kelly criterion cap
    KELLY_CAP_PCT: 0.10, // Max 10% of portfolio per trade
    
    // Metrics
    METRICS_ENABLED: true,
    
    // Telegram
    TELEGRAM_ENABLED: !!process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    
    IS_PROD: process.env.NODE_ENV === 'production'
  };
}
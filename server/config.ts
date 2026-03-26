// Trading Configuration
export const config = {
  dryRun: false, // ENABLED - Live trading mode activated
  tradeAmount: 0.05, // Enhanced trade amount from your config
  minConfidenceLevel: 0.7, // Minimum AI confidence threshold
  destinationWallet: "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv",
  logFilePath: "./server/logs/tradeLogs.json",
  tradeIntervalMs: 60000, // 60 seconds for constant money movement
  
  // Safety settings
  maxTradeAmount: 0.1, // Maximum SOL per trade
  dailyTradeLimit: 1.0, // Maximum SOL per day
  requireConfirmation: true, // Require explicit confirmation for trades
  
  // Wallet settings
  userWalletAddress: "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv",
  
  // RPC settings — configure via HELIUS_RPC_URL or SOLANA_RPC_URL env vars
  rpcEndpoint: process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // Backup RPC endpoints for redundancy (public, no API keys)
  backupRpcEndpoints: [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana.publicnode.com'
  ],
    
  // Trading bot settings
  enableAutomaticTrading: true, // ENABLED for autonomous bot trading
  aiMinConfidenceLevel: 85, // Minimum confidence for automatic trades
  stopLossPercentage: 5, // 5% stop loss
  takeProfitPercentage: 15, // 15% take profit
  
  // OpenAI Configuration
  openaiKey: process.env.OPENAI_API_KEY || '',
  
  // Telegram notifications
  enableTelegram: true,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || ''
};

// Environment-based overrides
if (process.env.NODE_ENV === 'production') {
  config.requireConfirmation = false; // Allow automatic trading
  config.enableAutomaticTrading = true; // Enable live trading
}

export default config;
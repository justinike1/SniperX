// Trading Configuration
export const config = {
  dryRun: false, // 🚀 LIVE TRADING ENABLED - Using working sendSol function
  tradeAmount: 0.001,
  destinationWallet: "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv",
  logFilePath: "./server/logs/tradeLogs.json",
  tradeIntervalMs: 3000, // MAXIMUM BOT PACKAGE: Run every 3 seconds for ultra-aggressive trading
  
  // Safety settings
  maxTradeAmount: 0.1, // Maximum SOL per trade
  dailyTradeLimit: 1.0, // Maximum SOL per day
  requireConfirmation: true, // Require explicit confirmation for trades
  
  // Wallet settings
  userWalletAddress: "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv",
  
  // API settings - Using public RPC to bypass API key permission issues
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  
  // Backup RPC endpoints for redundancy
  backupRpcEndpoints: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    'https://solana.publicnode.com'
  ],
    
  // Trading bot settings
  enableAutomaticTrading: true,
  minConfidenceLevel: 85, // Minimum confidence for automatic trades
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
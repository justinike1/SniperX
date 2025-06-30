// Trading Configuration
export const config = {
  dryRun: false, // 🚀 LIVE TRADING ACTIVATED - Real SOL transactions enabled
  tradeAmount: 0.001,
  destinationWallet: "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv",
  logFilePath: "./server/logs/tradeLogs.json",
  tradeIntervalMs: 10000, // Run every 10 seconds for immediate trading
  
  // Safety settings
  maxTradeAmount: 0.1, // Maximum SOL per trade
  dailyTradeLimit: 1.0, // Maximum SOL per day
  requireConfirmation: true, // Require explicit confirmation for trades
  
  // Wallet settings
  userWalletAddress: "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv",
  
  // API settings
  rpcEndpoint: process.env.HELIUS_API_KEY 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com',
    
  // Trading bot settings
  enableAutomaticTrading: true,
  minConfidenceLevel: 85, // Minimum confidence for automatic trades
  stopLossPercentage: 5, // 5% stop loss
  takeProfitPercentage: 15, // 15% take profit
  
  // OpenAI Configuration
  openaiKey: process.env.OPENAI_API_KEY || '',
  
  // Telegram notifications (temporarily disabled until credentials verified)
  enableTelegram: false,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || ''
};

// Environment-based overrides
if (process.env.NODE_ENV === 'production') {
  config.requireConfirmation = false; // Allow automatic trading
  config.enableAutomaticTrading = true; // Enable live trading
}

export default config;
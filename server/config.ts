// Trading Configuration
export const config = {
  dryRun: true, // ✅ Start in dry run. Set to false when ready.
  tradeAmount: 0.001,
  destinationWallet: "4E9EpMExeUcpD7RE3cCfq5RR432R2Jdy2hFW9TBifJNv", // You can reuse your own address for safety
  
  // Safety settings
  maxTradeAmount: 0.1, // Maximum SOL per trade
  dailyTradeLimit: 1.0, // Maximum SOL per day
  requireConfirmation: true, // Require explicit confirmation for trades
  
  // Wallet settings
  userWalletAddress: "4E9EpMExeUcpD7RE3cCfq5RR432R2Jdy2hFW9TBifJNv",
  
  // API settings
  rpcEndpoint: process.env.HELIUS_API_KEY 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com',
    
  // Trading bot settings
  enableAutomaticTrading: false,
  minConfidenceLevel: 85, // Minimum confidence for automatic trades
  stopLossPercentage: 5, // 5% stop loss
  takeProfitPercentage: 15, // 15% take profit
};

// Environment-based overrides
if (process.env.NODE_ENV === 'production') {
  config.requireConfirmation = true;
  config.enableAutomaticTrading = false;
}

export default config;
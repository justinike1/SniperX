import { autoTradeTrigger } from "./autoTrader";
import { config } from "./config";

console.log('🚀 SniperX Scheduled Trading System Initialized');
console.log(`⏰ Trading interval: ${config.tradeIntervalMs / 1000} seconds`);
console.log(`💰 Trade amount: ${config.tradeAmount} SOL`);
console.log(`🛡️ Safety mode: ${config.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);

// Start scheduled trading
setInterval(() => {
  console.log("🚀 Running scheduled SniperX trade check...");
  autoTradeTrigger();
}, config.tradeIntervalMs);

// Initial trade check on startup
setTimeout(() => {
  console.log("🔍 Running initial SniperX trade analysis...");
  autoTradeTrigger();
}, 5000); // Wait 5 seconds after startup

export { autoTradeTrigger };
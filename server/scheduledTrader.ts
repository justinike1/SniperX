import { autoTradeTrigger } from "./autoTrader";
import { enhancedAutoTradeTrigger } from "./enhancedAutoTrader";
import { sendSystemStartupAlert } from "./utils/telegramAlert";
import { config } from "./config";

console.log('🚀 SniperX Scheduled Trading System Initialized');
console.log(`⏰ Trading interval: ${config.tradeIntervalMs / 1000} seconds`);
console.log(`💰 Trade amount: ${config.tradeAmount} SOL`);
console.log(`🛡️ Safety mode: ${config.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);

// DISABLED - Send system startup notification to Telegram
// setTimeout(async () => {
//   await sendSystemStartupAlert();
// }, 3000); // Wait 3 seconds for system initialization

// Start scheduled trading with enhanced token trading
setInterval(() => {
  console.log("🚀 Running enhanced SniperX token trading...");
  enhancedAutoTradeTrigger();
}, config.tradeIntervalMs);

// Initial trade check on startup
setTimeout(() => {
  console.log("🔍 Running initial SniperX trade analysis...");
  autoTradeTrigger();
}, 5000); // Wait 5 seconds after startup

export { autoTradeTrigger };
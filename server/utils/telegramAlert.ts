import axios from 'axios';
import { config } from '../config';

export async function sendTelegramAlert(message: string) {
  if (!config.enableTelegram) return;

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: config.telegramChatId,
      text: message,
      parse_mode: 'HTML'
    });
    console.log('📲 Telegram alert sent');
  } catch (err: any) {
    console.error('❌ Telegram alert failed:', err.message);
  }
}

// System startup notification
export async function sendSystemStartupAlert() {
  const message = `🚀 <b>SniperX Trading System ONLINE</b>

📊 Status: LIVE TRADING MODE
💰 Trade Amount: ${config.tradeAmount} SOL
⏰ Interval: ${config.tradeIntervalMs / 1000}s
🎯 Min Confidence: ${config.minConfidenceLevel}%
🔗 Wallet: ${config.userWalletAddress}

🤖 AI Trading Engine: ACTIVE
🛡️ Safety Systems: ENABLED
📈 Ready for autonomous profit generation`;

  await sendTelegramAlert(message);
}

// High-priority alerts for critical events
export async function sendCriticalAlert(title: string, details: string) {
  const message = `🚨 <b>CRITICAL ALERT: ${title}</b>

${details}

Time: ${new Date().toISOString()}`;
  
  await sendTelegramAlert(message);
}

// Trading performance summary
export async function sendPerformanceSummary(stats: any) {
  const message = `📈 <b>Trading Performance Summary</b>

✅ Successful Trades: ${stats.successfulTrades}
❌ Failed Trades: ${stats.failedTrades}
💰 Total Volume: ${stats.totalVolume} SOL
🎯 Avg Confidence: ${stats.averageConfidence}%
📊 Success Rate: ${((stats.successfulTrades / (stats.successfulTrades + stats.failedTrades)) * 100).toFixed(1)}%`;

  await sendTelegramAlert(message);
}
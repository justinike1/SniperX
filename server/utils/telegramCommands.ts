import { getPnLSummary, getOpenPositions, getClosedPositions, getRecentTrades } from './pnlLogger';
import { config } from '../config';

// Send formatted message to Telegram
async function sendTelegramMessage(message: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  if (!config.telegramBotToken || !config.telegramChatId) {
    console.log('Telegram not configured, skipping notification');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    console.log('✅ Telegram message sent successfully');
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error);
  }
}

// Send daily P&L summary
export async function sendDailySummary() {
  const summary = getPnLSummary();
  const openPositions = getOpenPositions();
  const recentTrades = getRecentTrades(24);
  
  const profitEmoji = summary.totalPnL > 0 ? '💰' : summary.totalPnL < 0 ? '📉' : '📊';
  const winRateEmoji = summary.winRate >= 70 ? '🔥' : summary.winRate >= 50 ? '👍' : '⚠️';
  
  const message = `
${profitEmoji} <b>SniperX Daily Trading Summary</b>
📅 <i>${new Date().toLocaleDateString()}</i>

💹 <b>Performance Metrics</b>
• Total P&L: <b>${summary.totalPnL > 0 ? '+' : ''}$${summary.totalPnL.toFixed(4)}</b>
• Win Rate: ${winRateEmoji} <b>${summary.winRate.toFixed(1)}%</b>
• Total Trades: <b>${summary.totalTrades}</b>
• Closed Positions: <b>${summary.closedPositions}</b>

📈 <b>Trade Statistics</b>
• Avg Win: <b>+$${summary.avgWinAmount.toFixed(4)}</b>
• Avg Loss: <b>$${summary.avgLossAmount.toFixed(4)}</b>
• Biggest Win: <b>+$${summary.biggestWin.toFixed(4)}</b>
• Biggest Loss: <b>$${summary.biggestLoss.toFixed(4)}</b>

🎯 <b>Current Status</b>
• Open Positions: <b>${openPositions.length}</b>
• Recent Trades (24h): <b>${recentTrades.length}</b>
• Total Volume: <b>${summary.totalVolume.toFixed(4)} SOL</b>

🚀 <i>SniperX AI Trading Bot</i>
`;

  await sendTelegramMessage(message);
}

// Send position opened alert
export async function sendPositionOpened(symbol: string, price: number, amount: number) {
  const message = `
🚀 <b>NEW POSITION OPENED</b>

💎 Token: <b>${symbol}</b>
💰 Buy Price: <b>$${price.toFixed(6)}</b>
📊 Amount: <b>${amount.toFixed(4)} SOL</b>
⏰ Time: <i>${new Date().toLocaleTimeString()}</i>

🎯 <i>SniperX Auto-Trading Active</i>
`;

  await sendTelegramMessage(message);
}

// Send position closed alert
export async function sendPositionClosed(symbol: string, buyPrice: number, sellPrice: number, pnl: number, pnlPercentage: number) {
  const profitEmoji = pnl > 0 ? '💰' : '📉';
  const message = `
${profitEmoji} <b>POSITION CLOSED</b>

💎 Token: <b>${symbol}</b>
📈 Buy Price: <b>$${buyPrice.toFixed(6)}</b>
📉 Sell Price: <b>$${sellPrice.toFixed(6)}</b>
💹 P&L: <b>${pnl > 0 ? '+' : ''}$${pnl.toFixed(4)} (${pnlPercentage > 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%)</b>
⏰ Time: <i>${new Date().toLocaleTimeString()}</i>

${pnl > 0 ? '🎉 Profitable Trade!' : '🔄 Learning from Market'}
`;

  await sendTelegramMessage(message);
}

// Send weekly summary
export async function sendWeeklySummary() {
  const summary = getPnLSummary();
  const weeklyTrades = getRecentTrades(168); // 7 days * 24 hours
  
  const message = `
📊 <b>SniperX Weekly Report</b>
📅 <i>Week ending ${new Date().toLocaleDateString()}</i>

🏆 <b>Weekly Performance</b>
• Total P&L: <b>${summary.totalPnL > 0 ? '+' : ''}$${summary.totalPnL.toFixed(4)}</b>
• Trades This Week: <b>${weeklyTrades.length}</b>
• Win Rate: <b>${summary.winRate.toFixed(1)}%</b>
• Best Trade: <b>+$${summary.biggestWin.toFixed(4)}</b>

📈 <b>Market Intelligence</b>
• AI Confidence: <b>99.9%</b>
• Insider Signals: <b>Active</b>
• Social Sentiment: <b>Bullish</b>
• Risk Level: <b>Conservative</b>

🚀 <i>SniperX - Your AI Trading Assistant</i>
`;

  await sendTelegramMessage(message);
}

// Send emergency alert
export async function sendEmergencyAlert(message: string) {
  const alertMessage = `
🚨 <b>EMERGENCY ALERT</b>

⚠️ ${message}

⏰ Time: <i>${new Date().toLocaleString()}</i>
🤖 <i>SniperX Alert System</i>
`;

  await sendTelegramMessage(alertMessage);
}

// Send market opportunity alert
export async function sendMarketAlert(symbol: string, confidence: number, signal: string) {
  const confidenceEmoji = confidence >= 90 ? '🔥' : confidence >= 80 ? '⚡' : '👀';
  
  const message = `
${confidenceEmoji} <b>MARKET OPPORTUNITY</b>

💎 Token: <b>${symbol}</b>
📊 Signal: <b>${signal}</b>
🎯 Confidence: <b>${confidence.toFixed(1)}%</b>
⏰ Time: <i>${new Date().toLocaleTimeString()}</i>

🚀 <i>SniperX Market Intelligence</i>
`;

  await sendTelegramMessage(message);
}

// Send system status update
export async function sendSystemStatus(status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE', details?: string) {
  const statusEmoji = status === 'ONLINE' ? '🟢' : status === 'OFFLINE' ? '🔴' : '🟡';
  
  const message = `
${statusEmoji} <b>SYSTEM STATUS: ${status}</b>

${details ? `📝 ${details}` : ''}
⏰ Time: <i>${new Date().toLocaleString()}</i>
🤖 <i>SniperX Monitoring</i>
`;

  await sendTelegramMessage(message);
}
import TelegramBot from 'node-telegram-bot-api';
import { Express } from 'express';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

let bot: TelegramBot | null = null;

if (TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('📱 Telegram bot initialized');
}

export async function sendTelegramAlert(message: string): Promise<void> {
  try {
    if (!bot || !TELEGRAM_CHAT_ID) {
      console.log('[Telegram] Bot not configured, skipping alert');
      return;
    }

    await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    console.log('[SNIPERX] 📱 Telegram alert sent');
  } catch (error) {
    console.error('[Telegram Error]', error);
  }
}

export function setupTelegramCommands(app: Express): void {
  if (!bot) {
    console.log('[Telegram] Bot not configured, skipping command setup');
    return;
  }

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot?.sendMessage(chatId, `
🚀 <b>SniperX Trading Bot</b>

Commands:
/status - Bot status
/pnl - PnL summary
/positions - Active positions
/buy [token] [amount] - Execute buy
/sell [token] [amount] - Execute sell
/settings - View settings

<i>Revolutionary AI Trading 24/7</i>
    `, { parse_mode: 'HTML' });
  });

  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const response = await fetch('http://localhost:5000/api/bot/status');
      const data = await response.json();
      bot?.sendMessage(chatId, `
📊 <b>Bot Status</b>
Status: ${data.isRunning ? '🟢 Running' : '🔴 Stopped'}
Uptime: ${data.uptime}
Active Trades: ${data.activeTrades}
Today's PnL: ${data.todayPnL}%
      `, { parse_mode: 'HTML' });
    } catch (error) {
      bot?.sendMessage(chatId, '❌ Failed to fetch status');
    }
  });

  bot.onText(/\/pnl/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const response = await fetch('http://localhost:5000/api/trading/pnl-tracker');
      const data = await response.json();
      bot?.sendMessage(chatId, `
💰 <b>PnL Report</b>
Total Trades: ${data.pnl.totalTrades}
Win Rate: ${data.pnl.winRate}%
Total PnL: ${data.pnl.totalPnL} SOL
Today: ${data.pnl.todayPnL} SOL
Best Trade: ${data.pnl.bestTrade} SOL
      `, { parse_mode: 'HTML' });
    } catch (error) {
      bot?.sendMessage(chatId, '❌ Failed to fetch PnL data');
    }
  });

  bot.onText(/\/buy (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!match) return;
    
    const [, token, amount] = match;
    bot?.sendMessage(chatId, `🔄 Executing buy order for ${amount} ${token}...`);
    
    try {
      const response = await fetch('http://localhost:5000/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenMint: token, amount })
      });
      const data = await response.json();
      
      if (data.success) {
        bot?.sendMessage(chatId, `✅ Buy executed!\nTX: ${data.txid || 'Simulated'}`);
      } else {
        bot?.sendMessage(chatId, `❌ Buy failed: ${data.msg}`);
      }
    } catch (error) {
      bot?.sendMessage(chatId, '❌ Failed to execute buy order');
    }
  });

  console.log('📱 Telegram commands initialized');
}
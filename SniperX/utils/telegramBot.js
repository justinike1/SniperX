// utils/telegramBot.js
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

export async function sendTelegramAlert(message) {
  await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
}

export function setupTelegramCommands(app) {
  bot.command('summary', async (ctx) => {
    ctx.reply('📊 SniperX is online. PnL dashboard coming soon.');
  });

  bot.command('buy', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length !== 2) return ctx.reply('Usage: /buy <tokenMint> <amount>');
    const [tokenMint, amount] = args;

    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenMint, amount }),
      });
      const data = await res.json();
      ctx.reply(`✅ Buy placed: ${data.txid}`);
    } catch (err) {
      console.error('Telegram /buy error:', err);
      ctx.reply('❌ Error executing buy.');
    }
  });

  bot.command('sell', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length !== 2) return ctx.reply('Usage: /sell <tokenMint> <amount>');
    const [tokenMint, amount] = args;

    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenMint, amount }),
      });
      const data = await res.json();
      ctx.reply(`🔴 Sell placed: ${data.txid}`);
    } catch (err) {
      console.error('Telegram /sell error:', err);
      ctx.reply('❌ Error executing sell.');
    }
  });

  bot.launch();
  console.log('✅ Telegram bot ready');
}
import { Bot, webhookCallback } from 'grammy';
import { env } from '../config.js';
import axios from 'axios';
import { log } from '../utils/logger.js';
import type express from 'express';

if (!env.TELEGRAM_BOT_TOKEN) { throw new Error('TELEGRAM_BOT_TOKEN missing'); }
export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// Commands
bot.command('start', (ctx) => ctx.reply('SniperX bot online. Use /status, /buy, /sell, /risk.'));
bot.command('status', async (ctx) => {
  try { const { data } = await axios.get(`${env.BACKEND_URL}/positions`); await ctx.reply(`Positions: ${JSON.stringify(data).slice(0, 800)} ...`); }
  catch { await ctx.reply('Backend unreachable'); }
});
bot.command('buy', async (ctx) => {
  const parts = ctx.match?.toString().trim().split(/\s+/) ?? []; const [token, amountStr, denom = 'USD'] = parts;
  const amount = Number(amountStr ?? 0); if (!token || !amount) return ctx.reply('Usage: /buy <token> <amount> [SOL|USD|TOKEN]');
  try { const { data } = await axios.post(`${env.BACKEND_URL}/api/cmd/buy`, { token, amount, denom, slippagePct: 1.0 }); await ctx.reply(`Queued BUY ${token} ${amount} ${denom} (id ${data.id})`); }
  catch (e: any) { await ctx.reply('Buy failed: ' + (e?.response?.data?.error ?? e?.message)); }
});
bot.command('sell', async (ctx) => {
  const parts = ctx.match?.toString().trim().split(/\s+/) ?? []; const [token, amountStr = 'ALL', denom = 'TOKEN'] = parts;
  const amount = amountStr === 'ALL' ? 'ALL' : Number(amountStr); if (!token) return ctx.reply('Usage: /sell <token> <amount|ALL> [TOKEN|USD]');
  try { const { data } = await axios.post(`${env.BACKEND_URL}/api/cmd/sell`, { token, amount, denom }); await ctx.reply(`Queued SELL ${token} ${amount} (id ${data.id})`); }
  catch (e: any) { await ctx.reply('Sell failed: ' + (e?.response?.data?.error ?? e?.message)); }
});
bot.catch((err) => log.error('Bot error', err.error));

// Webhook wiring
export async function registerWebhook(app: express.Express) {
  const path = '/api/tg/webhook';
  const url = new URL(path, env.BACKEND_URL).toString();
  await bot.api.setWebhook(url, env.TELEGRAM_WEBHOOK_SECRET ? { secret_token: env.TELEGRAM_WEBHOOK_SECRET } as any : undefined);
  app.use(path, webhookCallback(bot, 'express', { secretToken: env.TELEGRAM_WEBHOOK_SECRET }));
  log.info('Telegram webhook set', { url, secret: Boolean(env.TELEGRAM_WEBHOOK_SECRET) });
}

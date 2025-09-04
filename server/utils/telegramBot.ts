import { Telegraf } from 'telegraf';

let bot: Telegraf | null = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
}

export async function sendTelegramAlert(message: string): Promise<void> {
  try {
    if (!bot || !process.env.TELEGRAM_CHAT_ID) {
      console.log('[Telegram] Bot not configured, skipping alert');
      return;
    }

    await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
    console.log('📲 Telegram alert sent');
  } catch (error) {
    console.error('[Telegram Error]', error);
  }
}

export function setupTelegramCommands(app: any): void {
  try {
    if (!bot) {
      console.log('[Telegram] Bot token not configured');
      return;
    }

    bot.command('summary', async (ctx) => {
      ctx.reply('📊 SniperX is online. PnL dashboard coming soon.');
    });

    bot.command('status', async (ctx) => {
      ctx.reply('🟢 Trading bot is active and monitoring markets 24/7');
    });

    bot.command('help', async (ctx) => {
      ctx.reply(
        '🤖 SniperX Commands:\n' +
        '/summary - Get trading summary\n' +
        '/status - Check bot status\n' +
        '/help - Show this message'
      );
    });

    bot.launch();
    console.log('✅ Telegram bot ready');

    process.once('SIGINT', () => bot?.stop('SIGINT'));
    process.once('SIGTERM', () => bot?.stop('SIGTERM'));
  } catch (error) {
    console.error('[Telegram Setup Error]', error);
  }
}

export async function notifyTrade(
  action: string,
  tokenSymbol: string,
  amount: string | number,
  txHash: string
): Promise<void> {
  const emoji = action === 'BUY' ? '🟢' : '🔴';
  const message = `${emoji} ${action}: ${amount} SOL for ${tokenSymbol}\n📎 TX: ${txHash}`;
  await sendTelegramAlert(message);
}

export async function notifyPnL(pnlData: any): Promise<void> {
  const profitEmoji = pnlData.totalProfit > 0 ? '📈' : '📉';
  const message = 
    `${profitEmoji} PnL Summary:\n` +
    `Total Trades: ${pnlData.totalTrades}\n` +
    `Win Rate: ${pnlData.winRate}%\n` +
    `Total Profit: ${pnlData.totalProfit.toFixed(4)} SOL`;
  
  await sendTelegramAlert(message);
}
import { Telegraf } from 'telegraf';

let bot: Telegraf | null = null;
let botLaunched = false;

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

    if (botLaunched) {
      console.log('[Telegram] Bot already launched, skipping');
      return;
    }

    bot.command('summary', async (ctx) => {
      ctx.reply('📊 SniperX is online. PnL dashboard coming soon.');
    });

    bot.command('status', async (ctx) => {
      ctx.reply('🟢 Trading bot is active and monitoring markets 24/7');
    });

    bot.command('buy', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length !== 2) {
        return ctx.reply('Usage: /buy <tokenMint> <amount>');
      }
      const [tokenMint, amount] = args;

      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenMint, amount }),
        });
        const data = await res.json();
        ctx.reply(`✅ Buy placed: ${data.txid || 'Simulated'}`);
      } catch (err) {
        console.error('Telegram /buy error:', err);
        ctx.reply('❌ Error executing buy.');
      }
    });

    bot.command('sell', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length !== 2) {
        return ctx.reply('Usage: /sell <tokenMint> <amount>');
      }
      const [tokenMint, amount] = args;

      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/sell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenMint, amount }),
        });
        const data = await res.json();
        ctx.reply(`🔴 Sell placed: ${data.txid || 'Simulated'}`);
      } catch (err) {
        console.error('Telegram /sell error:', err);
        ctx.reply('❌ Error executing sell.');
      }
    });

    bot.command('help', async (ctx) => {
      ctx.reply(
        '🤖 SniperX Commands:\n' +
        '/summary - Get trading summary\n' +
        '/status - Check bot status\n' +
        '/buy <tokenMint> <amount> - Execute buy order\n' +
        '/sell <tokenMint> <amount> - Execute sell order\n' +
        '/help - Show this message'
      );
    });

    bot.launch().then(() => {
      botLaunched = true;
      console.log('✅ Telegram bot ready');
    }).catch((error) => {
      console.error('[Telegram Launch Error]', error);
      if (error.message?.includes('409') || error.message?.includes('Conflict')) {
        console.log('[Telegram] Another instance is already running');
        botLaunched = true;
      }
    });

    process.once('SIGINT', () => {
      botLaunched = false;
      bot?.stop('SIGINT');
    });
    process.once('SIGTERM', () => {
      botLaunched = false;
      bot?.stop('SIGTERM');
    });
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
import { Bot } from 'grammy';
import { tradeQueue } from '../worker/queue';
import { pythPriceService } from '../services/pythPriceFeed';
import { IntelligentTelegramHandler } from '../services/intelligentTelegramHandler';
import { insightsEngine } from '../services/proactiveInsights';
import { tpSlManager } from '../services/autoTpSlManager';
import { dcaManager } from '../services/dcaManager';
import { whaleTracker } from '../services/whaleTracker';
import { tokenSniper } from '../services/tokenSniper';
import { loadWallet } from './solanaAdapter';

let bot: Bot | null = null;
let botLaunched = false;
let intelligentHandler: IntelligentTelegramHandler | null = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
  console.log('🤖 Grammy Telegram bot initialized');
  
  const wallet = loadWallet();
  intelligentHandler = new IntelligentTelegramHandler(bot, wallet.publicKey.toString());
}

export async function sendTelegramAlert(message: string): Promise<void> {
  try {
    if (!bot || !process.env.TELEGRAM_CHAT_ID) {
      console.log('[Telegram] Bot not configured, skipping alert');
      return;
    }

    await bot.api.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
    console.log('📲 Telegram alert sent');
  } catch (error) {
    console.error('[Telegram Error]', error);
  }
}

export function setupTelegramCommands(): void {
  try {
    if (!bot) {
      console.log('[Telegram] Bot token not configured');
      return;
    }

    if (botLaunched) {
      console.log('[Telegram] Bot already launched, skipping');
      return;
    }

    // Activate intelligent Jarvis handler
    if (intelligentHandler) {
      intelligentHandler.setupHandlers();
      intelligentHandler.setupCallbackHandlers();
      console.log('🤖 Intelligent Jarvis assistant activated');
    }

    // Start proactive market monitoring
    if (process.env.OPENAI_API_KEY) {
      insightsEngine.startMonitoring();
      console.log('🔍 Proactive insights monitoring started');
    }

    // Start auto TP/SL monitoring
    tpSlManager.startMonitoring();
    console.log('🛡️ Auto TP/SL manager active');

    // Start DCA manager
    dcaManager.start();
    console.log('📅 DCA manager active');

    // Start whale tracking
    whaleTracker.start();
    console.log('🐋 Whale tracker active');

    // Auto-start sniper if env var set
    if (process.env.AUTO_START_SNIPER === 'true') {
      tokenSniper.enable(false);
      tokenSniper.startScanning();
      console.log('🎯 Auto-sniper started (alerts mode)');
    }

    // Keep essential legacy commands for backwards compatibility
    bot.command('start', (ctx) => 
      ctx.reply('🎯 SniperX Prime online!\n\nCommands:\n/status - Portfolio & positions\n/buy - Buy tokens\n/sell - Sell tokens\n/prices - Live prices\n/queue - Trade queue status\n/risk - Risk settings')
    );

    bot.command('status', async (ctx) => {
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/pro/status`);
        const data = await res.json();
        
        if (data.success) {
          ctx.reply(
            `💼 *SniperX Prime Status*\n\n` +
            `💰 Balance: ${data.balance.toFixed(4)} SOL\n` +
            `📊 Equity: ${data.equity.toFixed(4)} SOL\n\n` +
            `🛡️ *Risk Config:*\n` +
            `• Max per trade: ${data.config.maxPerTrade} SOL\n` +
            `• Max daily: ${data.config.maxDaily} SOL\n` +
            `• Gas reserve: ${data.config.minWallet} SOL\n` +
            `• Kelly cap: ${data.config.kellyCapPct * 100}%\n` +
            `• Max volatility: ${data.config.maxVolatility}%\n\n` +
            `✅ System: ${data.config.system}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          ctx.reply('❌ Failed to fetch status');
        }
      } catch (error) {
        console.error('Status command error:', error);
        ctx.reply('❌ Backend unreachable');
      }
    });

    bot.command('buy', async (ctx) => {
      const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
      const [token, amountStr, denom = 'USD'] = parts;
      const amount = Number(amountStr ?? 0);
      
      if (!token || !amount) {
        return ctx.reply(
          '📖 *Buy Usage:*\n\n' +
          '/buy SOL 10 USD - Buy $10 of SOL\n' +
          '/buy BONK 5 SOL - Buy 5 SOL worth of BONK\n' +
          '/buy JUP 1000 TOKEN - Buy 1000 JUP tokens',
          { parse_mode: 'Markdown' }
        );
      }

      try {
        const taskId = tradeQueue.enqueue({
          type: 'BUY',
          token: token.toUpperCase(),
          amount,
          denom: denom.toUpperCase() as any,
          slippagePct: 1.0
        });

        ctx.reply(
          `✅ *Buy Order Queued*\n\n` +
          `Token: ${token.toUpperCase()}\n` +
          `Amount: ${amount} ${denom}\n` +
          `Task ID: \`${taskId}\`\n\n` +
          `Use /queue to check status`,
          { parse_mode: 'Markdown' }
        );
      } catch (e: any) {
        ctx.reply(`❌ Buy failed: ${e?.message ?? 'Unknown error'}`);
      }
    });

    bot.command('sell', async (ctx) => {
      const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
      const [token, amountStr = 'ALL', denom = 'TOKEN'] = parts;
      const amount = amountStr === 'ALL' ? 'ALL' : Number(amountStr);
      
      if (!token) {
        return ctx.reply(
          '📖 *Sell Usage:*\n\n' +
          '/sell BONK ALL - Liquidate all BONK (chunked)\n' +
          '/sell SOL ALL - Sell entire SOL position\n' +
          '/sell JUP ALL - Sell entire JUP position\n\n' +
          '_Note: Currently only supports selling entire positions_',
          { parse_mode: 'Markdown' }
        );
      }

      try {
        // For "ALL", use 0 as sentinel value (handlers will interpret)
        const taskId = tradeQueue.enqueue({
          type: 'SELL',
          token: token.toUpperCase(),
          amount: amount === 'ALL' ? 0 : amount as number,
          denom: denom.toUpperCase() as any
        });

        ctx.reply(
          `✅ *Sell Order Queued*\n\n` +
          `Token: ${token.toUpperCase()}\n` +
          `Amount: ${amount} ${denom}\n` +
          `Task ID: \`${taskId}\`\n\n` +
          `Use /queue to check status`,
          { parse_mode: 'Markdown' }
        );
      } catch (e: any) {
        ctx.reply(`❌ Sell failed: ${e?.message ?? 'Unknown error'}`);
      }
    });

    bot.command('prices', async (ctx) => {
      try {
        const symbols = ['SOL', 'BTC', 'ETH', 'BONK', 'JUP'];
        const prices = await pythPriceService.getPrices(symbols);
        
        let message = '📊 *Live Prices (Pyth)*\n\n';
        
        for (const symbol of symbols) {
          const price = prices[symbol];
          if (price) {
            const priceStr = price.price > 1 ? price.price.toFixed(2) : price.price.toFixed(6);
            const conf = ((price.confidence / price.price) * 100).toFixed(2);
            message += `${symbol}: $${priceStr} (±${conf}%)\n`;
          } else {
            message += `${symbol}: N/A\n`;
          }
        }
        
        ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Prices command error:', error);
        ctx.reply('❌ Failed to fetch prices');
      }
    });

    bot.command('queue', async (ctx) => {
      try {
        const status = tradeQueue.getQueueStatus();
        
        let message = `📋 *Trade Queue Status*\n\n`;
        message += `Total: ${status.total}\n`;
        message += `Queued: ${status.queued}\n`;
        message += `Processing: ${status.processing}\n\n`;
        
        if (status.tasks.length > 0) {
          message += `*Recent Tasks:*\n`;
          status.tasks.forEach((task, i) => {
            const emoji = task.status === 'COMPLETED' ? '✅' : 
                         task.status === 'FAILED' ? '❌' : 
                         task.status === 'PROCESSING' ? '⚙️' : '⏳';
            message += `${emoji} ${task.type} ${task.amount} ${task.denom} ${task.token}\n`;
          });
        } else {
          message += '_Queue is empty_';
        }
        
        ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Queue command error:', error);
        ctx.reply('❌ Failed to fetch queue status');
      }
    });

    bot.command('risk', async (ctx) => {
      ctx.reply(
        '🛡️ *SniperX Prime Risk Management*\n\n' +
        '*Position Sizing:*\n' +
        '• Kelly Criterion (10% cap)\n' +
        '• Max 0.005 SOL per trade\n' +
        '• Max 0.05 SOL daily\n\n' +
        '*Protection:*\n' +
        '• DrawdownGuard (10% scale, 15% stop)\n' +
        '• VolatilityLimiter (25% max)\n' +
        '• Gas Reserve (0.015 SOL protected)\n\n' +
        '*Execution:*\n' +
        '• Simulation before trades\n' +
        '• 3-attempt retry logic\n' +
        '• Smart slippage (1-5%)',
        { parse_mode: 'Markdown' }
      );
    });

    bot.command('liquidate', async (ctx) => {
      const token = ctx.match?.toString().trim().toUpperCase();
      
      if (!token) {
        return ctx.reply('Usage: /liquidate BONK');
      }

      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/pro/liquidate-bonk`, {
          method: 'POST'
        });
        const data = await res.json();
        
        if (data.success) {
          ctx.reply(
            `✅ *Emergency Liquidation*\n\n` +
            `Amount: ${data.amount.toLocaleString()} ${token}\n` +
            `Tx: \`${data.txid}\`\n\n` +
            `View: https://solscan.io/tx/${data.txid}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          ctx.reply(`❌ ${data.message || data.error}`);
        }
      } catch (error) {
        console.error('Liquidate command error:', error);
        ctx.reply('❌ Liquidation failed');
      }
    });

    bot.command('help', (ctx) => {
      ctx.reply(
        '🎯 *SniperX Prime Commands*\n\n' +
        '/start - Welcome message\n' +
        '/status - Portfolio & config\n' +
        '/buy <token> <amt> <denom> - Buy order\n' +
        '/sell <token> <amt> <denom> - Sell order\n' +
        '/prices - Live Pyth prices\n' +
        '/queue - Trade queue status\n' +
        '/risk - Risk management info\n' +
        '/liquidate <token> - Emergency sell\n' +
        '/help - This message',
        { parse_mode: 'Markdown' }
      );
    });

    // Error handling
    bot.catch((err) => {
      console.error('❌ Telegram bot error:', err.error);
    });

    // Launch bot
    bot.start({
      onStart: (botInfo) => {
        botLaunched = true;
        console.log(`✅ Telegram bot @${botInfo.username} ready (Grammy)`);
      }
    }).catch((error) => {
      console.error('[Telegram Launch Error]', error);
      if (error.message?.includes('409') || error.message?.includes('Conflict')) {
        console.log('[Telegram] Another instance is already running');
        botLaunched = true;
      }
    });

    process.once('SIGINT', () => {
      botLaunched = false;
      bot?.stop();
    });
    process.once('SIGTERM', () => {
      botLaunched = false;
      bot?.stop();
    });

  } catch (error) {
    console.error('[Telegram Setup Error]', error);
  }
}

export { bot };

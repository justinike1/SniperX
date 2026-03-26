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

const TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

let bot: Bot | null = null;
let botLaunched = false;
let intelligentHandler: IntelligentTelegramHandler | null = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
  
  const wallet = loadWallet();
  intelligentHandler = new IntelligentTelegramHandler(bot, wallet.publicKey.toString());
}

export async function sendTelegramAlert(message: string): Promise<void> {
  if (!bot || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await bot.api.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
  } catch (error) {
    console.error('[Telegram send error]', error instanceof Error ? error.message : error);
  }
}

export function setupTelegramCommands(): void {
  try {
    if (!bot) return;
    if (botLaunched) return;

    if (intelligentHandler) {
      intelligentHandler.setupHandlers();
      intelligentHandler.setupCallbackHandlers();
    }

    if (process.env.OPENAI_API_KEY) {
      insightsEngine.startMonitoring();
    }

    tpSlManager.startMonitoring();
    dcaManager.start();
    whaleTracker.start();

    if (process.env.AUTO_START_SNIPER === 'true') {
      tokenSniper.enable(false);
      tokenSniper.startScanning();
    }

    // Keep essential legacy commands for backwards compatibility
    bot.command('start', (ctx) => 
      ctx.reply('SniperX online.\n\n/status - Wallet & risk state\n/buy - Buy tokens\n/sell - Sell tokens\n/brain - Brain status\n/paper - Paper trading stats\n/prices - Live prices\n/help - All commands')
    );

    bot.command('status', async (ctx) => {
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/pro/status`);
        const data = await res.json();
        
        if (data.success) {
          const r = data.risk || {};
          const eq = data.equity || {};
          ctx.reply(
            `*Status*\n\n` +
            `Balance: ${(data.wallet?.balanceSOL || 0).toFixed(4)} SOL\n` +
            `Equity: $${(eq.totalUSD || 0).toFixed(2)} (cash: $${(eq.cashUSD || 0).toFixed(2)}, positions: $${(eq.positionsUSD || 0).toFixed(2)})\n` +
            `Mode: ${data.mode}\n` +
            `Risk: ${r.halted ? '🔴 HALTED — ' + r.haltReason : '🟢 Active'}\n` +
            `Daily realized: $${(r.dailyRealizedPnlUSD || 0).toFixed(2)}\n\n` +
            `Limits: ${(data.riskConfig?.maxPerTradeSOL || 0).toFixed(4)} SOL/trade, ${(data.riskConfig?.maxDailySOL || 0).toFixed(4)} SOL/day`,
            { parse_mode: 'Markdown' }
          );
        } else {
          ctx.reply('Failed to fetch status');
        }
      } catch (error) {
        console.error('Status error:', error);
        ctx.reply('Backend unreachable');
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
          '/sell BONK ALL - Sell full tracked position\n' +
          '/sell JUP 50 TOKEN - Sell 50 tokens from tracked position\n' +
          '/sell BONK 100 USD - Sell $100 notional from tracked position\n\n' +
          '_Requires an active tracked live position_',
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
        '*Risk Controls*\n\n' +
        'Sizing: Kelly Criterion (10% cap)\n' +
        'Per trade: 0.005 SOL max\n' +
        'Daily: 0.05 SOL max\n' +
        'Gas reserve: 0.015 SOL\n\n' +
        'Drawdown: scale at 10%, halt at 15%\n' +
        'Volatility: halt above 25%\n' +
        'Losses: halt after 3 consecutive\n\n' +
        'Execution: simulate → send (3 retries) → confirm',
        { parse_mode: 'Markdown' }
      );
    });

    bot.command('liquidate', async (ctx) => {
      const token = ctx.match?.toString().trim().toUpperCase();
      
      if (!token) {
        return ctx.reply('Usage: /liquidate <TOKEN>');
      }

      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/pro/trade`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tokenMint: TOKEN_MINTS[token] || token,
            action: 'SELL',
            sellFraction: 1
          })
        });
        const data = await res.json();
        
        if (data.success && data.decision === 'SELL') {
          const txText = data.txid ? `https://solscan.io/tx/${data.txid}` : 'n/a';
          ctx.reply(
            `✅ *Emergency Liquidation*\n\n` +
            `Token: ${token}\n` +
            `Realized: ${data.realizedPnlUSD !== undefined ? (data.realizedPnlUSD >= 0 ? '+' : '') + '$' + Number(data.realizedPnlUSD).toFixed(2) : 'n/a'}\n` +
            `Tx: \`${data.txid || 'n/a'}\`\n\n` +
            `View: ${txText}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          ctx.reply(`❌ ${data.error || 'Liquidation failed'}`);
        }
      } catch (error) {
        console.error('Liquidate command error:', error);
        ctx.reply('❌ Liquidation failed');
      }
    });

    bot.command('help', (ctx) => {
      ctx.reply(
        '*Commands*\n\n' +
        '/status - Wallet balance & risk state\n' +
        '/buy <token> <amt> <denom> - Buy order\n' +
        '/sell <token> ALL - Sell entire position\n' +
        '/prices - Live Pyth prices\n' +
        '/queue - Trade queue\n' +
        '/risk - Risk controls\n' +
        '/brain - Brain + regime status\n' +
        '/paper - Paper trading stats\n' +
        '/score <token> - Score a token\n' +
        '/liquidate <token> - Emergency sell\n' +
        '/autopilot on|off - Toggle auto-trading',
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
        console.log(`Telegram bot @${botInfo.username} ready`);
      }
    }).catch((error) => {
      if (error.message?.includes('409') || error.message?.includes('Conflict')) {
        console.warn('Telegram: another instance already running');
        botLaunched = true;
      } else {
        console.error('Telegram launch error:', error.message || error);
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

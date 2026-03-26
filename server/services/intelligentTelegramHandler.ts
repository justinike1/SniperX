import { Bot, Context } from 'grammy';
import { aiAnalyst } from './aiMarketAnalyst';
import { portfolioTracker } from './portfolioTracker';
import { insightsEngine } from './proactiveInsights';
import { tradeQueue } from '../worker/queue';
import { pythPriceService } from './pythPriceFeed';
import { tokenSniper } from './tokenSniper';
import { tpSlManager } from './autoTpSlManager';
import { dcaManager, DCA_INTERVALS } from './dcaManager';
import { pnlTracker } from './pnlTracker';
import { marketSentiment } from './marketSentiment';
import { whaleTracker } from './whaleTracker';
import { brain, regimeDetector, decisionEngine, riskManager, tradeJournal, performanceTracker, backtester } from '../brain/index';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class IntelligentTelegramHandler {
  private bot: Bot;
  private walletAddress: string;

  constructor(bot: Bot, walletAddress: string) {
    this.bot = bot;
    this.walletAddress = walletAddress;
  }

  setupHandlers() {
    this.bot.on('message:text', async (ctx) => {
      await this.handleTextMessage(ctx);
    });

    this.bot.on('message:voice', async (ctx) => {
      await this.handleVoiceMessage(ctx);
    });

    this.setupCommands();
  }

  private setupCommands() {
    // ── WELCOME ──────────────────────────────────────────────────────────────
    this.bot.command('start', (ctx) =>
      ctx.reply(
        '🤖 *SNIPERX JARVIS - Elite Trading Bot*\n\n' +
        'I\'m your personal AI trading assistant. Here\'s what I can do:\n\n' +
        '🎯 *Trading*\n' +
        '/buy SOL 50 USD · /sell BONK ALL\n' +
        '/snipe BONK · /dca SOL 10 daily\n\n' +
        '📊 *Analysis*\n' +
        '/analyze SOL · /sentiment · /trending\n' +
        '/prices · /portfolio · /pnl\n\n' +
        '🛡️ *Risk & Automation*\n' +
        '/tp SOL 20 · /sl SOL 10 · /positions\n' +
        '/sniper on · /whales\n\n' +
        '💬 *Or just chat naturally!*\n' +
        '"Should I buy SOL?" · "What\'s pumping?"\n' +
        '"Set 20% take profit on BONK"\n\n' +
        '🎤 Voice messages work too!',
        { parse_mode: 'Markdown' }
      )
    );

    // ── PRICES ───────────────────────────────────────────────────────────────
    this.bot.command('prices', async (ctx) => {
      const tokens = ['SOL', 'BONK', 'JUP'];
      let msg = '💰 *Live Prices*\n\n';
      for (const token of tokens) {
        try {
          const price = await pythPriceService.getPrice(token);
          if (price?.price) {
            const formatted = price.price < 0.01
              ? price.price.toFixed(8)
              : price.price < 1
                ? price.price.toFixed(6)
                : price.price.toFixed(2);
            msg += `*${token}:* $${formatted}\n`;
          } else {
            msg += `*${token}:* unavailable\n`;
          }
        } catch {
          msg += `*${token}:* unavailable\n`;
        }
      }
      msg += '\n_Powered by Pyth oracle_';
      ctx.reply(msg, { parse_mode: 'Markdown' });
    });

    // ── PORTFOLIO ─────────────────────────────────────────────────────────────
    this.bot.command('portfolio', async (ctx) => {
      await this.handlePortfolioCommand(ctx);
    });

    // ── P&L REPORT ────────────────────────────────────────────────────────────
    this.bot.command('pnl', async (ctx) => {
      const report = pnlTracker.formatPnlReport();
      const recent = pnlTracker.getRecentTrades(5);
      ctx.reply(`${report}\n\n${recent}`, { parse_mode: 'Markdown' });
    });

    // ── ANALYZE ───────────────────────────────────────────────────────────────
    this.bot.command('analyze', async (ctx) => {
      const token = ctx.match?.toString().trim().toUpperCase();
      if (!token) return ctx.reply('Usage: /analyze SOL');
      await this.handleNaturalAnalyze(ctx, token);
    });

    // ── SENTIMENT ─────────────────────────────────────────────────────────────
    this.bot.command('sentiment', async (ctx) => {
      await ctx.replyWithChatAction('typing');
      const report = await marketSentiment.formatSentimentReport();
      ctx.reply(report, { parse_mode: 'Markdown' });
    });

    // ── TRENDING ──────────────────────────────────────────────────────────────
    this.bot.command('trending', async (ctx) => {
      await ctx.replyWithChatAction('typing');
      const report = await tokenSniper.scanTrending();
      ctx.reply(report, { parse_mode: 'Markdown' });
    });

    // ── SNIPE SPECIFIC TOKEN ──────────────────────────────────────────────────
    this.bot.command('snipe', async (ctx) => {
      const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
      const token = parts[0]?.toUpperCase();
      const amount = parseFloat(parts[1] || '20');

      if (!token) {
        return ctx.reply(
          '🎯 *Snipe Usage:*\n\n' +
          '/snipe BONK 20 - Buy $20 of BONK immediately\n' +
          '/sniper on - Enable auto-sniper for new launches\n' +
          '/sniper off - Disable auto-sniper',
          { parse_mode: 'Markdown' }
        );
      }

      await ctx.replyWithChatAction('typing');
      const info = await tokenSniper.getTokenInfo(token);
      await ctx.reply(info + '\n\n⚡ Sniping...', { parse_mode: 'Markdown' });

      const taskId = tradeQueue.enqueue({
        type: 'BUY',
        token,
        amount,
        denom: 'USD',
        slippagePct: 2.0
      });

      ctx.reply(`✅ Snipe order queued! Task: ${taskId}`);
    });

    // ── AUTO SNIPER ON/OFF ────────────────────────────────────────────────────
    this.bot.command('sniper', async (ctx) => {
      const arg = ctx.match?.toString().trim().toLowerCase();
      const config = tokenSniper.getConfig();

      if (arg === 'on') {
        tokenSniper.enable(false); // alerts only
        tokenSniper.startScanning();
        ctx.reply(
          '🎯 *Auto-Sniper ENABLED*\n\n' +
          'I\'ll alert you when new tokens meet criteria:\n' +
          `• Min liquidity: $${(config.minLiquidity / 1000).toFixed(0)}K\n` +
          `• Max age: ${config.maxAge} minutes\n` +
          `• Min volume: $${(config.minVolume / 1000).toFixed(0)}K\n\n` +
          'Alerts only mode - you confirm each buy.',
          { parse_mode: 'Markdown' }
        );
      } else if (arg === 'auto') {
        tokenSniper.enable(true); // auto-buy
        tokenSniper.startScanning();
        ctx.reply(
          '⚡ *Auto-Sniper AUTO-BUY ENABLED*\n\n' +
          '⚠️ Bot will auto-buy qualifying new tokens!\n' +
          `Max $${config.maxBuyUSD} per snipe.\n\n` +
          'Use /sniper off to stop.',
          { parse_mode: 'Markdown' }
        );
      } else if (arg === 'off') {
        tokenSniper.disable();
        ctx.reply('🛑 Auto-Sniper disabled.');
      } else {
        const status = config.enabled ? '🟢 ON' : '🔴 OFF';
        ctx.reply(
          `🎯 *Auto-Sniper Status: ${status}*\n\n` +
          `/sniper on - Enable (alerts only)\n` +
          `/sniper auto - Enable (auto-buy)\n` +
          `/sniper off - Disable`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    // ── DCA ───────────────────────────────────────────────────────────────────
    this.bot.command('dca', async (ctx) => {
      const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
      const [token, amountStr, interval, action] = parts;

      if (action === 'cancel' || interval === 'cancel') {
        const cancelled = dcaManager.cancelAllForToken(token || '');
        ctx.reply(cancelled > 0 ? `✅ Cancelled ${cancelled} DCA order(s) for ${token}` : '❌ No DCA orders found');
        return;
      }

      if (!token || !amountStr || !interval) {
        const orders = dcaManager.formatOrders();
        const validIntervals = Object.keys(DCA_INTERVALS).join(', ');
        return ctx.reply(
          `📅 *DCA (Dollar Cost Average)*\n\n` +
          `Usage: /dca TOKEN AMOUNT INTERVAL\n\n` +
          `Examples:\n` +
          `• /dca SOL 10 daily\n` +
          `• /dca BONK 5 weekly\n` +
          `• /dca JUP 20 4h\n\n` +
          `Valid intervals: ${validIntervals}\n\n` +
          `${orders}`,
          { parse_mode: 'Markdown' }
        );
      }

      const amount = parseFloat(amountStr);
      const order = dcaManager.createOrder(token.toUpperCase(), amount, interval.toLowerCase());

      if (!order) {
        return ctx.reply(`❌ Invalid interval "${interval}". Use: ${Object.keys(DCA_INTERVALS).join(', ')}`);
      }

      ctx.reply(
        `✅ *DCA Order Created*\n\n` +
        `Token: ${order.token}\n` +
        `Amount: $${order.amountUSD} every ${order.intervalLabel}\n\n` +
        `First buy in ${order.intervalLabel}.\n` +
        `Cancel with: /dca ${token} cancel`,
        { parse_mode: 'Markdown' }
      );
    });

    // ── TAKE PROFIT ───────────────────────────────────────────────────────────
    this.bot.command('tp', async (ctx) => {
      const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
      const token = parts[0]?.toUpperCase();
      const pct = parseFloat(parts[1] || '20');

      if (!token) return ctx.reply('Usage: /tp SOL 20  (set 20% take profit on SOL)');

      try {
        const price = await pythPriceService.getPrice(token);
        const entryPrice = price?.price || 0;

        const id = tpSlManager.addPosition({
          token,
          tokenMint: token,
          entryPrice,
          entryUSD: 0,
          takeProfitPct: pct,
          stopLossPct: 999, // no SL, just TP
        });

        ctx.reply(
          `✅ *Take Profit Set*\n\n` +
          `Token: ${token}\n` +
          `Entry: $${entryPrice.toFixed(4)}\n` +
          `Target: +${pct}% = $${(entryPrice * (1 + pct / 100)).toFixed(4)}\n\n` +
          `I'll auto-sell when ${token} hits your target.`,
          { parse_mode: 'Markdown' }
        );
      } catch {
        ctx.reply('❌ Error setting take profit. Please try again.');
      }
    });

    // ── STOP LOSS ─────────────────────────────────────────────────────────────
    this.bot.command('sl', async (ctx) => {
      const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
      const token = parts[0]?.toUpperCase();
      const pct = parseFloat(parts[1] || '10');

      if (!token) return ctx.reply('Usage: /sl SOL 10  (set 10% stop loss on SOL)');

      try {
        const price = await pythPriceService.getPrice(token);
        const entryPrice = price?.price || 0;

        tpSlManager.addPosition({
          token,
          tokenMint: token,
          entryPrice,
          entryUSD: 0,
          takeProfitPct: 999, // no TP, just SL
          stopLossPct: pct,
        });

        ctx.reply(
          `🛑 *Stop Loss Set*\n\n` +
          `Token: ${token}\n` +
          `Entry: $${entryPrice.toFixed(4)}\n` +
          `Stop at: -${pct}% = $${(entryPrice * (1 - pct / 100)).toFixed(4)}\n\n` +
          `I'll auto-sell if ${token} drops to your stop level.`,
          { parse_mode: 'Markdown' }
        );
      } catch {
        ctx.reply('❌ Error setting stop loss. Please try again.');
      }
    });

    // ── POSITIONS ─────────────────────────────────────────────────────────────
    this.bot.command('positions', async (ctx) => {
      const positions = tpSlManager.formatPositions();
      ctx.reply(positions, { parse_mode: 'Markdown' });
    });

    // ── WHALES ────────────────────────────────────────────────────────────────
    this.bot.command('whales', async (ctx) => {
      const report = whaleTracker.formatWhaleReport();
      ctx.reply(report, { parse_mode: 'Markdown' });
    });

    // ── TRACK WALLET ──────────────────────────────────────────────────────────
    this.bot.command('track', async (ctx) => {
      const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
      const address = parts[0];
      const label = parts.slice(1).join(' ') || undefined;

      if (!address || address.length < 32) {
        return ctx.reply('Usage: /track <wallet_address> [label]\nExample: /track ABC123... My Whale');
      }

      whaleTracker.trackWallet(address, label);
      ctx.reply(`✅ Now tracking wallet: ${label || address.slice(0, 20)}...`);
    });

    // ── WATCHLIST ─────────────────────────────────────────────────────────────
    this.bot.command('watchlist', async (ctx) => {
      const watchlist = insightsEngine.getWatchlist();
      ctx.reply(
        `📋 *Your Watchlist*\n\n` +
        watchlist.map(t => `• ${t}`).join('\n') +
        `\n\n_I monitor these tokens 24/7 and alert you on 5%+ moves_`,
        { parse_mode: 'Markdown' }
      );
    });

    // ── STATUS ────────────────────────────────────────────────────────────────
    this.bot.command('status', async (ctx) => {
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/pro/status`);
        const data = await res.json() as any;
        const sniperConfig = tokenSniper.getConfig();
        const dcaOrders = dcaManager.getOrders();
        const positions = tpSlManager.getPositions();

        ctx.reply(
          `⚙️ *SniperX Status*\n\n` +
          `💰 Wallet: ${data.balance?.toFixed(4) || '?'} SOL\n` +
          `📊 Risk: ${data.config?.system || 'Kelly Criterion'}\n\n` +
          `🎯 Sniper: ${sniperConfig.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
          `📅 DCA Orders: ${dcaOrders.length} active\n` +
          `📍 TP/SL Positions: ${positions.length} active\n` +
          `🐋 Wallets tracked: ${whaleTracker.getTrackedWallets().length}\n\n` +
          `✅ All systems operational`,
          { parse_mode: 'Markdown' }
        );
      } catch {
        ctx.reply('⚙️ Status check failed. Bot is still running.');
      }
    });

    // ── HELP ──────────────────────────────────────────────────────────────────
    this.bot.command('help', (ctx) =>
      ctx.reply(
        '📚 *SniperX Elite Commands*\n\n' +
        '💰 *Trading*\n' +
        '/buy TOKEN AMOUNT USD\n' +
        '/sell TOKEN ALL\n' +
        '/snipe TOKEN AMOUNT - Instant snipe\n\n' +
        '🎯 *Sniper*\n' +
        '/sniper on|auto|off\n' +
        '/trending - Hot tokens right now\n\n' +
        '📅 *DCA (Auto-buy)*\n' +
        '/dca SOL 10 daily\n' +
        '/dca TOKEN cancel\n\n' +
        '🛡️ *TP/SL Protection*\n' +
        '/tp TOKEN PCT - Take profit\n' +
        '/sl TOKEN PCT - Stop loss\n' +
        '/positions - View all TP/SL\n\n' +
        '📊 *Analytics*\n' +
        '/pnl - Profit & loss report\n' +
        '/portfolio - Holdings\n' +
        '/analyze TOKEN - AI analysis\n' +
        '/sentiment - Fear & Greed\n' +
        '/prices - Live Pyth prices\n\n' +
        '🐋 *Whale Tracking*\n' +
        '/whales - Recent whale moves\n' +
        '/track ADDRESS LABEL\n\n' +
        '💬 *Chat naturally!* Just talk to me.',
        { parse_mode: 'Markdown' }
      )
    );

    // ── BRAIN STATUS ──────────────────────────────────────────────────────────
    this.bot.command('brain', async (ctx) => {
      await ctx.replyWithChatAction('typing');
      const status = await brain.getFullStatus();
      ctx.reply(status, { parse_mode: 'Markdown' });
    });

    // ── REGIME ────────────────────────────────────────────────────────────────
    this.bot.command('regime', async (ctx) => {
      await ctx.replyWithChatAction('typing');
      const r = await regimeDetector.getRegime();
      const icons: Record<string, string> = { TREND_UP: '📈', TREND_DOWN: '📉', CHOP: '↔️', MANIA: '🔥', RISK_OFF: '🛡️' };
      const mods = regimeDetector.getStrategyModifiers(r.regime);
      ctx.reply(
        `🌍 *Market Regime: ${icons[r.regime]} ${r.regime}*\n\n` +
        `Confidence: ${r.confidence}%\n` +
        `SOL: $${r.solPrice.toFixed(2)} | 1h: ${r.solChange1h >= 0 ? '+' : ''}${r.solChange1h.toFixed(1)}% | 24h: ${r.solChange24h >= 0 ? '+' : ''}${r.solChange24h.toFixed(1)}%\n` +
        `Fear & Greed: ${r.fearGreed} | Volume: ${r.volumeTrend}\n\n` +
        `📋 *Strategy Adjustments:*\n` +
        `Size: ${mods.sizeMultiplier === 0 ? '❌ NO TRADES' : `${(mods.sizeMultiplier * 100).toFixed(0)}%`}\n` +
        `TP multiplier: ${mods.tpMultiplier}x | SL multiplier: ${mods.slMultiplier}x\n` +
        `Score bonus: ${mods.scoreBonus >= 0 ? '+' : ''}${mods.scoreBonus}\n\n` +
        `📝 *Signals:*\n${r.signals.map(s => `• ${s}`).join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    });

    // ── SCORE A TOKEN ─────────────────────────────────────────────────────────
    this.bot.command('score', async (ctx) => {
      const token = ctx.match?.toString().trim();
      if (!token) return ctx.reply('Usage: /score SOL\nRuns the decision engine and returns a 0-100 confidence score.');
      await ctx.replyWithChatAction('typing');
      ctx.reply('🧠 Scoring ' + token.toUpperCase() + '...');
      const result = await brain.manualScore(token);
      ctx.reply(result, { parse_mode: 'Markdown' });
    });

    // ── RISK STATUS ───────────────────────────────────────────────────────────
    this.bot.command('risk', (ctx) => {
      ctx.reply(riskManager.getStatusText(), { parse_mode: 'Markdown' });
    });

    // ── RESUME AFTER HALT ─────────────────────────────────────────────────────
    this.bot.command('resume', (ctx) => {
      riskManager.resume();
      ctx.reply('✅ Risk manager resumed. Trading re-enabled.\n\nBe careful — review why it halted before letting it run.', { parse_mode: 'Markdown' });
    });

    // ── TRADE JOURNAL ─────────────────────────────────────────────────────────
    this.bot.command('journal', async (ctx) => {
      const args = ctx.match?.toString().trim();
      if (args) {
        const entry = tradeJournal.getById(args.toUpperCase());
        if (entry) {
          const review = tradeJournal.selfReview(entry);
          return ctx.reply(review, { parse_mode: 'Markdown' });
        }
      }
      const summary = tradeJournal.getRecentSummary(10);
      ctx.reply(summary, { parse_mode: 'Markdown' });
    });

    // ── PERFORMANCE ───────────────────────────────────────────────────────────
    this.bot.command('performance', (ctx) => {
      const summary = performanceTracker.compute(tradeJournal.getAll());
      const report = performanceTracker.formatReport(summary);
      ctx.reply(report, { parse_mode: 'Markdown' });
    });

    // ── PAPER TRADING ─────────────────────────────────────────────────────────
    this.bot.command('paper', async (ctx) => {
      const arg = ctx.match?.toString().trim().toLowerCase();
      if (arg === 'on') {
        backtester.enablePaperMode();
        return ctx.reply('📄 *Paper mode ON* — trades are simulated, no real money spent.\nBuild your 10-trade track record before going live.', { parse_mode: 'Markdown' });
      }
      if (arg === 'live' || arg === 'go_live') {
        const result = backtester.enableLiveMode();
        if (result.allowed) {
          return ctx.reply('🔴 *Switched to LIVE mode* — real money now.\n⚠️ Make sure your wallet is funded and SOLANA_PRIVATE_KEY is set.', { parse_mode: 'Markdown' });
        }
        return ctx.reply(`❌ *Not ready for live*\n${result.reason}\n\nKeep paper trading to build your track record.`, { parse_mode: 'Markdown' });
      }
      if (arg === 'reset') {
        backtester.reset();
        return ctx.reply('📄 Paper trading reset.', { parse_mode: 'Markdown' });
      }
      ctx.reply(backtester.getStatusText(), { parse_mode: 'Markdown' });
    });

    // ── AUTOPILOT ─────────────────────────────────────────────────────────────
    this.bot.command('autopilot', async (ctx) => {
      const arg = ctx.match?.toString().trim().toLowerCase();
      if (arg === 'on') {
        if (!brain.isRunning()) await brain.start(true);
        else brain.enableAutoPilot();
        return ctx.reply(
          '🤖 *AutoPilot: ON*\n\nBrain will scan markets and execute trades automatically.\n' +
          `Mode: ${backtester.getMode()}\n\n` +
          `⚠️ Running in ${backtester.isPaper() ? 'PAPER mode — no real money' : 'LIVE mode — REAL MONEY'}`,
          { parse_mode: 'Markdown' }
        );
      }
      if (arg === 'off') {
        brain.disableAutoPilot();
        return ctx.reply('👀 *AutoPilot: OFF*\nBot will scan and alert but not execute.', { parse_mode: 'Markdown' });
      }
      const status = await brain.getFullStatus();
      ctx.reply(status, { parse_mode: 'Markdown' });
    });
  }

  // ── TEXT MESSAGE HANDLER ───────────────────────────────────────────────────
  private async handleTextMessage(ctx: Context) {
    if (!ctx.message?.text) return;
    if (ctx.message.text.startsWith('/')) return;

    const userId = ctx.from?.id.toString() || 'default';
    const message = ctx.message.text.toLowerCase();

    try {
      await ctx.replyWithChatAction('typing');

      // Check for natural language trading intents first
      const intent = await aiAnalyst.detectTradingIntent(message);

      if (intent.intent === 'BUY' && intent.token) {
        await this.handleNaturalBuy(ctx, intent.token.toUpperCase(), intent.amount);
      } else if (intent.intent === 'SELL' && intent.token) {
        await this.handleNaturalSell(ctx, intent.token.toUpperCase());
      } else if (intent.intent === 'ANALYZE' && intent.token) {
        await this.handleNaturalAnalyze(ctx, intent.token.toUpperCase());
      } else if (intent.intent === 'PORTFOLIO' || /portfolio|holdings|balance/i.test(message)) {
        await this.handlePortfolioCommand(ctx);
      } else if (/sentiment|fear|greed|market feeling/i.test(message)) {
        const report = await marketSentiment.formatSentimentReport();
        ctx.reply(report, { parse_mode: 'Markdown' });
      } else if (/trending|pumping|movers|hot/i.test(message)) {
        const report = await tokenSniper.scanTrending();
        ctx.reply(report, { parse_mode: 'Markdown' });
      } else if (/pnl|profit|loss|how.*doing|performance/i.test(message)) {
        const report = pnlTracker.formatPnlReport();
        ctx.reply(report, { parse_mode: 'Markdown' });
      } else if (/whale|big.*wallet|smart.*money/i.test(message)) {
        const report = whaleTracker.formatWhaleReport();
        ctx.reply(report, { parse_mode: 'Markdown' });
      } else {
        // Fallback to AI chat
        const portfolio = await portfolioTracker.getCurrentPortfolio(this.walletAddress);
        const sentiment = await marketSentiment.getSentiment();
        const context = {
          balance: portfolio.solBalance,
          positions: portfolio.positions.map(p => ({ token: p.token, value: p.valueUSD })),
          marketSentiment: sentiment.sentiment,
          fearGreedIndex: sentiment.fearGreedIndex
        };
        const response = await aiAnalyst.chat(userId, ctx.message.text, context);
        await ctx.reply(response);
      }
    } catch (error) {
      console.error('Message handling error:', error);
      await ctx.reply('I had a brief hiccup. Try again or use a slash command.');
    }
  }

  // ── VOICE HANDLER ─────────────────────────────────────────────────────────
  private async handleVoiceMessage(ctx: Context) {
    if (!ctx.message?.voice) return;

    try {
      await ctx.reply('🎤 Transcribing your voice message...');

      const fileId = ctx.message.voice.file_id;
      const file = await ctx.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const tempFile = path.join(os.tmpdir(), `voice-${Date.now()}.ogg`);
      const audioResponse = await fetch(fileUrl);
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      fs.writeFileSync(tempFile, audioBuffer);

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile) as any,
        model: 'whisper-1',
      });

      fs.unlinkSync(tempFile);
      const text = transcription.text;

      await ctx.reply(`🎤 "${text}"\n\nProcessing...`);

      const fakeCtx = { ...ctx, message: { ...ctx.message, text } };
      await this.handleTextMessage(fakeCtx as Context);
    } catch (error) {
      console.error('Voice error:', error);
      await ctx.reply('Could not process voice message. Please type your message instead.');
    }
  }

  // ── NATURAL LANGUAGE TRADE HANDLERS ───────────────────────────────────────
  private async handleNaturalBuy(ctx: Context, token: string, amount?: number) {
    if (!amount) {
      await ctx.reply(`How much ${token} do you want to buy? (e.g. $50 or 0.5 SOL)`);
      return;
    }

    await ctx.replyWithChatAction('typing');

    let analysisText = '';
    try {
      const analysis = await aiAnalyst.analyzeMarket(token);
      analysisText = `\n📊 *AI Says:* ${analysis.recommendation} (${analysis.confidence}% confidence)\n`;
    } catch { }

    await ctx.reply(
      `🛒 *Ready to buy ${token}*\n\n` +
      `Amount: $${amount}\n` +
      `${analysisText}\n` +
      `Confirm purchase?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: `✅ Buy $${amount} of ${token}`, callback_data: `buy_${token}_${amount}` },
            { text: '❌ Cancel', callback_data: 'cancel' }
          ]]
        }
      }
    );
  }

  private async handleNaturalSell(ctx: Context, token: string) {
    await ctx.replyWithChatAction('typing');

    let analysisText = '';
    try {
      const analysis = await aiAnalyst.analyzeMarket(token);
      analysisText = `\n📊 *AI Says:* ${analysis.recommendation} (${analysis.confidence}% confidence)\n`;
    } catch { }

    await ctx.reply(
      `💸 *Ready to sell ${token}*\n\n` +
      `${analysisText}\n` +
      `Sell entire position?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: `✅ Sell ALL ${token}`, callback_data: `sell_${token}_ALL` },
            { text: '❌ Cancel', callback_data: 'cancel' }
          ]]
        }
      }
    );
  }

  private async handleNaturalAnalyze(ctx: Context, token: string) {
    await ctx.replyWithChatAction('typing');
    try {
      const [analysis, dexInfo, sentiment] = await Promise.all([
        aiAnalyst.analyzeMarket(token),
        tokenSniper.getTokenInfo(token),
        marketSentiment.getSentiment()
      ]);

      await ctx.reply(
        `📊 *Analysis: ${token}*\n\n` +
        `💰 Price: $${analysis.currentPrice}\n` +
        `🎯 Signal: *${analysis.recommendation}*\n` +
        `📈 Confidence: ${analysis.confidence}%\n\n` +
        `🧠 Market: ${sentiment.emoji} ${sentiment.sentiment}\n\n` +
        `*AI Reasoning:*\n${analysis.reasoning.slice(0, 400)}\n\n` +
        `⚠️ *Risks:*\n${analysis.risks.slice(0, 2).map(r => `• ${r}`).join('\n')}\n\n` +
        `💡 *Opportunities:*\n${analysis.opportunities.slice(0, 2).map(o => `• ${o}`).join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      await ctx.reply(`❌ Could not analyze ${token}. Try again.`);
    }
  }

  private async handlePortfolioCommand(ctx: Context) {
    await ctx.replyWithChatAction('typing');
    try {
      const [portfolio, sentiment] = await Promise.all([
        portfolioTracker.getCurrentPortfolio(this.walletAddress),
        marketSentiment.getSentiment()
      ]);

      let msg = `💼 *Portfolio*\n\n`;
      msg += `💰 SOL Balance: ${portfolio.solBalance.toFixed(4)} SOL\n`;
      msg += `📊 Total Value: $${portfolio.totalValueUSD.toFixed(2)}\n`;

      if (portfolio.performance24h !== undefined) {
        const e = portfolio.performance24h >= 0 ? '📈' : '📉';
        msg += `${e} 24h: ${portfolio.performance24h >= 0 ? '+' : ''}${portfolio.performance24h.toFixed(2)}%\n`;
      }

      msg += `🧠 Market: ${sentiment.emoji} ${sentiment.sentiment}\n`;

      if (portfolio.positions.length > 0) {
        msg += `\n*Positions:*\n`;
        for (const pos of portfolio.positions) {
          msg += `• *${pos.token}*: $${pos.valueUSD.toFixed(2)} @ $${pos.currentPrice.toFixed(6)}\n`;
        }
      } else {
        msg += `\n_No open positions_`;
      }

      await ctx.reply(msg, { parse_mode: 'Markdown' });

      // AI Portfolio advice
      if (process.env.OPENAI_API_KEY) {
        const insight = await aiAnalyst.analyzePortfolio(portfolio.positions, portfolio.solBalance);
        await ctx.reply(
          `🤖 *AI Insights*\n\n${insight.advice}`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch {
      await ctx.reply('❌ Could not fetch portfolio data.');
    }
  }

  // ── CALLBACK QUERY HANDLER ────────────────────────────────────────────────
  setupCallbackHandlers() {
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      await ctx.answerCallbackQuery();

      if (data.startsWith('buy_')) {
        const parts = data.split('_');
        const token = parts[1];
        const amount = parseFloat(parts[2]);
        const taskId = tradeQueue.enqueue({ type: 'BUY', token, amount, denom: 'USD', slippagePct: 1.0 });
        await ctx.reply(`✅ Buying $${amount} of ${token}\nTask: ${taskId}\n\nUse /queue to track status.`);
      } else if (data.startsWith('sell_')) {
        const parts = data.split('_');
        const token = parts[1];
        const taskId = tradeQueue.enqueue({ type: 'SELL', token, amount: 0, denom: 'USD', slippagePct: 1.5 });
        await ctx.reply(`✅ Selling ALL ${token}\nTask: ${taskId}`);
      } else if (data === 'cancel') {
        await ctx.reply('❌ Cancelled.');
      }
    });
  }
}

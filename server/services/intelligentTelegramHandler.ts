import { Bot, Context } from 'grammy';
import { aiAnalyst } from './aiMarketAnalyst';
import { portfolioTracker } from './portfolioTracker';
import { insightsEngine } from './proactiveInsights';
import { tradeQueue } from '../worker/queue';
import { pythPriceService } from './pythPriceFeed';
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
    this.bot.command('start', (ctx) => 
      ctx.reply(
        '🤖 *Jarvis Trading Assistant Online*\n\n' +
        'I\'m your intelligent crypto trading assistant. You can:\n\n' +
        '💬 *Chat naturally* - Just talk to me!\n' +
        '🎤 *Send voice messages* - I understand speech\n' +
        '📊 *Get insights* - I monitor markets 24/7\n' +
        '💰 *Trade smart* - AI-powered decisions\n\n' +
        '*Quick Commands:*\n' +
        '/portfolio - View your holdings\n' +
        '/analyze [TOKEN] - Deep market analysis\n' +
        '/watchlist - Manage your watchlist\n' +
        '/help - Full command list\n\n' +
        'Or just say things like:\n' +
        '• "What should I buy right now?"\n' +
        '• "Analyze SOL for me"\n' +
        '• "Buy $50 of BONK"',
        { parse_mode: 'Markdown' }
      )
    );

    this.bot.command('portfolio', async (ctx) => {
      await this.handlePortfolioCommand(ctx);
    });

    this.bot.command('analyze', async (ctx) => {
      await this.handleAnalyzeCommand(ctx);
    });

    this.bot.command('watchlist', async (ctx) => {
      const watchlist = insightsEngine.getWatchlist();
      ctx.reply(
        `📋 *Your Watchlist*\n\n` +
        watchlist.map(t => `• ${t}`).join('\n') +
        `\n\nI'm monitoring these tokens for opportunities.`,
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.command('help', (ctx) => 
      ctx.reply(
        '📚 *Jarvis Assistant Commands*\n\n' +
        '*Natural Commands (Just talk!)*\n' +
        '• "Buy $50 of SOL"\n' +
        '• "Sell all my BONK"\n' +
        '• "What\'s the price of JUP?"\n' +
        '• "Should I buy SOL now?"\n' +
        '• "How\'s my portfolio doing?"\n\n' +
        '*Slash Commands*\n' +
        '/portfolio - View holdings & performance\n' +
        '/analyze TOKEN - Deep market analysis\n' +
        '/watchlist - View monitored tokens\n' +
        '/prices - Quick price check\n' +
        '/status - System status\n\n' +
        '*Voice Messages*\n' +
        'Just send a voice note - I\'ll understand it!\n\n' +
        'I\'m always learning and improving. Talk to me naturally!',
        { parse_mode: 'Markdown' }
      )
    );

    this.bot.command('prices', async (ctx) => {
      const tokens = ['SOL', 'BONK', 'JUP'];
      let priceText = '💰 *Live Prices*\n\n';
      
      for (const token of tokens) {
        try {
          const price = await pythPriceService.getPrice(token);
          if (price && price.price) {
            priceText += `${token}: $${price.price.toFixed(price.price < 1 ? 6 : 2)}\n`;
          } else {
            priceText += `${token}: Unavailable\n`;
          }
        } catch (e) {
          priceText += `${token}: Unavailable\n`;
        }
      }
      
      ctx.reply(priceText, { parse_mode: 'Markdown' });
    });
  }

  private async handleTextMessage(ctx: Context) {
    if (!ctx.message?.text) return;
    if (ctx.message.text.startsWith('/')) return;

    const userId = ctx.from?.id.toString() || 'default';
    const message = ctx.message.text;

    try {
      await ctx.replyWithChatAction('typing');

      const intent = await aiAnalyst.detectTradingIntent(message);

      if (intent.intent === 'BUY' && intent.token) {
        await this.handleNaturalBuy(ctx, intent.token, intent.amount);
      } else if (intent.intent === 'SELL' && intent.token) {
        await this.handleNaturalSell(ctx, intent.token);
      } else if (intent.intent === 'ANALYZE' && intent.token) {
        await this.handleNaturalAnalyze(ctx, intent.token);
      } else if (intent.intent === 'PORTFOLIO') {
        await this.handlePortfolioCommand(ctx);
      } else {
        const portfolio = await portfolioTracker.getCurrentPortfolio(this.walletAddress);
        const context = {
          balance: portfolio.solBalance,
          positions: portfolio.positions.map(p => ({ token: p.token, value: p.valueUSD }))
        };

        const response = await aiAnalyst.chat(userId, message, context);
        await ctx.reply(response);
      }
    } catch (error) {
      console.error('Message handling error:', error);
      await ctx.reply('I encountered an error processing your message. Please try again.');
    }
  }

  private async handleVoiceMessage(ctx: Context) {
    if (!ctx.message?.voice) return;

    try {
      await ctx.reply('🎤 Processing your voice message...');

      const fileId = ctx.message.voice.file_id;
      const file = await ctx.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `voice-${Date.now()}.ogg`);

      const audioResponse = await fetch(fileUrl);
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      
      fs.writeFileSync(tempFile, audioBuffer);

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile) as any,
        model: 'whisper-1',
      });

      fs.unlinkSync(tempFile);

      const transcribedText = transcription.text;
      
      await ctx.reply(`🎤 You said: "${transcribedText}"\n\nLet me process that...`);

      const tempCtx = {
        ...ctx,
        message: {
          ...ctx.message,
          text: transcribedText
        }
      };

      await this.handleTextMessage(tempCtx as Context);
    } catch (error) {
      console.error('Voice message error:', error);
      await ctx.reply('Sorry, I had trouble processing your voice message. Please try again or type your message.');
    }
  }

  private async handleNaturalBuy(ctx: Context, token: string, amount?: number) {
    try {
      if (!amount) {
        await ctx.reply(`How much ${token} would you like to buy? (e.g., "$50" or "10 SOL")`);
        return;
      }

      const analysis = await aiAnalyst.analyzeMarket(token);
      
      await ctx.reply(
        `🤖 *AI Analysis: ${token}*\n\n` +
        `Recommendation: ${analysis.recommendation}\n` +
        `Confidence: ${analysis.confidence}%\n` +
        `Current Price: $${analysis.currentPrice}\n\n` +
        `${analysis.reasoning.substring(0, 300)}...\n\n` +
        `Proceed with buying $${amount} of ${token}?`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Yes, Buy', callback_data: `buy_${token}_${amount}` },
              { text: '❌ Cancel', callback_data: 'cancel' }
            ]]
          }
        }
      );
    } catch (error) {
      console.error('Natural buy error:', error);
      await ctx.reply(`Error analyzing ${token}. Would you still like to proceed?`);
    }
  }

  private async handleNaturalSell(ctx: Context, token: string) {
    try {
      const analysis = await aiAnalyst.analyzeMarket(token);
      
      await ctx.reply(
        `🤖 *AI Analysis: ${token}*\n\n` +
        `Recommendation: ${analysis.recommendation}\n` +
        `Confidence: ${analysis.confidence}%\n` +
        `Current Price: $${analysis.currentPrice}\n\n` +
        `Should I sell your ${token}?`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Yes, Sell All', callback_data: `sell_${token}_ALL` },
              { text: '❌ Cancel', callback_data: 'cancel' }
            ]]
          }
        }
      );
    } catch (error) {
      console.error('Natural sell error:', error);
      await ctx.reply('Error analyzing the market. Please try again.');
    }
  }

  private async handleNaturalAnalyze(ctx: Context, token: string) {
    try {
      await ctx.replyWithChatAction('typing');
      
      const analysis = await aiAnalyst.analyzeMarket(token);
      
      await ctx.reply(
        `📊 *AI Market Analysis: ${token}*\n\n` +
        `💰 Current Price: $${analysis.currentPrice}\n` +
        `🎯 Recommendation: *${analysis.recommendation}*\n` +
        `📈 Confidence: ${analysis.confidence}%\n\n` +
        `*Analysis:*\n${analysis.reasoning}\n\n` +
        `*Risks:*\n${analysis.risks.map(r => `⚠️ ${r}`).join('\n')}\n\n` +
        `*Opportunities:*\n${analysis.opportunities.map(o => `💡 ${o}`).join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Analyze error:', error);
      await ctx.reply('Failed to analyze market. Please try again.');
    }
  }

  private async handlePortfolioCommand(ctx: Context) {
    try {
      await ctx.replyWithChatAction('typing');
      
      const portfolio = await portfolioTracker.getCurrentPortfolio(this.walletAddress);
      const metrics = await portfolioTracker.getPerformanceMetrics(this.walletAddress);

      let message = `💼 *Your Portfolio*\n\n`;
      message += `💰 Total Value: $${portfolio.totalValueUSD.toFixed(2)}\n`;
      message += `📊 SOL Balance: ${portfolio.solBalance.toFixed(4)} SOL\n`;
      
      if (portfolio.performance24h) {
        const emoji = portfolio.performance24h > 0 ? '📈' : '📉';
        message += `${emoji} 24h Change: ${portfolio.performance24h > 0 ? '+' : ''}${portfolio.performance24h.toFixed(2)}%\n`;
      }
      
      message += `\n*Positions:*\n`;
      
      if (portfolio.positions.length > 0) {
        for (const pos of portfolio.positions) {
          message += `\n${pos.token}:\n`;
          message += `  Amount: ${pos.amount.toFixed(2)}\n`;
          message += `  Value: $${pos.valueUSD.toFixed(2)}\n`;
          message += `  Price: $${pos.currentPrice.toFixed(6)}\n`;
        }
      } else {
        message += `\nNo token positions`;
      }

      if (metrics.topGainer) {
        message += `\n\n🏆 Top Gainer: ${metrics.topGainer.token}`;
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });

      const insight = await aiAnalyst.analyzePortfolio(
        portfolio.positions,
        portfolio.solBalance
      );

      await ctx.reply(
        `🤖 *AI Portfolio Insights*\n\n${insight.advice}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Portfolio command error:', error);
      await ctx.reply('Failed to fetch portfolio data.');
    }
  }

  private async handleAnalyzeCommand(ctx: Context) {
    const text = ctx.message?.text || '';
    const parts = text.split(' ');
    const token = parts[1]?.toUpperCase();

    if (!token) {
      await ctx.reply('Usage: /analyze TOKEN\nExample: /analyze SOL');
      return;
    }

    await this.handleNaturalAnalyze(ctx, token);
  }

  setupCallbackHandlers() {
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;

      if (data.startsWith('buy_')) {
        const [, token, amount] = data.split('_');
        
        const taskId = tradeQueue.enqueue({
          type: 'BUY',
          token,
          amount: parseFloat(amount),
          denom: 'USD',
          slippagePct: 1.0
        });

        await ctx.answerCallbackQuery();
        await ctx.reply(
          `✅ Buy order placed!\n\nToken: ${token}\nAmount: $${amount}\nTask ID: ${taskId}\n\nUse /queue to check status`
        );
      } else if (data.startsWith('sell_')) {
        const [, token] = data.split('_');
        
        const taskId = tradeQueue.enqueue({
          type: 'SELL',
          token,
          amount: 0,
          denom: 'TOKEN',
          slippagePct: 1.0
        });

        await ctx.answerCallbackQuery();
        await ctx.reply(
          `✅ Sell order placed!\n\nToken: ${token}\nAmount: ALL\nTask ID: ${taskId}`
        );
      } else if (data === 'cancel') {
        await ctx.answerCallbackQuery();
        await ctx.reply('❌ Cancelled');
      }
    });
  }
}

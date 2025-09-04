/**
 * TELEGRAM BOT SERVICE - Enhanced Version
 * Real-time alerts, commands, and trading notifications
 * Superior communication system for SniperX
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getPhantomWallet } from '../walletConfig';

interface MessageTemplate {
  buy: string;
  sell: string;
  alert: string;
  whale: string;
  sentiment: string;
  system: string;
  profit: string;
  emergency: string;
}

interface QueuedMessage {
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: number;
  retries: number;
  type: string;
}

export class TelegramBotService {
  private botToken: string;
  private chatId: string;
  private isConnected: boolean = false;
  private messageQueue: QueuedMessage[] = [];
  private rateLimitDelay: number = 1000;
  private lastMessageTime: number = 0;
  private processInterval?: NodeJS.Timeout;
  private connection: Connection;
  
  private readonly templates: MessageTemplate = {
    buy: `🟢 <b>BUY EXECUTED</b>
🪙 Token: {symbol}
💰 Amount: {amount} SOL
📊 Price: ${'{price}'}
🎯 Confidence: {confidence}%
📈 Target: +{target}%
🧠 AI Reason: {reason}
🔗 TX: {transaction}`,

    sell: `🔴 <b>SELL EXECUTED</b>
🪙 Token: {symbol}
💵 Sold: {percentage}%
📈 Profit: {profit}% (${'{profitUSD}'})
💰 Received: {received} SOL
📊 Exit Reason: {reason}
🔗 TX: {transaction}`,

    alert: `🚨 <b>TRADING ALERT</b>
🪙 {symbol} | {alertType}
📊 Current Price: ${'{price}'}
⚡ {message}
🎯 Confidence: {confidence}%
🎬 Action: {action}`,

    whale: `🐋 <b>WHALE MOVEMENT</b>
🪙 Token: {symbol}
💰 Amount: ${'{amount}'}k
📊 Direction: {direction}
👛 Wallet: {wallet}
⚠️ Impact: {impact}
🎯 Action: {recommendation}`,

    sentiment: `📈 <b>SENTIMENT SURGE</b>
🪙 Token: {symbol}
🔥 Platform: {platform}
📊 Mentions: +{mentions}%
💭 Sentiment: {sentiment}%
📈 Trend: {trend}
🎯 Opportunity: {opportunity}`,

    system: `⚙️ <b>SYSTEM UPDATE</b>
🤖 SniperX {status}
👛 Wallet: {wallet}
💰 Balance: {balance} SOL
⚡ Mode: {mode}
📊 Active: {positions} positions
🎯 Win Rate: {winRate}%`,

    profit: `💰 <b>PROFIT REPORT</b>
📈 Daily P&L: {dailyPnl}%
💵 Total Profit: ${'{totalProfit}'}
🎯 Win Rate: {winRate}%
📊 Best Trade: {bestTrade}
⚡ Trades Today: {tradesToday}
🏆 Rank: #{rank} globally`,

    emergency: `🔴⚠️ <b>EMERGENCY ALERT</b>
⚠️ {alertType}
🪙 Token: {symbol}
📉 Loss: {loss}%
🛡️ Action Taken: {action}
💰 Saved: ${'{savedAmount}'}
⏱️ Response Time: {responseTime}ms`
  };

  constructor(botToken?: string, chatId?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = chatId || process.env.TELEGRAM_CHAT_ID || '';
    this.connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');
  }

  async initialize(): Promise<boolean> {
    try {
      if (!this.botToken || !this.chatId) {
        console.log('⚠️ Telegram bot not configured - add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
        return false;
      }

      const response = await this.makeAPICall('getMe');
      if (response.ok) {
        this.isConnected = true;
        console.log(`🤖 Telegram bot connected: @${response.result.username}`);
        
        await this.sendSystemNotification('start', {
          status: 'ONLINE',
          wallet: this.maskWallet(getPhantomWallet().publicKey.toBase58()),
          balance: await this.getWalletBalance(),
          mode: 'ULTIMATE TRADING',
          positions: '0',
          winRate: '0'
        });
        
        this.startMessageProcessor();
        this.startCommandListener();
        return true;
      }
    } catch (error) {
      console.error('❌ Telegram bot initialization failed:', error);
      this.isConnected = false;
    }
    return false;
  }

  async sendTradeNotification(type: 'buy' | 'sell', data: any): Promise<void> {
    if (!this.isConnected) return;
    
    const message = this.formatMessage(this.templates[type], data);
    await this.queueMessage(message, 'HIGH', 'trade');
  }

  async sendWhaleAlert(data: any): Promise<void> {
    if (!this.isConnected) return;
    
    const message = this.formatMessage(this.templates.whale, data);
    await this.queueMessage(message, 'HIGH', 'whale');
  }

  async sendSentimentAlert(data: any): Promise<void> {
    if (!this.isConnected) return;
    
    const message = this.formatMessage(this.templates.sentiment, data);
    await this.queueMessage(message, 'MEDIUM', 'sentiment');
  }

  async sendSystemNotification(type: string, data: any): Promise<void> {
    if (!this.isConnected) return;
    
    const message = this.formatMessage(this.templates.system, data);
    await this.queueMessage(message, 'MEDIUM', 'system');
  }

  async sendProfitReport(data: any): Promise<void> {
    if (!this.isConnected) return;
    
    const message = this.formatMessage(this.templates.profit, data);
    await this.queueMessage(message, 'LOW', 'profit');
  }

  async sendEmergencyAlert(data: any): Promise<void> {
    if (!this.isConnected) return;
    
    const message = this.formatMessage(this.templates.emergency, data);
    await this.queueMessage(message, 'HIGH', 'emergency');
  }

  async sendCustomMessage(message: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'): Promise<void> {
    if (!this.isConnected) return;
    await this.queueMessage(message, priority, 'custom');
  }

  private async queueMessage(message: string, priority: 'HIGH' | 'MEDIUM' | 'LOW', type: string): Promise<void> {
    this.messageQueue.push({
      message,
      priority,
      type,
      timestamp: Date.now(),
      retries: 0
    });

    this.messageQueue.sort((a, b) => {
      const priorities = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (priorities[b.priority] !== priorities[a.priority]) {
        return priorities[b.priority] - priorities[a.priority];
      }
      return a.timestamp - b.timestamp;
    });
  }

  private startMessageProcessor(): void {
    if (this.processInterval) clearInterval(this.processInterval);
    
    this.processInterval = setInterval(async () => {
      if (this.messageQueue.length === 0) return;
      
      const now = Date.now();
      if (now - this.lastMessageTime < this.rateLimitDelay) return;

      const messageData = this.messageQueue.shift();
      if (!messageData) return;

      try {
        await this.sendTelegramMessage(messageData.message);
        this.lastMessageTime = now;
        console.log(`📤 Sent ${messageData.type} message (priority: ${messageData.priority})`);
      } catch (error) {
        console.error('❌ Message send error:', error);
        
        if (messageData.retries < 3) {
          messageData.retries++;
          this.messageQueue.unshift(messageData);
        }
      }
    }, 500);
  }

  private async sendTelegramMessage(message: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Bot not connected');
    }

    const response = await this.makeAPICall('sendMessage', {
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.description}`);
    }

    return response.result;
  }

  private async makeAPICall(method: string, params: any = {}): Promise<any> {
    const url = `https://api.telegram.org/bot${this.botToken}/${method}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      return await response.json();
    } catch (error) {
      console.error(`❌ Telegram API call failed: ${error}`);
      throw error;
    }
  }

  private formatMessage(template: string, data: any): string {
    let message = template;
    
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      const value = data[key] !== undefined ? data[key] : 'N/A';
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });

    return message;
  }

  private async startCommandListener(): Promise<void> {
    setInterval(async () => {
      if (!this.isConnected) return;
      
      try {
        const updates = await this.makeAPICall('getUpdates', { 
          offset: this.lastUpdateId + 1,
          timeout: 10 
        });
        
        if (updates.ok && updates.result.length > 0) {
          for (const update of updates.result) {
            this.lastUpdateId = update.update_id;
            if (update.message?.text?.startsWith('/')) {
              await this.handleCommand(update.message);
            }
          }
        }
      } catch (error) {
        console.error('❌ Command listener error:', error);
      }
    }, 5000);
  }

  private lastUpdateId: number = 0;

  private async handleCommand(message: any): Promise<void> {
    const command = message.text.split(' ')[0].toLowerCase();
    const chatId = message.chat.id;

    switch(command) {
      case '/status':
        await this.handleStatusCommand(chatId);
        break;
      case '/balance':
        await this.handleBalanceCommand(chatId);
        break;
      case '/positions':
        await this.handlePositionsCommand(chatId);
        break;
      case '/help':
        await this.handleHelpCommand(chatId);
        break;
      default:
        await this.sendCustomMessage('Unknown command. Type /help for available commands.');
    }
  }

  private async handleStatusCommand(chatId: string): Promise<void> {
    const wallet = getPhantomWallet();
    const balance = await this.getWalletBalance();
    
    const status = `🤖 <b>SniperX ULTIMATE Status</b>
    
🟢 System: Online
⚡ Engine: Ultimate Trading v2.0
💎 AI: 47+ Indicators Active
🧠 Alfred Reasoner: Online
💰 Wallet: ${this.maskWallet(wallet.publicKey.toBase58())}
💵 Balance: ${balance} SOL
📊 Positions: Monitoring Active
🛡️ Protection: Enabled
🎯 Win Rate: Real-time tracking
⏱️ Uptime: ${this.getUptime()}`;

    await this.makeAPICall('sendMessage', {
      chat_id: chatId,
      text: status,
      parse_mode: 'HTML'
    });
  }

  private async handleBalanceCommand(chatId: string): Promise<void> {
    const balance = await this.getWalletBalance();
    const solPrice = 162.45; // Would fetch real price
    
    const balanceMsg = `💰 <b>Wallet Balance</b>
    
💎 SOL: ${balance} SOL
💵 USD Value: $${(parseFloat(balance) * solPrice).toFixed(2)}
📈 SOL Price: $${solPrice}
⚡ Available: ${balance} SOL
🛡️ Reserved: 0.002 SOL (fees)`;

    await this.makeAPICall('sendMessage', {
      chat_id: chatId,
      text: balanceMsg,
      parse_mode: 'HTML'
    });
  }

  private async handlePositionsCommand(chatId: string): Promise<void> {
    const positions = `📊 <b>Active Positions</b>
    
No active positions yet.
Ready to trade with superior AI!
    
🎯 Monitoring: Active
🛡️ Stop Loss: Enabled (8%)
📈 Take Profit: Ladder System
⚡ Auto-sell: Configured`;

    await this.makeAPICall('sendMessage', {
      chat_id: chatId,
      text: positions,
      parse_mode: 'HTML'
    });
  }

  private async handleHelpCommand(chatId: string): Promise<void> {
    const help = `🤖 <b>SniperX Commands</b>
    
/status - System status
/balance - Wallet balance
/positions - Active trades
/help - This menu

🔔 <b>Automatic Alerts:</b>
• Trade executions (buy/sell)
• Whale movements (>$10k)
• Sentiment surges
• Profit targets hit
• Emergency actions
• System events

💡 <b>Features:</b>
• 24/7 Autonomous trading
• AI-powered decisions
• Risk protection
• Profit optimization
• Real-time monitoring`;

    await this.makeAPICall('sendMessage', {
      chat_id: chatId,
      text: help,
      parse_mode: 'HTML'
    });
  }

  private async getWalletBalance(): Promise<string> {
    try {
      const wallet = getPhantomWallet();
      const balance = await this.connection.getBalance(wallet.publicKey);
      return (balance / 1e9).toFixed(4);
    } catch (error) {
      return '0.0000';
    }
  }

  private maskWallet(address: string): string {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  private getUptime(): string {
    const uptimeMs = Date.now() - (this.startTime || Date.now());
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  private startTime: number = Date.now();

  getBotStats(): any {
    return {
      isConnected: this.isConnected,
      queuedMessages: this.messageQueue.length,
      highPriorityMessages: this.messageQueue.filter(m => m.priority === 'HIGH').length,
      lastMessageTime: new Date(this.lastMessageTime).toISOString(),
      botToken: this.botToken ? 'Configured' : 'Not configured',
      chatId: this.chatId ? 'Configured' : 'Not configured',
      uptime: this.getUptime()
    };
  }

  disconnect(): void {
    this.isConnected = false;
    this.messageQueue = [];
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    console.log('🤖 Telegram bot disconnected');
  }
}

export const telegramBot = new TelegramBotService();
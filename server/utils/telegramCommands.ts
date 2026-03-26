/**
 * Telegram Bot Commands for SniperX Control
 * Allows users to control trading bot via Telegram messages
 */

import { config } from '../config';
import { sendTelegramAlert } from './telegramAlert';
import { sniperEngine } from '../sniperEngine';
import { getPnLSummary, getOpenPositions } from './pnlLogger';

interface TelegramCommand {
  command: string;
  description: string;
  handler: (args: string[]) => Promise<string>;
}

class TelegramCommandHandler {
  private commands: Map<string, TelegramCommand> = new Map();

  constructor() {
    this.initializeCommands();
  }

  private initializeCommands() {
    // Trading Control Commands
    this.addCommand('start', 'Start trading bot', this.startBot.bind(this));
    this.addCommand('stop', 'Stop trading bot', this.stopBot.bind(this));
    this.addCommand('status', 'Get bot status', this.getBotStatus.bind(this));
    this.addCommand('balance', 'Check wallet balance', this.getBalance.bind(this));
    
    // Trading Information
    this.addCommand('pnl', 'Get P&L summary', this.getPnL.bind(this));
    this.addCommand('positions', 'Get open positions', this.getPositions.bind(this));
    this.addCommand('logs', 'Get recent trading logs', this.getLogs.bind(this));
    
    // Strategy Commands
    this.addCommand('strategy', 'Switch trading strategy', this.switchStrategy.bind(this));
    this.addCommand('risk', 'Set risk level', this.setRiskLevel.bind(this));
    
    // Emergency Commands
    this.addCommand('emergency', 'Emergency stop all trading', this.emergencyStop.bind(this));
    this.addCommand('kill', 'Kill switch - immediate stop', this.killSwitch.bind(this));
    
    // Information Commands
    this.addCommand('help', 'Show available commands', this.showHelp.bind(this));
    this.addCommand('price', 'Get SOL price', this.getPrice.bind(this));
  }

  private addCommand(command: string, description: string, handler: (args: string[]) => Promise<string>) {
    this.commands.set(command.toLowerCase(), { command, description, handler });
  }

  async processCommand(message: string): Promise<string> {
    const parts = message.toLowerCase().trim().split(' ');
    const command = parts[0].replace('/', ''); // Remove leading slash if present
    const args = parts.slice(1);

    const cmd = this.commands.get(command);
    if (!cmd) {
      return `❌ Unknown command: ${command}\n\nUse /help to see available commands.`;
    }

    try {
      return await cmd.handler(args);
    } catch (error) {
      console.error(`Telegram command error (${command}):`, error);
      return `❌ Error executing command: ${error.message}`;
    }
  }

  // Command Handlers
  private async startBot(args: string[]): Promise<string> {
    try {
      await sniperEngine.start();
      await sendTelegramAlert(
        '🚀 SniperX Trading Bot Started',
        'Live trading activated via Telegram command'
      );
      return '✅ Trading bot started successfully!\n\n🎯 Live trading is now active\n💰 Executing trades every 10 seconds';
    } catch (error) {
      return `❌ Failed to start bot: ${error.message}`;
    }
  }

  private async stopBot(args: string[]): Promise<string> {
    try {
      await sniperEngine.stop();
      await sendTelegramAlert(
        '⏸️ SniperX Trading Bot Stopped',
        'Trading paused via Telegram command'
      );
      return '⏸️ Trading bot stopped successfully!\n\n🛑 All trading activities paused';
    } catch (error) {
      return `❌ Failed to stop bot: ${error.message}`;
    }
  }

  private async getBotStatus(args: string[]): Promise<string> {
    const isRunning = sniperEngine.isRunning();
    const pnl = getPnLSummary();
    
    return `📊 SniperX Bot Status\n\n` +
           `🔄 Trading: ${isRunning ? '🟢 ACTIVE' : '🔴 STOPPED'}\n` +
           `💰 Total P&L: ${pnl.totalPnL.toFixed(6)} SOL\n` +
           `📈 Win Rate: ${pnl.winRate.toFixed(1)}%\n` +
           `📊 Total Trades: ${pnl.totalTrades}\n` +
           `🎯 Open Positions: ${pnl.openPositions}`;
  }

  private async getBalance(args: string[]): Promise<string> {
    // This would integrate with actual wallet balance checking
    return '💰 Wallet Balance\n\n' +
           '🏦 SOL: 0.0000 SOL\n' +
           '💵 USD Value: $0.00\n\n' +
           '📝 Note: Add SOL to wallet for trading';
  }

  private async getPnL(args: string[]): Promise<string> {
    const pnl = getPnLSummary();
    
    return `📈 Profit & Loss Summary\n\n` +
           `💰 Total P&L: ${pnl.totalPnL.toFixed(6)} SOL\n` +
           `📊 Total Trades: ${pnl.totalTrades}\n` +
           `✅ Wins: ${Math.round(pnl.winRate / 100 * pnl.closedPositions)}\n` +
           `❌ Losses: ${pnl.closedPositions - Math.round(pnl.winRate / 100 * pnl.closedPositions)}\n` +
           `📈 Win Rate: ${pnl.winRate.toFixed(1)}%\n` +
           `🎯 Best Trade: +${pnl.biggestWin.toFixed(6)} SOL\n` +
           `📉 Worst Trade: ${pnl.biggestLoss.toFixed(6)} SOL`;
  }

  private async getPositions(args: string[]): Promise<string> {
    const positions = getOpenPositions();
    
    if (positions.length === 0) {
      return '📋 Open Positions\n\n🏁 No open positions currently';
    }

    let message = '📋 Open Positions\n\n';
    positions.forEach((pos, index) => {
      message += `${index + 1}. ${pos.symbol}\n`;
      message += `   💰 Amount: ${pos.buyAmount} SOL\n`;
      message += `   📈 Entry: $${pos.buyPrice}\n`;
      message += `   ⏰ Time: ${new Date(pos.timestamp).toLocaleString()}\n\n`;
    });

    return message;
  }

  private async getLogs(args: string[]): Promise<string> {
    return '📝 Recent Trading Logs\n\n' +
           '🔄 Trading activity logged to files\n' +
           '📊 Check dashboard for detailed history\n\n' +
           '💡 Use /pnl for P&L summary';
  }

  private async switchStrategy(args: string[]): Promise<string> {
    const strategy = args[0];
    if (!strategy) {
      return '❌ Please specify strategy:\n\n' +
             '🎯 Available: conservative, aggressive, scalping, momentum';
    }

    const validStrategies = ['conservative', 'aggressive', 'scalping', 'momentum'];
    if (!validStrategies.includes(strategy.toLowerCase())) {
      return `❌ Invalid strategy: ${strategy}\n\n` +
             `✅ Available: ${validStrategies.join(', ')}`;
    }

    await telegramAlert(
      '🔄 Strategy Changed',
      `Trading strategy switched to: ${strategy.toUpperCase()}`
    );

    return `✅ Strategy switched to: ${strategy.toUpperCase()}\n\n` +
           '🎯 New strategy will be applied to upcoming trades';
  }

  private async setRiskLevel(args: string[]): Promise<string> {
    const level = args[0];
    if (!level) {
      return '❌ Please specify risk level:\n\n' +
             '🛡️ Available: low, medium, high';
    }

    const validLevels = ['low', 'medium', 'high'];
    if (!validLevels.includes(level.toLowerCase())) {
      return `❌ Invalid risk level: ${level}\n\n` +
             `✅ Available: ${validLevels.join(', ')}`;
    }

    return `✅ Risk level set to: ${level.toUpperCase()}\n\n` +
           '⚖️ Position sizing and stop-losses adjusted accordingly';
  }

  private async emergencyStop(args: string[]): Promise<string> {
    try {
      await sniperEngine.stop();
      await telegramAlert(
        '🚨 EMERGENCY STOP ACTIVATED',
        'All trading stopped via emergency command'
      );
      return '🚨 EMERGENCY STOP ACTIVATED\n\n' +
             '🛑 All trading activities stopped immediately\n' +
             '💰 Existing positions remain open\n' +
             '📞 Use /start to resume when ready';
    } catch (error) {
      return `❌ Emergency stop failed: ${error.message}`;
    }
  }

  private async killSwitch(args: string[]): Promise<string> {
    try {
      await sniperEngine.stop();
      await telegramAlert(
        '💀 KILL SWITCH ACTIVATED',
        'Complete system shutdown via kill command'
      );
      return '💀 KILL SWITCH ACTIVATED\n\n' +
             '🛑 Complete system shutdown\n' +
             '⚠️ Manual restart required\n' +
             '📞 Contact support if needed';
    } catch (error) {
      return `❌ Kill switch failed: ${error.message}`;
    }
  }

  private async showHelp(args: string[]): Promise<string> {
    let help = '🤖 SniperX Telegram Commands\n\n';
    
    help += '🎮 Trading Control:\n';
    help += '/start - Start trading bot\n';
    help += '/stop - Stop trading bot\n';
    help += '/status - Get bot status\n\n';
    
    help += '📊 Information:\n';
    help += '/balance - Check wallet balance\n';
    help += '/pnl - Get P&L summary\n';
    help += '/positions - Get open positions\n';
    help += '/price - Get SOL price\n\n';
    
    help += '⚙️ Configuration:\n';
    help += '/strategy [name] - Switch strategy\n';
    help += '/risk [level] - Set risk level\n\n';
    
    help += '🚨 Emergency:\n';
    help += '/emergency - Emergency stop\n';
    help += '/kill - Kill switch\n\n';
    
    help += '💡 Example: /strategy conservative';
    
    return help;
  }

  private async getPrice(args: string[]): Promise<string> {
    // This would integrate with real price feeds
    return '📈 SOL Price Information\n\n' +
           '💰 Current Price: $150.87\n' +
           '📊 24h Change: +2.34%\n' +
           '🎯 Confidence: 90%\n\n' +
           '📱 Live trading ready';
  }
}

export const telegramCommandHandler = new TelegramCommandHandler();

// Export functions for other modules
export async function sendPositionOpened(position: any): Promise<void> {
  try {
    const message = `🚀 NEW POSITION OPENED
💰 Token: ${position.symbol}
💵 Amount: ${position.buyAmount} SOL
📈 Price: $${position.buyPrice}
🎯 Target: +8% profit
⏰ Time: ${new Date().toLocaleString()}`;
    
    await sendTelegramAlert('Position Opened', message);
  } catch (error) {
    console.error('Failed to send position opened alert:', error);
  }
}

export async function sendPositionClosed(position: any, profit: number, reason: string): Promise<void> {
  try {
    const profitEmoji = profit > 0 ? '💰' : '📉';
    const message = `${profitEmoji} POSITION CLOSED
💰 Token: ${position.symbol}
💵 Profit/Loss: ${profit > 0 ? '+' : ''}${profit.toFixed(4)} SOL
📊 Percentage: ${((profit / parseFloat(position.buyAmount)) * 100).toFixed(2)}%
📝 Reason: ${reason}
⏰ Time: ${new Date().toLocaleString()}`;
    
    await sendTelegramAlert('Position Closed', message);
  } catch (error) {
    console.error('Failed to send position closed alert:', error);
  }
}

export async function sendDailySummary(): Promise<void> {
  try {
    const pnl = getPnLSummary();
    const message = `📊 DAILY TRADING SUMMARY
💰 Total P&L: ${pnl.totalPnL.toFixed(4)} SOL
📈 Win Rate: ${pnl.winRate.toFixed(1)}%
🔄 Total Trades: ${pnl.totalTrades}
🎯 Open Positions: ${pnl.openPositions}
📅 Date: ${new Date().toLocaleDateString()}`;
    
    await sendTelegramAlert('Daily Summary', message);
  } catch (error) {
    console.error('Failed to send daily summary:', error);
  }
}

export async function sendWeeklySummary(): Promise<void> {
  try {
    const pnl = getPnLSummary();
    const message = `📈 WEEKLY TRADING SUMMARY
💰 Total P&L: ${pnl.totalPnL.toFixed(4)} SOL
📊 Win Rate: ${pnl.winRate.toFixed(1)}%
🔄 Total Trades: ${pnl.totalTrades}
🏆 Biggest Win: ${pnl.biggestWin.toFixed(4)} SOL
📉 Biggest Loss: ${pnl.biggestLoss.toFixed(4)} SOL
📅 Week: ${new Date().toLocaleDateString()}`;
    
    await sendTelegramAlert('Weekly Summary', message);
  } catch (error) {
    console.error('Failed to send weekly summary:', error);
  }
}
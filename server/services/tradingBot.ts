import { storage } from '../storage';
import { tokenScanner } from './tokenScanner';
import { WebSocketMessage } from '../routes';

export class TradingBot {
  private isActive = false;
  private userId: number;
  private settings: any = null;
  private snipeCount = 0;
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;

  constructor(userId: number) {
    this.userId = userId;
    this.loadSettings();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  private async loadSettings() {
    this.settings = await storage.getBotSettings(this.userId);
    if (this.settings) {
      this.isActive = this.settings.isActive;
    }
  }

  async toggleBot(active: boolean) {
    this.isActive = active;
    
    if (this.settings) {
      await storage.updateBotSettings(this.userId, { isActive: active });
    }

    // Broadcast status update
    this.broadcastStatus();
    
    if (active) {
      console.log(`Trading bot activated for user ${this.userId}`);
      this.startTrading();
    } else {
      console.log(`Trading bot paused for user ${this.userId}`);
    }
  }

  private async startTrading() {
    if (!this.isActive || !this.settings) return;

    // In a real implementation, this would monitor DEX APIs and execute trades
    // For demo purposes, we'll simulate trading activity
    this.simulateTrading();
  }

  private async simulateTrading() {
    if (!this.isActive) return;

    // Simulate finding profitable trades occasionally
    if (Math.random() < 0.1) { // 10% chance every check
      await this.executeSimulatedTrade();
    }

    // Check again in 30 seconds
    setTimeout(() => {
      this.simulateTrading();
    }, 30000);
  }

  private async executeSimulatedTrade() {
    if (!this.settings) return;

    const tokens = await tokenScanner.getAllTokens();
    const viableTokens = tokens.filter(token => 
      !token.isHoneypot && 
      token.isLpLocked && 
      parseFloat(token.volume24h || '0') > parseFloat(this.settings.minLiquidity)
    );

    if (viableTokens.length === 0) return;

    const selectedToken = viableTokens[Math.floor(Math.random() * viableTokens.length)];
    
    // Create buy order
    const trade = await storage.createTrade({
      userId: this.userId,
      tokenSymbol: selectedToken.symbol,
      tokenAddress: selectedToken.address,
      type: 'BUY',
      amount: this.settings.autoBuyAmount,
      price: selectedToken.priceUsd,
    });

    this.snipeCount++;

    // Simulate trade completion after a few seconds
    setTimeout(async () => {
      const profitMultiplier = Math.random() * 2; // 0-200% gain/loss
      const profitPercentage = (profitMultiplier - 1) * 100;
      
      await storage.updateTrade(trade.id, {
        status: 'COMPLETED',
        profitPercentage: profitPercentage.toString(),
        profitLoss: (parseFloat(this.settings.autoBuyAmount) * profitMultiplier).toString(),
        txHash: this.generateTxHash(),
      });

      // Broadcast successful trade
      this.websocketBroadcast?.({
        type: 'NEW_TRADE',
        data: {
          tokenSymbol: selectedToken.symbol,
          type: 'BUY',
          amount: this.settings.autoBuyAmount,
          profitPercentage: profitPercentage.toFixed(1),
        }
      });

      // Send notification
      this.websocketBroadcast?.({
        type: 'NOTIFICATION',
        data: {
          id: Date.now().toString(),
          type: profitPercentage > 0 ? 'success' : 'warning',
          title: `${selectedToken.symbol} trade completed!`,
          message: `${profitPercentage > 0 ? 'Profit' : 'Loss'}: ${profitPercentage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          autoHide: true,
        }
      });

      // Check if we should auto-sell based on take profit levels
      if (profitPercentage > 0) {
        const takeProfitLevels = this.settings.takeProfitLevels || [3, 5, 10];
        const profitMultiplierPercent = profitPercentage / 100 + 1; // Convert to multiplier
        
        const hitTakeProfit = takeProfitLevels.some(level => 
          profitMultiplierPercent >= level * 0.01 * 100 // Convert level to multiplier
        );

        if (hitTakeProfit) {
          // Create auto-sell order
          setTimeout(async () => {
            const sellTrade = await storage.createTrade({
              userId: this.userId,
              tokenSymbol: selectedToken.symbol,
              tokenAddress: selectedToken.address,
              type: 'SELL',
              amount: this.settings.autoBuyAmount,
              price: (parseFloat(selectedToken.priceUsd) * profitMultiplierPercent).toString(),
            });

            await storage.updateTrade(sellTrade.id, {
              status: 'COMPLETED',
              txHash: this.generateTxHash(),
            });

            this.websocketBroadcast?.({
              type: 'NOTIFICATION',
              data: {
                id: Date.now().toString(),
                type: 'success',
                title: `Auto-sell executed!`,
                message: `${selectedToken.symbol} sold at ${profitPercentage.toFixed(1)}% profit`,
                timestamp: new Date().toISOString(),
                autoHide: true,
              }
            });
          }, 5000);
        }
      }
    }, 3000);
  }

  async snipeToken(tokenAddress: string) {
    if (!this.settings) {
      throw new Error('Bot settings not configured');
    }

    const token = await storage.getTokenData(tokenAddress);
    if (!token) {
      throw new Error('Token not found');
    }

    // Validate token against filters
    if (this.settings.enableHoneypotFilter && token.isHoneypot) {
      throw new Error('Token flagged as honeypot');
    }

    if (this.settings.enableLpLockFilter && !token.isLpLocked) {
      throw new Error('Token liquidity not locked');
    }

    if (this.settings.enableRenounceFilter && !token.isRenounced) {
      throw new Error('Token ownership not renounced');
    }

    // Create trade order
    const trade = await storage.createTrade({
      userId: this.userId,
      tokenSymbol: token.symbol,
      tokenAddress: token.address,
      type: 'BUY',
      amount: this.settings.autoBuyAmount,
      price: token.priceUsd,
    });

    this.snipeCount++;

    // Simulate execution
    setTimeout(async () => {
      await storage.updateTrade(trade.id, {
        status: 'COMPLETED',
        txHash: this.generateTxHash(),
      });
    }, 2000);

    return trade;
  }

  private generateTxHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private broadcastStatus() {
    this.websocketBroadcast?.({
      type: 'BOT_STATUS',
      data: {
        isActive: this.isActive,
        tokensScanned: tokenScanner.getScannedCount(),
        snipesToday: this.snipeCount,
        status: this.isActive ? 'ACTIVE' : 'PAUSED',
      }
    });
  }

  getStatus() {
    return {
      isActive: this.isActive,
      tokensScanned: tokenScanner.getScannedCount(),
      snipesToday: this.snipeCount,
      status: this.isActive ? 'ACTIVE' : 'PAUSED',
    };
  }

  async updateSettings(newSettings: any) {
    if (this.settings) {
      const updated = await storage.updateBotSettings(this.userId, newSettings);
      this.settings = updated;
      if (newSettings.isActive !== undefined) {
        this.isActive = newSettings.isActive;
      }
    }
    return this.settings;
  }
}

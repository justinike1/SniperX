import { aiAnalyst } from './aiMarketAnalyst';
import { pythPriceService } from './pythPriceFeed';
import { sendTelegramAlert } from '../utils/telegramAlert';

interface PriceAlert {
  token: string;
  targetPrice: number;
  condition: 'above' | 'below';
  triggered: boolean;
}

interface MarketOpportunity {
  token: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  timestamp: number;
}

export class ProactiveInsightsEngine {
  private priceAlerts: Map<string, PriceAlert[]> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private lastPrices: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN = 60 * 60 * 1000;
  private readonly SIGNIFICANT_CHANGE_PCT = 5; // 5% price change triggers AI
  private monitoringInterval: NodeJS.Timeout | null = null;
  private watchlist: string[] = ['SOL', 'BONK', 'JUP'];

  async startMonitoring() {
    console.log('🔍 Proactive Insights Engine activated');
    console.log('💡 Smart monitoring: AI analysis only when significant price movements detected');
    
    // Check markets every 5 minutes, but only use AI on significant movements
    this.monitoringInterval = setInterval(async () => {
      await this.scanMarkets();
    }, 5 * 60 * 1000);

    // Initial scan without AI
    await this.quickPriceCheck();
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async scanMarkets() {
    try {
      // Check prices for all tokens and detect significant movements
      for (const token of this.watchlist) {
        await this.checkPriceAlerts(token);
        
        // Check for significant price movement
        const hasSignificantMove = await this.detectSignificantPriceMovement(token);
        
        if (hasSignificantMove) {
          console.log(`📊 Significant price movement detected for ${token} - running AI analysis`);
          const opportunity = await this.detectOpportunity(token);
          
          if (opportunity) {
            await this.notifyOpportunity(opportunity);
          }
        }
      }
    } catch (error) {
      console.error('Market scanning error:', error);
    }
  }

  private async detectSignificantPriceMovement(token: string): Promise<boolean> {
    try {
      const priceData = await pythPriceService.getPrice(token);
      const currentPrice = priceData.price;
      const lastPrice = this.lastPrices.get(token);

      // Update last price
      this.lastPrices.set(token, currentPrice);

      if (!lastPrice) {
        // First time checking this token
        return false;
      }

      const changePercent = Math.abs(((currentPrice - lastPrice) / lastPrice) * 100);
      
      if (changePercent >= this.SIGNIFICANT_CHANGE_PCT) {
        const direction = currentPrice > lastPrice ? 'up' : 'down';
        console.log(`🚨 ${token} moved ${changePercent.toFixed(2)}% ${direction} (${lastPrice} → ${currentPrice})`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error detecting price movement for ${token}:`, error);
      return false;
    }
  }

  private async quickPriceCheck() {
    // Check all price alerts without AI analysis
    for (const token of this.watchlist) {
      await this.checkPriceAlerts(token);
    }
  }

  async detectOpportunity(token: string): Promise<MarketOpportunity | null> {
    try {
      const lastAlert = this.lastAlertTime.get(token) || 0;
      const now = Date.now();

      if (now - lastAlert < this.ALERT_COOLDOWN) {
        return null;
      }

      const analysis = await aiAnalyst.analyzeMarket(token, 'Quick opportunity scan');

      if (analysis.recommendation === 'BUY' && analysis.confidence > 75) {
        this.lastAlertTime.set(token, now);
        
        return {
          token,
          reason: `${token} showing strong buy signal (${analysis.confidence}% confidence)`,
          urgency: analysis.confidence > 85 ? 'high' : 'medium',
          timestamp: now
        };
      }

      if (analysis.recommendation === 'SELL' && analysis.confidence > 80) {
        this.lastAlertTime.set(token, now);
        
        return {
          token,
          reason: `Consider taking profits on ${token} (${analysis.confidence}% confidence)`,
          urgency: 'medium',
          timestamp: now
        };
      }

      return null;
    } catch (error) {
      console.error(`Opportunity detection error for ${token}:`, error);
      return null;
    }
  }

  private async notifyOpportunity(opportunity: MarketOpportunity) {
    const urgencyEmoji = {
      high: '🚨',
      medium: '💡',
      low: 'ℹ️'
    };

    const message = `${urgencyEmoji[opportunity.urgency]} MARKET INSIGHT

${opportunity.reason}

Would you like me to analyze ${opportunity.token} in detail?`;

    await sendTelegramAlert(message);
  }

  addPriceAlert(token: string, targetPrice: number, condition: 'above' | 'below') {
    if (!this.priceAlerts.has(token)) {
      this.priceAlerts.set(token, []);
    }

    this.priceAlerts.get(token)!.push({
      token,
      targetPrice,
      condition,
      triggered: false
    });

    if (!this.watchlist.includes(token)) {
      this.watchlist.push(token);
    }
  }

  private async checkPriceAlerts(token: string) {
    const alerts = this.priceAlerts.get(token);
    if (!alerts || alerts.length === 0) return;

    try {
      const priceData = await pythPriceService.getPrice(token);
      const currentPrice = priceData.price;

      for (const alert of alerts) {
        if (alert.triggered) continue;

        const shouldTrigger = 
          (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'below' && currentPrice <= alert.targetPrice);

        if (shouldTrigger) {
          alert.triggered = true;
          
          await sendTelegramAlert(
            `🎯 PRICE ALERT: ${token}\n\n` +
            `${token} is now ${alert.condition} $${alert.targetPrice}\n` +
            `Current price: $${currentPrice}\n\n` +
            `What would you like to do?`
          );
        }
      }

      this.priceAlerts.set(
        token,
        alerts.filter(a => !a.triggered)
      );
    } catch (error) {
      console.error(`Price alert check error for ${token}:`, error);
    }
  }

  addToWatchlist(token: string) {
    if (!this.watchlist.includes(token)) {
      this.watchlist.push(token);
    }
  }

  removeFromWatchlist(token: string) {
    this.watchlist = this.watchlist.filter(t => t !== token);
  }

  getWatchlist(): string[] {
    return [...this.watchlist];
  }
}

export const insightsEngine = new ProactiveInsightsEngine();

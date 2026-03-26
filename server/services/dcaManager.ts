import { sendTelegramAlert } from '../utils/telegramBotEnhanced';
import { tradeQueue } from '../worker/queue';

export interface DcaOrder {
  id: string;
  token: string;
  amountUSD: number;
  intervalMs: number;
  intervalLabel: string;
  nextExecuteAt: number;
  totalExecuted: number;
  totalSpentUSD: number;
  active: boolean;
  createdAt: number;
}

const INTERVALS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  'daily': 24 * 60 * 60 * 1000,
  'weekly': 7 * 24 * 60 * 60 * 1000,
};

class DcaManager {
  private orders: Map<string, DcaOrder> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.processOrders(), 60000); // check every minute
    console.log('💰 DCA Manager active');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  createOrder(token: string, amountUSD: number, interval: string): DcaOrder | null {
    const intervalMs = INTERVALS[interval.toLowerCase()];
    if (!intervalMs) return null;

    const id = `dca_${Date.now()}_${token}`;
    const order: DcaOrder = {
      id,
      token: token.toUpperCase(),
      amountUSD,
      intervalMs,
      intervalLabel: interval,
      nextExecuteAt: Date.now() + intervalMs,
      totalExecuted: 0,
      totalSpentUSD: 0,
      active: true,
      createdAt: Date.now()
    };

    this.orders.set(id, order);
    console.log(`📅 DCA order created: Buy $${amountUSD} of ${token} every ${interval}`);
    return order;
  }

  cancelOrder(id: string): boolean {
    const order = this.orders.get(id);
    if (!order) return false;
    order.active = false;
    this.orders.delete(id);
    return true;
  }

  cancelAllForToken(token: string): number {
    let cancelled = 0;
    for (const [id, order] of this.orders) {
      if (order.token === token.toUpperCase()) {
        this.orders.delete(id);
        cancelled++;
      }
    }
    return cancelled;
  }

  getOrders(): DcaOrder[] {
    return Array.from(this.orders.values()).filter(o => o.active);
  }

  formatOrders(): string {
    const active = this.getOrders();
    if (!active.length) return '📭 No active DCA orders\n\nUse /dca SOL 10 daily to start';

    let msg = '📅 *Active DCA Orders*\n\n';
    for (const order of active) {
      const nextIn = Math.floor((order.nextExecuteAt - Date.now()) / 60000);
      const nextLabel = nextIn > 60 ? `${Math.floor(nextIn / 60)}h` : `${nextIn}m`;
      msg += `• *${order.token}* - $${order.amountUSD} every ${order.intervalLabel}\n`;
      msg += `  ⏰ Next in ${nextLabel} | Executed: ${order.totalExecuted}x\n`;
      msg += `  💸 Total spent: $${order.totalSpentUSD.toFixed(2)}\n\n`;
    }

    return msg;
  }

  private async processOrders() {
    const now = Date.now();
    for (const order of this.getOrders()) {
      if (now >= order.nextExecuteAt) {
        await this.executeDca(order);
      }
    }
  }

  private async executeDca(order: DcaOrder) {
    order.nextExecuteAt = Date.now() + order.intervalMs;
    order.totalExecuted++;
    order.totalSpentUSD += order.amountUSD;

    tradeQueue.enqueue({
      type: 'BUY',
      token: order.token,
      amount: order.amountUSD,
      denom: 'USD',
      slippagePct: 1.0
    });

    await sendTelegramAlert(
      `📅 *DCA EXECUTED*\n\n` +
      `Token: ${order.token}\n` +
      `Amount: $${order.amountUSD}\n` +
      `Order #${order.totalExecuted} | Total: $${order.totalSpentUSD.toFixed(2)}\n` +
      `⏰ Next: ${order.intervalLabel}`
    );
  }
}

export const dcaManager = new DcaManager();
export { INTERVALS as DCA_INTERVALS };

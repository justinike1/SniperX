import { sendTelegramAlert } from '../utils/telegramBotEnhanced';
import { tradeQueue } from '../worker/queue';

export interface Position {
  id: string;
  token: string;
  tokenMint: string;
  entryPrice: number;
  entryUSD: number;
  entryTime: number;
  takeProfitPct: number;   // e.g. 20 = 20% profit target
  stopLossPct: number;     // e.g. 10 = 10% loss limit
  trailingStop: boolean;   // Trail the stop loss up with price
  trailingPct: number;     // How far below peak to trail
  highWatermark: number;   // Highest price reached
  active: boolean;
}

class AutoTpSlManager {
  private positions: Map<string, Position> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  startMonitoring() {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.checkAllPositions(), 15000); // every 15s
    console.log('🛡️ Auto TP/SL Manager active');
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  addPosition(params: {
    token: string;
    tokenMint: string;
    entryPrice: number;
    entryUSD: number;
    takeProfitPct?: number;
    stopLossPct?: number;
    trailingStop?: boolean;
    trailingPct?: number;
  }): string {
    const id = `pos_${Date.now()}_${params.token}`;
    const position: Position = {
      id,
      token: params.token,
      tokenMint: params.tokenMint,
      entryPrice: params.entryPrice,
      entryUSD: params.entryUSD,
      entryTime: Date.now(),
      takeProfitPct: params.takeProfitPct ?? 20,
      stopLossPct: params.stopLossPct ?? 10,
      trailingStop: params.trailingStop ?? false,
      trailingPct: params.trailingPct ?? 5,
      highWatermark: params.entryPrice,
      active: true
    };

    this.positions.set(id, position);
    console.log(`📍 Position added: ${params.token} @ $${params.entryPrice} | TP: +${params.takeProfitPct}% | SL: -${params.stopLossPct}%`);
    return id;
  }

  removePosition(id: string) {
    this.positions.delete(id);
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values()).filter(p => p.active);
  }

  formatPositions(): string {
    const active = this.getPositions();
    if (!active.length) return '📭 No active positions being tracked';

    let msg = '📍 *Active Positions*\n\n';
    for (const pos of active) {
      const elapsed = Math.floor((Date.now() - pos.entryTime) / 60000);
      msg += `• *${pos.token}* @ $${pos.entryPrice.toFixed(6)}\n`;
      msg += `  🎯 TP: +${pos.takeProfitPct}% | 🛑 SL: -${pos.stopLossPct}%\n`;
      msg += `  ⏰ ${elapsed}m ago | $${pos.entryUSD}\n`;
      if (pos.trailingStop) msg += `  📐 Trailing: ${pos.trailingPct}%\n`;
      msg += '\n';
    }

    return msg;
  }

  private async checkAllPositions() {
    const active = this.getPositions();
    if (!active.length) return;

    for (const position of active) {
      try {
        await this.checkPosition(position);
      } catch (error) {
        console.error(`TP/SL check error for ${position.token}:`, error);
      }
    }
  }

  private async checkPosition(position: Position) {
    const currentPrice = await this.fetchCurrentPrice(position.token);
    if (!currentPrice || currentPrice <= 0) return;

    // Update high watermark for trailing stop
    if (currentPrice > position.highWatermark) {
      position.highWatermark = currentPrice;
    }

    const changePct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    // Check take profit
    if (changePct >= position.takeProfitPct) {
      await this.triggerExit(position, currentPrice, 'TAKE_PROFIT', changePct);
      return;
    }

    // Check trailing stop (if enabled)
    if (position.trailingStop) {
      const dropFromPeak = ((position.highWatermark - currentPrice) / position.highWatermark) * 100;
      if (dropFromPeak >= position.trailingPct && changePct > 0) {
        await this.triggerExit(position, currentPrice, 'TRAILING_STOP', changePct);
        return;
      }
    }

    // Check stop loss
    if (changePct <= -position.stopLossPct) {
      await this.triggerExit(position, currentPrice, 'STOP_LOSS', changePct);
      return;
    }
  }

  private async triggerExit(position: Position, currentPrice: number, reason: string, changePct: number) {
    position.active = false;
    this.positions.delete(position.id);

    const isProfit = changePct > 0;
    const emoji = isProfit ? '✅' : '🛑';
    const pnlSign = isProfit ? '+' : '';
    const pnlUSD = (position.entryUSD * changePct / 100).toFixed(2);

    await sendTelegramAlert(
      `${emoji} *AUTO EXIT - ${reason.replace('_', ' ')}*\n\n` +
      `Token: ${position.token}\n` +
      `Entry: $${position.entryPrice.toFixed(6)}\n` +
      `Exit: $${currentPrice.toFixed(6)}\n` +
      `P&L: ${pnlSign}${changePct.toFixed(2)}% (${pnlSign}$${pnlUSD})\n\n` +
      `⚡ Executing sell order...`
    );

    tradeQueue.enqueue({
      type: 'SELL',
      token: position.token,
      amount: 0,
      denom: 'USD',
      slippagePct: 1.5
    });
  }

  private async fetchCurrentPrice(token: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${token}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!response.ok) return null;
      const data = await response.json() as any;
      const pair = (data.pairs || [])
        .filter((p: any) => p.chainId === 'solana' && p.baseToken?.symbol?.toUpperCase() === token.toUpperCase())
        .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      return pair ? parseFloat(pair.priceUsd || '0') : null;
    } catch {
      return null;
    }
  }
}

export const tpSlManager = new AutoTpSlManager();

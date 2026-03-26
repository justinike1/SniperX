import { marketScanner } from "./marketScanner";
import { executionEngine } from "./executionEngine";
import { portfolioManager } from "./portfolioManager";
import { tradeJournal } from "./tradeJournal";
import { riskManager } from "./riskManager";
import { sendTelegramAlert } from "../utils/telegramBotEnhanced";

interface ExitRuleState {
  takeProfitPct: number;
  stopLossPct: number;
  trailingStopActivationPct: number;
  trailingGapPct: number;
  maxHoldMs: number;
}

interface ExitDecision {
  shouldExit: boolean;
  reason: string;
  realizedPct: number;
}

class LivePositionManager {
  private monitor: NodeJS.Timeout | null = null;
  private readonly rules: ExitRuleState = {
    takeProfitPct: 14,
    stopLossPct: 6,
    trailingStopActivationPct: 4,
    trailingGapPct: 3,
    maxHoldMs: 6 * 60 * 60_000,
  };

  start(): void {
    if (this.monitor) return;
    this.monitor = setInterval(() => this.tick(), 20_000);
    console.log("[live-exit] monitor started");
  }

  stop(): void {
    if (!this.monitor) return;
    clearInterval(this.monitor);
    this.monitor = null;
  }

  async forceSellByMint(mint: string, fraction = 1, reason = "MANUAL_SELL"): Promise<{
    success: boolean;
    reason?: string;
    txHash?: string;
    realizedPnlUSD?: number;
  }> {
    const position = portfolioManager.getOpenPositionByMint(mint);
    if (!position) return { success: false, reason: "NO_OPEN_POSITION" };
    if (fraction <= 0 || fraction > 1) return { success: false, reason: "INVALID_FRACTION" };

    const amountTokens = position.quantity * fraction;
    if (amountTokens <= 0) return { success: false, reason: "ZERO_POSITION_QTY" };

    const mark = await marketScanner.fetchPriceByMint(position.mint);
    const sell = await executionEngine.sell(position.mint, amountTokens);
    if (!sell.success) {
      return { success: false, reason: sell.error || "SELL_EXEC_FAILED" };
    }

    const exitPrice = mark > 0 ? mark : position.currentPriceUSD || position.entryPriceUSD;
    const costBasis = position.entryPriceUSD * amountTokens;
    const proceeds = exitPrice * amountTokens;
    const realizedPnlUSD = proceeds - costBasis;

    portfolioManager.recordExit(position.mint, fraction, realizedPnlUSD);
    await portfolioManager.refreshSnapshot();

    if (position.journalId) {
      tradeJournal.updateAnalytics(position.journalId, { exitReason: reason });
      const entry = tradeJournal.getById(position.journalId);
      if (fraction >= 0.999) {
        const closed = tradeJournal.close(position.journalId, exitPrice, reason, {
          success: true,
          txHash: sell.txHash,
          inputAmount: sell.inputAmount,
          outputAmount: sell.outputAmount,
          priceImpact: sell.priceImpact,
          fee: sell.fee,
          attempts: sell.attempts,
          timestamp: sell.timestamp,
        });
        if (closed) {
          riskManager.onTradeClose(closed.id, closed.pnlUSD || 0, closed.pnlPct || 0);
        }
      } else if (entry) {
        const pnlPct = entry.sizeUSD > 0 ? (realizedPnlUSD / entry.sizeUSD) * 100 : 0;
        entry.notes +=
          `\nPartial exit ${reason}: ${(fraction * 100).toFixed(1)}%` +
          ` | realized ${realizedPnlUSD >= 0 ? "+" : ""}$${realizedPnlUSD.toFixed(2)}`;
        riskManager.onTradeClose(entry.id, realizedPnlUSD, pnlPct);
      }
    }

    await sendTelegramAlert(
      `Live exit ${reason}\n${position.token} ${fraction >= 0.999 ? "full" : "partial"} close\n` +
        `P&L: ${realizedPnlUSD >= 0 ? "+" : ""}$${realizedPnlUSD.toFixed(2)}\n` +
        `tx: ${sell.txHash || "n/a"}`
    );

    return {
      success: true,
      txHash: sell.txHash,
      realizedPnlUSD,
    };
  }

  private async tick(): Promise<void> {
    const open = portfolioManager.getOpenPositions();
    if (!open.length) return;

    for (const pos of open) {
      try {
        const price = await marketScanner.fetchPriceByMint(pos.mint);
        if (!price || price <= 0) continue;

        const pnlPct = ((price - pos.entryPriceUSD) / pos.entryPriceUSD) * 100;
        const highWatermarkDropPct =
          pos.highWatermarkPriceUSD > 0
            ? ((pos.highWatermarkPriceUSD - price) / pos.highWatermarkPriceUSD) * 100
            : 0;
        const heldMs = Date.now() - pos.entryTime;

        const decision = this.evaluateExit({
          pnlPct,
          highWatermarkDropPct,
          heldMs,
        });
        if (!decision.shouldExit) continue;

        await this.forceSellByMint(pos.mint, 1, decision.reason);
      } catch (error) {
        console.error("[live-exit] tick error", error);
      }
    }
  }

  private evaluateExit(params: {
    pnlPct: number;
    highWatermarkDropPct: number;
    heldMs: number;
  }): ExitDecision {
    if (params.pnlPct >= this.rules.takeProfitPct) {
      return {
        shouldExit: true,
        reason: "TAKE_PROFIT",
        realizedPct: params.pnlPct,
      };
    }
    if (params.pnlPct <= -this.rules.stopLossPct) {
      return {
        shouldExit: true,
        reason: "STOP_LOSS",
        realizedPct: params.pnlPct,
      };
    }
    if (
      params.pnlPct >= this.rules.trailingStopActivationPct &&
      params.highWatermarkDropPct >= this.rules.trailingGapPct
    ) {
      return {
        shouldExit: true,
        reason: "TRAILING_STOP",
        realizedPct: params.pnlPct,
      };
    }
    if (params.heldMs >= this.rules.maxHoldMs && params.pnlPct < 2) {
      return {
        shouldExit: true,
        reason: "TIME_EXIT",
        realizedPct: params.pnlPct,
      };
    }

    return { shouldExit: false, reason: "HOLD", realizedPct: params.pnlPct };
  }
}

export const livePositionManager = new LivePositionManager();

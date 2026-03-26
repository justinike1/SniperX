import { marketScanner } from "./marketScanner";
import { executionEngine } from "./executionEngine";
import { portfolioManager } from "./portfolioManager";
import { tradeJournal } from "./tradeJournal";
import { riskManager } from "./riskManager";
import { sendTelegramAlert } from "../utils/telegramBotEnhanced";

const SOL_MINT = "So11111111111111111111111111111111111111112";

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

    const sell = await executionEngine.sell(position.mint, amountTokens);
    if (!sell.success) {
      return { success: false, reason: sell.error || "SELL_EXEC_FAILED" };
    }

    let reconciledSell = sell;
    if (
      sell.txHash &&
      (!sell.filledInputAmount || !sell.filledOutputAmount || !sell.avgPriceUSD)
    ) {
      const lateFill = await executionEngine.reconcileExecutedSwap(
        sell.txHash,
        position.mint,
        SOL_MINT
      );
      reconciledSell = { ...sell, ...lateFill };
    }

    const soldQuantity = Math.max(
      0,
      Number.isFinite(reconciledSell.filledInputAmount)
        ? (reconciledSell.filledInputAmount as number)
        : amountTokens
    );
    const mark = await marketScanner.fetchPriceByMint(position.mint);
    const solPrice = await marketScanner.fetchPriceByMint(SOL_MINT);
    const grossProceedsSOL = Math.max(
      0,
      Number.isFinite(reconciledSell.filledOutputAmount)
        ? (reconciledSell.filledOutputAmount as number)
        : reconciledSell.outputAmount > 0
          ? reconciledSell.outputAmount / 1e9
          : 0
    );
    const feeSOL = Math.max(
      0,
      Number.isFinite(reconciledSell.networkFeeSOL)
        ? (reconciledSell.networkFeeSOL as number)
        : reconciledSell.fee > 0
          ? reconciledSell.fee / 1e9
          : 0
    );
    const impliedExitPriceUSD =
      soldQuantity > 0
        ? Number.isFinite(reconciledSell.avgPriceUSD)
          ? (reconciledSell.avgPriceUSD as number)
          : mark > 0
            ? mark
            : position.currentPriceUSD || position.entryPriceUSD
        : mark > 0
          ? mark
          : position.currentPriceUSD || position.entryPriceUSD;
    const grossProceedsUSD =
      grossProceedsSOL > 0 ? grossProceedsSOL * solPrice : soldQuantity * impliedExitPriceUSD;
    const feeUSD = feeSOL * solPrice;

    const exitResult = portfolioManager.recordExit({
      mint: position.mint,
      soldQuantity,
      grossProceedsUSD,
      feeUSD,
    });
    if (!exitResult) {
      return { success: false, reason: "POSITION_UPDATE_FAILED" };
    }
    await portfolioManager.refreshSnapshot();

    if (position.journalId) {
      tradeJournal.updateAnalytics(position.journalId, { exitReason: reason });
      const entry = tradeJournal.getById(position.journalId);
      if (exitResult.closed) {
        const closed = tradeJournal.close(position.journalId, exitResult.exitPriceUSD, reason, {
          success: true,
          txHash: reconciledSell.txHash,
          inputAmount: reconciledSell.inputAmount,
          outputAmount: reconciledSell.outputAmount,
          priceImpact: reconciledSell.priceImpact,
          fee: reconciledSell.fee,
          attempts: reconciledSell.attempts,
          timestamp: reconciledSell.timestamp,
          inputMint: reconciledSell.inputMint,
          outputMint: reconciledSell.outputMint,
          filledInputAmount: reconciledSell.filledInputAmount,
          filledOutputAmount: reconciledSell.filledOutputAmount,
          avgPriceUSD: reconciledSell.avgPriceUSD,
          networkFeeLamports: reconciledSell.networkFeeLamports,
          networkFeeSOL: reconciledSell.networkFeeSOL,
          fillSource: reconciledSell.fillSource,
        });
        if (closed) {
          riskManager.onTradeClose(closed.id, closed.pnlUSD || 0, closed.pnlPct || 0);
        }
      } else if (entry) {
        const realizedPnlUSD = exitResult.realizedPnlUSD;
        const entryCostBasisUSD = Math.max(
          0,
          Number.isFinite(entry.sizeUSD) ? entry.sizeUSD : 0
        );
        const partialPnlPct =
          entryCostBasisUSD > 0 ? (realizedPnlUSD / entryCostBasisUSD) * 100 : 0;
        riskManager.onTradeClose(entry.id, realizedPnlUSD, partialPnlPct, { keepOpen: true });
        entry.execution = {
          ...entry.execution,
          success: true,
          txHash: reconciledSell.txHash,
          inputAmount: reconciledSell.inputAmount,
          outputAmount: reconciledSell.outputAmount,
          priceImpact: reconciledSell.priceImpact,
          fee: reconciledSell.fee,
          attempts: reconciledSell.attempts,
          timestamp: reconciledSell.timestamp,
          inputMint: reconciledSell.inputMint,
          outputMint: reconciledSell.outputMint,
          filledInputAmount: reconciledSell.filledInputAmount,
          filledOutputAmount: reconciledSell.filledOutputAmount,
          avgPriceUSD: reconciledSell.avgPriceUSD,
          networkFeeLamports: reconciledSell.networkFeeLamports,
          networkFeeSOL: reconciledSell.networkFeeSOL,
          fillSource: reconciledSell.fillSource,
        };
        entry.notes +=
          `\nPartial exit ${reason}: ${(fraction * 100).toFixed(1)}%` +
          ` | qty ${exitResult.soldQuantity.toFixed(6)}` +
          ` | realized ${realizedPnlUSD >= 0 ? "+" : ""}$${realizedPnlUSD.toFixed(2)}`;
      }
    }

    await sendTelegramAlert(
      `Live exit ${reason}\n${position.token} ${fraction >= 0.999 ? "full" : "partial"} close\n` +
        `P&L: ${exitResult.realizedPnlUSD >= 0 ? "+" : ""}$${exitResult.realizedPnlUSD.toFixed(2)}\n` +
        `tx: ${reconciledSell.txHash || "n/a"}`
    );

    return {
      success: true,
      txHash: reconciledSell.txHash,
      realizedPnlUSD: exitResult.realizedPnlUSD,
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

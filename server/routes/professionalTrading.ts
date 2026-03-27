import type { Request, Response, Express } from "express";
import { JupiterGateway } from "../ultimate/gateway/jupiterGateway";
import { UltimateOrchestrator } from "../ultimate/orchestrator";
import { loadWallet, conn } from "../utils/solanaAdapter";
import type { Action, StrategySignal, UltConfig, WalletInfo } from "../ultimate/types";
import {
  backtester,
  portfolioManager,
  livePositionManager,
  strategyAnalytics,
  tradeJournal as brainTradeJournal,
  marketScanner,
  riskManager,
  performanceTracker,
  executionEngine,
} from "../brain/index";
import { tradeJournal } from "../services/tradeJournal";
import { performanceReport } from "../services/performanceReport";
import { canonicalRiskState } from "../risk/canonicalRiskState";
import { queueProStateSave } from "../services/proStateCheckpoint";

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

const config: UltConfig = {
  maxPerTradeSOL: 0.005,
  maxDailySOL: 0.05,
  minWalletSOL: 0.015,
  maxVolPct: 25,
  maxSlippagePct: 5,
  kellyCapPct: 0.1,
  riskOffDDPct: 10,
  blockDDPct: 15,
};

const gateway = new JupiterGateway();
const orchestrator = new UltimateOrchestrator(config, gateway);
const SOL_MINT = "So11111111111111111111111111111111111111112";

type TradeRequestBody = {
  tokenMint?: string;
  token?: string;
  action?: Action;
  confidence?: number;
  price?: number;
  sellFraction?: number;
  requestedSizeSOL?: number;
  signals?: StrategySignal[];
};

export function registerRoutes(app: Express) {
  app.get("/api/pro/status", async (_req, res) => {
    try {
      const snapshot = await portfolioManager.refreshSnapshot();
      const wallet = loadWallet();
      const riskState = orchestrator.getRiskState();
      const summary = performanceReport.generate(tradeJournal.getEntries());

      res.json({
        success: true,
        product: "SniperX Pro Trading",
        mode: backtester.getMode(),
        wallet: {
          address: wallet.publicKey.toBase58(),
          balanceSOL: snapshot.cashSOL,
          reserveSOL: config.minWalletSOL,
        },
        equity: {
          cashUSD: snapshot.cashUSD,
          positionsUSD: snapshot.positionsValueUSD,
          totalUSD: snapshot.totalEquityUSD,
          unrealizedPnlUSD: snapshot.totalUnrealizedPnlUSD,
        },
        risk: {
          halted: riskState.isHalted,
          haltReason: riskState.haltReason,
          consecutiveLosses: riskState.consecutiveLosses,
          cooldownRemainingMs: riskState.cooldownRemainingMs,
          dailySpentSOL: riskState.dailySpentSOL,
          dailyRealizedPnlUSD: riskState.dailyRealizedPnlUSD,
        },
        performance: {
          totalTrades: summary.totalTrades,
          winRatePct: summary.winRatePct,
          netPnlUSD: summary.netPnlUSD,
          maxDrawdownUSD: summary.drawdown.maxDrawdownUSD,
        },
        riskConfig: {
          maxPerTradeSOL: config.maxPerTradeSOL,
          maxDailySOL: config.maxDailySOL,
          maxVolatilityPct: config.maxVolPct,
          maxSlippagePct: config.maxSlippagePct,
          maxPositionPctOfWallet: 0.12,
          consecutiveLossHalt: 3,
          executionCooldownMs: 60_000,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/pro/trade", async (req, res) => {
    try {
      const body = (req.body || {}) as TradeRequestBody;
      const wallet = loadWallet();
      const lamports = await conn().getBalance(wallet.publicKey, "confirmed");
      const balanceSOL = lamports / 1e9;
      const signalAction = normalizeAction(body.action);
      const sellFraction = normalizeSellFraction(body.sellFraction);

      const tokenMint = body.tokenMint || resolveTokenMint(body.token);
      if (signalAction === "SELL" && tokenMint) {
        const sell = await livePositionManager.forceSellByMint(
          tokenMint,
          sellFraction,
          sellFraction >= 0.999 ? "API_SELL_FULL" : "API_SELL_PARTIAL"
        );
        if (!sell.success) {
          return res.status(422).json({
            success: false,
            decision: "HOLD",
            error: sell.reason || "SELL_FAILED",
          });
        }
        return res.json({
          success: true,
          decision: "SELL",
          tokenMint,
          fraction: sellFraction,
          txid: sell.txHash,
          realizedPnlUSD: sell.realizedPnlUSD,
        });
      }

      const walletInfo: WalletInfo = {
        address: wallet.publicKey.toBase58(),
        balanceSOL,
        dailySpentSOL: orchestrator.getRiskState().dailySpentSOL,
      };

      const normalizedSignals = normalizeSignals(body);
      if (!normalizedSignals.length) {
        return res.status(400).json({
          success: false,
          error: "At least one valid signal is required.",
        });
      }

      if (body.tokenMint && typeof body.price === "number" && body.price > 0) {
        orchestrator.onCandle(body.tokenMint, body.price, balanceSOL);
      }

      const requestedSignal = normalizedSignals[0];
      const attemptId = tradeJournal.logAttempt({
        tokenMint: requestedSignal.tokenMint,
        action: requestedSignal.action,
        requestedSizeSOL: 0,
        confidence: normalizeConfidence(requestedSignal.confidence),
        reason: requestedSignal.reason || "API trade request",
      });

      const decision = await orchestrator.onSignals(walletInfo, normalizedSignals);
      const succeeded = decision.decided !== "HOLD";
      if (succeeded) {
        orchestrator.recordTradeOutcome(0);
      }
      tradeJournal.completeAttempt(attemptId, {
        success: succeeded,
        executedAction: decision.decided,
        executedSizeSOL: decision.sizeSOL,
        txid: decision.execution?.txid,
        blockReasons: decision.reasons,
        executionReason:
          decision.execution?.reason ||
          decision.reasons.map((r) => `${r.code}:${r.message}`).join(" | "),
      });
      queueProStateSave();

      if (!succeeded) {
        return res.status(422).json({
          success: false,
          decision: "HOLD",
          reasons: decision.reasons,
          risk: decision.risk,
          attemptId,
        });
      }

      if (decision.decided === "BUY") {
        const mint = decision.selectedSignal?.tokenMint || requestedSignal.tokenMint;
        const tokenLabel = body.token?.toUpperCase() || mint.slice(0, 6);
        const entryPriceUSD =
          typeof body.price === "number" && body.price > 0
            ? body.price
            : await marketScanner.fetchPriceByMint(mint);
        const solPriceUSD = await marketScanner.fetchPriceByMint(SOL_MINT);
        const sizeUSD = decision.sizeSOL * (solPriceUSD > 0 ? solPriceUSD : 100);
        const vol = marketScanner.getVolatility(mint);
        const exits = riskManager.calculateExits(normalizeConfidence(requestedSignal.confidence) * 100, vol);
        const opp = marketScanner
          .getLastScan()
          ?.opportunities.find((o) => o.mint === mint);

        if (entryPriceUSD > 0 && sizeUSD > 0) {
          const executionMeta = (decision.execution || {}) as {
            txid?: string;
            filledInputAmount?: number;
            filledOutputAmount?: number;
            avgPriceUSD?: number;
            networkFeeSOL?: number;
            networkFeeLamports?: number;
            fee?: number;
            fillSource?: "onchain" | "quote";
          };
          let fill =
            executionMeta.filledInputAmount ||
            executionMeta.filledOutputAmount ||
            executionMeta.avgPriceUSD
              ? executionMeta
              : undefined;
          if (!fill && executionMeta.txid) {
            try {
              const reconciled = await executionEngine.reconcileExecutedSwap(
                executionMeta.txid,
                SOL_MINT,
                mint
              );
              fill = { ...executionMeta, ...reconciled };
            } catch {
              fill = executionMeta;
            }
          }
          const executedQty =
            fill?.filledOutputAmount && Number.isFinite(fill.filledOutputAmount)
              ? fill.filledOutputAmount
              : undefined;
          const executedSolIn =
            fill?.filledInputAmount && Number.isFinite(fill.filledInputAmount)
              ? fill.filledInputAmount
              : undefined;
          const executedPrice =
            fill?.avgPriceUSD && Number.isFinite(fill.avgPriceUSD)
              ? fill.avgPriceUSD
              : entryPriceUSD;
          const feeSOL =
            fill?.networkFeeSOL && Number.isFinite(fill.networkFeeSOL)
              ? fill.networkFeeSOL
              : fill?.fee
                ? fill.fee / 1e9
                : 0;
          const executedNotionalUSD =
            executedSolIn !== undefined
              ? executedSolIn * (solPriceUSD > 0 ? solPriceUSD : 100)
              : sizeUSD;
          const entryFeeUSD = feeSOL * (solPriceUSD > 0 ? solPriceUSD : 100);
          const fillSource =
            fill?.fillSource === "onchain" || fill?.fillSource === "quote"
              ? fill.fillSource
              : "quote";
          const journalId = brainTradeJournal.open({
            token: tokenLabel,
            mint,
            action: "BUY",
            sizeUSD,
            entryPrice: executedPrice,
            confidence: Math.round(normalizeConfidence(requestedSignal.confidence) * 100),
            regime: "CHOP",
            signals: [
              requestedSignal.strategy || "API",
              requestedSignal.reason || "API trade request",
            ],
            breakdown: {},
            execution: {
              success: true,
              txHash: executionMeta.txid,
              inputAmount: decision.sizeSOL,
              outputAmount:
                executedQty !== undefined && executedPrice > 0
                  ? executedQty * executedPrice
                  : 0,
              priceImpact: 0,
              fee:
                fill?.networkFeeLamports && Number.isFinite(fill.networkFeeLamports)
                  ? fill.networkFeeLamports
                  : 0,
              attempts: 1,
              timestamp: Date.now(),
              inputMint: SOL_MINT,
              outputMint: mint,
              filledInputAmount: executedSolIn,
              filledOutputAmount: executedQty,
              avgPriceUSD: executedPrice,
              networkFeeLamports:
                fill?.networkFeeLamports && Number.isFinite(fill.networkFeeLamports)
                  ? fill.networkFeeLamports
                  : undefined,
              networkFeeSOL: feeSOL > 0 ? feeSOL : undefined,
              fillSource,
            },
            analytics: {
              score: Math.round(normalizeConfidence(requestedSignal.confidence) * 100),
              tokenAgeSec: opp?.tokenAgeSec,
              liquidity: opp?.liquidity,
              volume24h: opp?.volume24h,
              priceImpactEstPct: opp?.priceImpactEstPct,
              entryReason: requestedSignal.reason || "API trade request",
            },
          });

          await portfolioManager.registerEntry({
            token: tokenLabel,
            mint,
            usdNotional: sizeUSD,
            entryPriceUSD: executedPrice,
            takeProfitPct: exits.tp,
            stopLossPct: exits.sl,
            trailingStopActivationPct: exits.trailingActivation,
            journalId,
            strategy: requestedSignal.strategy || "API",
            executedQuantity: executedQty,
            executedNotionalUSD,
            entryFeeUSD,
            fillSource,
            txHash: executionMeta.txid,
          });

          riskManager.onTradeOpen(journalId, executedNotionalUSD + entryFeeUSD, executedPrice);
          queueProStateSave();
        }
      }

      return res.json({
        success: true,
        decision: decision.decided,
        tokenMint: decision.selectedSignal?.tokenMint || requestedSignal.tokenMint,
        sizeSOL: decision.sizeSOL,
        txid: decision.execution?.txid,
        risk: decision.risk,
        attemptId,
      });
    } catch (error) {
      console.error("Professional trade endpoint error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/pro/report", (_req, res) => {
    try {
      const entries = tradeJournal.getEntries();
      const summary = performanceReport.generate(entries);
      const liveJournalPerformance = performanceTracker.compute(brainTradeJournal.getAll());
      const analytics = strategyAnalytics.summarize(brainTradeJournal.getAll());
      res.json({
        success: true,
        report: summary,
        liveJournalPerformance,
        strategyAnalytics: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/pro/sell", async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as TradeRequestBody;
      const tokenMint = body.tokenMint || resolveTokenMint(body.token);
      if (!tokenMint) {
        return res.status(400).json({
          success: false,
          error: "tokenMint or known token symbol is required",
        });
      }

      const sell = await livePositionManager.forceSellByMint(
        tokenMint,
        normalizeSellFraction(body.sellFraction),
        "API_SELL_ENDPOINT"
      );
      if (!sell.success) {
        return res.status(422).json({
          success: false,
          error: sell.reason || "SELL_FAILED",
        });
      }
      return res.json({
        success: true,
        decision: "SELL",
        tokenMint,
        txid: sell.txHash,
        realizedPnlUSD: sell.realizedPnlUSD,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

function normalizeSignals(body: TradeRequestBody): StrategySignal[] {
  if (Array.isArray(body.signals) && body.signals.length > 0) {
    return body.signals
      .filter((signal) => signal && typeof signal.tokenMint === "string")
      .map((signal) => ({
        strategy: signal.strategy || "API",
        tokenMint: signal.tokenMint,
        action: normalizeAction(signal.action),
        confidence: normalizeConfidence(signal.confidence),
        sizeHintPct: signal.sizeHintPct,
        requestedSizeSOL:
          typeof signal.requestedSizeSOL === "number" && Number.isFinite(signal.requestedSizeSOL)
            ? signal.requestedSizeSOL
            : undefined,
        reason: signal.reason || "Signal from API payload",
        ts: signal.ts || Date.now(),
      }));
  }

  if (!body.tokenMint) {
    return [];
  }

  return [
    {
      strategy: "MANUAL_API",
      tokenMint: body.tokenMint,
      action: normalizeAction(body.action),
      confidence: normalizeConfidence(body.confidence),
      requestedSizeSOL:
        typeof body.requestedSizeSOL === "number" && Number.isFinite(body.requestedSizeSOL)
          ? Math.max(0, body.requestedSizeSOL)
          : undefined,
      reason: "Manual trade request",
      ts: Date.now(),
    },
  ];
}

function normalizeAction(action?: Action): Action {
  if (action === "BUY" || action === "SELL" || action === "SHORT" || action === "COVER") {
    return action;
  }
  return "BUY";
}

function normalizeConfidence(confidence?: number): number {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) return 0.7;
  return confidence > 1 ? Math.max(0, Math.min(1, confidence / 100)) : Math.max(0, Math.min(1, confidence));
}

function normalizeSellFraction(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(0.01, Math.min(1, value));
}

function resolveTokenMint(token?: string): string | undefined {
  if (!token) return undefined;
  const map: Record<string, string> = {
    SOL: "So11111111111111111111111111111111111111112",
    BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  };
  return map[token.toUpperCase()];
}

export { registerRoutes as registerProfessionalRoutes };

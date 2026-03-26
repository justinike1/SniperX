import type { Express } from "express";
import { JupiterGateway } from "../ultimate/gateway/jupiterGateway";
import { UltimateOrchestrator } from "../ultimate/orchestrator";
import { loadWallet, conn } from "../utils/solanaAdapter";
import type { Action, StrategySignal, UltConfig, WalletInfo } from "../ultimate/types";
import { backtester } from "../brain/index";
import { tradeJournal } from "../services/tradeJournal";
import { performanceReport } from "../services/performanceReport";

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

type TradeRequestBody = {
  tokenMint?: string;
  action?: Action;
  confidence?: number;
  price?: number;
  signals?: StrategySignal[];
};

export function registerRoutes(app: Express) {
  app.get("/api/pro/status", async (_req, res) => {
    try {
      const wallet = loadWallet();
      const lamports = await conn().getBalance(wallet.publicKey, "confirmed");
      const balanceSOL = lamports / 1e9;
      const riskState = orchestrator.getRiskState();
      const summary = performanceReport.generate(tradeJournal.getEntries());

      res.json({
        success: true,
        product: "SniperX Pro Trading",
        mode: backtester.getMode(),
        wallet: {
          address: wallet.publicKey.toBase58(),
          balanceSOL,
          reserveSOL: config.minWalletSOL,
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

      if (!succeeded) {
        return res.status(422).json({
          success: false,
          decision: "HOLD",
          reasons: decision.reasons,
          risk: decision.risk,
          attemptId,
        });
      }

      res.json({
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
      res.json({
        success: true,
        report: summary,
      });
    } catch (error) {
      res.status(500).json({
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

export { registerRoutes as registerProfessionalRoutes };

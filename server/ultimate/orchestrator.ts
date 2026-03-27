import type {
  Action,
  ExecResult,
  StrategySignal,
  TradeGateway,
  UltConfig,
  WalletInfo,
} from "./types";
import type { RiskBlockReason, RiskStateSnapshot } from "./risk";
import { KellySizer, ProRiskController, VolatilityLimiter } from "./risk";
import { canonicalRiskState } from "../risk/canonicalRiskState";

interface RuntimeContext {
  lastPriceByMint: Map<string, number>;
  currentEquitySOL: number;
  peakEquitySOL: number;
}

export interface OrchestratorDecision {
  decided: Action;
  sizeSOL: number;
  selectedSignal?: StrategySignal;
  reasons: RiskBlockReason[];
  risk: RiskStateSnapshot;
  execution?: ExecResult;
}

export class UltimateOrchestrator {
  private readonly kellySizer: KellySizer;
  private readonly volatilityLimiter: VolatilityLimiter;
  private readonly riskController: ProRiskController;
  private readonly ctx: RuntimeContext = {
    lastPriceByMint: new Map(),
    currentEquitySOL: 0,
    peakEquitySOL: 0,
  };

  constructor(private readonly cfg: UltConfig, private readonly gateway: TradeGateway) {
    this.kellySizer = new KellySizer(cfg.kellyCapPct);
    this.volatilityLimiter = new VolatilityLimiter(cfg.maxVolPct);
    this.riskController = new ProRiskController({
      minWalletSOL: cfg.minWalletSOL,
      maxPerTradeSOL: cfg.maxPerTradeSOL,
      maxDailySOL: cfg.maxDailySOL,
      maxVolPct: cfg.maxVolPct,
      maxPositionPctOfWallet: 0.12, // stricter than previous broad sizing
      maxConsecutiveLosses: 3,
      cooldownMsAfterFailure: 60_000,
      dailyLossCapUSD: 35,
      minTradeSizeSOL: 0.0001,
    });
  }

  onCandle(tokenMint: string, price: number, equitySOL: number): void {
    this.ctx.lastPriceByMint.set(tokenMint, price);
    this.volatilityLimiter.push(price);
    this.ctx.currentEquitySOL = equitySOL;
    if (equitySOL > this.ctx.peakEquitySOL) {
      this.ctx.peakEquitySOL = equitySOL;
    }
    // Keep canonical drawdown in a single shared store.
    canonicalRiskState.updateDrawdown(equitySOL * 100);
  }

  getRiskState(): RiskStateSnapshot {
    const state = this.riskController.getState();
    canonicalRiskState.setProSecondary({ ...state });
    return state;
  }

  recordTradeOutcome(realizedPnlUSD: number): void {
    this.riskController.recordExecutionResult({ success: true, realizedPnlUSD });
  }

  async onSignals(wallet: WalletInfo, signals: StrategySignal[]): Promise<OrchestratorDecision> {
    const executableSignals = signals.filter((signal) => signal.action !== "HOLD");
    if (executableSignals.length === 0) {
      return this.blockedDecision("NO_EXECUTABLE_SIGNAL", "No executable signal in request.");
    }

    const selected = this.selectSignal(executableSignals);
    const price = this.ctx.lastPriceByMint.get(selected.tokenMint);

    const drawdownScale = this.computeDrawdownScale();
    const kellyFraction = this.kellySizer.fraction(this.normalizeConfidence(selected.confidence));
    const baseEquity = this.ctx.currentEquitySOL > 0 ? this.ctx.currentEquitySOL : wallet.balanceSOL;
    const maxSpendable = Math.max(0, wallet.balanceSOL - this.cfg.minWalletSOL);

    let requestedSizeSOL = Math.max(
      0,
      Math.min(this.cfg.maxPerTradeSOL, baseEquity * kellyFraction * drawdownScale, maxSpendable)
    );

    if (selected.requestedSizeSOL && selected.requestedSizeSOL > 0) {
      requestedSizeSOL = Math.min(requestedSizeSOL, selected.requestedSizeSOL);
    }

    if (selected.sizeHintPct && selected.sizeHintPct > 0) {
      requestedSizeSOL = Math.min(requestedSizeSOL, baseEquity * selected.sizeHintPct);
    }

    const riskDecision = this.riskController.evaluate({
      walletBalanceSOL: wallet.balanceSOL,
      requestedSizeSOL,
      hasPrice: typeof price === "number" && price > 0,
      volatilityPct: this.volatilityLimiter.getVolatilityPct(),
    });

    if (!riskDecision.allowed) {
      return {
        decided: "HOLD",
        sizeSOL: 0,
        selectedSignal: selected,
        reasons: riskDecision.reasons,
        risk: this.riskController.getState(),
      };
    }

    const approvedSizeSOL = riskDecision.proposal.approvedSizeSOL;
    const execution = await this.executeSignal(selected, approvedSizeSOL, price);
    if (!execution.success) {
      this.riskController.recordExecutionResult({ success: false });
      return {
        decided: "HOLD",
        sizeSOL: 0,
        selectedSignal: selected,
        reasons: [
          {
            code: "EXECUTION_FAILED",
            message: execution.reason || "Execution failed.",
          },
        ],
        risk: this.riskController.getState(),
        execution,
      };
    }

    this.riskController.commitSpend(approvedSizeSOL);
    return {
      decided: selected.action,
      sizeSOL: approvedSizeSOL,
      selectedSignal: selected,
      reasons: [],
      risk: this.riskController.getState(),
      execution,
    };
  }

  private async executeSignal(
    signal: StrategySignal,
    sizeSOL: number,
    lastPrice?: number
  ): Promise<ExecResult> {
    if (signal.action === "BUY") {
      return this.gateway.buy(signal.tokenMint, sizeSOL);
    }
    if (signal.action === "SELL") {
      if (!lastPrice || lastPrice <= 0) {
        return { success: false, reason: "Missing token price for SELL conversion." };
      }
      return this.gateway.sell(signal.tokenMint, sizeSOL / lastPrice);
    }
    return {
      success: false,
      reason: `Action ${signal.action} is not enabled in current gateway.`,
    };
  }

  private selectSignal(signals: StrategySignal[]): StrategySignal {
    return [...signals].sort(
      (a, b) => this.normalizeConfidence(b.confidence) - this.normalizeConfidence(a.confidence)
    )[0];
  }

  private normalizeConfidence(confidence: number): number {
    if (confidence > 1) return Math.max(0, Math.min(1, confidence / 100));
    return Math.max(0, Math.min(1, confidence));
  }

  private computeDrawdownScale(): number {
    if (this.ctx.peakEquitySOL <= 0 || this.ctx.currentEquitySOL <= 0) return 1;

    const drawdownPct =
      ((this.ctx.peakEquitySOL - this.ctx.currentEquitySOL) / this.ctx.peakEquitySOL) * 100;

    if (drawdownPct >= this.cfg.blockDDPct) return 0;
    if (drawdownPct >= this.cfg.riskOffDDPct) return 0.35;
    return 1;
  }

  private blockedDecision(code: RiskBlockReason["code"], message: string): OrchestratorDecision {
    return {
      decided: "HOLD",
      sizeSOL: 0,
      reasons: [{ code, message }],
      risk: this.riskController.getState(),
    };
  }
}

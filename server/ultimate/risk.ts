export type RiskBlockCode =
  | "NO_EXECUTABLE_SIGNAL"
  | "EXECUTION_FAILED"
  | "RISK_HALTED"
  | "COOLDOWN_ACTIVE"
  | "LOW_WALLET_BALANCE"
  | "NO_PRICE"
  | "VOLATILITY_TOO_HIGH"
  | "DAILY_BUDGET_EXCEEDED"
  | "SIZE_BELOW_MINIMUM"
  | "CONSECUTIVE_LOSS_HALT";

export interface RiskBlockReason {
  code: RiskBlockCode;
  message: string;
  details?: Record<string, number | string | boolean>;
}

export interface RiskProposal {
  requestedSizeSOL: number;
  approvedSizeSOL: number;
  maxAllowedSizeSOL: number;
}

export interface RiskDecision {
  allowed: boolean;
  proposal: RiskProposal;
  reasons: RiskBlockReason[];
}

interface RiskRuntimeState {
  consecutiveLosses: number;
  isHalted: boolean;
  haltReason?: string;
  cooldownUntil: number;
  lastExecutionFailedAt?: number;
  dailySpentSOL: number;
  dailyRealizedPnlUSD: number;
  tradingDay: string;
}

export interface RiskStateSnapshot {
  isHalted: boolean;
  haltReason?: string;
  consecutiveLosses: number;
  cooldownRemainingMs: number;
  dailySpentSOL: number;
  dailyRealizedPnlUSD: number;
  tradingDay: string;
}

export class KellySizer {
  constructor(private cap: number) {}

  fraction(confidence: number, payoff = 1): number {
    const bounded = Math.max(0, Math.min(1, confidence));
    const p = Math.min(0.72, Math.max(0.5, 0.5 + (bounded - 0.5) * 0.45));
    const q = 1 - p;
    const kelly = p - q / Math.max(0.2, payoff);
    return Math.max(0, Math.min(kelly, this.cap));
  }
}

export class VolatilityLimiter {
  private prices: number[] = [];

  constructor(private maxPct: number, private window = 50) {}

  push(price: number): void {
    if (!Number.isFinite(price) || price <= 0) return;
    this.prices.push(price);
    if (this.prices.length > this.window) this.prices.shift();
  }

  getVolatilityPct(): number {
    if (this.prices.length < 10) return 0;
    const mean = this.prices.reduce((sum, v) => sum + v, 0) / this.prices.length;
    const variance =
      this.prices.reduce((sum, v) => sum + (v - mean) ** 2, 0) / this.prices.length;
    const stdDev = Math.sqrt(variance);
    return mean > 0 ? (stdDev / mean) * 100 : 0;
  }

  isAllowed(): boolean {
    return this.getVolatilityPct() <= this.maxPct;
  }
}

export class ProRiskController {
  private state: RiskRuntimeState = {
    consecutiveLosses: 0,
    isHalted: false,
    cooldownUntil: 0,
    dailySpentSOL: 0,
    dailyRealizedPnlUSD: 0,
    tradingDay: this.dayStamp(),
  };

  constructor(
    private readonly opts: {
      minWalletSOL: number;
      maxPerTradeSOL: number;
      maxDailySOL: number;
      maxVolPct: number;
      maxPositionPctOfWallet: number;
      maxConsecutiveLosses: number;
      cooldownMsAfterFailure: number;
      dailyLossCapUSD: number;
      minTradeSizeSOL?: number;
    }
  ) {}

  onNewDayCheck(): void {
    const today = this.dayStamp();
    if (today === this.state.tradingDay) return;

    this.state.tradingDay = today;
    this.state.dailySpentSOL = 0;
    this.state.dailyRealizedPnlUSD = 0;
    if (this.state.isHalted && this.state.haltReason?.includes("daily")) {
      this.state.isHalted = false;
      this.state.haltReason = undefined;
    }
  }

  evaluate(params: {
    walletBalanceSOL: number;
    requestedSizeSOL: number;
    hasPrice: boolean;
    volatilityPct: number;
    now?: number;
  }): RiskDecision {
    this.onNewDayCheck();

    const now = params.now ?? Date.now();
    const reasons: RiskBlockReason[] = [];

    if (this.state.isHalted) {
      reasons.push({
        code: "RISK_HALTED",
        message: this.state.haltReason || "Trading is halted.",
      });
    }

    if (now < this.state.cooldownUntil) {
      reasons.push({
        code: "COOLDOWN_ACTIVE",
        message: "Cooldown is active after failed execution.",
        details: { cooldownRemainingMs: this.state.cooldownUntil - now },
      });
    }

    if (params.walletBalanceSOL < this.opts.minWalletSOL) {
      reasons.push({
        code: "LOW_WALLET_BALANCE",
        message: "Wallet balance is below trading reserve requirement.",
        details: {
          walletBalanceSOL: round4(params.walletBalanceSOL),
          minWalletSOL: round4(this.opts.minWalletSOL),
        },
      });
    }

    if (!params.hasPrice) {
      reasons.push({
        code: "NO_PRICE",
        message: "No recent market price for this token.",
      });
    }

    if (params.volatilityPct > this.opts.maxVolPct) {
      reasons.push({
        code: "VOLATILITY_TOO_HIGH",
        message: "Market volatility is above the allowed threshold.",
        details: {
          volatilityPct: round2(params.volatilityPct),
          maxVolPct: round2(this.opts.maxVolPct),
        },
      });
    }

    const strictWalletCap = params.walletBalanceSOL * this.opts.maxPositionPctOfWallet;
    const maxAllowedSizeSOL = Math.max(
      0,
      Math.min(
        this.opts.maxPerTradeSOL,
        strictWalletCap,
        params.walletBalanceSOL - this.opts.minWalletSOL
      )
    );
    const approvedSizeSOL = Math.max(0, Math.min(params.requestedSizeSOL, maxAllowedSizeSOL));

    const minTradeSizeSOL = this.opts.minTradeSizeSOL ?? 0.0001;
    if (approvedSizeSOL < minTradeSizeSOL) {
      reasons.push({
        code: "SIZE_BELOW_MINIMUM",
        message: "Computed size is below minimum executable threshold.",
        details: {
          approvedSizeSOL: round6(approvedSizeSOL),
          minTradeSizeSOL: round6(minTradeSizeSOL),
          maxAllowedSizeSOL: round6(maxAllowedSizeSOL),
        },
      });
    }

    if (this.state.dailySpentSOL + approvedSizeSOL > this.opts.maxDailySOL) {
      reasons.push({
        code: "DAILY_BUDGET_EXCEEDED",
        message: "Daily trading budget would be exceeded.",
        details: {
          dailySpentSOL: round4(this.state.dailySpentSOL),
          nextTradeSOL: round4(approvedSizeSOL),
          maxDailySOL: round4(this.opts.maxDailySOL),
        },
      });
    }

    if (this.state.consecutiveLosses >= this.opts.maxConsecutiveLosses) {
      reasons.push({
        code: "CONSECUTIVE_LOSS_HALT",
        message: `Trading halted after ${this.opts.maxConsecutiveLosses} consecutive losses.`,
      });
      this.state.isHalted = true;
      this.state.haltReason = "Trading halted due to consecutive losses.";
    }

    const allowed = reasons.length === 0;
    return {
      allowed,
      reasons,
      proposal: {
        requestedSizeSOL: round6(params.requestedSizeSOL),
        approvedSizeSOL: round6(approvedSizeSOL),
        maxAllowedSizeSOL: round6(maxAllowedSizeSOL),
      },
    };
  }

  commitSpend(sizeSOL: number): void {
    this.onNewDayCheck();
    this.state.dailySpentSOL += Math.max(0, sizeSOL);
  }

  recordExecutionResult(params: {
    success: boolean;
    realizedPnlUSD?: number;
    now?: number;
  }): void {
    this.onNewDayCheck();
    const now = params.now ?? Date.now();

    if (!params.success) {
      this.state.cooldownUntil = now + this.opts.cooldownMsAfterFailure;
      this.state.lastExecutionFailedAt = now;
      return;
    }

    if (typeof params.realizedPnlUSD === "number" && Number.isFinite(params.realizedPnlUSD)) {
      this.state.dailyRealizedPnlUSD += params.realizedPnlUSD;
      if (params.realizedPnlUSD < 0) {
        this.state.consecutiveLosses += 1;
      } else if (params.realizedPnlUSD > 0) {
        this.state.consecutiveLosses = 0;
      }

      if (this.state.dailyRealizedPnlUSD <= -Math.abs(this.opts.dailyLossCapUSD)) {
        this.state.isHalted = true;
        this.state.haltReason = "Trading halted: daily loss cap reached.";
      }
      if (this.state.consecutiveLosses >= this.opts.maxConsecutiveLosses) {
        this.state.isHalted = true;
        this.state.haltReason = "Trading halted due to consecutive losses.";
      }
    }
  }

  getState(now = Date.now()): RiskStateSnapshot {
    this.onNewDayCheck();
    return {
      isHalted: this.state.isHalted,
      haltReason: this.state.haltReason,
      consecutiveLosses: this.state.consecutiveLosses,
      cooldownRemainingMs: Math.max(0, this.state.cooldownUntil - now),
      dailySpentSOL: round4(this.state.dailySpentSOL),
      dailyRealizedPnlUSD: round2(this.state.dailyRealizedPnlUSD),
      tradingDay: this.state.tradingDay,
    };
  }

  private dayStamp(): string {
    return new Date().toISOString().split("T")[0];
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

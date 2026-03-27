export interface CanonicalRiskSnapshot {
  tradingDay: string;
  dailyPnlUSD: number;
  dailyPnlPct: number;
  dailySpentSOL: number;
  consecutiveLosses: number;
  peakPortfolioUSD: number;
  currentDrawdownPct: number;
  tradesOpenCount: number;
  dailyTradeCount: number;
  isHalted: boolean;
  haltReason?: string;
  cooldownUntil: number;
  cooldownRemainingMs: number;
  lastExecutionFailedAt?: number;
  dailyStartEquityUSD: number;
}

export interface CanonicalRiskPersistedState {
  state: {
    tradingDay: string;
    dailyPnlUSD: number;
    dailyPnlPct: number;
    dailySpentSOL: number;
    consecutiveLosses: number;
    peakPortfolioUSD: number;
    currentDrawdownPct: number;
    dailyTradeCount: number;
    isHalted: boolean;
    haltReason?: string;
    cooldownUntil: number;
    lastExecutionFailedAt?: number;
    dailyStartEquityUSD: number;
  };
  openTrades: Array<{ id: string; sizeUSD: number; entryPrice: number }>;
}

type SecondarySnapshot = Record<string, unknown> | undefined;

interface OpenTradeMeta {
  sizeUSD: number;
  entryPrice: number;
}

class CanonicalRiskStateStore {
  private readonly openTrades = new Map<string, OpenTradeMeta>();
  private brainSecondary?: SecondarySnapshot;
  private proSecondary?: SecondarySnapshot;
  private state = {
    tradingDay: this.dayStamp(),
    dailyPnlUSD: 0,
    dailyPnlPct: 0,
    dailySpentSOL: 0,
    consecutiveLosses: 0,
    peakPortfolioUSD: 0,
    currentDrawdownPct: 0,
    dailyTradeCount: 0,
    isHalted: false,
    haltReason: undefined as string | undefined,
    cooldownUntil: 0,
    lastExecutionFailedAt: undefined as number | undefined,
    dailyStartEquityUSD: 0,
  };

  rollDayIfNeeded(now = Date.now()): void {
    const today = this.dayStamp(now);
    if (today === this.state.tradingDay) return;
    this.state.tradingDay = today;
    this.state.dailyPnlUSD = 0;
    this.state.dailyPnlPct = 0;
    this.state.dailySpentSOL = 0;
    this.state.dailyTradeCount = 0;
    this.state.dailyStartEquityUSD = 0;
  }

  initDailyStartEquity(totalEquityUSD: number): void {
    if (!Number.isFinite(totalEquityUSD) || totalEquityUSD <= 0) return;
    if (this.state.dailyStartEquityUSD > 0) return;
    this.state.dailyStartEquityUSD = totalEquityUSD;
    this.refreshDailyPnlPct();
  }

  getDailyStartEquity(): number {
    return this.state.dailyStartEquityUSD;
  }

  addDailySpentSOL(sizeSOL: number): void {
    if (!Number.isFinite(sizeSOL) || sizeSOL <= 0) return;
    this.state.dailySpentSOL += sizeSOL;
  }

  recordTradeOpen(id: string, sizeUSD: number, entryPrice: number): void {
    if (!id) return;
    if (!this.openTrades.has(id)) {
      this.state.dailyTradeCount += 1;
    }
    this.openTrades.set(id, {
      sizeUSD: Number.isFinite(sizeUSD) ? sizeUSD : 0,
      entryPrice: Number.isFinite(entryPrice) ? entryPrice : 0,
    });
  }

  recordTradeClose(id: string): void {
    if (!id) return;
    this.openTrades.delete(id);
  }

  applyRealizedPnl(pnlUSD: number): void {
    if (!Number.isFinite(pnlUSD)) return;
    this.state.dailyPnlUSD += pnlUSD;
    if (pnlUSD < 0) {
      this.state.consecutiveLosses += 1;
    } else if (pnlUSD > 0) {
      this.state.consecutiveLosses = 0;
    }
    this.refreshDailyPnlPct();
  }

  updateDrawdown(currentEquityUSD: number): void {
    if (!Number.isFinite(currentEquityUSD) || currentEquityUSD <= 0) return;
    if (currentEquityUSD > this.state.peakPortfolioUSD) {
      this.state.peakPortfolioUSD = currentEquityUSD;
    }
    if (this.state.peakPortfolioUSD > 0) {
      this.state.currentDrawdownPct =
        ((this.state.peakPortfolioUSD - currentEquityUSD) / this.state.peakPortfolioUSD) * 100;
    }
  }

  setCooldownAfterFailure(ms: number, now = Date.now()): void {
    if (!Number.isFinite(ms) || ms <= 0) return;
    this.state.cooldownUntil = now + ms;
    this.state.lastExecutionFailedAt = now;
  }

  setHalt(reason: string): void {
    this.state.isHalted = true;
    this.state.haltReason = reason;
  }

  resume(): void {
    this.state.isHalted = false;
    this.state.haltReason = undefined;
  }

  getCanonicalSnapshot(now = Date.now()): CanonicalRiskSnapshot {
    this.rollDayIfNeeded(now);
    return {
      tradingDay: this.state.tradingDay,
      dailyPnlUSD: this.round2(this.state.dailyPnlUSD),
      dailyPnlPct: this.round2(this.state.dailyPnlPct),
      dailySpentSOL: this.round4(this.state.dailySpentSOL),
      consecutiveLosses: this.state.consecutiveLosses,
      peakPortfolioUSD: this.round2(this.state.peakPortfolioUSD),
      currentDrawdownPct: this.round2(this.state.currentDrawdownPct),
      tradesOpenCount: this.openTrades.size,
      dailyTradeCount: this.state.dailyTradeCount,
      isHalted: this.state.isHalted,
      haltReason: this.state.haltReason,
      cooldownUntil: this.state.cooldownUntil,
      cooldownRemainingMs: Math.max(0, this.state.cooldownUntil - now),
      lastExecutionFailedAt: this.state.lastExecutionFailedAt,
      dailyStartEquityUSD: this.round2(this.state.dailyStartEquityUSD),
    };
  }

  setBrainSecondary(snapshot: SecondarySnapshot): void {
    this.brainSecondary = snapshot;
  }

  setProSecondary(snapshot: SecondarySnapshot): void {
    this.proSecondary = snapshot;
  }

  syncFromBrain(snapshot: SecondarySnapshot): void {
    this.setBrainSecondary(snapshot);
  }

  syncFromPro(snapshot: SecondarySnapshot): void {
    this.setProSecondary(snapshot);
  }

  getSecondarySnapshots(): { brain?: SecondarySnapshot; pro?: SecondarySnapshot } {
    return {
      brain: this.brainSecondary,
      pro: this.proSecondary,
    };
  }

  exportState(): CanonicalRiskPersistedState {
    return {
      state: {
        tradingDay: this.state.tradingDay,
        dailyPnlUSD: this.state.dailyPnlUSD,
        dailyPnlPct: this.state.dailyPnlPct,
        dailySpentSOL: this.state.dailySpentSOL,
        consecutiveLosses: this.state.consecutiveLosses,
        peakPortfolioUSD: this.state.peakPortfolioUSD,
        currentDrawdownPct: this.state.currentDrawdownPct,
        dailyTradeCount: this.state.dailyTradeCount,
        isHalted: this.state.isHalted,
        haltReason: this.state.haltReason,
        cooldownUntil: this.state.cooldownUntil,
        lastExecutionFailedAt: this.state.lastExecutionFailedAt,
        dailyStartEquityUSD: this.state.dailyStartEquityUSD,
      },
      openTrades: Array.from(this.openTrades.entries()).map(([id, meta]) => ({
        id,
        sizeUSD: meta.sizeUSD,
        entryPrice: meta.entryPrice,
      })),
    };
  }

  hydrate(input: Partial<CanonicalRiskPersistedState> | undefined): void {
    if (!input || typeof input !== "object") return;
    const state = input.state || {};
    this.state = {
      tradingDay:
        typeof state.tradingDay === "string" && state.tradingDay.length > 0
          ? state.tradingDay
          : this.dayStamp(),
      dailyPnlUSD: this.safeNumber(state.dailyPnlUSD),
      dailyPnlPct: this.safeNumber(state.dailyPnlPct),
      dailySpentSOL: this.safeNumber(state.dailySpentSOL),
      consecutiveLosses: Math.max(0, Math.floor(this.safeNumber(state.consecutiveLosses))),
      peakPortfolioUSD: this.safeNumber(state.peakPortfolioUSD),
      currentDrawdownPct: this.safeNumber(state.currentDrawdownPct),
      dailyTradeCount: Math.max(0, Math.floor(this.safeNumber(state.dailyTradeCount))),
      isHalted: state.isHalted === true,
      haltReason: typeof state.haltReason === "string" ? state.haltReason : undefined,
      cooldownUntil: this.safeNumber(state.cooldownUntil),
      lastExecutionFailedAt: this.safeOptionalNumber(state.lastExecutionFailedAt),
      dailyStartEquityUSD: this.safeNumber(state.dailyStartEquityUSD),
    };

    this.openTrades.clear();
    for (const item of input.openTrades || []) {
      if (!item || typeof item.id !== "string" || !item.id) continue;
      this.openTrades.set(item.id, {
        sizeUSD: this.safeNumber(item.sizeUSD),
        entryPrice: this.safeNumber(item.entryPrice),
      });
    }
    this.refreshDailyPnlPct();
  }

  resetForTests(): void {
    this.openTrades.clear();
    this.brainSecondary = undefined;
    this.proSecondary = undefined;
    this.state = {
      tradingDay: this.dayStamp(),
      dailyPnlUSD: 0,
      dailyPnlPct: 0,
      dailySpentSOL: 0,
      consecutiveLosses: 0,
      peakPortfolioUSD: 0,
      currentDrawdownPct: 0,
      dailyTradeCount: 0,
      isHalted: false,
      haltReason: undefined,
      cooldownUntil: 0,
      lastExecutionFailedAt: undefined,
      dailyStartEquityUSD: 0,
    };
  }

  private refreshDailyPnlPct(): void {
    if (this.state.dailyStartEquityUSD > 0) {
      this.state.dailyPnlPct = (this.state.dailyPnlUSD / this.state.dailyStartEquityUSD) * 100;
    } else {
      this.state.dailyPnlPct = 0;
    }
  }

  private dayStamp(now = Date.now()): string {
    return new Date(now).toISOString().split("T")[0];
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private round4(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  private safeNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  private safeOptionalNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }
}

export const canonicalRiskState = new CanonicalRiskStateStore();

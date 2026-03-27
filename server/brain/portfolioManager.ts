import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { conn, loadWallet } from "../utils/solanaAdapter";
import { marketScanner } from "./marketScanner";

export interface OpenPosition {
  id: string;
  token: string;
  mint: string;
  quantity: number;
  entryPriceUSD: number;
  entryNotionalUSD: number;
  entryFeeUSD: number;
  realizedFeesUSD: number;
  entryTime: number;
  currentPriceUSD: number;
  markValueUSD: number;
  unrealizedPnlUSD: number;
  realizedPnlUSD: number;
  takeProfitPct: number;
  stopLossPct: number;
  trailingStopActivationPct: number;
  highWatermarkPriceUSD: number;
  journalId?: string;
  strategy?: string;
  fillSource?: "onchain" | "quote";
  lastTxHash?: string;
  closed: boolean;
}

export interface PortfolioSnapshot {
  asOf: number;
  cashSOL: number;
  cashUSD: number;
  positionsValueUSD: number;
  totalEquityUSD: number;
  dailyRealizedPnlUSD: number;
  totalUnrealizedPnlUSD: number;
  openPositions: OpenPosition[];
}

class PortfolioManager {
  private positions: Map<string, OpenPosition> = new Map();
  private idCounter = 1;
  private dailyRealizedPnlUSD = 0;
  private dailyStamp = this.today();
  private lastSnapshot: PortfolioSnapshot = {
    asOf: Date.now(),
    cashSOL: 0,
    cashUSD: 0,
    positionsValueUSD: 0,
    totalEquityUSD: 0,
    dailyRealizedPnlUSD: 0,
    totalUnrealizedPnlUSD: 0,
    openPositions: [],
  };

  async refreshSnapshot(): Promise<PortfolioSnapshot> {
    this.rollDayIfNeeded();

    const wallet = loadWallet();
    const connection = conn();
    const lamports = await connection.getBalance(wallet.publicKey, "confirmed");
    const cashSOL = lamports / 1e9;
    const solPrice = await marketScanner.fetchPriceByMint(
      "So11111111111111111111111111111111111111112"
    );
    const cashUSD = cashSOL * solPrice;

    let positionsValueUSD = 0;
    let totalUnrealizedPnlUSD = 0;
    for (const position of Array.from(this.positions.values())) {
      if (position.closed) continue;
      const markPrice = await marketScanner.fetchPriceByMint(position.mint);
      position.currentPriceUSD = markPrice;
      if (markPrice > position.highWatermarkPriceUSD) {
        position.highWatermarkPriceUSD = markPrice;
      }

      const qty = await this.getWalletTokenBalance(position.mint);
      position.quantity = qty;
      position.markValueUSD = qty * markPrice;
      position.unrealizedPnlUSD = position.markValueUSD - position.entryNotionalUSD;

      positionsValueUSD += position.markValueUSD;
      totalUnrealizedPnlUSD += position.unrealizedPnlUSD;
    }

    const openPositions = Array.from(this.positions.values()).filter((p) => !p.closed);
    this.lastSnapshot = {
      asOf: Date.now(),
      cashSOL,
      cashUSD,
      positionsValueUSD,
      totalEquityUSD: cashUSD + positionsValueUSD,
      dailyRealizedPnlUSD: this.dailyRealizedPnlUSD,
      totalUnrealizedPnlUSD,
      openPositions: openPositions.map((p) => ({ ...p })),
    };
    return this.lastSnapshot;
  }

  getSnapshotSync(): PortfolioSnapshot {
    return {
      ...this.lastSnapshot,
      openPositions: this.lastSnapshot.openPositions.map((p) => ({ ...p })),
    };
  }

  exportState(): {
    positions: OpenPosition[];
    dailyRealizedPnlUSD: number;
    idCounter: number;
    dailyStamp: string;
    lastSnapshot: PortfolioSnapshot;
  } {
    return {
      positions: Array.from(this.positions.values()).map((p) => ({ ...p })),
      dailyRealizedPnlUSD: this.dailyRealizedPnlUSD,
      idCounter: this.idCounter,
      dailyStamp: this.dailyStamp,
      lastSnapshot: this.getSnapshotSync(),
    };
  }

  hydrate(state: {
    positions: OpenPosition[];
    dailyRealizedPnlUSD?: number;
    idCounter?: number;
    dailyStamp?: string;
    lastSnapshot?: PortfolioSnapshot;
  }): void {
    this.positions.clear();
    for (const position of state.positions || []) {
      if (position?.mint) {
        this.positions.set(position.mint, { ...position });
      }
    }
    if (typeof state.dailyRealizedPnlUSD === "number" && Number.isFinite(state.dailyRealizedPnlUSD)) {
      this.dailyRealizedPnlUSD = state.dailyRealizedPnlUSD;
    }
    if (typeof state.idCounter === "number" && Number.isFinite(state.idCounter) && state.idCounter > 0) {
      this.idCounter = Math.floor(state.idCounter);
    } else {
      const maxId = Array.from(this.positions.values()).reduce((max, pos) => {
        const n = Number((pos.id || "").replace(/^L/, ""));
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);
      this.idCounter = maxId + 1;
    }
    this.dailyStamp = state.dailyStamp || this.today();
    this.lastSnapshot = state.lastSnapshot
      ? {
          ...state.lastSnapshot,
          openPositions: (state.lastSnapshot.openPositions || []).map((p) => ({ ...p })),
        }
      : {
          ...this.lastSnapshot,
          asOf: Date.now(),
          dailyRealizedPnlUSD: this.dailyRealizedPnlUSD,
          openPositions: this.getOpenPositions(),
        };
  }

  async registerEntry(params: {
    token: string;
    mint: string;
    usdNotional: number;
    entryPriceUSD: number;
    takeProfitPct: number;
    stopLossPct: number;
    trailingStopActivationPct: number;
    journalId?: string;
    strategy?: string;
    executedQuantity?: number;
    executedNotionalUSD?: number;
    entryFeeUSD?: number;
    fillSource?: "onchain" | "quote";
    txHash?: string;
  }): Promise<OpenPosition> {
    const entryFeeUSD = Math.max(0, params.entryFeeUSD || 0);
    const executedNotionalUSD = Math.max(
      0,
      params.executedNotionalUSD && Number.isFinite(params.executedNotionalUSD)
        ? params.executedNotionalUSD
        : params.usdNotional
    );
    const entryNotionalUSD = executedNotionalUSD + entryFeeUSD;
    const quantityFromInput =
      params.executedQuantity && Number.isFinite(params.executedQuantity)
        ? params.executedQuantity
        : params.entryPriceUSD > 0
          ? executedNotionalUSD / params.entryPriceUSD
          : 0;
    const quantity = Math.max(0, quantityFromInput);
    const impliedEntryPriceUSD =
      quantity > 0 && entryNotionalUSD > 0 ? entryNotionalUSD / quantity : params.entryPriceUSD;

    const existing = this.positions.get(params.mint);
    if (existing && !existing.closed) {
      const prevQty = existing.quantity;
      const prevNotional = existing.entryNotionalUSD;
      const nextQty = Math.max(0, prevQty + quantity);
      const nextNotional = Math.max(0, prevNotional + entryNotionalUSD);
      existing.quantity = nextQty;
      existing.entryNotionalUSD = nextNotional;
      existing.entryFeeUSD += entryFeeUSD;
      existing.entryPriceUSD = nextQty > 0 ? nextNotional / nextQty : existing.entryPriceUSD;
      existing.currentPriceUSD = impliedEntryPriceUSD || existing.currentPriceUSD;
      existing.markValueUSD = existing.currentPriceUSD * existing.quantity;
      existing.unrealizedPnlUSD = existing.markValueUSD - existing.entryNotionalUSD;
      existing.highWatermarkPriceUSD = Math.max(
        existing.highWatermarkPriceUSD,
        existing.currentPriceUSD
      );
      existing.journalId = params.journalId || existing.journalId;
      existing.strategy = params.strategy || existing.strategy;
      existing.fillSource = params.fillSource || existing.fillSource;
      existing.lastTxHash = params.txHash || existing.lastTxHash;
      await this.refreshSnapshot();
      return { ...existing };
    }

    const id = `L${String(this.idCounter++).padStart(4, "0")}`;
    const position: OpenPosition = {
      id,
      token: params.token,
      mint: params.mint,
      quantity,
      entryPriceUSD: impliedEntryPriceUSD,
      entryNotionalUSD,
      entryFeeUSD,
      realizedFeesUSD: 0,
      entryTime: Date.now(),
      currentPriceUSD: impliedEntryPriceUSD,
      markValueUSD: entryNotionalUSD,
      unrealizedPnlUSD: 0,
      realizedPnlUSD: 0,
      takeProfitPct: params.takeProfitPct,
      stopLossPct: params.stopLossPct,
      trailingStopActivationPct: params.trailingStopActivationPct,
      highWatermarkPriceUSD: impliedEntryPriceUSD,
      journalId: params.journalId,
      strategy: params.strategy,
      fillSource: params.fillSource,
      lastTxHash: params.txHash,
      closed: false,
    };

    this.positions.set(params.mint, position);
    await this.refreshSnapshot();
    return { ...position };
  }

  getOpenPositionByMint(mint: string): OpenPosition | undefined {
    const p = this.positions.get(mint);
    if (!p || p.closed) return undefined;
    return { ...p };
  }

  getOpenPositions(): OpenPosition[] {
    return Array.from(this.positions.values())
      .filter((p) => !p.closed)
      .map((p) => ({ ...p }));
  }

  markRealizedPnl(mint: string, realizedPnlUSD: number): void {
    this.rollDayIfNeeded();
    const position = this.positions.get(mint);
    if (position) {
      position.realizedPnlUSD += realizedPnlUSD;
    }
    this.dailyRealizedPnlUSD += realizedPnlUSD;
  }

  recordExit(params: {
    mint: string;
    soldQuantity: number;
    grossProceedsUSD: number;
    feeUSD?: number;
  }): {
    realizedPnlUSD: number;
    soldQuantity: number;
    remainingQuantity: number;
    costBasisSoldUSD: number;
    netProceedsUSD: number;
    exitPriceUSD: number;
    closed: boolean;
  } | null {
    this.rollDayIfNeeded();
    const position = this.positions.get(params.mint);
    if (!position) {
      return null;
    }

    const requestedQty = Number.isFinite(params.soldQuantity) ? params.soldQuantity : 0;
    const soldQuantity = Math.max(0, Math.min(position.quantity, requestedQty));
    if (soldQuantity <= 0) {
      return {
        realizedPnlUSD: 0,
        soldQuantity: 0,
        remainingQuantity: position.quantity,
        costBasisSoldUSD: 0,
        netProceedsUSD: 0,
        exitPriceUSD: position.currentPriceUSD,
        closed: position.closed,
      };
    }

    const feeUSD = Math.max(0, params.feeUSD || 0);
    const grossProceedsUSD = Math.max(0, params.grossProceedsUSD || 0);
    const netProceedsUSD = Math.max(0, grossProceedsUSD - feeUSD);
    const costPerToken = position.quantity > 0 ? position.entryNotionalUSD / position.quantity : 0;
    const costBasisSoldUSD = soldQuantity * costPerToken;
    const realizedPnlUSD = netProceedsUSD - costBasisSoldUSD;

    position.realizedPnlUSD += realizedPnlUSD;
    position.realizedFeesUSD += feeUSD;
    this.dailyRealizedPnlUSD += realizedPnlUSD;

    const remainingQuantity = Math.max(0, position.quantity - soldQuantity);
    if (remainingQuantity <= 0.00000001) {
      position.closed = true;
      position.quantity = 0;
      position.entryNotionalUSD = 0;
      position.markValueUSD = 0;
      position.unrealizedPnlUSD = 0;
      return {
        realizedPnlUSD,
        soldQuantity,
        remainingQuantity: 0,
        costBasisSoldUSD,
        netProceedsUSD,
        exitPriceUSD: soldQuantity > 0 ? grossProceedsUSD / soldQuantity : position.currentPriceUSD,
        closed: true,
      };
    }

    position.quantity = remainingQuantity;
    position.entryNotionalUSD = Math.max(0, position.entryNotionalUSD - costBasisSoldUSD);
    position.markValueUSD = Math.max(0, position.currentPriceUSD * remainingQuantity);
    position.unrealizedPnlUSD = position.markValueUSD - position.entryNotionalUSD;

    return {
      realizedPnlUSD,
      soldQuantity,
      remainingQuantity,
      costBasisSoldUSD,
      netProceedsUSD,
      exitPriceUSD: soldQuantity > 0 ? grossProceedsUSD / soldQuantity : position.currentPriceUSD,
      closed: false,
    };
  }

  closePosition(mint: string): void {
    const position = this.positions.get(mint);
    if (!position) return;
    position.closed = true;
  }

  private async getWalletTokenBalance(mint: string): Promise<number> {
    try {
      const wallet = loadWallet();
      const ata = getAssociatedTokenAddressSync(new PublicKey(mint), wallet.publicKey);
      const balance = await conn().getTokenAccountBalance(ata, "confirmed");
      const amount = Number(balance.value.uiAmountString || "0");
      return Number.isFinite(amount) ? amount : 0;
    } catch {
      return 0;
    }
  }

  private rollDayIfNeeded(): void {
    const today = this.today();
    if (today === this.dailyStamp) return;
    this.dailyStamp = today;
    this.dailyRealizedPnlUSD = 0;
  }

  private today(): string {
    return new Date().toISOString().split("T")[0];
  }
}

export const portfolioManager = new PortfolioManager();

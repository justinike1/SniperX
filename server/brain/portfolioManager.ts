import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import { conn, loadWallet } from "../utils/solanaAdapter";
import { marketScanner } from "./marketScanner";

interface OpenPosition {
  id: string;
  token: string;
  mint: string;
  quantity: number;
  entryPriceUSD: number;
  entryNotionalUSD: number;
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
  closed: boolean;
}

interface PortfolioSnapshot {
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
  }): Promise<OpenPosition> {
    const quantity = params.entryPriceUSD > 0 ? params.usdNotional / params.entryPriceUSD : 0;
    const id = `L${String(this.idCounter++).padStart(4, "0")}`;
    const position: OpenPosition = {
      id,
      token: params.token,
      mint: params.mint,
      quantity,
      entryPriceUSD: params.entryPriceUSD,
      entryNotionalUSD: params.usdNotional,
      entryTime: Date.now(),
      currentPriceUSD: params.entryPriceUSD,
      markValueUSD: params.usdNotional,
      unrealizedPnlUSD: 0,
      realizedPnlUSD: 0,
      takeProfitPct: params.takeProfitPct,
      stopLossPct: params.stopLossPct,
      trailingStopActivationPct: params.trailingStopActivationPct,
      highWatermarkPriceUSD: params.entryPriceUSD,
      journalId: params.journalId,
      strategy: params.strategy,
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

  recordExit(mint: string, fraction: number, realizedPnlUSD: number): void {
    this.rollDayIfNeeded();
    const position = this.positions.get(mint);
    if (!position) {
      this.dailyRealizedPnlUSD += realizedPnlUSD;
      return;
    }

    position.realizedPnlUSD += realizedPnlUSD;
    this.dailyRealizedPnlUSD += realizedPnlUSD;

    const clampedFraction = Math.max(0, Math.min(1, fraction));
    if (clampedFraction >= 0.999) {
      position.closed = true;
      position.quantity = 0;
      position.markValueUSD = 0;
      position.unrealizedPnlUSD = 0;
      return;
    }

    const remaining = 1 - clampedFraction;
    position.entryNotionalUSD = Math.max(0, position.entryNotionalUSD * remaining);
    position.quantity = Math.max(0, position.quantity * remaining);
    position.markValueUSD = Math.max(0, position.markValueUSD * remaining);
    position.unrealizedPnlUSD = position.markValueUSD - position.entryNotionalUSD;
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

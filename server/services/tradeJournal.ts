import type { Action } from "../ultimate/types";
import type { RiskBlockReason } from "../ultimate/risk";

export type TradeAttemptStatus = "ATTEMPTED" | "BLOCKED" | "EXECUTED" | "FAILED";

export interface TradeJournalEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  tokenMint: string;
  requestedAction: Action;
  executedAction?: Action;
  status: TradeAttemptStatus;
  confidence: number;
  requestedSizeSOL: number;
  executedSizeSOL: number;
  requestReason?: string;
  executionReason?: string;
  blockReasons: RiskBlockReason[];
  txid?: string;
  realizedPnlUSD?: number;
  feesUSD?: number;
}

interface TradeAttemptInput {
  tokenMint: string;
  action: Action;
  requestedSizeSOL: number;
  confidence: number;
  reason?: string;
}

interface TradeAttemptCompletion {
  success: boolean;
  executedAction?: Action;
  executedSizeSOL: number;
  txid?: string;
  executionReason?: string;
  blockReasons?: RiskBlockReason[];
}

class TradeJournalService {
  private readonly entries: TradeJournalEntry[] = [];
  private nextId = 1;

  logAttempt(input: TradeAttemptInput): string {
    const now = Date.now();
    const entry: TradeJournalEntry = {
      id: `PRO-${String(this.nextId++).padStart(6, "0")}`,
      createdAt: now,
      updatedAt: now,
      tokenMint: input.tokenMint,
      requestedAction: input.action,
      status: "ATTEMPTED",
      confidence: this.round4(this.normalizeConfidence(input.confidence)),
      requestedSizeSOL: this.round6(Math.max(0, input.requestedSizeSOL)),
      executedSizeSOL: 0,
      requestReason: input.reason,
      blockReasons: [],
    };

    this.entries.push(entry);
    return entry.id;
  }

  completeAttempt(id: string, completion: TradeAttemptCompletion): TradeJournalEntry | undefined {
    const entry = this.entries.find((item) => item.id === id);
    if (!entry) return undefined;

    entry.updatedAt = Date.now();
    entry.executedAction = completion.executedAction;
    entry.executedSizeSOL = this.round6(Math.max(0, completion.executedSizeSOL));
    entry.txid = completion.txid;
    entry.executionReason = completion.executionReason;
    entry.blockReasons = completion.blockReasons ? [...completion.blockReasons] : [];

    if (completion.success) {
      entry.status = "EXECUTED";
    } else if (entry.blockReasons.length > 0) {
      entry.status = "BLOCKED";
    } else {
      entry.status = "FAILED";
    }

    return { ...entry, blockReasons: [...entry.blockReasons] };
  }

  logOutcome(id: string, realizedPnlUSD: number, feesUSD = 0): TradeJournalEntry | undefined {
    const entry = this.entries.find((item) => item.id === id);
    if (!entry) return undefined;

    entry.realizedPnlUSD = this.round2(realizedPnlUSD);
    entry.feesUSD = this.round2(feesUSD);
    entry.updatedAt = Date.now();
    return { ...entry, blockReasons: [...entry.blockReasons] };
  }

  getEntries(): TradeJournalEntry[] {
    return this.entries.map((entry) => ({
      ...entry,
      blockReasons: [...entry.blockReasons],
    }));
  }

  getLastTrades(limit = 10): TradeJournalEntry[] {
    return this.getEntries().slice(-limit).reverse();
  }

  private normalizeConfidence(confidence: number): number {
    const normalized = confidence > 1 ? confidence / 100 : confidence;
    return Math.max(0, Math.min(1, normalized));
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private round4(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  private round6(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
}

export const tradeJournal = new TradeJournalService();

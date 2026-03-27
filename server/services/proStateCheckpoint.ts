import fs from "fs";
import path from "path";
import type { TradeJournalEntry } from "./tradeJournal";
import { tradeJournal } from "./tradeJournal";
import { portfolioManager, type OpenPosition, type PortfolioSnapshot } from "../brain/portfolioManager";
import {
  canonicalRiskState,
  type CanonicalRiskPersistedState,
} from "../risk/canonicalRiskState";

interface PersistedProState {
  version: 1;
  updatedAt: number;
  tradeJournal: {
    entries: TradeJournalEntry[];
  };
  portfolio: {
    positions: OpenPosition[];
    dailyRealizedPnlUSD: number;
    idCounter?: number;
    dailyStamp?: string;
    lastSnapshot?: PortfolioSnapshot;
  };
  canonicalRisk: CanonicalRiskPersistedState;
}

const STATE_DIR = path.resolve(process.env.PRO_STATE_DIR || "./state");
const STATE_FILE = path.join(STATE_DIR, "pro-state.json");

let started = false;
let saveTimer: NodeJS.Timeout | null = null;
let unloadBound = false;

export function initializeProStateCheckpoint(): void {
  if (started) return;
  started = true;
  loadStateIfExists();
  bindShutdownHooks();
}

export function queueProStateSave(delayMs = 250): void {
  if (!started) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveState();
  }, delayMs);
}

export function flushProStateSave(): void {
  if (!started) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveState();
}

export function reloadProStateFromDiskForTests(): void {
  loadStateIfExists();
}

function saveState(): void {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const payload: PersistedProState = {
      version: 1,
      updatedAt: Date.now(),
      tradeJournal: {
        entries: tradeJournal.getEntries(),
      },
      portfolio: exportPortfolioState(),
      canonicalRisk: canonicalRiskState.exportState(),
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (error) {
    console.error(
      `[state] failed to save pro checkpoint: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
}

function loadStateIfExists(): void {
  if (!fs.existsSync(STATE_FILE)) return;
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<PersistedProState>;
    if (!parsed || parsed.version !== 1) return;

    tradeJournal.hydrate(parsed.tradeJournal?.entries || []);
    portfolioManager.hydrate({
      positions: parsed.portfolio?.positions || [],
      dailyRealizedPnlUSD: parsed.portfolio?.dailyRealizedPnlUSD,
      idCounter: parsed.portfolio?.idCounter,
      dailyStamp: parsed.portfolio?.dailyStamp,
      lastSnapshot: parsed.portfolio?.lastSnapshot,
    });
    canonicalRiskState.hydrate(parsed.canonicalRisk);

    console.log(
      `[state] restored pro checkpoint (${(parsed.tradeJournal?.entries || []).length} journal entries)`
    );
  } catch (error) {
    console.error(
      `[state] failed to load pro checkpoint: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
}

function exportPortfolioState(): PersistedProState["portfolio"] {
  const exported = portfolioManager.exportState();
  return {
    positions: exported.positions,
    dailyRealizedPnlUSD: exported.dailyRealizedPnlUSD,
    idCounter: exported.idCounter,
    dailyStamp: exported.dailyStamp,
    lastSnapshot: exported.lastSnapshot,
  };
}

function bindShutdownHooks(): void {
  if (unloadBound) return;
  unloadBound = true;

  const flush = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveState();
  };

  process.once("beforeExit", flush);
  process.once("SIGINT", () => {
    flush();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    flush();
    process.exit(0);
  });
}

// Test helpers to validate persistence behavior without process restarts.
export function forceSaveProStateForTests(): void {
  saveState();
}

export function forceLoadProStateForTests(): void {
  loadStateIfExists();
}

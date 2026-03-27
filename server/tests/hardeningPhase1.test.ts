import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

import {
  isLiveTradingEnabled,
  assertLiveTradingEnabled,
  LIVE_TRADING_DISABLED_REASON,
} from "../utils/liveTradingGuard";
import { loadWallet, resetWalletCacheForTests } from "../utils/solanaAdapter";
import { UltimateOrchestrator } from "../ultimate/orchestrator";
import type { StrategySignal, TradeGateway, UltConfig } from "../ultimate/types";

const DEFAULT_CFG: UltConfig = {
  maxPerTradeSOL: 0.2,
  maxDailySOL: 1,
  minWalletSOL: 0.01,
  maxVolPct: 100,
  maxSlippagePct: 5,
  kellyCapPct: 0.5,
  riskOffDDPct: 20,
  blockDDPct: 40,
};

function withEnv<T>(updates: Record<string, string | undefined>, fn: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(updates)) {
    previous[key] = process.env[key];
    const value = updates[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(updates)) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withTempWallet<T>(
  bytes: number[],
  fn: (walletPath: string) => Promise<T> | T
): Promise<T> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sniperx-hardening-"));
  const walletPath = path.join(tmpDir, "phantom_key.json");
  fs.writeFileSync(walletPath, JSON.stringify(bytes), "utf-8");
  try {
    return await fn(walletPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function testWalletLoadsFromConfiguredPath(): Promise<void> {
  const bytes64 = Array.from(Keypair.generate().secretKey);
  await withTempWallet(bytes64, async (walletPath) => {
    withEnv(
      {
        WALLET_PRIVATE_KEY_PATH: walletPath,
        WALLET_PRIVATE_KEY_BASE58: undefined,
      },
      () => {
        resetWalletCacheForTests();
        const wallet = loadWallet();
        assert.ok(wallet.publicKey.toBase58().length > 0, "wallet public key should be derivable");
      }
    );
  });
}

async function testWalletBase58Fallback(): Promise<void> {
  const secret = Keypair.generate().secretKey;
  withEnv(
    {
      WALLET_PRIVATE_KEY_PATH: "./missing-wallet-for-test.json",
      WALLET_PRIVATE_KEY_BASE58: bs58.encode(secret),
    },
    () => {
      resetWalletCacheForTests();
      const wallet = loadWallet();
      assert.ok(wallet.publicKey.toBase58().length > 0, "wallet should load from base58 fallback");
    }
  );
}

function testLiveTradingGuardBehavior(): void {
  withEnv(
    {
      ENABLE_LIVE_TRADING: "false",
      LIVE_TRADING_CONFIRMATION: "I_UNDERSTAND",
    },
    () => {
      assert.equal(isLiveTradingEnabled(), false, "live trading should be disabled");
      assert.throws(
        () => assertLiveTradingEnabled("guard-test"),
        (error: unknown) =>
          error instanceof Error &&
          error.message.includes(LIVE_TRADING_DISABLED_REASON),
        "guard should throw a structured disabled reason"
      );
    }
  );

  withEnv(
    {
      ENABLE_LIVE_TRADING: "true",
      LIVE_TRADING_CONFIRMATION: "I_UNDERSTAND",
    },
    () => {
      assert.equal(isLiveTradingEnabled(), true, "live trading should be enabled only with both flags");
    }
  );
}

async function testManualRequestedSizeSolSemantics(): Promise<void> {
  const executions: Array<{ tokenMint: string; amountSol: number }> = [];
  const gateway: TradeGateway = {
    buy: async (tokenMint, amountSol) => {
      executions.push({ tokenMint, amountSol });
      return { success: true, txid: "TEST_TX" };
    },
    sell: async () => ({ success: false, reason: "NOT_USED" }),
    short: async () => ({ success: false, reason: "NOT_USED" }),
    cover: async () => ({ success: false, reason: "NOT_USED" }),
  };

  const orchestrator = new UltimateOrchestrator(DEFAULT_CFG, gateway);
  orchestrator.onCandle("MINT_A", 1, 10);
  const signals: StrategySignal[] = [
    {
      strategy: "TEST",
      tokenMint: "MINT_A",
      action: "BUY",
      confidence: 0.9,
      requestedSizeSOL: 0.031,
      reason: "manual sizing semantic test",
      ts: Date.now(),
    },
  ];

  const decision = await orchestrator.onSignals(
    { address: "wallet", balanceSOL: 10, dailySpentSOL: 0 },
    signals
  );
  assert.equal(decision.decided, "BUY");
  assert.ok(Math.abs(decision.sizeSOL - 0.031) <= 1e-9, "size should honor requestedSizeSOL");
  assert.ok(Math.abs((executions[0]?.amountSol || 0) - 0.031) <= 1e-9, "gateway buy should receive exact SOL size");
}

async function run(): Promise<void> {
  await testWalletLoadsFromConfiguredPath();
  await testWalletBase58Fallback();
  testLiveTradingGuardBehavior();
  await testManualRequestedSizeSolSemantics();
  console.log("hardeningPhase1 tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

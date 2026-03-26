import type { Express } from "express";
import { JupiterGateway } from "../ultimate/gateway/jupiterGateway";
import { UltimateOrchestrator } from "../ultimate/orchestrator";
import { loadWallet, conn } from "../utils/solanaAdapter";
import { sendTelegramAlert } from "../utils/telegramBotEnhanced";
import type { StrategySignal, UltConfig, WalletInfo } from "../ultimate/types";
import { backtester, riskManager, tradeJournal, performanceTracker } from "../brain/index";

const config: UltConfig = {
  maxPerTradeSOL: 0.005,
  maxDailySOL: 0.05,
  minWalletSOL: 0.015,
  maxVolPct: 25,
  maxSlippagePct: 5,
  kellyCapPct: 0.10,
  riskOffDDPct: 10,
  blockDDPct: 15,
};

const gateway = new JupiterGateway();
const orchestrator = new UltimateOrchestrator(config, gateway);
let currentEquity = 0;

export function registerRoutes(app: Express) {

  app.post('/api/pro/trade', async (req, res) => {
    try {
      const { signals, tokenMint, action, confidence } = req.body;

      const wallet = loadWallet();
      const balance = await conn().getBalance(wallet.publicKey);
      const balanceSOL = balance / 1e9;
      currentEquity = balanceSOL;

      const walletInfo: WalletInfo = {
        address: wallet.publicKey.toString(),
        balanceSOL,
        dailySpentSOL: 0,
      };

      let strategySignals: StrategySignal[];
      if (signals) {
        strategySignals = signals;
      } else {
        strategySignals = [{
          strategy: "MANUAL",
          tokenMint: tokenMint || "unknown",
          action: action || "BUY",
          confidence: confidence || 0.7,
          reason: "Manual trade request",
        }];
      }

      if (tokenMint && req.body.price) {
        orchestrator.onCandle(tokenMint, req.body.price, currentEquity);
      }

      const decision = await orchestrator.onSignals(walletInfo, strategySignals);

      res.json({
        success: decision.decided !== "HOLD",
        decision: decision.decided,
        sizeSOL: decision.sizeSOL,
        reason: decision.reason,
        config: {
          maxPerTrade: config.maxPerTradeSOL,
          maxDaily: config.maxDailySOL,
          minWallet: config.minWalletSOL,
        },
        wallet: {
          balance: balanceSOL,
          decision: decision.decided,
          size: decision.sizeSOL,
        },
      });
    } catch (error) {
      console.error('Trade error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/api/pro/liquidate-bonk', async (req, res) => {
    try {
      const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

      const wallet = loadWallet();
      const { getAccount, getAssociatedTokenAddress } = await import('@solana/spl-token');
      const { PublicKey } = await import('@solana/web3.js');

      let bonkAmount = 0;
      try {
        const bonkMint = new PublicKey(BONK_MINT);
        const ata = await getAssociatedTokenAddress(bonkMint, wallet.publicKey);
        const account = await getAccount(conn(), ata);
        bonkAmount = Number(account.amount) / (10 ** 5);
      } catch {
        return res.json({ success: false, message: 'No BONK tokens to liquidate' });
      }

      if (bonkAmount === 0) {
        return res.json({ success: false, message: 'No BONK tokens to liquidate' });
      }

      const result = await gateway.sell(BONK_MINT, bonkAmount);

      if (result.success) {
        sendTelegramAlert(
          `BONK liquidated: ${bonkAmount.toLocaleString()} BONK\nTx: https://solscan.io/tx/${result.txid}`
        );
        res.json({
          success: true,
          amount: bonkAmount,
          txid: result.txid,
          message: `Liquidated ${bonkAmount.toLocaleString()} BONK`,
        });
      } else {
        res.json({
          success: false,
          error: result.reason,
          message: `Failed: ${result.reason}`,
        });
      }
    } catch (error) {
      console.error('BONK liquidation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get('/api/pro/status', async (req, res) => {
    try {
      const wallet = loadWallet();
      const balance = await conn().getBalance(wallet.publicKey);
      const balanceSOL = balance / 1e9;
      const risk = riskManager.getState();
      const paperStats = backtester.getStats();
      const perf = performanceTracker.compute(tradeJournal.getAll());

      res.json({
        success: true,
        wallet: wallet.publicKey.toString(),
        balance: balanceSOL,
        mode: backtester.getMode(),
        risk: {
          halted: risk.isHalted,
          haltReason: risk.haltReason,
          dailyPnlUSD: risk.dailyPnlUSD,
          drawdownPct: risk.currentDrawdownPct,
          consecutiveLosses: risk.consecutiveLosses,
          openPositions: risk.tradesOpenCount,
        },
        paper: {
          trades: paperStats.totalTrades,
          winRate: paperStats.winRate,
          profitFactor: paperStats.profitFactor,
          readyForLive: paperStats.isReadyForLive,
        },
        performance: {
          totalTrades: perf.totalTrades,
          winRate: perf.winRate,
          totalPnlUSD: perf.totalPnlUSD,
          profitFactor: perf.profitFactor,
        },
        config: {
          maxPerTrade: config.maxPerTradeSOL,
          maxDaily: config.maxDailySOL,
          minWallet: config.minWalletSOL,
          maxVolatility: config.maxVolPct,
          maxSlippage: config.maxSlippagePct,
          kellyCapPct: config.kellyCapPct,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

export { registerRoutes as registerProfessionalRoutes };

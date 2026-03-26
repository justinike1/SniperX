/**
 * BRAIN ORCHESTRATOR
 * Ties all 9 modules together into one autonomous decision loop.
 *
 * Flow:
 *   marketScanner finds opportunities
 *   → regimeDetector classifies market backdrop
 *   → safetyFilters hard-rejects scams/rugs
 *   → decisionEngine scores 0-100 against threshold
 *   → riskManager checks daily/drawdown limits and sizes position
 *   → backtester routes to paper or live
 *   → executionEngine sends the transaction
 *   → tradeJournal records everything
 *   → performanceTracker updates metrics
 *   → self-review after every close
 */
import { marketScanner } from './marketScanner';
import { regimeDetector } from './regimeDetector';
import { decisionEngine } from './decisionEngine';
import { riskManager } from './riskManager';
import { safetyFilters } from './safetyFilters';
import { executionEngine } from './executionEngine';
import { tradeJournal } from './tradeJournal';
import { performanceTracker } from './performanceTracker';
import { backtester } from './backtester';
import { TokenOpportunity, TradeDecision } from './types';
import { sendTelegramAlert } from '../utils/telegramBotEnhanced';
import { portfolioManager } from './portfolioManager';
import { livePositionManager } from './livePositionManager';
import { strategyAnalytics } from './strategyAnalytics';
const SOL_MINT = "So11111111111111111111111111111111111111112";

class BrainOrchestrator {
  private running = false;
  private autoPilot = false; // if true, executes trades automatically

  // ─── Lifecycle ────────────────────────────────────────────────────

  async start(autoPilot = false) {
    if (this.running) return;
    this.running = true;
    this.autoPilot = autoPilot;

    regimeDetector.start();
    backtester.startMonitor();
    livePositionManager.start();

    // Hook scanner to full pipeline
    marketScanner.start(async (opp) => {
      if (this.autoPilot) await this.evaluate(opp);
    });

    console.log(`Brain started | autopilot=${autoPilot ? 'ON' : 'OFF'} | mode=${backtester.getMode()}`);
    sendTelegramAlert(`Brain online\nAutoPilot: ${autoPilot ? 'ON' : 'OFF'} | Mode: ${backtester.getMode()}`);
  }

  stop() {
    marketScanner.stop();
    regimeDetector.stop();
    backtester.stopMonitor();
    livePositionManager.stop();
    this.running = false;
    console.log('Brain stopped');
  }

  enableAutoPilot() { this.autoPilot = true; console.log('AutoPilot enabled'); }
  disableAutoPilot() { this.autoPilot = false; console.log('AutoPilot disabled'); }
  isRunning() { return this.running; }
  isAutoPilot() { return this.autoPilot; }

  // ─── Main evaluation pipeline ─────────────────────────────────────

  async evaluate(opp: TokenOpportunity): Promise<void> {
    try {
      const regime = await regimeDetector.getRegime();
      const snapshot = await portfolioManager.refreshSnapshot();
      const portfolioUSD = snapshot.totalEquityUSD;

      // Initialize risk session with real wallet values
      riskManager.initSession(portfolioUSD);
      performanceTracker.recordEquityPoint(portfolioUSD);

      // Score it
      const decision = await decisionEngine.decide(opp, portfolioUSD);

      if (decision.action !== 'BUY') return; // not worth taking

      // Risk check
      const block = riskManager.canTrade(decision, portfolioUSD);
      if (block) {
        console.log(`Trade blocked for ${opp.token}: ${block}`);
        return;
      }

      // Size the position
      const finalSizeUSD = riskManager.sizeTrade(decision.sizeUSD, decision.confidence, portfolioUSD);
      if (finalSizeUSD <= 0) {
        console.log(`Trade skipped for ${opp.token}: risk-sized amount is zero`);
        return;
      }
      const volatility = marketScanner.getVolatility(opp.mint);
      const exits = riskManager.calculateExits(decision.confidence, volatility);

      // Alert user before executing
      const alert = this.buildTradeAlert(opp, decision, finalSizeUSD, exits);
      await sendTelegramAlert(alert);

      if (backtester.isPaper()) {
        // Paper mode
        const journalId = tradeJournal.open({
          token: opp.token,
          mint: opp.mint,
          action: 'BUY',
          sizeUSD: finalSizeUSD,
          entryPrice: opp.price,
          confidence: decision.confidence,
          regime: decision.regime,
          signals: decision.signals,
          breakdown: decision.breakdown || {},
          execution: { success: true },
          analytics: {
            score: decision.confidence,
            tokenAgeSec: decision.marketContext?.tokenAgeSec,
            liquidity: decision.marketContext?.liquidity,
            volume24h: decision.marketContext?.volume24h,
            priceImpactEstPct: decision.marketContext?.priceImpactEstPct,
            entryReason: decision.reason,
          },
        });

        const pt = backtester.openPaperTrade({
          token: opp.token,
          mint: opp.mint,
          entryPrice: opp.price,
          sizeUSD: finalSizeUSD,
          tpPct: exits.tp,
          slPct: exits.sl,
          confidence: decision.confidence,
          regime: decision.regime,
        });
        pt.journalId = journalId;

        riskManager.onTradeOpen(journalId, finalSizeUSD, opp.price);
        await sendTelegramAlert(`Paper trade opened: ${opp.token}\nTP: +${exits.tp}% | SL: -${exits.sl}%`);

      } else {
        // Live mode
        const execResult = await executionEngine.buy(opp.mint, finalSizeUSD);

        const journalId = tradeJournal.open({
          token: opp.token,
          mint: opp.mint,
          action: 'BUY',
          sizeUSD: finalSizeUSD,
          entryPrice: opp.price,
          confidence: decision.confidence,
          regime: decision.regime,
          signals: decision.signals,
          breakdown: decision.breakdown || {},
          execution: execResult,
          analytics: {
            score: decision.confidence,
            tokenAgeSec: decision.marketContext?.tokenAgeSec,
            liquidity: decision.marketContext?.liquidity,
            volume24h: decision.marketContext?.volume24h,
            priceImpactEstPct: decision.marketContext?.priceImpactEstPct,
            entryReason: decision.reason,
          },
        });

        if (execResult.success) {
          const solPriceUSD = await marketScanner.fetchPriceByMint(SOL_MINT);
          const executedQty =
            Number.isFinite(execResult.filledOutputAmount) ? (execResult.filledOutputAmount as number) : undefined;
          const executedNotionalUSD =
            Number.isFinite(execResult.filledInputAmount) && Number.isFinite(execResult.avgPriceUSD)
              ? (execResult.filledInputAmount as number) * (execResult.avgPriceUSD as number)
              : finalSizeUSD;
          const entryFeeUSD =
            Number.isFinite(execResult.networkFeeSOL)
              ? (execResult.networkFeeSOL as number) * (solPriceUSD > 0 ? solPriceUSD : 100)
              : 0;
          const effectiveEntryPrice =
            Number.isFinite(execResult.avgPriceUSD) && (execResult.avgPriceUSD as number) > 0
              ? (execResult.avgPriceUSD as number)
              : opp.price;
          await portfolioManager.registerEntry({
            token: opp.token,
            mint: opp.mint,
            usdNotional: finalSizeUSD,
            entryPriceUSD: effectiveEntryPrice,
            takeProfitPct: exits.tp,
            stopLossPct: exits.sl,
            trailingStopActivationPct: exits.trailingActivation,
            journalId,
            strategy: "BRAIN",
            executedQuantity: executedQty,
            executedNotionalUSD,
            entryFeeUSD,
            fillSource: execResult.fillSource,
            txHash: execResult.txHash,
          });
          riskManager.onTradeOpen(journalId, executedNotionalUSD + entryFeeUSD, effectiveEntryPrice);
          await sendTelegramAlert(`Trade executed: ${opp.token}\n$${finalSizeUSD.toFixed(2)} | TX: ${execResult.txHash?.slice(0, 20)}...\nTP: +${exits.tp}% | SL: -${exits.sl}%`);
        } else {
          await sendTelegramAlert(`Trade failed: ${opp.token}\n${execResult.error}`);
        }
      }

    } catch (e: any) {
      console.error(`Brain evaluation error for ${opp.token}:`, e.message);
    }
  }

  // ─── Manual commands ──────────────────────────────────────────────

  async manualScore(token: string): Promise<string> {
    const scan = await marketScanner.scanNow();
    const opp = scan.opportunities.find(o => o.token.toUpperCase() === token.toUpperCase())
      || scan.opportunities.find(o => o.mint.toLowerCase().includes(token.toLowerCase()));

    if (!opp) {
      // Build minimal opportunity from DexScreener for scoring
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${token}`, { signal: AbortSignal.timeout(8000) });
        const d = await r.json();
        const pair = (d.pairs || []).find((p: any) => p.chainId === 'solana' && (p.baseToken?.symbol?.toUpperCase() === token.toUpperCase() || p.baseToken?.address === token));
        if (!pair) return `Token "${token}" not found on Solana DEX pairs`;

        const manualOpp: TokenOpportunity = {
          token: pair.baseToken.symbol,
          mint: pair.baseToken.address,
          price: parseFloat(pair.priceUsd || '0'),
          priceChange5m: parseFloat(pair.priceChange?.m5 || '0'),
          priceChange1h: parseFloat(pair.priceChange?.h1 || '0'),
          priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
          volume24h: parseFloat(pair.volume?.h24 || '0'),
          liquidity: parseFloat(pair.liquidity?.usd || '0'),
          pairAddress: pair.pairAddress,
          source: 'manual',
          timestamp: Date.now(),
        };
        return await decisionEngine.explain(manualOpp);
      } catch { return `Could not find "${token}"`; }
    }
    return await decisionEngine.explain(opp);
  }

  async getFullStatus(): Promise<string> {
    const regime = await regimeDetector.getRegime();
    const snapshot = await portfolioManager.refreshSnapshot();
    const risk = riskManager.getState();
    const perf = performanceTracker.compute(tradeJournal.getAll());
    const scan = marketScanner.getLastScan();
    const paperStats = backtester.getStats();

    const regimeEmoji: Record<string, string> = { TREND_UP: 'UP', TREND_DOWN: 'DOWN', CHOP: 'CHOP', MANIA: 'MANIA', RISK_OFF: 'RISK_OFF' };

    return (
      `Brain Status\n\n` +
      `${regimeEmoji[regime.regime]} Regime: ${regime.regime} (${regime.confidence}% conf)\n` +
      `SOL: $${regime.solPrice.toFixed(2)} | Fear&Greed: ${regime.fearGreed}\n\n` +
      `Equity: $${snapshot.totalEquityUSD.toFixed(2)} (cash: $${snapshot.cashUSD.toFixed(2)}, positions: $${snapshot.positionsValueUSD.toFixed(2)})\n` +
      `Risk: ${risk.isHalted ? 'HALTED' : 'Active'}\n` +
      `Daily P&L: ${risk.dailyPnlUSD >= 0 ? '+' : ''}$${risk.dailyPnlUSD.toFixed(2)} | Losses: ${risk.consecutiveLosses}/${3}\n` +
      `Drawdown: ${risk.currentDrawdownPct.toFixed(1)}% | Open: ${risk.tradesOpenCount}\n\n` +
      `Performance (all-time):\n` +
      `${perf.totalTrades} trades | ${perf.winRate.toFixed(0)}% WR | PF: ${perf.profitFactor === Infinity ? '∞' : perf.profitFactor.toFixed(2)}\n\n` +
      `Mode: ${backtester.getMode()}\n` +
      (backtester.isPaper() ? `Paper: ${paperStats.totalTrades} trades | Ready: ${paperStats.isReadyForLive ? 'YES ✅' : 'NO ⏳'}\n\n` : '\n') +
      `Last scan: ${scan ? `${scan.tokenCount} tokens` : 'none'}\n` +
      `AutoPilot: ${this.autoPilot ? 'ON' : 'OFF'}`
    );
  }

  // ─── Internal ─────────────────────────────────────────────────────

  private buildTradeAlert(opp: TokenOpportunity, decision: TradeDecision, sizeUSD: number, exits: { tp: number; sl: number }): string {
    return (
      `Brain signal: ${opp.token}\n\n` +
      `Score: ${decision.confidence}/100 | Regime: ${decision.regime}\n` +
      `Price: $${opp.price.toFixed(6)}\n` +
      `Size: $${sizeUSD.toFixed(2)} (${backtester.getMode()})\n` +
      `TP: +${exits.tp}% | SL: -${exits.sl}%\n\n` +
      `Reason: ${decision.reason}`
    );
  }
}

export const brain = new BrainOrchestrator();

// Re-export all modules for direct import elsewhere
export { marketScanner } from './marketScanner';
export { regimeDetector } from './regimeDetector';
export { decisionEngine } from './decisionEngine';
export { riskManager } from './riskManager';
export { safetyFilters } from './safetyFilters';
export { executionEngine } from './executionEngine';
export { tradeJournal } from './tradeJournal';
export { performanceTracker } from './performanceTracker';
export { backtester } from './backtester';
export { portfolioManager } from './portfolioManager';
export { livePositionManager } from './livePositionManager';
export { strategyAnalytics } from './strategyAnalytics';

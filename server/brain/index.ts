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
import { loadWallet, conn } from '../utils/solanaAdapter';

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

    // Hook scanner to full pipeline
    marketScanner.start(async (opp) => {
      if (this.autoPilot) await this.evaluate(opp);
    });

    console.log(`🧠 Brain: Started | AutoPilot: ${autoPilot ? 'ON' : 'OFF'} | Mode: ${backtester.getMode()}`);
    sendTelegramAlert(`🧠 *Brain Online*\nAutoPilot: ${autoPilot ? 'ON 🤖' : 'OFF 👀'} | Mode: ${backtester.getMode()}`);
  }

  stop() {
    marketScanner.stop();
    regimeDetector.stop();
    backtester.stopMonitor();
    this.running = false;
    console.log('🧠 Brain: Stopped');
  }

  enableAutoPilot() { this.autoPilot = true; console.log('🤖 AutoPilot: ON'); }
  disableAutoPilot() { this.autoPilot = false; console.log('👀 AutoPilot: OFF'); }
  isRunning() { return this.running; }
  isAutoPilot() { return this.autoPilot; }

  // ─── Main evaluation pipeline ─────────────────────────────────────

  async evaluate(opp: TokenOpportunity): Promise<void> {
    try {
      const regime = await regimeDetector.getRegime();

      // Get real wallet balance for sizing
      let solBalance = 0;
      try {
        const wallet = loadWallet();
        const lamports = await conn().getBalance(wallet.publicKey, 'confirmed');
        solBalance = lamports / 1e9;
      } catch {
        solBalance = 0;
      }
      const solPrice = regime.solPrice || 100;
      const portfolioUSD = solBalance * solPrice;

      // Score it
      const decision = await decisionEngine.decide(opp, portfolioUSD);

      if (decision.action !== 'BUY') return; // not worth taking

      // Risk check
      const block = riskManager.canTrade(decision, solBalance, solPrice);
      if (block) {
        console.log(`🛑 Brain: Blocked ${opp.token} — ${block}`);
        return;
      }

      // Size the position
      const finalSizeUSD = riskManager.sizeTrade(decision.sizeUSD, decision.confidence, portfolioUSD);
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
          breakdown: {},
          execution: { success: true },
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
        await sendTelegramAlert(`📄 Paper trade opened: ${opp.token}\nTP: +${exits.tp}% | SL: -${exits.sl}%`);

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
          breakdown: {},
          execution: execResult,
        });

        riskManager.onTradeOpen(journalId, finalSizeUSD, opp.price);

        if (execResult.success) {
          await sendTelegramAlert(`✅ *Trade Executed:* ${opp.token}\n$${finalSizeUSD.toFixed(2)} | TX: ${execResult.txHash?.slice(0, 20)}...\nTP: +${exits.tp}% | SL: -${exits.sl}%`);
        } else {
          await sendTelegramAlert(`❌ *Trade Failed:* ${opp.token}\n${execResult.error}`);
        }
      }

    } catch (e: any) {
      console.error(`🧠 Brain error evaluating ${opp.token}:`, e.message);
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
        if (!pair) return `❌ Token "${token}" not found on Solana DEXes`;

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
      } catch { return `❌ Could not find "${token}"`; }
    }
    return await decisionEngine.explain(opp);
  }

  async getFullStatus(): Promise<string> {
    const regime = await regimeDetector.getRegime();
    const risk = riskManager.getState();
    const perf = performanceTracker.compute(tradeJournal.getAll());
    const scan = marketScanner.getLastScan();
    const paperStats = backtester.getStats();

    const regimeEmoji: Record<string, string> = { TREND_UP: '📈', TREND_DOWN: '📉', CHOP: '↔️', MANIA: '🔥', RISK_OFF: '🛡️' };

    return (
      `🧠 *Brain Status*\n\n` +
      `${regimeEmoji[regime.regime]} Regime: *${regime.regime}* (${regime.confidence}% conf)\n` +
      `SOL: $${regime.solPrice.toFixed(2)} | Fear&Greed: ${regime.fearGreed}\n\n` +
      `🛡️ Risk: ${risk.isHalted ? '🔴 HALTED' : '🟢 Active'}\n` +
      `Daily P&L: ${risk.dailyPnlUSD >= 0 ? '+' : ''}$${risk.dailyPnlUSD.toFixed(2)} | Losses: ${risk.consecutiveLosses}/${3}\n` +
      `Drawdown: ${risk.currentDrawdownPct.toFixed(1)}% | Open: ${risk.tradesOpenCount}\n\n` +
      `📊 Performance (all-time):\n` +
      `${perf.totalTrades} trades | ${perf.winRate.toFixed(0)}% WR | PF: ${perf.profitFactor === Infinity ? '∞' : perf.profitFactor.toFixed(2)}\n\n` +
      `📄 Mode: *${backtester.getMode()}*\n` +
      (backtester.isPaper() ? `Paper: ${paperStats.totalTrades} trades | Ready: ${paperStats.isReadyForLive ? 'YES ✅' : 'NO ⏳'}\n\n` : '\n') +
      `🔍 Last scan: ${scan ? `${scan.tokenCount} tokens` : 'none'}\n` +
      `🤖 AutoPilot: ${this.autoPilot ? 'ON' : 'OFF'}`
    );
  }

  // ─── Internal ─────────────────────────────────────────────────────

  private buildTradeAlert(opp: TokenOpportunity, decision: TradeDecision, sizeUSD: number, exits: { tp: number; sl: number }): string {
    return (
      `🧠 *Brain Signal: ${opp.token}*\n\n` +
      `Score: ${decision.confidence}/100 | Regime: ${decision.regime}\n` +
      `Price: $${opp.price.toFixed(6)}\n` +
      `Size: $${sizeUSD.toFixed(2)} (${backtester.getMode()})\n` +
      `TP: +${exits.tp}% | SL: -${exits.sl}%\n\n` +
      `📝 ${decision.reason}`
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

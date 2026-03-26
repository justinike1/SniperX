/**
 * TRADE JOURNAL
 * Records every trade with full context: why we entered, signals, confidence,
 * regime, exit reason, PnL, duration. This is how the bot gets smarter over time.
 * After every close, the journal writes a self-review analysing quality of entry/exit.
 */
import { JournalEntry, TradeOutcome, MarketRegime, ScoreBreakdown, ExecutionResult } from './types';

class TradeJournal {
  private entries: JournalEntry[] = [];
  private nextId = 1;

  // ─── Open a trade entry ──────────────────────────────────────────

  open(params: {
    token: string;
    mint: string;
    action: 'BUY' | 'SELL';
    sizeUSD: number;
    entryPrice: number;
    confidence: number;
    regime: MarketRegime;
    signals: string[];
    breakdown: Partial<ScoreBreakdown>;
    execution: Partial<ExecutionResult>;
    analytics?: {
      score?: number;
      tokenAgeSec?: number;
      liquidity?: number;
      volume24h?: number;
      priceImpactEstPct?: number;
      entryReason?: string;
      exitReason?: string;
    };
  }): string {
    const id = `T${String(this.nextId++).padStart(4, '0')}`;
    const entry: JournalEntry = {
      id,
      ...params,
      outcome: 'OPEN',
      openedAt: Date.now(),
      notes: this.buildOpenNote(params),
      analytics: params.analytics,
    };
    this.entries.push(entry);
    console.log(`📔 Journal: Opened ${id} — ${params.action} ${params.token} @ $${params.entryPrice.toFixed(6)} (confidence: ${params.confidence})`);
    return id;
  }

  // ─── Close a trade entry ──────────────────────────────────────────

  close(id: string, exitPrice: number, exitReason: string, execution: Partial<ExecutionResult>): JournalEntry | null {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) { console.warn(`Journal: no entry found for ${id}`); return null; }

    const pnlPct = entry.action === 'BUY'
      ? ((exitPrice - entry.entryPrice) / entry.entryPrice) * 100
      : ((entry.entryPrice - exitPrice) / entry.entryPrice) * 100;

    const pnlUSD = (pnlPct / 100) * entry.sizeUSD;

    entry.exitPrice = exitPrice;
    entry.pnlUSD = pnlUSD;
    entry.pnlPct = pnlPct;
    entry.exitReason = exitReason;
    entry.closedAt = Date.now();
    entry.durationMs = entry.closedAt - entry.openedAt;
    entry.outcome = pnlPct > 0.5 ? 'WIN' : pnlPct < -0.5 ? 'LOSS' : 'BREAK_EVEN';
    entry.execution = { ...entry.execution, ...execution };
    entry.analytics = { ...(entry.analytics || {}), exitReason };
    entry.notes += '\n' + this.buildCloseNote(entry);

    console.log(`📔 Journal: Closed ${id} — ${entry.outcome} | P&L: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% ($${pnlUSD.toFixed(2)}) | ${exitReason}`);
    return entry;
  }

  // ─── Getters ──────────────────────────────────────────────────────

  getById(id: string): JournalEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  getOpen(): JournalEntry[] {
    return this.entries.filter(e => e.outcome === 'OPEN');
  }

  getClosed(limit = 50): JournalEntry[] {
    return this.entries.filter(e => e.outcome !== 'OPEN').slice(-limit);
  }

  getAll(): JournalEntry[] { return [...this.entries]; }

  updateAnalytics(id: string, analytics: JournalEntry["analytics"]): JournalEntry | null {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return null;
    entry.analytics = { ...(entry.analytics || {}), ...(analytics || {}) };
    return entry;
  }

  // ─── Self-review: post-trade analysis ─────────────────────────────

  selfReview(entry: JournalEntry): string {
    const winner = (entry.outcome === 'WIN');
    const duration = entry.durationMs ? (entry.durationMs / 60_000).toFixed(1) : '?';
    const pnlStr = entry.pnlPct !== undefined ? `${entry.pnlPct >= 0 ? '+' : ''}${entry.pnlPct.toFixed(2)}%` : 'N/A';

    const entryQuality = this.gradeEntry(entry);
    const exitQuality = this.gradeExit(entry);

    let review = `🔬 *Self-Review: ${entry.id}*\n\n`;
    review += `${winner ? '✅' : '❌'} *${entry.token}* ${entry.action} → ${entry.outcome}\n`;
    review += `P&L: ${pnlStr} ($${(entry.pnlUSD || 0).toFixed(2)}) | Held: ${duration}m\n`;
    review += `Confidence: ${entry.confidence}/100 | Regime: ${entry.regime}\n\n`;

    review += `📊 *Entry Grade: ${entryQuality.grade}*\n${entryQuality.comment}\n\n`;
    review += `🚪 *Exit Grade: ${exitQuality.grade}*\n${exitQuality.comment}\n\n`;

    review += `📝 *Signals that led to entry:*\n`;
    entry.signals.slice(0, 5).forEach(s => { review += `• ${s}\n`; });

    review += `\n💡 *Lesson:*\n${this.derivLesson(entry)}\n`;

    return review;
  }

  // ─── Telegram summary ─────────────────────────────────────────────

  getRecentSummary(count = 10): string {
    const recent = this.getClosed(count);
    if (recent.length === 0) return '📔 No closed trades yet.';

    const wins = recent.filter(e => e.outcome === 'WIN').length;
    const totalPnl = recent.reduce((a, e) => a + (e.pnlUSD || 0), 0);

    let msg = `📔 *Last ${recent.length} Trades*\n\n`;
    recent.slice(-5).reverse().forEach(e => {
      const icon = e.outcome === 'WIN' ? '✅' : e.outcome === 'LOSS' ? '❌' : '⚖️';
      const pnl = e.pnlPct !== undefined ? `${e.pnlPct >= 0 ? '+' : ''}${e.pnlPct.toFixed(1)}%` : '';
      msg += `${icon} *${e.id}* ${e.token} ${pnl} | ${e.exitReason || 'unknown'}\n`;
    });
    msg += `\n📊 Win rate: ${((wins / recent.length) * 100).toFixed(0)}% | Total: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`;
    return msg;
  }

  // ─── Internal ─────────────────────────────────────────────────────

  private buildOpenNote(p: any): string {
    return [
      `Entry: ${p.action} ${p.token} @ $${p.entryPrice.toFixed(6)}`,
      `Size: $${p.sizeUSD.toFixed(2)} | Confidence: ${p.confidence}/100`,
      `Regime: ${p.regime}`,
      `Signals: ${p.signals.slice(0, 3).join(', ')}`,
    ].join('\n');
  }

  private buildCloseNote(e: JournalEntry): string {
    const duration = e.durationMs ? `${(e.durationMs / 60_000).toFixed(1)}m` : '?';
    return [
      `Exit: ${e.exitReason} @ $${e.exitPrice?.toFixed(6)}`,
      `Duration: ${duration} | Outcome: ${e.outcome}`,
      `P&L: ${(e.pnlPct || 0) >= 0 ? '+' : ''}${(e.pnlPct || 0).toFixed(2)}% | $${(e.pnlUSD || 0).toFixed(2)}`,
    ].join('\n');
  }

  private gradeEntry(e: JournalEntry): { grade: string; comment: string } {
    const conf = e.confidence;
    if (conf >= 80) return { grade: 'A', comment: 'High confidence entry — signal alignment was strong.' };
    if (conf >= 70) return { grade: 'B', comment: 'Good entry — most signals aligned.' };
    if (conf >= 60) return { grade: 'C', comment: 'Marginal entry — borderline signals.' };
    return { grade: 'D', comment: 'Weak entry — should have waited for better alignment.' };
  }

  private gradeExit(e: JournalEntry): { grade: string; comment: string } {
    const reason = e.exitReason || '';
    const pnl = e.pnlPct || 0;

    if (reason.includes('TP') && pnl > 5) return { grade: 'A', comment: 'Exited at take-profit — perfect execution.' };
    if (reason.includes('TRAIL') && pnl > 0) return { grade: 'A', comment: 'Trailing stop preserved profits.' };
    if (reason.includes('SL') && pnl > -10) return { grade: 'B', comment: 'Stop loss contained damage well.' };
    if (reason.includes('SL') && pnl < -15) return { grade: 'C', comment: 'Stop loss triggered but loss was large.' };
    if (reason.includes('manual')) return { grade: 'B', comment: 'Manual exit — human override.' };
    return { grade: 'C', comment: 'Exit reason unclear — review entry criteria.' };
  }

  private derivLesson(e: JournalEntry): string {
    if (e.outcome === 'WIN' && e.confidence >= 75) return 'High confidence setups work. Continue this pattern.';
    if (e.outcome === 'WIN' && e.confidence < 65) return 'Got lucky on a low-confidence trade. Don\'t over-size similar setups.';
    if (e.outcome === 'LOSS' && e.regime === 'CHOP') return 'Choppy market punished this trade. Consider skipping in CHOP regime.';
    if (e.outcome === 'LOSS' && e.regime === 'RISK_OFF') return 'Risk-off macro environment. Should not have entered.';
    if (e.outcome === 'LOSS' && (e.pnlPct || 0) < -15) return 'Large loss — check stop loss was properly set before entry.';
    if (e.outcome === 'LOSS') return 'Review the signals that led to entry. Were they all aligned, or were some weak?';
    return 'Break-even trade — signals were mixed. Patience pays.';
  }
}

export const tradeJournal = new TradeJournal();

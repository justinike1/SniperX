import { env } from '../config.js';
export type Limits = { maxPosPct: number; slippagePct: number; dailyLossPct: number; };
export const limits: Limits = { maxPosPct: env.MAX_POSITION_PCT, slippagePct: env.SLIPPAGE_PCT, dailyLossPct: env.DAILY_LOSS_PCT };
export type Quote = { expectedOut: number; minOut: number; priceUsd?: number };
export function checkSlippage(q: Quote) { const slip = (q.expectedOut - q.minOut) / q.expectedOut; return slip <= limits.slippagePct / 100; }
export function canOpenPosition(walletUsd: number, newPositionValueUsd: number) { return newPositionValueUsd <= walletUsd * (limits.maxPosPct / 100); }
export function dailyLossBreached(realizedTodayUsd: number, startingEquityUsd: number) { return realizedTodayUsd <= -1 * startingEquityUsd * (limits.dailyLossPct / 100); }

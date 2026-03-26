import { IntentQueue, Intent } from './queue.js';
import { getQuoteByDenom, buildAndExecuteSwap } from '../services/jupiter.js';
import { checkSlippage } from '../risk/engine.js';
import { log } from '../utils/logger.js';

export function startWorker(q: IntentQueue) {
  q.on('intent', async (i: Intent) => {
    try {
      log.info('Processing', i.type, i.token, i.amount, i.denom, 'id=', i.id);
      const { quote } = await getQuoteByDenom({ side: i.type, token: i.token, denom: i.denom, amount: Number(i.amount === 'ALL' ? 0 : i.amount), slippagePct: i.slippagePct });
      const expectedOut = Number(quote?.outAmount ?? 0) / 1e6;
      const minOut = Number(quote?.otherAmountThreshold ?? 0) / 1e6;
      if (!checkSlippage({ expectedOut, minOut })) { log.warn('Rejected: slippage too high', i.id); return; }
      const sig = await buildAndExecuteSwap(quote, { prioritizationFeeLamports: 10000 });
      log.info('Swap submitted', sig);
      // TODO: persist in DB + WS broadcast
    } catch (e: any) {
      log.error('Worker error', e?.response?.data ?? e?.message ?? e);
    }
  });
}

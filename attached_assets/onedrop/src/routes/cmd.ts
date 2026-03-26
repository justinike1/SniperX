import { Router } from 'express';
import { z } from 'zod';
import { IntentQueue } from '../worker/queue.js';

export function cmdRoutes(q: IntentQueue) {
  const r = Router();

  const BuySchema = z.object({
    token: z.string(),
    amount: z.union([z.number(), z.string()]),
    denom: z.enum(['SOL','USD','TOKEN']),
    slippagePct: z.number().min(0).max(5).default(1.0),
  });

  r.post('/buy', (req, res) => {
    const parsed = BuySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const id = 'intent_'+Date.now().toString(36)+Math.random().toString(36).slice(2);
    q.enqueue({ id, type: 'BUY', ...parsed.data });
    res.json({ ok: true, queued: true, id });
  });

  const SellSchema = z.object({
    token: z.string(),
    amount: z.union([z.number(), z.literal('ALL')]),
    denom: z.enum(['TOKEN','USD']).default('TOKEN'),
    slippagePct: z.number().min(0).max(5).default(1.0).optional(),
  });

  r.post('/sell', (req, res) => {
    const parsed = SellSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const id = 'intent_'+Date.now().toString(36)+Math.random().toString(36).slice(2);
    const slippagePct = parsed.data.slippagePct ?? 1.0;
    q.enqueue({ id, type: 'SELL', slippagePct, ...parsed.data });
    res.json({ ok: true, queued: true, id });
  });

  return r;
}

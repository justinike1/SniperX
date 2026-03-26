import { Router } from 'express';
import { db } from '../services/db.js';
import { trades } from '../models/schema.js';
import { desc } from 'drizzle-orm';

export const tradesRoutes = Router();
tradesRoutes.get('/', async (_req, res) => {
  try { const rows = await db.select().from(trades).orderBy(desc(trades.createdAt)).limit(100); res.json({ ok: true, data: rows }); }
  catch (e: any) { res.status(500).json({ ok: false, error: e?.message ?? 'db error' }); }
});

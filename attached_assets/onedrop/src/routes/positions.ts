import { Router } from 'express';
import { db } from '../services/db.js';
import { positions } from '../models/schema.js';

export const positionsRoutes = Router();
positionsRoutes.get('/', async (_req, res) => {
  try { const rows = await db.select().from(positions); res.json({ ok: true, data: rows }); }
  catch (e: any) { res.status(500).json({ ok: false, error: e?.message ?? 'db error' }); }
});

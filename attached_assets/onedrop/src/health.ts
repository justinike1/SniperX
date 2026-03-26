import { Router } from 'express';
import { pingDb } from './services/db.js';
export const healthRoutes = Router();
healthRoutes.get('/healthz', async (_req, res) => { const dbOk = await pingDb(); res.json({ ok: dbOk, dbOk, ts: new Date().toISOString() }); });

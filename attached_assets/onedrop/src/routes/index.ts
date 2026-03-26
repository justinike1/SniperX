import { Router } from 'express';
import { cmdRoutes } from './cmd.js';
import { positionsRoutes } from './positions.js';
import { tradesRoutes } from './trades.js';
import { IntentQueue } from '../worker/queue.js';

export function apiRoutes(q: IntentQueue) {
  const r = Router();
  r.use('/cmd', cmdRoutes(q));
  r.use('/positions', positionsRoutes);
  r.use('/trades', tradesRoutes);
  return r;
}

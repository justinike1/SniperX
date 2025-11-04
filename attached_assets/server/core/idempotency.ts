
import type { Request, Response, NextFunction } from "express";
interface Entry { status: number; body: unknown; expiresAt: number; }
const store = new Map<string, Entry>();
export function idempotency(ttlMs = 10 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.header("Idempotency-Key"); if (!key) return next();
    const now = Date.now(); const hit = store.get(key);
    if (hit && hit.expiresAt > now) return res.status(hit.status).json(hit.body);
    const json = res.json.bind(res);
    res.json = ((body: any) => { if (key) store.set(key, { status: res.statusCode || 200, body, expiresAt: now + ttlMs }); return json(body); }) as any;
    next();
  };
}

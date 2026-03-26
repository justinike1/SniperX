
import { Request, Response } from "express";
type Client = { id: string; res: Response };
const clients: Client[] = [];
export function sse(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream"); res.setHeader("Cache-Control", "no-cache"); res.setHeader("Connection", "keep-alive"); (res as any).flushHeaders?.();
  const id = Math.random().toString(36).slice(2); clients.push({ id, res }); res.write(`event: ready\n`); res.write(`data: {"ok":true}\n\n`);
  req.on("close", () => { const ix = clients.findIndex(c => c.id === id); if (ix >= 0) clients.splice(ix, 1); });
}
export function publish(event: string, payload: unknown) { const data = `event: ${event}\n` + `data: ${JSON.stringify(payload)}\n\n`; for (const c of clients) { try { c.res.write(data); } catch {} } }

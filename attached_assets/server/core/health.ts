
import type { Express } from "express";
export function mountHealth(app: Express) { app.get("/healthz", (_req, res) => res.json({ ok: true })); app.get("/readyz", (_req, res) => res.json({ ok: true })); }


import type { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
export function applySecurity(app: Express) {
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));
}

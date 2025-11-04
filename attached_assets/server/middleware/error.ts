
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";
export function notFound(_req: Request, res: Response) { res.status(404).json({ error: "Not Found" }); }
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(400).json({ error: "ValidationError", issues: err.errors });
  const msg = err instanceof Error ? err.message : "Unknown error";
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "InternalServerError", message: msg });
}

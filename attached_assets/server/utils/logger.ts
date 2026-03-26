
import pino from "pino";
import { env } from "./env";
const dev = env().NODE_ENV !== "production";
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: dev ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } : undefined,
  redact: { paths: ["password","token","privateKey","authorization","req.headers.authorization"], remove: true }
});

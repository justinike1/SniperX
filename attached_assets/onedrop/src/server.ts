import express from 'express';
import http from 'http';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config.js';
import { log } from './utils/logger.js';
import { apiRoutes } from './routes/index.js';
import { healthRoutes } from './health.js';
import { attachWs } from './ws.js';
import { IntentQueue } from './worker/queue.js';
import { startWorker } from './worker/worker.js';
import { registerWebhook } from './bot/telegram.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(express.json());

// Simple landing page (no redirects)
app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>SniperX</title>
  <style>body{font-family:system-ui;padding:24px;line-height:1.5}</style>
  <h1>SniperX API</h1>
  <p>OK — try <code>/healthz</code>.</p>`);
});

// Telegram webhook must be mounted before listen()
await registerWebhook(app);

const intents = new IntentQueue();
app.use('/api', apiRoutes(intents));
app.use('/', healthRoutes);

const server = http.createServer(app);
attachWs(server);
startWorker(intents);

// Keep-alive tuning for Replit reverse proxy
(server as any).keepAliveTimeout = 60000;
(server as any).headersTimeout   = 65000;
(server as any).requestTimeout   = 60000;

server.listen(env.PORT, () => {
  log.info(`SniperX API (webhook mode) on :${env.PORT}`);
});

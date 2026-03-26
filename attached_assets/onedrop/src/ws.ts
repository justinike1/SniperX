import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { log } from './utils/logger.js';
export function attachWs(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws: WebSocket) => { log.info('WS client connected'); ws.send(JSON.stringify({ topic: 'hello', data: 'welcome to SniperX WS' })); });
  return wss;
}

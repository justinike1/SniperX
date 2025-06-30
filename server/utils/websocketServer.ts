/**
 * SniperX WebSocket Broadcasting Server
 * Real-time updates for trading events and market data
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

interface BroadcastMessage {
  type: 'trade' | 'market' | 'position' | 'alert' | 'insight' | 'wallet';
  data: any;
  timestamp: number;
}

class SniperXWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number = 8081;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const server = createServer();
      this.wss = new WebSocketServer({ server, path: '/sniperx-ws' });

      this.wss.on('connection', (ws: WebSocket) => {
        console.log('📡 New WebSocket client connected');
        this.clients.add(ws);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connection',
          data: {
            message: 'Connected to SniperX live trading feed',
            timestamp: Date.now()
          },
          timestamp: Date.now()
        }));

        ws.on('close', () => {
          console.log('📡 WebSocket client disconnected');
          this.clients.delete(ws);
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.clients.delete(ws);
        });

        // Keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          } else {
            clearInterval(pingInterval);
            this.clients.delete(ws);
          }
        }, 30000);
      });

      server.listen(this.port, () => {
        console.log(`🚀 SniperX WebSocket server running on port ${this.port}`);
        console.log(`📡 WebSocket endpoint: ws://localhost:${this.port}/sniperx-ws`);
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket server:', error);
    }
  }

  public broadcast(message: Partial<BroadcastMessage>): void {
    if (this.clients.size === 0) return;

    const fullMessage: BroadcastMessage = {
      type: message.type || 'alert',
      data: message.data || {},
      timestamp: message.timestamp || Date.now()
    };

    const messageString = JSON.stringify(fullMessage);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
        } catch (error) {
          console.error('Failed to send message to client:', error);
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });

    console.log(`📡 Broadcasted ${fullMessage.type} to ${this.clients.size} clients`);
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }

  public getStatus() {
    return {
      isRunning: this.wss !== null,
      connectedClients: this.clients.size,
      port: this.port
    };
  }
}

// Create singleton instance
const wsServer = new SniperXWebSocketServer();

// Export broadcast function for easy use
export function broadcast(message: Partial<BroadcastMessage>): void {
  wsServer.broadcast(message);
}

export function broadcastTrade(symbol: string, price: number, action: 'BUY' | 'SELL', walletValue: number, insight?: any): void {
  broadcast({
    type: 'trade',
    data: {
      symbol,
      price,
      action,
      time: new Date().toLocaleTimeString(),
      walletValue,
      insight,
      confidence: insight?.confidence || 85
    }
  });
}

export function broadcastMarketUpdate(marketData: any): void {
  broadcast({
    type: 'market',
    data: marketData
  });
}

export function broadcastPositionUpdate(position: any): void {
  broadcast({
    type: 'position',
    data: position
  });
}

export function broadcastAlert(alert: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  broadcast({
    type: 'alert',
    data: {
      message: alert,
      level,
      time: new Date().toLocaleTimeString()
    }
  });
}

export function broadcastInsight(insight: any): void {
  broadcast({
    type: 'insight',
    data: insight
  });
}

export function broadcastWalletUpdate(balance: number, address: string): void {
  broadcast({
    type: 'wallet',
    data: {
      balance,
      address,
      time: new Date().toLocaleTimeString()
    }
  });
}

export { wsServer };
export default wsServer;
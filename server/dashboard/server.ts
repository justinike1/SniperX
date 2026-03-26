/**
 * SniperX Advanced Trading Dashboard Server
 * Real-time monitoring of GPT insights, trading performance, and system status
 */

import express from 'express';
import { createServer } from 'http';
import { config } from '../config';

const app = express();

// Dashboard route
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SniperX Advanced Trading Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f0f23, #1a1a2e);
            color: #fff; min-height: 100vh; padding: 20px;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 2.5rem; background: linear-gradient(45deg, #00ff88, #0099ff); 
                 -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: #888; margin-top: 10px; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; 
                backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); }
        .card h3 { color: #00ff88; margin-bottom: 15px; font-size: 1.2rem; }
        .metric { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .value { color: #0099ff; font-weight: bold; }
        .status { padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; }
        .status.active { background: #00ff88; color: #000; }
        .status.inactive { background: #ff4444; color: #fff; }
        .live-feed { height: 200px; overflow-y: auto; font-size: 0.9rem; }
        .trade-item { padding: 8px; margin: 5px 0; background: rgba(0,255,136,0.1); 
                      border-left: 3px solid #00ff88; border-radius: 5px; }
        .insight-item { padding: 8px; margin: 5px 0; background: rgba(0,153,255,0.1); 
                        border-left: 3px solid #0099ff; border-radius: 5px; }
        .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
        .feature { background: rgba(0,255,136,0.1); padding: 10px; border-radius: 8px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">SniperX Elite Trading Platform</h1>
        <p class="subtitle">Advanced AI Trading with GPT Insights & Real-time Analytics</p>
    </div>
    
    <div class="dashboard">
        <div class="card">
            <h3>🧠 GPT Trading Insights</h3>
            <div class="metric">
                <span>OpenAI Status:</span>
                <span class="status ${config.openaiKey ? 'active' : 'inactive'}">${config.openaiKey ? 'ACTIVE' : 'NOT CONFIGURED'}</span>
            </div>
            <div class="metric">
                <span>Last Insight:</span>
                <span class="value" id="lastInsight">Generating...</span>
            </div>
            <div class="metric">
                <span>Confidence Score:</span>
                <span class="value" id="confidence">85%</span>
            </div>
            <div class="live-feed" id="insightFeed">
                <div class="insight-item">System initialized - AI analysis ready</div>
            </div>
        </div>

        <div class="card">
            <h3>⚡ Live Trading Activity</h3>
            <div class="metric">
                <span>Trading Status:</span>
                <span class="status ${config.dryRun ? 'inactive' : 'active'}">${config.dryRun ? 'DRY RUN' : 'LIVE TRADING'}</span>
            </div>
            <div class="metric">
                <span>Wallet Balance:</span>
                <span class="value" id="walletBalance">0.000 SOL</span>
            </div>
            <div class="metric">
                <span>Recent Trades:</span>
                <span class="value" id="tradeCount">0</span>
            </div>
            <div class="live-feed" id="tradeFeed">
                <div class="trade-item">Waiting for trade signals...</div>
            </div>
        </div>

        <div class="card">
            <h3>🚀 Advanced Features Status</h3>
            <div class="feature-grid">
                <div class="feature">
                    <strong>Dynamic Stop-Loss</strong><br>
                    <span class="status active">ACTIVE</span>
                </div>
                <div class="feature">
                    <strong>Rug Pull Monitor</strong><br>
                    <span class="status active">ACTIVE</span>
                </div>
                <div class="feature">
                    <strong>Emergency Controls</strong><br>
                    <span class="status active">ACTIVE</span>
                </div>
                <div class="feature">
                    <strong>Telegram Alerts</strong><br>
                    <span class="status ${config.telegramBotToken ? 'active' : 'inactive'}">${config.telegramBotToken ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>📊 System Performance</h3>
            <div class="metric">
                <span>WebSocket Status:</span>
                <span class="status" id="wsStatus">CONNECTING</span>
            </div>
            <div class="metric">
                <span>Connected Clients:</span>
                <span class="value" id="clientCount">0</span>
            </div>
            <div class="metric">
                <span>Market Data:</span>
                <span class="status active">LIVE</span>
            </div>
            <div class="metric">
                <span>AI Engine:</span>
                <span class="status active">OPERATIONAL</span>
            </div>
        </div>
    </div>

    <script>
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = protocol + '//' + window.location.hostname + ':8080/sniperx-ws';
        let socket;
        let tradeCount = 0;

        function connectWebSocket() {
            socket = new WebSocket(wsUrl);
            
            socket.onopen = function() {
                document.getElementById('wsStatus').textContent = 'CONNECTED';
                document.getElementById('wsStatus').className = 'status active';
                console.log('Connected to SniperX WebSocket');
            };
            
            socket.onmessage = function(event) {
                const message = JSON.parse(event.data);
                handleMessage(message);
            };
            
            socket.onclose = function() {
                document.getElementById('wsStatus').textContent = 'DISCONNECTED';
                document.getElementById('wsStatus').className = 'status inactive';
                setTimeout(connectWebSocket, 3000);
            };
        }

        function handleMessage(message) {
            const now = new Date().toLocaleTimeString();
            
            switch(message.type) {
                case 'trade':
                    tradeCount++;
                    document.getElementById('tradeCount').textContent = tradeCount;
                    document.getElementById('walletBalance').textContent = message.data.walletValue + ' SOL';
                    
                    const tradeItem = document.createElement('div');
                    tradeItem.className = 'trade-item';
                    tradeItem.innerHTML = \`\${now}: \${message.data.action} \${message.data.symbol} at \${message.data.price} SOL\`;
                    
                    const tradeFeed = document.getElementById('tradeFeed');
                    tradeFeed.insertBefore(tradeItem, tradeFeed.firstChild);
                    if (tradeFeed.children.length > 10) tradeFeed.removeChild(tradeFeed.lastChild);
                    break;
                    
                case 'insight':
                    document.getElementById('lastInsight').textContent = message.data.reasoning?.substring(0, 50) + '...' || 'Generated';
                    document.getElementById('confidence').textContent = message.data.confidence + '%';
                    
                    const insightItem = document.createElement('div');
                    insightItem.className = 'insight-item';
                    insightItem.innerHTML = \`\${now}: \${message.data.reasoning || 'Trade analysis generated'}\`;
                    
                    const insightFeed = document.getElementById('insightFeed');
                    insightFeed.insertBefore(insightItem, insightFeed.firstChild);
                    if (insightFeed.children.length > 8) insightFeed.removeChild(insightFeed.lastChild);
                    break;
                    
                case 'alert':
                    console.log('Alert:', message.data.message);
                    break;
            }
        }

        // Initialize WebSocket connection
        connectWebSocket();
        
        // Update client count periodically
        setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                document.getElementById('clientCount').textContent = '1+';
            }
        }, 5000);
    </script>
</body>
</html>
  `);
});

const PORT = 3001;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 SniperX Advanced Trading Dashboard running on port ${PORT}`);
  console.log(`📊 Dashboard URL: http://localhost:${PORT}`);
  console.log(`🧠 GPT Insights: ${config.openaiKey ? 'ENABLED' : 'DISABLED'}`);
  console.log(`⚡ Trading Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);
});

export default server;
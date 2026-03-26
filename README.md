# SniperX - Revolutionary AI Trading Platform

## Quick Start

SniperX is ready for 24/7 VPS deployment with the comprehensive 8-plugin trading system.

### Local Development
```bash
npm install
npm run dev
```

### VPS Deployment (24/7 Operation)

1. **Clone to VPS:**
```bash
git clone <your-repo-url>
cd sniperx
```

2. **Run deployment script:**
```bash
chmod +x deploy.sh
./deploy.sh
```

3. **Configure environment:**
Copy `.env.example` to `.env` and fill in credentials:
- `DATABASE_URL` - PostgreSQL connection string (required for DB features)
- `SOLANA_RPC_URL` - Solana RPC endpoint (defaults to public mainnet)
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` - For Telegram control interface
- `OPENAI_API_KEY` - For AI analysis (optional, server starts without it)
- `JWT_SECRET` / `SESSION_SECRET` - Auth secrets
- Wallet: place your keypair in `phantom_key.json` (array of 64 bytes)

### PM2 Commands (VPS Management)

```bash
pm2 status                    # Check status
pm2 logs sniperx-trading-bot  # View logs
pm2 restart sniperx-trading-bot
pm2 stop sniperx-trading-bot
pm2 monit                     # Performance monitor
```

## Trading System

### 8-Plugin Architecture
- **Momentum Trading** - 15% price momentum detection
- **Arbitrage** - 2% profit opportunities  
- **Enhanced Token Selector** - $100k+ volume filtering
- **Trading Log** - Complete analytics
- **AI Explanation** - OpenAI-powered analysis
- **Portfolio Manager** - 25% profit / 10% stop-loss
- **Risk Scanner** - Safety verification
- **Jupiter Executor** - Real DEX trading

### Configuration (Brain + Risk Manager defaults)
- Max per trade: 0.005 SOL (Kelly-sized)
- Max daily: 0.05 SOL
- Min wallet reserve: 0.015 SOL
- Take Profit: 10–20% (confidence-scaled)
- Stop Loss: 5–8% (confidence-scaled)
- Brain scan interval: 30 seconds
- Decision threshold: 68/100 confidence

### Wallet Requirements
- Minimum: 0.052 SOL (0.05 SOL trade + 0.002 SOL fees)
- Current funded wallet: `7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv`

## Safety Features
- BONK token permanently banned
- Emergency stop at critical low balance
- Fund protection with automatic stop-loss
- Telegram alerts for all trades
- Rate limiting protection

## API Endpoints (server/index.ts)
- `/health` - System health check
- `/api/pro/status` - Wallet balance, Kelly Criterion config, safety checks
- `/api/pro/trade` - Professional trade execution (POST, Kelly-sized)
- `/api/pro/liquidate-bonk` - Emergency BONK liquidation (POST)

## Support
For issues or questions, monitor the logs and Telegram notifications for real-time trading status.
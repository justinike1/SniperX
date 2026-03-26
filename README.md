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
Edit `.env` with your actual credentials:
- `PHANTOM_PRIVATE_KEY` - Your wallet private key
- `TELEGRAM_BOT_TOKEN` - For trade notifications
- `OPENAI_API_KEY` - For AI analysis
- `HELIUS_API_KEY` - For Solana data

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

### Configuration
- Trade Amount: 0.05 SOL per trade
- Profit Target: 25%
- Stop Loss: 10%
- Trading Interval: 5 minutes
- Confidence Threshold: 70%

### Wallet Requirements
- Minimum: 0.052 SOL (0.05 SOL trade + 0.002 SOL fees)
- Current funded wallet: `7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv`

## Safety Features
- BONK token permanently banned
- Emergency stop at critical low balance
- Fund protection with automatic stop-loss
- Telegram alerts for all trades
- Rate limiting protection

## API Endpoints
- `/api/plugins/status` - Plugin system status
- `/api/trading/execute` - Manual trade execution
- `/api/portfolio/balance` - Current balance
- `/api/health` - System health check

## Support
For issues or questions, monitor the logs and Telegram notifications for real-time trading status.
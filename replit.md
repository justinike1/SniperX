# SniperX - Personal Trading Bot

## Overview
SniperX is your personal autonomous cryptocurrency trading bot for Solana. Control it entirely via Telegram, make profits 24/7. No web interface - just lean, mean trading power.

## Purpose
**Personal profit-focused trading bot** controlled remotely via Telegram. Designed for individual use with professional-grade risk management and institutional trading strategies.

## Control Interface
**Telegram Bot Only** - All trading operations via @SupermanThatHoe_Bot

Available Commands:
- `/buy SOL 10 USD` - Buy $10 worth of SOL
- `/sell BONK ALL` - Liquidate all BONK (chunked for large positions)
- `/sell SOL ALL` - Sell entire SOL position
- `/prices` - View real-time Pyth oracle prices
- `/queue` - Check pending trades
- `/status` - System health check
- `/help` - Command reference

## Core Systems

### Professional Trading Engine (Kelly Criterion)
- **Optimal Position Sizing**: Kelly criterion with 10% fraction cap for maximum risk-adjusted returns
- **Multi-Layer Risk Management**:
  - DrawdownGuard: Scales positions at 10% drawdown, stops at 15%
  - BudgetManager: Max 0.005 SOL per trade
  - VolatilityLimiter: Max 25% volatility tolerance
- **Gas Reserve Protection**: Always protects 0.015 SOL for transaction fees
- **Professional Jupiter Gateway**: Simulation before every trade, 3-attempt retry with exponential backoff

### OneDrop Integration
- **Pyth Price Feeds**: Real-time oracle data with 5-second caching
- **Worker Queue System**: Async trade execution with retry logic (3 attempts)
- **Grammy Telegram Bot**: Modern, clean command interface
- **Smart Sell Routing**: 
  - BONK → Emergency liquidation endpoint (chunked selling)
  - Other tokens → Professional trading (full position only)

### Safety Systems
- **Emergency Recovery**: Monitors for stuck positions, prevents disasters
- **24/7 Autonomous Trading**: Continuous market monitoring and execution
- **Fund Protection**: 2% stop-loss, 8% take-profit
- **AI Decision Engine**: GPT-4 market analysis (when configured)

## Technical Stack
- **Backend**: Node.js with TypeScript, Express (minimal HTTP server for health checks)
- **Trading**: Jupiter DEX aggregator for Solana token swaps
- **Price Data**: Pyth Network oracles for real-time pricing
- **Communication**: Grammy (Telegram bot library)
- **Blockchain**: Solana (@solana/web3.js)
- **Database**: PostgreSQL (minimal usage)

## Key Files

### Professional Trading
- `server/ultimate/orchestrator.ts`: Kelly criterion + multi-layer risk orchestration
- `server/ultimate/risk.ts`: Risk management components (KellySizer, DrawdownGuard, etc.)
- `server/ultimate/gateway/jupiterGateway.ts`: Jupiter swap execution with simulation
- `server/routes/professionalTrading.ts`: Professional API endpoints (/api/pro/*)

### OneDrop Integration
- `server/services/pythPriceFeed.ts`: Pyth oracle price feeds with caching
- `server/worker/queue.ts`: Event-driven worker queue with retry logic
- `server/worker/handlers.ts`: BUY/SELL trade handlers with smart routing
- `server/utils/telegramBotEnhanced.ts`: Grammy Telegram bot with commands

### Core Systems
- `server/index.ts`: Main bot entry point (bot-only mode)
- `server/services/autonomous24x7TradingEngine.ts`: 24/7 trading automation
- `server/utils/emergencyRecovery.ts`: Emergency position recovery system

## Environment Variables
Required secrets (use Replit Secrets):
- `SOLANA_PRIVATE_KEY`: Your wallet private key (base58 encoded)
- `TELEGRAM_BOT_TOKEN`: Bot token from @BotFather
- `TELEGRAM_CHAT_ID`: Your Telegram user ID
- `DATABASE_URL`: PostgreSQL connection (auto-provided by Replit)

Optional (for enhanced features):
- `OPENAI_API_KEY`: GPT-4 market analysis
- `GOOGLE_SHEETS_CREDENTIALS`: Trade logging to Google Sheets

## How It Works

1. **Bot starts automatically** when you launch the Repl
2. **Telegram bot activates** - ready to receive commands
3. **24/7 engine monitors** markets continuously
4. **Send commands via Telegram** to execute trades
5. **Emergency systems protect** your capital
6. **Profit!**

## Recent Updates (Nov 6, 2025)
- **🎯 PERSONAL BOT MODE**: Removed web app entirely, focused on personal profit trading
- **Telegram-Only Control**: All operations via Telegram bot - no web UI needed
- **Simplified Architecture**: Lean server focused on trading, not serving pages
- **Professional Trading Engine**: Kelly criterion, multi-layer risk management preserved
- **OneDrop Integration**: Pyth prices, worker queue, Grammy bot fully operational
- **Auto-Start**: Bot launches automatically and begins trading immediately

## Previous Updates (Nov 4, 2025)
- **Professional SniperX Prime**: Kelly criterion position sizing, institutional-grade risk management
- **Gas Reserve Protection**: Bulletproof 0.015 SOL protection from trades
- **Emergency BONK Liquidator**: Automated detection and chunked liquidation
- **Pyth Price Feeds**: Real-time oracle data integration
- **Worker Queue System**: Event-driven async execution with retry logic
- **Enhanced Telegram Bot**: Grammy-based commands with clean interface

## Architecture Decisions

### Why No Web Interface?
- **Simpler**: Less code, fewer bugs, faster deployment
- **Secure**: No attack surface from web frontend
- **Mobile-First**: Telegram works everywhere, no browser needed
- **Lean**: Focus computing power on trading, not serving pages
- **Personal**: Built for individual use, not multi-user management

### Why Telegram?
- **Remote Control**: Trade from anywhere in the world
- **Instant Notifications**: Get alerts immediately
- **Simple Commands**: Natural language-style interface
- **Proven**: Reliable messaging platform with excellent API

### Why Professional Trading Engine?
- **Proven Strategy**: Kelly criterion is mathematically optimal
- **Risk Management**: Multi-layer protection prevents blowups
- **Position Sizing**: Automatically calculates optimal trade sizes
- **Safety First**: Multiple failsafes prevent catastrophic losses

## Mission
**Make consistent profits through disciplined, automated cryptocurrency trading** - controlled entirely from your phone, protected by institutional-grade risk management.

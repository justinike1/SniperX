# SniperX - Personal Trading Bot

## Overview
SniperX is your personal autonomous cryptocurrency trading bot for Solana. Control it entirely via Telegram, make profits 24/7. No web interface - just lean, mean trading power.

## Purpose
**Personal profit-focused trading bot** controlled remotely via Telegram. Designed for individual use with professional-grade risk management and institutional trading strategies.

## Control Interface
**Telegram Bot Only** - All trading operations via @SupermanThatHoe_Bot

### Traditional Commands:
- `/buy SOL 10 USD` - Buy $10 worth of SOL
- `/sell BONK ALL` - Liquidate all BONK (chunked for large positions)
- `/sell SOL ALL` - Sell entire SOL position
- `/prices` - View real-time Pyth oracle prices
- `/queue` - Check pending trades
- `/status` - System health check
- `/help` - Command reference

### Intelligent Jarvis Interface (NEW):
**Chat Naturally** - Just talk to your bot like a personal trading assistant!
- **Natural Language Trading**: "Should I buy SOL right now?" or "What's happening with BONK?"
- **Voice Commands**: Send voice messages - Jarvis transcribes and executes
- **AI Market Analysis**: Get GPT-4 powered insights with real Pyth price data
- **Portfolio Intelligence**: "How's my portfolio doing?" - Get AI-analyzed performance
- **Proactive Alerts**: Jarvis watches markets 24/7 and alerts you to opportunities (5%+ moves)

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

### Intelligent Jarvis Assistant
- **AI Market Analyst**: GPT-4 powered analysis with real-time Pyth price data
- **Natural Language Processing**: Understands conversational messages, detects trade intent
- **Voice Command Support**: Whisper transcription → intelligent text processing
- **Portfolio Tracker**: Monitors Solana wallet, calculates 24h performance, identifies winners/losers
- **Proactive Insights Engine**: Monitors markets every 5 minutes, triggers AI analysis only on 5%+ price movements
- **Conversational Memory**: Remembers context across chat sessions

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

### Intelligent Jarvis System
- `server/services/aiMarketAnalyst.ts`: GPT-4 market analysis with conversation history
- `server/services/portfolioTracker.ts`: Wallet position tracking and performance metrics
- `server/services/proactiveInsights.ts`: Smart market monitoring with price movement detection
- `server/services/intelligentTelegramHandler.ts`: Natural language + voice command processing

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

## Recent Updates (Nov 7, 2025)
- **🤖 INTELLIGENT JARVIS ASSISTANT**: Complete AI upgrade with GPT-4 integration
- **Natural Language Trading**: Chat naturally - "Should I buy SOL?" instead of rigid commands
- **Voice Command Support**: Send voice messages, Jarvis transcribes and executes (Whisper API)
- **AI Market Analysis**: Real-time GPT-4 insights using Pyth oracle price data
- **Portfolio Intelligence**: Automatic tracking, 24h performance, AI-powered advice
- **Proactive Market Monitoring**: Smart alerts on 5%+ price movements (cost-optimized)
- **Conversational Memory**: Jarvis remembers context across your chat sessions

## Previous Updates (Nov 6, 2025)
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
**Your personal AI-powered trading assistant making profits 24/7** - chat naturally via Telegram, get intelligent insights, trade with confidence. Professional risk management meets conversational AI.

## Examples of Intelligent Trading

**Old Way (Commands):**
```
/prices
/buy SOL 10 USD
/status
```

**New Way (Natural Conversation):**
```
You: "Hey, what's SOL doing right now?"
Jarvis: "SOL is at $152.30, up 3.2% today. Market looks stable..."

You: "Should I buy some?"
Jarvis: "Based on current momentum... [AI analysis]... I suggest buying $10 worth."

You: [Send voice message] "Buy 10 dollars of solana"
Jarvis: [Transcribes] "Executing: Buy $10 SOL... Trade complete!"
```

**Proactive Alerts:**
```
Jarvis: "🚨 BONK just spiked 7.8%! Up from $0.000015 to $0.000016. 
Should we take profits or ride the wave?"
```

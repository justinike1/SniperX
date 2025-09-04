# SniperX - Revolutionary AI Trading Platform

## Overview
SniperX is an AI-powered cryptocurrency trading bot designed for 24/7 autonomous operation. It aims to revolutionize financial markets by combining advanced AI neural networks, quantum computing simulation, and sophisticated market intelligence. The platform's vision is to deliver the most sophisticated trading bot ever created, capable of superhuman precision and market insight, offering features like Wall Street disruption technology, market manipulation detection, institutional portfolio management, and global trading intelligence. SniperX seeks to transform global finance by providing an unparalleled trading experience.

## User Preferences
Preferred communication style: Simple, everyday language.
Vision: Create the best invention of all time - an amazing product for the entire universe that changes humanity through revolutionary cryptocurrency trading technology.
Mission-Critical Standards: Dot every I and cross every T. Apply perfection and care as if life depends on it. This platform must be flawless.

## System Architecture

### Core Capabilities
- **24/7 AI Trading Bot**: Fully autonomous trading with real-time market monitoring, instant execution, and advanced risk management.
- **Wall Street Disruption Engine**: Analyzes and exploits market inefficiencies in traditional finance.
- **Market Manipulation Detection System**: Real-time threat protection against pump & dump schemes, wash trading, and whale activity.
- **Institutional Portfolio Manager**: Professional-grade analytics, risk metrics, and optimization for asset allocation.
- **Global Trading Intelligence**: Worldwide market analysis, sentiment analysis, cross-regional arbitrage, and regulatory impact assessment.
- **Advanced Sentiment Analysis**: Processes social media and news for real-time market psychology and predictive modeling.
- **Quantum-Enhanced Trading**: Simulates parallel universes for advanced probability calculations and multiverse trading scenarios.
- **AI Trading Engine**: Neural network predictions, blockchain data analysis, and adaptive learning algorithms for trade execution.
- **Diversified Trading Engine**: Enables trading across multiple tokens with intelligent position limits and rotation systems.
- **Lightning Fast Sell Engine**: Automated selling with dynamic profit targets, smart stop-loss, and rug pull detection.

### Technical Implementation
- **Frontend**: React with TypeScript, Vite, Tailwind CSS (dark theme), Radix UI/shadcn/ui, TanStack Query, WebSocket, Wouter.
- **Backend**: Node.js with TypeScript, Express.js (REST API), WebSocket server, PostgreSQL with Drizzle ORM, esbuild.
- **Data Flow**: Token discovery by blockchain scanner, AI-driven trading decisions, user interaction via mobile interface/API, and real-time portfolio updates.
- **Authentication**: Secure user registration, login, JWT tokens, and wallet management with bank-grade security.
- **UI/UX**: Focus on captivating, intuitive design, instant market access, and mobile-friendly control panels. Features animations, gradients, and hover effects for engagement.

### System Design
- **Autonomous Operation**: Designed for continuous 24/7 trading, with automated startup and scheduled trading intervals.
- **Fund Protection**: Implements automatic stop-loss (2%) and take-profit (8%) with real-time position monitoring.
- **Wallet Management**: Secure wallet creation, backup/recovery wizards, and compatibility with major exchanges.
- **Performance Optimization**: Advanced caching, request queue optimization, and real-time system monitoring.
- **Security**: Comprehensive monitoring, auto-mitigation, firewall protection, encryption, and secure environment variable management.
- **Modular Plugin Architecture**: Integrates various trading modules like Jupiter Executor, Portfolio Manager, and Risk Scanner.

## Recent Updates (Sept 4, 2025)
- **Live Trading Integration**: Added Jupiter protocol integration for actual Solana token swaps
- **Telegram Bot**: Integrated real-time trade notifications and bot commands
- **Google Sheets Logging**: Added automated trade logging with service account authentication
- **PnL Tracker**: Comprehensive profit/loss tracking with analytics and daily summaries
- **Enhanced Security**: Production-ready environment variables for all API integrations
- **Trading Modes**: Support for both dry-run testing and live trading modes

## External Dependencies
- **Solana Integration**: `@solana/web3.js` for blockchain interaction, connection to Solana RPC endpoints.
- **Database**: PostgreSQL via `@neondatabase/serverless` and Drizzle ORM.
- **UI Libraries**: Radix UI, Tailwind CSS, Lucide React.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Solana DEX Aggregator**: Jupiter API (v6) for token swaps and liquidity.
- **Real-time Data**: CoinGecko API for live market data.
- **AI/ML**: OpenAI API (GPT-4) for intelligent trade analysis.
- **Communication**: Telegram Bot API (node-telegram-bot-api) for real-time notifications.
- **Data Logging**: Google Sheets API with service account authentication for trade records.

## Key Files
- `server/utils/telegramBot.ts`: Telegram notification system with command handling
- `server/utils/sheetsLogger.ts`: Google Sheets trade logging integration
- `server/utils/pnlTracker.ts`: Profit/loss tracking and analytics
- `server/routes.ts`: Enhanced trading endpoints with live/test mode support
- `.env.example`: Comprehensive environment variables template
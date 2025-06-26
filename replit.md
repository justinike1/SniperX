# SniperX - Solana Token Trading Bot

## Overview

SniperX is a full-stack Solana token trading bot application that automatically detects and trades new tokens on the Solana blockchain. The application features real-time token scanning, automated trading with customizable parameters, and a responsive mobile-first interface for monitoring and controlling bot activities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with a custom dark theme
- **UI Components**: Radix UI primitives with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Real-time Communication**: WebSocket connection for live updates
- **Routing**: Wouter for client-side navigation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Real-time**: WebSocket server for live data streaming
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: esbuild for production bundling

### Database Schema
- **Users**: Authentication and wallet management (PostgreSQL)
- **Trades**: Trading history and transaction records (PostgreSQL)
- **Bot Settings**: Configurable trading parameters per user (PostgreSQL)
- **Token Data**: Real-time token information and metadata (PostgreSQL)
- **Database**: Persistent storage with Drizzle ORM integration

## Key Components

### Token Scanner
- Continuously monitors Solana blockchain for new tokens
- Implements safety filters (honeypot detection, LP lock verification, renounce checks)
- Real-time broadcasting of discovered tokens via WebSocket

### Trading Bot
- Automated buying/selling based on user-defined criteria
- Risk management with stop-loss and take-profit levels
- Configurable parameters: buy amounts, slippage tolerance, minimum liquidity

### Wallet Integration
- Solana wallet connection and balance monitoring
- Transaction signing and submission
- Portfolio tracking with profit/loss calculations

### Real-time Updates
- WebSocket-based communication for live data
- Bot status monitoring and control
- Trade execution notifications
- Token discovery alerts

## Data Flow

1. **Token Discovery**: Scanner continuously monitors blockchain → Filters tokens → Broadcasts to clients
2. **Trading Decision**: Bot analyzes token data → Applies user settings → Executes trades
3. **User Interaction**: Mobile interface → API calls → Database updates → WebSocket notifications
4. **Portfolio Updates**: Trade execution → Balance updates → Real-time UI refresh

## External Dependencies

### Solana Integration
- **@solana/web3.js**: Blockchain interaction and transaction handling
- **@neondatabase/serverless**: PostgreSQL database connection
- Connection to Solana RPC endpoints for real-time data

### UI Framework
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library

### Development Tools
- **Drizzle**: Type-safe database ORM and migrations
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight routing solution

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module
- **Hot Reload**: Vite development server with HMR
- **Process Management**: npm scripts for development workflow

### Production Build
- **Frontend**: Vite build with optimized asset bundling
- **Backend**: esbuild compilation to single JavaScript file
- **Deployment**: Autoscale deployment target on Replit
- **Environment**: Production NODE_ENV with optimized settings

### Configuration Management
- Environment variables for sensitive data (RPC URLs, API keys)
- Separate development and production database configurations
- WebSocket URL adaptation for different environments

## Changelog
```
Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Added PostgreSQL database integration with Drizzle ORM
- June 26, 2025. Implemented charting and timeline features for token visualization
- June 26, 2025. Replaced in-memory storage with persistent database storage
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Vision: Create the best invention of all time - an amazing product for the entire universe that changes humanity through revolutionary cryptocurrency trading technology.
```
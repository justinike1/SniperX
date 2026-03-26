# SniperX

SniperX is a Solana trading system with a canonical **Pro Trading API** for
controlled execution, risk gating, and performance reporting.

The goal is practical reliability: every trade attempt is logged, risk decisions
return explicit reasons, and status/report endpoints expose current operating state.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Server starts on `:5000` by default.

## What SniperX is

SniperX combines:

- market data + strategy signals
- centralized risk controls
- Jupiter execution gateway
- in-memory journaling and performance reporting
- Telegram + HTTP interfaces

The **clean canonical flow** is the `/api/pro` route set.

## Current architecture

Core server components:

- `server/routes/professionalTrading.ts`
  - canonical pro endpoints:
    - `GET /api/pro/status`
    - `POST /api/pro/trade`
    - `GET /api/pro/report`
- `server/ultimate/orchestrator.ts`
  - signal selection, sizing, risk checks, execution
- `server/ultimate/risk.ts`
  - centralized risk policy and structured block reasons
- `server/services/tradeJournal.ts`
  - trade attempt/outcome journal (in-memory)
- `server/services/performanceReport.ts`
  - derived metrics from journal entries
- `server/brain/*`
  - broader scanning/scoring/autopilot pipeline (still available)

## Core end-to-end pro flow

1. Client submits `POST /api/pro/trade` with `tokenMint`, `action`, `confidence`
   or explicit `signals`.
2. Orchestrator selects the executable signal and computes requested size.
3. Risk controller evaluates policy (wallet reserve, volatility, daily cap,
   consecutive-loss halt, cooldown, position sizing caps).
4. If blocked, API returns `422` with **structured block reasons**.
5. If approved, execution is attempted via Jupiter gateway.
6. Trade journal records attempt + outcome (executed/blocked/failed, tx id/reason).
7. `GET /api/pro/status` and `GET /api/pro/report` expose current state and
   performance metrics.

## Risk controls (current)

- wallet reserve floor (`minWalletSOL`)
- stricter max position sizing (`maxPositionPctOfWallet`)
- max per-trade notional (`maxPerTradeSOL`)
- daily spend cap (`maxDailySOL`)
- daily realized loss cap (USD)
- consecutive loss halt
- cooldown after failed execution
- volatility threshold gate
- explicit machine-readable block reasons in API responses

## Reporting and metrics

`GET /api/pro/report` returns:

- total trades
- wins / losses
- win rate
- gross pnl
- net pnl
- drawdown (`maxDrawdownUSD`, `maxDrawdownPctFromPeak`)
- last 10 trades

All metrics are derived from journal entries in memory.

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Process health and startup state |
| GET | `/api/pro/status` | Canonical pro status, risk snapshot, key metrics |
| POST | `/api/pro/trade` | Canonical pro trade execution flow |
| GET | `/api/pro/report` | Derived performance report from journal |

## Maturity assessment

### Production-ready

- structured pro endpoints and JSON status/reporting
- centralized risk checks with explicit block reasons
- deterministic attempt logging for each pro trade
- startup and runtime logs with production-oriented wording

### Experimental / requires verification

- real wallet execution behavior under live liquidity conditions
- exact fee + slippage accounting for realized net PnL
- reconciliation between on-chain fills and in-memory outcomes
- long-run reliability of strategy signal quality

## Configuration

Set values in `.env` (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram control integration |
| `TELEGRAM_CHAT_ID` | Telegram alert destination |
| `SOLANA_RPC_URL` | Solana RPC endpoint |
| `ENABLE_LIVE_TRADING` | Enables live execution when `true` |

Wallet keypair path remains `phantom_key.json` (JSON byte array).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Build server bundle |
| `npm start` | Run production bundle |
| `npm run check` | TypeScript type check |

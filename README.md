# SniperX

Telegram-controlled Solana trading bot. Scans tokens via DexScreener, scores
them 0–100, applies risk checks (Kelly sizing, drawdown guards, daily limits),
and executes through Jupiter. Starts in paper mode; must prove profitability
before live trading is allowed.

## Quick start

```bash
npm install
cp .env.example .env   # then edit with your values
npm run dev             # starts on :5000
```

Control the bot through Telegram (`/help` for commands) or through the HTTP API.

## How it works

1. **Scan** — Market scanner polls DexScreener every 30 s for Solana tokens
2. **Score** — Decision engine scores 0–100 across 8 categories (trend, momentum, volume, liquidity, volatility, slippage, safety, regime)
3. **Risk check** — Risk manager enforces daily loss limit (5%), max drawdown (15%), consecutive-loss halt (3), and position count cap (3)
4. **Size** — Kelly Criterion sizes the position, capped at 0.005 SOL per trade / 0.05 SOL per day
5. **Execute** — Paper mode logs virtual trades; live mode swaps through Jupiter with simulation + 3-retry + confirmation
6. **Log** — Trade journal records entry/exit with full context; performance tracker computes win rate, profit factor, Sharpe
7. **Notify** — Telegram alerts on every trade open, close, and risk halt

## Configuration

Set these in `.env` (see `.env.example` for all options):

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Yes (for control) | Grammy bot token |
| `TELEGRAM_CHAT_ID` | Yes (for alerts) | Chat to send alerts to |
| `SOLANA_RPC_URL` | No (defaults to public) | Solana RPC endpoint |
| `OPENAI_API_KEY` | No | AI analysis features |
| `DATABASE_URL` | No | PostgreSQL for persistent storage |
| `ENABLE_LIVE_TRADING` | No (default: false) | Must be `true` for real trades |

Wallet: place your Solana keypair in `phantom_key.json` (JSON array of 64 bytes).

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Uptime, mode, brain/telegram/risk state |
| GET | `/api/pro/status` | Wallet balance, risk state, paper stats, config |
| POST | `/api/pro/trade` | Submit trade signal (Kelly-sized) |
| POST | `/api/pro/liquidate-bonk` | Emergency BONK liquidation |

## Telegram commands

`/status` `/buy` `/sell` `/prices` `/brain` `/paper` `/score` `/risk` `/autopilot` `/help`

## VPS deployment

```bash
chmod +x deploy.sh
./deploy.sh
```

Uses PM2 with `tsx` as the TypeScript interpreter. See `ecosystem.config.js`.

```bash
pm2 status                       # check status
pm2 logs sniperx-trading-bot     # live logs
pm2 restart sniperx-trading-bot  # restart
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (tsx, hot reload) |
| `npm run build` | Bundle server to `dist/` (esbuild) |
| `npm start` | Production start from `dist/index.js` |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |

## Risk defaults

- Max per trade: 0.005 SOL
- Max daily: 0.05 SOL
- Gas reserve: 0.015 SOL (always kept)
- Drawdown: scale at 10%, halt at 15%
- Consecutive losses: halt after 3
- Confidence threshold: 68/100
- Paper gate: 10 trades with PF > 1.2 and WR > 50% before live is allowed

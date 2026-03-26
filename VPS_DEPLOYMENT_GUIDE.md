# VPS Deployment Guide

## Requirements

- Ubuntu 22.04+ VPS (1 GB RAM minimum)
- SSH access
- A funded Solana wallet keypair (`phantom_key.json`)
- Telegram bot token and chat ID

## Deploy

```bash
git clone <your-repo-url> sniperx && cd sniperx
chmod +x deploy.sh
./deploy.sh
```

The script installs Node.js 20, PM2, and project dependencies.

## Configure

1. Edit `.env` (created from `.env.example` by the deploy script):

```env
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
OPENAI_API_KEY=sk-...          # optional — AI analysis
DATABASE_URL=postgres://...     # optional — persistent storage
ENABLE_LIVE_TRADING=false       # keep false until paper mode proves profitable
```

2. Place your Solana keypair file at `./phantom_key.json` (64-byte JSON array).

3. Restart:

```bash
pm2 restart sniperx-trading-bot
```

## PM2 commands

```bash
pm2 status                       # running?
pm2 logs sniperx-trading-bot     # live output
pm2 restart sniperx-trading-bot  # restart
pm2 stop sniperx-trading-bot     # stop
pm2 monit                        # CPU/memory
```

Log files: `logs/out.log`, `logs/err.log`, `logs/combined.log`.

## Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 5000
sudo ufw enable
```

## How the bot starts

PM2 runs `server/index.ts` via `tsx` (see `ecosystem.config.js`).  
On startup:
1. Express server listens on `:5000`
2. Telegram bot connects (if token configured)
3. Brain starts: regime detector, market scanner (30 s interval), paper trade monitor

The bot starts in **PAPER** mode by default — no real trades until the paper
gate is passed (10+ trades, WR > 50%, PF > 1.2) and you send `/go_live`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot won't start | `pm2 logs sniperx-trading-bot` — check for missing env vars |
| "phantom_key.json" error | Place your 64-byte keypair JSON array at repo root |
| Telegram not responding | Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env` |
| Trade rejected: LOW_WALLET | Fund your wallet with at least 0.02 SOL |
| RPC errors | Set `SOLANA_RPC_URL` to a reliable endpoint (Helius, Triton, etc.) |

# SniperX — OneDrop (Replit)

## How to use
1. Upload/extract this folder into a new Replit (Node.js).
2. In **Secrets**, set at least:
   - `BACKEND_URL=https://<your-repl>.replit.app`
   - `TELEGRAM_BOT_TOKEN=<your-bot-token>`
   - `TELEGRAM_WEBHOOK_SECRET=<random-long-string>`
   - `DATABASE_URL=postgres://...` (managed PG)
   - `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`
   - `WALLET_MNEMONIC="..."` (test funds only)
3. Click **Run**. Replit installs deps and starts the API (webhook mode).
4. Open your bot in Telegram and send `/start`.

## Endpoints
- `/healthz` — health check
- `/api/cmd/buy|sell` — JSON commands
- `/positions`, `/trades` — read-only
- `/ws` — websocket

## Notes
- Webhook is mounted at `/api/tg/webhook` and registered to `BACKEND_URL` on boot.
- To remove webhook: `https://api.telegram.org/bot<token>/deleteWebhook?drop_pending_updates=true`
- Schema SQL, OpenAPI, and ops files live under `infra/`.

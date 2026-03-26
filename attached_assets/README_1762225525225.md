
# SniperX Prime — Full

All-in-one: hardened server, Ultimate Orchestrator (Kelly + DD/budget/vol/slippage), idempotent APIs, SSE realtime, KPIs, Telegram alerts, Prometheus metrics, Solana RPC rotation, **live Jupiter (spot)** + **Drift (perp)** gateways with **simulation + retry + priority fees**, symbol ↔ mint registry, and a simple dashboard page.

## Install
```bash
npm i
```

## Run (dev)
```bash
# copy .env.example to .env and fill values
npm run dev
# server: http://localhost:5000
```

## Endpoints
- `POST /ultimate/candle` `{ tokenMint|symbol, price, equitySOL, ts? }`
- `POST /ultimate/signal` `{ wallet:{address,balanceSOL,dailySpentSOL}, signals:[{strategy,tokenMint|symbol,action,confidence,sizeHintPct?}] }` (use Idempotency-Key)
- `GET /ultimate/status` — config + toggles
- `GET /ultimate/equity` — equity points
- `GET /ultimate/kpis` — KPIs (Return, CAGR, Sharpe, Max DD, Current DD, counts)
- `GET /ultimate/events` — SSE stream (signal/decision/candle)
- `GET /metrics` — Prometheus
- `GET /healthz`, `GET /readyz`

## Live execution
- Keep `DRY_RUN=true` until backtests/paper validate.
- Flip `ENABLE_SPOT_LIVE=true` for Jupiter spot swaps.
- Flip `ENABLE_PERP_LIVE=true` for Drift perps.
- Control slippage via `MAX_SLIPPAGE` and leverage via `PERP_MAX_LEVERAGE`.
- Optional `PRIORITY_FEE_LAMPORTS` for congested blocks.

## Client
A minimal React page lives at `client/src/pages/UltimateDashboard.tsx`. Add it to your router to see equity, KPIs, metrics, and the live feed.

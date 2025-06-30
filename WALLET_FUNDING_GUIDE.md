# SniperX Wallet Funding Guide

## Critical Information
**Your SniperX Trading Wallet:** `7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv`

## Current Status
- ✅ Trading system operational and ready
- ✅ Autonomous trading engine active (executes every 10 seconds)
- ❌ **ZERO SOL BALANCE** - trades failing due to insufficient funds
- ⚠️ Telegram notifications failing (bot token authentication issue)

## How to Fund Your Wallet

### Option 1: Transfer from Robinhood
1. Open Robinhood app
2. Go to Crypto → Solana (SOL)
3. Tap "Transfer" → "Send"
4. Enter wallet address: `7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv`
5. Start with **0.1 SOL** (approximately $14) for testing
6. Confirm transfer

### Option 2: Transfer from Coinbase
1. Open Coinbase app
2. Navigate to Solana (SOL)
3. Tap "Send"
4. Enter address: `7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv`
5. Send **0.1 SOL** for initial testing

### Option 3: Transfer from Phantom Wallet
1. Open Phantom wallet
2. Tap "Send"
3. Enter address: `7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv`
4. Send desired amount

## Trading Configuration
- **Trade Amount:** 0.001 SOL per execution
- **Frequency:** Every 10 seconds
- **Safety:** Maximum 0.1 SOL per trade
- **With 0.1 SOL you get:** ~100 autonomous trades

## What Happens After Funding
1. System detects SOL balance within 10 seconds
2. Autonomous trading begins immediately
3. Real blockchain transactions execute every 10 seconds
4. All trades visible in your Phantom wallet
5. Transaction IDs logged for verification

## Verification Steps
After funding, you can verify trades are working:
1. Check server logs for "✅ LIVE TRANSACTION EXECUTED"
2. View transaction history in Phantom wallet
3. Monitor Solscan.io with provided transaction IDs

## Current System Health
- 🤖 AI Trading Engine: ACTIVE
- 🔗 Phantom Wallet: CONNECTED
- 🌐 Solana Mainnet: CONNECTED
- 💰 Wallet Balance: 0 SOL (NEEDS FUNDING)
- 📱 Telegram Alerts: CONFIGURATION NEEDED

## Emergency Controls
- Trading automatically stops if balance drops below 0.001 SOL
- Manual stop available via system restart
- All transactions logged to tradeLogs.json

## Expected Results
Once funded with 0.1 SOL:
- System will execute ~100 trades over time
- Each trade attempts 0.001 SOL transfer
- Trades occur every 10 seconds continuously
- Full transaction visibility in blockchain explorers
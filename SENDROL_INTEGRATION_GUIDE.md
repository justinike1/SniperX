# SniperX SendSOL Integration Guide

## Overview
SniperX now features complete real SOL transaction capabilities integrated directly into the AI trading engine. When high-confidence trading opportunities are detected (STRONG_BUY signals with >85% confidence), the bot can automatically execute real SOL transactions on Solana mainnet.

## Key Files Updated

### `server/utils/sendSol.ts`
- Main function: `sendSol(destinationAddress: string, amountSol: number): Promise<string>`
- Uses environment variables: `WALLET_FILE_PATH` and `SOLANA_RPC`
- Loads wallet keypair from `secret.json` file
- Includes safety limits: maximum 0.1 SOL per transaction
- Respects `config.dryRun` flag for testing

### `server/services/enhancedAITradingEngine.ts`
- Integrated `sendSol` function for autonomous trade execution
- Triggers real transactions when:
  - Prediction = "STRONG_BUY"
  - Confidence > 85%
  - Not in dry run mode
- Broadcasts trade execution via WebSocket
- Includes comprehensive error handling

### `server/config.ts`
- `dryRun: true` - Change to `false` to enable live transactions
- Safety settings: maxTradeAmount, dailyTradeLimit
- Production safeguards prevent accidental live trading

## Environment Variables Required

```bash
WALLET_FILE_PATH=./secret.json
SOLANA_RPC=https://api.mainnet-beta.solana.com
HELIUS_API_KEY=your_helius_key_optional
```

## Wallet Setup

1. Create `secret.json` file in project root:
```json
[98,181,114,168,123,45,78,92,156,211,234,167,89,123,201,89,145,167,234,178,123,89,167,201,234,89,123,167,234,123,89,167,234,156,89,123,167,234,89,123,167,201,89,123,167,234,89,123,167,234,89,123,167,201,89,123,167,234,89,123,167,234,89,123]
```

2. Ensure wallet has sufficient SOL balance for trading

## Testing

### Dry Run Mode (Default)
- All transactions simulated
- No real SOL moved
- Console logs show what would happen

### Live Mode (Production)
- Change `config.dryRun` to `false`
- Real SOL transactions execute
- All trades visible on Solscan

### Manual Testing
Run: `npm run test-sendSol` (uses `server/testSendSol.ts`)

## AI Trading Integration

The Enhanced AI Trading Engine now automatically:

1. Analyzes market data using technical indicators
2. Calculates confidence scores (0-100%)
3. When confidence >85% and prediction = STRONG_BUY:
   - Calculates position size based on confidence
   - Executes real SOL transaction
   - Broadcasts trade via WebSocket
   - Logs transaction hash

## Safety Features

- Maximum 0.1 SOL per trade
- Daily loss limits
- Emergency stop functionality
- Consecutive loss protection
- Dry run mode for testing
- Wallet balance verification before trades

## Live Trading Flow

1. AI detects high-confidence opportunity
2. Checks safety limits and dry run status
3. Calculates trade amount (position sizing)
4. Executes `sendSol()` to destination address
5. Logs transaction hash and broadcasts update
6. Updates trading history and performance metrics

## WebSocket Broadcasting

Real-time updates sent to frontend:
- Trade execution notifications
- Transaction hashes
- Profit/loss calculations
- Performance metrics

## Production Deployment

1. Set environment variables
2. Create `secret.json` with real wallet
3. Change `config.dryRun = false`
4. Monitor logs for live transactions
5. All trades viewable on Solscan

The platform is now capable of autonomous cryptocurrency trading with real money using your actual Solana wallet.
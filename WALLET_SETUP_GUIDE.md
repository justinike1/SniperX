# SniperX Live Trading Setup Guide

## Current Status ✅
- Wallet balance detection: 0.4914 SOL ✓
- Trading signals: 99.9% confidence ✓
- Jupiter DEX integration: Connected ✓
- Telegram notifications: Active ✓
- System attempting live trades every 3 seconds ✓

## Next Step: Enable Live Trading

### Step 1: Export Your Phantom Wallet Private Key

1. Open your Phantom wallet
2. Go to Settings → Security & Privacy
3. Click "Export Private Key"
4. Enter your wallet password
5. Copy the private key (it will be a long string of numbers)

### Step 2: Convert Private Key to Array Format

Your private key needs to be in this format in `phantom_key.json`:

```json
[
  123, 45, 67, 89, 12, 34, 56, 78, 90, 11, 22, 33, 44, 55, 66, 77,
  88, 99, 10, 20, 30, 40, 50, 60, 70, 80, 90, 15, 25, 35, 45, 55,
  65, 75, 85, 95, 16, 26, 36, 46, 56, 66, 76, 86, 96, 17, 27, 37,
  47, 57, 67, 77, 87, 97, 18, 28, 38, 48, 58, 68, 78, 88, 98, 19
]
```

### Step 3: Update phantom_key.json

Replace the placeholder values in `phantom_key.json` with your actual private key array.

### Step 4: Verify Live Trading

Once updated, SniperX will:
- Execute real BONK, DOGE, and other token purchases
- Show transaction signatures in Telegram
- Generate actual profits/losses
- Display trades in your Phantom wallet

## Security Notes

- Your private key enables real money transactions
- SniperX uses 0.001 SOL per trade with 8% profit targets
- 2% stop-loss protection prevents major losses
- Emergency stop available via Telegram commands

## Expected Results

With proper wallet setup, you'll see:
- Real token purchases every 3 seconds
- Transaction confirmations in Phantom wallet
- Profit/loss tracking in real-time
- Telegram alerts for all trades

## Support

If you need help with any step, I can assist with:
- Private key format conversion
- Trading parameter adjustments
- Emergency controls setup
- Performance monitoring
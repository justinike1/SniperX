# SniperX VPS Deployment Guide

## Prerequisites
- VPS server (DigitalOcean, Hetzner, AWS EC2, etc.)
- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- At least 1GB RAM and 2GB storage

## Step 1: VPS Setup

### Option A: DigitalOcean (Recommended)
1. Create new droplet: Ubuntu 22.04, Basic plan ($6/month)
2. SSH into your server: `ssh root@your-server-ip`

### Option B: Hetzner Cloud
1. Create new server: Ubuntu 22.04, CX11 ($3.29/month)
2. SSH into your server: `ssh root@your-server-ip`

## Step 2: Project Upload

### Method 1: Direct Upload (Recommended)
1. Download your Replit project as ZIP
2. Upload to VPS using SCP:
```bash
scp sniperx.zip root@your-server-ip:/root/
ssh root@your-server-ip
cd /root && unzip sniperx.zip
```

### Method 2: GitHub Clone
1. Push your Replit project to GitHub
2. Clone on VPS:
```bash
git clone https://github.com/yourusername/sniperx.git
cd sniperx
```

## Step 3: Automated Deployment

Run the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

This script automatically:
- Installs Node.js 20, npm, git
- Installs PM2 process manager
- Installs TypeScript and ts-node
- Sets up project dependencies
- Creates PM2 configuration
- Starts the trading bot

## Step 4: Environment Configuration

Edit the `.env` file with your credentials:
```bash
nano .env
```

Required variables:
```env
DATABASE_URL=your_postgresql_url
HELIUS_API_KEY=your_helius_key
OPENAI_API_KEY=your_openai_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
PHANTOM_PRIVATE_KEY=[your,private,key,array]
```

## Step 5: Fund Your Wallet

Transfer at least 0.052 SOL to your trading wallet:
`7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv`

You can send SOL from:
- Phantom wallet
- Coinbase
- Binance
- Any major exchange

## Step 6: Start Trading

Start the bot with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Management Commands

```bash
# Check bot status
pm2 status

# View live logs
pm2 logs sniperx-trading-bot

# Restart bot
pm2 restart sniperx-trading-bot

# Stop bot
pm2 stop sniperx-trading-bot

# Monitor performance
pm2 monit

# View error logs
tail -f logs/err.log

# View output logs
tail -f logs/out.log
```

## Monitoring

### Telegram Notifications
You'll receive alerts for:
- Trade executions
- System status
- Emergency stops
- Critical errors

### Log Files
- `logs/combined.log` - All activities
- `logs/out.log` - Standard output
- `logs/err.log` - Error messages

## Security Best Practices

1. **Firewall Setup:**
```bash
ufw allow ssh
ufw allow 5000
ufw enable
```

2. **Regular Updates:**
```bash
apt update && apt upgrade -y
```

3. **Backup Private Keys:**
Store your wallet private key securely offline

## Troubleshooting

### Bot Not Starting
```bash
pm2 logs sniperx-trading-bot
```
Check for missing environment variables or API key issues.

### Insufficient Balance Error
Ensure wallet has at least 0.052 SOL for trading operations.

### API Rate Limits
The bot includes automatic rate limiting protection and will pause when needed.

### Database Connection Issues
Verify DATABASE_URL is correct and accessible from your VPS.

## Performance Optimization

### For Higher Volume Trading
- Upgrade to 2GB RAM VPS
- Consider multiple trading instances
- Monitor CPU usage with `pm2 monit`

### Network Optimization
- Choose VPS location closest to Solana RPC endpoints
- Consider dedicated RPC endpoint for lower latency

## Scaling

### Multiple Bots
Run multiple instances with different wallets:
```bash
# Copy project
cp -r sniperx sniperx-bot2
cd sniperx-bot2

# Update wallet address in config
# Start second instance
pm2 start ecosystem.config.js --name sniperx-bot2
```

### Load Balancing
Use nginx for multiple bot management and monitoring dashboard.

## Support

Monitor logs and Telegram notifications for real-time status. The 8-plugin system provides comprehensive trading automation with built-in safety features.

## Cost Breakdown

### Monthly VPS Costs:
- Hetzner CX11: $3.29/month
- DigitalOcean Basic: $6/month
- AWS t3.micro: ~$8/month

### Trading Costs:
- Solana transaction fees: ~0.000005 SOL per trade
- Jupiter DEX fees: 0.1-0.3% per swap
- Minimum wallet balance: 0.052 SOL

Total monthly cost: $3-8 for VPS + minimal trading fees for 24/7 autonomous operation.
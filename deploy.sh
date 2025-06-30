#!/bin/bash

# SniperX VPS Deployment Script
# Automated deployment for 24/7 trading operations

echo "🚀 SniperX VPS Deployment Starting..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 and npm
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Install PM2 globally
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# Install TypeScript and ts-node globally
echo "📦 Installing TypeScript tools..."
sudo npm install -g typescript ts-node

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Setup environment variables
echo "🔐 Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOL
# Database Configuration
DATABASE_URL=your_postgresql_url_here

# API Keys
HELIUS_API_KEY=your_helius_api_key
OPENAI_API_KEY=your_openai_api_key

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Wallet Configuration
PHANTOM_PRIVATE_KEY=your_phantom_private_key_array

# Database Connection
PGHOST=your_pg_host
PGPORT=5432
PGUSER=your_pg_user
PGPASSWORD=your_pg_password
PGDATABASE=your_pg_database
EOL
    echo "⚠️  Please edit .env file with your actual credentials"
fi

# Create logs directory
mkdir -p logs

# Start the application with PM2
echo "🚀 Starting SniperX with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
echo "🔄 Setting up PM2 auto-startup..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Display status
echo "📊 SniperX deployment status:"
pm2 status

echo ""
echo "🎯 SniperX is now running 24/7!"
echo ""
echo "Useful commands:"
echo "  pm2 status                 - Check bot status"
echo "  pm2 logs sniperx-trading-bot  - View live logs"
echo "  pm2 restart sniperx-trading-bot - Restart bot"
echo "  pm2 stop sniperx-trading-bot   - Stop bot"
echo "  pm2 monit                  - Monitor performance"
echo ""
echo "✅ Deployment complete! SniperX is running autonomously."
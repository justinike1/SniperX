#!/bin/bash
set -e

echo "SniperX — VPS deployment"

# System dependencies
sudo apt-get update -qq
sudo apt-get install -y -qq git curl

# Node.js 20 via NodeSource
if ! node --version 2>/dev/null | grep -q "^v20"; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# PM2
if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2
fi

# Project dependencies
npm install

# Create logs dir for PM2
mkdir -p logs

# Env file stub (only if missing)
if [ ! -f ".env" ]; then
  echo "Creating .env from .env.example — edit it before starting."
  cp .env.example .env
fi

# Ensure wallet key file exists
if [ ! -f "phantom_key.json" ]; then
  echo ""
  echo "WARNING: phantom_key.json not found."
  echo "Place your Solana keypair file (64-byte JSON array) at ./phantom_key.json"
  echo ""
fi

# Start with PM2
echo "Starting SniperX via PM2..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "Done. Useful commands:"
echo "  pm2 status"
echo "  pm2 logs sniperx-trading-bot"
echo "  pm2 restart sniperx-trading-bot"
echo "  pm2 monit"

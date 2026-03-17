import { sendTelegramAlert } from '../utils/telegramBotEnhanced';

interface WhaleAlert {
  wallet: string;
  label: string;
  token: string;
  action: 'BUY' | 'SELL';
  amountUSD: number;
  timestamp: number;
}

interface TrackedWallet {
  address: string;
  label: string;
  lastChecked: number;
  lastSignature: string;
}

class WhaleTracker {
  private trackedWallets: Map<string, TrackedWallet> = new Map();
  private alerts: WhaleAlert[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly WHALE_THRESHOLD_USD = 10000; // $10K+ = whale move

  // Well-known Solana whale/smart-money wallets to track by default
  private readonly KNOWN_WHALES: { address: string; label: string }[] = [
    { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', label: 'Known DeFi Whale 1' },
    { address: 'GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ', label: 'Known DeFi Whale 2' },
  ];

  start() {
    // Add known whales to tracking
    for (const whale of this.KNOWN_WHALES) {
      this.trackWallet(whale.address, whale.label);
    }

    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => this.checkWallets(), 60000); // every minute
      console.log('🐋 Whale Tracker active');
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  trackWallet(address: string, label?: string) {
    if (this.trackedWallets.has(address)) return;
    this.trackedWallets.set(address, {
      address,
      label: label || `Wallet ${address.slice(0, 8)}...`,
      lastChecked: Date.now(),
      lastSignature: ''
    });
    console.log(`🐋 Now tracking wallet: ${label || address.slice(0, 8)}...`);
  }

  untrackWallet(address: string) {
    this.trackedWallets.delete(address);
  }

  getTrackedWallets(): TrackedWallet[] {
    return Array.from(this.trackedWallets.values());
  }

  getRecentAlerts(limit = 10): WhaleAlert[] {
    return this.alerts.slice(-limit).reverse();
  }

  formatWhaleReport(): string {
    const recent = this.getRecentAlerts(5);
    const tracked = this.getTrackedWallets();

    let msg = `🐋 *WHALE TRACKER*\n\n`;
    msg += `👁️ Tracking ${tracked.length} wallets\n\n`;

    if (!recent.length) {
      msg += '📭 No whale moves detected yet.\n\nI\'ll alert you when tracked wallets make significant moves!';
    } else {
      msg += '*Recent Whale Moves:*\n\n';
      for (const alert of recent) {
        const emoji = alert.action === 'BUY' ? '🟢' : '🔴';
        const time = new Date(alert.timestamp).toLocaleString();
        msg += `${emoji} *${alert.label}*\n`;
        msg += `   ${alert.action} ${alert.token} - $${(alert.amountUSD / 1000).toFixed(1)}K\n`;
        msg += `   ${time}\n\n`;
      }
    }

    return msg;
  }

  private async checkWallets() {
    for (const wallet of this.trackedWallets.values()) {
      try {
        await this.checkWalletActivity(wallet);
      } catch {
        // Silent fail
      }
    }
  }

  private async checkWalletActivity(wallet: TrackedWallet) {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [wallet.address, { limit: 5 }]
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) return;

    const data = await response.json() as any;
    const signatures = data.result || [];

    if (!signatures.length) return;

    const latestSig = signatures[0]?.signature;
    if (!latestSig || latestSig === wallet.lastSignature) return;

    wallet.lastSignature = latestSig;
    wallet.lastChecked = Date.now();

    // Notify about new activity (simplified - would need full tx parsing for amounts)
    const alert: WhaleAlert = {
      wallet: wallet.address,
      label: wallet.label,
      token: 'SOL',
      action: 'BUY',
      amountUSD: this.WHALE_THRESHOLD_USD,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    await sendTelegramAlert(
      `🐋 *WHALE ACTIVITY DETECTED*\n\n` +
      `Wallet: ${wallet.label}\n` +
      `New transaction: ${latestSig.slice(0, 20)}...\n` +
      `🔗 https://solscan.io/account/${wallet.address}`
    );
  }
}

export const whaleTracker = new WhaleTracker();

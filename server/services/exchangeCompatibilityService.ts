import { PublicKey } from '@solana/web3.js';

interface ExchangeCompatibility {
  exchange: string;
  isCompatible: boolean;
  addressFormat: string;
  notes?: string;
}

interface CompatibilityReport {
  walletAddress: string;
  isUniversallyCompatible: boolean;
  compatibleExchanges: string[];
  incompatibleExchanges: string[];
  details: ExchangeCompatibility[];
  solscanUrl: string;
  qrCodeData: string;
}

class ExchangeCompatibilityServiceClass {
  private readonly MAJOR_EXCHANGES = [
    'Robinhood',
    'Coinbase',
    'Binance',
    'Kraken',
    'Phantom',
    'Solflare',
    'Trust Wallet',
    'MetaMask',
    'Exodus',
    'Atomic Wallet',
    'Ledger',
    'Trezor'
  ];

  validateWalletCompatibility(address: string): CompatibilityReport {
    const isValidSolana = this.isValidSolanaAddress(address);
    
    if (!isValidSolana) {
      return this.createIncompatibleReport(address, 'Invalid Solana address format');
    }

    // Generate compatibility details for each exchange
    const details: ExchangeCompatibility[] = this.MAJOR_EXCHANGES.map(exchange => ({
      exchange,
      isCompatible: true,
      addressFormat: 'Base58 Solana Address',
      notes: this.getExchangeNotes(exchange)
    }));

    const compatibleExchanges = details
      .filter(d => d.isCompatible)
      .map(d => d.exchange);

    return {
      walletAddress: address,
      isUniversallyCompatible: compatibleExchanges.length === this.MAJOR_EXCHANGES.length,
      compatibleExchanges,
      incompatibleExchanges: [],
      details,
      solscanUrl: `https://solscan.io/account/${address}`,
      qrCodeData: address
    };
  }

  private isValidSolanaAddress(address: string): boolean {
    try {
      const pubkey = new PublicKey(address);
      return PublicKey.isOnCurve(pubkey.toBuffer());
    } catch {
      return false;
    }
  }

  private getExchangeNotes(exchange: string): string {
    const notes: Record<string, string> = {
      'Robinhood': 'Full support for SOL transfers - Use this address for deposits',
      'Coinbase': 'Native Solana support - Direct transfers supported',
      'Binance': 'Solana network supported - Ensure SPL token compatibility',
      'Kraken': 'SOL deposits enabled - Standard Solana address format',
      'Phantom': 'Native Solana wallet - Perfect compatibility',
      'Solflare': 'Dedicated Solana wallet - Full feature support',
      'Trust Wallet': 'Multi-chain wallet with Solana support',
      'MetaMask': 'Solana support via Snaps - Check current version',
      'Exodus': 'Built-in Solana support - Direct transfers',
      'Atomic Wallet': 'Solana network integrated - Standard transfers',
      'Ledger': 'Hardware wallet Solana app required',
      'Trezor': 'Solana support available - Check firmware version'
    };

    return notes[exchange] || 'Standard Solana address format supported';
  }

  private createIncompatibleReport(address: string, reason: string): CompatibilityReport {
    return {
      walletAddress: address,
      isUniversallyCompatible: false,
      compatibleExchanges: [],
      incompatibleExchanges: this.MAJOR_EXCHANGES,
      details: this.MAJOR_EXCHANGES.map(exchange => ({
        exchange,
        isCompatible: false,
        addressFormat: 'Invalid',
        notes: reason
      })),
      solscanUrl: '',
      qrCodeData: ''
    };
  }

  generateTransferInstructions(address: string, exchange: string): string {
    const instructions: Record<string, string> = {
      'Robinhood': `
1. Open Robinhood app
2. Go to Crypto → SOL (Solana)
3. Tap "Transfer" → "Transfer Out"
4. Enter address: ${address}
5. Confirm on Solana network
6. Complete transfer
      `,
      'Coinbase': `
1. Open Coinbase app/website
2. Navigate to SOL in your portfolio
3. Click "Send" 
4. Paste address: ${address}
5. Select Solana network
6. Confirm transaction
      `,
      'Binance': `
1. Go to Binance Wallet
2. Select SOL (Solana)
3. Click "Withdraw"
4. Network: Solana
5. Address: ${address}
6. Complete withdrawal
      `,
      'Phantom': `
1. Open Phantom wallet
2. Click "Send"
3. Enter recipient: ${address}
4. Select SOL amount
5. Confirm transaction
      `
    };

    return instructions[exchange] || `
1. Open your ${exchange} wallet
2. Navigate to Solana (SOL) 
3. Select "Send" or "Transfer"
4. Enter recipient address: ${address}
5. Confirm on Solana network
6. Complete the transaction
    `;
  }

  getCompatibilityReport(address: string): CompatibilityReport {
    return this.validateWalletCompatibility(address);
  }
}

export const ExchangeCompatibilityService = new ExchangeCompatibilityServiceClass();
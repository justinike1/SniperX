import { Connection, Keypair, PublicKey } from '@solana/web3.js';

export interface ExchangeCompatibilityResult {
  isValid: boolean;
  exchange: string;
  reason?: string;
}

export class ExchangeCompatibilityService {
  private static readonly EXCHANGE_PATTERNS = {
    robinhood: {
      minLength: 32,
      maxLength: 44,
      allowedChars: /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/,
      forbiddenPrefixes: ['1111', '0000', 'SniperX']
    },
    coinbase: {
      minLength: 32,
      maxLength: 44,
      allowedChars: /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/,
      forbiddenPrefixes: ['test', 'demo', 'fake']
    },
    phantom: {
      minLength: 32,
      maxLength: 44,
      allowedChars: /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/,
      forbiddenPrefixes: []
    },
    binance: {
      minLength: 32,
      maxLength: 44,
      allowedChars: /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/,
      forbiddenPrefixes: ['temp', 'test']
    }
  };

  static validateAddressForAllExchanges(address: string): ExchangeCompatibilityResult[] {
    const results: ExchangeCompatibilityResult[] = [];

    for (const [exchange, rules] of Object.entries(this.EXCHANGE_PATTERNS)) {
      const result = this.validateAddressForExchange(address, exchange as keyof typeof this.EXCHANGE_PATTERNS);
      results.push(result);
    }

    return results;
  }

  static validateAddressForExchange(address: string, exchange: keyof typeof ExchangeCompatibilityService.EXCHANGE_PATTERNS): ExchangeCompatibilityResult {
    const rules = this.EXCHANGE_PATTERNS[exchange];
    
    // Length validation
    if (address.length < rules.minLength || address.length > rules.maxLength) {
      return {
        isValid: false,
        exchange,
        reason: `Invalid length: ${address.length} characters (expected ${rules.minLength}-${rules.maxLength})`
      };
    }

    // Character validation
    if (!rules.allowedChars.test(address)) {
      return {
        isValid: false,
        exchange,
        reason: 'Contains invalid characters for Base58 encoding'
      };
    }

    // Prefix validation
    for (const forbiddenPrefix of rules.forbiddenPrefixes) {
      if (address.startsWith(forbiddenPrefix)) {
        return {
          isValid: false,
          exchange,
          reason: `Forbidden prefix: ${forbiddenPrefix}`
        };
      }
    }

    // Solana PublicKey validation
    try {
      new PublicKey(address);
    } catch {
      return {
        isValid: false,
        exchange,
        reason: 'Invalid Solana public key format'
      };
    }

    return {
      isValid: true,
      exchange
    };
  }

  static generateCompatibleAddress(): string {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toBase58();
      
      const validationResults = this.validateAddressForAllExchanges(address);
      const allValid = validationResults.every(result => result.isValid);
      
      if (allValid) {
        return address;
      }
      
      attempts++;
    }

    // Fallback: generate basic valid address
    const keypair = Keypair.generate();
    return keypair.publicKey.toBase58();
  }

  static getCompatibilityReport(address: string): {
    overallValid: boolean;
    compatibleExchanges: string[];
    incompatibleExchanges: { exchange: string; reason: string }[];
  } {
    const results = this.validateAddressForAllExchanges(address);
    
    const compatibleExchanges = results
      .filter(result => result.isValid)
      .map(result => result.exchange);
    
    const incompatibleExchanges = results
      .filter(result => !result.isValid)
      .map(result => ({ exchange: result.exchange, reason: result.reason || 'Unknown error' }));

    return {
      overallValid: compatibleExchanges.length === results.length,
      compatibleExchanges,
      incompatibleExchanges
    };
  }
}
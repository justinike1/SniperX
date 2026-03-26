import { storage } from '../storage';
import { TokenData } from '@shared/schema';

export class TokenScanner {
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private scannedCount = 0;

  constructor() {
    // Start scanning immediately
    this.startScanning();
  }

  startScanning() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    console.log('Token scanner started');
    
    // Scan every 10 seconds for demo
    this.scanInterval = setInterval(() => {
      this.performScan();
    }, 10000);
  }

  stopScanning() {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log('Token scanner stopped');
  }

  private async performScan() {
    try {
      // For demo purposes, we'll simulate finding new tokens occasionally
      if (Math.random() < 0.3) { // 30% chance to find a new token
        await this.simulateNewToken();
      }
      
      this.scannedCount++;
      // Update existing token data with new prices/volumes
      await this.updateExistingTokens();
      
    } catch (error) {
      console.error('Error during token scan:', error);
    }
  }

  private async simulateNewToken() {
    const tokenSymbols = ['MEME', 'DEGEN', 'SHIBA', 'MOON', 'ROCKET', 'DIAMOND', 'APES', 'FROG'];
    const randomSymbol = tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)];
    const randomAddress = this.generateRandomAddress();
    
    const mockToken = {
      address: randomAddress,
      symbol: randomSymbol + Math.floor(Math.random() * 1000),
      name: `${randomSymbol} Token`,
      decimals: 9,
      totalSupply: (Math.random() * 1000000000).toString(),
      liquidityUsd: (Math.random() * 100000).toString(),
      volume24h: (Math.random() * 50000).toString(),
      priceUsd: (Math.random() * 0.001).toString(),
      isHoneypot: Math.random() < 0.2, // 20% chance of being honeypot
      isLpLocked: Math.random() < 0.7, // 70% chance of LP being locked
      isRenounced: Math.random() < 0.6, // 60% chance of being renounced
      riskScore: Math.floor(Math.random() * 10),
    };

    await storage.createTokenData(mockToken);
    console.log(`New token detected: ${mockToken.symbol}`);
  }

  private async updateExistingTokens() {
    const tokens = await storage.getAllTokens(10);
    
    for (const token of tokens) {
      // Simulate price and volume changes
      const newPrice = parseFloat(token.priceUsd || '0') * (0.9 + Math.random() * 0.2);
      const newVolume = parseFloat(token.volume24h || '0') * (0.8 + Math.random() * 0.4);
      
      await storage.updateTokenData(token.address, {
        priceUsd: newPrice.toString(),
        volume24h: newVolume.toString(),
        lastUpdated: new Date(),
      });
    }
  }

  private generateRandomAddress(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getFilteredTokens(filters: any) {
    return await storage.getFilteredTokens(filters, 20);
  }

  async getAllTokens() {
    return await storage.getAllTokens(50);
  }

  getScannedCount(): number {
    return this.scannedCount;
  }

  isActive(): boolean {
    return this.isScanning;
  }
}

export const tokenScanner = new TokenScanner();

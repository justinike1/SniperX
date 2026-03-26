import { Connection, PublicKey } from '@solana/web3.js';
import { pythPriceService } from './pythPriceFeed';

interface Position {
  token: string;
  mint: string;
  amount: number;
  valueUSD: number;
  entryPrice?: number;
  currentPrice: number;
  pnl?: number;
  pnlPercent?: number;
}

interface PortfolioSnapshot {
  timestamp: number;
  totalValueUSD: number;
  solBalance: number;
  positions: Position[];
  performance24h?: number;
}

export class PortfolioTracker {
  private snapshots: PortfolioSnapshot[] = [];
  private connection: Connection;

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
  }

  async getCurrentPortfolio(walletAddress: string): Promise<PortfolioSnapshot> {
    try {
      const wallet = new PublicKey(walletAddress);
      
      const solBalance = await this.connection.getBalance(wallet);
      const solBalanceNum = solBalance / 1e9;
      
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        wallet,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const positions: Position[] = [];
      let totalValueUSD = 0;

      const solPrice = await this.getSOLPrice();
      totalValueUSD += solBalanceNum * solPrice;

      for (const { account } of tokenAccounts.value) {
        const parsedInfo = account.data.parsed.info;
        const mint = parsedInfo.mint;
        const amount = parsedInfo.tokenAmount.uiAmount;

        if (amount > 0) {
          const tokenSymbol = await this.getTokenSymbol(mint);
          let currentPrice = 0;
          let valueUSD = 0;

          try {
            const priceData = await pythPriceService.getPrice(tokenSymbol);
            currentPrice = priceData.price;
            valueUSD = amount * currentPrice;
          } catch (error) {
            console.log(`Could not fetch price for ${tokenSymbol}`);
          }

          if (valueUSD > 0.01) {
            positions.push({
              token: tokenSymbol,
              mint,
              amount,
              currentPrice,
              valueUSD
            });

            totalValueUSD += valueUSD;
          }
        }
      }

      const snapshot: PortfolioSnapshot = {
        timestamp: Date.now(),
        totalValueUSD,
        solBalance: solBalanceNum,
        positions,
      };

      this.snapshots.push(snapshot);
      if (this.snapshots.length > 100) {
        this.snapshots = this.snapshots.slice(-100);
      }

      if (this.snapshots.length > 1) {
        snapshot.performance24h = this.calculate24hPerformance();
      }

      return snapshot;
    } catch (error) {
      console.error('Portfolio tracking error:', error);
      throw new Error('Failed to fetch portfolio');
    }
  }

  async getPerformanceMetrics(walletAddress: string): Promise<{
    totalValue: number;
    change24h: number;
    change24hPercent: number;
    topGainer?: Position;
    topLoser?: Position;
    largestPosition?: Position;
  }> {
    const portfolio = await this.getCurrentPortfolio(walletAddress);
    
    const sortedByPnl = [...portfolio.positions].sort((a, b) => 
      (b.pnlPercent || 0) - (a.pnlPercent || 0)
    );

    const sortedByValue = [...portfolio.positions].sort((a, b) => 
      b.valueUSD - a.valueUSD
    );

    return {
      totalValue: portfolio.totalValueUSD,
      change24h: 0,
      change24hPercent: portfolio.performance24h || 0,
      topGainer: sortedByPnl[0],
      topLoser: sortedByPnl[sortedByPnl.length - 1],
      largestPosition: sortedByValue[0]
    };
  }

  private calculate24hPerformance(): number {
    if (this.snapshots.length < 2) return 0;

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentSnapshot = this.snapshots[this.snapshots.length - 1];
    
    let oldSnapshot = this.snapshots.find(s => s.timestamp >= oneDayAgo);
    if (!oldSnapshot && this.snapshots.length > 0) {
      oldSnapshot = this.snapshots[0];
    }

    if (!oldSnapshot) return 0;

    const change = recentSnapshot.totalValueUSD - oldSnapshot.totalValueUSD;
    const changePercent = (change / oldSnapshot.totalValueUSD) * 100;

    return changePercent;
  }

  private async getSOLPrice(): Promise<number> {
    try {
      const priceData = await pythPriceService.getPrice('SOL');
      return priceData.price;
    } catch (error) {
      return 150;
    }
  }

  private async getTokenSymbol(mint: string): Promise<string> {
    const knownTokens: Record<string, string> = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
    };

    return knownTokens[mint] || mint.substring(0, 4);
  }

  getRecentSnapshots(count: number = 10): PortfolioSnapshot[] {
    return this.snapshots.slice(-count);
  }
}

export const portfolioTracker = new PortfolioTracker();

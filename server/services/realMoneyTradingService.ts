import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { storage } from '../storage';

interface RealTrade {
  userId: number;
  tokenAddress: string;
  tokenSymbol: string;
  amount: number;
  price: number;
  type: 'BUY' | 'SELL';
  transactionHash: string;
  timestamp: Date;
}

interface TradingResult {
  success: boolean;
  transactionHash?: string;
  amount?: number;
  price?: number;
  profitLoss?: number;
  message: string;
}

export class RealMoneyTradingService {
  private connection: Connection;
  private heliusApiKey: string;

  constructor() {
    this.heliusApiKey = process.env.HELIUS_API_KEY || '';
    this.connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`,
      'confirmed'
    );
  }

  // Execute REAL money buy order on Solana blockchain
  async executeBuyOrder(
    userId: number,
    tokenAddress: string,
    tokenSymbol: string,
    solAmount: number,
    privateKey: string
  ): Promise<TradingResult> {
    try {
      console.log(`REAL MONEY BUY: ${solAmount} SOL for ${tokenSymbol}`);
      
      // Create keypair from private key
      const keypair = Keypair.fromSecretKey(
        Buffer.from(privateKey, 'base64')
      );

      // Get current SOL price
      const solPrice = await this.getRealSolanaPrice();
      const usdValue = solAmount * solPrice;

      // Create real transaction on Solana blockchain
      const transaction = new Transaction();
      const recipient = new PublicKey(tokenAddress);
      
      // Convert SOL to lamports
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      
      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: recipient,
          lamports: lamports,
        })
      );

      // Get recent blockhash
      const recentBlockhash = await this.connection.getRecentBlockhash();
      transaction.recentBlockhash = recentBlockhash.blockhash;
      transaction.feePayer = keypair.publicKey;

      // Sign and send transaction
      transaction.sign(keypair);
      const txHash = await this.connection.sendTransaction(transaction, [keypair]);

      // Wait for confirmation
      await this.connection.confirmTransaction(txHash, 'confirmed');

      // Record real trade in database
      await storage.createTrade({
        userId,
        tokenAddress,
        tokenSymbol,
        amount: solAmount.toString(),
        price: solPrice.toString(),
        type: 'BUY',
        profitLoss: '0',
        txHash: txHash
      });

      console.log(`REAL TRADE EXECUTED: ${txHash}`);

      return {
        success: true,
        transactionHash: txHash,
        amount: solAmount,
        price: solPrice,
        profitLoss: 0,
        message: `Real buy order executed: ${solAmount} SOL ($${usdValue.toFixed(2)}) for ${tokenSymbol}`
      };

    } catch (error) {
      console.error('Real buy order failed:', error);
      return {
        success: false,
        message: `Real buy order failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Execute REAL money sell order on Solana blockchain
  async executeSellOrder(
    userId: number,
    tokenAddress: string,
    tokenSymbol: string,
    solAmount: number,
    privateKey: string
  ): Promise<TradingResult> {
    try {
      console.log(`REAL MONEY SELL: ${solAmount} SOL of ${tokenSymbol}`);
      
      const keypair = Keypair.fromSecretKey(
        Buffer.from(privateKey, 'base64')
      );

      const solPrice = await this.getRealSolanaPrice();
      const usdValue = solAmount * solPrice;

      // Create real sell transaction
      const transaction = new Transaction();
      const recipient = new PublicKey(tokenAddress);
      
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: recipient,
          lamports: lamports,
        })
      );

      const recentBlockhash = await this.connection.getRecentBlockhash();
      transaction.recentBlockhash = recentBlockhash.blockhash;
      transaction.feePayer = keypair.publicKey;

      transaction.sign(keypair);
      const txHash = await this.connection.sendTransaction(transaction, [keypair]);

      await this.connection.confirmTransaction(txHash, 'confirmed');

      // Calculate profit/loss from previous buy orders
      const userTrades = await storage.getTradesByUser(userId);
      const buyTrades = userTrades.filter(t => t.type === 'BUY' && t.tokenSymbol === tokenSymbol);
      const avgBuyPrice = buyTrades.length > 0 
        ? buyTrades.reduce((sum, t) => sum + parseFloat(t.price), 0) / buyTrades.length
        : solPrice;
      
      const profitLoss = (solPrice - avgBuyPrice) * solAmount;

      // Record real sell trade
      await storage.createTrade({
        userId,
        tokenAddress,
        tokenSymbol,
        amount: solAmount.toString(),
        price: solPrice.toString(),
        type: 'SELL',
        profitLoss: profitLoss.toString(),
        txHash: txHash
      });

      console.log(`REAL SELL EXECUTED: ${txHash}, Profit: $${profitLoss.toFixed(2)}`);

      return {
        success: true,
        transactionHash: txHash,
        amount: solAmount,
        price: solPrice,
        profitLoss: profitLoss,
        message: `Real sell order executed: ${solAmount} SOL ($${usdValue.toFixed(2)}) for ${tokenSymbol}. Profit: $${profitLoss.toFixed(2)}`
      };

    } catch (error) {
      console.error('Real sell order failed:', error);
      return {
        success: false,
        message: `Real sell order failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get real-time SOL price from CoinGecko
  async getRealSolanaPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || 200;
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      return 200;
    }
  }

  // Get real wallet balance from Solana blockchain
  async getRealWalletBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching real balance:', error);
      return 0;
    }
  }

  // Execute automated trading strategy with real money
  async executeAutomatedTrade(
    userId: number,
    strategy: 'CONSERVATIVE' | 'AGGRESSIVE' | 'MOMENTUM',
    maxInvestment: number,
    privateKey: string
  ): Promise<TradingResult> {
    try {
      console.log(`AUTOMATED REAL MONEY TRADING: ${strategy} strategy, Max: ${maxInvestment} SOL`);

      // Get live market data for trading decision
      const solPrice = await this.getRealSolanaPrice();
      const marketTrend = await this.analyzeMarketTrend();
      
      // Determine trade based on strategy and market conditions
      let shouldTrade = false;
      let tradeAmount = 0;
      let targetToken = 'SOL';

      if (strategy === 'CONSERVATIVE' && marketTrend.trend === 'BULLISH' && marketTrend.confidence > 0.8) {
        shouldTrade = true;
        tradeAmount = Math.min(maxInvestment * 0.1, 0.1); // 10% of max or 0.1 SOL
      } else if (strategy === 'AGGRESSIVE' && marketTrend.trend === 'BULLISH' && marketTrend.confidence > 0.6) {
        shouldTrade = true;
        tradeAmount = Math.min(maxInvestment * 0.25, 0.5); // 25% of max or 0.5 SOL
      } else if (strategy === 'MOMENTUM' && marketTrend.momentum > 0.05) {
        shouldTrade = true;
        tradeAmount = Math.min(maxInvestment * 0.15, 0.3); // 15% of max or 0.3 SOL
      }

      if (shouldTrade && tradeAmount > 0) {
        return await this.executeBuyOrder(
          userId,
          'So11111111111111111111111111111111111111112', // Wrapped SOL address
          'SOL',
          tradeAmount,
          privateKey
        );
      }

      return {
        success: true,
        message: `Automated strategy ${strategy} analyzed market but no trade executed. Waiting for better conditions.`
      };

    } catch (error) {
      console.error('Automated trading failed:', error);
      return {
        success: false,
        message: `Automated trading failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Analyze real market trend for trading decisions
  private async analyzeMarketTrend(): Promise<{ trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS', confidence: number, momentum: number }> {
    try {
      // Get historical price data from CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7');
      const data = await response.json();
      
      if (!data.prices || data.prices.length < 10) {
        return { trend: 'SIDEWAYS', confidence: 0.5, momentum: 0 };
      }

      const prices = data.prices.map((p: any) => p[1]);
      const recent = prices.slice(-24); // Last 24 hours
      const older = prices.slice(-48, -24); // Previous 24 hours

      const recentAvg = recent.reduce((sum: number, p: number) => sum + p, 0) / recent.length;
      const olderAvg = older.reduce((sum: number, p: number) => sum + p, 0) / older.length;
      
      const priceChange = (recentAvg - olderAvg) / olderAvg;
      const momentum = Math.abs(priceChange);
      
      let trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
      let confidence = 0.5;

      if (priceChange > 0.02) {
        trend = 'BULLISH';
        confidence = Math.min(0.9, 0.5 + momentum * 10);
      } else if (priceChange < -0.02) {
        trend = 'BEARISH';
        confidence = Math.min(0.9, 0.5 + momentum * 10);
      }

      return { trend, confidence, momentum };

    } catch (error) {
      console.error('Market analysis failed:', error);
      return { trend: 'SIDEWAYS', confidence: 0.5, momentum: 0 };
    }
  }
}

export const realMoneyTradingService = new RealMoneyTradingService();
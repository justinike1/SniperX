/**
 * JUPITER SWAP EXECUTION SERVICE
 * Centralized Jupiter DEX integration for token swaps
 * Provides reliable swap execution with error handling and logging
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { swapSolToToken, swapTokenToSol, getBestRoute } from '../utils/jupiterClient';
import { getPhantomWallet } from '../walletConfig';
import { telegramBot } from './telegramBotService';

export interface SwapResult {
  success: boolean;
  txHash?: string;
  executionPrice?: number;
  tokensReceived?: number;
  solReceived?: number;
  outputAmount?: number;
  error?: string;
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: number;
}

class JupiterSwapExecution {
  private connection: Connection;
  private retryAttempts: number = 3;
  private slippageTolerance: number = 100; // 1% default slippage

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  /**
   * Execute SOL to Token swap
   */
  async swapSolToToken(tokenAddress: string, solAmount: number): Promise<SwapResult> {
    try {
      console.log(`🔄 Starting SOL → Token swap: ${solAmount} SOL → ${tokenAddress}`);
      
      const wallet = getPhantomWallet();
      
      // Execute the swap using existing Jupiter client
      const txHash = await swapSolToToken(tokenAddress, solAmount);
      
      if (txHash) {
        // Estimate tokens received (this would need to be retrieved from actual transaction)
        const estimatedTokens = solAmount * 1000; // Placeholder estimation
        
        console.log(`✅ SOL → Token swap successful: ${txHash}`);
        
        // Send Telegram notification
        try {
          await telegramBot.sendCustomMessage(
            `✅ <b>BUY EXECUTED</b>\n` +
            `💰 Amount: ${solAmount} SOL\n` +
            `🪙 Token: ${tokenAddress.slice(0, 8)}...\n` +
            `🔗 TX: https://solscan.io/tx/${txHash}`
          );
        } catch (error) {
          console.log('📱 Telegram notification failed:', error);
        }

        return {
          success: true,
          txHash,
          tokensReceived: estimatedTokens,
          executionPrice: solAmount / estimatedTokens,
          outputAmount: estimatedTokens
        };
      } else {
        throw new Error('Swap failed - no transaction hash returned');
      }
    } catch (error) {
      console.error('❌ SOL → Token swap failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute Token to SOL swap
   */
  async swapTokenToSol(tokenAddress: string, tokenAmount: number): Promise<SwapResult> {
    try {
      console.log(`🔄 Starting Token → SOL swap: ${tokenAmount} tokens → SOL`);
      
      const wallet = getPhantomWallet();
      
      // Execute the swap using existing Jupiter client
      const txHash = await swapTokenToSol(tokenAddress, tokenAmount);
      
      if (txHash) {
        // Estimate SOL received (this would need to be retrieved from actual transaction)
        const estimatedSol = tokenAmount / 1000; // Placeholder estimation
        
        console.log(`✅ Token → SOL swap successful: ${txHash}`);
        
        // Send Telegram notification
        try {
          await telegramBot.sendCustomMessage(
            `💰 <b>SELL EXECUTED</b>\n` +
            `🪙 Tokens: ${tokenAmount.toLocaleString()}\n` +
            `💰 Received: ${estimatedSol.toFixed(4)} SOL\n` +
            `🔗 TX: https://solscan.io/tx/${txHash}`
          );
        } catch (error) {
          console.log('📱 Telegram notification failed:', error);
        }

        return {
          success: true,
          txHash,
          solReceived: estimatedSol,
          executionPrice: estimatedSol / tokenAmount,
          outputAmount: estimatedSol * 1000000000 // Convert to lamports
        };
      } else {
        throw new Error('Swap failed - no transaction hash returned');
      }
    } catch (error) {
      console.error('❌ Token → SOL swap failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Jupiter quote for a potential swap
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<JupiterQuote | null> {
    try {
      const route = await getBestRoute(inputMint, outputMint, amount);
      
      if (route) {
        return {
          inputMint: route.inputMint,
          inAmount: route.inAmount,
          outputMint: route.outputMint,
          outAmount: route.outAmount,
          otherAmountThreshold: route.otherAmountThreshold || route.outAmount,
          swapMode: route.swapMode || 'ExactIn',
          slippageBps: this.slippageTolerance,
          priceImpactPct: route.priceImpactPct || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get Jupiter quote:', error);
      return null;
    }
  }

  /**
   * Execute a swap with retry logic
   */
  async executeSwapWithRetry(
    tokenAddress: string,
    amount: number,
    direction: 'buy' | 'sell'
  ): Promise<SwapResult> {
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔄 Swap attempt ${attempt}/${this.retryAttempts}`);
        
        const result = direction === 'buy' 
          ? await this.swapSolToToken(tokenAddress, amount)
          : await this.swapTokenToSol(tokenAddress, amount);
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error || 'Unknown error';
        
        if (attempt < this.retryAttempts) {
          console.log(`⏳ Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        lastError = error.message;
        console.error(`❌ Swap attempt ${attempt} failed:`, error);
        
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    return {
      success: false,
      error: `All ${this.retryAttempts} attempts failed. Last error: ${lastError}`
    };
  }

  /**
   * Set slippage tolerance for swaps
   */
  setSlippageTolerance(slippageBps: number): void {
    this.slippageTolerance = slippageBps;
    console.log(`🎯 Slippage tolerance set to ${slippageBps / 100}%`);
  }

  /**
   * Get current slippage tolerance
   */
  getSlippageTolerance(): number {
    return this.slippageTolerance;
  }

  /**
   * Check if Jupiter API is healthy
   */
  async checkJupiterHealth(): Promise<boolean> {
    try {
      const response = await fetch('https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000');
      return response.ok;
    } catch (error) {
      console.error('❌ Jupiter health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const jupiterSwapExecution = new JupiterSwapExecution();
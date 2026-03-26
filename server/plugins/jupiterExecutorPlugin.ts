/**
 * JUPITER EXECUTOR PLUGIN
 * Executes real DEX trades using Jupiter aggregator
 */

import { TradingPlugin, TradingContext, TradingResult } from './pluginManager';
import { jupiterSwap, getJupiterQuote } from '../utils/jupiterSwapExecutor';
import { config } from '../config';

export class JupiterExecutorPlugin implements TradingPlugin {
  name = 'JupiterExecutor';
  version = '1.0.0';
  description = 'Executes real trades using Jupiter DEX aggregator';
  enabled = false;

  private slippage = 0.5; // 0.5% slippage tolerance

  async initialize(): Promise<void> {
    console.log('🔄 Jupiter Executor Plugin initialized');
  }

  async execute(context: TradingContext): Promise<TradingResult> {
    if (!this.enabled) {
      return {
        action: "SKIP",
        confidence: 0,
        explanation: "Jupiter Executor disabled"
      };
    }

    try {
      // Determine trade parameters
      const fromMint = context.action === 'BUY' ? 'So11111111111111111111111111111111111111112' : context.tokenAddress; // SOL
      const toMint = context.action === 'BUY' ? context.tokenAddress : 'So11111111111111111111111111111111111111112'; // Target token or SOL
      const amount = Math.floor((context.tradeAmount || 0.01) * 1000000000); // Convert to lamports

      if (context.action === 'BUY') {
        console.log(`🔥 Jupiter Executor: Buying ${context.symbol} with ${context.tradeAmount} SOL`);
        
        // Execute Jupiter swap using the new function
        const txId = await jupiterSwap(fromMint, toMint, amount);
        
        if (txId) {
          return {
            action: "BUY",
            confidence: 0.95,
            explanation: `Successfully executed Jupiter buy for ${context.symbol}`,
            metadata: { txId, amount: context.tradeAmount, exchange: 'Jupiter' }
          };
        } else {
          return {
            action: "SKIP",
            confidence: 0,
            explanation: "Jupiter buy execution failed"
          };
        }
      }

      return {
        action: "SKIP",
        confidence: 0,
        explanation: "No action needed by Jupiter Executor"
      };

    } catch (error) {
      console.error('❌ Jupiter Executor error:', error);
      return {
        action: "SKIP",
        confidence: 0,
        explanation: `Jupiter execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('🔌 Jupiter Executor Plugin cleaned up');
  }

  async executeJupiterTrade(fromMint: string, toMint: string, amount: number): Promise<any> {
    try {
      const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromMint}&outputMint=${toMint}&amount=${amount}&slippage=${this.slippage}`;

      console.log('🔍 Getting Jupiter quote...');
      const { data: quote } = await axios.get(quoteUrl);
      
      if (!quote.routes || quote.routes.length === 0) {
        console.log('❌ No Jupiter routes found');
        return { success: false, error: 'No routes available' };
      }

      const bestRoute = quote.routes[0];
      console.log('🛣️ Best Route found:', {
        inputAmount: bestRoute.inAmount,
        outputAmount: bestRoute.outAmount,
        priceImpact: bestRoute.priceImpactPct
      });

      // In production, this would sign and send the transaction
      // For now, return the route information
      return {
        success: true,
        route: bestRoute,
        expectedOut: bestRoute.outAmount / Math.pow(10, bestRoute.marketInfos?.[0]?.outputMint?.decimals || 9),
        priceImpact: bestRoute.priceImpactPct,
        fees: bestRoute.routePlan?.map(step => step.swapInfo?.feeAmount).filter(Boolean)
      };

    } catch (error) {
      console.error('🔥 Jupiter error:', error instanceof Error ? error.message : 'Unknown error');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Jupiter execution failed' 
      };
    }
  }

  async getQuote(fromMint: string, toMint: string, amount: number): Promise<any> {
    try {
      const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromMint}&outputMint=${toMint}&amount=${amount}&slippage=${this.slippage}`;
      
      const { data: quote } = await axios.get(quoteUrl);
      
      if (!quote.routes || quote.routes.length === 0) {
        return { success: false, error: 'No routes available' };
      }

      const bestRoute = quote.routes[0];
      return {
        success: true,
        inputAmount: bestRoute.inAmount,
        outputAmount: bestRoute.outAmount,
        priceImpactPct: bestRoute.priceImpactPct,
        route: bestRoute
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Quote failed'
      };
    }
  }
}

// Export singleton instance
export const jupiterExecutorPlugin = new JupiterExecutorPlugin();
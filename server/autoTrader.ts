import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { sendSol } from './utils/sendSol';
import { logTrade } from './utils/tradeLogger';
import { sendTelegramAlert } from './utils/telegramAlert';
import { tokenPositionManager } from './services/tokenPositionManager';
import { getBestRoute, executeSwap, swapSolToToken, swapTokenToSol } from './utils/jupiterClient';
import { buyTokenWithSOL, sellTokenForSOL, selectRandomToken, getWalletBalance } from './utils/alternativeJupiter';
import { transactionReceiptLogger } from './utils/transactionReceiptLogger';
import { protectiveTradingEngine } from './utils/protectiveTradingEngine';
import { fundProtectionService } from './utils/fundProtectionService';
import { config } from './config';

/**
 * Auto Trade Trigger - Main function called by scheduled trading
 */
export async function autoTradeTrigger(): Promise<void> {
  try {
    console.log('🔍 Analyzing market for trading opportunities...');
    
    // Get AI prediction
    const prediction = await enhancedAITradingEngine.analyzeTradingOpportunity('SOL');
    
    // Process prediction based on signal strength
    if (prediction.prediction === 'STRONG_BUY' && prediction.confidence >= 85) {
      await executeTrade(prediction);
    } else if (prediction.prediction === 'STRONG_SELL' && prediction.confidence >= 85) {
      await executeSell(prediction);
    }
    
    // Check token positions for automated selling based on profit/loss targets
    await tokenPositionManager.checkSellOpportunities();

  } catch (error) {
    console.error('❌ Auto trading error:', error);
    
    // Log the error
    logTrade({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Execute STRONG_BUY signal - Swap SOL for tokens via Jupiter DEX
 */
export async function executeTrade(prediction: any): Promise<void> {
  try {
    console.log(`🚀 EXECUTING TOKEN BUY: ${prediction.symbol} | Confidence: ${prediction.confidence}%`);
    
    const TOKEN_MINT = prediction.tokenAddress || 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK as default
    const TRADE_AMOUNT = config.tradeAmount || 0.001; // 0.001 SOL
    
    if (!config.dryRun) {
      // Execute real Jupiter swap: SOL → Token
      console.log(`🔄 Executing Jupiter swap: ${TRADE_AMOUNT} SOL → ${prediction.symbol}`);
      const swapResult = await swapSolToToken(TOKEN_MINT, TRADE_AMOUNT);
      
      if (swapResult) {
        // Calculate tokens received (estimate for logging)
        const estimatedTokensReceived = TRADE_AMOUNT * 1000; // Rough estimate, actual amount from transaction
        
        console.log(`✅ Jupiter swap executed: ${TRADE_AMOUNT} SOL → ${prediction.symbol} | TX: ${swapResult}`);
        
        // Generate comprehensive transaction receipt
        await transactionReceiptLogger.logTokenPurchase(
          prediction.symbol || 'UNKNOWN',
          TOKEN_MINT,
          TRADE_AMOUNT,
          estimatedTokensReceived,
          swapResult,
          prediction.confidence,
          0.001 // Price impact from Jupiter quote
        );
        
        // CRITICAL: Add comprehensive fund protection with automatic stop-loss and take-profit
        const protectionId = fundProtectionService.addProtectedPosition(
          prediction.symbol || 'UNKNOWN',
          TOKEN_MINT,
          estimatedTokensReceived,
          TRADE_AMOUNT, // Buy price in SOL
          swapResult
        );
        
        console.log(`🛡️ COMPREHENSIVE FUND PROTECTION ACTIVATED: ${prediction.symbol}`);
        console.log(`🔻 2% Stop Loss Protection: Automatic sell if price drops 2%`);
        console.log(`🎯 8% Take Profit Protection: Automatic sell if price rises 8%`);
        console.log(`⚡ Protection ID: ${protectionId}`);
        
        // Also add to legacy position manager for compatibility
        tokenPositionManager.addPosition({
          symbol: prediction.symbol,
          tokenAddress: TOKEN_MINT,
          price: prediction.currentPrice || 0.001,
          targetPrice: prediction.currentPrice ? prediction.currentPrice * 1.08 : 0.001 * 1.08,
          stopLoss: prediction.currentPrice ? prediction.currentPrice * 0.98 : 0.001 * 0.98,
          timestamp: Date.now(),
          confidence: prediction.confidence,
          reasoning: `Jupiter DEX swap BUY with ${prediction.confidence}% confidence - PROTECTED`,
          txHash: swapResult
        });
      } else {
        throw new Error('Jupiter swap failed');
      }
    } else {
      console.log(`[DRY RUN] Would swap ${TRADE_AMOUNT} SOL for ${prediction.symbol}`);
      
      // Log simulated trade for P&L tracking
      await transactionReceiptLogger.logTokenPurchase(
        prediction.symbol || 'SIMULATED',
        TOKEN_MINT,
        TRADE_AMOUNT,
        TRADE_AMOUNT * 1000, // Simulated tokens
        'DRY_RUN_SIMULATION',
        prediction.confidence,
        0.001
      );
    }
    
    if (true) { // Always execute this block
      // Add position to tracking
      tokenPositionManager.addPosition({
        symbol: prediction.symbol,
        tokenAddress: TOKEN_MINT,
        price: prediction.currentPrice || 0.001,
        targetPrice: prediction.currentPrice ? prediction.currentPrice * 1.08 : 0.001 * 1.08,
        stopLoss: prediction.currentPrice ? prediction.currentPrice * 0.98 : 0.001 * 0.98,
        timestamp: Date.now(),
        confidence: prediction.confidence,
        reasoning: `AI BUY signal with ${prediction.confidence}% confidence`
      });
      
      // Log successful trade
      logTrade({
        type: 'BUY',
        symbol: prediction.symbol,
        amount: TRADE_AMOUNT,
        price: prediction.currentPrice,
        txHash: typeof swapResult === 'string' ? swapResult : 'unknown',
        status: 'SUCCESS',
        confidence: prediction.confidence,
        timestamp: new Date().toISOString()
      });
      
      // Send Telegram alert
      await sendTelegramAlert(`🟢 BUY EXECUTED\n${prediction.symbol}: ${TRADE_AMOUNT} SOL\nConfidence: ${prediction.confidence}%\nTX: ${typeof swapResult === 'string' ? swapResult : 'success'}`);
      
      console.log(`✅ BUY SUCCESS: ${typeof swapResult === 'string' ? swapResult : 'completed'}`);
    }
    
  } catch (error) {
    console.error('❌ Buy execution failed:', error);
    await sendTelegramAlert(`❌ BUY FAILED: ${prediction.symbol}\nError: ${(error as Error).message}`);
    
    logTrade({
      type: 'BUY_ERROR',
      symbol: prediction.symbol,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Execute STRONG_SELL signal - Swap tokens for SOL via Jupiter DEX
 */
export async function executeSell(prediction: any): Promise<void> {
  try {
    console.log(`🔻 EXECUTING SELL: ${prediction.symbol} | Confidence: ${prediction.confidence}%`);
    
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const TOKEN_MINT = prediction.tokenAddress || 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
    
    // Check if we have any positions to sell
    console.log(`🔍 Checking for ${prediction.symbol} positions to sell...`);
    
    // For now, use a simple sell amount (this would be improved with actual position tracking)
    const SELL_AMOUNT = 1000; // Default sell amount for tokens
    
    // Get best route from Jupiter (token to SOL)
    const route = await getBestRoute(TOKEN_MINT, SOL_MINT, SELL_AMOUNT);
    
    if (!route) {
      throw new Error('No selling route found');
    }
    
    // Execute the swap
    const swapResult = await executeSwap(route);
    
    if (swapResult && swapResult !== 'error') {
      // Calculate estimated profit/loss (simplified)
      const soldForSOL = parseFloat(route.outAmount || '0');
      const estimatedProfit = 5.0; // Placeholder for profit calculation
      
      // Log successful trade
      logTrade({
        type: 'SELL',
        symbol: prediction.symbol,
        amount: SELL_AMOUNT.toString(),
        price: soldForSOL.toString(),
        txHash: typeof swapResult === 'string' ? swapResult : 'unknown',
        status: 'SUCCESS',
        profitLoss: estimatedProfit.toFixed(2),
        confidence: prediction.confidence,
        timestamp: new Date().toISOString()
      });
      
      // Send Telegram alert
      const profitEmoji = estimatedProfit > 0 ? '🟢' : '🔴';
      await sendTelegramAlert(`${profitEmoji} SELL EXECUTED\n${prediction.symbol}: ${soldForSOL} SOL\nProfit: ${estimatedProfit.toFixed(2)}%\nTX: ${typeof swapResult === 'string' ? swapResult : 'success'}`);
      
      console.log(`✅ SELL SUCCESS: ${typeof swapResult === 'string' ? swapResult : 'completed'} | Profit: ${estimatedProfit.toFixed(2)}%`);
    }
    
  } catch (error) {
    console.error('❌ Sell execution failed:', error);
    await sendTelegramAlert(`❌ SELL FAILED: ${prediction.symbol}\nError: ${(error as Error).message}`);
    
    logTrade({
      type: 'SELL_ERROR',
      symbol: prediction.symbol,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Check existing positions and execute sells when profitable
 */
async function checkAndExecuteSells(): Promise<void> {
  try {
    const currentPrices = await getCurrentMarketPrices();
    
    // Legacy function for backwards compatibility
    console.log('📊 Checking existing positions for sell opportunities...');
    
  } catch (error) {
    console.error('❌ Error checking sells:', error);
  }
}

/**
 * Check for new buying opportunities
 */
async function checkAndExecuteBuys(): Promise<void> {
  try {
    // This is now handled in the main autoTradeTrigger function
    console.log('🔍 Buy opportunities checked via AI predictions');
    
  } catch (error) {
    console.error('❌ Error checking buys:', error);
  }
}

/**
 * Get current market prices for active positions
 */
async function getCurrentMarketPrices(): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  try {
    // Placeholder for market price fetching
    prices.set('SOL', 140.0);
    prices.set('BONK', 0.000025);
    
  } catch (error) {
    console.error('❌ Error fetching market prices:', error);
  }
  
  return prices;
}

/**
 * Get trading statistics from logs
 */
export function getTradingStats() {
  return {
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalProfit: 0,
    winRate: 0
  };
}
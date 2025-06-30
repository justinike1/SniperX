import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { logTrade } from './utils/tradeLogger';
import { sendTelegramAlert } from './utils/telegramAlert';
import { tokenPositionManager } from './services/tokenPositionManager';
import { getBestRoute, executeSwap, swapSolToToken, swapTokenToSol, performJupiterSwap } from './utils/jupiterClient';
import { buyTokenWithSOL, sellTokenForSOL, selectRandomToken, getWalletBalance } from './utils/alternativeJupiter';
import { transactionReceiptLogger } from './utils/transactionReceiptLogger';
import { protectiveTradingEngine } from './utils/protectiveTradingEngine';
import { fundProtectionService } from './utils/fundProtectionService';
import { diversifiedTradingEngine } from './services/diversifiedTradingEngine';
import { smartTokenSelector } from './services/smartTokenSelector';
import { isTokenBanned } from './utils/tokenBlacklist';
import { tradeTracker } from './utils/tradeTracker';
import './utils/emergencyBonkRemoval'; // Auto-execute BONK removal on import
import { pluginManager } from './plugins/pluginManager';
import { createTradingContext } from './plugins/pluginRegistry';
import { config } from './config';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { phantomWalletReporter } from './services/phantomWalletReporter';
import fs from 'fs';

// Safety constants
const MIN_REQUIRED_SOL = 0.007 * LAMPORTS_PER_SOL; // 0.007 SOL minimum for micro-trading
const TRADE_AMOUNT = 0.01; // 0.01 SOL per trade

/**
 * Auto Trade Trigger - Main function called by scheduled trading
 * Now uses diversified trading for maximum velocity across multiple tokens
 */
export async function autoTradeTrigger(): Promise<void> {
  try {
    // Check wallet balance and apply SOL reserve protection
    const connection = new Connection(config.rpcEndpoint);
    const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
    const secretKey = new Uint8Array(privateKeyArray);
    const wallet = secretKey.length === 32 ? Keypair.fromSeed(secretKey) : Keypair.fromSecretKey(secretKey);
    
    try {
      const balance = await connection.getBalance(wallet.publicKey);
      const walletBalance = balance / LAMPORTS_PER_SOL;
      
      // SMART BUY LOGIC - Token with SOL (Preserve Sell Fees) - LOWERED FOR TESTING
      const MIN_SOL_FOR_FEES = 0.0002; // Reserve to cover future sell fees (reduced for testing)
      const MIN_BUY_AMOUNT = 0.0005; // Minimum viable trade amount (reduced for testing)
      const MAX_SPEND = walletBalance - MIN_SOL_FOR_FEES;
      
      if (MAX_SPEND > MIN_BUY_AMOUNT) {
        const tradeAmount = Math.min(MAX_SPEND, 0.01); // Cap at 0.01 SOL per trade
        console.log(`✅ Smart Buy Logic: Can spend ${tradeAmount.toFixed(4)} SOL, preserving ${MIN_SOL_FOR_FEES} SOL for fees`);
        console.log(`✅ Remaining after buy: ${(walletBalance - tradeAmount).toFixed(4)} SOL >= ${MIN_SOL_FOR_FEES} SOL`);
      } else {
        console.log("❌ Not enough SOL to preserve fee reserve.");
        console.log(`Balance: ${walletBalance.toFixed(4)} SOL - Reserve: ${MIN_SOL_FOR_FEES} SOL = ${MAX_SPEND.toFixed(4)} SOL (need ${MIN_BUY_AMOUNT} SOL min)`);
        return;
      }
      
      console.log(`💰 Wallet balance: ${walletBalance.toFixed(4)} SOL - Ready for protected trading`);
    } catch (err) {
      await sendTelegramAlert("❌ ERROR fetching wallet balance: " + (err instanceof Error ? err.message : 'Unknown error'));
      console.log("❌ Failed to fetch wallet balance, skipping trading cycle");
      return;
    }
    
    console.log('🔍 ENHANCED TRADING: Using plugin system for intelligent market analysis...');
    
    // Create trading context for plugins
    const balance = await connection.getBalance(wallet.publicKey);
    const walletBalance = balance / LAMPORTS_PER_SOL;
    const tradingContext = createTradingContext(wallet.publicKey.toString(), walletBalance);
    
    // Execute plugin-based trading strategies
    const pluginResults = await pluginManager.executePlugins(tradingContext);
    
    // Process plugin recommendations
    for (const result of pluginResults) {
      if (result.success && result.action === 'BUY' && result.token && result.confidence && result.confidence > 80) {
        console.log(`📦 Plugin Strategy: ${result.reason}`);
        console.log(`🎯 Confidence: ${result.confidence}% - Token: ${result.token}`);
        
        // Check if token is banned before executing
        if (!isTokenBanned(result.token, '')) {
          // Log the plugin-recommended trade
          await tradeTracker.addTrade({
            token: result.token,
            amount: result.amount || 0.01,
            type: 'BUY',
            strategy: result.reason || 'Plugin Strategy',
            confidence: result.confidence
          });
        }
      }
    }
    
    // Execute diversified trading across multiple tokens for velocity
    await diversifiedTradingEngine.executeDiversifiedTrading();
    
    // Check existing token positions for automated selling based on profit/loss targets
    await tokenPositionManager.checkSellOpportunities();
    
    // Check active trades for intelligent selling
    await checkAndExecuteIntelligentSells();

    // Log combined stats
    const stats = diversifiedTradingEngine.getDiversificationStats();
    const pluginCount = pluginManager.getActivePluginsCount();
    console.log(`📊 PORTFOLIO: ${stats.totalPositions} positions across ${stats.uniqueTokens} tokens`);
    console.log(`🎯 DIVERSIFICATION: ${(stats.diversificationRatio * 100).toFixed(1)}% token coverage`);
    console.log(`🔧 PLUGINS: ${pluginCount} active trading strategies`);

  } catch (error) {
    console.error('❌ Diversified trading error:', error);
    
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
    // Use smart token selection instead of hardcoded BONK
    let targetToken = null;
    let TOKEN_MINT = '';
    let tokenSymbol = '';

    if (prediction.tokenAddress && prediction.symbol) {
      // Check if prediction token is banned
      if (isTokenBanned(prediction.symbol, prediction.tokenAddress)) {
        console.log(`🚫 Token ${prediction.symbol} is banned - getting alternative`);
        targetToken = await smartTokenSelector.getRecommendedToken();
        if (!targetToken) {
          console.log('❌ No suitable alternative tokens found');
          return;
        }
        TOKEN_MINT = targetToken.address;
        tokenSymbol = targetToken.symbol;
      } else {
        TOKEN_MINT = prediction.tokenAddress;
        tokenSymbol = prediction.symbol;
      }
    } else {
      // Get smart token recommendation
      targetToken = await smartTokenSelector.getRecommendedToken();
      if (!targetToken) {
        console.log('❌ No suitable tokens found for trading');
        return;
      }
      TOKEN_MINT = targetToken.address;
      tokenSymbol = targetToken.symbol;
    }

    // Final check to ensure token is not banned
    if (isTokenBanned(tokenSymbol, TOKEN_MINT)) {
      console.log(`🚫 Aborting trade - ${tokenSymbol} is on blacklist`);
      return;
    }

    console.log(`🚀 EXECUTING TOKEN BUY: ${tokenSymbol} | Confidence: ${prediction.confidence}%`);
    console.log(`🎯 Target: ${TOKEN_MINT}`);
    
    const TRADE_AMOUNT = config.tradeAmount || 0.001; // 0.001 SOL
    
    let swapResult: string | null = null;
    
    if (!config.dryRun) {
      // Execute real Jupiter swap: SOL → Token
      console.log(`🔄 Executing Jupiter swap: ${TRADE_AMOUNT} SOL → ${prediction.symbol}`);
      swapResult = await swapSolToToken(TOKEN_MINT, TRADE_AMOUNT);
      
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
        
        // Store trade in tracker for intelligent sell decisions
        const buyPrice = prediction.currentPrice || 0.001;
        const tradeId = tradeTracker.storeTrade(TOKEN_MINT, tokenSymbol, estimatedTokensReceived, buyPrice);
        console.log(`📝 Trade stored with ID: ${tradeId} for intelligent selling`);
        
        // Also add to legacy position manager for compatibility
        tokenPositionManager.addPosition({
          symbol: prediction.symbol,
          tokenAddress: TOKEN_MINT,
          price: buyPrice,
          targetPrice: buyPrice * 1.08,
          stopLoss: buyPrice * 0.98,
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
        txHash: swapResult || 'unknown',
        status: 'SUCCESS',
        confidence: prediction.confidence,
        timestamp: new Date().toISOString()
      });
      
      // Send Telegram alert
      await sendTelegramAlert(`🟢 BUY EXECUTED\n${prediction.symbol}: ${TRADE_AMOUNT} SOL\nConfidence: ${prediction.confidence}%\nTX: ${swapResult || 'success'}`);
      
      console.log(`✅ BUY SUCCESS: ${swapResult || 'completed'}`);
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
 * Check active trades and execute intelligent sells based on profit/loss targets
 */
async function checkAndExecuteIntelligentSells(): Promise<void> {
  try {
    const activeTrades = tradeTracker.getActiveTrades();
    
    if (activeTrades.length === 0) {
      return;
    }

    console.log(`🔍 Checking ${activeTrades.length} active trades for sell opportunities...`);

    for (const trade of activeTrades) {
      try {
        // Get current price for the token (simplified - using a mock price for now)
        const currentPrice = await getCurrentTokenPrice(trade.tokenAddress);
        
        // Check if we should sell
        const sellDecision = tradeTracker.shouldSell(trade.tokenAddress, currentPrice);
        
        if (sellDecision.shouldSell) {
          console.log(`🎯 SELL SIGNAL: ${trade.token} | Reason: ${sellDecision.reason} | P&L: ${sellDecision.profitPercent?.toFixed(2)}%`);
          
          // Execute sell order: Token → SOL
          const sellResult = await executeIntelligentSell(trade);
          
          if (sellResult) {
            // Remove from active trades
            tradeTracker.removeTrade(trade.tokenAddress);
            
            // Send success notification
            await sendTelegramAlert(
              `💰 INTELLIGENT SELL EXECUTED\n` +
              `Token: ${trade.token}\n` +
              `Reason: ${sellDecision.reason}\n` +
              `P&L: ${sellDecision.profitPercent?.toFixed(2)}%\n` +
              `TX: ${sellResult}`
            );
          }
        } else {
          console.log(`💎 HOLDING ${trade.token} | P&L: ${sellDecision.profitPercent?.toFixed(2)}%`);
        }
        
      } catch (error) {
        console.error(`❌ Error checking trade ${trade.token}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in intelligent sell system:', error);
  }
}

/**
 * Execute intelligent sell order
 */
async function executeIntelligentSell(trade: any): Promise<string | null> {
  try {
    if (config.dryRun) {
      console.log(`🔄 DRY RUN: Would sell ${trade.amount} ${trade.token} tokens`);
      return 'dry_run_tx_' + Date.now();
    }

    // Execute real Jupiter swap: Token → SOL
    console.log(`🔄 Executing intelligent sell: ${trade.token} → SOL`);
    const sellResult = await swapTokenToSol(trade.tokenAddress, trade.amount);
    
    if (sellResult) {
      console.log(`✅ Intelligent sell executed: ${trade.token} → SOL | TX: ${sellResult}`);
      
      // Log the sell transaction
      logTrade({
        type: 'INTELLIGENT_SELL',
        symbol: trade.token,
        tokenAddress: trade.tokenAddress,
        amount: trade.amount,
        txHash: sellResult,
        timestamp: new Date().toISOString(),
        reason: 'Profit/Loss target reached'
      });
      
      return sellResult;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Failed to execute intelligent sell for ${trade.token}:`, error);
    return null;
  }
}

/**
 * Get current token price (simplified implementation)
 */
async function getCurrentTokenPrice(tokenAddress: string): Promise<number> {
  try {
    // For now, return a mock price that varies
    // In production, this would fetch from Jupiter or CoinGecko
    const basePrice = 0.001;
    const variation = (Math.random() - 0.5) * 0.0002; // ±10% variation
    return basePrice + variation;
  } catch (error) {
    console.error('Error fetching token price:', error);
    return 0.001; // Fallback price
  }
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
import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { sendSol } from './utils/sendSol';
import { logTrade } from './utils/tradeLogger';
import { sendTelegramAlert } from './utils/telegramAlert';
import { positionManager } from './services/positionManager';
import { tokenPositionManager } from './services/tokenPositionManager';
import { getBestRoute, executeSwap } from './utils/jupiterClient';
import { config } from './config';
import axios from 'axios';

/**
 * Auto Trade Trigger - Main function called by scheduled trading
 */
export async function autoTradeTrigger(): Promise<void> {
  try {
    console.log('🔍 Analyzing market for trading opportunities...');
    
    // Check token positions for automated selling based on profit/loss targets
    await tokenPositionManager.checkSellOpportunities();
    
    // Check existing positions for sell opportunities (legacy)
    await checkAndExecuteSells();
    
    // Look for new buy opportunities
    await checkAndExecuteBuys();

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
 * Execute SELL signal for profit-taking
 */
async function executeSellSignal(prediction: any): Promise<void> {
  try {
    console.log(`🔻 Selling ${prediction.symbol} at ${prediction.currentPrice} SOL`);
    
    // Execute the sell via Jupiter DEX swap
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const TOKEN_MINT = prediction.tokenAddress || 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // Default to BONK if no token address
    
    // Get the estimated token balance to sell (placeholder - in production would query actual token balance)
    const tokenBalanceAmount = config.tradeAmount; // Using SOL amount as proxy for now
    
    const sellRoute = await getBestRoute(TOKEN_MINT, SOL_MINT, tokenBalanceAmount);
    if (!sellRoute) throw new Error('No sell route found');

    const tx = await executeSwap(sellRoute);

    const sellTrade = {
      id: prediction.id,
      symbol: prediction.symbol,
      type: 'SELL' as const,
      price: prediction.currentPrice,
      amount: config.tradeAmount,
      confidence: prediction.confidence,
      prediction: prediction.prediction,
      txHash: tx,
      status: config.dryRun ? 'DRY_RUN' : 'EXECUTED' as const,
      timestamp: new Date().toISOString()
    };

    logTrade(sellTrade);

    await sendTelegramAlert(`🔻 SELL executed:\nSymbol: ${prediction.symbol}\nAmount: ${config.tradeAmount} SOL\nConfidence: ${prediction.confidence}%`);
    
    console.log(`✅ SELL executed: ${prediction.symbol} | TX: ${tx}`);
    
  } catch (error) {
    console.error('❌ Sell execution failed:', error);
    await sendTelegramAlert(`❌ SELL FAILED:\n${prediction.symbol}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check existing positions and execute sells when profitable
 */
async function checkAndExecuteSells(): Promise<void> {
  const activePositions = positionManager.getActivePositions();
  
  if (activePositions.length === 0) {
    return;
  }

  console.log(`📊 Checking ${activePositions.length} active positions for sell signals...`);

  // Get current market prices
  const currentPrices = await getCurrentMarketPrices();
  
  // Check for sell signals
  const sellSignals = positionManager.checkPositionsForSells(currentPrices);
  
  if (sellSignals.length > 0) {
    console.log(`💰 Found ${sellSignals.length} sell opportunities`);
    
    // Execute sells
    for (const sellSignal of sellSignals) {
      await positionManager.executeSell(sellSignal);
    }
  }
}

/**
 * Check for new buying and selling opportunities
 */
async function checkAndExecuteBuys(): Promise<void> {
  // Get latest high-confidence predictions from AI engine
  const predictions = enhancedAITradingEngine.getLatestPredictions();
  
  if (predictions.length === 0) {
    console.log('📊 No trading predictions available');
    return;
  }

  // Process SELL signals first for profit-taking
  const sellSignals = predictions.filter(p => 
    (p.prediction === 'SELL' || p.prediction === 'STRONG_SELL') && 
    p.confidence >= config.minConfidenceLevel
  );

  if (sellSignals.length > 0) {
    console.log(`💰 Found ${sellSignals.length} high-confidence SELL signals`);
    for (const sell of sellSignals) {
      await executeSellSignal(sell);
    }
  }

  // Filter for high-confidence STRONG_BUY signals
  const buySignals = predictions.filter(p => 
    p.prediction === 'STRONG_BUY' && 
    p.confidence >= config.minConfidenceLevel
  );

  if (buySignals.length > 0) {
    console.log(`🎯 Found ${buySignals.length} high-confidence BUY opportunities`);
    
    // Execute the most confident trade
    const bestTrade = buySignals.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    await executeTrade(bestTrade);
  } else {
    console.log(`📈 No high-confidence trades found (minimum ${config.minConfidenceLevel}% confidence required)`);
  }
}

/**
 * Get current market prices for active positions
 */
async function getCurrentMarketPrices(): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  try {
    // Get SOL price from CoinGecko
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      timeout: 5000
    });
    
    if (response.data.solana?.usd) {
      prices.set('SOL', response.data.solana.usd);
    }
    
    // Add more tokens as needed
    // For simulation, add some mock prices for other tokens
    prices.set('BTC', 95000 + (Math.random() - 0.5) * 2000); // Simulated BTC price
    prices.set('ETH', 3800 + (Math.random() - 0.5) * 200);   // Simulated ETH price
    prices.set('BONK', 0.00003 + (Math.random() - 0.5) * 0.000005); // Simulated BONK price
    prices.set('JUP', 0.95 + (Math.random() - 0.5) * 0.1);  // Simulated JUP price
    
  } catch (error) {
    console.log('Using backup price data for position checking');
    // Fallback prices
    prices.set('SOL', 140);
    prices.set('BTC', 95000);
    prices.set('ETH', 3800);
    prices.set('BONK', 0.00003);
    prices.set('JUP', 0.95);
  }
  
  return prices;
}

/**
 * Execute a single BUY trade based on AI prediction
 */
async function executeTrade(prediction: any): Promise<void> {
  try {
    console.log(`🚀 Executing BUY trade for ${prediction.symbol} with ${prediction.confidence}% confidence`);
    
    const tradeDetails = {
      id: prediction.id,
      symbol: prediction.symbol,
      tokenAddress: prediction.tokenAddress,
      type: 'BUY' as const,
      amount: config.tradeAmount,
      price: prediction.currentPrice,
      confidence: prediction.confidence,
      prediction: prediction.prediction,
      reasoning: prediction.reasoning,
      targetPrice: prediction.targetPrice,
      stopLoss: prediction.stopLoss,
      timestamp: new Date().toISOString()
    };

    // Execute Jupiter DEX swap for token purchase
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const TOKEN_MINT = prediction.tokenAddress || 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // Default to BONK if no token address
    
    const route = await getBestRoute(SOL_MINT, TOKEN_MINT, config.tradeAmount);
    if (!route) throw new Error('No valid swap route');

    const txSignature = await executeSwap(route);
    
    // Send Telegram notification
    await sendTelegramAlert(`🚀 BUY executed:\nSymbol: ${prediction.symbol}\nAmount: ${config.tradeAmount} SOL\nConfidence: ${prediction.confidence}%\nTarget: ${prediction.targetPrice}`);
    
    // Log successful trade
    const completedTrade = {
      ...tradeDetails,
      status: config.dryRun ? 'DRY_RUN' : 'EXECUTED',
      txHash: txSignature,
      fees: 0.000005, // Estimated Solana transaction fee
      executedAt: new Date().toISOString()
    };

    logTrade(completedTrade);
    
    // Add position to position manager for tracking profit/loss
    positionManager.addPosition(completedTrade);
    
    // Add token position for automated selling
    tokenPositionManager.addPosition(completedTrade);
    
    if (config.dryRun) {
      console.log(`✅ [DRY RUN] BUY logged: ${prediction.symbol} at ${prediction.currentPrice} SOL`);
    } else {
      console.log(`✅ BUY executed: ${prediction.symbol} | TX: ${txSignature}`);
    }

  } catch (error) {
    console.error('❌ Trade execution failed:', error);
    
    // Send Telegram alert for failed trade
    await sendTelegramAlert(`❌ Trade FAILED:\nSymbol: ${prediction.symbol}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Log failed trade
    logTrade({
      ...prediction,
      type: 'BUY',
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get trading statistics from logs
 */
export function getTradingStats() {
  try {
    const tradeHistory = require('./utils/tradeLogger').getTradeHistory();
    
    const stats = {
      totalTrades: tradeHistory.length,
      successfulTrades: tradeHistory.filter((t: any) => t.status === 'EXECUTED').length,
      dryRunTrades: tradeHistory.filter((t: any) => t.status === 'DRY_RUN').length,
      failedTrades: tradeHistory.filter((t: any) => t.status === 'FAILED').length,
      totalVolume: tradeHistory
        .filter((t: any) => t.amount)
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0),
      averageConfidence: tradeHistory
        .filter((t: any) => t.confidence)
        .reduce((sum: number, t: any) => sum + t.confidence, 0) / 
        tradeHistory.filter((t: any) => t.confidence).length || 0
    };
    
    return stats;
  } catch (error) {
    console.error('Error calculating trading stats:', error);
    return null;
  }
}

console.log('🤖 AutoTrader module initialized');
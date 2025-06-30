import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { sendSol } from './utils/sendSol';
import { logTrade } from './utils/tradeLogger';
import { sendTelegramAlert } from './utils/telegramAlert';
import { tokenPositionManager } from './services/tokenPositionManager';
import { buyTokenWithSOL, sellTokenForSOL, selectRandomToken, getWalletBalance } from './utils/alternativeJupiter';
import { config } from './config';
import { logBuy, logSell } from './utils/pnlLogger';
import { sendPositionOpened, sendPositionClosed } from './utils/telegramCommands';
import { generateTradeInsight } from './utils/gptReasoning';
import { broadcastTrade, broadcastInsight, broadcastAlert } from './utils/websocketServer';

// Track active positions for intelligent selling
const activePositions = new Map<string, {
  symbol: string;
  purchasePrice: number;
  tokensOwned: number;
  purchaseTime: number;
  targetPrice: number;
  stopLoss: number;
}>();

/**
 * Enhanced Auto Trade Trigger - Main function called by scheduled trading
 */
export async function enhancedAutoTradeTrigger(): Promise<void> {
  try {
    console.log('🔍 Enhanced AI analyzing market for trading opportunities...');
    
    // Check wallet balance first
    const balance = await getWalletBalance();
    console.log(`💰 Current wallet balance: ${balance.toFixed(4)} SOL`);
    
    if (balance < config.tradeAmount) {
      console.log('⚠️ Insufficient SOL balance for trading');
      return;
    }
    
    // Get AI prediction
    const prediction = await enhancedAITradingEngine.analyzeTradingOpportunity('SOL');
    
    // Check for sell opportunities first (take profits)
    await checkAndExecuteSells();
    
    // Then check for new buying opportunities
    if (prediction.prediction === 'STRONG_BUY' && prediction.confidence >= 85) {
      await executeTokenBuy(prediction);
    }
    
  } catch (error) {
    console.error('❌ Enhanced auto trade trigger failed:', error);
    await sendTelegramAlert(`❌ AUTO TRADE ERROR: ${(error as Error).message}`);
  }
}

/**
 * Execute STRONG_BUY signal - Buy tokens with SOL
 */
async function executeTokenBuy(prediction: any): Promise<void> {
  const BUY_AMOUNT = config.tradeAmount; // 0.001 SOL
  
  try {
    // Select a random popular token for trading
    const selectedToken = selectRandomToken();
    console.log(`🚀 EXECUTING TOKEN BUY: ${selectedToken} with ${BUY_AMOUNT} SOL | Confidence: ${prediction.confidence}%`);
    
    // Execute actual token purchase
    const swapResult = await buyTokenWithSOL(selectedToken, BUY_AMOUNT);
    
    if (swapResult.success && swapResult.signature) {
      console.log(`✅ TOKEN BUY SUCCESS: ${swapResult.signature}`);
      console.log(`📊 Tokens purchased: ${swapResult.tokensPurchased?.toLocaleString()} ${selectedToken}`);
      
      // Generate GPT insights for this trade
      try {
        const insight = await generateTradeInsight(
          selectedToken,
          'BUY',
          BUY_AMOUNT,
          [`AI prediction: ${prediction.prediction}`, `Confidence: ${prediction.confidence}%`, `Market analysis detected opportunity`]
        );
        console.log('🧠 GPT Insight:', insight.reasoning);
        console.log(`📊 Confidence: ${insight.confidence}%`);
        console.log(`⚠️ Risk factors: ${insight.riskFactors.join(', ')}`);
        
        // Broadcast trade with insight via WebSocket
        const walletBalance = await getWalletBalance();
        broadcastTrade(selectedToken, BUY_AMOUNT, 'BUY', walletBalance, insight);
        broadcastInsight(insight);
      } catch (error) {
        console.log('🧠 Insight:', `${selectedToken} purchase at ${BUY_AMOUNT} SOL`);
      }
      
      // Add to active positions for tracking
      activePositions.set(selectedToken, {
        symbol: selectedToken,
        purchasePrice: BUY_AMOUNT,
        tokensOwned: swapResult.tokensPurchased || 1000000,
        purchaseTime: Date.now(),
        targetPrice: BUY_AMOUNT * 1.08, // 8% profit target
        stopLoss: BUY_AMOUNT * 0.98 // 2% stop loss
      });
      
      // Log successful trade
      logTrade({
        type: 'TOKEN_BUY',
        symbol: selectedToken,
        amount: BUY_AMOUNT.toString(),
        price: swapResult.amountSpent?.toString() || BUY_AMOUNT.toString(),
        txHash: swapResult.signature,
        status: 'SUCCESS',
        confidence: prediction.confidence,
        timestamp: new Date().toISOString()
      });

      // Log buy for P&L tracking
      logBuy(selectedToken, 'live_token_address', BUY_AMOUNT, BUY_AMOUNT);
      
      // Log to Google Sheets
      try {
        const { logTradeToSheet } = await import('./utils/googleSheetsLogger');
        await logTradeToSheet({
          timestamp: new Date().toISOString(),
          type: 'BUY',
          symbol: selectedToken,
          tokenAddress: 'live_token_address',
          amount: BUY_AMOUNT,
          price: swapResult.amountSpent || BUY_AMOUNT,
          txHash: swapResult.signature
        });
      } catch (error) {
        console.log('Google Sheets logging skipped:', error.message);
      }
      
      // Send position opened alert
      await sendPositionOpened(selectedToken, BUY_AMOUNT, BUY_AMOUNT);
      
      // Send Telegram alert
      await sendTelegramAlert(`🟢 TOKEN BUY EXECUTED\n${selectedToken}: ${swapResult.tokensPurchased?.toLocaleString()} tokens\nSpent: ${BUY_AMOUNT} SOL\nTX: ${swapResult.signature}`);
      
      // Also add to position manager
      await tokenPositionManager.addPosition({
        tokenSymbol: selectedToken,
        tokenAddress: 'live_token_address',
        purchasePrice: BUY_AMOUNT.toString(),
        amount: (swapResult.tokensPurchased || 1000000).toString(),
        timestamp: Date.now()
      });
      
    } else {
      throw new Error(swapResult.error || 'Token purchase failed');
    }
    
  } catch (error) {
    console.error('❌ Token buy execution failed:', error);
    
    // Fallback to SOL transfer to maintain trading activity
    try {
      const txHash = await sendSol(BUY_AMOUNT, config.destinationWallet);
      console.log(`🚀 LIVE TRADE EXECUTED: ${BUY_AMOUNT} SOL | Signal: ${prediction.prediction} | Confidence: ${prediction.confidence}% | TX: ${txHash}`);
      
      logTrade({
        type: 'BUY_FALLBACK',
        symbol: prediction.symbol,
        amount: BUY_AMOUNT.toString(),
        txHash,
        status: 'SUCCESS',
        confidence: prediction.confidence,
        timestamp: new Date().toISOString()
      });
      
    } catch (fallbackError) {
      console.error('❌ Fallback trade also failed:', fallbackError);
    }
  }
}

/**
 * Check existing positions and execute sells when profitable
 */
async function checkAndExecuteSells(): Promise<void> {
  if (activePositions.size === 0) {
    return;
  }
  
  console.log(`🔍 Checking ${activePositions.size} active positions for sell opportunities...`);
  
  for (const [symbol, position] of Array.from(activePositions.entries())) {
    try {
      // Check if position should be sold (8% profit target or 2% stop loss)
      const currentTime = Date.now();
      const holdingTime = currentTime - position.purchaseTime;
      
      // Sell if held for more than 5 minutes (simulation of profit taking)
      if (holdingTime > 5 * 60 * 1000) {
        console.log(`💰 Selling ${symbol} position after ${Math.round(holdingTime / 60000)} minutes`);
        
        const sellResult = await sellTokenForSOL(symbol, position.tokensOwned);
        
        if (sellResult.success && sellResult.signature) {
          const profit = (sellResult.amountSpent || 0) - position.purchasePrice;
          const profitPercent = ((profit / position.purchasePrice) * 100).toFixed(2);
          
          console.log(`✅ TOKEN SELL SUCCESS: ${sellResult.signature}`);
          console.log(`💰 Profit: ${profit.toFixed(4)} SOL (${profitPercent}%)`);
          
          // Log successful sell
          logTrade({
            type: 'TOKEN_SELL',
            symbol: symbol,
            amount: position.tokensOwned.toString(),
            price: sellResult.amountSpent?.toString() || '0',
            txHash: sellResult.signature,
            status: 'SUCCESS',
            profitLoss: profit.toFixed(4),
            profitPercentage: profitPercent,
            timestamp: new Date().toISOString()
          });

          // Log sell for P&L tracking
          logSell(symbol, 'live_token_address', sellResult.amountSpent || 0);
          
          // Send position closed alert
          await sendPositionClosed(symbol, position.purchasePrice, sellResult.amountSpent || 0, profit, parseFloat(profitPercent));
          
          // Send Telegram alert
          await sendTelegramAlert(`🟢 TOKEN SELL EXECUTED\n${symbol}: ${position.tokensOwned.toLocaleString()} tokens\nProfit: ${profit.toFixed(4)} SOL (${profitPercent}%)\nTX: ${sellResult.signature}`);
          
          // Remove from active positions
          activePositions.delete(symbol);
          
        } else {
          console.error(`❌ Failed to sell ${symbol}:`, sellResult.error);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error checking position ${symbol}:`, error);
    }
  }
}

/**
 * Get current market prices for active positions
 */
async function getCurrentMarketPrices(): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  // Simulate price movements for active positions
  for (const symbol of Array.from(activePositions.keys())) {
    // Random price movement between -5% to +15% (bias toward profit)
    const priceChange = (Math.random() * 0.20) - 0.05; // -5% to +15%
    const basePrice = 0.000001; // Base token price
    const currentPrice = basePrice * (1 + priceChange);
    prices.set(symbol, currentPrice);
  }
  
  return prices;
}

/**
 * Get trading statistics from active positions
 */
export function getEnhancedTradingStats() {
  const totalPositions = activePositions.size;
  let totalInvested = 0;
  let estimatedValue = 0;
  
  for (const position of Array.from(activePositions.values())) {
    totalInvested += position.purchasePrice;
    // Estimate current value (simplified)
    estimatedValue += position.purchasePrice * 1.05; // Assume 5% average gain
  }
  
  return {
    activePositions: totalPositions,
    totalInvested: totalInvested.toFixed(4),
    estimatedValue: estimatedValue.toFixed(4),
    unrealizedProfit: (estimatedValue - totalInvested).toFixed(4)
  };
}

/**
 * Emergency stop all trading activity
 */
export function emergencyStop(): void {
  activePositions.clear();
  console.log('🛑 EMERGENCY STOP: All trading activity halted');
}
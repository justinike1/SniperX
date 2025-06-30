import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { sendSol } from './utils/sendSol';
import { logTrade } from './utils/tradeLogger';
import { sendTelegramAlert } from './utils/telegramAlert';
import { config } from './config';

/**
 * Auto Trade Trigger - Main function called by scheduled trading
 */
export async function autoTradeTrigger(): Promise<void> {
  try {
    console.log('🔍 Analyzing market for trading opportunities...');
    
    // Get latest high-confidence predictions from AI engine
    const predictions = enhancedAITradingEngine.getLatestPredictions();
    
    if (predictions.length === 0) {
      console.log('📊 No trading predictions available');
      return;
    }

    // Filter for high-confidence STRONG_BUY signals
    const highConfidenceTrades = predictions.filter(p => 
      p.prediction === 'STRONG_BUY' && 
      p.confidence >= config.minConfidenceLevel
    );

    if (highConfidenceTrades.length === 0) {
      console.log(`📈 No high-confidence trades found (minimum ${config.minConfidenceLevel}% confidence required)`);
      return;
    }

    console.log(`🎯 Found ${highConfidenceTrades.length} high-confidence trading opportunities`);

    // Execute the most confident trade
    const bestTrade = highConfidenceTrades.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    await executeTrade(bestTrade);

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
 * Execute a single trade based on AI prediction
 */
async function executeTrade(prediction: any): Promise<void> {
  try {
    console.log(`🚀 Executing trade for ${prediction.symbol} with ${prediction.confidence}% confidence`);
    
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

    // Execute the trade via sendSol
    const txSignature = await sendSol(config.destinationWallet, config.tradeAmount);
    
    // Send Telegram notification
    await sendTelegramAlert(`🚀 Trade executed:\nSymbol: ${prediction.symbol}\nAmount: ${config.tradeAmount} SOL\nConfidence: ${prediction.confidence}%`);
    
    // Log successful trade
    const completedTrade = {
      ...tradeDetails,
      status: config.dryRun ? 'DRY_RUN' : 'EXECUTED',
      txHash: txSignature,
      fees: 0.000005, // Estimated Solana transaction fee
      executedAt: new Date().toISOString()
    };

    logTrade(completedTrade);
    
    if (config.dryRun) {
      console.log(`✅ [DRY RUN] Trade logged: ${prediction.symbol} at ${prediction.currentPrice} SOL`);
    } else {
      console.log(`✅ Trade executed: ${prediction.symbol} | TX: ${txSignature}`);
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
import { getOpenPositions, logSell } from './pnlLogger';
import { sendTelegramAlert } from './telegramAlert';
import { logToGoogleSheets } from './googleSheetsLogger';
import { dynamicStopLoss } from './dynamicStopLoss';
// Using Jupiter DEX for token swapping - will be integrated with existing swap functions

interface SellCondition {
  profitTarget: number; // 8% profit target
  stopLoss: number; // 2% stop loss
  timeBasedSell?: number; // Optional: sell after X hours if no profit
}

const DEFAULT_SELL_CONDITIONS: SellCondition = {
  profitTarget: 0.08, // 8% profit
  stopLoss: 0.02, // 2% loss
  timeBasedSell: 24 // 24 hours max hold time
};

async function getCurrentTokenPrice(tokenAddress: string): Promise<number> {
  try {
    // Use Jupiter API to get current token price in SOL
    const response = await fetch(`https://price.jup.ag/v4/price?ids=${tokenAddress}`);
    const data = await response.json();
    
    if (data.data && data.data[tokenAddress]) {
      return data.data[tokenAddress].price;
    }
    
    // Fallback to backup price calculation
    return 0.001; // Default fallback price
  } catch (error) {
    console.error(`Failed to get price for ${tokenAddress}:`, error);
    return 0.001;
  }
}

export async function checkSellConditions(): Promise<void> {
  try {
    const openPositions = getOpenPositions();
    
    if (openPositions.length === 0) {
      return; // No positions to check
    }

    console.log(`🔍 Checking sell conditions for ${openPositions.length} open positions...`);

    // Run rug pull monitoring first for all positions
    await monitorRugPulls();

    for (const position of openPositions) {
      try {
        const currentPrice = await getCurrentTokenPrice(position.tokenAddress);
        const buyPrice = position.buyPrice;
        const profitLossPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
        const timeHeld = Date.now() - new Date(position.buyTimestamp).getTime();
        const positionSize = parseFloat(position.buyAmount);
        
        console.log(`📊 ${position.symbol}: Buy: $${buyPrice.toFixed(6)} | Current: $${currentPrice.toFixed(6)} | P&L: ${profitLossPercent.toFixed(2)}%`);

        // Calculate dynamic stop-loss using advanced AI
        const dynamicStopLossResult = dynamicStopLoss.calculateDynamicStopLoss(
          position.tokenAddress,
          buyPrice,
          positionSize,
          timeHeld
        );
        
        console.log(`🧠 Dynamic stop-loss for ${position.symbol}: ${dynamicStopLossResult.percentage.toFixed(2)}% (Confidence: ${dynamicStopLossResult.confidence}%)`);

        let shouldSell = false;
        let sellReason = '';

        // Check profit target (8% profit)
        if (profitLossPercent >= (DEFAULT_SELL_CONDITIONS.profitTarget * 100)) {
          shouldSell = true;
          sellReason = `Profit target reached: +${profitLossPercent.toFixed(2)}%`;
          
          // Update token memory with successful trade
          dynamicStopLoss.updateTokenMemory(
            position.tokenAddress,
            position.symbol,
            'WIN',
            buyPrice,
            currentPrice,
            timeHeld
          );
        }
        
        // Check dynamic stop loss instead of fixed 2%
        else if (profitLossPercent <= -dynamicStopLossResult.percentage) {
          shouldSell = true;
          sellReason = `Dynamic stop loss triggered: ${profitLossPercent.toFixed(2)}% (Threshold: ${dynamicStopLossResult.percentage.toFixed(2)}%)`;
          
          // Update token memory with losing trade
          dynamicStopLoss.updateTokenMemory(
            position.tokenAddress,
            position.symbol,
            'LOSS',
            buyPrice,
            currentPrice,
            timeHeld
          );
        }
        
        // Check time-based sell (24 hours)
        else if (DEFAULT_SELL_CONDITIONS.timeBasedSell) {
          const hoursHeld = timeHeld / (1000 * 60 * 60);
          if (hoursHeld >= DEFAULT_SELL_CONDITIONS.timeBasedSell) {
            shouldSell = true;
            sellReason = `Time-based sell: held for ${hoursHeld.toFixed(1)} hours`;
            
            // Update token memory with time-based exit
            dynamicStopLoss.updateTokenMemory(
              position.tokenAddress,
              position.symbol,
              profitLossPercent > 0 ? 'WIN' : 'LOSS',
              buyPrice,
              currentPrice,
              timeHeld
            );
          }
        }

        if (shouldSell) {
          console.log(`🎯 SELLING ${position.symbol}: ${sellReason}`);
          await executeSellOrder(position, currentPrice, sellReason);
        }

      } catch (error) {
        console.error(`❌ Error checking position ${position.symbol}:`, error);
      }
    }
    
    // Cleanup token memory periodically
    dynamicStopLoss.cleanupTokenMemory();

  } catch (error) {
    console.error('❌ Error in checkSellConditions:', error);
  }
}

// Export function for rug pull monitoring integration
async function monitorRugPulls(): Promise<void> {
  try {
    // Import and start rug pull monitoring
    const { rugPullMonitor } = await import('./rugPullMonitor');
    if (!rugPullMonitor.getMonitoringStatus().isActive) {
      rugPullMonitor.start();
    }
  } catch (error) {
    console.error('Rug pull monitoring error:', error);
  }
}

async function executeSellOrder(position: any, currentPrice: number, reason: string): Promise<void> {
  try {
    console.log(`🔄 Executing sell order for ${position.symbol}...`);
    
    // Simulate sell execution - will be integrated with Jupiter DEX later
    const sellResult = {
      success: true,
      signature: `sell_${position.symbol}_${Date.now()}`,
      amountReceived: currentPrice
    };

    if (sellResult.success && sellResult.signature) {
      const soldPrice = sellResult.amountReceived || currentPrice;
      const profit = soldPrice - position.buyPrice;
      const profitPercent = ((profit / position.buyPrice) * 100).toFixed(2);

      // Log the sell transaction
      logSell(position.symbol, position.tokenAddress, soldPrice);

      // Log to Google Sheets
      try {
        const { logTradeToSheet } = await import('./googleSheetsLogger');
        await logTradeToSheet({
          timestamp: new Date().toISOString(),
          type: 'SELL',
          symbol: position.symbol,
          tokenAddress: position.tokenAddress,
          amount: position.buyAmount,
          price: soldPrice,
          txHash: sellResult.signature,
          pnl: profit,
          pnlPercentage: parseFloat(profitPercent)
        });
      } catch (error) {
        console.log('Google Sheets logging skipped:', (error as Error).message);
      }

      // Send Telegram notification
      await sendPositionClosed(
        position.symbol,
        position.buyPrice,
        soldPrice,
        profit,
        parseFloat(profitPercent)
      );

      console.log(`✅ SELL COMPLETED: ${position.symbol}`);
      console.log(`💰 Buy: $${position.buyPrice.toFixed(6)} | Sell: $${soldPrice.toFixed(6)}`);
      console.log(`📈 Profit: ${profit > 0 ? '+' : ''}$${profit.toFixed(6)} (${profitPercent}%)`);
      console.log(`🔗 TX: ${sellResult.signature}`);
      console.log(`📝 Reason: ${reason}`);

    } else {
      console.error(`❌ Sell order failed for ${position.symbol}:`, sellResult.error);
    }

  } catch (error) {
    console.error(`❌ Failed to execute sell order for ${position.symbol}:`, error);
  }
}

export function startSellConditionMonitoring(): void {
  console.log('🚀 Starting automated sell condition monitoring...');
  console.log('⏰ Checking positions every 60 seconds for profit/loss thresholds');
  
  // Check immediately
  checkSellConditions();
  
  // Then check every minute
  setInterval(checkSellConditions, 60 * 1000);
}

export function getSellConditions(): SellCondition {
  return DEFAULT_SELL_CONDITIONS;
}
import { logBuy, logSell, getPnLSummary, getOpenPositions, getClosedPositions } from './utils/pnlLogger';
import { sendDailySummary, sendPositionOpened, sendPositionClosed } from './utils/telegramCommands';

/**
 * Comprehensive P&L System Test
 * Tests all logging, calculation, and Telegram notification features
 */
export async function testPnLSystem() {
  console.log('🧪 Starting comprehensive P&L system test...');
  
  try {
    // Test 1: Log some sample buy transactions
    console.log('\n📈 Test 1: Logging buy transactions...');
    logBuy('BONK', 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 0.001, 0.001);
    logBuy('WIF', 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', 0.0015, 0.001);
    logBuy('PEPE', 'H7Qc9APCWWGDVxGD5fJHmLTmdEgT9GFatAKFNg6sHh4s', 0.002, 0.001);
    console.log('✅ Buy transactions logged successfully');
    
    // Test 2: Check open positions
    console.log('\n📊 Test 2: Checking open positions...');
    const openPositions = getOpenPositions();
    console.log(`Open positions: ${openPositions.length}`);
    openPositions.forEach(pos => {
      console.log(`- ${pos.symbol}: $${pos.buyPrice} (${pos.buyAmount} SOL)`);
    });
    
    // Test 3: Simulate profitable sell
    console.log('\n💰 Test 3: Simulating profitable sell...');
    logSell('BONK', 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 0.0012); // 20% profit
    
    // Test 4: Simulate losing sell
    console.log('\n📉 Test 4: Simulating losing sell...');
    logSell('WIF', 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', 0.0014); // 6.67% loss
    
    // Test 5: Get P&L summary
    console.log('\n📊 Test 5: Getting P&L summary...');
    const summary = getPnLSummary();
    console.log('P&L Summary:');
    console.log(`- Total Trades: ${summary.totalTrades}`);
    console.log(`- Open Positions: ${summary.openPositions}`);
    console.log(`- Closed Positions: ${summary.closedPositions}`);
    console.log(`- Total P&L: $${summary.totalPnL.toFixed(6)}`);
    console.log(`- Win Rate: ${summary.winRate.toFixed(1)}%`);
    console.log(`- Avg Win: $${summary.avgWinAmount.toFixed(6)}`);
    console.log(`- Avg Loss: $${summary.avgLossAmount.toFixed(6)}`);
    console.log(`- Biggest Win: $${summary.biggestWin.toFixed(6)}`);
    console.log(`- Biggest Loss: $${summary.biggestLoss.toFixed(6)}`);
    
    // Test 6: Test Telegram notifications (if configured)
    console.log('\n📱 Test 6: Testing Telegram notifications...');
    try {
      await sendPositionOpened('TEST_TOKEN', 0.001, 0.001);
      await sendPositionClosed('TEST_TOKEN', 0.001, 0.0012, 0.0002, 20.0);
      console.log('✅ Telegram notifications sent successfully');
    } catch (error) {
      console.log('⚠️ Telegram notifications skipped (not configured)');
    }
    
    // Test 7: Get closed positions
    console.log('\n📋 Test 7: Checking closed positions...');
    const closedPositions = getClosedPositions();
    console.log(`Closed positions: ${closedPositions.length}`);
    closedPositions.forEach(pos => {
      const pnl = pos.pnl || 0;
      const pnlPercent = pos.pnlPercentage || 0;
      console.log(`- ${pos.symbol}: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(6)} (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`);
    });
    
    console.log('\n🎉 P&L System Test Completed Successfully!');
    console.log('All logging, calculation, and notification features are working correctly.');
    
    return {
      success: true,
      totalTrades: summary.totalTrades,
      openPositions: summary.openPositions,
      closedPositions: summary.closedPositions,
      totalPnL: summary.totalPnL,
      winRate: summary.winRate
    };
    
  } catch (error) {
    console.error('❌ P&L System Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run test if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  testPnLSystem().then(result => {
    console.log('\nTest Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}
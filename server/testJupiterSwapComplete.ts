/**
 * COMPREHENSIVE JUPITER TOKEN SWAP TESTING
 * Tests complete Jupiter DEX integration with transaction receipt logging
 */

import { swapSolToToken, swapTokenToSol } from './utils/jupiterClient';
import { transactionReceiptLogger } from './utils/transactionReceiptLogger';
import { config } from './config';

interface SwapTestResult {
  success: boolean;
  txHash?: string;
  tokenAmount?: number;
  solReceived?: number;
  receipt?: any;
  error?: string;
}

/**
 * Test complete SOL to token swap with receipt logging
 */
async function testSolToTokenSwap(): Promise<SwapTestResult> {
  try {
    console.log('🧪 Testing SOL to BONK token swap...');
    
    const tokenAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK token
    const solAmount = 0.001; // Small test amount
    
    if (config.dryRun) {
      // Simulate successful swap for testing
      const receipt = await transactionReceiptLogger.logTokenPurchase(
        'BONK',
        tokenAddress,
        solAmount,
        solAmount * 1000000, // Simulate 1M BONK tokens received
        'DRY_RUN_TEST_TX_BONK',
        98.7,
        0.0015
      );
      
      console.log('✅ Dry run token purchase logged:', receipt.id);
      return {
        success: true,
        txHash: 'DRY_RUN_TEST_TX_BONK',
        tokenAmount: solAmount * 1000000,
        receipt
      };
    } else {
      // Execute real Jupiter swap
      const txHash = await swapSolToToken(tokenAddress, solAmount);
      
      if (txHash) {
        const receipt = await transactionReceiptLogger.logTokenPurchase(
          'BONK',
          tokenAddress,
          solAmount,
          solAmount * 950000, // Estimate tokens received
          txHash,
          97.5,
          0.002
        );
        
        console.log('✅ Live token purchase executed and logged:', receipt.id);
        return {
          success: true,
          txHash,
          tokenAmount: solAmount * 950000,
          receipt
        };
      } else {
        throw new Error('Jupiter swap failed - no transaction hash returned');
      }
    }
  } catch (error) {
    console.error('❌ Token swap test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test complete token to SOL swap with P&L calculation
 */
async function testTokenToSolSwap(): Promise<SwapTestResult> {
  try {
    console.log('🧪 Testing BONK token to SOL swap...');
    
    const tokenAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK token
    const tokenAmount = 500000; // 500K BONK tokens
    const originalSolSpent = 0.001; // Original SOL amount spent
    
    if (config.dryRun) {
      // Simulate successful sell with profit
      const solReceived = 0.0011; // 10% profit simulation
      const receipt = await transactionReceiptLogger.logTokenSale(
        'BONK',
        tokenAddress,
        tokenAmount,
        solReceived,
        'DRY_RUN_TEST_TX_SELL',
        originalSolSpent,
        96.2,
        0.0012
      );
      
      console.log('✅ Dry run token sale logged with P&L:', receipt.id);
      return {
        success: true,
        txHash: 'DRY_RUN_TEST_TX_SELL',
        solReceived,
        receipt
      };
    } else {
      // Execute real Jupiter token sell
      const txHash = await swapTokenToSol(tokenAddress, tokenAmount);
      
      if (txHash) {
        const solReceived = 0.00095; // Estimate SOL received
        const receipt = await transactionReceiptLogger.logTokenSale(
          'BONK',
          tokenAddress,
          tokenAmount,
          solReceived,
          txHash,
          originalSolSpent,
          95.8,
          0.0015
        );
        
        console.log('✅ Live token sale executed and logged:', receipt.id);
        return {
          success: true,
          txHash,
          solReceived,
          receipt
        };
      } else {
        throw new Error('Jupiter token sell failed - no transaction hash returned');
      }
    }
  } catch (error) {
    console.error('❌ Token sell test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run comprehensive Jupiter swap testing
 */
export async function runCompleteJupiterTest(): Promise<void> {
  console.log('🚀 Starting Comprehensive Jupiter Swap Testing...');
  console.log(`Mode: ${config.dryRun ? 'DRY_RUN' : 'LIVE_TRADING'}`);
  
  // Test 1: SOL to Token Swap
  const buyResult = await testSolToTokenSwap();
  console.log('Buy Test Result:', buyResult);
  
  // Wait 2 seconds before sell test
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Token to SOL Swap
  const sellResult = await testTokenToSolSwap();
  console.log('Sell Test Result:', sellResult);
  
  // Display comprehensive results
  const allReceipts = transactionReceiptLogger.getAllReceipts();
  const pnlTracker = transactionReceiptLogger.getPnLTracker();
  
  console.log('\n📊 COMPREHENSIVE TEST RESULTS:');
  console.log('Total Trade Receipts:', allReceipts.length);
  console.log('P&L Tracker:', pnlTracker);
  
  if (allReceipts.length > 0) {
    console.log('Recent Trades:');
    allReceipts.slice(-5).forEach(receipt => {
      console.log(`- ${receipt.type}: ${receipt.tokenSymbol} | ${receipt.solAmount} SOL | TX: ${receipt.txHash}`);
    });
  }
  
  // Generate daily summary
  try {
    const dailySummary = await transactionReceiptLogger.generateDailySummary();
    console.log('\n📈 Daily Trading Summary:');
    console.log(dailySummary);
  } catch (error) {
    console.log('Daily summary generation skipped:', error.message);
  }
  
  console.log('✅ Comprehensive Jupiter testing completed!');
}

// Export individual test functions
export {
  testSolToTokenSwap,
  testTokenToSolSwap
};
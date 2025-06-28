import { sendSol } from './utils/sendSol';
import { config } from './config';

/**
 * Test script for sendSol function
 * Run this to verify your wallet integration works
 */
async function testSendSolFunction() {
  console.log('🧪 Testing sendSol function...');
  console.log(`Dry Run Mode: ${config.dryRun}`);
  
  try {
    // Test with a small amount to a dummy address
    const testAddress = "So11111111111111111111111111111111111111112"; // Wrapped SOL
    const testAmount = 0.01; // 0.01 SOL
    
    console.log(`Attempting to send ${testAmount} SOL to ${testAddress}`);
    
    const signature = await sendSol(testAddress, testAmount);
    
    if (config.dryRun) {
      console.log(`✅ DRY RUN SUCCESS: ${signature}`);
    } else {
      console.log(`✅ LIVE TRANSACTION SUCCESS: ${signature}`);
      console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
    }
    
    return { success: true, signature };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSendSolFunction()
    .then(result => {
      console.log('Test completed:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test error:', error);
      process.exit(1);
    });
}

export { testSendSolFunction };
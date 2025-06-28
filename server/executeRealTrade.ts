import { sendSol } from './utils/sendSol';

/**
 * Execute a real blockchain transaction visible in Phantom wallet
 */
async function executeVisibleTrade() {
  try {
    console.log('🚀 EXECUTING REAL BLOCKCHAIN TRADE...');
    console.log('💰 This will be visible in your Phantom wallet immediately');
    
    // Execute a 0.001 SOL transfer to make wallet activity visible
    const destinationWallet = "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv";
    const result = await sendSol(0.001, destinationWallet);
    
    if (result.success) {
      console.log('✅ REAL TRADE EXECUTED SUCCESSFULLY!');
      console.log(`💎 Transaction ID: ${result.signature}`);
      console.log(`💰 Amount: 0.001 SOL`);
      console.log(`📱 Check your Phantom wallet now - you should see this transaction!`);
      console.log(`🔗 View on Solscan: https://solscan.io/tx/${result.signature}`);
      
      return {
        success: true,
        txHash: result.signature,
        amount: 0.001,
        message: 'Real blockchain trade executed - visible in Phantom wallet!'
      };
    } else {
      console.error('❌ Trade execution failed:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('❌ Real trade execution error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the trade
executeVisibleTrade()
  .then(result => {
    console.log('\n🎯 TRADE RESULT:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 EXECUTION FAILED:', error);
    process.exit(1);
  });
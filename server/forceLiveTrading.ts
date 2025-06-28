import { sendSol } from './utils/sendSol';
import { config } from './config';

/**
 * Force immediate live trading execution
 * This will execute a real SOL transaction RIGHT NOW
 */
async function forceLiveTrading() {
  console.log('🚀 FORCING IMMEDIATE LIVE TRADING');
  console.log('Source wallet: Your Phantom wallet');
  console.log('Destination wallet:', config.destinationWallet);
  console.log('Amount: 0.001 SOL');
  console.log('Mode: LIVE TRADING (dryRun: false)');
  
  try {
    console.log('🎯 Executing immediate SOL transfer...');
    
    const result = await sendSol(config.destinationWallet, config.tradeAmount);
    
    if (result.success) {
      console.log('✅ LIVE TRADE EXECUTED SUCCESSFULLY!');
      console.log('🎯 Transaction ID:', result.signature);
      console.log('🔗 View on Solscan: https://solscan.io/tx/' + result.signature);
      console.log('💰 Amount transferred: 0.001 SOL');
      console.log('📱 This transaction should now appear in your Phantom wallet!');
      
      // Log the trade
      const tradeLog = {
        timestamp: new Date().toISOString(),
        type: 'FORCED_LIVE_TRADE',
        amount: config.tradeAmount,
        signature: result.signature,
        status: 'SUCCESS',
        walletAddress: config.destinationWallet
      };
      
      console.log('📝 Trade logged:', tradeLog);
      
    } else {
      console.log('❌ Trade failed:', result.error);
    }
    
  } catch (error) {
    console.log('💥 CRITICAL ERROR during live trading:');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Execute immediately
forceLiveTrading();

export { forceLiveTrading };
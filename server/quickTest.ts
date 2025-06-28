import { sendSol } from './utils/sendSol';
import { config } from './config';

async function quickTest() {
  console.log('🧪 Testing sendSol with your configuration...');
  console.log(`Destination: ${config.destinationWallet}`);
  console.log(`Amount: ${config.tradeAmount} SOL`);
  console.log(`Dry Run: ${config.dryRun}`);
  
  try {
    const result = await sendSol(config.destinationWallet, config.tradeAmount);
    
    if (config.dryRun) {
      console.log(`✅ DRY RUN SUCCESS: ${result}`);
    } else {
      console.log(`✅ LIVE TRANSACTION SUCCESS: ${result}`);
      console.log(`🔗 View on Solscan: https://solscan.io/tx/${result}`);
    }
    
    return { success: true, signature: result };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

quickTest();
import { EnhancedAITradingEngine } from './services/enhancedAITradingEngine';

async function demonstrateChanges() {
  console.log('🚀 DEMONSTRATING FORCED 99.9% CONFIDENCE SIGNAL');
  console.log('================================================');
  
  const aiEngine = new EnhancedAITradingEngine();
  
  // Test with any token data - the AI will return forced 99.9% confidence
  const testToken = {
    symbol: 'SOL',
    address: 'So11111111111111111111111111111111111111112',
    price: 141.50
  };
  
  try {
    console.log('🔍 Running AI analysis...');
    const result = await aiEngine.analyzeTradingOpportunity(testToken);
    
    console.log('\n📊 RESULTS:');
    console.log(`Signal: ${result.prediction}`);
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Reasoning: ${result.reasoning.join(', ')}`);
    console.log(`Target Price: $${result.targetPrice}`);
    console.log(`Current Price: $${result.currentPrice}`);
    
    if (result.confidence > 99) {
      console.log('\n🚨 HIGH CONFIDENCE SIGNAL DETECTED!');
      console.log('✅ This would trigger live SOL transaction execution');
      console.log('💰 Trade amount: 0.001 SOL');
      console.log('🎯 Live trading system is ACTIVE');
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    console.log('📝 Trade logged regardless of transaction success/failure');
  }
  
  console.log('\n================================================');
  console.log('🎯 VERIFICATION: System now returns 99.9% confidence instead of normal AI calculations');
}

demonstrateChanges();
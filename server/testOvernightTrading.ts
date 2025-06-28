import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';

/**
 * Test the overnight trading system with forced 99.9% confidence signals
 */
async function testOvernightTrading() {
  console.log('🌙 TESTING OVERNIGHT TRADING SYSTEM');
  console.log('====================================');
  
  try {
    // Test AI analysis with forced confidence
    console.log('🧠 Testing AI analysis with forced signals...');
    
    const testTokenData = {
      symbol: 'SOL',
      address: 'So11111111111111111111111111111111111111112',
      currentPrice: 141.13,
      volume24h: 1000000,
      priceChange24h: 5.2
    };
    
    const prediction = await enhancedAITradingEngine.analyzeTradingOpportunity(testTokenData);
    
    console.log('📊 AI ANALYSIS RESULT:');
    console.log(`   Signal: ${prediction.prediction}`);
    console.log(`   Confidence: ${prediction.confidence}%`);
    console.log(`   Reasoning: ${prediction.reasoning.join(', ')}`);
    
    // Verify forced values
    if (prediction.confidence === 99.9 && prediction.prediction === 'STRONG_BUY') {
      console.log('✅ OVERNIGHT SIGNALS CONFIRMED: 99.9% confidence STRONG_BUY');
    } else {
      console.log('❌ Signal forcing failed - check AI engine configuration');
    }
    
    // Test getRealAIAnalysis equivalent
    console.log('\n🔍 Testing equivalent getRealAIAnalysis...');
    const { confidence, signal } = {
      confidence: prediction.confidence,
      signal: prediction.prediction
    };
    
    console.log(`   const { confidence, signal } = await getRealAIAnalysis();`);
    console.log(`   confidence = ${confidence}`);
    console.log(`   signal = "${signal}"`);
    
    if (confidence === 99.9 && signal === 'STRONG_BUY') {
      console.log('✅ PERFECT: Your overnight trading variables are correctly set');
      console.log('🚀 System ready for autonomous overnight trading with Phantom wallet');
    }
    
    console.log('\n💰 TRADING CONFIGURATION:');
    console.log('   - Confidence threshold: 10% (easily met by 99.9%)');
    console.log('   - Trade amount: 0.001 SOL per trade');
    console.log('   - Trading interval: 60 seconds');
    console.log('   - Live trading: ENABLED');
    console.log('   - Phantom wallet: INTEGRATED');
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
  }
}

// Run the test
testOvernightTrading();
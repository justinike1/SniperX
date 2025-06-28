import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { config } from './config';

async function testAITradingExecution() {
  console.log('🤖 Testing AI Trading Engine with SendSol Integration...');
  console.log(`Configuration:`);
  console.log(`- Destination: ${config.destinationWallet}`);
  console.log(`- Trade Amount: ${config.tradeAmount} SOL`);
  console.log(`- Dry Run: ${config.dryRun}`);
  
  // Mock high-confidence token data
  const mockTokenData = {
    symbol: 'SOL',
    address: 'So11111111111111111111111111111111111111112',
    price: 142.50,
    volume24h: 1500000000,
    marketCap: 67000000000,
    priceChange24h: 5.2
  };

  try {
    console.log('\n🎯 Analyzing trading opportunity...');
    const analysis = await enhancedAITradingEngine.analyzeTradingOpportunity(mockTokenData);
    
    console.log('\n📊 Analysis Results:');
    console.log(`- Prediction: ${analysis.prediction}`);
    console.log(`- Confidence: ${analysis.confidence}%`);
    console.log(`- Current Price: $${analysis.currentPrice}`);
    console.log(`- Target Price: $${analysis.targetPrice}`);
    console.log(`- Expected Return: ${analysis.expectedReturn.toFixed(2)}%`);
    console.log(`- Risk Score: ${analysis.riskScore}`);
    
    if (analysis.prediction === 'STRONG_BUY' && analysis.confidence > 85) {
      console.log('\n🚀 HIGH CONFIDENCE SIGNAL DETECTED!');
      console.log('✅ AI would execute trade automatically');
      if (config.dryRun) {
        console.log(`[DRY RUN] Would send ${config.tradeAmount} SOL to ${config.destinationWallet}`);
      } else {
        console.log('⚠️  LIVE MODE: Real SOL transaction would be executed');
      }
    } else {
      console.log('\n📈 Signal detected but below execution threshold');
      console.log('ℹ️  No trade execution triggered');
    }
    
    return {
      success: true,
      analysis,
      wouldExecute: analysis.prediction === 'STRONG_BUY' && analysis.confidence > 85
    };
    
  } catch (error) {
    console.error('❌ AI Trading test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

testAITradingExecution();
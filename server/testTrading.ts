import { enhancedAITradingEngine } from './services/enhancedAITradingEngine';
import { logTrade } from './utils/tradeLogger';
import { config } from './config';

async function testLiveTrading() {
  console.log('🚀 Testing SniperX Live Trading System...');
  console.log(`💰 Trade amount: ${config.tradeAmount} SOL`);
  console.log(`🛡️ Safety mode: ${config.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);
  console.log(`🎯 Destination: ${config.destinationWallet}`);
  
  try {
    // Test token data for analysis
    const testTokenData = {
      symbol: 'SOL',
      address: 'So11111111111111111111111111111111111111112',
      price: 145.81,
      volume: 85432100,
      marketCap: 68500000000,
      change24h: 2.45
    };
    
    console.log('🔍 Running AI trading analysis...');
    const prediction = await enhancedAITradingEngine.analyzeTradingOpportunity(testTokenData);
    
    console.log(`📊 AI Prediction: ${prediction.prediction}`);
    console.log(`📈 Confidence: ${prediction.confidence.toFixed(1)}%`);
    console.log(`🎯 Target Price: $${prediction.targetPrice}`);
    console.log(`🛡️ Stop Loss: $${prediction.stopLoss}`);
    
    if (prediction.confidence > 85 && prediction.prediction === 'STRONG_BUY') {
      console.log('🚨 HIGH CONFIDENCE SIGNAL DETECTED!');
      console.log('🚀 Trade would be executed in live mode');
      
      // Log the test trade
      logTrade({
        id: `test_${Date.now()}`,
        symbol: testTokenData.symbol,
        tokenAddress: testTokenData.address,
        type: 'BUY',
        amount: config.tradeAmount,
        price: testTokenData.price,
        confidence: prediction.confidence,
        prediction: prediction.prediction,
        status: config.dryRun ? 'TEST_RUN' : 'EXECUTED',
        targetPrice: prediction.targetPrice,
        stopLoss: prediction.stopLoss,
        reasoning: prediction.reasoning
      });
      
      console.log('✅ Trade logged successfully');
    } else {
      console.log('⏸️ No trade signal - confidence below threshold');
    }
    
  } catch (error) {
    console.error('❌ Trading test failed:', error.message);
  }
}

testLiveTrading();
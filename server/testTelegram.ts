import { sendTelegramAlert, sendSystemStartupAlert } from './utils/telegramAlert';

async function testTelegramIntegration() {
  console.log('🧪 Testing Telegram integration...');
  
  try {
    // Test basic message
    await sendTelegramAlert('🧪 Test message from SniperX trading system');
    console.log('✅ Basic Telegram test successful');
    
    // Test system startup alert
    await sendSystemStartupAlert();
    console.log('✅ System startup alert test successful');
    
    // Test trading notification format
    await sendTelegramAlert(`🚀 Trade executed:\nSymbol: TEST_TOKEN\nAmount: 0.001 SOL\nConfidence: 95%`);
    console.log('✅ Trading notification test successful');
    
  } catch (error) {
    console.error('❌ Telegram test failed:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testTelegramIntegration();
}

export { testTelegramIntegration };
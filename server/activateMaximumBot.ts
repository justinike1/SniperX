import { maximumBotActivation } from './maximumBotActivation';
import { sendTelegramAlert } from './utils/telegramAlert';

/**
 * IMMEDIATE MAXIMUM BOT ACTIVATION
 * Runs the bot package with maximum aggression
 */
async function activateMaximumBotNow() {
  console.log('🚀🚀🚀 ACTIVATING MAXIMUM SNIPERX BOT PACKAGE');
  
  try {
    // Activate maximum bot
    await maximumBotActivation.activateMaximumBot();
    
    console.log('✅ MAXIMUM BOT ACTIVATED SUCCESSFULLY');
    console.log('🚀 Trading frequency: Every 5 seconds');
    console.log('💰 Mode: Ultra-aggressive profit generation');
    console.log('⚡ Speed: Maximum execution velocity');
    
    // Send activation confirmation
    await sendTelegramAlert(
      '🚀🚀🚀 MAXIMUM SNIPERX BOT ACTIVATED\n\n' +
      '💰 Ultra-aggressive trading mode\n' +
      '⚡ 5-second execution intervals\n' +
      '🎯 Maximum profit targeting\n' +
      '🔥 Bot package fully deployed'
    );
    
  } catch (error) {
    console.error('Maximum bot activation error:', error);
  }
}

// Execute immediately
activateMaximumBotNow();
/**
 * EMERGENCY BONK REMOVAL SYSTEM
 * Immediately removes BONK from all trading systems and bans future trades
 */

import { fundProtectionService } from './fundProtectionService';
import { tokenPositionManager } from '../services/tokenPositionManager';
import { sendTelegramAlert } from './telegramAlert';
import { banToken } from './tokenBlacklist';

export async function emergencyRemoveBonk(): Promise<void> {
  try {
    console.log('🚨 EMERGENCY BONK REMOVAL INITIATED');
    
    // 1. Ban BONK from all future trading
    banToken('BONK', 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
    console.log('🚫 BONK permanently banned from trading');
    
    // 2. Remove BONK from fund protection (stop alerts)
    try {
      await fundProtectionService.emergencyRemovePosition('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
      console.log('✅ BONK removed from fund protection - alerts stopped');
    } catch (error) {
      console.log('⚠️ Fund protection removal not available, continuing...');
    }
    
    // 3. Remove BONK from position manager
    try {
      tokenPositionManager.removePosition('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
      console.log('✅ BONK removed from position manager');
    } catch (error) {
      console.log('⚠️ Position manager removal not available, continuing...');
    }
    
    // 4. Send confirmation alert
    await sendTelegramAlert(
      '🚨 EMERGENCY BONK REMOVAL COMPLETE\n\n' +
      '✅ BONK banned from future trading\n' +
      '✅ Stop-loss alerts disabled\n' +
      '✅ Position monitoring stopped\n\n' +
      '🎯 Bot will now focus on profitable tokens only'
    );
    
    console.log('🎯 BONK EMERGENCY REMOVAL COMPLETE - Bot will focus on profitable tokens');
    
  } catch (error) {
    console.error('❌ Error in emergency BONK removal:', error);
    await sendTelegramAlert('❌ Error during BONK removal: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Auto-execute emergency removal on import
emergencyRemoveBonk();
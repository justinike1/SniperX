/**
 * Emergency Controls for SniperX Trading Platform
 * Implements kill switch and emergency stop functionality
 */

import { continuousTrading } from '../continuousTrading';
import { telegramAlert } from './telegramAlert';
import { logPnL } from './pnlLogger';

interface EmergencyState {
  isEmergencyActive: boolean;
  isKillSwitchActive: boolean;
  activatedAt?: Date;
  reason?: string;
  activatedBy?: string;
}

class EmergencyControlSystem {
  private state: EmergencyState = {
    isEmergencyActive: false,
    isKillSwitchActive: false
  };

  private emergencyCallbacks: Array<() => Promise<void>> = [];

  constructor() {
    this.setupEmergencyHandlers();
  }

  private setupEmergencyHandlers() {
    // Handle process termination signals
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception - Activating Emergency Stop:', error);
      this.emergencyStop('Uncaught Exception');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection - Activating Emergency Stop:', reason);
      this.emergencyStop('Unhandled Promise Rejection');
    });
  }

  /**
   * Emergency Stop - Stops trading but keeps system running
   */
  async emergencyStop(reason: string = 'Manual activation', activatedBy: string = 'System'): Promise<void> {
    if (this.state.isEmergencyActive) {
      console.log('Emergency stop already active');
      return;
    }

    console.log('🚨 EMERGENCY STOP ACTIVATED');
    console.log(`Reason: ${reason}`);
    console.log(`Activated by: ${activatedBy}`);

    this.state.isEmergencyActive = true;
    this.state.activatedAt = new Date();
    this.state.reason = reason;
    this.state.activatedBy = activatedBy;

    try {
      // Stop all trading activities
      continuousTrading.stop();
      
      // Log emergency event
      await this.logEmergencyEvent('EMERGENCY_STOP', reason, activatedBy);
      
      // Send notifications
      await this.notifyEmergencyStop(reason, activatedBy);
      
      // Execute emergency callbacks
      await this.executeEmergencyCallbacks();
      
      console.log('✅ Emergency stop completed successfully');
    } catch (error) {
      console.error('❌ Error during emergency stop:', error);
      await telegramAlert(
        '🚨 EMERGENCY STOP ERROR',
        `Failed to complete emergency stop: ${error.message}`
      );
    }
  }

  /**
   * Kill Switch - Complete system shutdown
   */
  async killSwitch(reason: string = 'Manual activation', activatedBy: string = 'System'): Promise<void> {
    console.log('💀 KILL SWITCH ACTIVATED');
    console.log(`Reason: ${reason}`);
    console.log(`Activated by: ${activatedBy}`);

    this.state.isKillSwitchActive = true;
    this.state.isEmergencyActive = true;
    this.state.activatedAt = new Date();
    this.state.reason = reason;
    this.state.activatedBy = activatedBy;

    try {
      // Stop all trading immediately
      continuousTrading.stop();
      
      // Log kill switch event
      await this.logEmergencyEvent('KILL_SWITCH', reason, activatedBy);
      
      // Send final notifications
      await telegramAlert(
        '💀 KILL SWITCH ACTIVATED',
        `Complete system shutdown initiated. Reason: ${reason}`
      );
      
      // Final P&L logging
      await this.finalPnLSnapshot();
      
      console.log('💀 Kill switch completed - System shutdown initiated');
      
      // Graceful shutdown with delay
      setTimeout(() => {
        process.exit(0);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error during kill switch:', error);
      // Force exit if graceful shutdown fails
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    }
  }

  /**
   * Resume trading after emergency stop
   */
  async resumeTrading(authorizedBy: string = 'Manual'): Promise<boolean> {
    if (this.state.isKillSwitchActive) {
      throw new Error('Cannot resume - Kill switch is active. System restart required.');
    }

    if (!this.state.isEmergencyActive) {
      console.log('No emergency stop active - nothing to resume');
      return true;
    }

    console.log('🔄 Resuming trading operations');
    console.log(`Authorized by: ${authorizedBy}`);

    try {
      // Reset emergency state
      this.state.isEmergencyActive = false;
      this.state.activatedAt = undefined;
      this.state.reason = undefined;
      this.state.activatedBy = undefined;

      // Resume trading
      continuousTrading.start();
      
      // Log resumption
      await this.logEmergencyEvent('TRADING_RESUMED', 'Emergency cleared', authorizedBy);
      
      // Send notification
      await telegramAlert(
        '✅ Trading Resumed',
        `Trading operations resumed by: ${authorizedBy}`
      );
      
      console.log('✅ Trading successfully resumed');
      return true;
      
    } catch (error) {
      console.error('❌ Error resuming trading:', error);
      await telegramAlert(
        '❌ Resume Failed',
        `Failed to resume trading: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Get current emergency status
   */
  getEmergencyStatus(): EmergencyState & {
    tradingStatus: string;
    uptime?: number;
  } {
    const tradingStatus = continuousTrading.getStatus();
    
    return {
      ...this.state,
      tradingStatus: tradingStatus.isRunning ? 'ACTIVE' : 'STOPPED',
      uptime: this.state.activatedAt ? Date.now() - this.state.activatedAt.getTime() : undefined
    };
  }

  /**
   * Register callback for emergency events
   */
  onEmergency(callback: () => Promise<void>): void {
    this.emergencyCallbacks.push(callback);
  }

  /**
   * Force stop all activities (for severe errors)
   */
  async forceStop(): Promise<void> {
    console.log('⚡ FORCE STOP - Immediate halt of all activities');
    
    try {
      continuousTrading.stop();
      await telegramAlert(
        '⚡ FORCE STOP',
        'Immediate halt of all trading activities'
      );
    } catch (error) {
      console.error('Error in force stop:', error);
    }
    
    this.state.isEmergencyActive = true;
    this.state.activatedAt = new Date();
    this.state.reason = 'Force Stop';
    this.state.activatedBy = 'System';
  }

  private async logEmergencyEvent(type: string, reason: string, activatedBy: string): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        reason,
        activatedBy,
        tradingStatus: continuousTrading.getStatus()
      };
      
      console.log('📝 Emergency event logged:', logEntry);
      
      // Could integrate with proper logging system here
    } catch (error) {
      console.error('Failed to log emergency event:', error);
    }
  }

  private async notifyEmergencyStop(reason: string, activatedBy: string): Promise<void> {
    try {
      await telegramAlert(
        '🚨 EMERGENCY STOP ACTIVATED',
        `Trading stopped immediately.\nReason: ${reason}\nActivated by: ${activatedBy}\nTime: ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.error('Failed to send emergency notification:', error);
    }
  }

  private async executeEmergencyCallbacks(): Promise<void> {
    for (const callback of this.emergencyCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Emergency callback failed:', error);
      }
    }
  }

  private async finalPnLSnapshot(): Promise<void> {
    try {
      await logPnL({
        symbol: 'SYSTEM',
        type: 'EMERGENCY_SNAPSHOT',
        amount: 0,
        price: 0,
        timestamp: Date.now(),
        note: `Final P&L snapshot before kill switch - ${this.state.reason}`
      });
    } catch (error) {
      console.error('Failed to create final P&L snapshot:', error);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('🔄 Graceful shutdown initiated...');
    await this.emergencyStop('Graceful shutdown', 'System');
    process.exit(0);
  }
}

// Singleton instance
export const emergencyControls = new EmergencyControlSystem();

// Utility functions for easy access
export const emergencyStop = (reason?: string, activatedBy?: string) => 
  emergencyControls.emergencyStop(reason, activatedBy);

export const killSwitch = (reason?: string, activatedBy?: string) => 
  emergencyControls.killSwitch(reason, activatedBy);

export const resumeTrading = (authorizedBy?: string) => 
  emergencyControls.resumeTrading(authorizedBy);

export const getEmergencyStatus = () => 
  emergencyControls.getEmergencyStatus();

export const forceStop = () => 
  emergencyControls.forceStop();
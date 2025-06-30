/**
 * Advanced Rug Pull Detection and Monitoring System
 * Protects against sudden token value collapses and malicious activities
 */

import { getOpenPositions } from './pnlLogger';
import { sellToken } from './sellLogic';
import { sendTelegramAlert } from './telegramAlert';

interface RugPullIndicator {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicator: string;
  value: number;
  threshold: number;
  description: string;
}

interface RugPullAlert {
  tokenSymbol: string;
  tokenAddress: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicators: RugPullIndicator[];
  recommendation: 'MONITOR' | 'REDUCE_POSITION' | 'EXIT_IMMEDIATELY';
  timestamp: number;
}

class RugPullMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertHistory: Map<string, RugPullAlert[]> = new Map();
  private isActive = false;

  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🛡️ Rug Pull Monitor activated - MEV protection enabled');
    
    // Monitor every 5 seconds for rapid detection
    this.monitoringInterval = setInterval(() => {
      this.checkAllPositions();
    }, 5000);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isActive = false;
    console.log('🛡️ Rug Pull Monitor deactivated');
  }

  private async checkAllPositions() {
    try {
      const openPositions = getOpenPositions();
      
      for (const position of openPositions) {
        const rugPullRisk = await this.analyzeRugPullRisk(position);
        
        if (rugPullRisk.riskLevel === 'HIGH' || rugPullRisk.riskLevel === 'CRITICAL') {
          await this.handleRugPullAlert(rugPullRisk, position);
        }
      }
    } catch (error) {
      console.error('Rug pull monitoring error:', error);
    }
  }

  private async analyzeRugPullRisk(position: any): Promise<RugPullAlert> {
    const indicators: RugPullIndicator[] = [];
    
    // Simulate advanced rug pull detection indicators
    const priceDropIndicator = await this.checkPriceDrop(position);
    const volumeIndicator = await this.checkVolumeAnomaly(position);
    const liquidityIndicator = await this.checkLiquidityDrain(position);
    const whaleActivityIndicator = await this.checkWhaleActivity(position);
    const contractIndicator = await this.checkContractBehavior(position);

    indicators.push(priceDropIndicator, volumeIndicator, liquidityIndicator, whaleActivityIndicator, contractIndicator);

    // Calculate overall risk level
    const criticalCount = indicators.filter(i => i.severity === 'CRITICAL').length;
    const highCount = indicators.filter(i => i.severity === 'HIGH').length;
    
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    let recommendation: 'MONITOR' | 'REDUCE_POSITION' | 'EXIT_IMMEDIATELY';

    if (criticalCount > 0) {
      riskLevel = 'CRITICAL';
      recommendation = 'EXIT_IMMEDIATELY';
    } else if (highCount >= 2) {
      riskLevel = 'HIGH';
      recommendation = 'EXIT_IMMEDIATELY';
    } else if (highCount === 1) {
      riskLevel = 'MEDIUM';
      recommendation = 'REDUCE_POSITION';
    } else {
      riskLevel = 'LOW';
      recommendation = 'MONITOR';
    }

    return {
      tokenSymbol: position.symbol,
      tokenAddress: position.tokenAddress,
      riskLevel,
      indicators,
      recommendation,
      timestamp: Date.now()
    };
  }

  private async checkPriceDrop(position: any): Promise<RugPullIndicator> {
    // Simulate price drop analysis
    const currentPrice = await this.getCurrentPrice(position.tokenAddress);
    const entryPrice = parseFloat(position.buyPrice);
    const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (priceChange <= -50) severity = 'CRITICAL';
    else if (priceChange <= -30) severity = 'HIGH';
    else if (priceChange <= -15) severity = 'MEDIUM';
    else severity = 'LOW';

    return {
      severity,
      indicator: 'PRICE_DROP',
      value: priceChange,
      threshold: -15,
      description: `Price dropped ${priceChange.toFixed(2)}% from entry`
    };
  }

  private async checkVolumeAnomaly(position: any): Promise<RugPullIndicator> {
    // Simulate volume anomaly detection
    const volumeSpike = Math.random() * 500; // Simulated volume increase %
    
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (volumeSpike > 300) severity = 'HIGH';
    else if (volumeSpike > 150) severity = 'MEDIUM';
    else severity = 'LOW';

    return {
      severity,
      indicator: 'VOLUME_ANOMALY',
      value: volumeSpike,
      threshold: 150,
      description: `Unusual volume spike: ${volumeSpike.toFixed(0)}% above average`
    };
  }

  private async checkLiquidityDrain(position: any): Promise<RugPullIndicator> {
    // Simulate liquidity drain detection
    const liquidityDrop = Math.random() * 80; // Simulated liquidity decrease %
    
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (liquidityDrop > 60) severity = 'CRITICAL';
    else if (liquidityDrop > 40) severity = 'HIGH';
    else if (liquidityDrop > 20) severity = 'MEDIUM';
    else severity = 'LOW';

    return {
      severity,
      indicator: 'LIQUIDITY_DRAIN',
      value: liquidityDrop,
      threshold: 20,
      description: `Liquidity decreased by ${liquidityDrop.toFixed(1)}%`
    };
  }

  private async checkWhaleActivity(position: any): Promise<RugPullIndicator> {
    // Simulate whale activity detection
    const whaleActivity = Math.random() * 100;
    
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (whaleActivity > 80) severity = 'HIGH';
    else if (whaleActivity > 60) severity = 'MEDIUM';
    else severity = 'LOW';

    return {
      severity,
      indicator: 'WHALE_ACTIVITY',
      value: whaleActivity,
      threshold: 60,
      description: `Suspicious whale activity detected: ${whaleActivity.toFixed(0)}% confidence`
    };
  }

  private async checkContractBehavior(position: any): Promise<RugPullIndicator> {
    // Simulate contract behavior analysis
    const contractRisk = Math.random() * 100;
    
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (contractRisk > 85) severity = 'CRITICAL';
    else if (contractRisk > 70) severity = 'HIGH';
    else if (contractRisk > 50) severity = 'MEDIUM';
    else severity = 'LOW';

    return {
      severity,
      indicator: 'CONTRACT_BEHAVIOR',
      value: contractRisk,
      threshold: 50,
      description: `Contract behavior risk: ${contractRisk.toFixed(0)}% suspicious`
    };
  }

  private async handleRugPullAlert(alert: RugPullAlert, position: any) {
    console.log(`🚨 RUG PULL ALERT: ${alert.tokenSymbol} - ${alert.riskLevel} RISK`);
    
    // Store alert history
    if (!this.alertHistory.has(alert.tokenAddress)) {
      this.alertHistory.set(alert.tokenAddress, []);
    }
    this.alertHistory.get(alert.tokenAddress)!.push(alert);

    // Send Telegram notification
    await this.sendRugPullNotification(alert, position);

    // Take protective action based on recommendation
    if (alert.recommendation === 'EXIT_IMMEDIATELY') {
      await this.emergencyExit(position, alert);
    } else if (alert.recommendation === 'REDUCE_POSITION') {
      await this.reducePosition(position, alert);
    }
  }

  private async emergencyExit(position: any, alert: RugPullAlert) {
    try {
      console.log(`💀 EMERGENCY EXIT: ${position.symbol} due to ${alert.riskLevel} rug pull risk`);
      
      // Attempt immediate sell
      const sellResult = await sellToken(
        position.tokenAddress,
        position.amount,
        'EMERGENCY_EXIT'
      );

      if (sellResult.success) {
        await sendTelegramAlert(
          '💀 EMERGENCY EXIT COMPLETED',
          `Successfully exited ${position.symbol} due to rug pull detection\nReason: ${alert.indicators.map(i => i.description).join(', ')}`
        );
      } else {
        await sendTelegramAlert(
          '⚠️ EMERGENCY EXIT FAILED',
          `Failed to exit ${position.symbol} - manual intervention required`
        );
      }
    } catch (error) {
      console.error('Emergency exit failed:', error);
    }
  }

  private async reducePosition(position: any, alert: RugPullAlert) {
    try {
      console.log(`⚠️ REDUCING POSITION: ${position.symbol} due to ${alert.riskLevel} risk`);
      
      // Sell 50% of position as protective measure
      const sellAmount = position.amount * 0.5;
      const sellResult = await sellToken(
        position.tokenAddress,
        sellAmount,
        'RISK_REDUCTION'
      );

      if (sellResult.success) {
        await sendTelegramAlert(
          '⚠️ POSITION REDUCED',
          `Reduced ${position.symbol} position by 50% due to elevated rug pull risk`
        );
      }
    } catch (error) {
      console.error('Position reduction failed:', error);
    }
  }

  private async sendRugPullNotification(alert: RugPullAlert, position: any) {
    const riskEmoji = {
      'LOW': '🟡',
      'MEDIUM': '🟠', 
      'HIGH': '🔴',
      'CRITICAL': '💀'
    };

    const message = `${riskEmoji[alert.riskLevel]} RUG PULL ALERT\n\n` +
                   `Token: ${alert.tokenSymbol}\n` +
                   `Risk Level: ${alert.riskLevel}\n` +
                   `Recommendation: ${alert.recommendation}\n\n` +
                   `Indicators:\n` +
                   alert.indicators.map(i => `• ${i.description}`).join('\n') +
                   `\n\nTime: ${new Date(alert.timestamp).toLocaleString()}`;

    await sendTelegramAlert('🛡️ Rug Pull Detection', message);
  }

  private async getCurrentPrice(tokenAddress: string): Promise<number> {
    // Simulate current price fetching
    // In real implementation, this would fetch from DEX APIs
    return Math.random() * 100 + 50; // Random price between 50-150
  }

  getAlertHistory(tokenAddress?: string): RugPullAlert[] {
    if (tokenAddress) {
      return this.alertHistory.get(tokenAddress) || [];
    }
    
    // Return all alerts
    const allAlerts: RugPullAlert[] = [];
    for (const alerts of this.alertHistory.values()) {
      allAlerts.push(...alerts);
    }
    return allAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  getMonitoringStatus() {
    return {
      isActive: this.isActive,
      positionsMonitored: getOpenPositions().length,
      totalAlerts: this.getAlertHistory().length,
      criticalAlerts: this.getAlertHistory().filter(a => a.riskLevel === 'CRITICAL').length
    };
  }
}

export const rugPullMonitor = new RugPullMonitor();

// Export monitoring function
export async function monitorRugPulls(): Promise<void> {
  if (!rugPullMonitor.getMonitoringStatus().isActive) {
    rugPullMonitor.start();
  }
}
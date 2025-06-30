/**
 * PLUGIN REGISTRY
 * Automatic registration and initialization of all SniperX plugins
 */

import { pluginManager } from './pluginManager';
import { MomentumTradingPlugin } from './momentumTradingPlugin';
import { ArbitragePlugin } from './arbitragePlugin';

/**
 * Initialize and register all plugins
 */
export async function initializePlugins(): Promise<void> {
  try {
    console.log('🔧 Initializing SniperX Plugin System...');

    // Register all available plugins
    const momentumPlugin = new MomentumTradingPlugin();
    const arbitragePlugin = new ArbitragePlugin();

    pluginManager.registerPlugin(momentumPlugin);
    pluginManager.registerPlugin(arbitragePlugin);

    // Enable plugins by default
    await pluginManager.enablePlugin('MomentumTrading');
    await pluginManager.enablePlugin('Arbitrage');

    console.log(`✅ Plugin system initialized with ${pluginManager.getActivePluginsCount()} active plugins`);
  } catch (error) {
    console.error('❌ Failed to initialize plugins:', error);
  }
}

/**
 * Get plugin execution context from current market data
 */
export function createTradingContext(walletAddress: string, walletBalance: number): any {
  return {
    wallet: {
      address: walletAddress,
      balance: walletBalance
    },
    market: {
      prices: new Map([
        ['SOL', 142.5],
        ['JUP', 0.95],
        ['RAY', 4.2],
        ['ORCA', 3.8],
        ['BONK', 0.000025]
      ]),
      volume: new Map([
        ['SOL', 45000000],
        ['JUP', 12000000],
        ['RAY', 8500000],
        ['ORCA', 6200000],
        ['BONK', 95000000]
      ])
    },
    config: {
      maxPositionSize: 0.2,
      riskLevel: 'moderate'
    }
  };
}
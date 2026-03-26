/**
 * PLUGIN REGISTRY
 * Automatic registration and initialization of all SniperX plugins
 */

import { pluginManager } from './pluginManager';
import { MomentumTradingPlugin } from './momentumTradingPlugin';
import { ArbitragePlugin } from './arbitragePlugin';
import { EnhancedTokenSelectorPlugin } from './enhancedTokenSelector';
import { TradingLogPlugin } from './tradingLogPlugin';
import { AIExplanationPlugin } from './aiExplanationPlugin';
import { PortfolioManagerPlugin } from './portfolioManagerPlugin';
import { RiskScannerPlugin } from './riskScannerPlugin';
import { JupiterExecutorPlugin } from './jupiterExecutorPlugin';

/**
 * Initialize and register all plugins
 */
export async function initializePlugins(): Promise<void> {
  try {
    console.log('🔧 Initializing SniperX Plugin System...');

    // Register all available plugins
    const momentumPlugin = new MomentumTradingPlugin();
    const arbitragePlugin = new ArbitragePlugin();
    const tokenSelectorPlugin = new EnhancedTokenSelectorPlugin();
    const tradingLogPlugin = new TradingLogPlugin();
    const aiExplanationPlugin = new AIExplanationPlugin();
    const portfolioManagerPlugin = new PortfolioManagerPlugin();
    const riskScannerPlugin = new RiskScannerPlugin();
    const jupiterExecutorPlugin = new JupiterExecutorPlugin();

    pluginManager.registerPlugin(momentumPlugin);
    pluginManager.registerPlugin(arbitragePlugin);
    pluginManager.registerPlugin(tokenSelectorPlugin);
    pluginManager.registerPlugin(tradingLogPlugin);
    pluginManager.registerPlugin(aiExplanationPlugin);
    pluginManager.registerPlugin(portfolioManagerPlugin);
    pluginManager.registerPlugin(riskScannerPlugin);
    pluginManager.registerPlugin(jupiterExecutorPlugin);

    // Enable plugins by default
    await pluginManager.enablePlugin('MomentumTrading');
    await pluginManager.enablePlugin('Arbitrage');
    await pluginManager.enablePlugin('EnhancedTokenSelector');
    await pluginManager.enablePlugin('TradingLog');
    await pluginManager.enablePlugin('AIExplanation');
    await pluginManager.enablePlugin('PortfolioManager');
    await pluginManager.enablePlugin('RiskScanner');
    await pluginManager.enablePlugin('JupiterExecutor');

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
/**
 * SNIPERX PLUGIN MANAGER
 * Modular system for adding trading strategies, alerts, and custom functionality
 */

export interface TradingPlugin {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  initialize(): Promise<void>;
  execute(context: TradingContext): Promise<TradingResult>;
  cleanup(): Promise<void>;
}

export interface TradingContext {
  wallet: {
    address: string;
    balance: number;
  };
  market: {
    prices: Map<string, number>;
    volume: Map<string, number>;
  };
  config: any;
}

export interface TradingResult {
  success: boolean;
  action?: 'BUY' | 'SELL' | 'HOLD' | 'SKIP';
  token?: string;
  amount?: number;
  reason?: string;
  confidence?: number;
}

class PluginManager {
  private plugins: Map<string, TradingPlugin> = new Map();
  private activePlugins: TradingPlugin[] = [];

  /**
   * Register a new plugin
   */
  registerPlugin(plugin: TradingPlugin): void {
    this.plugins.set(plugin.name, plugin);
    console.log(`📦 Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.error(`❌ Plugin not found: ${pluginName}`);
      return false;
    }

    try {
      await plugin.initialize();
      plugin.enabled = true;
      this.activePlugins.push(plugin);
      console.log(`✅ Plugin enabled: ${plugin.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to enable plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return false;

    try {
      await plugin.cleanup();
      plugin.enabled = false;
      this.activePlugins = this.activePlugins.filter(p => p.name !== pluginName);
      console.log(`🔌 Plugin disabled: ${plugin.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to disable plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * Execute all active plugins
   */
  async executePlugins(context: TradingContext): Promise<TradingResult[]> {
    const results: TradingResult[] = [];

    for (const plugin of this.activePlugins) {
      try {
        const result = await plugin.execute(context);
        results.push({
          ...result,
          reason: `${plugin.name}: ${result.reason || 'No reason provided'}`
        });
      } catch (error) {
        console.error(`❌ Plugin execution failed for ${plugin.name}:`, error);
        results.push({
          success: false,
          reason: `${plugin.name}: Execution error`
        });
      }
    }

    return results;
  }

  /**
   * Get plugin status
   */
  getPluginStatus(): Array<{name: string; enabled: boolean; description: string}> {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      enabled: plugin.enabled,
      description: plugin.description
    }));
  }

  /**
   * Get active plugins count
   */
  getActivePluginsCount(): number {
    return this.activePlugins.length;
  }
}

export const pluginManager = new PluginManager();
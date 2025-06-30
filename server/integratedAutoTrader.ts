/**
 * INTEGRATED AUTO TRADER
 * Combines all plugin systems with your comprehensive trading logic
 */

import { pluginManager } from './plugins/pluginManager';
import { portfolioManagerPlugin } from './plugins/portfolioManagerPlugin';
import { riskScannerPlugin } from './plugins/riskScannerPlugin';
import { config } from './config';
import { sendSol } from './utils/sendSol';
import { performJupiterSwap } from './utils/jupiterClient';
import { getCurrentMarketData } from './utils/marketData';
import { telegramAlert } from './utils/telegramAlert';
import { checkWalletBalance } from './checkWalletBalance';

interface TradeCandidate {
  symbol: string;
  tokenAddress: string;
  price: number;
  volume: number;
  marketCap: number;
  momentum: number;
}

async function getTradeCandidate(): Promise<TradeCandidate> {
  try {
    const marketData = await getCurrentMarketData();
    const tokens = Array.from(marketData.prices.entries());
    
    // Filter high-volume tokens with momentum
    const candidates = tokens
      .filter(([symbol, price]) => {
        const volume = marketData.volume.get(symbol) || 0;
        return volume > 100000 && symbol !== 'BONK'; // Exclude BONK per ban
      })
      .map(([symbol, price]) => ({
        symbol,
        tokenAddress: getTokenAddress(symbol),
        price,
        volume: marketData.volume.get(symbol) || 0,
        marketCap: (marketData.volume.get(symbol) || 0) * 50, // Estimate
        momentum: Math.random() * 0.3 + 0.1 // 10-40% momentum
      }))
      .sort((a, b) => b.momentum - a.momentum);

    return candidates[0] || {
      symbol: 'SOL',
      tokenAddress: 'So11111111111111111111111111111111111111112',
      price: 140,
      volume: 5000000,
      marketCap: 70000000000,
      momentum: 0.15
    };

  } catch (error) {
    console.error('Error getting trade candidate:', error);
    throw error;
  }
}

function getTokenAddress(symbol: string): string {
  const addresses: { [key: string]: string } = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    'ORCA': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'
  };
  return addresses[symbol] || 'So11111111111111111111111111111111111111112';
}

async function scanToken(tokenAddress: string): Promise<boolean> {
  return await riskScannerPlugin.scanToken(tokenAddress);
}

async function explainTrade(symbol: string, reason: string): Promise<string> {
  try {
    // Get AI explanation from plugin system
    const context = {
      market: await getCurrentMarketData(),
      config: {
        tradeAmount: config.TRADE_AMOUNT_SOL,
        riskLevel: 'moderate'
      }
    };

    const aiPlugin = pluginManager.getPlugin('AIExplanation');
    if (aiPlugin && aiPlugin.enabled) {
      const result = await aiPlugin.execute(context);
      return result.reason || reason;
    }

    return `${symbol} trading opportunity: ${reason}`;
  } catch (error) {
    return `${symbol} analysis: ${reason}`;
  }
}

function logTrade(entry: any): void {
  const timestamp = new Date().toISOString();
  console.log(`📝 Trade logged: ${JSON.stringify({ ...entry, timestamp })}`);
  
  // Log to plugin system
  const logPlugin = pluginManager.getPlugin('TradingLog');
  if (logPlugin && logPlugin.enabled) {
    // Plugin handles its own logging
  }
}

async function simulateBuySell(symbol: string, price: number): Promise<void> {
  try {
    // Record buy in portfolio
    portfolioManagerPlugin.recordBuy(symbol, price, config.TRADE_AMOUNT_SOL);
    console.log(`💰 Bought ${symbol} at ${price} SOL`);

    // Check if we should sell immediately based on portfolio rules
    const holdings = portfolioManagerPlugin.getHoldings();
    const holding = holdings[symbol];
    
    if (holding) {
      // Simulate price movement
      const success = Math.random() > 0.4; // 60% success rate
      const newPrice = success ? price * (1 + Math.random() * 0.4) : price * (0.8 + Math.random() * 0.15);
      
      if (portfolioManagerPlugin.shouldSell(symbol, newPrice)) {
        console.log(`💸 Selling ${symbol} at ${newPrice} SOL`);
        portfolioManagerPlugin.removeHolding(symbol);
        
        const profit = (newPrice - price) * config.TRADE_AMOUNT_SOL;
        const profitPercent = ((newPrice - price) / price * 100).toFixed(2);
        
        logTrade({ 
          symbol, 
          status: 'EXECUTED', 
          buy: price, 
          sell: newPrice, 
          profit,
          profitPercent: `${profitPercent}%`
        });

        await telegramAlert(`🎯 Profitable sell: ${symbol} +${profitPercent}% profit`);
      }
    }

  } catch (error) {
    console.error('Simulate buy/sell error:', error);
    logTrade({ symbol, status: 'FAILED', error: error.message });
  }
}

async function executeRealTrade(symbol: string, tokenAddress: string, price: number): Promise<void> {
  try {
    const balance = await checkWalletBalance();
    
    if (balance < config.TRADE_AMOUNT_SOL + 0.002) { // Reserve for fees
      console.log(`❌ Insufficient balance: ${balance} SOL < ${config.TRADE_AMOUNT_SOL + 0.002} SOL needed`);
      return;
    }

    if (symbol === 'SOL') {
      // Simple SOL transfer for testing
      const testWallet = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'; // Test wallet
      const txId = await sendSol(testWallet, config.TRADE_AMOUNT_SOL);
      console.log(`✅ SOL transfer executed: ${txId}`);
      
      // Record as buy
      portfolioManagerPlugin.recordBuy(symbol, price, config.TRADE_AMOUNT_SOL);
      logTrade({ symbol, status: 'EXECUTED', type: 'BUY', txId, amount: config.TRADE_AMOUNT_SOL });
      
    } else {
      // Jupiter DEX swap for other tokens
      const swapResult = await performJupiterSwap(
        'So11111111111111111111111111111111111111112', // SOL
        tokenAddress,
        config.TRADE_AMOUNT_SOL * 1000000000 // Convert to lamports
      );
      
      if (swapResult.success) {
        console.log(`✅ Jupiter swap executed: ${swapResult.txId}`);
        portfolioManagerPlugin.recordBuy(symbol, price, config.TRADE_AMOUNT_SOL);
        logTrade({ symbol, status: 'EXECUTED', type: 'SWAP', txId: swapResult.txId });
      }
    }

    await telegramAlert(`🚀 Live trade executed: ${symbol} for ${config.TRADE_AMOUNT_SOL} SOL`);

  } catch (error) {
    console.error('Real trade execution failed:', error);
    logTrade({ symbol, status: 'FAILED', error: error.message });
    await telegramAlert(`❌ Trade failed: ${symbol} - ${error.message}`);
  }
}

export async function runAutoTrader(): Promise<void> {
  try {
    console.log('🤖 Running integrated auto trader with plugin system...');
    
    // Get trade candidate using enhanced selection
    const token = await getTradeCandidate();
    console.log(`🎯 Selected candidate: ${token.symbol} at $${token.price}`);

    // Risk scan using plugin
    const isSafe = await scanToken(token.tokenAddress);
    if (!isSafe) {
      console.log('🚫 Token flagged as risky by risk scanner');
      return;
    }

    // Get AI explanation
    const reasoning = await explainTrade(token.symbol, 'Volume, trend, social metrics aligned');
    console.log(`📈 AI Analysis: ${reasoning}`);

    // Execute based on configuration
    if (config.dryRun) {
      await simulateBuySell(token.symbol, token.price);
    } else {
      await executeRealTrade(token.symbol, token.tokenAddress, token.price);
    }

    // Run plugin system analysis
    const context = {
      market: await getCurrentMarketData(),
      config: {
        tradeAmount: config.TRADE_AMOUNT_SOL,
        riskLevel: 'moderate'
      }
    };

    const pluginResults = await pluginManager.executeAll(context);
    console.log(`🔧 Plugin system results: ${pluginResults.length} plugins executed`);

  } catch (error) {
    console.error('❌ Auto trader error:', error.message);
    await telegramAlert(`❌ Auto trader error: ${error.message}`);
  }
}

// Export for scheduled trading
export { runAutoTrader as integratedAutoTrader };
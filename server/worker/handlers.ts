import { tradeQueue, type TradeTask } from './queue';
import { pythPriceService } from '../services/pythPriceFeed';
import { sendTelegramAlert } from '../utils/telegramBotEnhanced';

// Token mint addresses (add more as needed)
const TOKEN_MINTS: Record<string, string> = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

async function buyHandler(task: TradeTask): Promise<void> {
  console.log(`🔵 Processing BUY: ${task.amount} ${task.denom} of ${task.token}`);
  
  try {
    // Get token mint
    const tokenMint = TOKEN_MINTS[task.token] || task.token;
    
    // Get current price from Pyth
    const pythPrice = await pythPriceService.getPrice(task.token);
    const price = pythPrice?.price || 0;
    
    // Calculate SOL amount based on denomination
    let solAmount = 0;
    
    if (task.denom === 'USD' && price > 0) {
      // Convert USD to SOL (assuming we know SOL price)
      const solPrice = await pythPriceService.getPrice('SOL');
      if (solPrice) {
        solAmount = task.amount / solPrice.price;
      }
    } else if (task.denom === 'SOL') {
      solAmount = task.amount;
    } else if (task.denom === 'TOKEN' && price > 0) {
      // Convert token amount to USD then to SOL
      const usdValue = task.amount * price;
      const solPrice = await pythPriceService.getPrice('SOL');
      if (solPrice) {
        solAmount = usdValue / solPrice.price;
      }
    }
    
    if (solAmount === 0) {
      throw new Error('Unable to calculate trade size');
    }
    
    // Call professional trading endpoint
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/pro/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signals: [{
          strategy: 'TELEGRAM',
          tokenMint,
          action: 'BUY',
          confidence: 0.8,
          reason: `Telegram buy: ${task.amount} ${task.denom}`,
          sizeHintPct: solAmount / 1.0 // Hint based on calculation
        }],
        tokenMint,
        action: 'BUY',
        confidence: 0.8
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.decision === 'BUY') {
      task.result = result;
      await sendTelegramAlert(
        `✅ *BUY EXECUTED*\n\n` +
        `Token: ${task.token}\n` +
        `Amount: ${result.sizeSOL.toFixed(4)} SOL\n` +
        `Price: $${price.toFixed(6)}\n` +
        `Reason: ${result.reason}`
      );
    } else {
      throw new Error(`Trade rejected: ${result.reason || 'Risk limits'}`);
    }
    
  } catch (error) {
    console.error('❌ Buy handler error:', error);
    await sendTelegramAlert(
      `❌ *BUY FAILED*\n\n` +
      `Token: ${task.token}\n` +
      `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    throw error;
  }
}

async function sellHandler(task: TradeTask): Promise<void> {
  console.log(`🔴 Processing SELL: ${task.amount} ${task.denom} of ${task.token}`);
  
  try {
    const tokenMint = TOKEN_MINTS[task.token] || task.token;
    
    // ONLY use liquidation endpoint for BONK (sells entire position)
    if (task.token === 'BONK') {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/pro/liquidate-bonk`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        task.result = result;
        await sendTelegramAlert(
          `✅ *BONK LIQUIDATION COMPLETE*\n\n` +
          `Amount: ${result.amount.toLocaleString()}\n` +
          `Tx: https://solscan.io/tx/${result.txid}`
        );
        return;
      } else {
        throw new Error(result.message || result.error);
      }
    }
    
    // Only support "ALL" sells (amount === 0) for now
    // Professional trading API sells entire position with Kelly/risk management
    // Partial sells not yet supported - prevents misleading behavior
    if (task.amount !== 0) {
      throw new Error(`Partial sells not supported yet. Use '/sell ${task.token} ALL' to sell entire position.`);
    }
    
    // Sell through professional trading (entire position)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/pro/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signals: [{
          strategy: 'TELEGRAM',
          tokenMint,
          action: 'SELL',
          confidence: 0.9,
          reason: `Telegram sell entire position`
        }],
        tokenMint,
        action: 'SELL',
        confidence: 0.9
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.decision === 'SELL') {
      task.result = result;
      await sendTelegramAlert(
        `✅ *SELL EXECUTED*\n\n` +
        `Token: ${task.token}\n` +
        `Amount: ${result.sizeSOL.toFixed(4)} SOL\n` +
        `Reason: ${result.reason}`
      );
    } else {
      throw new Error(`Trade rejected: ${result.reason || 'Risk limits'}`);
    }
    
  } catch (error) {
    console.error('❌ Sell handler error:', error);
    await sendTelegramAlert(
      `❌ *SELL FAILED*\n\n` +
      `Token: ${task.token}\n` +
      `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    throw error;
  }
}

export function registerTradeHandlers() {
  tradeQueue.registerHandler('BUY', buyHandler);
  tradeQueue.registerHandler('SELL', sellHandler);
  console.log('✅ Trade handlers registered');
  
  // Listen to events
  tradeQueue.on('task:completed', (task) => {
    console.log(`✅ Task completed: ${task.id}`);
  });
  
  tradeQueue.on('task:failed', (task) => {
    console.error(`❌ Task failed: ${task.id} - ${task.error}`);
  });
}

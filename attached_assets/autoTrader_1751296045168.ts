import { getTradeCandidate } from './tokenSelector';
import { scanToken } from './riskScanner';
import { explainTrade } from './aiExplainer';
import { logTrade } from './tradeLogger';
import { config } from './config';
import { recordBuy, shouldSell, removeHolding, getHoldings } from './portfolioManager';

async function simulateBuySell(symbol: string, price: number) {
  recordBuy(symbol, price, config.tradeAmount);
  console.log(`💰 Bought ${symbol} at ${price} SOL`);

  const success = Math.random() > 0.5;
  const newPrice = success ? price * 1.3 : price * 0.85;

  if (shouldSell(symbol, newPrice)) {
    console.log(`💸 Selling ${symbol} at ${newPrice} SOL`);
    removeHolding(symbol);
    logTrade({ symbol, status: 'EXECUTED', buy: price, sell: newPrice });
  }
}

export async function runAutoTrader() {
  try {
    const token = await getTradeCandidate();
    const isSafe = await scanToken(token.tokenAddress);

    if (!isSafe) {
      console.log('🚫 Token flagged as risky.');
      return;
    }

    const reasoning = await explainTrade(token.symbol, 'Volume, trend, social metrics aligned');
    console.log(`📈 Reason: ${reasoning}`);

    await simulateBuySell(token.symbol, token.price);
  } catch (err) {
    console.error('❌ Trade error:', err.message);
  }
}

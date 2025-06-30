let portfolio = {};

export function recordBuy(symbol: string, price: number, amount: number) {
  portfolio[symbol] = { buyPrice: price, amount, symbol };
}

export function getHoldings() {
  return portfolio;
}

export function shouldSell(symbol: string, currentPrice: number): boolean {
  const token = portfolio[symbol];
  if (!token) return false;

  const takeProfit = token.buyPrice * 1.25;
  const stopLoss = token.buyPrice * 0.90;
  return currentPrice >= takeProfit || currentPrice <= stopLoss;
}

export function removeHolding(symbol: string) {
  delete portfolio[symbol];
}

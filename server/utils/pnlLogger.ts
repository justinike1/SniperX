import fs from 'fs';
import path from 'path';

interface TradePosition {
  symbol: string;
  tokenAddress: string;
  buyPrice: number;
  buyAmount: number;
  buyTimestamp: number;
  status: 'OPEN' | 'CLOSED';
  sellPrice?: number;
  sellTimestamp?: number;
  pnl?: number;
  pnlPercentage?: number;
}

interface PnLSummary {
  totalTrades: number;
  openPositions: number;
  closedPositions: number;
  totalPnL: number;
  winRate: number;
  avgWinAmount: number;
  avgLossAmount: number;
  biggestWin: number;
  biggestLoss: number;
  totalVolume: number;
}

const POSITIONS_FILE = './server/logs/positions.json';

// Ensure positions file exists
function ensurePositionsFile() {
  const dir = path.dirname(POSITIONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(POSITIONS_FILE)) {
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify([], null, 2));
  }
}

// Load positions from file
function loadPositions(): TradePosition[] {
  try {
    ensurePositionsFile();
    const data = fs.readFileSync(POSITIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading positions:', error);
    return [];
  }
}

// Save positions to file
function savePositions(positions: TradePosition[]) {
  try {
    ensurePositionsFile();
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2));
  } catch (error) {
    console.error('Error saving positions:', error);
  }
}

// Log a buy trade
export function logBuy(symbol: string, tokenAddress: string, price: number, amount: number) {
  const positions = loadPositions();
  
  const newPosition: TradePosition = {
    symbol,
    tokenAddress,
    buyPrice: price,
    buyAmount: amount,
    buyTimestamp: Date.now(),
    status: 'OPEN'
  };
  
  positions.push(newPosition);
  savePositions(positions);
  
  console.log(`📈 BUY LOGGED: ${symbol} @ $${price} | Amount: ${amount} SOL`);
}

// Log a sell trade
export function logSell(symbol: string, tokenAddress: string, price: number) {
  const positions = loadPositions();
  
  // Find the most recent open position for this token
  const openPositionIndex = positions.findIndex(
    pos => pos.tokenAddress === tokenAddress && pos.status === 'OPEN'
  );
  
  if (openPositionIndex === -1) {
    console.warn(`⚠️ No open position found for ${symbol} (${tokenAddress})`);
    return;
  }
  
  const position = positions[openPositionIndex];
  
  // Calculate P&L
  const pnl = (price - position.buyPrice) * position.buyAmount;
  const pnlPercentage = ((price - position.buyPrice) / position.buyPrice) * 100;
  
  // Update position
  positions[openPositionIndex] = {
    ...position,
    sellPrice: price,
    sellTimestamp: Date.now(),
    status: 'CLOSED',
    pnl,
    pnlPercentage
  };
  
  savePositions(positions);
  
  const profitEmoji = pnl > 0 ? '💰' : '📉';
  console.log(`${profitEmoji} SELL LOGGED: ${symbol} @ $${price} | P&L: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(4)} (${pnlPercentage > 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%)`);
}

// Get P&L summary
export function getPnLSummary(): PnLSummary {
  const positions = loadPositions();
  const closedPositions = positions.filter(pos => pos.status === 'CLOSED');
  const openPositions = positions.filter(pos => pos.status === 'OPEN');
  
  const wins = closedPositions.filter(pos => (pos.pnl || 0) > 0);
  const losses = closedPositions.filter(pos => (pos.pnl || 0) < 0);
  
  const totalPnL = closedPositions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
  const winRate = closedPositions.length > 0 ? (wins.length / closedPositions.length) * 100 : 0;
  
  const avgWinAmount = wins.length > 0 ? wins.reduce((sum, pos) => sum + (pos.pnl || 0), 0) / wins.length : 0;
  const avgLossAmount = losses.length > 0 ? losses.reduce((sum, pos) => sum + (pos.pnl || 0), 0) / losses.length : 0;
  
  const biggestWin = wins.length > 0 ? Math.max(...wins.map(pos => pos.pnl || 0)) : 0;
  const biggestLoss = losses.length > 0 ? Math.min(...losses.map(pos => pos.pnl || 0)) : 0;
  
  const totalVolume = closedPositions.reduce((sum, pos) => sum + pos.buyAmount, 0);
  
  return {
    totalTrades: positions.length,
    openPositions: openPositions.length,
    closedPositions: closedPositions.length,
    totalPnL,
    winRate,
    avgWinAmount,
    avgLossAmount,
    biggestWin,
    biggestLoss,
    totalVolume
  };
}

// Get open positions
export function getOpenPositions(): TradePosition[] {
  const positions = loadPositions();
  return positions.filter(pos => pos.status === 'OPEN');
}

// Get closed positions
export function getClosedPositions(): TradePosition[] {
  const positions = loadPositions();
  return positions.filter(pos => pos.status === 'CLOSED');
}

// Get recent trades (last 24 hours)
export function getRecentTrades(hours: number = 24): TradePosition[] {
  const positions = loadPositions();
  const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
  
  return positions.filter(pos => pos.buyTimestamp > cutoffTime);
}

// Force close a position (for emergency scenarios)
export function forceClosePosition(tokenAddress: string, exitPrice: number) {
  const positions = loadPositions();
  const openPositionIndex = positions.findIndex(
    pos => pos.tokenAddress === tokenAddress && pos.status === 'OPEN'
  );
  
  if (openPositionIndex === -1) {
    return false;
  }
  
  const position = positions[openPositionIndex];
  const pnl = (exitPrice - position.buyPrice) * position.buyAmount;
  const pnlPercentage = ((exitPrice - position.buyPrice) / position.buyPrice) * 100;
  
  positions[openPositionIndex] = {
    ...position,
    sellPrice: exitPrice,
    sellTimestamp: Date.now(),
    status: 'CLOSED',
    pnl,
    pnlPercentage
  };
  
  savePositions(positions);
  console.log(`🚨 FORCE CLOSED: ${position.symbol} @ $${exitPrice} | P&L: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(4)}`);
  return true;
}
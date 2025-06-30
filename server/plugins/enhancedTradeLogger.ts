import fs from 'fs';
import path from 'path';

const logFile = './server/logs/trade-log.json';

// Ensure logs directory exists
const logsDir = path.dirname(logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export function logTrade(entry: any) {
  let history: any[] = [];
  if (fs.existsSync(logFile)) {
    try {
      const fileContent = fs.readFileSync(logFile, 'utf8');
      history = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading trade log:', error);
      history = [];
    }
  }
  
  // Add timestamp and unique ID if not present
  const enhancedEntry = {
    id: entry.id || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    ...entry
  };
  
  history.push(enhancedEntry);
  
  try {
    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
    console.log(`📝 Trade logged: ${enhancedEntry.id}`);
  } catch (error) {
    console.error('Error writing trade log:', error);
  }
}

export function getTradeHistory(): any[] {
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  try {
    const fileContent = fs.readFileSync(logFile, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading trade history:', error);
    return [];
  }
}
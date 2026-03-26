import fs from "fs";
import { config } from "../config";

export function logTrade(trade: any) {
  try {
    // Ensure logs directory exists
    const logDir = config.logFilePath.substring(0, config.logFilePath.lastIndexOf('/'));
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Initialize log file if it doesn't exist
    if (!fs.existsSync(config.logFilePath)) {
      fs.writeFileSync(config.logFilePath, JSON.stringify([], null, 2));
    }

    const logs = JSON.parse(fs.readFileSync(config.logFilePath, "utf-8"));
    logs.push({ ...trade, timestamp: new Date().toISOString() });
    fs.writeFileSync(config.logFilePath, JSON.stringify(logs, null, 2));
    
    console.log(`📝 Trade logged to ${config.logFilePath}`);
  } catch (error) {
    console.error('❌ Failed to log trade:', error);
  }
}

export function getTradeHistory(limit?: number) {
  try {
    if (!fs.existsSync(config.logFilePath)) {
      return [];
    }
    
    const logs = JSON.parse(fs.readFileSync(config.logFilePath, "utf-8"));
    return limit ? logs.slice(-limit) : logs;
  } catch (error) {
    console.error('❌ Failed to read trade history:', error);
    return [];
  }
}
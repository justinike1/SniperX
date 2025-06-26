export interface WalletData {
  address: string;
  balance: number;
  balanceFormatted: string;
  profitLoss: number;
  profitLossFormatted: string;
}

export interface BotStatusData {
  isActive: boolean;
  tokensScanned: number;
  snipesToday: number;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
}

export interface TradeData {
  id: number;
  tokenSymbol: string;
  tokenAddress: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  profitLoss?: number;
  profitPercentage?: number;
  createdAt: string;
  txHash?: string;
}

export interface TokenScanData {
  address: string;
  symbol: string;
  name?: string;
  liquidityUsd: number;
  volume24h: number;
  priceUsd: number;
  isHoneypot: boolean;
  isLpLocked: boolean;
  isRenounced: boolean;
  riskScore: number;
  firstDetected: string;
  isFiltered: boolean;
  filterReason?: string;
}

export interface BotSettingsData {
  isActive: boolean;
  autoBuyAmount: number;
  stopLossPercentage: number;
  takeProfitLevels: number[];
  minLiquidity: number;
  maxSlippage: number;
  enableHoneypotFilter: boolean;
  enableLpLockFilter: boolean;
  enableRenounceFilter: boolean;
  notificationsEnabled: boolean;
}

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  autoHide?: boolean;
}

export interface WebSocketMessage {
  type: 'WALLET_UPDATE' | 'BOT_STATUS' | 'NEW_TRADE' | 'TOKEN_SCAN' | 'NOTIFICATION';
  data: any;
}

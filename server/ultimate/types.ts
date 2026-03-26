
export type Action = "BUY"|"SELL"|"SHORT"|"COVER"|"HOLD";
export interface StrategySignal { strategy: string; tokenMint: string; action: Action; confidence: number; sizeHintPct?: number; reason?: string; ts?: number; }
export interface UltConfig { maxPerTradeSOL:number; maxDailySOL:number; minWalletSOL:number; maxVolPct:number; maxSlippagePct:number; kellyCapPct:number; riskOffDDPct:number; blockDDPct:number; }
export interface WalletInfo { address: string; balanceSOL: number; dailySpentSOL: number; }
export interface ExecResult { success: boolean; txid?: string; reason?: string }
export interface TradeGateway {
  buy(tokenMint:string, amountSol:number): Promise<ExecResult>;
  sell(tokenMint:string, amountTokens:number): Promise<ExecResult>;
  short(tokenMint:string, sizeSol:number, leverage:number): Promise<ExecResult>;
  cover(tokenMint:string, sizeSol:number): Promise<ExecResult>;
}

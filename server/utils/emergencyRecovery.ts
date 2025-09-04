import { Connection, PublicKey } from '@solana/web3.js';
import { sendTelegramAlert } from './telegramAlert';
import { jupiterClient } from './jupiterClient';

const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`);

export interface StuckPosition {
  token: string;
  amount: number;
  value: number;
  canRecover: boolean;
}

export class EmergencyRecoverySystem {
  private walletAddress: string;
  private minGasRequired = 0.003; // Minimum SOL for a swap
  private recoveryCheckInterval = 10000; // Check every 10 seconds
  private isMonitoring = false;

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  async startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    console.log('🚨 Emergency Recovery System activated');
    
    setInterval(async () => {
      await this.checkForStuckPositions();
    }, this.recoveryCheckInterval);
  }

  async checkForStuckPositions() {
    try {
      const walletPubkey = new PublicKey(this.walletAddress);
      const balance = await connection.getBalance(walletPubkey) / 10**9;
      
      // Check if wallet has insufficient gas
      if (balance < this.minGasRequired) {
        console.log(`⚠️ STUCK POSITION DETECTED: Only ${balance} SOL, need ${this.minGasRequired} SOL`);
        
        // Get token accounts
        const tokenAccounts = await this.getTokenAccounts(walletPubkey);
        
        if (tokenAccounts.length > 0) {
          await this.alertStuckPosition(balance, tokenAccounts);
          
          // Attempt automatic recovery if possible
          await this.attemptRecovery(balance, tokenAccounts);
        }
      }
    } catch (error) {
      console.error('Emergency check failed:', error);
    }
  }

  async getTokenAccounts(wallet: PublicKey): Promise<StuckPosition[]> {
    try {
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      
      const accounts = await connection.getParsedTokenAccountsByOwner(wallet, {
        programId: TOKEN_PROGRAM_ID,
      });
      
      const positions: StuckPosition[] = [];
      
      for (const account of accounts.value) {
        const amount = account.account.data.parsed?.info?.tokenAmount?.uiAmount || 0;
        if (amount > 0) {
          const mint = account.account.data.parsed?.info?.mint;
          positions.push({
            token: mint,
            amount: amount,
            value: 0, // Would need price data to calculate
            canRecover: false
          });
        }
      }
      
      return positions;
    } catch (error) {
      console.error('Failed to get token accounts:', error);
      return [];
    }
  }

  async alertStuckPosition(balance: number, positions: StuckPosition[]) {
    const needed = (this.minGasRequired - balance).toFixed(4);
    const positionList = positions.map(p => `- ${p.amount} of ${p.token.slice(0, 8)}...`).join('\\n');
    
    const alertMessage = `🚨 EMERGENCY: STUCK POSITIONS DETECTED!
    
💰 Current Balance: ${balance.toFixed(6)} SOL
⛽ Required for gas: ${this.minGasRequired} SOL
💸 Need to add: ${needed} SOL

📦 Stuck Positions:
${positionList}

🔧 RECOVERY OPTIONS:
1️⃣ Add ${needed} SOL to wallet
2️⃣ Send SOL to: ${this.walletAddress}
3️⃣ Once funded, positions will auto-sell

⚡ Quick Recovery: Send exactly ${this.minGasRequired} SOL to unlock trading`;

    await sendTelegramAlert(alertMessage);
    console.log('📱 Emergency alert sent to Telegram');
  }

  async attemptRecovery(balance: number, positions: StuckPosition[]) {
    // If we have just enough gas, try to sell the most valuable position
    if (balance >= this.minGasRequired * 0.8) {
      console.log('🔧 Attempting emergency recovery with minimal gas...');
      
      // Try to sell smallest position first (likely to succeed with low gas)
      const smallestPosition = positions.sort((a, b) => a.amount - b.amount)[0];
      
      if (smallestPosition) {
        try {
          console.log(`🚨 Emergency sell attempt: ${smallestPosition.token}`);
          const result = await jupiterClient.swapTokenToSol(
            smallestPosition.token,
            smallestPosition.amount * 0.5 // Try to sell half
          );
          
          if (result.success) {
            await sendTelegramAlert(`✅ EMERGENCY RECOVERY SUCCESS!
Sold ${smallestPosition.amount * 0.5} tokens
Recovered ${result.solReceived} SOL
Wallet now has gas for normal operations`);
          }
        } catch (error) {
          console.error('Emergency recovery failed:', error);
        }
      }
    }
  }

  // Manual recovery function that can be called via API
  async manualRecover(tokenMint: string, amount: number): Promise<boolean> {
    try {
      console.log(`🔧 Manual recovery initiated for ${tokenMint}`);
      const result = await jupiterClient.swapTokenToSol(tokenMint, amount);
      
      if (result.success) {
        await sendTelegramAlert(`✅ Manual recovery successful!
Token: ${tokenMint}
Amount: ${amount}
SOL recovered: ${result.solReceived}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Manual recovery failed:', error);
      return false;
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🚨 Emergency Recovery System stopped');
  }
}

// Export singleton instance
export const emergencyRecovery = new EmergencyRecoverySystem(
  process.env.SOLANA_WALLET_ADDRESS || '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv'
);
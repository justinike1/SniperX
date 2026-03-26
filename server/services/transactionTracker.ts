import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { WebSocketMessage } from '../routes';

export interface PendingTransfer {
  id: string;
  userId: number;
  expectedAmount: number;
  destinationAddress: string;
  transactionId?: string;
  source: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  robinhoodEmail?: any;
}

export class TransactionTracker {
  private connection: Connection;
  private pendingTransfers: Map<string, PendingTransfer> = new Map();
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.startMonitoring();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  async trackRobinhoodTransfer(userId: number, robinhoodData: {
    amount: number;
    destinationAddress: string;
    transactionId: string;
    timestamp: string;
  }) {
    const transfer: PendingTransfer = {
      id: `robinhood_${Date.now()}`,
      userId,
      expectedAmount: robinhoodData.amount,
      destinationAddress: robinhoodData.destinationAddress,
      transactionId: robinhoodData.transactionId,
      source: 'Robinhood',
      timestamp: new Date(robinhoodData.timestamp),
      status: 'pending',
      robinhoodEmail: robinhoodData
    };

    this.pendingTransfers.set(transfer.id, transfer);
    
    console.log(`📧 Tracking Robinhood transfer: ${robinhoodData.amount} SOL to ${robinhoodData.destinationAddress}`);
    
    // Immediate check
    await this.checkTransferStatus(transfer);
    
    // Broadcast to user
    this.broadcastTransferUpdate(transfer);
    
    return transfer;
  }

  private async checkTransferStatus(transfer: PendingTransfer) {
    try {
      // Check if destination address is valid
      if (!this.isValidSolanaAddress(transfer.destinationAddress)) {
        console.log(`❌ Invalid Solana address: ${transfer.destinationAddress}`);
        transfer.status = 'failed';
        this.broadcastTransferUpdate(transfer);
        return;
      }

      const publicKey = new PublicKey(transfer.destinationAddress);
      
      // Get current balance
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / 1e9;
      
      console.log(`💰 Current balance for ${transfer.destinationAddress}: ${solBalance} SOL`);
      
      // Check recent transactions
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit: 50 });
      
      for (const sig of signatures) {
        if (sig.blockTime && sig.blockTime * 1000 > transfer.timestamp.getTime()) {
          const txDetails = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (txDetails && this.isMatchingTransfer(txDetails, transfer)) {
            transfer.status = 'confirmed';
            console.log(`✅ Found matching transaction: ${sig.signature}`);
            this.broadcastTransferUpdate(transfer);
            return;
          }
        }
      }
      
      // Check if transaction ID exists on blockchain
      if (transfer.transactionId) {
        try {
          const txDetails = await this.connection.getParsedTransaction(transfer.transactionId, {
            maxSupportedTransactionVersion: 0
          });
          
          if (txDetails) {
            transfer.status = 'confirmed';
            console.log(`✅ Found transaction by ID: ${transfer.transactionId}`);
            this.broadcastTransferUpdate(transfer);
            return;
          }
        } catch (error) {
          console.log(`🔍 Transaction ID ${transfer.transactionId} not found on blockchain yet`);
        }
      }
      
    } catch (error) {
      console.error('Error checking transfer status:', error);
    }
  }

  private isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  private isMatchingTransfer(tx: ParsedTransactionWithMeta, transfer: PendingTransfer): boolean {
    if (!tx.meta || !tx.transaction.message.instructions) return false;
    
    // Check for SOL transfers that match expected amount
    for (const instruction of tx.transaction.message.instructions) {
      if ('parsed' in instruction && instruction.parsed?.type === 'transfer') {
        const parsedInfo = instruction.parsed.info;
        if (parsedInfo.destination === transfer.destinationAddress) {
          const amount = parsedInfo.lamports / 1e9;
          if (Math.abs(amount - transfer.expectedAmount) < 0.001) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  private broadcastTransferUpdate(transfer: PendingTransfer) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast({
        type: 'WALLET_UPDATE',
        data: {
          type: 'transfer_update',
          transfer: {
            id: transfer.id,
            amount: transfer.expectedAmount,
            source: transfer.source,
            status: transfer.status,
            destinationAddress: transfer.destinationAddress,
            timestamp: transfer.timestamp
          }
        }
      });
    }
  }

  private startMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      const transferIds = Array.from(this.pendingTransfers.keys());
      for (const id of transferIds) {
        const transfer = this.pendingTransfers.get(id);
        if (transfer && transfer.status === 'pending') {
          await this.checkTransferStatus(transfer);
          
          // Remove transfers older than 24 hours
          const hoursSinceTransfer = (Date.now() - transfer.timestamp.getTime()) / (1000 * 60 * 60);
          if (hoursSinceTransfer > 24) {
            console.log(`⏰ Removing expired transfer tracking: ${id}`);
            this.pendingTransfers.delete(id);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  async getPendingTransfers(userId: number): Promise<PendingTransfer[]> {
    const transfers: PendingTransfer[] = [];
    this.pendingTransfers.forEach(transfer => {
      if (transfer.userId === userId) {
        transfers.push(transfer);
      }
    });
    return transfers;
  }

  async getTransferStatus(transferId: string): Promise<PendingTransfer | null> {
    return this.pendingTransfers.get(transferId) || null;
  }

  async checkAddressBalance(address: string): Promise<{ balance: number; isValid: boolean }> {
    try {
      if (!this.isValidSolanaAddress(address)) {
        return { balance: 0, isValid: false };
      }
      
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return { balance: balance / 1e9, isValid: true };
    } catch (error) {
      return { balance: 0, isValid: false };
    }
  }
}

export const transactionTracker = new TransactionTracker();
import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const connection = new Connection(
  process.env.HELIUS_API_KEY 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com', 
  'confirmed'
);

// User's real wallet address (from converted Phantom seed phrase)
export const userPublicKey = new PublicKey("F9J32TiWS7Ltrf6CFYtjoiCwZbST8GjuKrbKqSUfNtG2");

// Live trading toggle - can be controlled via API
let liveTradeEnabled = false;

export const enableLiveTrading = () => {
  liveTradeEnabled = true;
  console.log('🔥 LIVE TRADING ENABLED - Real SOL transactions active');
};

export const disableLiveTrading = () => {
  liveTradeEnabled = false;
  console.log('🛡️ LIVE TRADING DISABLED - Safe mode active');
};

export const isLiveTradingEnabled = () => liveTradeEnabled;

export const getSolBalance = async (): Promise<number> => {
  try {
    const balance = await connection.getBalance(userPublicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`[WALLET] Balance: ${solBalance.toFixed(4)} SOL for wallet 4E9EpM...`);
    return solBalance;
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    return 0;
  }
};

export const getWalletBalance = async (): Promise<number> => {
  return await getSolBalance();
};

export const getConnection = () => connection;

export const sendSol = async (destination: string, amountSol: number, fromKeypair?: Keypair): Promise<string> => {
  if (!liveTradeEnabled) {
    console.log(`[SIMULATION] Would trade ${amountSol} SOL from wallet 4E9EpM...`);
    throw new Error("LIVE TRADING DISABLED – Enable live trading to execute real transactions");
  }

  if (!fromKeypair) {
    throw new Error("Keypair required for signing transactions");
  }

  try {
    const toPubKey = new PublicKey(destination);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubKey,
        lamports: amountSol * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
    console.log(`✅ SOL Transfer successful: ${signature}`);
    return signature;
  } catch (error) {
    console.error('SOL transfer error:', error);
    throw error;
  }
};

// Simulate transaction for testing without spending real SOL
export const simulateSolTransfer = async (destination: string, amountSol: number): Promise<any> => {
  try {
    console.log(`[SIMULATION] Would trade ${amountSol} SOL from wallet 4E9EpM...`);
    
    const toPubKey = new PublicKey(destination);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: toPubKey,
        lamports: amountSol * LAMPORTS_PER_SOL,
      })
    );

    // Simulate transaction without sending
    const simulation = await connection.simulateTransaction(transaction);
    
    return {
      success: !simulation.value.err,
      signature: 'SIMULATED_' + Date.now(),
      amount: amountSol,
      destination,
      fees: simulation.value.accounts?.[0]?.lamports || 5000, // Estimated fees
      simulation: simulation.value
    };
  } catch (error) {
    console.error('Transaction simulation error:', error);
    throw error;
  }
};

// Get transaction history for the wallet
export const getTransactionHistory = async (limit: number = 10): Promise<any[]> => {
  try {
    const signatures = await connection.getSignaturesForAddress(userPublicKey, { limit });
    const transactions = [];
    
    for (const sig of signatures) {
      const tx = await connection.getTransaction(sig.signature);
      if (tx) {
        transactions.push({
          signature: sig.signature,
          slot: sig.slot,
          timestamp: sig.blockTime ? new Date(sig.blockTime * 1000) : null,
          status: sig.err ? 'failed' : 'success',
          fee: tx.meta?.fee || 0,
          amount: tx.meta?.preBalances && tx.meta?.postBalances 
            ? (tx.meta.preBalances[0] - tx.meta.postBalances[0]) / LAMPORTS_PER_SOL
            : 0
        });
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
};

// Validate if address is a valid Solana address
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Get current SOL price in USD
export const getSolPrice = async (): Promise<number> => {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    return data.solana?.usd || 0;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return 0;
  }
};
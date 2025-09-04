import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { config } from '../config';
import fs from 'fs';

export async function performJupiterSwap(
  connection: Connection,
  wallet: Keypair,
  inputMint: PublicKey,
  outputMint: PublicKey,
  amountInLamports: number,
  slippageBps: number = 100 // 1% slippage
): Promise<string> {
  try {
    // Get quote from Jupiter API v6
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${amountInLamports}&slippageBps=${slippageBps}`;
    
    const quoteResponse = await fetch(quoteUrl);
    const quoteData = await quoteResponse.json();
    
    if (!quoteResponse.ok) {
      throw new Error(`Quote failed: ${quoteData.error || 'Unknown error'}`);
    }

    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });

    const swapData = await swapResponse.json();
    
    if (!swapResponse.ok) {
      throw new Error(`Swap preparation failed: ${swapData.error || 'Unknown error'}`);
    }

    // Deserialize and sign transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([wallet]);

    // Send transaction
    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    console.log("✅ Jupiter swap successful");
    console.log("💰 Input Amount:", amountInLamports);
    console.log("💰 Expected Output:", quoteData.outAmount);
    console.log("🔗 Tx Hash:", signature);

    // Send Telegram notification
    try {
      const { sendTelegramAlert } = await import('../utils/telegramAlert');
      await sendTelegramAlert(`✅ Swap successful:
- Token: ${outputMint.toString()}
- Amount: ${quoteData.outAmount}
- Tx: https://solscan.io/tx/${signature}`);
    } catch (error) {
      console.log("📱 Telegram notification failed:", error);
    }

    return signature;
  } catch (error) {
    console.error("❌ Jupiter swap failed:", error);
    throw error;
  }
}

const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`);

// Load wallet using the same method as other parts of the system
let wallet: Keypair;
try {
  const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
  const secretKey = new Uint8Array(privateKeyArray);
  
  // Use fromSeed for 32-byte keys, fromSecretKey for 64-byte keys
  if (secretKey.length === 32) {
    wallet = Keypair.fromSeed(secretKey);
  } else if (secretKey.length === 64) {
    wallet = Keypair.fromSecretKey(secretKey);
  } else {
    throw new Error(`Invalid secret key length: ${secretKey.length}`);
  }
  
  console.log('🔗 Jupiter wallet loaded:', wallet.publicKey.toString());
} catch (error) {
  console.error('❌ Failed to load wallet for Jupiter client:', error);
  // Fallback wallet for development
  wallet = Keypair.generate();
  console.log('🔧 Using fallback wallet for Jupiter:', wallet.publicKey.toString());
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: any;
  priceImpactPct: string;
  routePlan: any[];
}

export async function getBestRoute(
  inputMint: string, 
  outputMint: string, 
  amount: number
): Promise<JupiterQuote | null> {
  try {
    const inputAmount = Math.floor(amount * (10 ** 9)); // Convert SOL to lamports
    
    const quoteResponse = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmount}&slippageBps=50`
    );
    
    if (!quoteResponse.ok) {
      throw new Error(`Jupiter quote API error: ${quoteResponse.status}`);
    }
    
    const quoteData = await quoteResponse.json();
    return quoteData;
    
  } catch (error) {
    console.error('❌ Jupiter quote error:', error);
    return null;
  }
}

export async function executeSwap(quote: JupiterQuote): Promise<string> {
  try {
    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      }),
    });

    if (!swapResponse.ok) {
      throw new Error(`Jupiter swap API error: ${swapResponse.status}`);
    }

    const { swapTransaction } = await swapResponse.json();
    
    // Deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    // Sign the transaction
    transaction.sign([wallet]);
    
    // Execute the transaction with enhanced confirmation
    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });
    
    console.log("📤 Jupiter swap transaction submitted:", txid);
    
    // Enhanced confirmation with timeout handling
    try {
      const confirmation = await connection.confirmTransaction(txid, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`Jupiter swap failed: ${confirmation.value.err}`);
      }
      console.log(`✅ Jupiter swap executed: ${txid}`);
      return txid;
    } catch (confirmError) {
      // Check if transaction actually succeeded
      const status = await connection.getSignatureStatus(txid);
      if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
        console.log("✅ Jupiter swap succeeded despite timeout | Tx ID:", txid);
        return txid;
      }
      throw confirmError;
    }
    
  } catch (error) {
    console.error('❌ Jupiter swap execution error:', error);
    throw error;
  }
}

// Get wallet balance helper
async function getWalletBalance(): Promise<number> {
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    return balance / 10**9; // Convert lamports to SOL
  } catch (error) {
    console.error('Failed to get balance:', error);
    return 0;
  }
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  tokenAmount?: number;
  tokenSymbol?: string;
  error?: string;
}

export async function swapSolToToken(
  tokenMint: string, 
  solAmount: number
): Promise<SwapResult> {
  try {
    // CRITICAL SAFETY CHECKS - NEVER SPEND ALL SOL
    const GAS_RESERVE = 0.01; // ALWAYS keep this for gas fees
    const MAX_TRADE_PERCENT = 0.2; // Max 20% of available balance per trade
    const MIN_TRADE_SIZE = 0.001; // Minimum trade size
    
    // Get current balance
    const balance = await getWalletBalance();
    console.log(`💰 Current balance: ${balance} SOL`);
    
    // Calculate available balance (minus gas reserve)
    const availableBalance = Math.max(0, balance - GAS_RESERVE);
    console.log(`⛽ Gas Reserve: ${GAS_RESERVE} SOL`);
    console.log(`✅ Available for trading: ${availableBalance} SOL`);
    
    // EMERGENCY STOP: Never trade if balance is too low
    if (balance <= GAS_RESERVE) {
      const error = `EMERGENCY STOP: Balance too low! Have ${balance} SOL, need > ${GAS_RESERVE} SOL for gas`;
      console.error(`🚨 ${error}`);
      return { success: false, error };
    }
    
    // Enforce position size limits (max 20% of available)
    const maxAllowedTrade = availableBalance * MAX_TRADE_PERCENT;
    const actualTradeAmount = Math.min(solAmount, maxAllowedTrade);
    
    if (actualTradeAmount < MIN_TRADE_SIZE) {
      const error = `Trade too small. Min: ${MIN_TRADE_SIZE} SOL, requested: ${actualTradeAmount} SOL`;
      console.error(`❌ ${error}`);
      return { success: false, error };
    }
    
    if (actualTradeAmount < solAmount) {
      console.log(`⚠️ POSITION LIMIT: Reducing trade from ${solAmount} to ${actualTradeAmount} SOL (20% max)`);
    }
    
    // Final check - ensure we have enough after gas reserve
    if (actualTradeAmount > availableBalance) {
      const error = `Insufficient available balance. Have: ${availableBalance} SOL, need: ${actualTradeAmount} SOL`;
      console.error(`❌ ${error}`);
      return { success: false, error };
    }
    
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    console.log(`🔄 SAFE SWAP: ${actualTradeAmount} SOL for ${tokenMint}`);
    console.log(`💰 Will keep ${balance - actualTradeAmount} SOL after trade`);
    
    const quote = await getBestRoute(SOL_MINT, tokenMint, actualTradeAmount);
    if (!quote) {
      return { success: false, error: 'No quote available for swap' };
    }
    
    const tokenAmount = parseInt(quote.outAmount) / 10**9;
    console.log(`💡 Quote: ${actualTradeAmount} SOL → ${tokenAmount.toFixed(6)} tokens`);
    console.log(`📊 Price impact: ${quote.priceImpactPct}%`);
    
    // Check if price impact is too high
    const priceImpact = parseFloat(quote.priceImpactPct);
    if (priceImpact > 5) {
      const error = `Price impact too high: ${priceImpact}%. Max allowed: 5%`;
      console.error(`⚠️ ${error}`);
      return { success: false, error };
    }
    
    const txid = await executeSwap(quote);
    return {
      success: true,
      txHash: txid,
      tokenAmount: tokenAmount,
      tokenSymbol: tokenMint.slice(0, 6)
    };
    
  } catch (error: any) {
    console.error('❌ SOL to token swap failed:', error);
    return { success: false, error: error.message || 'Swap failed' };
  }
}

export async function swapTokenToSol(
  tokenMint: string, 
  tokenAmount: number
): Promise<SwapResult> {
  try {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    // Check we have enough SOL for gas fees before attempting sell
    const balance = await getWalletBalance();
    const MIN_GAS_FOR_SELL = 0.003; // Minimum SOL needed for sell transaction
    
    if (balance < MIN_GAS_FOR_SELL) {
      const error = `Cannot sell! Need ${MIN_GAS_FOR_SELL} SOL for gas, have only ${balance} SOL`;
      console.error(`🚨 ${error}`);
      // Send critical alert
      try {
        const { sendTelegramAlert } = await import('../utils/telegramAlert');
        await sendTelegramAlert(`🚨 CRITICAL: Cannot sell ${tokenMint}!\n💰 Current Balance: ${balance} SOL\n⛽ Required: ${MIN_GAS_FOR_SELL} SOL for swap fees\n💸 Add: ${(MIN_GAS_FOR_SELL - balance).toFixed(4)} SOL to wallet\n⚠️ Wallet: ${wallet.publicKey.toString()}`);
      } catch {}
      return { success: false, error };
    }
    
    console.log(`🔄 Swapping ${tokenAmount} tokens for SOL`);
    console.log(`⛽ Gas available: ${balance} SOL`);
    
    const quote = await getBestRoute(tokenMint, SOL_MINT, tokenAmount);
    if (!quote) {
      return { success: false, error: 'No quote available for swap' };
    }
    
    const solReceived = parseInt(quote.outAmount) / 10**9;
    console.log(`💡 Quote: ${tokenAmount} tokens → ${solReceived.toFixed(6)} SOL`);
    console.log(`📊 Price impact: ${quote.priceImpactPct}%`);
    
    const txid = await executeSwap(quote);
    return {
      success: true,
      txHash: txid,
      solReceived: solReceived,
      tokenSymbol: tokenMint.slice(0, 6)
    };
    
  } catch (error: any) {
    console.error('❌ Token to SOL swap failed:', error);
    return { success: false, error: error.message || 'Swap failed' };
  }
}

export const jupiterClient = {
  getBestRoute,
  executeSwap,
  swapSolToToken,
  swapTokenToSol
};
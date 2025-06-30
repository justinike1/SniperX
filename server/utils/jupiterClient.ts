import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { config } from '../config';
import fs from 'fs';

const connection = new Connection('https://api.mainnet-beta.solana.com');

// Load wallet using the same method as other parts of the system
let wallet: Keypair;
try {
  const secretKeyData = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
  let secretKey: Uint8Array;
  
  if (Array.isArray(secretKeyData)) {
    secretKey = new Uint8Array(secretKeyData);
  } else if (secretKeyData.secretKey && Array.isArray(secretKeyData.secretKey)) {
    secretKey = new Uint8Array(secretKeyData.secretKey);
  } else {
    throw new Error('Invalid wallet format');
  }
  
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
    
    // Execute the transaction
    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });
    
    await connection.confirmTransaction(txid);
    console.log(`✅ Jupiter swap executed: ${txid}`);
    
    return txid;
    
  } catch (error) {
    console.error('❌ Jupiter swap execution error:', error);
    throw error;
  }
}

export async function swapSolToToken(
  tokenMint: string, 
  solAmount: number
): Promise<string | null> {
  try {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    console.log(`🔄 Swapping ${solAmount} SOL for ${tokenMint}`);
    
    const quote = await getBestRoute(SOL_MINT, tokenMint, solAmount);
    if (!quote) {
      throw new Error('No quote available for swap');
    }
    
    console.log(`💡 Quote: ${solAmount} SOL → ${(parseInt(quote.outAmount) / 10**9).toFixed(6)} tokens`);
    console.log(`📊 Price impact: ${quote.priceImpactPct}%`);
    
    const txid = await executeSwap(quote);
    return txid;
    
  } catch (error) {
    console.error('❌ SOL to token swap failed:', error);
    return null;
  }
}

export async function swapTokenToSol(
  tokenMint: string, 
  tokenAmount: number
): Promise<string | null> {
  try {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    console.log(`🔄 Swapping ${tokenAmount} tokens for SOL`);
    
    const quote = await getBestRoute(tokenMint, SOL_MINT, tokenAmount);
    if (!quote) {
      throw new Error('No quote available for swap');
    }
    
    console.log(`💡 Quote: ${tokenAmount} tokens → ${(parseInt(quote.outAmount) / 10**9).toFixed(6)} SOL`);
    console.log(`📊 Price impact: ${quote.priceImpactPct}%`);
    
    const txid = await executeSwap(quote);
    return txid;
    
  } catch (error) {
    console.error('❌ Token to SOL swap failed:', error);
    return null;
  }
}

export const jupiterClient = {
  getBestRoute,
  executeSwap,
  swapSolToToken,
  swapTokenToSol
};
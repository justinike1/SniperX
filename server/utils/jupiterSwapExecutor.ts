import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from '../config';
import fs from 'fs';

// Load wallet keypair from file
function loadWalletKeypair(): Keypair {
  try {
    if (fs.existsSync('./phantom_key.json')) {
      const secret = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
      return Keypair.fromSecretKey(Uint8Array.from(secret));
    } else if (process.env.PHANTOM_PRIVATE_KEY) {
      const secretKey = JSON.parse(process.env.PHANTOM_PRIVATE_KEY);
      return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } else {
      throw new Error('No wallet configuration found');
    }
  } catch (error) {
    console.error('❌ Error loading wallet:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Use multiple RPC endpoints for reliability
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://api.metaplex.solana.com'
];

function getConnection(): Connection {
  // Try different RPC endpoints
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      return new Connection(endpoint, 'confirmed');
    } catch (error) {
      console.log(`⚠️ RPC endpoint ${endpoint} failed, trying next...`);
      continue;
    }
  }
  // Fallback to default
  return new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
}

export async function jupiterSwap(fromMint: string, toMint: string, amountIn: number): Promise<string | null> {
  try {
    console.log('🟡 Fetching swap transaction from Jupiter...');
    console.log(`📊 Swap: ${fromMint} → ${toMint}, Amount: ${amountIn}`);

    const keypair = loadWalletKeypair();
    const connection = getConnection();

    // Get Jupiter quote
    const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromMint}&outputMint=${toMint}&amount=${amountIn}&slippageBps=${config.slippage * 100}`;
    
    console.log('🔍 Getting Jupiter quote...');
    const quoteResponse = await fetch(quoteUrl);
    const quote = await quoteResponse.json();

    if (!quote.outAmount || quote.error) {
      throw new Error(`No quote available: ${quote.error || 'Unknown error'}`);
    }

    // Get swap transaction
    const swapResponse = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: keypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
      }),
    });

    const swapData = await swapResponse.json();

    if (!swapData.swapTransaction) {
      throw new Error('No swap transaction received from Jupiter');
    }

    // Create and sign transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    let transaction = Transaction.from(swapTransactionBuf);

    // Set recent blockhash and fee payer
    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = keypair.publicKey;

    // Sign transaction
    transaction.sign(keypair);

    console.log('📤 Sending transaction to Solana...');
    
    // Send and confirm transaction
    const txid = await sendAndConfirmTransaction(
      connection, 
      transaction, 
      [keypair],
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    console.log('✅ Jupiter swap executed successfully!');
    console.log(`🔗 Transaction: https://solscan.io/tx/${txid}`);
    
    return txid;

  } catch (error) {
    console.error('❌ Jupiter swap failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function getJupiterQuote(fromMint: string, toMint: string, amountIn: number) {
  try {
    const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromMint}&outputMint=${toMint}&amount=${amountIn}&slippageBps=${config.slippage * 100}`;
    
    const response = await fetch(quoteUrl);
    const quote = await response.json();

    if (quote.error) {
      throw new Error(quote.error);
    }

    return {
      success: true,
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
      priceImpactPct: quote.priceImpactPct,
      route: quote.routePlan
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Quote failed'
    };
  }
}
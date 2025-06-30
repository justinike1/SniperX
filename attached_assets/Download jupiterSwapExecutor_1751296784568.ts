import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getSwapTransaction } from '@jup-ag/core';
import bs58 from 'bs58';
import { config } from './config';
import fs from 'fs';

// Load wallet keypair from file
const secret = JSON.parse(fs.readFileSync('./phantom-key.json', 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));

const connection = new Connection(config.rpcEndpoint);

export async function jupiterSwap(fromMint: string, toMint: string, amountIn: number) {
  try {
    console.log('🟡 Fetching swap transaction from Jupiter...');

    const quoteResponse = await fetch(\`https://quote-api.jup.ag/v6/swap?inputMint=\${fromMint}&outputMint=\${toMint}&amount=\${amountIn}&slippage=\${config.slippage}\`);
    const quote = await quoteResponse.json();

    if (!quote.swapTransaction) throw new Error('No swap transaction available.');

    const swapTxRaw = Buffer.from(quote.swapTransaction, 'base64');
    const transaction = Transaction.from(swapTxRaw);

    transaction.feePayer = keypair.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await keypair.signTransaction(transaction);
    const txid = await sendAndConfirmTransaction(connection, signed, [keypair]);

    console.log('✅ Real trade executed:', txid);
    return txid;

  } catch (error) {
    console.error('❌ Jupiter real trade error:', error.message);
    return null;
  }
}

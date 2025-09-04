// EMERGENCY BONK LIQUIDATOR - Fixes the BONK swap problem
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

// BONK token mint address
const BONK_MINT = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

class BonkLiquidator {
  private connection: Connection;
  private wallet: Keypair;
  private isInitialized: boolean = false;

  constructor() {
    // Use Helius RPC for reliability
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    // Load wallet
    try {
      const privateKeyArray = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf-8'));
      const secretKey = new Uint8Array(privateKeyArray);
      
      if (secretKey.length === 32) {
        this.wallet = Keypair.fromSeed(secretKey);
      } else if (secretKey.length === 64) {
        this.wallet = Keypair.fromSecretKey(secretKey);
      } else {
        throw new Error(`Invalid secret key length: ${secretKey.length}`);
      }
      
      console.log('💊 BONK Liquidator initialized for wallet:', this.wallet.publicKey.toString());
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize BONK liquidator:', error);
      this.wallet = Keypair.generate();
    }
  }

  async getBonkBalance(): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { mint: BONK_MINT }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
      return parseFloat(balance.uiAmount || '0');
    } catch (error) {
      console.error('Error getting BONK balance:', error);
      return 0;
    }
  }

  async liquidateBonk(amountBonk?: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'BONK liquidator not initialized' };
      }

      // Get current BONK balance
      const bonkBalance = await this.getBonkBalance();
      console.log(`💊 Current BONK balance: ${bonkBalance.toLocaleString()}`);

      if (bonkBalance === 0) {
        return { success: false, error: 'No BONK tokens to liquidate' };
      }

      // Get SOL balance for gas check
      const solBalance = await this.connection.getBalance(this.wallet.publicKey);
      const solAmount = solBalance / 1e9;
      console.log(`⛽ Current SOL balance: ${solAmount} SOL`);

      // Check if we have enough gas (need at least 0.01 SOL)
      if (solAmount < 0.01) {
        console.error('❌ INSUFFICIENT GAS: Need at least 0.01 SOL for swap fees');
        return { 
          success: false, 
          error: `Insufficient SOL for gas. Have ${solAmount} SOL, need at least 0.01 SOL` 
        };
      }

      // Determine amount to swap (use all if not specified)
      const swapAmount = amountBonk || bonkBalance;
      const swapAmountLamports = Math.floor(swapAmount * 100000); // BONK has 5 decimals

      console.log(`🔄 Attempting to swap ${swapAmount.toLocaleString()} BONK to SOL...`);

      // Use Jupiter API v6 for the swap
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?` +
        `inputMint=${BONK_MINT.toString()}` +
        `&outputMint=${SOL_MINT.toString()}` +
        `&amount=${swapAmountLamports}` +
        `&slippageBps=500` + // 5% slippage for BONK
        `&onlyDirectRoutes=false` +
        `&asLegacyTransaction=false`;

      const quoteResponse = await fetch(quoteUrl);
      const quoteData = await quoteResponse.json();

      if (!quoteResponse.ok || !quoteData) {
        console.error('❌ Failed to get quote for BONK swap');
        return { success: false, error: 'Failed to get swap quote from Jupiter' };
      }

      const expectedSol = parseInt(quoteData.outAmount) / 1e9;
      console.log(`💰 Expected output: ${expectedSol.toFixed(6)} SOL`);

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              maxLamports: 5000000, // 0.005 SOL max priority fee
              priorityLevel: "high"
            }
          }
        })
      });

      const swapData = await swapResponse.json();

      if (!swapResponse.ok || !swapData.swapTransaction) {
        console.error('❌ Failed to prepare BONK swap transaction');
        return { success: false, error: 'Failed to prepare swap transaction' };
      }

      // Import VersionedTransaction properly
      const { VersionedTransaction } = await import('@solana/web3.js');

      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([this.wallet]);

      // Send with retry logic
      console.log('📤 Sending BONK liquidation transaction...');
      
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: true, // Skip preflight for BONK
        preflightCommitment: 'processed',
        maxRetries: 3
      });

      console.log(`⏳ Confirming transaction: ${signature}`);

      // Wait for confirmation with timeout
      const confirmationPromise = this.connection.confirmTransaction(signature, 'confirmed');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
      );

      try {
        await Promise.race([confirmationPromise, timeoutPromise]);
        console.log(`✅ BONK LIQUIDATED SUCCESSFULLY!`);
        console.log(`💰 Swapped ${swapAmount.toLocaleString()} BONK → ${expectedSol.toFixed(6)} SOL`);
        console.log(`🔗 Transaction: https://solscan.io/tx/${signature}`);

        // Send Telegram notification
        try {
          const { sendTelegramAlert } = await import('./telegramAlert');
          await sendTelegramAlert(
            `✅ BONK LIQUIDATED:\n` +
            `• Amount: ${swapAmount.toLocaleString()} BONK\n` +
            `• Received: ${expectedSol.toFixed(6)} SOL\n` +
            `• Tx: https://solscan.io/tx/${signature}`
          );
        } catch (error) {
          console.log('Telegram notification failed:', error);
        }

        return { success: true, txHash: signature };

      } catch (timeoutError) {
        // Check if transaction succeeded despite timeout
        const status = await this.connection.getSignatureStatus(signature);
        if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
          console.log('✅ BONK liquidation succeeded (confirmed after timeout)');
          return { success: true, txHash: signature };
        }
        throw timeoutError;
      }

    } catch (error) {
      console.error('❌ BONK liquidation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async emergencyLiquidateAll(): Promise<{ success: boolean; message: string }> {
    console.log('🚨 EMERGENCY BONK LIQUIDATION INITIATED');
    
    const bonkBalance = await this.getBonkBalance();
    if (bonkBalance === 0) {
      return { success: false, message: 'No BONK tokens to liquidate' };
    }

    console.log(`💊 Found ${bonkBalance.toLocaleString()} BONK to liquidate`);
    
    // Try to liquidate in chunks if balance is large
    if (bonkBalance > 1000000000) { // More than 1B BONK
      console.log('📦 Large balance detected, liquidating in chunks...');
      
      let totalLiquidated = 0;
      const chunkSize = 500000000; // 500M BONK per chunk
      
      while (totalLiquidated < bonkBalance) {
        const remaining = bonkBalance - totalLiquidated;
        const chunkAmount = Math.min(chunkSize, remaining);
        
        console.log(`🔄 Liquidating chunk: ${chunkAmount.toLocaleString()} BONK`);
        const result = await this.liquidateBonk(chunkAmount);
        
        if (!result.success) {
          console.error(`❌ Failed to liquidate chunk: ${result.error}`);
          break;
        }
        
        totalLiquidated += chunkAmount;
        console.log(`✅ Total liquidated so far: ${totalLiquidated.toLocaleString()} BONK`);
        
        // Wait between chunks
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      return { 
        success: totalLiquidated > 0, 
        message: `Liquidated ${totalLiquidated.toLocaleString()} of ${bonkBalance.toLocaleString()} BONK` 
      };
    } else {
      // Small balance, liquidate all at once
      const result = await this.liquidateBonk(bonkBalance);
      return {
        success: result.success,
        message: result.success 
          ? `Successfully liquidated ${bonkBalance.toLocaleString()} BONK`
          : `Failed to liquidate: ${result.error}`
      };
    }
  }
}

// Export singleton instance
export const bonkLiquidator = new BonkLiquidator();
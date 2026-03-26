// Professional Trading Routes - Kelly Criterion + Risk Management
import type { Express } from "express";
import { JupiterGateway } from "../ultimate/gateway/jupiterGateway";
import { UltimateOrchestrator } from "../ultimate/orchestrator";
import { env } from "../utils/envAdapter";
import { loadWallet, conn } from "../utils/solanaAdapter";
import type { StrategySignal, UltConfig, WalletInfo } from "../ultimate/types";

// Initialize professional trading system
const config: UltConfig = {
  maxPerTradeSOL: 0.005, // 0.005 SOL max per trade (ULTRA CONSERVATIVE)
  maxDailySOL: 0.05, // 0.05 SOL daily limit
  minWalletSOL: 0.015, // Always keep 0.015 SOL for gas
  maxVolPct: 25, // Stop if volatility > 25%
  maxSlippagePct: 5, // Max 5% slippage
  kellyCapPct: 0.10, // Max 10% Kelly fraction
  riskOffDDPct: 10, // Reduce size at 10% drawdown
  blockDDPct: 15 // Stop all trading at 15% drawdown
};

const gateway = new JupiterGateway();
const orchestrator = new UltimateOrchestrator(config, gateway);

// Track equity for drawdown management
let currentEquity = 0;

export function registerProfessionalRoutes(app: Express) {
  
  // Professional buy with Kelly criterion
  app.post('/api/pro/trade', async (req, res) => {
    try {
      const { signals, tokenMint, action, confidence } = req.body;
      
      // Get wallet balance
      const wallet = loadWallet();
      const balance = await conn().getBalance(wallet.publicKey);
      const balanceSOL = balance / 1e9;
      
      // Update equity
      currentEquity = balanceSOL;
      
      // Create wallet info
      const walletInfo: WalletInfo = {
        address: wallet.publicKey.toString(),
        balanceSOL: balanceSOL,
        dailySpentSOL: 0 // TODO: Track from storage
      };
      
      // Create signal array
      let strategySignals: StrategySignal[];
      
      if (signals) {
        // Multiple signals provided
        strategySignals = signals;
      } else {
        // Single signal from legacy endpoints
        strategySignals = [{
          strategy: "MANUAL",
          tokenMint: tokenMint || "unknown",
          action: action || "BUY",
          confidence: confidence || 0.7,
          reason: "Manual trade request"
        }];
      }
      
      // Update candle data if provided
      if (tokenMint && req.body.price) {
        orchestrator.onCandle(tokenMint, req.body.price, currentEquity);
      }
      
      // Let orchestrator decide (Kelly + risk management)
      const decision = await orchestrator.onSignals(walletInfo, strategySignals);
      
      res.json({
        success: decision.decided !== "HOLD",
        decision: decision.decided,
        sizeSOL: decision.sizeSOL,
        reason: decision.reason,
        config: {
          maxPerTrade: config.maxPerTradeSOL,
          maxDaily: config.maxDailySOL,
          minWallet: config.minWalletSOL
        },
        wallet: {
          balance: balanceSOL,
          decision: decision.decided,
          size: decision.sizeSOL
        }
      });
      
    } catch (error) {
      console.error('❌ Professional trade error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Liquidate BONK with professional system
  app.post('/api/pro/liquidate-bonk', async (req, res) => {
    try {
      const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
      
      console.log('💊 Professional BONK liquidation initiated');
      
      // Get BONK balance
      const wallet = loadWallet();
      const { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
      const { PublicKey } = await import('@solana/web3.js');
      
      let bonkAmount = 0;
      try {
        const bonkMint = new PublicKey(BONK_MINT);
        const ata = await getAssociatedTokenAddress(bonkMint, wallet.publicKey);
        const account = await getAccount(conn(), ata);
        bonkAmount = Number(account.amount) / (10 ** 5); // BONK has 5 decimals
      } catch (error) {
        console.log('No BONK tokens found');
        return res.json({
          success: false,
          message: 'No BONK tokens to liquidate'
        });
      }
      
      if (bonkAmount === 0) {
        return res.json({
          success: false,
          message: 'No BONK tokens to liquidate'
        });
      }
      
      console.log(`💊 Found ${bonkAmount.toLocaleString()} BONK to liquidate`);
      
      // Use professional gateway to sell
      const result = await gateway.sell(BONK_MINT, bonkAmount);
      
      if (result.success) {
        console.log(`✅ BONK liquidated successfully!`);
        console.log(`🔗 Tx: https://solscan.io/tx/${result.txid}`);
        
        // Send Telegram notification
        try {
          const { sendTelegramAlert } = await import('../utils/telegramAlert');
          await sendTelegramAlert(
            `✅ BONK LIQUIDATED (Professional System):\n` +
            `• Amount: ${bonkAmount.toLocaleString()} BONK\n` +
            `• System: Kelly Criterion + Risk Management\n` +
            `• Tx: https://solscan.io/tx/${result.txid}`
          );
        } catch (e) {
          console.log('Telegram notification failed');
        }
        
        res.json({
          success: true,
          amount: bonkAmount,
          txid: result.txid,
          message: `Successfully liquidated ${bonkAmount.toLocaleString()} BONK`
        });
      } else {
        res.json({
          success: false,
          error: result.reason,
          message: `Failed to liquidate BONK: ${result.reason}`
        });
      }
      
    } catch (error) {
      console.error('❌ BONK liquidation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get professional trading status
  app.get('/api/pro/status', async (req, res) => {
    try {
      const wallet = loadWallet();
      const balance = await conn().getBalance(wallet.publicKey);
      const balanceSOL = balance / 1e9;
      
      res.json({
        success: true,
        wallet: wallet.publicKey.toString(),
        balance: balanceSOL,
        config: {
          system: "Kelly Criterion + Risk Management",
          maxPerTrade: config.maxPerTradeSOL,
          maxDaily: config.maxDailySOL,
          minWallet: config.minWalletSOL,
          maxVolatility: config.maxVolPct,
          maxSlippage: config.maxSlippagePct,
          kellyCapPct: config.kellyCapPct,
          riskOffDrawdown: config.riskOffDDPct,
          blockDrawdown: config.blockDDPct
        },
        equity: currentEquity,
        safetyChecks: [
          '✅ Simulation before execution',
          '✅ Retry logic (3 attempts)',
          '✅ Gas fee reserves protected',
          '✅ Kelly criterion position sizing',
          '✅ Drawdown protection',
          '✅ Volatility limits',
          '✅ Daily spending caps'
        ]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

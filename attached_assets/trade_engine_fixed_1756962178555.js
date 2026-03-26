// tradeEngine.js (Upgraded: Simulation Mode, Logging, Capital Protection, Telegram-Ready)

import { Connection, Keypair, Transaction, LAMPORTS_PER_SOL, SystemProgram, PublicKey } from '@solana/web3.js';
import AlfredReasoner from '../ai/reasoner.js';
import SentimentFusionEngine from '../ai/sentimentFuse.js';
import { JupiterClient } from '../lib/jupiterClient.js';

export default class AdvancedTradeEngine {
  constructor(walletConnector, rpcUrl, isSimulation = true) {
    this.wallet = walletConnector;
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.jupiter = new JupiterClient(this.connection, walletConnector);
    this.reasoner = new AlfredReasoner();
    this.sentiment = new SentimentFusionEngine();
    this.simulateOnly = isSimulation;

    this.settings = {
      maxWalletPercentage: 0.10,
      emergencyStopLoss: -0.20,
      normalStopLoss: -0.08,
      minProfitTarget: 0.20,
      maxProfitTarget: 50.00,
      slippageTolerance: 0.05
    };

    this.activePositions = new Map();
    this.tradeHistory = [];
    this.isExecuting = false;
  }

  async getWalletStatus() {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      const positions = Array.from(this.activePositions.values());
      return {
        solBalance: balance / LAMPORTS_PER_SOL,
        activePositions: positions.length,
        totalValue: balance + positions.reduce((sum, pos) => sum + pos.solInvested, 0)
      };
    } catch (error) {
      console.error('Wallet status error:', error);
      return { solBalance: 0, activePositions: 0, totalValue: 0 };
    }
  }

  async analyzeTrade(token, action = 'BUY', overrideAmount = null) {
    if (this.isExecuting) return { success: false, reason: 'Another trade is executing' };

    try {
      this.isExecuting = true;
      const marketData = await this.getMarketData(token);
      const walletStatus = await this.getWalletStatus();
      const sentimentData = await this.sentiment.fuseAllSentiment(token.symbol);

      this.reasoner = new AlfredReasoner(walletStatus, marketData, sentimentData);
      const analysis = this.reasoner.analyzeAndExplain(token, action, marketData);

      const positionSize = overrideAmount || this.calculatePositionSize(
        walletStatus.solBalance,
        analysis.confidence,
        analysis.riskLevel
      );

      let result = { success: false, reason: 'Analysis incomplete' };
      if (analysis.confidence > 60 && analysis.riskLevel !== 'EXTREME') {
        result = action === 'BUY'
          ? await this.executeBuy(token, positionSize, analysis)
          : await this.executeSell(token, positionSize, analysis);
      } else {
        result = {
          success: false,
          reason: `Trade rejected - ${analysis.explanation}`,
          analysis
        };
      }

      this.logTrade({ token: token.symbol, action, analysis, result, timestamp: new Date().toISOString() });
      return { ...result, alfredExplanation: analysis.explanation, confidence: analysis.confidence, reasoning: analysis.reasoning };
    } catch (err) {
      console.error('Trade analysis error:', err);
      return { success: false, reason: 'Trade execution failed' };
    } finally {
      this.isExecuting = false;
    }
  }

  async executeBuy(token, solAmount, analysis) {
    try {
      if (solAmount < 0.001) return { success: false, reason: 'Position size too small (min 0.001 SOL)' };
      if (this.activePositions.has(token.address)) return { success: false, reason: 'Already have position in this token' };

      if (this.simulateOnly) {
        console.log(`[SIMULATION] Buying ${solAmount} SOL of ${token.symbol}`);
        return { success: true, simulation: true, position: { token: token.symbol, solInvested: solAmount } };
      }

      const swapResult = await this.jupiter.swapSolToToken(
        token.address,
        solAmount,
        this.settings.slippageTolerance
      );

      if (!swapResult.success) return { success: false, reason: swapResult.reason };

      const position = {
        token: token.symbol,
        address: token.address,
        entryPrice: swapResult.executionPrice,
        tokenAmount: swapResult.tokensReceived,
        solInvested: solAmount,
        entryTime: new Date().toISOString(),
        stopLoss: analysis.riskLevel === 'HIGH' ? this.settings.emergencyStopLoss : this.settings.normalStopLoss,
        takeProfitLadder: this.createProfitLadder(swapResult.executionPrice),
        alfredReasoning: analysis.reasoning,
        confidence: analysis.confidence
      };

      this.activePositions.set(token.address, position);
      this.startPositionMonitoring(token.address);
      return { success: true, transaction: swapResult.signature, position };
    } catch (err) {
      console.error('Buy execution error:', err);
      return { success: false, reason: 'Buy failed' };
    }
  }

  async executeSell(token, sellAmount, analysis) {
    try {
      const position = this.activePositions.get(token.address);
      if (!position) return { success: false, reason: 'No position to sell' };

      if (this.simulateOnly) {
        console.log(`[SIMULATION] Selling ${sellAmount} of ${token.symbol}`);
        return { success: true, simulation: true, pnl: { solReceived: sellAmount * position.entryPrice } };
      }

      const swapResult = await this.jupiter.swapTokenToSol(
        token.address,
        sellAmount,
        this.settings.slippageTolerance
      );

      if (!swapResult.success) return { success: false, reason: swapResult.reason };

      const pnl = this.calculatePnL(position, swapResult.solReceived, sellAmount / position.tokenAmount);
      this.activePositions.delete(token.address);
      return { success: true, transaction: swapResult.signature, pnl };
    } catch (err) {
      console.error('Sell execution error:', err);
      return { success: false, reason: 'Sell failed' };
    }
  }

  calculatePnL(position, solReceived, percent) {
    const invested = position.solInvested * percent;
    const profit = solReceived - invested;
    return {
      solProfit: profit,
      percentageProfit: (profit / invested) * 100,
      solInvested: invested,
      solReceived
    };
  }

  logTrade(tradeData) {
    this.tradeHistory.push(tradeData);
    if (this.tradeHistory.length > 1000) this.tradeHistory.shift();
    if (this.reasoner) {
      this.reasoner.learnFromOutcome(
        tradeData.transaction || 'REJECTED',
        tradeData.result.success ? 'SUCCESS' : 'FAILURE',
        tradeData.analysis.expectedOutcome
      );
    }
  }
}

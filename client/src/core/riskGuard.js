/**
 * RISK GUARD SYSTEM
 * Position sizing, stop losses, and portfolio protection
 * Prevents catastrophic losses and manages risk exposure
 */

class RiskGuardSystem {
  constructor() {
    this.riskLimits = {
      maxPositionSize: 0.10,        // 10% of portfolio max per trade
      maxDailyDrawdown: 0.05,       // 5% daily loss limit
      maxTotalDrawdown: 0.20,       // 20% total loss limit
      emergencyStopLoss: 0.20,      // 20% emergency stop
      normalStopLoss: 0.08,         // 8% normal stop
      correlationLimit: 0.60,       // Max 60% correlation between positions
      maxOpenPositions: 8,          // Maximum concurrent positions
      minLiquidityUSD: 100000,      // Minimum liquidity required
      maxSlippage: 0.05,            // 5% max slippage tolerance
      cooldownPeriod: 300000        // 5 minutes between same-token trades
    };

    this.portfolioState = {
      totalValue: 0,
      dailyPnL: 0,
      totalPnL: 0,
      openPositions: new Map(),
      dailyTrades: 0,
      lastTradeTime: new Map(),
      emergencyMode: false,
      riskScore: 0
    };

    this.riskEvents = [];
    this.isActive = true;
    
    console.log('🛡️ Risk Guard System initialized - Portfolio protection active');
  }

  // Main risk assessment for new trades
  assessTradeRisk(tokenData, tradeAmount, confidence) {
    const assessment = {
      approved: false,
      adjustedAmount: 0,
      riskLevel: 'EXTREME',
      warnings: [],
      stopLossLevel: this.riskLimits.emergencyStopLoss,
      reasoning: []
    };

    try {
      // 1. Portfolio size check
      const portfolioCheck = this.checkPortfolioLimits(tradeAmount);
      if (!portfolioCheck.passed) {
        assessment.warnings.push(...portfolioCheck.warnings);
        if (portfolioCheck.critical) return assessment;
      }

      // 2. Position concentration check
      const concentrationCheck = this.checkPositionConcentration();
      if (!concentrationCheck.passed) {
        assessment.warnings.push(...concentrationCheck.warnings);
        if (concentrationCheck.critical) return assessment;
      }

      // 3. Token-specific risk assessment
      const tokenRisk = this.assessTokenRisk(tokenData);
      assessment.riskLevel = tokenRisk.level;
      assessment.reasoning.push(...tokenRisk.factors);

      // 4. Liquidity check
      const liquidityCheck = this.checkLiquidity(tokenData);
      if (!liquidityCheck.adequate) {
        assessment.warnings.push('Low liquidity may cause high slippage');
        if (liquidityCheck.critical) return assessment;
      }

      // 5. Correlation check
      const correlationCheck = this.checkCorrelation(tokenData.symbol);
      if (correlationCheck.highCorrelation) {
        assessment.warnings.push(`High correlation with existing positions: ${correlationCheck.correlated.join(', ')}`);
        tradeAmount *= 0.7; // Reduce position size for correlated assets
      }

      // 6. Cooldown check
      const cooldownCheck = this.checkCooldown(tokenData.address);
      if (!cooldownCheck.passed) {
        assessment.warnings.push(`Cooldown active: ${cooldownCheck.remainingTime}s remaining`);
        return assessment;
      }

      // 7. Confidence-based adjustments
      const confidenceAdjustment = this.adjustForConfidence(tradeAmount, confidence);
      tradeAmount = confidenceAdjustment.adjustedAmount;
      assessment.reasoning.push(confidenceAdjustment.reasoning);

      // 8. Set stop loss based on risk level
      assessment.stopLossLevel = this.calculateStopLoss(assessment.riskLevel, tokenRisk);

      // Final approval
      if (assessment.warnings.filter(w => w.includes('CRITICAL')).length === 0) {
        assessment.approved = true;
        assessment.adjustedAmount = tradeAmount;
        this.logRiskDecision('APPROVED', assessment);
      } else {
        this.logRiskDecision('REJECTED', assessment);
      }

    } catch (error) {
      console.error('Risk assessment error:', error);
      assessment.warnings.push('Risk assessment failed - trade rejected for safety');
    }

    return assessment;
  }

  // Check portfolio-level limits
  checkPortfolioLimits(requestedAmount) {
    const check = { passed: true, critical: false, warnings: [] };
    
    // Max position size check
    const positionPercent = requestedAmount / this.portfolioState.totalValue;
    if (positionPercent > this.riskLimits.maxPositionSize) {
      const maxAllowed = this.portfolioState.totalValue * this.riskLimits.maxPositionSize;
      check.warnings.push(`CRITICAL: Position size ${(positionPercent*100).toFixed(1)}% exceeds ${(this.riskLimits.maxPositionSize*100)}% limit. Max allowed: ${maxAllowed.toFixed(4)} SOL`);
      check.critical = true;
      check.passed = false;
    }

    // Daily drawdown check
    const dailyDrawdownPercent = Math.abs(this.portfolioState.dailyPnL) / this.portfolioState.totalValue;
    if (this.portfolioState.dailyPnL < 0 && dailyDrawdownPercent > this.riskLimits.maxDailyDrawdown) {
      check.warnings.push(`CRITICAL: Daily drawdown ${(dailyDrawdownPercent*100).toFixed(1)}% exceeds ${(this.riskLimits.maxDailyDrawdown*100)}% limit`);
      check.critical = true;
      check.passed = false;
    }

    // Total drawdown check
    const totalDrawdownPercent = Math.abs(this.portfolioState.totalPnL) / this.portfolioState.totalValue;
    if (this.portfolioState.totalPnL < 0 && totalDrawdownPercent > this.riskLimits.maxTotalDrawdown) {
      check.warnings.push(`CRITICAL: Total drawdown ${(totalDrawdownPercent*100).toFixed(1)}% exceeds ${(this.riskLimits.maxTotalDrawdown*100)}% limit`);
      check.critical = true;
      check.passed = false;
    }

    return check;
  }

  // Check position concentration
  checkPositionConcentration() {
    const check = { passed: true, critical: false, warnings: [] };
    
    if (this.portfolioState.openPositions.size >= this.riskLimits.maxOpenPositions) {
      check.warnings.push(`CRITICAL: Maximum positions reached (${this.riskLimits.maxOpenPositions})`);
      check.critical = true;
      check.passed = false;
    }

    return check;
  }

  // Assess token-specific risks
  assessTokenRisk(tokenData) {
    let riskScore = 0;
    const factors = [];
    
    // Age risk
    if (tokenData.age && tokenData.age < 24) {
      riskScore += 30;
      factors.push('Very new token (< 24 hours)');
    } else if (tokenData.age && tokenData.age < 168) { // < 1 week
      riskScore += 15;
      factors.push('New token (< 1 week old)');
    }
    
    // Market cap risk
    if (tokenData.marketCap < 1000000) {
      riskScore += 25;
      factors.push('Low market cap (< $1M)');
    } else if (tokenData.marketCap < 10000000) {
      riskScore += 10;
      factors.push('Small market cap (< $10M)');
    }
    
    // Liquidity risk
    if (tokenData.liquidity < this.riskLimits.minLiquidityUSD) {
      riskScore += 20;
      factors.push(`Low liquidity (< $${this.riskLimits.minLiquidityUSD/1000}k)`);
    }
    
    // Volatility risk
    if (tokenData.volatility24h > 100) {
      riskScore += 15;
      factors.push('Extreme volatility (> 100% in 24h)');
    } else if (tokenData.volatility24h > 50) {
      riskScore += 8;
      factors.push('High volatility (> 50% in 24h)');
    }
    
    // Holder concentration risk
    if (tokenData.topHolderPercent > 50) {
      riskScore += 25;
      factors.push('High holder concentration (top holder > 50%)');
    } else if (tokenData.topHolderPercent > 20) {
      riskScore += 10;
      factors.push('Medium holder concentration (top holder > 20%)');
    }

    // Determine risk level
    let level = 'LOW';
    if (riskScore > 60) level = 'EXTREME';
    else if (riskScore > 40) level = 'HIGH';
    else if (riskScore > 20) level = 'MEDIUM';
    
    return { level, score: riskScore, factors };
  }

  // Check liquidity adequacy
  checkLiquidity(tokenData) {
    const liquidity = tokenData.liquidity || 0;
    return {
      adequate: liquidity >= this.riskLimits.minLiquidityUSD,
      critical: liquidity < this.riskLimits.minLiquidityUSD * 0.5,
      liquidityUSD: liquidity
    };
  }

  // Check correlation with existing positions
  checkCorrelation(newTokenSymbol) {
    const correlatedTokens = [];
    const correlationThreshold = this.riskLimits.correlationLimit;
    
    // Simple correlation check based on token categories
    const memeTokens = ['DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF', 'POPCAT'];
    const aiTokens = ['AI', 'GPT', 'RNDR', 'FET', 'AGIX'];
    const defiTokens = ['UNI', 'AAVE', 'COMP', 'MKR', 'SNX'];
    
    for (const [address, position] of this.portfolioState.openPositions) {
      const existingSymbol = position.symbol;
      let correlation = 0;
      
      // Check if tokens are in same category (high correlation)
      if (memeTokens.includes(newTokenSymbol) && memeTokens.includes(existingSymbol)) correlation = 0.8;
      else if (aiTokens.includes(newTokenSymbol) && aiTokens.includes(existingSymbol)) correlation = 0.7;
      else if (defiTokens.includes(newTokenSymbol) && defiTokens.includes(existingSymbol)) correlation = 0.6;
      
      if (correlation > correlationThreshold) {
        correlatedTokens.push(existingSymbol);
      }
    }
    
    return {
      highCorrelation: correlatedTokens.length > 0,
      correlated: correlatedTokens,
      maxCorrelation: Math.max(...correlatedTokens.map(() => 0.8), 0)
    };
  }

  // Check trading cooldown
  checkCooldown(tokenAddress) {
    const lastTradeTime = this.portfolioState.lastTradeTime.get(tokenAddress) || 0;
    const timeSinceLastTrade = Date.now() - lastTradeTime;
    const cooldownRemaining = this.riskLimits.cooldownPeriod - timeSinceLastTrade;
    
    return {
      passed: timeSinceLastTrade >= this.riskLimits.cooldownPeriod,
      remainingTime: Math.max(0, Math.floor(cooldownRemaining / 1000))
    };
  }

  // Adjust position size based on confidence
  adjustForConfidence(amount, confidence) {
    let multiplier = 1.0;
    let reasoning = '';
    
    if (confidence >= 90) {
      multiplier = 1.2;
      reasoning = 'Increased position size due to very high confidence (90%+)';
    } else if (confidence >= 80) {
      multiplier = 1.1;
      reasoning = 'Slightly increased position size due to high confidence (80%+)';
    } else if (confidence >= 70) {
      multiplier = 1.0;
      reasoning = 'Standard position size for good confidence (70%+)';
    } else if (confidence >= 60) {
      multiplier = 0.8;
      reasoning = 'Reduced position size due to moderate confidence (60-70%)';
    } else if (confidence >= 50) {
      multiplier = 0.6;
      reasoning = 'Significantly reduced position size due to low confidence (50-60%)';
    } else {
      multiplier = 0.4;
      reasoning = 'Minimal position size due to very low confidence (<50%)';
    }
    
    return {
      adjustedAmount: amount * multiplier,
      multiplier,
      reasoning
    };
  }

  // Calculate appropriate stop loss level
  calculateStopLoss(riskLevel, tokenRisk) {
    let stopLoss = this.riskLimits.normalStopLoss;
    
    if (riskLevel === 'EXTREME' || tokenRisk.score > 50) {
      stopLoss = this.riskLimits.emergencyStopLoss;
    } else if (riskLevel === 'HIGH') {
      stopLoss = 0.12; // 12% stop loss for high risk
    } else if (riskLevel === 'MEDIUM') {
      stopLoss = 0.10; // 10% stop loss for medium risk
    }
    
    return stopLoss;
  }

  // Update portfolio state after trade
  updatePortfolioState(tradeData) {
    if (tradeData.type === 'BUY') {
      this.portfolioState.openPositions.set(tradeData.tokenAddress, {
        symbol: tradeData.symbol,
        amount: tradeData.amount,
        entryPrice: tradeData.price,
        entryTime: Date.now(),
        stopLoss: tradeData.stopLoss
      });
      
      this.portfolioState.lastTradeTime.set(tradeData.tokenAddress, Date.now());
    } else if (tradeData.type === 'SELL') {
      if (tradeData.percentSold >= 1.0) {
        this.portfolioState.openPositions.delete(tradeData.tokenAddress);
      }
      
      // Update P&L
      this.portfolioState.dailyPnL += tradeData.pnl;
      this.portfolioState.totalPnL += tradeData.pnl;
    }
    
    this.portfolioState.dailyTrades++;
    this.calculateRiskScore();
  }

  // Calculate overall portfolio risk score
  calculateRiskScore() {
    let score = 0;
    
    // Position concentration score
    const positionCount = this.portfolioState.openPositions.size;
    score += Math.min(positionCount / this.riskLimits.maxOpenPositions * 30, 30);
    
    // Drawdown score
    const drawdownPercent = Math.abs(this.portfolioState.totalPnL) / this.portfolioState.totalValue;
    if (this.portfolioState.totalPnL < 0) {
      score += Math.min(drawdownPercent / this.riskLimits.maxTotalDrawdown * 40, 40);
    }
    
    // Daily trading frequency score
    if (this.portfolioState.dailyTrades > 20) score += 20;
    else if (this.portfolioState.dailyTrades > 10) score += 10;
    
    this.portfolioState.riskScore = Math.min(score, 100);
    
    // Activate emergency mode if risk score too high
    if (this.portfolioState.riskScore > 80 && !this.portfolioState.emergencyMode) {
      this.activateEmergencyMode();
    }
  }

  // Activate emergency mode
  activateEmergencyMode() {
    this.portfolioState.emergencyMode = true;
    console.log('🚨 EMERGENCY MODE ACTIVATED - High risk detected');
    
    // Tighten all risk limits
    this.riskLimits.maxPositionSize *= 0.5;
    this.riskLimits.maxDailyDrawdown *= 0.5;
    
    this.logRiskEvent('EMERGENCY_MODE_ACTIVATED', {
      riskScore: this.portfolioState.riskScore,
      trigger: 'High portfolio risk detected',
      timestamp: new Date().toISOString()
    });
  }

  // Deactivate emergency mode
  deactivateEmergencyMode() {
    this.portfolioState.emergencyMode = false;
    
    // Restore normal risk limits
    this.riskLimits.maxPositionSize /= 0.5;
    this.riskLimits.maxDailyDrawdown /= 0.5;
    
    console.log('✅ Emergency mode deactivated - Risk levels normalized');
  }

  // Log risk decisions and events
  logRiskDecision(decision, assessment) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      decision,
      riskLevel: assessment.riskLevel,
      warnings: assessment.warnings,
      reasoning: assessment.reasoning,
      portfolioRiskScore: this.portfolioState.riskScore
    };
    
    this.riskEvents.push(logEntry);
    
    // Keep only last 1000 events
    if (this.riskEvents.length > 1000) {
      this.riskEvents.shift();
    }
  }

  logRiskEvent(eventType, data) {
    this.logRiskDecision(eventType, { warnings: [], reasoning: [data.trigger || 'System event'] });
  }

  // Get risk statistics
  getRiskStats() {
    return {
      portfolioRiskScore: this.portfolioState.riskScore,
      emergencyMode: this.portfolioState.emergencyMode,
      openPositions: this.portfolioState.openPositions.size,
      dailyPnL: this.portfolioState.dailyPnL,
      totalPnL: this.portfolioState.totalPnL,
      dailyTrades: this.portfolioState.dailyTrades,
      recentEvents: this.riskEvents.slice(-10),
      riskLimits: this.riskLimits
    };
  }

  // Reset daily statistics
  resetDailyStats() {
    this.portfolioState.dailyPnL = 0;
    this.portfolioState.dailyTrades = 0;
    console.log('📊 Daily risk statistics reset');
  }
}

export default RiskGuardSystem;
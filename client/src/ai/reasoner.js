/**
 * ALFRED MODE AI REASONER
 * Human-like trading explanations with market awareness
 * Explains WHY trades are executed based on conditions
 */

class AlfredReasoner {
  constructor(walletData, marketData, socialData) {
    this.wallet = walletData;
    this.market = marketData;
    this.social = socialData;
    this.confidence = 0;
    this.reasoning = [];
  }

  // Main reasoning engine - explains trade decisions
  analyzeAndExplain(token, action, marketConditions) {
    this.reasoning = [];
    this.confidence = 0;

    // Wallet condition analysis
    const walletAnalysis = this.analyzeWalletConditions();
    
    // Market trend analysis
    const trendAnalysis = this.analyzeTrendConditions(token, marketConditions);
    
    // Social sentiment analysis
    const socialAnalysis = this.analyzeSocialConditions(token);
    
    // Risk assessment
    const riskAnalysis = this.assessRisk(token, action);
    
    // Final decision reasoning
    const decision = this.makeDecision(action, walletAnalysis, trendAnalysis, socialAnalysis, riskAnalysis);
    
    return {
      action: action,
      token: token.symbol,
      confidence: this.confidence,
      reasoning: this.reasoning,
      explanation: this.generateHumanExplanation(decision),
      riskLevel: riskAnalysis.level,
      expectedOutcome: decision.expectedOutcome,
      timestamp: new Date().toISOString()
    };
  }

  analyzeWalletConditions() {
    const solBalance = this.wallet.solBalance || 0;
    const portfolioValue = this.wallet.totalValue || 0;
    const maxTradeAmount = portfolioValue * 0.10; // 10% max rule
    
    let analysis = {
      hasEnoughBalance: solBalance > 0.001,
      portfolioRisk: portfolioValue > 0 ? 'MANAGED' : 'HIGH',
      recommendedAmount: Math.min(maxTradeAmount, solBalance * 0.8),
      reasoning: []
    };

    if (solBalance > 0.1) {
      this.reasoning.push("✅ Strong wallet balance allows for confident position sizing");
      this.confidence += 15;
    } else if (solBalance > 0.01) {
      this.reasoning.push("⚠️ Moderate wallet balance - using conservative position size");
      this.confidence += 8;
    } else {
      this.reasoning.push("🚨 Low wallet balance - high caution required");
      this.confidence -= 20;
    }

    return analysis;
  }

  analyzeTrendConditions(token, marketConditions) {
    const priceChange = marketConditions.priceChange24h || 0;
    const volume = marketConditions.volume24h || 0;
    const momentum = marketConditions.momentum || 0;

    let trendStrength = 'NEUTRAL';
    
    if (priceChange > 20 && volume > 1000000) {
      trendStrength = 'VERY_BULLISH';
      this.reasoning.push(`🚀 ${token.symbol} showing explosive momentum: +${priceChange.toFixed(1)}% with massive volume`);
      this.confidence += 25;
    } else if (priceChange > 10 && momentum > 70) {
      trendStrength = 'BULLISH';
      this.reasoning.push(`📈 ${token.symbol} in strong uptrend with high momentum score of ${momentum}`);
      this.confidence += 18;
    } else if (priceChange > 5) {
      trendStrength = 'POSITIVE';
      this.reasoning.push(`↗️ ${token.symbol} showing positive movement, worth watching`);
      this.confidence += 10;
    } else if (priceChange < -10) {
      trendStrength = 'BEARISH';
      this.reasoning.push(`📉 ${token.symbol} in downtrend - high risk territory`);
      this.confidence -= 15;
    }

    return {
      strength: trendStrength,
      momentum: momentum,
      volumeStrength: volume > 500000 ? 'HIGH' : volume > 100000 ? 'MEDIUM' : 'LOW'
    };
  }

  analyzeSocialConditions(token) {
    const mentions = this.social.mentions || 0;
    const sentiment = this.social.sentiment || 0.5;
    const influencerBuzz = this.social.influencerActivity || false;

    if (mentions > 1000 && sentiment > 0.7) {
      this.reasoning.push(`📱 Massive social buzz: ${mentions} mentions with ${(sentiment * 100).toFixed(0)}% positive sentiment`);
      this.confidence += 20;
      return { level: 'VIRAL', strength: 'HIGH' };
    } else if (mentions > 500 && sentiment > 0.6) {
      this.reasoning.push(`🗣️ Strong social activity with positive sentiment trending`);
      this.confidence += 12;
      return { level: 'TRENDING', strength: 'MEDIUM' };
    } else if (mentions < 50) {
      this.reasoning.push(`🔇 Low social activity - relying on technical analysis only`);
      return { level: 'QUIET', strength: 'LOW' };
    }

    return { level: 'MODERATE', strength: 'MEDIUM' };
  }

  assessRisk(token, action) {
    let riskScore = 0;
    let riskFactors = [];

    // Liquidity risk
    if (token.liquidity < 100000) {
      riskScore += 30;
      riskFactors.push("Low liquidity pool");
    }

    // New token risk
    if (token.age && token.age < 24) {
      riskScore += 25;
      riskFactors.push("Very new token (< 24h old)");
    }

    // Market cap risk
    if (token.marketCap < 1000000) {
      riskScore += 20;
      riskFactors.push("Low market cap");
    }

    let riskLevel = 'LOW';
    if (riskScore > 50) riskLevel = 'EXTREME';
    else if (riskScore > 30) riskLevel = 'HIGH';
    else if (riskScore > 15) riskLevel = 'MEDIUM';

    if (riskFactors.length > 0) {
      this.reasoning.push(`⚠️ Risk factors identified: ${riskFactors.join(', ')}`);
      this.confidence -= riskScore * 0.3;
    }

    return {
      level: riskLevel,
      score: riskScore,
      factors: riskFactors,
      stopLoss: riskLevel === 'EXTREME' ? -20 : -8 // Dynamic stop loss
    };
  }

  makeDecision(action, wallet, trend, social, risk) {
    let decision = {
      execute: false,
      expectedOutcome: 'NEUTRAL',
      reasoning: 'Insufficient data'
    };

    // Buy decision logic
    if (action === 'BUY') {
      if (this.confidence > 70 && wallet.hasEnoughBalance && risk.level !== 'EXTREME') {
        decision.execute = true;
        decision.expectedOutcome = 'PROFITABLE';
        decision.reasoning = `High confidence buy signal with manageable risk`;
        this.reasoning.push(`✅ EXECUTING BUY - All conditions favorable (${this.confidence.toFixed(0)}% confidence)`);
      } else if (this.confidence < 30 || risk.level === 'EXTREME') {
        decision.execute = false;
        decision.reasoning = `Risk too high or confidence too low for entry`;
        this.reasoning.push(`❌ SKIPPING BUY - Conditions not met for safe entry`);
      }
    }

    // Sell decision logic
    if (action === 'SELL') {
      if (trend.strength === 'BEARISH' || risk.level === 'EXTREME') {
        decision.execute = true;
        decision.expectedOutcome = 'PROTECT_CAPITAL';
        decision.reasoning = `Trend reversal detected - protecting capital`;
        this.reasoning.push(`🛡️ EXECUTING SELL - Protecting position from downside`);
      }
    }

    return decision;
  }

  generateHumanExplanation(decision) {
    const confidenceText = this.confidence > 80 ? 'Very High' : 
                          this.confidence > 60 ? 'High' : 
                          this.confidence > 40 ? 'Moderate' : 'Low';

    let explanation = `Based on my analysis, I have ${confidenceText} confidence in this decision. `;
    
    if (decision.execute) {
      explanation += `Here's why I'm executing this trade: ${this.reasoning.join('. ')}.`;
    } else {
      explanation += `Here's why I'm holding back: ${this.reasoning.join('. ')}.`;
    }
    
    explanation += ` Market conditions and your wallet status were carefully considered to make this decision.`;
    
    return explanation;
  }

  // Continuous learning from trade outcomes
  learnFromOutcome(tradeId, actualOutcome, expectedOutcome) {
    const success = (actualOutcome === expectedOutcome) || 
                   (expectedOutcome === 'PROFITABLE' && actualOutcome > 0);
    
    // Store learning data for future improvements
    const learning = {
      tradeId,
      success,
      confidenceWas: this.confidence,
      lessonLearned: success ? 'Confirmed pattern' : 'Need adjustment',
      timestamp: new Date().toISOString()
    };
    
    // This would be stored in the memory system
    return learning;
  }
}

export default AlfredReasoner;
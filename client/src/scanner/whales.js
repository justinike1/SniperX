/**
 * WHALE TRACKER
 * Real-time whale wallet monitoring across Solana
 * Detects large movements in milliseconds
 */

class WhaleTracker {
  constructor() {
    this.knownWhales = new Map();
    this.watchedTokens = new Set();
    this.alerts = [];
    this.isMonitoring = false;
    
    // Known whale wallets (public addresses from DeFi protocols)
    this.whaleWallets = [
      '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Alameda Research
      '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Jump Capital  
      '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE', // Genesis Trading
      'GThUX1Atko4tqhN2NaiTazWSeFWMuiUiswPjiEMuDqKN', // Market Maker
      'EhYXQPv42foMWB2eqvJ9uoLzQv3XKNWCmg8kxJvCzfSf', // Institutional
    ];
    
    this.config = {
      minTransactionValue: 50000, // $50k minimum to trigger alert
      monitoringInterval: 2000,    // 2 second checks
      maxAlertsPerHour: 100,      // Rate limiting
      confidenceThreshold: 0.8    // 80% confidence minimum
    };
    
    this.initializeWhaleDatabase();
  }

  // Initialize known whale wallet database
  initializeWhaleDatabase() {
    this.whaleWallets.forEach(wallet => {
      this.knownWhales.set(wallet, {
        address: wallet,
        label: this.getWhaleLabel(wallet),
        totalVolume: 0,
        transactionCount: 0,
        avgTransactionSize: 0,
        behavior: 'UNKNOWN',
        reliability: 0.5,
        lastSeen: null,
        tokens: new Set()
      });
    });
    
    console.log(`🐋 Whale tracker initialized with ${this.whaleWallets.length} known whale wallets`);
  }

  // Start real-time whale monitoring
  startMonitoring(tokensToWatch = []) {
    if (this.isMonitoring) {
      console.log('Whale monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    this.watchedTokens = new Set(tokensToWatch);
    
    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.scanWhaleActivity();
    }, this.config.monitoringInterval);
    
    console.log(`🐋 Started whale monitoring for ${tokensToWatch.length} tokens`);
  }

  // Main whale activity scanning
  async scanWhaleActivity() {
    try {
      const recentTransactions = await this.getRecentTransactions();
      
      for (const tx of recentTransactions) {
        await this.analyzeTransaction(tx);
      }
      
    } catch (error) {
      console.error('Whale scanning error:', error);
    }
  }

  // Analyze individual transaction for whale activity
  async analyzeTransaction(transaction) {
    try {
      // Calculate transaction value in USD
      const usdValue = await this.calculateTransactionValue(transaction);
      
      // Skip small transactions
      if (usdValue < this.config.minTransactionValue) {
        return;
      }
      
      // Check if involves known whale
      const whaleInvolved = this.isWhaleInvolved(transaction);
      
      // Analyze transaction pattern
      const analysis = await this.analyzeTransactionPattern(transaction, usdValue);
      
      // Generate alert if significant
      if (analysis.isSignificant || whaleInvolved) {
        this.generateWhaleAlert(transaction, analysis, whaleInvolved, usdValue);
      }
      
    } catch (error) {
      console.error('Transaction analysis error:', error);
    }
  }

  // Check if transaction involves known whale wallets
  isWhaleInvolved(transaction) {
    const fromAddress = transaction.from;
    const toAddress = transaction.to;
    
    const fromWhale = this.knownWhales.get(fromAddress);
    const toWhale = this.knownWhales.get(toAddress);
    
    if (fromWhale || toWhale) {
      return {
        whale: fromWhale || toWhale,
        direction: fromWhale ? 'SELLING' : 'BUYING',
        address: fromAddress || toAddress
      };
    }
    
    return null;
  }

  // Analyze transaction patterns for whale behavior
  async analyzeTransactionPattern(transaction, usdValue) {
    const pattern = {
      isSignificant: false,
      confidence: 0,
      behavior: 'UNKNOWN',
      impact: 'LOW',
      reasoning: []
    };
    
    // Large transaction analysis
    if (usdValue > 500000) { // $500k+
      pattern.isSignificant = true;
      pattern.confidence += 0.3;
      pattern.impact = 'HIGH';
      pattern.reasoning.push(`Massive transaction: $${(usdValue/1000).toFixed(0)}k`);
    } else if (usdValue > 100000) { // $100k+
      pattern.isSignificant = true;
      pattern.confidence += 0.2;
      pattern.impact = 'MEDIUM';
      pattern.reasoning.push(`Large transaction: $${(usdValue/1000).toFixed(0)}k`);
    }
    
    // Token-specific analysis
    if (this.watchedTokens.has(transaction.tokenAddress)) {
      pattern.confidence += 0.2;
      pattern.reasoning.push('Involves monitored token');
    }
    
    // Timing analysis (detect coordinated moves)
    const recentSimilar = await this.findRecentSimilarTransactions(transaction);
    if (recentSimilar.length > 2) {
      pattern.confidence += 0.3;
      pattern.behavior = 'COORDINATED';
      pattern.reasoning.push(`Part of coordinated activity (${recentSimilar.length} similar txs)`);
    }
    
    // Exchange interaction analysis
    if (this.isExchangeAddress(transaction.to) || this.isExchangeAddress(transaction.from)) {
      pattern.confidence += 0.1;
      pattern.behavior = this.isExchangeAddress(transaction.to) ? 'DEPOSIT' : 'WITHDRAWAL';
      pattern.reasoning.push(`Exchange ${pattern.behavior.toLowerCase()} detected`);
    }
    
    return pattern;
  }

  // Generate whale alert
  generateWhaleAlert(transaction, analysis, whaleInfo, usdValue) {
    const alert = {
      id: `whale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'WHALE_ACTIVITY',
      timestamp: new Date().toISOString(),
      severity: analysis.impact,
      confidence: Math.min(analysis.confidence, 1.0),
      
      // Transaction details
      transaction: {
        hash: transaction.hash,
        from: transaction.from,
        to: transaction.to,
        tokenAddress: transaction.tokenAddress,
        tokenSymbol: transaction.tokenSymbol,
        amount: transaction.amount,
        usdValue: usdValue
      },
      
      // Whale information
      whale: whaleInfo ? {
        address: whaleInfo.address,
        label: whaleInfo.whale.label,
        direction: whaleInfo.direction,
        reliability: whaleInfo.whale.reliability
      } : null,
      
      // Analysis
      analysis: {
        behavior: analysis.behavior,
        impact: analysis.impact,
        reasoning: analysis.reasoning
      },
      
      // Trading implications
      implications: this.generateTradingImplications(transaction, analysis, whaleInfo),
      
      // Alert message
      message: this.formatAlertMessage(transaction, analysis, whaleInfo, usdValue)
    };
    
    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.pop();
    }
    
    // Broadcast alert
    this.broadcastAlert(alert);
    
    console.log(`🚨 WHALE ALERT: ${alert.message}`);
    return alert;
  }

  // Generate trading implications
  generateTradingImplications(transaction, analysis, whaleInfo) {
    const implications = [];
    
    if (whaleInfo) {
      if (whaleInfo.direction === 'BUYING') {
        implications.push({
          action: 'CONSIDER_BUY',
          reasoning: 'Whale accumulation detected',
          timeframe: '1-24 hours',
          confidence: 0.7
        });
      } else if (whaleInfo.direction === 'SELLING') {
        implications.push({
          action: 'CONSIDER_SELL',
          reasoning: 'Whale distribution detected',
          timeframe: '0-6 hours',
          confidence: 0.8
        });
      }
    }
    
    if (analysis.behavior === 'COORDINATED') {
      implications.push({
        action: 'HIGH_VOLATILITY_EXPECTED',
        reasoning: 'Coordinated whale activity suggests major move',
        timeframe: '0-4 hours',
        confidence: 0.9
      });
    }
    
    if (analysis.behavior === 'DEPOSIT') {
      implications.push({
        action: 'POTENTIAL_SELL_PRESSURE',
        reasoning: 'Large deposit to exchange suggests sell intention',
        timeframe: '0-2 hours',
        confidence: 0.75
      });
    }
    
    return implications;
  }

  // Format alert message
  formatAlertMessage(transaction, analysis, whaleInfo, usdValue) {
    let message = '';
    
    if (whaleInfo) {
      const action = whaleInfo.direction === 'BUYING' ? '🟢 BUYING' : '🔴 SELLING';
      message = `${action} ${whaleInfo.whale.label} moved $${(usdValue/1000).toFixed(0)}k in ${transaction.tokenSymbol}`;
    } else {
      message = `🐋 Large transaction: $${(usdValue/1000).toFixed(0)}k ${transaction.tokenSymbol}`;
    }
    
    if (analysis.reasoning.length > 0) {
      message += ` (${analysis.reasoning[0]})`;
    }
    
    return message;
  }

  // Broadcast alert to connected systems
  broadcastAlert(alert) {
    // This would integrate with Telegram, WebSocket, etc.
    if (typeof window !== 'undefined' && window.postMessage) {
      window.postMessage({
        type: 'WHALE_ALERT',
        data: alert
      }, '*');
    }
  }

  // Get recent alerts
  getRecentAlerts(limit = 20) {
    return this.alerts.slice(0, limit);
  }

  // Get whale statistics
  getWhaleStats() {
    const activeWhales = Array.from(this.knownWhales.values()).filter(w => w.lastSeen);
    const recentAlerts = this.alerts.filter(a => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return new Date(a.timestamp) > hourAgo;
    });
    
    return {
      totalWhalesTracked: this.knownWhales.size,
      activeWhales: activeWhales.length,
      alertsLastHour: recentAlerts.length,
      highConfidenceAlerts: recentAlerts.filter(a => a.confidence > 0.8).length,
      tokensWatched: this.watchedTokens.size,
      isMonitoring: this.isMonitoring
    };
  }

  // Add token to watch list
  addTokenToWatch(tokenAddress, tokenSymbol) {
    this.watchedTokens.add(tokenAddress);
    console.log(`🐋 Added ${tokenSymbol} to whale watch list`);
  }

  // Remove token from watch list
  removeTokenFromWatch(tokenAddress) {
    this.watchedTokens.delete(tokenAddress);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Whale monitoring stopped');
  }

  // Helper functions (would be replaced with real blockchain API calls)
  async getRecentTransactions() {
    // Mock recent transactions
    return Array.from({ length: 10 }, (_, i) => ({
      hash: `tx_${Date.now()}_${i}`,
      from: this.whaleWallets[Math.floor(Math.random() * this.whaleWallets.length)],
      to: `random_${Math.random().toString(36).substr(2, 9)}`,
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      tokenSymbol: 'USDC',
      amount: Math.random() * 1000000 + 10000,
      timestamp: new Date().toISOString()
    }));
  }

  async calculateTransactionValue(transaction) {
    // Mock USD calculation
    return transaction.amount; // Assuming USDC for simplicity
  }

  async findRecentSimilarTransactions(transaction) {
    // Mock similar transaction detection
    return [];
  }

  isExchangeAddress(address) {
    const exchanges = [
      'binance', 'coinbase', 'kraken', 'ftx', 'kucoin'
    ];
    return exchanges.some(ex => address?.toLowerCase().includes(ex));
  }

  getWhaleLabel(address) {
    const labels = {
      '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1': 'Alameda Research',
      '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': 'Jump Capital',
      '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE': 'Genesis Trading',
      'GThUX1Atko4tqhN2NaiTazWSeFWMuiUiswPjiEMuDqKN': 'Market Maker',
      'EhYXQPv42foMWB2eqvJ9uoLzQv3XKNWCmg8kxJvCzfSf': 'Institutional Trader'
    };
    return labels[address] || 'Unknown Whale';
  }
}

export default WhaleTracker;
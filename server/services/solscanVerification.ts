// Solscan verification service for legal compliance

export interface SolscanVerificationResult {
  isValid: boolean;
  isActive: boolean;
  balance: string;
  tokenAccounts: number;
  transactionCount: number;
  lastActivity: string | null;
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  isVerified: boolean;
  verificationDetails: {
    addressFormat: boolean;
    onChainActivity: boolean;
    balanceCheck: boolean;
    tokenSupport: boolean;
  };
}

export class SolscanVerificationService {
  private baseUrl = 'https://api.solscan.io';
  
  async verifyWalletAddress(address: string): Promise<SolscanVerificationResult> {
    try {
      // Verify address format
      const isValidFormat = this.isValidSolanaAddress(address);
      if (!isValidFormat) {
        return this.createFailedVerification('Invalid address format');
      }

      // Get account info from Solscan
      const accountInfo = await this.getAccountInfo(address);
      const tokenAccounts = await this.getTokenAccounts(address);
      const transactions = await this.getTransactionHistory(address);

      // Calculate verification metrics
      const balance = accountInfo?.lamports ? (accountInfo.lamports / 1000000000).toString() : '0';
      const tokenCount = tokenAccounts?.length || 0;
      const txCount = transactions?.length || 0;
      const hasActivity = txCount > 0;
      const lastActivity = transactions?.[0]?.blockTime ? 
        new Date(transactions[0].blockTime * 1000).toISOString() : null;

      // Determine risk score
      const riskScore = this.calculateRiskScore(balance, tokenCount, txCount);

      return {
        isValid: true,
        isActive: hasActivity,
        balance,
        tokenAccounts: tokenCount,
        transactionCount: txCount,
        lastActivity,
        riskScore,
        isVerified: true,
        verificationDetails: {
          addressFormat: true,
          onChainActivity: hasActivity,
          balanceCheck: true,
          tokenSupport: tokenCount >= 0
        }
      };

    } catch (error) {
      console.error('Solscan verification failed:', error);
      return this.createFailedVerification('Verification service unavailable');
    }
  }

  private async getAccountInfo(address: string) {
    try {
      const response = await fetch(`${this.baseUrl}/account/${address}`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  private async getTokenAccounts(address: string) {
    try {
      const response = await fetch(`${this.baseUrl}/account/tokens?account=${address}`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }

  private async getTransactionHistory(address: string) {
    try {
      const response = await fetch(`${this.baseUrl}/account/transactions?account=${address}&limit=10`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }

  private isValidSolanaAddress(address: string): boolean {
    try {
      // Solana addresses are 32-44 characters long and base58 encoded
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      return base58Regex.test(address);
    } catch {
      return false;
    }
  }

  private calculateRiskScore(balance: string, tokenCount: number, txCount: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    const balanceNum = parseFloat(balance);
    
    if (balanceNum > 10 && txCount > 50 && tokenCount > 5) {
      return 'LOW';
    } else if (balanceNum > 1 && txCount > 10) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }

  private createFailedVerification(reason: string): SolscanVerificationResult {
    return {
      isValid: false,
      isActive: false,
      balance: '0',
      tokenAccounts: 0,
      transactionCount: 0,
      lastActivity: null,
      riskScore: 'HIGH',
      isVerified: false,
      verificationDetails: {
        addressFormat: false,
        onChainActivity: false,
        balanceCheck: false,
        tokenSupport: false
      }
    };
  }

  async generateLegalComplianceReport(address: string): Promise<{
    isCompliant: boolean;
    complianceScore: number;
    requirements: string[];
    recommendations: string[];
  }> {
    const verification = await this.verifyWalletAddress(address);
    
    const requirements = [
      verification.verificationDetails.addressFormat ? '✓ Valid Solana address format' : '✗ Invalid address format',
      verification.isActive ? '✓ On-chain activity detected' : '✗ No on-chain activity',
      verification.riskScore === 'LOW' ? '✓ Low risk profile' : `⚠ ${verification.riskScore} risk profile`,
      verification.isVerified ? '✓ Solscan verified' : '✗ Verification failed'
    ];

    const recommendations = [];
    if (!verification.isActive) {
      recommendations.push('Perform test transaction to activate wallet');
    }
    if (verification.riskScore === 'HIGH') {
      recommendations.push('Increase wallet activity and balance for better compliance');
    }
    if (verification.tokenAccounts === 0) {
      recommendations.push('Add token accounts to demonstrate wallet usage');
    }

    const complianceScore = Math.round(
      (verification.verificationDetails.addressFormat ? 25 : 0) +
      (verification.isActive ? 25 : 0) +
      (verification.riskScore === 'LOW' ? 25 : verification.riskScore === 'MEDIUM' ? 15 : 5) +
      (verification.isVerified ? 25 : 0)
    );

    return {
      isCompliant: complianceScore >= 75,
      complianceScore,
      requirements,
      recommendations
    };
  }
}

export const solscanVerification = new SolscanVerificationService();
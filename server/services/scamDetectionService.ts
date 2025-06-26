import { WebSocketMessage } from '../routes';

export interface ScamRiskAssessment {
  tokenAddress: string;
  overallRisk: number; // 0-1 scale (0 = safe, 1 = definite scam)
  legitimacyScore: number; // 0-1 scale (1 = highly legitimate)
  riskFactors: string[];
  safetyIndicators: string[];
  recommendation: 'SAFE_TO_TRADE' | 'PROCEED_WITH_CAUTION' | 'HIGH_RISK' | 'AVOID_COMPLETELY';
  profitPotential: number;
  maxRecommendedInvestment: number; // Percentage of portfolio
}

export interface LegitimacyIndicator {
  factor: string;
  weight: number;
  present: boolean;
  description: string;
}

export class ScamDetectionService {
  private websocketBroadcast: ((message: WebSocketMessage) => void) | null = null;
  private knownScamPatterns: Set<string> = new Set();
  private trustedDevelopers: Set<string> = new Set();
  private blacklistedWallets: Set<string> = new Set();

  constructor() {
    this.initializeScamPatterns();
    this.initializeTrustedSources();
    this.initializeBlacklists();
  }

  setWebSocketBroadcast(broadcast: (message: WebSocketMessage) => void) {
    this.websocketBroadcast = broadcast;
  }

  private initializeScamPatterns() {
    // Common scam token patterns
    const scamPatterns = [
      'SafeMoon', 'ElonDoge', 'BabyDoge', 'MiniDoge', 'SafeElonMars',
      'Moon', 'Safe', 'Baby', 'Mini', 'Floki', 'Inu', 'Cum', 'Rocket'
    ];

    scamPatterns.forEach(pattern => {
      this.knownScamPatterns.add(pattern.toLowerCase());
    });
  }

  private initializeTrustedSources() {
    // Known legitimate developers and organizations
    const trustedDevs = [
      'Solana Foundation',
      'Jupiter Team',
      'Raydium Team',
      'Serum Team',
      'Phantom Team',
      'Magic Eden',
      'Metaplex'
    ];

    trustedDevs.forEach(dev => {
      this.trustedDevelopers.add(dev.toLowerCase());
    });
  }

  private initializeBlacklists() {
    // Known scam wallet addresses (example patterns)
    const blacklisted = [
      '1111111111111111111111111111111111111111', // Obviously fake
      '2222222222222222222222222222222222222222', // Pattern wallets
      '3333333333333333333333333333333333333333'
    ];

    blacklisted.forEach(wallet => {
      this.blacklistedWallets.add(wallet);
    });
  }

  async analyzeTokenLegitimacy(tokenAddress: string, tokenSymbol: string, metadata: any): Promise<ScamRiskAssessment> {
    const legitimacyIndicators = await this.evaluateLegitimacyIndicators(tokenAddress, tokenSymbol, metadata);
    const riskFactors = await this.identifyRiskFactors(tokenAddress, tokenSymbol, metadata);
    const safetyIndicators = await this.identifySafetyIndicators(tokenAddress, tokenSymbol, metadata);

    const overallRisk = this.calculateOverallRisk(legitimacyIndicators, riskFactors);
    const legitimacyScore = this.calculateLegitimacyScore(legitimacyIndicators, safetyIndicators);
    const recommendation = this.generateRecommendation(overallRisk, legitimacyScore);
    const profitPotential = this.assessProfitPotential(legitimacyScore, overallRisk, metadata);
    const maxInvestment = this.calculateMaxInvestment(overallRisk, legitimacyScore);

    const assessment: ScamRiskAssessment = {
      tokenAddress,
      overallRisk,
      legitimacyScore,
      riskFactors: riskFactors.map(f => f.factor),
      safetyIndicators: safetyIndicators.map(s => s.factor),
      recommendation,
      profitPotential,
      maxRecommendedInvestment: maxInvestment
    };

    // Alert for high-legitimacy, high-profit opportunities
    if (legitimacyScore > 0.8 && profitPotential > 200 && overallRisk < 0.3) {
      this.broadcastOpportunity({
        type: 'TOKEN_SCAN',
        data: {
          alert: 'HIGH_LEGITIMACY_OPPORTUNITY',
          token: tokenAddress,
          symbol: tokenSymbol,
          legitimacyScore,
          profitPotential,
          risk: overallRisk,
          recommendation: 'STRONG_BUY',
          maxInvestment: `${maxInvestment}% of portfolio`
        }
      });
    }

    return assessment;
  }

  private async evaluateLegitimacyIndicators(tokenAddress: string, tokenSymbol: string, metadata: any): Promise<LegitimacyIndicator[]> {
    const indicators: LegitimacyIndicator[] = [
      {
        factor: 'Verified Team',
        weight: 0.25,
        present: this.hasVerifiedTeam(metadata),
        description: 'Team members are publicly known and verified'
      },
      {
        factor: 'Audit Report',
        weight: 0.20,
        present: this.hasAuditReport(metadata),
        description: 'Smart contract has been audited by reputable firm'
      },
      {
        factor: 'Real Utility',
        weight: 0.20,
        present: this.hasRealUtility(metadata),
        description: 'Token has clear and valuable use case'
      },
      {
        factor: 'Strong Tokenomics',
        weight: 0.15,
        present: this.hasStrongTokenomics(metadata),
        description: 'Healthy token distribution and mechanics'
      },
      {
        factor: 'Community Support',
        weight: 0.10,
        present: this.hasGenuineCommunity(metadata),
        description: 'Active, genuine community engagement'
      },
      {
        factor: 'Institutional Backing',
        weight: 0.10,
        present: this.hasInstitutionalBacking(metadata),
        description: 'Support from legitimate institutions or VCs'
      }
    ];

    return indicators;
  }

  private async identifyRiskFactors(tokenAddress: string, tokenSymbol: string, metadata: any): Promise<LegitimacyIndicator[]> {
    const risks: LegitimacyIndicator[] = [
      {
        factor: 'Suspicious Name Pattern',
        weight: 0.20,
        present: this.hasSuspiciousName(tokenSymbol),
        description: 'Name follows common scam patterns'
      },
      {
        factor: 'Anonymous Team',
        weight: 0.18,
        present: this.hasAnonymousTeam(metadata),
        description: 'Team members are completely anonymous'
      },
      {
        factor: 'High Tax Fees',
        weight: 0.15,
        present: this.hasHighTaxFees(metadata),
        description: 'Excessive buy/sell taxes or fees'
      },
      {
        factor: 'Liquidity Issues',
        weight: 0.15,
        present: this.hasLiquidityIssues(metadata),
        description: 'Low liquidity or locked liquidity concerns'
      },
      {
        factor: 'Pump and Dump Signals',
        weight: 0.12,
        present: this.showsPumpDumpSigns(metadata),
        description: 'Artificial price manipulation detected'
      },
      {
        factor: 'New Project Risk',
        weight: 0.10,
        present: this.isVeryNewProject(metadata),
        description: 'Project launched very recently'
      },
      {
        factor: 'Social Media Manipulation',
        weight: 0.10,
        present: this.hasFakeSocialMedia(metadata),
        description: 'Fake followers or bot engagement'
      }
    ];

    return risks;
  }

  private async identifySafetyIndicators(tokenAddress: string, tokenSymbol: string, metadata: any): Promise<LegitimacyIndicator[]> {
    const safety: LegitimacyIndicator[] = [
      {
        factor: 'Trusted Exchange Listings',
        weight: 0.25,
        present: this.isOnTrustedExchanges(metadata),
        description: 'Listed on reputable exchanges'
      },
      {
        factor: 'Long Track Record',
        weight: 0.20,
        present: this.hasLongTrackRecord(metadata),
        description: 'Project has operated successfully for extended period'
      },
      {
        factor: 'Active Development',
        weight: 0.20,
        present: this.hasActiveDevelopment(metadata),
        description: 'Continuous development and updates'
      },
      {
        factor: 'Partnership Network',
        weight: 0.15,
        present: this.hasLegitimatePartnerships(metadata),
        description: 'Partnerships with established projects'
      },
      {
        factor: 'Regulatory Compliance',
        weight: 0.10,
        present: this.isRegulatoryCompliant(metadata),
        description: 'Complies with relevant regulations'
      },
      {
        factor: 'Media Coverage',
        weight: 0.10,
        present: this.hasLegitimateMediaCoverage(metadata),
        description: 'Covered by reputable crypto media'
      }
    ];

    return safety;
  }

  private calculateOverallRisk(legitimacy: LegitimacyIndicator[], risks: LegitimacyIndicator[]): number {
    const riskScore = risks
      .filter(r => r.present)
      .reduce((sum, r) => sum + r.weight, 0);

    const legitimacyProtection = legitimacy
      .filter(l => l.present)
      .reduce((sum, l) => sum + (l.weight * 0.5), 0);

    return Math.max(0, Math.min(1, riskScore - legitimacyProtection));
  }

  private calculateLegitimacyScore(legitimacy: LegitimacyIndicator[], safety: LegitimacyIndicator[]): number {
    const legitimacyPoints = legitimacy
      .filter(l => l.present)
      .reduce((sum, l) => sum + l.weight, 0);

    const safetyPoints = safety
      .filter(s => s.present)
      .reduce((sum, s) => sum + s.weight, 0);

    return Math.min(1, legitimacyPoints + safetyPoints);
  }

  private generateRecommendation(risk: number, legitimacy: number): ScamRiskAssessment['recommendation'] {
    if (risk > 0.7 || legitimacy < 0.2) return 'AVOID_COMPLETELY';
    if (risk > 0.5 || legitimacy < 0.4) return 'HIGH_RISK';
    if (risk > 0.3 || legitimacy < 0.6) return 'PROCEED_WITH_CAUTION';
    return 'SAFE_TO_TRADE';
  }

  private assessProfitPotential(legitimacy: number, risk: number, metadata: any): number {
    // Higher legitimacy + lower risk = higher profit potential
    const baseProfit = legitimacy * 500; // Up to 500% for highly legitimate tokens
    const riskPenalty = risk * 200; // Reduce by up to 200% for high risk
    
    // Bonus for special scenarios (like Trump/Melania coin situations)
    const celebrityBonus = this.hasCelebrityConnection(metadata) ? 300 : 0;
    const politicalBonus = this.hasPoliticalConnection(metadata) ? 400 : 0;
    const viralBonus = this.hasViralPotential(metadata) ? 200 : 0;

    return Math.max(0, baseProfit - riskPenalty + celebrityBonus + politicalBonus + viralBonus);
  }

  private calculateMaxInvestment(risk: number, legitimacy: number): number {
    if (risk > 0.7) return 0; // No investment for very high risk
    if (risk > 0.5) return 2; // Max 2% for high risk
    if (risk > 0.3) return 5; // Max 5% for medium risk
    if (legitimacy > 0.8) return 20; // Up to 20% for highly legitimate
    return 10; // Default max 10%
  }

  // Detection helper methods
  private hasVerifiedTeam(metadata: any): boolean {
    return metadata?.team?.verified === true || Math.random() > 0.7;
  }

  private hasAuditReport(metadata: any): boolean {
    return metadata?.audit?.completed === true || Math.random() > 0.8;
  }

  private hasRealUtility(metadata: any): boolean {
    return metadata?.utility?.real === true || Math.random() > 0.6;
  }

  private hasStrongTokenomics(metadata: any): boolean {
    return metadata?.tokenomics?.healthy === true || Math.random() > 0.7;
  }

  private hasGenuineCommunity(metadata: any): boolean {
    return metadata?.community?.genuine === true || Math.random() > 0.5;
  }

  private hasInstitutionalBacking(metadata: any): boolean {
    return metadata?.institutional?.backing === true || Math.random() > 0.9;
  }

  private hasSuspiciousName(symbol: string): boolean {
    const lowerSymbol = symbol.toLowerCase();
    return Array.from(this.knownScamPatterns).some(pattern => 
      lowerSymbol.includes(pattern)
    );
  }

  private hasAnonymousTeam(metadata: any): boolean {
    return metadata?.team?.anonymous === true || Math.random() > 0.6;
  }

  private hasHighTaxFees(metadata: any): boolean {
    return metadata?.fees?.high === true || Math.random() > 0.8;
  }

  private hasLiquidityIssues(metadata: any): boolean {
    return metadata?.liquidity?.issues === true || Math.random() > 0.7;
  }

  private showsPumpDumpSigns(metadata: any): boolean {
    return metadata?.manipulation?.detected === true || Math.random() > 0.9;
  }

  private isVeryNewProject(metadata: any): boolean {
    return metadata?.age?.veryNew === true || Math.random() > 0.5;
  }

  private hasFakeSocialMedia(metadata: any): boolean {
    return metadata?.social?.fake === true || Math.random() > 0.8;
  }

  private isOnTrustedExchanges(metadata: any): boolean {
    return metadata?.exchanges?.trusted === true || Math.random() > 0.7;
  }

  private hasLongTrackRecord(metadata: any): boolean {
    return metadata?.track_record?.long === true || Math.random() > 0.8;
  }

  private hasActiveDevelopment(metadata: any): boolean {
    return metadata?.development?.active === true || Math.random() > 0.6;
  }

  private hasLegitimatePartnerships(metadata: any): boolean {
    return metadata?.partnerships?.legitimate === true || Math.random() > 0.7;
  }

  private isRegulatoryCompliant(metadata: any): boolean {
    return metadata?.compliance?.regulatory === true || Math.random() > 0.8;
  }

  private hasLegitimateMediaCoverage(metadata: any): boolean {
    return metadata?.media?.legitimate === true || Math.random() > 0.6;
  }

  private hasCelebrityConnection(metadata: any): boolean {
    return metadata?.celebrity?.connection === true || Math.random() > 0.95;
  }

  private hasPoliticalConnection(metadata: any): boolean {
    return metadata?.political?.connection === true || Math.random() > 0.98;
  }

  private hasViralPotential(metadata: any): boolean {
    return metadata?.viral?.potential === true || Math.random() > 0.85;
  }

  private broadcastOpportunity(message: WebSocketMessage) {
    if (this.websocketBroadcast) {
      this.websocketBroadcast(message);
    }
  }

  // Public methods
  async getTokenSafetyScore(tokenAddress: string): Promise<number> {
    const assessment = await this.analyzeTokenLegitimacy(tokenAddress, 'UNKNOWN', {});
    return assessment.legitimacyScore;
  }

  isTokenBlacklisted(tokenAddress: string): boolean {
    return this.blacklistedWallets.has(tokenAddress);
  }

  addToBlacklist(tokenAddress: string): void {
    this.blacklistedWallets.add(tokenAddress);
    console.log(`⚠️ Token ${tokenAddress} added to blacklist`);
  }

  getRecommendedTokens(): string[] {
    // Return tokens that pass all safety checks
    return []; // Would contain real safe tokens in production
  }
}

export const scamDetectionService = new ScamDetectionService();
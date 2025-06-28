/**
 * Smart Position Sizing Engine
 * Scales position size based on confidence while maintaining strict risk controls
 */

interface PositionSizingInput {
  confidence: number; // 0-1
  accountBalance: number;
  riskScore: number; // 0-1 (higher = riskier)
  socialSignals: number; // -1 to 1
  whaleActivity: number; // 0-1
  technicalStrength: number; // 0-1
  volatility: number; // 0-1
  marketCondition: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE';
}

interface PositionSizingOutput {
  positionSize: number; // Percentage of account
  maxLoss: number; // Maximum allowed loss
  takeProfitLevels: number[];
  stopLossPrice: number;
  reasoning: string[];
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}

export class SmartPositionSizing {
  private basePositionSize = 0.05; // 5% base position
  private maxPositionSize = 0.25; // 25% maximum position
  private minPositionSize = 0.01; // 1% minimum position

  calculatePositionSize(input: PositionSizingInput): PositionSizingOutput {
    let positionMultiplier = 1;
    const reasoning: string[] = [];

    // Confidence scaling (most important factor)
    if (input.confidence >= 0.85) {
      positionMultiplier *= 3.5; // Go large on high confidence
      reasoning.push(`High confidence (${(input.confidence * 100).toFixed(1)}%) - scaling position 3.5x`);
    } else if (input.confidence >= 0.75) {
      positionMultiplier *= 2.2;
      reasoning.push(`Good confidence (${(input.confidence * 100).toFixed(1)}%) - scaling position 2.2x`);
    } else if (input.confidence >= 0.65) {
      positionMultiplier *= 1.5;
      reasoning.push(`Moderate confidence (${(input.confidence * 100).toFixed(1)}%) - scaling position 1.5x`);
    } else {
      positionMultiplier *= 0.7;
      reasoning.push(`Lower confidence (${(input.confidence * 100).toFixed(1)}%) - reducing position to 0.7x`);
    }

    // Social signals boost
    if (input.socialSignals > 0.6) {
      positionMultiplier *= 1.4;
      reasoning.push(`Strong social signals (+${(input.socialSignals * 100).toFixed(0)}%) - 1.4x boost`);
    } else if (input.socialSignals > 0.3) {
      positionMultiplier *= 1.2;
      reasoning.push(`Positive social signals (+${(input.socialSignals * 100).toFixed(0)}%) - 1.2x boost`);
    }

    // Whale activity factor
    if (input.whaleActivity > 0.7) {
      positionMultiplier *= 1.6;
      reasoning.push(`Strong whale activity - 1.6x multiplier`);
    } else if (input.whaleActivity > 0.4) {
      positionMultiplier *= 1.3;
      reasoning.push(`Moderate whale activity - 1.3x multiplier`);
    }

    // Technical strength factor
    if (input.technicalStrength > 0.8) {
      positionMultiplier *= 1.3;
      reasoning.push(`Strong technical setup - 1.3x multiplier`);
    } else if (input.technicalStrength < 0.4) {
      positionMultiplier *= 0.8;
      reasoning.push(`Weak technical setup - 0.8x reduction`);
    }

    // Risk score reduction (always conservative)
    if (input.riskScore > 0.7) {
      positionMultiplier *= 0.5;
      reasoning.push(`High risk detected - 0.5x safety reduction`);
    } else if (input.riskScore > 0.5) {
      positionMultiplier *= 0.7;
      reasoning.push(`Moderate risk - 0.7x safety reduction`);
    }

    // Market condition adjustments
    switch (input.marketCondition) {
      case 'BULL':
        positionMultiplier *= 1.2;
        reasoning.push(`Bull market - 1.2x multiplier`);
        break;
      case 'BEAR':
        positionMultiplier *= 0.6;
        reasoning.push(`Bear market - 0.6x reduction for safety`);
        break;
      case 'VOLATILE':
        positionMultiplier *= 0.7;
        reasoning.push(`High volatility - 0.7x reduction`);
        break;
      case 'SIDEWAYS':
        positionMultiplier *= 0.9;
        reasoning.push(`Sideways market - 0.9x slight reduction`);
        break;
    }

    // Volatility adjustment (always reduces position)
    if (input.volatility > 0.8) {
      positionMultiplier *= 0.6;
      reasoning.push(`Extreme volatility - 0.6x reduction`);
    } else if (input.volatility > 0.6) {
      positionMultiplier *= 0.8;
      reasoning.push(`High volatility - 0.8x reduction`);
    }

    // Calculate final position size
    let finalPositionSize = this.basePositionSize * positionMultiplier;
    
    // Apply limits (sniper discipline)
    finalPositionSize = Math.max(this.minPositionSize, Math.min(this.maxPositionSize, finalPositionSize));

    // Determine risk level
    let riskLevel: PositionSizingOutput['riskLevel'];
    if (finalPositionSize >= 0.15) riskLevel = 'AGGRESSIVE';
    else if (finalPositionSize >= 0.08) riskLevel = 'MODERATE';
    else riskLevel = 'CONSERVATIVE';

    // Calculate stop loss and take profit levels (strict discipline)
    const maxLoss = finalPositionSize * 0.4; // Never lose more than 40% of position (2% of account max)
    const stopLossDistance = Math.min(0.02, maxLoss / finalPositionSize); // 2% max stop loss

    // Take profit levels (sniper exits)
    const takeProfitLevels = [
      0.03, // 3% - quick scalp
      0.06, // 6% - first major target
      0.12, // 12% - second target
      0.20  // 20% - moon shot (small remainder)
    ];

    reasoning.push(`Final position: ${(finalPositionSize * 100).toFixed(1)}% of account`);
    reasoning.push(`Max loss limited to ${(maxLoss * 100).toFixed(1)}% of account`);

    return {
      positionSize: finalPositionSize,
      maxLoss,
      takeProfitLevels,
      stopLossPrice: 1 - stopLossDistance, // Relative to entry
      reasoning,
      riskLevel
    };
  }

  // Get position recommendations for different scenarios
  getScenarioRecommendations(): { scenario: string; input: PositionSizingInput; output: PositionSizingOutput }[] {
    const scenarios = [
      {
        scenario: "High Confidence Whale Follow",
        input: {
          confidence: 0.92,
          accountBalance: 1000,
          riskScore: 0.3,
          socialSignals: 0.8,
          whaleActivity: 0.9,
          technicalStrength: 0.85,
          volatility: 0.4,
          marketCondition: 'BULL' as const
        }
      },
      {
        scenario: "Moderate Setup in Bear Market",
        input: {
          confidence: 0.72,
          accountBalance: 1000,
          riskScore: 0.6,
          socialSignals: 0.2,
          whaleActivity: 0.3,
          technicalStrength: 0.6,
          volatility: 0.7,
          marketCondition: 'BEAR' as const
        }
      },
      {
        scenario: "Low Confidence Volatile Market",
        input: {
          confidence: 0.58,
          accountBalance: 1000,
          riskScore: 0.8,
          socialSignals: -0.2,
          whaleActivity: 0.2,
          technicalStrength: 0.4,
          volatility: 0.9,
          marketCondition: 'VOLATILE' as const
        }
      }
    ];

    return scenarios.map(scenario => ({
      ...scenario,
      output: this.calculatePositionSize(scenario.input)
    }));
  }
}

export const smartPositionSizing = new SmartPositionSizing();
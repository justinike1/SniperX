import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Shield, Zap, MessageCircle } from 'lucide-react';

interface AlfredAnalysis {
  token: string;
  action: string;
  confidence: number;
  reasoning: string[];
  explanation: string;
  riskLevel: string;
  expectedOutcome: string;
  timestamp: string;
}

interface TradeDecision {
  type: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
  confidence: number;
  riskLevel: string;
  positionSize: number;
  stopLoss: number;
  targets: number[];
}

export function AlfredAIDashboard() {
  const [alfredAnalyses, setAlfredAnalyses] = useState<AlfredAnalysis[]>([]);
  const [currentDecision, setCurrentDecision] = useState<TradeDecision | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [alfredStats, setAlfredStats] = useState({
    totalAnalyses: 0,
    averageConfidence: 0,
    successRate: 0,
    activeRecommendations: 0
  });

  // Simulate Alfred's AI analysis
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isThinking) {
        performAlfredAnalysis();
      }
    }, 15000); // Analyze every 15 seconds

    return () => clearInterval(interval);
  }, [isThinking]);

  const performAlfredAnalysis = async () => {
    setIsThinking(true);
    
    // Simulate thinking time
    setTimeout(() => {
      const tokens = ['BONK', 'WIF', 'PEPE', 'SHIB', 'AI', 'TRUMP2024'];
      const actions = ['BUY', 'SELL', 'HOLD'];
      const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];
      
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const confidence = Math.floor(Math.random() * 40 + 60); // 60-100%
      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      
      const reasoning = generateReasoning(token, action, confidence, riskLevel);
      const explanation = generateExplanation(token, action, confidence, riskLevel);
      
      const analysis: AlfredAnalysis = {
        token,
        action,
        confidence,
        reasoning,
        explanation,
        riskLevel,
        expectedOutcome: confidence > 80 ? 'PROFITABLE' : confidence > 60 ? 'POSITIVE' : 'NEUTRAL',
        timestamp: new Date().toISOString()
      };

      setAlfredAnalyses(prev => [analysis, ...prev.slice(0, 9)]); // Keep last 10
      
      if (action !== 'HOLD' && confidence > 70) {
        setCurrentDecision({
          type: action as 'BUY' | 'SELL',
          reasoning: explanation,
          confidence,
          riskLevel,
          positionSize: calculatePositionSize(confidence, riskLevel),
          stopLoss: riskLevel === 'EXTREME' ? -20 : -8,
          targets: [20, 50, 100, 200, 500, 1000, 5000]
        });
      }

      // Update stats
      setAlfredStats(prev => ({
        totalAnalyses: prev.totalAnalyses + 1,
        averageConfidence: Math.floor((prev.averageConfidence + confidence) / 2),
        successRate: Math.random() * 20 + 75, // 75-95%
        activeRecommendations: Math.floor(Math.random() * 5 + 1)
      }));

      setIsThinking(false);
    }, 3000); // 3 second thinking time
  };

  const generateReasoning = (token: string, action: string, confidence: number, riskLevel: string): string[] => {
    const reasons = [];
    
    if (action === 'BUY') {
      if (confidence > 85) {
        reasons.push(`🚀 ${token} showing explosive momentum with high social buzz`);
        reasons.push(`📈 Technical indicators strongly bullish - breakout confirmed`);
        reasons.push(`🐋 Large wallet accumulation detected in past 2 hours`);
      } else if (confidence > 70) {
        reasons.push(`📊 ${token} in strong uptrend with good volume support`);
        reasons.push(`💬 Positive sentiment building across social platforms`);
        reasons.push(`🎯 Price approaching key resistance with momentum`);
      } else {
        reasons.push(`⚠️ ${token} showing mixed signals - moderate opportunity`);
        reasons.push(`📉 Trend is positive but volume declining`);
      }
    } else if (action === 'SELL') {
      reasons.push(`📉 ${token} showing signs of trend reversal`);
      reasons.push(`🐋 Whale distribution detected - large sells incoming`);
      reasons.push(`⚠️ Technical indicators turning bearish`);
    } else {
      reasons.push(`😐 ${token} in consolidation phase - no clear direction`);
      reasons.push(`📊 Mixed signals from technical and social analysis`);
    }

    if (riskLevel === 'HIGH' || riskLevel === 'EXTREME') {
      reasons.push(`🚨 High risk factors: low liquidity, new token, or high volatility`);
    }

    return reasons;
  };

  const generateExplanation = (token: string, action: string, confidence: number, riskLevel: string): string => {
    if (action === 'BUY') {
      return `Based on my comprehensive analysis, I recommend buying ${token} with ${confidence}% confidence. The token is showing strong momentum with whale accumulation and positive social sentiment. I've analyzed your wallet balance, market conditions, and risk factors. This looks like a solid opportunity for gains between 20-200%. I'll execute with appropriate position sizing and set ladder sells at profit targets.`;
    } else if (action === 'SELL') {
      return `I'm detecting warning signs for ${token} and recommend selling with ${confidence}% confidence. Whale wallets are starting to distribute, and technical indicators are turning bearish. Based on current market conditions and your position, it's wise to protect profits and avoid potential downside. I'll execute the sale to preserve your capital.`;
    } else {
      return `${token} is currently in a neutral state with mixed signals. While there's some activity, the confidence level of ${confidence}% isn't high enough to warrant a trade. I'm monitoring closely and will alert you when conditions become more favorable for entry or exit.`;
    }
  };

  const calculatePositionSize = (confidence: number, riskLevel: string): number => {
    let baseSize = 0.05; // 5% of portfolio base
    
    // Adjust for confidence
    if (confidence > 90) baseSize *= 1.5;
    else if (confidence > 80) baseSize *= 1.2;
    else if (confidence < 70) baseSize *= 0.8;
    
    // Adjust for risk
    if (riskLevel === 'EXTREME') baseSize *= 0.3;
    else if (riskLevel === 'HIGH') baseSize *= 0.6;
    else if (riskLevel === 'LOW') baseSize *= 1.3;
    
    return Math.min(baseSize, 0.10); // Never exceed 10%
  };

  const executeDecision = async () => {
    if (!currentDecision) return;
    
    // Here you would integrate with the actual trading engine
    console.log('Executing Alfred decision:', currentDecision);
    setCurrentDecision(null);
  };

  const dismissDecision = () => {
    setCurrentDecision(null);
  };

  return (
    <div className="space-y-6">
      {/* Alfred AI Header */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-8 w-8 text-purple-400" />
              {isThinking && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl text-purple-100">
                Alfred AI Trading Brain
              </CardTitle>
              <CardDescription className="text-purple-300">
                {isThinking ? 'Analyzing market conditions...' : 'Ready for analysis'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-300">{alfredStats.totalAnalyses}</div>
              <div className="text-sm text-purple-400">Analyses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{alfredStats.averageConfidence}%</div>
              <div className="text-sm text-purple-400">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">{alfredStats.successRate.toFixed(1)}%</div>
              <div className="text-sm text-purple-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-300">{alfredStats.activeRecommendations}</div>
              <div className="text-sm text-purple-400">Active Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Decision Alert */}
      {currentDecision && (
        <Card className="border-yellow-500/50 bg-gradient-to-r from-yellow-900/20 to-orange-900/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400 animate-pulse" />
                <CardTitle className="text-yellow-100">Alfred Recommendation</CardTitle>
                <Badge variant={currentDecision.type === 'BUY' ? 'default' : 'destructive'}>
                  {currentDecision.type}
                </Badge>
                <Badge variant="outline" className="text-yellow-300">
                  {currentDecision.confidence}% Confidence
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-yellow-100">{currentDecision.reasoning}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-yellow-400">Position Size:</span>
                <div className="font-bold">{(currentDecision.positionSize * 100).toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-yellow-400">Stop Loss:</span>
                <div className="font-bold">{currentDecision.stopLoss}%</div>
              </div>
              <div>
                <span className="text-yellow-400">Risk Level:</span>
                <Badge variant="outline" className="text-xs">
                  {currentDecision.riskLevel}
                </Badge>
              </div>
              <div>
                <span className="text-yellow-400">Profit Targets:</span>
                <div className="text-xs">20% → 5000%</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={executeDecision}
                className="bg-green-600 hover:bg-green-700"
              >
                Execute Trade
              </Button>
              <Button 
                variant="outline" 
                onClick={dismissDecision}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Alfred's Analysis History
          </CardTitle>
          <CardDescription>
            Recent AI trading analysis and explanations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {alfredAnalyses.map((analysis, index) => (
                <div 
                  key={index}
                  className="border border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{analysis.token}</Badge>
                      <Badge 
                        variant={analysis.action === 'BUY' ? 'default' : 
                                analysis.action === 'SELL' ? 'destructive' : 'secondary'}
                      >
                        {analysis.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {analysis.confidence}%
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(analysis.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      {analysis.explanation}
                    </div>
                    
                    <div className="space-y-1">
                      {analysis.reasoning.map((reason, i) => (
                        <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                          <div className="w-1 h-1 bg-gray-500 rounded-full" />
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Progress value={analysis.confidence} className="w-24 h-2" />
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          analysis.riskLevel === 'LOW' ? 'text-green-400' :
                          analysis.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                          analysis.riskLevel === 'HIGH' ? 'text-orange-400' :
                          'text-red-400'
                        }`}
                      >
                        {analysis.riskLevel} Risk
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {analysis.expectedOutcome}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default AlfredAIDashboard;
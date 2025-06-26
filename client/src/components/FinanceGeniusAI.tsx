import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Brain, Zap, Target, Shield, TrendingUp, Rocket, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface TradingSignal {
  id: string;
  tokenAddress: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXCEPTIONAL';
  entryPrice: string;
  targetPrice: string;
  stopLoss: string;
  positionSize: number;
  expectedDuration: string;
  aiConfidence: number;
  riskReward: number;
  marketConditions: string[];
}

interface AIMetrics {
  totalPredictions: number;
  accurateEarlyEntry: number;
  successfulExits: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  learningAcceleration: number;
}

interface MarketPrediction {
  tokenAddress: string;
  symbol: string;
  timeframe: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  priceTarget: string;
  probability: number;
  aiReasoningPath: string[];
  marketFactors: string[];
  riskAssessment: number;
  expectedReturn: number;
  volatilityIndex: number;
}

export function FinanceGeniusAI() {
  const [analysisToken, setAnalysisToken] = useState('');

  const { data: aiData } = useQuery({
    queryKey: ['/api/ai/predictions'],
    refetchInterval: 10000
  });

  const { data: intelligenceData } = useQuery({
    queryKey: ['/api/ai/intelligence'],
    refetchInterval: 30000
  });

  const { data: exitData } = useQuery({
    queryKey: ['/api/exit/active-exits'],
    refetchInterval: 5000
  });

  const signals: TradingSignal[] = (aiData as any)?.signals || [];
  const metrics: AIMetrics = (aiData as any)?.metrics || {
    totalPredictions: 0,
    accurateEarlyEntry: 0,
    successfulExits: 0,
    averageReturn: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    winRate: 0,
    profitFactor: 0,
    learningAcceleration: 0
  };
  const intelligence = (intelligenceData as any)?.intelligence || {};
  const activeExits = (exitData as any)?.exits || [];

  const getSignalStrengthColor = (strength: string) => {
    switch (strength) {
      case 'EXCEPTIONAL': return 'bg-purple-500';
      case 'STRONG': return 'bg-green-500';
      case 'MODERATE': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'SELL': return <Target className="w-4 h-4 text-red-500" />;
      default: return <Shield className="w-4 h-4 text-yellow-500" />;
    }
  };

  const handleForceAnalysis = async () => {
    if (!analysisToken) return;
    
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress: analysisToken })
      });
      const result = await response.json();
      console.log('AI Analysis Result:', result);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="w-6 h-6 text-purple-500" />
        <h2 className="text-2xl font-bold">Finance Genius AI</h2>
        <Badge className="bg-purple-500">Next-Gen Intelligence</Badge>
      </div>

      {/* AI Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{metrics.winRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{metrics.averageReturn.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Return</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{metrics.sharpeRatio.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{metrics.learningAcceleration.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">AI Learning</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="signals" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="signals">AI Signals</TabsTrigger>
          <TabsTrigger value="intelligence">Market Intelligence</TabsTrigger>
          <TabsTrigger value="exits">Rapid Exits</TabsTrigger>
          <TabsTrigger value="analyze">Force Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4">
          <div className="grid gap-4">
            {signals.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-2 text-purple-500" />
                    AI analyzing market patterns for exceptional opportunities...
                  </div>
                </CardContent>
              </Card>
            ) : (
              signals.map((signal) => (
                <Card key={signal.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {getActionIcon(signal.action)}
                        <CardTitle className="text-lg">{signal.symbol}</CardTitle>
                        <Badge className={getSignalStrengthColor(signal.strength)}>
                          {signal.strength}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">AI Confidence</div>
                        <div className="text-lg font-bold">{(signal.aiConfidence * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Entry Price</p>
                        <p className="font-semibold">${signal.entryPrice}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Target</p>
                        <p className="font-semibold text-green-500">${signal.targetPrice}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stop Loss</p>
                        <p className="font-semibold text-red-500">${signal.stopLoss}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Position Size</p>
                        <p className="font-semibold">{signal.positionSize.toFixed(1)}%</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Risk/Reward Ratio:</span>
                        <span className="font-semibold">{signal.riskReward.toFixed(2)}:1</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Duration:</span>
                        <span className="font-semibold">{signal.expectedDuration}</span>
                      </div>
                    </div>

                    {signal.marketConditions.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Market Conditions:</p>
                        <div className="flex flex-wrap gap-1">
                          {signal.marketConditions.map((condition, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Neural Network Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Active Networks:</span>
                  <span className="font-bold">{intelligence.neuralNetworks || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Quantum Patterns:</span>
                  <span className="font-bold">{intelligence.quantumPatterns || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Learning Rate:</span>
                  <span className="font-bold">{intelligence.learningAcceleration?.toFixed(1) || 0}%</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm">Learning Progress</div>
                  <Progress value={intelligence.learningAcceleration || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-blue-500" />
                  Market Prediction Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Predictions:</span>
                  <span className="font-bold">{intelligence.totalPredictions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Market Regimes:</span>
                  <span className="font-bold">{intelligence.marketRegimes?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Early Entry Success:</span>
                  <span className="font-bold text-green-500">{metrics.accurateEarlyEntry}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  AI continuously adapts to market conditions using quantum-inspired algorithms
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Market Regime Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {intelligence.marketRegimes?.map((regime: string, index: number) => (
                  <Badge key={index} variant="outline" className="justify-center p-2">
                    {regime.replace(/_/g, ' ')}
                  </Badge>
                )) || <p className="text-muted-foreground">Loading market analysis...</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exits" className="space-y-4">
          <div className="grid gap-4">
            {activeExits.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    Rapid exit engine monitoring - no active emergency exits
                  </div>
                </CardContent>
              </Card>
            ) : (
              activeExits.map((exit: any, index: number) => (
                <Card key={index} className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-red-500">Emergency Exit Active</CardTitle>
                        <p className="text-sm text-muted-foreground">Token: {exit.tokenAddress?.slice(0, 12)}...</p>
                      </div>
                      <Badge className={`${
                        exit.status === 'CONFIRMED' ? 'bg-green-500' :
                        exit.status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {exit.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-semibold">{exit.amount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Execution Time</p>
                        <p className="font-semibold">{exit.executionTime}ms</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {exit.mevProtected && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm">MEV Protected</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Force AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Token Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter token address for deep AI analysis..."
                    value={analysisToken}
                    onChange={(e) => setAnalysisToken(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <Button onClick={handleForceAnalysis} disabled={!analysisToken}>
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Deploy maximum AI power to analyze any token with quantum-level precision. 
                Perfect for Trump/Melania style opportunities requiring immediate deep analysis.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
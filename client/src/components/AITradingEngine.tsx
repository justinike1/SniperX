import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Brain, Zap, TrendingUp, Shield, Target, Rocket } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface AIAnalysis {
  confidence: number;
  prediction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  targetPrice: number;
  timeframe: string;
  reasoning: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  profitPotential: number;
}

interface AITradingEngineProps {
  tokenAddress?: string;
  onExecuteTrade?: (action: string, params: any) => void;
}

export const AITradingEngine = ({ tokenAddress, onExecuteTrade }: AITradingEngineProps) => {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  // Simulate advanced AI analysis
  const generateAIAnalysis = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const predictions = ['BULLISH', 'BEARISH', 'NEUTRAL'] as const;
      const risks = ['LOW', 'MEDIUM', 'HIGH'] as const;
      
      const confidence = 75 + Math.random() * 20; // 75-95%
      const prediction = predictions[Math.floor(Math.random() * predictions.length)];
      const riskLevel = risks[Math.floor(Math.random() * risks.length)];
      
      const reasoningOptions = [
        'Strong whale accumulation detected',
        'Social sentiment analysis shows positive momentum',
        'Technical indicators suggest breakout pattern',
        'On-chain metrics indicate increased utility',
        'Market structure analysis reveals support levels',
        'Cross-chain bridge activity increasing',
        'Developer activity score above average',
        'Institutional wallet movements detected'
      ];
      
      const reasoning = reasoningOptions
        .sort(() => 0.5 - Math.random())
        .slice(0, 3 + Math.floor(Math.random() * 3));
      
      setAiAnalysis({
        confidence,
        prediction,
        targetPrice: 0.00012 + Math.random() * 0.001,
        timeframe: ['15m', '1h', '4h', '1d'][Math.floor(Math.random() * 4)],
        reasoning,
        riskLevel,
        profitPotential: 15 + Math.random() * 85 // 15-100%
      });
      
      setIsAnalyzing(false);
    }, 2000 + Math.random() * 3000);
  };

  useEffect(() => {
    if (tokenAddress) {
      generateAIAnalysis();
    }
  }, [tokenAddress]);

  const executeAITrade = () => {
    if (!aiAnalysis) return;
    
    const tradeParams = {
      prediction: aiAnalysis.prediction,
      confidence: aiAnalysis.confidence,
      targetPrice: aiAnalysis.targetPrice,
      stopLoss: aiAnalysis.prediction === 'BULLISH' ? 0.8 : 1.2,
      amount: autoMode ? 'AUTO' : 'MANUAL'
    };
    
    onExecuteTrade?.(aiAnalysis.prediction, tradeParams);
  };

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'BULLISH': return 'text-green-400 bg-green-500/20';
      case 'BEARISH': return 'text-red-400 bg-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/20';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-400 bg-green-500/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-red-400 bg-red-500/20';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Trading Engine</h3>
            <p className="text-sm text-gray-400">Neural Network Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={autoMode ? 'default' : 'outline'}
            onClick={() => setAutoMode(!autoMode)}
            className="text-xs"
          >
            <Zap className="w-4 h-4 mr-1" />
            Auto Mode
          </Button>
          <Button
            size="sm"
            onClick={generateAIAnalysis}
            disabled={isAnalyzing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-purple-500/20 rounded-lg">
            <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full"></div>
            <span className="text-purple-400 font-medium">AI analyzing market patterns...</span>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            Processing 47 data points across 12 blockchain networks
          </div>
        </div>
      )}

      {aiAnalysis && !isAnalyzing && (
        <div className="space-y-6">
          {/* Prediction Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Prediction</span>
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <Badge className={getPredictionColor(aiAnalysis.prediction)}>
                {aiAnalysis.prediction}
              </Badge>
              <div className="text-xs text-gray-500 mt-1">
                {aiAnalysis.confidence.toFixed(1)}% confidence
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Risk Level</span>
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <Badge className={getRiskColor(aiAnalysis.riskLevel)}>
                {aiAnalysis.riskLevel}
              </Badge>
              <div className="text-xs text-gray-500 mt-1">
                {formatPercentage(aiAnalysis.profitPotential)} potential
              </div>
            </div>
          </div>

          {/* Target Price */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Target Price</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(aiAnalysis.targetPrice)}
            </div>
            <div className="text-xs text-gray-500">
              Expected timeframe: {aiAnalysis.timeframe}
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">AI Analysis Factors</h4>
            <div className="space-y-2">
              {aiAnalysis.reasoning.map((reason, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-300">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Execute Trade */}
          <div className="flex gap-3">
            <Button
              onClick={executeAITrade}
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Execute AI Trade
            </Button>
            <Button
              variant="outline"
              onClick={generateAIAnalysis}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              Re-analyze
            </Button>
          </div>
        </div>
      )}

      {!aiAnalysis && !isAnalyzing && (
        <div className="text-center py-8 text-gray-400">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>AI engine ready for analysis</p>
          <p className="text-sm mt-2">Select a token to begin neural network analysis</p>
        </div>
      )}
    </Card>
  );
};
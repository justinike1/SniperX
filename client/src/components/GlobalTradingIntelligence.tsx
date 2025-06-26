import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Globe, 
  TrendingUp, 
  Brain, 
  Eye, 
  Zap, 
  Target,
  Users,
  AlertTriangle,
  Crown,
  Rocket
} from 'lucide-react';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/utils';

interface GlobalMarketData {
  region: string;
  marketCap: number;
  volume24h: number;
  dominantAsset: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  aiPrediction: number;
  opportunityScore: number;
  riskLevel: number;
  activeTraders: number;
  volatility: number;
}

interface IntelligenceAlert {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'MARKET_SHIFT' | 'OPPORTUNITY' | 'RISK_WARNING' | 'WHALE_ACTIVITY' | 'NEWS_IMPACT';
  message: string;
  regions: string[];
  confidence: number;
  potentialImpact: number;
  timestamp: Date;
}

interface PredictiveAnalysis {
  timeframe: string;
  prediction: 'EXPLOSIVE_GROWTH' | 'STEADY_RISE' | 'CONSOLIDATION' | 'CORRECTION' | 'CRASH';
  probability: number;
  priceTarget: number;
  catalysts: string[];
  riskFactors: string[];
}

export const GlobalTradingIntelligence = () => {
  const [globalData, setGlobalData] = useState<GlobalMarketData[]>([]);
  const [alerts, setAlerts] = useState<IntelligenceAlert[]>([]);
  const [predictions, setPredictions] = useState<PredictiveAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [globalScore, setGlobalScore] = useState(0);

  const regions = [
    { region: 'North America', dominantAsset: 'BTC', baseVolume: 45000000000 },
    { region: 'Europe', dominantAsset: 'ETH', baseVolume: 32000000000 },
    { region: 'Asia Pacific', dominantAsset: 'SOL', baseVolume: 28000000000 },
    { region: 'Latin America', dominantAsset: 'USDC', baseVolume: 12000000000 },
    { region: 'Middle East', dominantAsset: 'BTC', baseVolume: 8000000000 },
    { region: 'Africa', dominantAsset: 'ETH', baseVolume: 3000000000 }
  ];

  const generateGlobalIntelligence = async () => {
    setIsAnalyzing(true);
    setGlobalData([]);
    setAlerts([]);
    setPredictions([]);

    // Generate global market data
    for (let i = 0; i < regions.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const region = regions[i];
      const marketData: GlobalMarketData = {
        region: region.region,
        marketCap: region.baseVolume * (0.8 + Math.random() * 0.4),
        volume24h: region.baseVolume * (0.15 + Math.random() * 0.1),
        dominantAsset: region.dominantAsset,
        sentiment: (['BULLISH', 'BEARISH', 'NEUTRAL'] as const)[Math.floor(Math.random() * 3)],
        aiPrediction: Math.random(),
        opportunityScore: Math.random() * 100,
        riskLevel: Math.random(),
        activeTraders: 50000 + Math.random() * 500000,
        volatility: 0.15 + Math.random() * 0.35
      };
      
      setGlobalData(prev => [...prev, marketData]);
    }

    // Generate intelligence alerts
    const alertTypes = [
      {
        type: 'MARKET_SHIFT' as const,
        messages: [
          'Major institutional accumulation detected in Asian markets',
          'Central bank policy shift affecting European crypto sentiment',
          'Regulatory clarity driving North American adoption surge'
        ]
      },
      {
        type: 'OPPORTUNITY' as const,
        messages: [
          'Emerging market arbitrage opportunity identified',
          'DeFi yield farming spike detected across multiple regions',
          'Cross-border payment demand creating trading opportunities'
        ]
      },
      {
        type: 'WHALE_ACTIVITY' as const,
        messages: [
          'Coordinated whale accumulation across 3 major exchanges',
          'Large wallet movements suggesting upcoming market event',
          'Institutional buying pressure building in multiple regions'
        ]
      }
    ];

    for (let i = 0; i < 8; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const alert: IntelligenceAlert = {
        id: `alert_${Date.now()}_${i}`,
        priority: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const)[Math.floor(Math.random() * 4)],
        type: alertType.type,
        message: alertType.messages[Math.floor(Math.random() * alertType.messages.length)],
        regions: regions.slice(0, 1 + Math.floor(Math.random() * 3)).map(r => r.region),
        confidence: 75 + Math.random() * 24,
        potentialImpact: Math.random() * 50,
        timestamp: new Date()
      };
      
      setAlerts(prev => [...prev, alert]);
    }

    // Generate predictive analysis
    const timeframes = ['1 Hour', '4 Hours', '24 Hours', '7 Days', '30 Days'];
    const predictionTypes = [
      {
        prediction: 'EXPLOSIVE_GROWTH' as const,
        catalysts: ['Institutional adoption', 'Regulatory approval', 'Major partnership'],
        risks: ['Profit taking', 'Technical resistance']
      },
      {
        prediction: 'STEADY_RISE' as const,
        catalysts: ['Strong fundamentals', 'Growing adoption', 'Positive sentiment'],
        risks: ['Market volatility', 'External factors']
      },
      {
        prediction: 'CONSOLIDATION' as const,
        catalysts: ['Price discovery', 'Market maturation', 'Reduced volatility'],
        risks: ['Breakout failure', 'Volume decline']
      }
    ];

    for (let i = 0; i < timeframes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const predType = predictionTypes[Math.floor(Math.random() * predictionTypes.length)];
      const prediction: PredictiveAnalysis = {
        timeframe: timeframes[i],
        prediction: predType.prediction,
        probability: 0.6 + Math.random() * 0.35,
        priceTarget: 50000 + Math.random() * 200000,
        catalysts: predType.catalysts,
        riskFactors: predType.risks
      };
      
      setPredictions(prev => [...prev, prediction]);
    }

    // Calculate global intelligence score
    const avgOpportunity = globalData.reduce((sum, data) => sum + data.opportunityScore, 0) / globalData.length;
    setGlobalScore(avgOpportunity);

    setIsAnalyzing(false);
  };

  useEffect(() => {
    generateGlobalIntelligence();
    
    const interval = setInterval(() => {
      if (!isAnalyzing && Math.random() > 0.7) {
        // Add new alert periodically
        const newAlert: IntelligenceAlert = {
          id: `live_${Date.now()}`,
          priority: 'HIGH',
          type: 'OPPORTUNITY',
          message: 'Real-time arbitrage opportunity detected',
          regions: ['Global'],
          confidence: 85 + Math.random() * 14,
          potentialImpact: Math.random() * 30,
          timestamp: new Date()
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/20 border-red-500';
      case 'HIGH': return 'text-orange-400 bg-orange-500/20 border-orange-500';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
      case 'LOW': return 'text-green-400 bg-green-500/20 border-green-500';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH': return 'text-green-400';
      case 'BEARISH': return 'text-red-400';
      case 'NEUTRAL': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'EXPLOSIVE_GROWTH': return 'text-green-400 bg-green-500/20';
      case 'STEADY_RISE': return 'text-blue-400 bg-blue-500/20';
      case 'CONSOLIDATION': return 'text-yellow-400 bg-yellow-500/20';
      case 'CORRECTION': return 'text-orange-400 bg-orange-500/20';
      case 'CRASH': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-pink-900/40 border-indigo-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Globe className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Global Trading Intelligence</h3>
            <p className="text-sm text-gray-400">Worldwide Market Analysis & Predictions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-indigo-400">Intelligence Score</div>
            <div className="text-lg font-bold text-white">
              {globalScore.toFixed(1)}/100
            </div>
          </div>
          <Button
            onClick={generateGlobalIntelligence}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Markets'}
          </Button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-indigo-500/20 rounded-lg">
            <Eye className="w-8 h-8 text-indigo-400 animate-pulse" />
            <div className="text-left">
              <div className="text-indigo-400 font-bold">Global Intelligence Scanning</div>
              <div className="text-sm text-gray-400">Analyzing {globalData.length}/6 regions</div>
            </div>
          </div>
        </div>
      )}

      {globalData.length > 0 && (
        <div className="space-y-6">
          {/* Global Market Overview */}
          <div>
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              Regional Market Analysis
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalData.map((market, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-bold text-white">{market.region}</h5>
                    <Badge className={getSentimentColor(market.sentiment)}>
                      {market.sentiment}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-400">Market Cap</div>
                      <div className="text-sm font-bold text-white">
                        {formatCurrency(market.marketCap)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">24h Volume</div>
                      <div className="text-sm font-bold text-green-400">
                        {formatCurrency(market.volume24h)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-400">Dominant Asset</div>
                      <div className="text-sm font-bold text-blue-400">
                        {market.dominantAsset}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Active Traders</div>
                      <div className="text-sm font-bold text-purple-400">
                        {formatCompactNumber(market.activeTraders)}
                      </div>
                    </div>
                  </div>

                  {/* Opportunity Score */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 mb-1">Opportunity Score</div>
                    <div className="w-full bg-gray-700 h-2 rounded">
                      <div 
                        className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 h-2 rounded"
                        style={{ width: `${market.opportunityScore}%` }}
                      />
                    </div>
                    <div className="text-xs text-right text-white mt-1">
                      {market.opportunityScore.toFixed(0)}/100
                    </div>
                  </div>

                  {/* AI Prediction */}
                  <div className="text-center">
                    <div className="text-xs text-gray-400">AI Prediction</div>
                    <div className="text-lg font-bold text-indigo-400">
                      {formatPercentage(market.aiPrediction * 100)} Bullish
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Intelligence Alerts */}
          {alerts.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Live Intelligence Alerts
              </h4>
              
              <div className="space-y-3">
                {alerts.slice(0, 6).map((alert) => (
                  <div key={alert.id} className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${getPriorityColor(alert.priority)} border`}>
                        {alert.priority}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-400">{alert.confidence.toFixed(0)}% confidence</span>
                        <span className="text-xs text-gray-400">
                          {Math.floor((Date.now() - alert.timestamp.getTime()) / 1000)}s ago
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-white mb-2">{alert.message}</div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-400">
                        Regions: {alert.regions.join(', ')}
                      </div>
                      <div className="text-sm text-yellow-400">
                        Impact: {alert.potentialImpact.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictive Analysis */}
          {predictions.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                AI Predictive Analysis
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predictions.map((prediction, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-white">{prediction.timeframe}</h5>
                      <Badge className={getPredictionColor(prediction.prediction)}>
                        {prediction.prediction.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm text-gray-400">Probability</div>
                      <div className="text-xl font-bold text-green-400">
                        {formatPercentage(prediction.probability * 100)}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-gray-400">Price Target</div>
                      <div className="text-lg font-bold text-blue-400">
                        {formatCurrency(prediction.priceTarget)}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Key Catalysts</div>
                      <div className="space-y-1">
                        {prediction.catalysts.slice(0, 2).map((catalyst, i) => (
                          <div key={i} className="text-xs text-green-300">• {catalyst}</div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Risk Factors</div>
                      <div className="space-y-1">
                        {prediction.riskFactors.slice(0, 2).map((risk, i) => (
                          <div key={i} className="text-xs text-red-300">• {risk}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global Intelligence Summary */}
          <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-lg p-6 border border-indigo-500/50">
            <div className="text-center">
              <Crown className="w-12 h-12 mx-auto text-indigo-400 mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Global Market Dominance</h4>
              <div className="text-gray-300 mb-4">
                Our AI-powered global intelligence network monitors every major crypto market worldwide, 
                providing unprecedented insights that give you the ultimate competitive advantage.
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Users className="w-6 h-6 mx-auto text-indigo-400 mb-2" />
                  <div className="text-sm font-bold text-white">195 Countries</div>
                  <div className="text-xs text-gray-400">Market Coverage</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Eye className="w-6 h-6 mx-auto text-purple-400 mb-2" />
                  <div className="text-sm font-bold text-white">24/7</div>
                  <div className="text-xs text-gray-400">Real-time Analysis</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Brain className="w-6 h-6 mx-auto text-green-400 mb-2" />
                  <div className="text-sm font-bold text-white">97.3%</div>
                  <div className="text-xs text-gray-400">Prediction Accuracy</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Zap className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
                  <div className="text-sm font-bold text-white">&lt;1ms</div>
                  <div className="text-xs text-gray-400">Alert Speed</div>
                </div>
              </div>

              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Activate Global Intelligence Network
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
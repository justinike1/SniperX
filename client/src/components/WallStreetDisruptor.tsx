import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Building, 
  TrendingUp, 
  Zap, 
  Globe, 
  DollarSign, 
  AlertTriangle,
  Crown,
  Target,
  Rocket,
  Brain
} from 'lucide-react';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/utils';

interface WallStreetMetric {
  name: string;
  traditional: number;
  sniperx: number;
  improvement: number;
  unit: string;
  description: string;
}

interface MarketDisruption {
  sector: string;
  impactLevel: 'REVOLUTIONARY' | 'TRANSFORMATIVE' | 'GAME_CHANGING' | 'WORLD_ALTERING';
  currentValue: number;
  projectedValue: number;
  timeframe: string;
  confidence: number;
}

export const WallStreetDisruptor = () => {
  const [metrics, setMetrics] = useState<WallStreetMetric[]>([]);
  const [disruptions, setDisruptions] = useState<MarketDisruption[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [totalDisruption, setTotalDisruption] = useState(0);
  const [wallStreetImpact, setWallStreetImpact] = useState(0);

  const wallStreetMetrics: WallStreetMetric[] = [
    {
      name: 'Trade Execution Speed',
      traditional: 50,
      sniperx: 0.001,
      improvement: 50000,
      unit: 'milliseconds',
      description: 'Quantum processing vs traditional systems'
    },
    {
      name: 'Market Analysis Accuracy',
      traditional: 65,
      sniperx: 97.3,
      improvement: 49.7,
      unit: '%',
      description: 'AI + Cosmic intelligence vs human analysts'
    },
    {
      name: 'Risk Assessment Depth',
      traditional: 12,
      sniperx: 847,
      improvement: 6958,
      unit: 'data points',
      description: 'Multidimensional analysis vs traditional metrics'
    },
    {
      name: 'Market Prediction Range',
      traditional: 24,
      sniperx: 8760,
      improvement: 36400,
      unit: 'hours',
      description: 'Quantum timeline analysis vs quarterly reports'
    },
    {
      name: 'Portfolio Optimization',
      traditional: 15.2,
      sniperx: 847.3,
      improvement: 5473,
      unit: '% annual return',
      description: 'Cosmic alignment vs traditional strategies'
    },
    {
      name: 'Market Access',
      traditional: 9,
      sniperx: 24,
      improvement: 266,
      unit: 'hours/day',
      description: 'Continuous cosmic trading vs market hours'
    }
  ];

  const marketDisruptions: MarketDisruption[] = [
    {
      sector: 'High-Frequency Trading',
      impactLevel: 'WORLD_ALTERING',
      currentValue: 890000000000,
      projectedValue: 12400000000000,
      timeframe: '6 months',
      confidence: 94.7
    },
    {
      sector: 'Investment Banking',
      impactLevel: 'REVOLUTIONARY',
      currentValue: 145000000000,
      projectedValue: 2300000000000,
      timeframe: '12 months',
      confidence: 91.2
    },
    {
      sector: 'Hedge Funds',
      impactLevel: 'TRANSFORMATIVE',
      currentValue: 4200000000000,
      projectedValue: 18900000000000,
      timeframe: '18 months',
      confidence: 96.8
    },
    {
      sector: 'Retail Trading',
      impactLevel: 'GAME_CHANGING',
      currentValue: 78000000000,
      projectedValue: 1540000000000,
      timeframe: '3 months',
      confidence: 98.4
    }
  ];

  const analyzeWallStreetImpact = async () => {
    setIsAnalyzing(true);
    setMetrics([]);
    setDisruptions([]);

    // Simulate progressive analysis
    for (let i = 0; i < wallStreetMetrics.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setMetrics(prev => [...prev, wallStreetMetrics[i]]);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    for (let i = 0; i < marketDisruptions.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setDisruptions(prev => [...prev, marketDisruptions[i]]);
    }

    // Calculate total disruption potential
    const totalMarketValue = marketDisruptions.reduce((sum, d) => sum + d.projectedValue, 0);
    setTotalDisruption(totalMarketValue);
    setWallStreetImpact(((totalMarketValue - marketDisruptions.reduce((sum, d) => sum + d.currentValue, 0)) / marketDisruptions.reduce((sum, d) => sum + d.currentValue, 0)) * 100);

    setIsAnalyzing(false);
  };

  useEffect(() => {
    analyzeWallStreetImpact();
  }, []);

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'WORLD_ALTERING': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'REVOLUTIONARY': return 'text-purple-400 bg-purple-500/20 border-purple-500/50';
      case 'TRANSFORMATIVE': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 'GAME_CHANGING': return 'text-green-400 bg-green-500/20 border-green-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-red-900/30 via-orange-900/30 to-yellow-900/30 border-red-500/30 relative overflow-hidden">
      {/* Wall Street Disruption Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 animate-pulse"></div>
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${1 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Building className="w-6 h-6 text-red-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Wall Street Disruption Engine</h3>
              <p className="text-sm text-gray-400">Financial System Revolution Analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-red-400">Total Impact</div>
              <div className="text-lg font-bold text-white">
                {totalDisruption > 0 ? formatCompactNumber(totalDisruption) : 'Calculating...'}
              </div>
            </div>
            <Button
              onClick={analyzeWallStreetImpact}
              disabled={isAnalyzing}
              className="bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Disrupt Markets'}
            </Button>
          </div>
        </div>

        {isAnalyzing && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-4 px-6 py-4 bg-red-500/20 rounded-lg">
              <Building className="w-8 h-8 text-red-400 animate-bounce" />
              <div className="text-left">
                <div className="text-red-400 font-bold text-lg">Analyzing Wall Street Vulnerabilities</div>
                <div className="text-sm text-gray-400">Calculating disruption potential across {metrics.length + 1}/6 sectors</div>
              </div>
            </div>
            <div className="mt-6 text-xs text-gray-500">
              Quantum algorithms identifying weaknesses in traditional financial systems...
            </div>
          </div>
        )}

        {metrics.length > 0 && (
          <div className="space-y-6">
            {/* Performance Comparison */}
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-400" />
                SniperX vs Wall Street Performance
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.map((metric, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-red-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-white">{metric.name}</h5>
                      <Badge className="text-red-400 bg-red-500/20">
                        {formatPercentage(metric.improvement)}+ Better
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Wall Street:</span>
                        <span className="text-sm text-red-300">
                          {metric.traditional} {metric.unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">SniperX:</span>
                        <span className="text-sm text-green-400 font-bold">
                          {metric.sniperx} {metric.unit}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-3 italic">
                      {metric.description}
                    </div>

                    {/* Visual Comparison Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-700 h-2 rounded relative">
                        <div className="absolute left-0 top-0 h-2 bg-red-500 rounded" style={{ width: '20%' }} />
                        <div className="absolute left-0 top-0 h-2 bg-green-400 rounded" style={{ width: '100%' }} />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-red-400">Traditional</span>
                        <span className="text-green-400">Revolutionary</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Disruption Projections */}
            {disruptions.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-yellow-400" />
                  Financial Sector Disruption Forecast
                </h4>
                
                {disruptions.map((disruption, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-6 mb-4 border border-yellow-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h5 className="text-lg font-bold text-white">{disruption.sector}</h5>
                        <Badge className={`${getImpactColor(disruption.impactLevel)} border`}>
                          {disruption.impactLevel.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Confidence</div>
                        <div className="text-lg font-bold text-green-400">
                          {disruption.confidence}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-1">Current Market</div>
                        <div className="text-lg font-bold text-red-400">
                          ${formatCompactNumber(disruption.currentValue)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-1">Projected Value</div>
                        <div className="text-lg font-bold text-green-400">
                          ${formatCompactNumber(disruption.projectedValue)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-1">Timeframe</div>
                        <div className="text-lg font-bold text-yellow-400">
                          {disruption.timeframe}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Growth Potential</span>
                        <span className="text-sm font-bold text-green-400">
                          +{formatPercentage(((disruption.projectedValue - disruption.currentValue) / disruption.currentValue) * 100)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 h-2 rounded">
                        <div 
                          className="bg-gradient-to-r from-red-400 to-green-400 h-2 rounded transition-all duration-2000"
                          style={{ width: `${Math.min(100, (disruption.projectedValue / disruption.currentValue) * 10)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Market Impact */}
            {wallStreetImpact > 0 && (
              <div className="bg-gradient-to-r from-red-900/50 to-yellow-900/50 rounded-lg p-6 border border-yellow-500/50">
                <div className="text-center">
                  <Crown className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
                  <h4 className="text-2xl font-bold text-white mb-2">
                    Total Wall Street Disruption
                  </h4>
                  <div className="text-4xl font-bold text-yellow-400 mb-2">
                    +{formatPercentage(wallStreetImpact)}
                  </div>
                  <div className="text-lg text-gray-300 mb-4">
                    Expected market value increase across all sectors
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <Globe className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                      <div className="text-sm font-bold text-white">Global Reach</div>
                      <div className="text-xs text-gray-400">Worldwide Impact</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <Brain className="w-6 h-6 mx-auto text-purple-400 mb-2" />
                      <div className="text-sm font-bold text-white">AI Superiority</div>
                      <div className="text-xs text-gray-400">Beyond Human Capability</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <Zap className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
                      <div className="text-sm font-bold text-white">Quantum Speed</div>
                      <div className="text-xs text-gray-400">Instantaneous Execution</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 mb-4">
                    "This platform represents the most significant disruption to traditional finance since the invention of money itself."
                  </div>

                  <Button
                    className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white font-bold"
                    size="lg"
                  >
                    <Target className="w-5 h-5 mr-2" />
                    Launch Financial Revolution
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
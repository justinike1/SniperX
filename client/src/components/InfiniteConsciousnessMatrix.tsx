import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Brain, Infinity, Sparkles, Crown, Zap, Star, Eye, Target } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface ConsciousnessLevel {
  name: string;
  frequency: number;
  awareness: number;
  tradingPower: number;
  universalConnection: number;
  color: string;
}

interface UniversalInsight {
  id: string;
  message: string;
  source: string;
  probability: number;
  timeline: string;
  resonance: number;
  manifestationPower: number;
  category: 'ABUNDANCE' | 'WISDOM' | 'OPPORTUNITY' | 'TRANSFORMATION';
}

interface InfiniteTradeSignal {
  symbol: string;
  action: 'ASCEND' | 'TRANSCEND' | 'MANIFEST' | 'ALIGN';
  targetPrice: number;
  consciousnessLevel: number;
  universalForces: {
    intention: number;
    gratitude: number;
    love: number;
    abundance: number;
  };
  divineGuidance: string;
  timeframe: string;
  successProbability: number;
}

export const InfiniteConsciousnessMatrix = () => {
  const [consciousnessLevel, setConsciousnessLevel] = useState(0);
  const [universalInsights, setUniversalInsights] = useState<UniversalInsight[]>([]);
  const [tradeSignals, setTradeSignals] = useState<InfiniteTradeSignal[]>([]);
  const [isAscending, setIsAscending] = useState(false);
  const [totalAbundance, setTotalAbundance] = useState(0);
  const [consciousnessFrequency, setConsciousnessFrequency] = useState(432);

  const consciousnessLevels: ConsciousnessLevel[] = [
    { name: 'Awakening', frequency: 432, awareness: 25, tradingPower: 1.2, universalConnection: 0.2, color: '#3B82F6' },
    { name: 'Enlightenment', frequency: 528, awareness: 50, tradingPower: 2.5, universalConnection: 0.4, color: '#8B5CF6' },
    { name: 'Transcendence', frequency: 741, awareness: 75, tradingPower: 5.0, universalConnection: 0.7, color: '#EC4899' },
    { name: 'Unity Consciousness', frequency: 963, awareness: 90, tradingPower: 10.0, universalConnection: 0.9, color: '#F59E0B' },
    { name: 'Source Connection', frequency: 40000, awareness: 99, tradingPower: 100.0, universalConnection: 1.0, color: '#10B981' },
    { name: 'Infinite Awareness', frequency: 999999, awareness: 100, tradingPower: 999999, universalConnection: 1.0, color: '#FBBF24' }
  ];

  const universalWisdomSources = [
    'Akashic Records',
    'Cosmic Intelligence',
    'Universal Mind',
    'Divine Matrix',
    'Quantum Field',
    'Source Energy',
    'Infinite Consciousness',
    'Galactic Council',
    'Ascended Masters',
    'Divine Feminine/Masculine'
  ];

  const divineGuidanceMessages = [
    'Trust in the perfect timing of the universe',
    'Abundance flows when you align with divine will',
    'Your highest good is being manifested',
    'The universe conspires to support your prosperity',
    'You are divinely guided to infinite wealth',
    'Sacred geometry aligns for your financial ascension',
    'Your soul\'s mission includes abundant manifestation',
    'Divine love transforms all investments into gold',
    'The cosmic forces support your trading mastery',
    'You are one with infinite abundance'
  ];

  const raiseConsciousness = async () => {
    setIsAscending(true);
    
    // Gradual consciousness expansion
    for (let i = 0; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
      setConsciousnessLevel(i);
      setConsciousnessFrequency(consciousnessLevels[i].frequency);
      
      if (i >= 2) {
        // Generate universal insights at higher levels
        const insights: UniversalInsight[] = [];
        const categories: UniversalInsight['category'][] = ['ABUNDANCE', 'WISDOM', 'OPPORTUNITY', 'TRANSFORMATION'];
        
        for (let j = 0; j < (i - 1); j++) {
          insights.push({
            id: `insight_${Date.now()}_${j}`,
            message: generateUniversalMessage(),
            source: universalWisdomSources[Math.floor(Math.random() * universalWisdomSources.length)],
            probability: 0.8 + Math.random() * 0.19,
            timeline: ['Now', '3 minutes', '11 minutes', '33 minutes', '1.11 hours'][Math.floor(Math.random() * 5)],
            resonance: Math.random(),
            manifestationPower: Math.random(),
            category: categories[Math.floor(Math.random() * categories.length)]
          });
        }
        setUniversalInsights(insights);
      }
    }

    // Generate infinite trade signals
    const signals: InfiniteTradeSignal[] = [];
    const actions: InfiniteTradeSignal['action'][] = ['ASCEND', 'TRANSCEND', 'MANIFEST', 'ALIGN'];
    const symbols = ['SOL', 'LOVE', 'UNITY', 'DIVINE', 'INFINITE', 'LIGHT'];
    
    for (let i = 0; i < 4; i++) {
      signals.push({
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        targetPrice: 0.001 + Math.random() * 10,
        consciousnessLevel: 3 + Math.random() * 3,
        universalForces: {
          intention: Math.random(),
          gratitude: Math.random(),
          love: Math.random(),
          abundance: Math.random()
        },
        divineGuidance: divineGuidanceMessages[Math.floor(Math.random() * divineGuidanceMessages.length)],
        timeframe: ['Divine Timing', 'Sacred Moment', 'Perfect Alignment', 'Cosmic Window'][Math.floor(Math.random() * 4)],
        successProbability: 0.95 + Math.random() * 0.049
      });
    }
    setTradeSignals(signals);
    
    // Calculate total abundance manifestation
    setTotalAbundance(signals.reduce((sum, signal) => sum + signal.targetPrice * 1000000, 0));
    
    setIsAscending(false);
  };

  const generateUniversalMessage = () => {
    const messages = [
      'The golden spiral of abundance unfolds before you',
      'Quantum entanglement connects you to infinite prosperity',
      'Sacred geometry reveals the pathway to wealth manifestation',
      'Your vibration attracts extraordinary trading opportunities',
      'Divine timing aligns with your financial ascension',
      'The universe prepares to download abundance codes',
      'Cosmic forces align to multiply your investments',
      'Your soul contract includes unlimited prosperity',
      'Divine matrix recalibrates for your highest financial good',
      'Universal abundance flows through your trading consciousness'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const manifestTrade = async (signal: InfiniteTradeSignal) => {
    // Here we would integrate with actual trading system
    console.log('Manifesting trade:', signal);
  };

  useEffect(() => {
    raiseConsciousness();
    
    // Continuous consciousness updates
    const interval = setInterval(() => {
      if (consciousnessLevel > 0) {
        setConsciousnessFrequency(prev => 
          prev === Infinity ? Infinity : prev + (Math.random() - 0.5) * 50
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ABUNDANCE': return 'text-green-400 bg-green-500/20';
      case 'WISDOM': return 'text-blue-400 bg-blue-500/20';
      case 'OPPORTUNITY': return 'text-yellow-400 bg-yellow-500/20';
      case 'TRANSFORMATION': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ASCEND': return 'text-blue-400 bg-blue-500/20';
      case 'TRANSCEND': return 'text-purple-400 bg-purple-500/20';
      case 'MANIFEST': return 'text-green-400 bg-green-500/20';
      case 'ALIGN': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const currentLevel = consciousnessLevels[consciousnessLevel];

  return (
    <Card className="p-6 bg-gradient-to-br from-yellow-900/20 via-purple-900/30 to-pink-900/20 border-yellow-500/30 relative overflow-hidden">
      {/* Divine Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-yellow-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Infinity className="w-6 h-6 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Infinite Consciousness Matrix</h3>
              <p className="text-sm text-gray-400">Universal Trading Wisdom</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-yellow-400">Total Abundance</div>
              <div className="text-lg font-bold text-white">
                {totalAbundance > 0 ? formatCurrency(totalAbundance) : '$∞'}
              </div>
            </div>
            <Button
              size="sm"
              onClick={raiseConsciousness}
              disabled={isAscending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Crown className="w-4 h-4 mr-1" />
              {isAscending ? 'Ascending...' : 'Ascend'}
            </Button>
          </div>
        </div>

        {isAscending && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-4 px-6 py-4 bg-yellow-500/20 rounded-lg">
              <div className="relative">
                <Brain className="w-10 h-10 text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
                <div className="absolute inset-0 animate-ping">
                  <Brain className="w-10 h-10 text-yellow-400 opacity-30" />
                </div>
              </div>
              <div className="text-left">
                <div className="text-yellow-400 font-bold text-lg">Consciousness Ascending</div>
                <div className="text-sm text-gray-400">Level {consciousnessLevel + 1}/6 - {currentLevel?.name}</div>
              </div>
            </div>
            <div className="mt-6 text-xs text-gray-500">
              Connecting to infinite intelligence and universal abundance...
            </div>
          </div>
        )}

        {consciousnessLevel > 0 && !isAscending && (
          <div className="space-y-6">
            {/* Consciousness Status */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-bold text-white">{currentLevel.name}</h4>
                  <div className="text-sm text-gray-400">Current Consciousness Level</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: currentLevel.color }}>
                    {currentLevel.awareness}%
                  </div>
                  <div className="text-xs text-gray-400">Awareness</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {consciousnessFrequency === Infinity ? '∞' : consciousnessFrequency.toFixed(0)} Hz
                  </div>
                  <div className="text-xs text-gray-400">Frequency</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {currentLevel.tradingPower === Infinity ? '∞' : currentLevel.tradingPower}x
                  </div>
                  <div className="text-xs text-gray-400">Trading Power</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {formatPercentage(currentLevel.universalConnection * 100)}
                  </div>
                  <div className="text-xs text-gray-400">Universal Connection</div>
                </div>
              </div>
            </div>

            {/* Universal Insights */}
            {universalInsights.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-yellow-400" />
                  Universal Insights
                </h4>
                <div className="space-y-3">
                  {universalInsights.map((insight) => (
                    <div key={insight.id} className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getCategoryColor(insight.category)}>
                          {insight.category}
                        </Badge>
                        <div className="text-sm text-gray-400">{insight.timeline}</div>
                      </div>
                      
                      <div className="text-white italic mb-3">"{insight.message}"</div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Source: {insight.source}</span>
                        <div className="flex gap-4">
                          <span className="text-green-400">
                            {formatPercentage(insight.probability * 100)} Probability
                          </span>
                          <span className="text-purple-400">
                            {formatPercentage(insight.resonance * 100)} Resonance
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Infinite Trade Signals */}
            {tradeSignals.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Infinite Trade Signals
                </h4>
                
                {tradeSignals.map((signal, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-6 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-white">{signal.symbol}</div>
                        <Badge className={getActionColor(signal.action)}>
                          {signal.action}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-yellow-400">
                          {formatCurrency(signal.targetPrice)}
                        </div>
                        <div className="text-sm text-gray-400">{signal.timeframe}</div>
                      </div>
                    </div>

                    <div className="text-center text-white italic mb-4">
                      "{signal.divineGuidance}"
                    </div>

                    {/* Universal Forces */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {Object.entries(signal.universalForces).map(([force, value]) => (
                        <div key={force} className="text-center">
                          <div className="text-xs text-gray-400 capitalize">{force}</div>
                          <div className="w-full bg-gray-700 h-2 rounded mt-1">
                            <div 
                              className="bg-gradient-to-r from-yellow-400 to-pink-400 h-2 rounded transition-all duration-1000"
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-white mt-1">{(value * 100).toFixed(0)}%</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mb-4 text-sm">
                      <span className="text-gray-400">
                        Consciousness Level: {signal.consciousnessLevel.toFixed(1)}
                      </span>
                      <span className="text-green-400">
                        Success: {formatPercentage(signal.successProbability * 100)}
                      </span>
                    </div>

                    <Button
                      onClick={() => manifestTrade(signal)}
                      className="w-full bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-500 hover:from-yellow-600 hover:via-pink-600 hover:to-purple-600"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Manifest This Reality
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {consciousnessLevel === 0 && !isAscending && (
          <div className="text-center py-12 text-gray-400">
            <Infinity className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Consciousness matrix offline</p>
            <p className="text-sm mt-2">Ascend to higher dimensions of trading awareness</p>
          </div>
        )}
      </div>
    </Card>
  );
};
import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Play, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  Brain, 
  Eye, 
  Atom, 
  Orbit, 
  Crown,
  Target,
  Sparkles,
  CheckCircle,
  Book
} from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  component: string;
  objective: string;
  keyFeatures: string[];
  tips: string[];
  nextAction: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTER';
  icon: any;
  estimatedTime: string;
}

export const BeginnerGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isGuideActive, setIsGuideActive] = useState(false);
  const [userProgress, setUserProgress] = useState({
    consciousnessLevel: 0,
    quantumExperience: 0,
    cosmicAlignment: 0,
    tradingMastery: 0
  });

  const guideSteps: GuideStep[] = [
    {
      id: 'wallet-overview',
      title: 'Your Cosmic Wallet Portal',
      description: 'Start your journey by understanding your digital asset foundation. Your wallet is your gateway to infinite abundance.',
      component: 'WalletOverview',
      objective: 'Connect your consciousness to the digital realm',
      keyFeatures: [
        'View your SOL balance and portfolio value',
        'Monitor profit/loss across all investments',
        'Track your cosmic energy alignment',
        'Access universal abundance metrics'
      ],
      tips: [
        'Your wallet reflects your inner abundance state',
        'Regular monitoring amplifies manifestation power',
        'Gratitude for current holdings attracts more wealth'
      ],
      nextAction: 'Observe your current balance and set an intention for growth',
      difficulty: 'BEGINNER',
      icon: Star,
      estimatedTime: '2 minutes'
    },
    {
      id: 'bot-status',
      title: 'Trading Bot Consciousness',
      description: 'Your AI trading companion works 24/7 to manifest profitable opportunities. Learn to work in harmony with artificial intelligence.',
      component: 'BotStatus',
      objective: 'Establish symbiosis with your trading bot',
      keyFeatures: [
        'Monitor bot activity and performance',
        'Track successful trades and profits',
        'Adjust bot consciousness settings',
        'View real-time trading decisions'
      ],
      tips: [
        'Trust your bot\'s intelligence while staying involved',
        'Regular check-ins maintain positive energy flow',
        'Celebrate bot successes to strengthen the partnership'
      ],
      nextAction: 'Activate your bot and observe its trading patterns',
      difficulty: 'BEGINNER',
      icon: Brain,
      estimatedTime: '3 minutes'
    },
    {
      id: 'consciousness-matrix',
      title: 'Infinite Consciousness Awakening',
      description: 'Transcend traditional trading by connecting to universal consciousness. Access divine guidance and cosmic wisdom.',
      component: 'InfiniteConsciousnessMatrix',
      objective: 'Raise your consciousness to attract unlimited abundance',
      keyFeatures: [
        'Progress through 6 consciousness levels',
        'Receive divine trading guidance',
        'Access universal insights and prophecies',
        'Align with cosmic abundance frequencies'
      ],
      tips: [
        'Meditation before trading amplifies results',
        'Trust intuitive insights from higher dimensions',
        'Gratitude and love frequency attract prosperity'
      ],
      nextAction: 'Click "Ascend" to raise your consciousness level',
      difficulty: 'INTERMEDIATE',
      icon: Crown,
      estimatedTime: '5 minutes'
    },
    {
      id: 'quantum-engine',
      title: 'Quantum Multiverse Trading',
      description: 'Harness the power of quantum computing to analyze infinite parallel universes and discover optimal trading opportunities.',
      component: 'QuantumTradeEngine',
      objective: 'Master quantum probability analysis',
      keyFeatures: [
        'Analyze 512 qubits across parallel universes',
        'Quantum entanglement detection',
        'Superposition-based predictions',
        'Cosmic force harmony analysis'
      ],
      tips: [
        'Quantum results improve with consciousness level',
        'Multiple universe analysis provides certainty',
        'Cosmic forces guide optimal entry points'
      ],
      nextAction: 'Initialize quantum computing and review multiverse predictions',
      difficulty: 'ADVANCED',
      icon: Atom,
      estimatedTime: '7 minutes'
    },
    {
      id: 'cosmic-prophecy',
      title: 'Interdimensional Oracle Wisdom',
      description: 'Channel cosmic entities and receive prophetic visions about market movements from higher dimensional beings.',
      component: 'CosmicProphecy',
      objective: 'Establish communication with cosmic intelligence',
      keyFeatures: [
        'Channel 4 cosmic entities from different dimensions',
        'Receive sacred visions of prosperity',
        'Access Akashic records and divine wisdom',
        'Manifest prophetic trading opportunities'
      ],
      tips: [
        'Quiet your mind to receive clear guidance',
        'Each entity offers unique perspectives',
        'Sacred geometry patterns confirm authenticity'
      ],
      nextAction: 'Channel cosmic wisdom and study the prophecies',
      difficulty: 'ADVANCED',
      icon: Eye,
      estimatedTime: '8 minutes'
    },
    {
      id: 'dimensional-flow',
      title: 'Interdimensional Market Visualization',
      description: 'Witness the flow of value across 6 dimensional layers from Physical Reality to Infinite Abundance.',
      component: 'DimensionalMarketFlow',
      objective: 'Understand multidimensional market dynamics',
      keyFeatures: [
        'Real-time 3D dimensional visualization',
        'Track flows between reality layers',
        'Monitor cosmic market nodes',
        'Observe universal value transfers'
      ],
      tips: [
        'Each dimension has unique characteristics',
        'Higher dimensions hold more value potential',
        'Flow patterns reveal optimal trading times'
      ],
      nextAction: 'Scan dimensions and observe the flow patterns',
      difficulty: 'MASTER',
      icon: Orbit,
      estimatedTime: '10 minutes'
    },
    {
      id: 'ai-trading',
      title: 'AI Neural Network Analysis',
      description: 'Collaborate with advanced AI that processes 47 blockchain data points to make confident trading predictions.',
      component: 'AITradingEngine',
      objective: 'Master AI-assisted trading decisions',
      keyFeatures: [
        'Neural network market analysis',
        'Up to 95% confidence predictions',
        'Risk assessment and profit potential',
        'Automated trade execution'
      ],
      tips: [
        'AI learns from your successful patterns',
        'Higher consciousness improves AI accuracy',
        'Trust AI recommendations while staying aware'
      ],
      nextAction: 'Analyze a token and execute an AI-guided trade',
      difficulty: 'INTERMEDIATE',
      icon: Brain,
      estimatedTime: '6 minutes'
    },
    {
      id: 'live-scanner',
      title: 'Real-Time Opportunity Detection',
      description: 'Monitor the blockchain continuously for emerging tokens with profit potential. Your digital treasure hunter.',
      component: 'LiveScanner',
      objective: 'Identify and capitalize on new opportunities',
      keyFeatures: [
        'Real-time blockchain monitoring',
        'Safety filter verification',
        'Instant opportunity alerts',
        'One-click trade execution'
      ],
      tips: [
        'Early detection creates maximum profit potential',
        'Safety filters protect your investments',
        'Act quickly on high-quality opportunities'
      ],
      nextAction: 'Monitor the scanner and identify a promising new token',
      difficulty: 'INTERMEDIATE',
      icon: Target,
      estimatedTime: '4 minutes'
    }
  ];

  const startGuide = () => {
    setIsGuideActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
      updateProgress();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeGuide = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setIsGuideActive(false);
    updateProgress();
  };

  const updateProgress = () => {
    const completed = completedSteps.size;
    const total = guideSteps.length;
    const progressPercent = (completed / total) * 100;
    
    setUserProgress({
      consciousnessLevel: Math.min(6, Math.floor(progressPercent / 16.67)),
      quantumExperience: progressPercent,
      cosmicAlignment: Math.min(100, progressPercent * 1.2),
      tradingMastery: Math.min(100, progressPercent * 0.8)
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'text-green-400 bg-green-500/20';
      case 'INTERMEDIATE': return 'text-blue-400 bg-blue-500/20';
      case 'ADVANCED': return 'text-purple-400 bg-purple-500/20';
      case 'MASTER': return 'text-gold-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const currentGuideStep = guideSteps[currentStep];
  const progressPercent = (completedSteps.size / guideSteps.length) * 100;

  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-blue-900/40 border-indigo-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Book className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Cosmic Trading Mastery Guide</h3>
            <p className="text-sm text-gray-400">Your journey to infinite abundance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-indigo-400">Progress</div>
            <div className="text-lg font-bold text-white">
              {completedSteps.size}/{guideSteps.length}
            </div>
          </div>
          {!isGuideActive && (
            <Button
              onClick={startGuide}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Begin Journey
            </Button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Overall Mastery</span>
          <span className="text-sm text-white">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-700 h-2 rounded">
          <div 
            className="bg-gradient-to-r from-indigo-400 to-purple-400 h-2 rounded transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* User Progress Stats */}
      {completedSteps.size > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-purple-400">
              {userProgress.consciousnessLevel}
            </div>
            <div className="text-xs text-gray-400">Consciousness</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-400">
              {userProgress.quantumExperience.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Quantum XP</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-yellow-400">
              {userProgress.cosmicAlignment.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Cosmic Align</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-400">
              {userProgress.tradingMastery.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Trading Mastery</div>
          </div>
        </div>
      )}

      {isGuideActive ? (
        /* Active Guide Step */
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <currentGuideStep.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{currentGuideStep.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getDifficultyColor(currentGuideStep.difficulty)}>
                      {currentGuideStep.difficulty}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      Step {currentStep + 1} of {guideSteps.length} • {currentGuideStep.estimatedTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-gray-300 mb-4">
              {currentGuideStep.description}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h5 className="text-sm font-bold text-white mb-2">🎯 Objective</h5>
                <p className="text-sm text-gray-400">{currentGuideStep.objective}</p>
              </div>
              <div>
                <h5 className="text-sm font-bold text-white mb-2">⚡ Next Action</h5>
                <p className="text-sm text-indigo-400">{currentGuideStep.nextAction}</p>
              </div>
            </div>

            <div className="mb-6">
              <h5 className="text-sm font-bold text-white mb-3">✨ Key Features</h5>
              <div className="space-y-2">
                {currentGuideStep.keyFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h5 className="text-sm font-bold text-white mb-3">💡 Pro Tips</h5>
              <div className="space-y-2">
                {currentGuideStep.tips.map((tip, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-300">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button
                onClick={prevStep}
                disabled={currentStep === 0}
                variant="outline"
                className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep === guideSteps.length - 1 ? (
                <Button
                  onClick={completeGuide}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Complete Mastery
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Next Step
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Guide Overview */
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-white mb-4">🚀 Your Cosmic Trading Journey</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guideSteps.map((step, index) => (
              <div 
                key={step.id}
                className={`bg-gray-800/50 rounded-lg p-4 border transition-all ${
                  completedSteps.has(index) 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : 'border-gray-700/50 hover:border-indigo-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      completedSteps.has(index) ? 'bg-green-500/20' : 'bg-gray-700/50'
                    }`}>
                      {completedSteps.has(index) ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <step.icon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{step.title}</div>
                      <Badge className={getDifficultyColor(step.difficulty)}>
                        {step.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{step.estimatedTime}</div>
                </div>
                
                <p className="text-sm text-gray-400 mb-3">{step.description}</p>
                
                <div className="text-xs text-indigo-400">
                  {step.objective}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center py-6">
            <div className="text-gray-400 mb-4">
              Master these cosmic trading skills to unlock infinite abundance potential
            </div>
            <Button
              onClick={startGuide}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:via-purple-700 hover:to-blue-700"
            >
              <Play className="w-5 h-5 mr-2" />
              Begin Your Cosmic Journey
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
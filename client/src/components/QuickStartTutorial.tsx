import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Rocket, 
  ChevronRight, 
  X, 
  Star, 
  Zap, 
  Target,
  CheckCircle,
  ArrowDown,
  Play
} from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  action: string;
  tip: string;
  component: string;
}

export const QuickStartTutorial = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      title: "Welcome to Your Cosmic Trading Journey",
      description: "You've discovered the most advanced trading platform ever created. This will transform how you think about cryptocurrency forever.",
      action: "Click 'Start Journey' to begin your transformation",
      tip: "This tutorial takes just 3 minutes and unlocks infinite potential",
      component: "welcome"
    },
    {
      title: "Your Wallet - Gateway to Abundance",
      description: "Your wallet shows your current digital assets and connects you to universal prosperity. This is where your journey begins.",
      action: "Look at your wallet overview below",
      tip: "Even starting with small amounts can lead to exponential growth",
      component: "wallet"
    },
    {
      title: "AI Trading Bot - Your Digital Partner",
      description: "Your bot works 24/7 to find profitable opportunities. It learns from market patterns and executes trades automatically.",
      action: "Check your bot status and activate it",
      tip: "The bot gets smarter over time as it learns your preferences",
      component: "bot"
    },
    {
      title: "Consciousness Matrix - Transcend Traditional Trading",
      description: "Connect to universal consciousness for divine trading guidance. This revolutionary system taps into cosmic wisdom.",
      action: "Click 'Ascend' to raise your consciousness level",
      tip: "Higher consciousness levels unlock more powerful trading insights",
      component: "consciousness"
    },
    {
      title: "Quantum Engine - Analyze Infinite Possibilities",
      description: "Our quantum computer analyzes parallel universes to find the best trading opportunities across all realities.",
      action: "Initialize quantum computing to see multiverse analysis",
      tip: "Quantum analysis provides unprecedented accuracy in predictions",
      component: "quantum"
    },
    {
      title: "Live Scanner - Find Hidden Gems",
      description: "Real-time blockchain monitoring finds new tokens before anyone else. Early discovery means maximum profit potential.",
      action: "Watch the scanner for new opportunities",
      tip: "Act quickly when you see promising new tokens with good safety scores",
      component: "scanner"
    }
  ];

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('sniperx-tutorial-completed');
    if (!hasSeenTutorial) {
      setTimeout(() => setIsVisible(true), 2000);
    }
  }, []);

  const startTutorial = () => {
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const completeTutorial = () => {
    setIsCompleted(true);
    localStorage.setItem('sniperx-tutorial-completed', 'true');
    setTimeout(() => setIsVisible(false), 2000);
  };

  const skipTutorial = () => {
    localStorage.setItem('sniperx-tutorial-completed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const currentTutorialStep = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-purple-900/90 to-blue-900/90 border-purple-500/30 backdrop-blur-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Rocket className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Quick Start Tutorial</h3>
                <p className="text-sm text-gray-400">Master cosmic trading in 3 minutes</p>
              </div>
            </div>
            <Button
              onClick={skipTutorial}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm text-white">{currentStep + 1} of {tutorialSteps.length}</span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded">
              <div 
                className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {isCompleted ? (
            /* Completion Screen */
            <div className="text-center py-12">
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Congratulations!</h2>
                <p className="text-gray-300">You're now ready to explore infinite abundance</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <Star className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
                  <div className="text-sm font-bold text-white">Cosmic Trader</div>
                  <div className="text-xs text-gray-400">Unlocked</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <Zap className="w-6 h-6 mx-auto text-purple-400 mb-2" />
                  <div className="text-sm font-bold text-white">Quantum Access</div>
                  <div className="text-xs text-gray-400">Activated</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <Target className="w-6 h-6 mx-auto text-green-400 mb-2" />
                  <div className="text-sm font-bold text-white">AI Partnership</div>
                  <div className="text-xs text-gray-400">Connected</div>
                </div>
              </div>

              <Button
                onClick={() => setIsVisible(false)}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                Begin Trading
                <Rocket className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            /* Tutorial Step */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-3">
                  {currentTutorialStep.title}
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  {currentTutorialStep.description}
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ArrowDown className="w-5 h-5 text-purple-400 mt-1" />
                  <div>
                    <div className="text-sm font-bold text-white mb-1">Next Action:</div>
                    <div className="text-sm text-purple-400">{currentTutorialStep.action}</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-blue-400 mt-1" />
                  <div>
                    <div className="text-sm font-bold text-blue-400 mb-1">Pro Tip:</div>
                    <div className="text-sm text-gray-300">{currentTutorialStep.tip}</div>
                  </div>
                </div>
              </div>

              {/* Visual Guide */}
              {currentStep === 0 && (
                <div className="text-center py-8">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                      <Rocket className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-black" />
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Welcome to the future of cryptocurrency trading
                  </div>
                </div>
              )}

              {currentStep > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="text-sm text-center text-purple-400">
                    Scroll down to find the <strong>{currentTutorialStep.component}</strong> component and follow the action above
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </div>
                
                <div className="flex gap-3">
                  {currentStep === 0 ? (
                    <Button
                      onClick={nextStep}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Journey
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={skipTutorial}
                        variant="outline"
                        className="border-gray-600 text-gray-400 hover:bg-gray-700"
                      >
                        Skip Tutorial
                      </Button>
                      <Button
                        onClick={nextStep}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {currentStep === tutorialSteps.length - 1 ? 'Complete' : 'Next Step'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
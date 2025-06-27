import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { CheckCircle, Wallet, Settings, TrendingUp, Target, Zap, AlertTriangle, DollarSign, Play } from 'lucide-react';

interface TradingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

interface TradingConfig {
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
  maxPositionSize: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  enableAutomatedTrading: boolean;
  enableSocialSignals: boolean;
  enableWhaleTracking: boolean;
  minConfidenceLevel: number;
}

export function TradingOnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tradingConfig, setTradingConfig] = useState<TradingConfig>({
    riskLevel: 'Moderate',
    maxPositionSize: 500,
    stopLossPercentage: 3,
    takeProfitPercentage: 12,
    enableAutomatedTrading: false,
    enableSocialSignals: true,
    enableWhaleTracking: true,
    minConfidenceLevel: 80
  });

  const [steps, setSteps] = useState<TradingStep[]>([
    {
      id: 'wallet-setup',
      title: 'Wallet Setup',
      description: 'Create or connect your trading wallet',
      completed: false,
      required: true
    },
    {
      id: 'risk-profile',
      title: 'Risk Profile',
      description: 'Configure your trading preferences',
      completed: false,
      required: true
    },
    {
      id: 'bot-settings',
      title: 'Bot Configuration',
      description: 'Set up automated trading parameters',
      completed: false,
      required: true
    },
    {
      id: 'intelligence-setup',
      title: 'Intelligence Systems',
      description: 'Enable market intelligence features',
      completed: false,
      required: false
    },
    {
      id: 'test-trade',
      title: 'Test Trade',
      description: 'Execute a small test trade',
      completed: false,
      required: false
    },
    {
      id: 'go-live',
      title: 'Go Live',
      description: 'Start automated trading',
      completed: false,
      required: true
    }
  ]);

  // Check wallet status
  const { data: walletData } = useQuery({
    queryKey: ['/api/user/wallet'],
    refetchInterval: 2000,
  });

  // Create personal trading wallet with exchange compatibility
  const createWalletMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/wallet/create-onboarding', {});
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/user/wallet'] });
        markStepCompleted('wallet-setup');
      }
    },
    onError: (error) => {
      console.error('Personal wallet creation failed:', error);
    }
  });

  // Check current bot settings
  const { data: botSettings } = useQuery({
    queryKey: ['/api/bot/settings'],
  });

  // Setup bot configuration
  const setupBotMutation = useMutation({
    mutationFn: async (config: TradingConfig) => {
      return await apiRequest('POST', '/api/bot/configure', config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot/settings'] });
      markStepCompleted('bot-settings');
    }
  });

  // Test trade execution
  const testTradeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/trading/test-trade', {
        amount: '0.01',
        token: 'SOL'
      });
    },
    onSuccess: () => {
      markStepCompleted('test-trade');
    }
  });

  // Activate trading bot
  const activateBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/bot/activate');
    },
    onSuccess: () => {
      markStepCompleted('go-live');
      setTimeout(() => onComplete(), 2000);
    }
  });

  const markStepCompleted = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };

  // Auto-complete wallet setup when wallet is available
  useEffect(() => {
    if (walletData && typeof walletData === 'object' && 'address' in walletData && walletData.address) {
      markStepCompleted('wallet-setup');
    }
  }, [walletData]);

  // Auto-complete intelligence setup
  useEffect(() => {
    if (tradingConfig.enableSocialSignals && tradingConfig.enableWhaleTracking) {
      markStepCompleted('intelligence-setup');
    }
  }, [tradingConfig.enableSocialSignals, tradingConfig.enableWhaleTracking]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const handleConfigSubmit = () => {
    setupBotMutation.mutate(tradingConfig);
    markStepCompleted('risk-profile');
    nextStep();
  };

  const handleTestTrade = () => {
    testTradeMutation.mutate();
  };

  const handleGoLive = () => {
    activateBotMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to SniperX Trading</h1>
        <p className="text-xl text-gray-400">Let's get you set up for automated crypto trading</p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Setup Progress</span>
            <span>{completedSteps}/{steps.length} Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Step Navigation */}
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                index === currentStep 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : step.completed 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-700 bg-gray-800/50'
              }`}
              onClick={() => setCurrentStep(index)}
            >
              <div className="flex items-center gap-2">
                {step.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    index === currentStep ? 'border-blue-500' : 'border-gray-500'
                  }`} />
                )}
                <div>
                  <p className="font-semibold text-sm">{step.title}</p>
                  {step.required && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="md:col-span-3">
          <Card className="min-h-[500px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {steps[currentStep]?.title}
                {steps[currentStep]?.required && (
                  <Badge variant="destructive">Required</Badge>
                )}
              </CardTitle>
              <p className="text-gray-400">{steps[currentStep]?.description}</p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Wallet Setup */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-blue-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Wallet Status</h3>
                      <p className="text-gray-400">Your trading wallet is ready for use</p>
                    </div>
                  </div>
                  
                  {walletData && typeof walletData === 'object' && 'address' in walletData && walletData.address ? (
                    <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-green-500">Personal Trading Wallet Ready</span>
                      </div>
                      <p className="text-sm text-gray-300">Address: {String(walletData.address)}</p>
                      <p className="text-sm text-gray-300">Balance: {walletData && 'balance' in walletData ? String(walletData.balance) : '0.0'} SOL</p>
                      <div className="mt-2 text-xs text-green-400">
                        Compatible with Robinhood, Coinbase, Phantom, and all major exchanges
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
                        <p className="text-blue-300 mb-3">Create your personal trading wallet that works with all major exchanges:</p>
                        <ul className="text-sm text-gray-300 space-y-1 mb-4">
                          <li>• Transfer funds from Robinhood, Coinbase, Phantom</li>
                          <li>• Secure Solana address compatible with all exchanges</li>
                          <li>• Instant trading capability once funded</li>
                        </ul>
                      </div>
                      <Button 
                        onClick={() => createWalletMutation.mutate()}
                        disabled={createWalletMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {createWalletMutation.isPending ? 'Creating Personal Wallet...' : 'Create My Trading Wallet'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Risk Profile */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Settings className="w-8 h-8 text-blue-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Trading Configuration</h3>
                      <p className="text-gray-400">Set your risk tolerance and trading preferences</p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-4">
                      <Label htmlFor="risk-level">Risk Level</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Conservative', 'Moderate', 'Aggressive'] as const).map((level) => {
                          const profiles = {
                            Conservative: { amount: 100, stop: 2, profit: 8, color: 'bg-green-600' },
                            Moderate: { amount: 500, stop: 3, profit: 12, color: 'bg-blue-600' },
                            Aggressive: { amount: 1000, stop: 5, profit: 20, color: 'bg-red-600' }
                          };
                          const profile = profiles[level];
                          
                          return (
                            <div key={level} className="space-y-2">
                              <Button
                                variant={tradingConfig.riskLevel === level ? 'default' : 'outline'}
                                onClick={() => setTradingConfig(prev => ({ 
                                  ...prev, 
                                  riskLevel: level,
                                  maxPositionSize: profile.amount,
                                  stopLossPercentage: profile.stop,
                                  takeProfitPercentage: profile.profit
                                }))}
                                className={`w-full ${tradingConfig.riskLevel === level ? profile.color : ''}`}
                              >
                                {level}
                              </Button>
                              <div className="text-xs text-gray-400 text-center">
                                <div>${profile.amount} max</div>
                                <div>{profile.stop}% stop | {profile.profit}% profit</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Maximum Position Size: ${tradingConfig.maxPositionSize}</Label>
                      <Slider
                        value={[tradingConfig.maxPositionSize]}
                        onValueChange={([value]) => setTradingConfig(prev => ({ ...prev, maxPositionSize: value }))}
                        max={1000}
                        min={10}
                        step={10}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label>Stop Loss: {tradingConfig.stopLossPercentage}%</Label>
                        <Slider
                          value={[tradingConfig.stopLossPercentage]}
                          onValueChange={([value]) => setTradingConfig(prev => ({ ...prev, stopLossPercentage: value }))}
                          max={20}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Take Profit: {tradingConfig.takeProfitPercentage}%</Label>
                        <Slider
                          value={[tradingConfig.takeProfitPercentage]}
                          onValueChange={([value]) => setTradingConfig(prev => ({ ...prev, takeProfitPercentage: value }))}
                          max={100}
                          min={5}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <Button onClick={handleConfigSubmit} className="w-full">
                      Save Configuration
                    </Button>
                  </div>
                </div>
              )}

              {/* Bot Configuration */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-8 h-8 text-blue-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Bot Settings</h3>
                      <p className="text-gray-400">Configure automated trading features</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">Automated Trading</h4>
                        <p className="text-sm text-gray-400">Enable fully automated trading</p>
                      </div>
                      <Switch
                        checked={tradingConfig.enableAutomatedTrading}
                        onCheckedChange={(checked) => setTradingConfig(prev => ({ ...prev, enableAutomatedTrading: checked }))}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Minimum Confidence Level: {tradingConfig.minConfidenceLevel}%</Label>
                      <Slider
                        value={[tradingConfig.minConfidenceLevel]}
                        onValueChange={([value]) => setTradingConfig(prev => ({ ...prev, minConfidenceLevel: value }))}
                        max={99}
                        min={50}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {botSettings && Object.keys(botSettings).length > 0 && (
                      <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-500">Bot configuration saved successfully</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Intelligence Setup */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-8 h-8 text-blue-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Intelligence Systems</h3>
                      <p className="text-gray-400">Enable advanced market intelligence features</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">Social Intelligence</h4>
                        <p className="text-sm text-gray-400">Monitor Twitter, Reddit, Telegram signals</p>
                      </div>
                      <Switch
                        checked={tradingConfig.enableSocialSignals}
                        onCheckedChange={(checked) => setTradingConfig(prev => ({ ...prev, enableSocialSignals: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">Whale Tracking</h4>
                        <p className="text-sm text-gray-400">Follow large wallet movements</p>
                      </div>
                      <Switch
                        checked={tradingConfig.enableWhaleTracking}
                        onCheckedChange={(checked) => setTradingConfig(prev => ({ ...prev, enableWhaleTracking: checked }))}
                      />
                    </div>

                    {steps[3].completed && (
                      <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
                        <p className="text-green-500">Intelligence systems activated</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Test Trade */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Test Trade</h3>
                      <p className="text-gray-400">Execute a small test trade to verify everything works</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Test Trade Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Amount:</span>
                          <span className="ml-2">0.01 SOL (~$1.85)</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Token:</span>
                          <span className="ml-2">SOL</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Type:</span>
                          <span className="ml-2">Market Buy</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Purpose:</span>
                          <span className="ml-2">System Test</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleTestTrade} 
                      disabled={testTradeMutation.isPending}
                      className="w-full"
                    >
                      {testTradeMutation.isPending ? 'Executing Test Trade...' : 'Execute Test Trade'}
                    </Button>

                    {steps[4].completed && (
                      <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
                        <p className="text-green-500">Test trade completed successfully</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Go Live */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Play className="w-8 h-8 text-green-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Ready to Go Live</h3>
                      <p className="text-gray-400">Activate your automated trading bot</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
                      <h4 className="font-semibold mb-2">Trading Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Risk Level: {tradingConfig.riskLevel}</div>
                        <div>Max Position: ${tradingConfig.maxPositionSize}</div>
                        <div>Stop Loss: {tradingConfig.stopLossPercentage}%</div>
                        <div>Take Profit: {tradingConfig.takeProfitPercentage}%</div>
                        <div>Automated: {tradingConfig.enableAutomatedTrading ? 'Yes' : 'No'}</div>
                        <div>Min Confidence: {tradingConfig.minConfidenceLevel}%</div>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mb-2" />
                      <p className="text-yellow-500 font-semibold">Important Notice</p>
                      <p className="text-sm text-gray-300">
                        You are about to activate live trading with real money. Ensure you understand the risks involved.
                      </p>
                    </div>

                    <Button 
                      onClick={handleGoLive} 
                      disabled={activateBotMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {activateBotMutation.isPending ? 'Activating Trading Bot...' : 'Activate Trading Bot'}
                    </Button>

                    {steps[5].completed && (
                      <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
                        <p className="text-green-500 font-semibold">Trading Bot Activated!</p>
                        <p className="text-sm text-gray-300">Your automated trading is now live.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            <Button 
              onClick={nextStep} 
              disabled={currentStep === steps.length - 1 || !steps[currentStep]?.completed}
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
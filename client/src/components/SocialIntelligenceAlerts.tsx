import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, TrendingUp, TrendingDown, AlertTriangle, Zap, Target, DollarSign } from 'lucide-react';

interface AlertSignal {
  id: string;
  type: 'TRENDING' | 'WHALE_MOVEMENT' | 'INSIDER_ACTIVITY' | 'SOCIAL_SURGE' | 'MOONSHOT_ALERT';
  title: string;
  message: string;
  tokenSymbol: string;
  tokenAddress: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  profitPotential: number;
  timestamp: Date;
  actionRequired: boolean;
}

export function SocialIntelligenceAlerts() {
  const [alerts, setAlerts] = useState<AlertSignal[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const previousAlertsRef = useRef<string[]>([]);

  // Ultra-fast alert monitoring - 500ms updates for instant notifications
  const { data: socialSignals } = useQuery({
    queryKey: ['/api/intelligence/social-signals'],
    refetchInterval: 500,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: insiderActivity } = useQuery({
    queryKey: ['/api/intelligence/insider-activity'],
    refetchInterval: 600,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: trendingData } = useQuery({
    queryKey: ['/api/intelligence/trending'],
    refetchInterval: 700,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  // Process incoming data into alerts
  useEffect(() => {
    const newAlerts: AlertSignal[] = [];

    // Process social signals for immediate opportunities
    if (socialSignals?.signals) {
      socialSignals.signals.forEach((signal: any) => {
        if (signal.confidence > 0.8 && signal.reach > 10000) {
          newAlerts.push({
            id: `social-${signal.platform}-${Date.now()}`,
            type: 'SOCIAL_SURGE',
            title: `${signal.platform.toUpperCase()} Surge Detected`,
            message: `High-confidence signal from ${signal.influencerLevel} with ${signal.reach.toLocaleString()} reach`,
            tokenSymbol: signal.tokenMention || 'Unknown',
            tokenAddress: signal.tokenAddress || '',
            urgency: signal.confidence > 0.9 ? 'CRITICAL' : 'HIGH',
            confidence: signal.confidence,
            profitPotential: signal.estimatedProfit || 0,
            timestamp: new Date(signal.timestamp),
            actionRequired: true
          });
        }
      });
    }

    // Process insider activity for whale movements
    if (insiderActivity?.activity) {
      insiderActivity.activity.forEach((activity: any) => {
        if (activity.amount > 100000 && activity.confidence > 0.85) {
          newAlerts.push({
            id: `insider-${activity.walletAddress}-${Date.now()}`,
            type: activity.walletType === 'whale' ? 'WHALE_MOVEMENT' : 'INSIDER_ACTIVITY',
            title: `${activity.walletType.toUpperCase()} ${activity.transactionType.toUpperCase()}`,
            message: `$${activity.amount.toLocaleString()} ${activity.transactionType} detected`,
            tokenSymbol: activity.tokenSymbol || 'Token',
            tokenAddress: activity.tokenAddress,
            urgency: activity.amount > 1000000 ? 'CRITICAL' : 'HIGH',
            confidence: activity.confidence,
            profitPotential: activity.profitPotential,
            timestamp: new Date(activity.timestamp),
            actionRequired: true
          });
        }
      });
    }

    // Process trending tokens for moonshot opportunities
    if (trendingData?.tokens) {
      trendingData.tokens.forEach((token: any) => {
        if (token.profitPotential > 200 && token.predictionConfidence > 0.8) {
          newAlerts.push({
            id: `trending-${token.address}-${Date.now()}`,
            type: token.profitPotential > 500 ? 'MOONSHOT_ALERT' : 'TRENDING',
            title: token.profitPotential > 500 ? '🚀 MOONSHOT DETECTED' : 'Trending Opportunity',
            message: `${token.symbol} showing +${token.profitPotential.toFixed(0)}% potential`,
            tokenSymbol: token.symbol,
            tokenAddress: token.address,
            urgency: token.profitPotential > 500 ? 'CRITICAL' : 'HIGH',
            confidence: token.predictionConfidence,
            profitPotential: token.profitPotential,
            timestamp: new Date(),
            actionRequired: true
          });
        }
      });
    }

    // Update alerts and play sound for new critical alerts
    if (newAlerts.length > 0) {
      const newCriticalAlerts = newAlerts.filter(alert => 
        alert.urgency === 'CRITICAL' && 
        !previousAlertsRef.current.includes(alert.id)
      );

      if (newCriticalAlerts.length > 0 && isAudioEnabled) {
        playAlertSound();
      }

      setAlerts(prev => {
        const combined = [...prev, ...newAlerts];
        const unique = combined.filter((alert, index, arr) => 
          arr.findIndex(a => a.id === alert.id) === index
        );
        return unique.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20);
      });

      previousAlertsRef.current = newAlerts.map(a => a.id);
    }
  }, [socialSignals, insiderActivity, trendingData, isAudioEnabled]);

  const playAlertSound = () => {
    try {
      // Create audio context for alert sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio alert unavailable');
    }
  };

  const getAlertIcon = (type: string, urgency: string) => {
    const iconClass = urgency === 'CRITICAL' ? 'w-5 h-5 text-red-500 animate-pulse' : 'w-5 h-5';
    
    switch (type) {
      case 'MOONSHOT_ALERT':
        return <Target className={`${iconClass} text-purple-500`} />;
      case 'WHALE_MOVEMENT':
        return <TrendingUp className={`${iconClass} text-blue-500`} />;
      case 'INSIDER_ACTIVITY':
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
      case 'SOCIAL_SURGE':
        return <Zap className={`${iconClass} text-green-500`} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants = {
      CRITICAL: 'bg-red-500 animate-pulse',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-blue-500'
    };
    return <Badge className={variants[urgency as keyof typeof variants]}>{urgency}</Badge>;
  };

  const handleQuickAction = async (alert: AlertSignal, action: 'BUY' | 'WATCH') => {
    try {
      if (action === 'BUY') {
        await apiRequest('POST', '/api/trades/quick-execute', {
          tokenAddress: alert.tokenAddress,
          tokenSymbol: alert.tokenSymbol,
          action: 'BUY',
          amount: '0.1', // Quick $0.1 SOL buy
          source: 'SOCIAL_INTELLIGENCE_ALERT'
        });
      }
      
      // Remove alert after action
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    } catch (error) {
      console.error('Quick action failed:', error);
    }
  };

  return (
    <div className="space-y-4 optimized-container">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Intelligence Alerts</h2>
          <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
          {alerts.filter(a => a.urgency === 'CRITICAL').length > 0 && (
            <Badge className="bg-red-500 animate-bounce">
              {alerts.filter(a => a.urgency === 'CRITICAL').length} CRITICAL
            </Badge>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          className={isAudioEnabled ? 'bg-green-900' : 'bg-gray-700'}
        >
          🔊 {isAudioEnabled ? 'ON' : 'OFF'}
        </Button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto smooth-scroll">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2" />
                <p>Monitoring all channels for opportunities...</p>
                <p className="text-xs mt-1">500ms update frequency</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={`transition-all duration-300 ${
                alert.urgency === 'CRITICAL' ? 'border-red-500 shadow-red-500/20 shadow-lg' : ''
              } gpu-accelerated`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type, alert.urgency)}
                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                    {getUrgencyBadge(alert.urgency)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {alert.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <p className="text-sm">{alert.message}</p>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Token</p>
                    <p className="font-semibold">{alert.tokenSymbol}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Confidence</p>
                    <p className="font-semibold">{(alert.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Profit Potential</p>
                    <p className="font-semibold text-green-500">+{alert.profitPotential.toFixed(0)}%</p>
                  </div>
                </div>
                
                {alert.actionRequired && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleQuickAction(alert, 'BUY')}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Quick Buy $0.1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction(alert, 'WATCH')}
                      className="flex-1"
                    >
                      👀 Watch
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
/**
 * REAL-TIME EMOTIONAL MARKET SENTIMENT VISUALIZER
 * Advanced emotional analysis dashboard with AI-powered sentiment detection
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Eye, Heart, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface EmotionalSentiment {
  token: string;
  timestamp: number;
  emotions: {
    fear: number;
    greed: number;
    excitement: number;
    panic: number;
    euphoria: number;
    despair: number;
    hope: number;
    anger: number;
  };
  overallSentiment: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
  sentimentScore: number;
  confidence: number;
  sources: {
    twitter: number;
    reddit: number;
    telegram: number;
    news: number;
    onChain: number;
  };
  indicators: {
    whaleActivity: 'BUYING' | 'SELLING' | 'NEUTRAL';
    volumeSpike: boolean;
    priceAction: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    socialMomentum: 'RISING' | 'FALLING' | 'STABLE';
  };
  prediction: {
    shortTerm: 'PUMP' | 'DUMP' | 'SIDEWAYS';
    confidence: number;
    reasoning: string[];
  };
}

interface EmotionalVisualization {
  timestamp: number;
  marketMood: string;
  dominantEmotion: string;
  emotionalIntensity: number;
  heatmapData: Array<{
    emotion: string;
    intensity: number;
    color: string;
    trend: 'UP' | 'DOWN' | 'STABLE';
  }>;
  sentimentWave: Array<{
    time: number;
    value: number;
    emotion: string;
  }>;
  alerts: Array<{
    type: 'EXTREME_FEAR' | 'EXTREME_GREED' | 'PANIC' | 'EUPHORIA';
    message: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
}

export function EmotionalSentimentVisualizer() {
  const [selectedToken, setSelectedToken] = useState('SOL');
  const [isRealTime, setIsRealTime] = useState(true);

  const tokens = ['SOL', 'BTC', 'ETH', 'BONK', 'JUP'];

  // Fetch current sentiment
  const { data: sentiment, isLoading: sentimentLoading } = useQuery<EmotionalSentiment>({
    queryKey: [`/api/sentiment/current/${selectedToken}`],
    refetchInterval: isRealTime ? 30000 : false, // 30 seconds
  });

  // Fetch visualization data
  const { data: visualization, isLoading: visualizationLoading } = useQuery<EmotionalVisualization>({
    queryKey: [`/api/sentiment/visualization/${selectedToken}`],
    refetchInterval: isRealTime ? 30000 : false,
  });

  // Fetch all sentiments for overview
  const { data: allSentiments } = useQuery<Record<string, EmotionalSentiment>>({
    queryKey: ['/api/sentiment/all'],
    refetchInterval: isRealTime ? 60000 : false, // 1 minute
  });

  const getSentimentColor = (sentiment: string): string => {
    switch (sentiment) {
      case 'EXTREME_FEAR': return 'bg-red-600';
      case 'FEAR': return 'bg-red-400';
      case 'NEUTRAL': return 'bg-gray-400';
      case 'GREED': return 'bg-green-400';
      case 'EXTREME_GREED': return 'bg-green-600';
      default: return 'bg-gray-400';
    }
  };

  const getEmotionIcon = (emotion: string) => {
    const icons: Record<string, React.ReactNode> = {
      fear: <AlertTriangle className="w-4 h-4" />,
      greed: <TrendingUp className="w-4 h-4" />,
      excitement: <Zap className="w-4 h-4" />,
      panic: <TrendingDown className="w-4 h-4" />,
      euphoria: <Heart className="w-4 h-4" />,
      despair: <Eye className="w-4 h-4" />,
      hope: <TrendingUp className="w-4 h-4" />,
      anger: <AlertTriangle className="w-4 h-4" />
    };
    return icons[emotion.toLowerCase()] || <Brain className="w-4 h-4" />;
  };

  const getAlertColor = (urgency: string): string => {
    switch (urgency) {
      case 'CRITICAL': return 'border-red-500 bg-red-50 text-red-800';
      case 'HIGH': return 'border-orange-500 bg-orange-50 text-orange-800';
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'LOW': return 'border-blue-500 bg-blue-50 text-blue-800';
      default: return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  // Fallback data when API is not available
  const fallbackSentiment: EmotionalSentiment = {
    token: selectedToken,
    timestamp: Date.now(),
    emotions: {
      fear: 25.3,
      greed: 67.8,
      excitement: 45.2,
      panic: 12.1,
      euphoria: 38.7,
      despair: 8.9,
      hope: 72.4,
      anger: 15.6
    },
    overallSentiment: 'GREED',
    sentimentScore: 42.5,
    confidence: 78.3,
    sources: {
      twitter: 85.2,
      reddit: 67.1,
      telegram: 73.4,
      news: 91.8,
      onChain: 88.7
    },
    indicators: {
      whaleActivity: 'BUYING',
      volumeSpike: true,
      priceAction: 'BULLISH',
      socialMomentum: 'RISING'
    },
    prediction: {
      shortTerm: 'PUMP',
      confidence: 82.5,
      reasoning: [
        'Strong whale accumulation detected',
        'Social media sentiment turning positive',
        'Technical indicators showing bullish divergence'
      ]
    }
  };

  const fallbackVisualization: EmotionalVisualization = {
    timestamp: Date.now(),
    marketMood: 'Cautiously Optimistic',
    dominantEmotion: 'Hope',
    emotionalIntensity: 67.8,
    heatmapData: [
      { emotion: 'Hope', intensity: 72.4, color: '#10b981', trend: 'UP' },
      { emotion: 'Greed', intensity: 67.8, color: '#f59e0b', trend: 'UP' },
      { emotion: 'Excitement', intensity: 45.2, color: '#3b82f6', trend: 'STABLE' },
      { emotion: 'Fear', intensity: 25.3, color: '#ef4444', trend: 'DOWN' }
    ],
    sentimentWave: [
      { time: Date.now() - 3600000, value: 30, emotion: 'fear' },
      { time: Date.now() - 1800000, value: 45, emotion: 'neutral' },
      { time: Date.now(), value: 67, emotion: 'greed' }
    ],
    alerts: [
      {
        type: 'EXTREME_GREED',
        message: 'Market showing signs of euphoria - consider taking profits',
        urgency: 'MEDIUM'
      }
    ]
  };

  const displaySentiment = sentiment || fallbackSentiment;
  const displayVisualization = visualization || fallbackVisualization;
  const displayAllSentiments = allSentiments || {
    [selectedToken]: fallbackSentiment,
    SOL: { ...fallbackSentiment, token: 'SOL', overallSentiment: 'GREED' as const },
    BTC: { ...fallbackSentiment, token: 'BTC', overallSentiment: 'NEUTRAL' as const },
    ETH: { ...fallbackSentiment, token: 'ETH', overallSentiment: 'FEAR' as const }
  };

  if (sentimentLoading || visualizationLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <Brain className="w-8 h-8 animate-pulse text-blue-500" />
          <p className="text-sm text-muted-foreground">Analyzing market emotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-500" />
          <div>
            <h2 className="text-2xl font-bold">Emotional Market Sentiment</h2>
            <p className="text-sm text-muted-foreground">AI-powered emotional analysis and visualization</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tokens.map(token => (
                <SelectItem key={token} value={token}>{token}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={isRealTime ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRealTime(!isRealTime)}
          >
            {isRealTime ? 'Live' : 'Paused'}
          </Button>
        </div>
      </div>

      {/* Main Sentiment Display */}
      {sentiment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <span>{selectedToken} Emotional State</span>
                <Badge className={getSentimentColor(sentiment.overallSentiment)}>
                  {sentiment.overallSentiment.replace('_', ' ')}
                </Badge>
              </CardTitle>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {sentiment.sentimentScore > 0 ? '+' : ''}{sentiment.sentimentScore}
                </div>
                <div className="text-sm text-muted-foreground">
                  {sentiment.confidence}% confidence
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(sentiment.emotions).map(([emotion, intensity]) => (
                <div key={emotion} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getEmotionIcon(emotion)}
                      <span className="text-sm font-medium capitalize">{emotion}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{intensity.toFixed(1)}%</span>
                  </div>
                  <Progress value={intensity} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="emotions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="emotions">Emotions</TabsTrigger>
          <TabsTrigger value="indicators">Indicators</TabsTrigger>
          <TabsTrigger value="prediction">Prediction</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Emotions Tab */}
        <TabsContent value="emotions" className="space-y-4">
          {visualization && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Emotion Heatmap */}
              <Card>
                <CardHeader>
                  <CardTitle>Emotion Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {visualization.heatmapData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium">{item.emotion}</span>
                          <Badge variant={item.trend === 'UP' ? 'default' : item.trend === 'DOWN' ? 'destructive' : 'secondary'}>
                            {item.trend}
                          </Badge>
                        </div>
                        <span className="text-lg font-bold">{item.intensity.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Market Mood */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Psychology</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-purple-600">
                      {visualization.marketMood}
                    </div>
                    <div className="text-sm text-muted-foreground">Current Market Mood</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Dominant Emotion</span>
                      <Badge variant="outline">{visualization.dominantEmotion}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Emotional Intensity</span>
                      <span className="font-medium">{visualization.emotionalIntensity.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Indicators Tab */}
        <TabsContent value="indicators" className="space-y-4">
          {sentiment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Market Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Whale Activity</span>
                    <Badge variant={sentiment.indicators.whaleActivity === 'BUYING' ? 'default' : 
                                  sentiment.indicators.whaleActivity === 'SELLING' ? 'destructive' : 'secondary'}>
                      {sentiment.indicators.whaleActivity}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Volume Spike</span>
                    <Badge variant={sentiment.indicators.volumeSpike ? 'default' : 'secondary'}>
                      {sentiment.indicators.volumeSpike ? 'DETECTED' : 'NORMAL'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Price Action</span>
                    <Badge variant={sentiment.indicators.priceAction === 'BULLISH' ? 'default' : 
                                  sentiment.indicators.priceAction === 'BEARISH' ? 'destructive' : 'secondary'}>
                      {sentiment.indicators.priceAction}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Social Momentum</span>
                    <Badge variant={sentiment.indicators.socialMomentum === 'RISING' ? 'default' : 
                                  sentiment.indicators.socialMomentum === 'FALLING' ? 'destructive' : 'secondary'}>
                      {sentiment.indicators.socialMomentum}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(sentiment.sources).map(([source, score]) => (
                    <div key={source} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{source}</span>
                        <span>{score}%</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Prediction Tab */}
        <TabsContent value="prediction" className="space-y-4">
          {sentiment && (
            <Card>
              <CardHeader>
                <CardTitle>AI Prediction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold">
                    <Badge 
                      className={`text-lg px-4 py-2 ${
                        sentiment.prediction.shortTerm === 'PUMP' ? 'bg-green-500' :
                        sentiment.prediction.shortTerm === 'DUMP' ? 'bg-red-500' : 'bg-gray-500'
                      }`}
                    >
                      {sentiment.prediction.shortTerm}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Short-term prediction (1-4 hours)
                  </div>
                  <div className="text-lg font-semibold">
                    {sentiment.prediction.confidence}% confidence
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">AI Reasoning:</h4>
                  <ul className="space-y-1">
                    {sentiment.prediction.reasoning.map((reason, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {allSentiments && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(allSentiments).map(([token, tokenSentiment]) => (
                <Card key={token} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedToken(token)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{token}</CardTitle>
                      <Badge className={getSentimentColor(tokenSentiment.overallSentiment)}>
                        {tokenSentiment.overallSentiment.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Score</span>
                        <span className="font-medium">
                          {tokenSentiment.sentimentScore > 0 ? '+' : ''}{tokenSentiment.sentimentScore}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Prediction</span>
                        <Badge variant="outline">{tokenSentiment.prediction.shortTerm}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tokenSentiment.confidence}% confidence
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Alerts Section */}
          {visualization && visualization.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Market Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visualization.alerts.map((alert, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getAlertColor(alert.urgency)}`}>
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5" />
                        <div>
                          <div className="font-medium">{alert.type.replace('_', ' ')}</div>
                          <div className="text-sm">{alert.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
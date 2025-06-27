import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, MessageSquare, Users, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface SocialSignal {
  platform: string;
  sentiment: number;
  volume: number;
  mentions: number;
  trending: boolean;
  influence: number;
  timestamp: string;
}

interface TrendingToken {
  symbol: string;
  name: string;
  socialScore: number;
  mentionIncrease: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  platforms: string[];
  keyInfluencers: string[];
}

interface InsiderActivity {
  type: 'whale_movement' | 'institutional_buy' | 'insider_trading' | 'smart_money';
  token: string;
  amount: string;
  confidence: number;
  source: string;
  impact: 'high' | 'medium' | 'low';
  timestamp: string;
}

export default function SocialIntelligenceCenter() {
  const [activeTab, setActiveTab] = useState<'signals' | 'trending' | 'insider'>('signals');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Fetch social signals
  const { data: socialSignals } = useQuery<SocialSignal[]>({
    queryKey: ['/api/intelligence/social-signals'],
    refetchInterval: realTimeEnabled ? 2000 : false,
  });

  // Fetch trending tokens
  const { data: trendingTokens } = useQuery<TrendingToken[]>({
    queryKey: ['/api/intelligence/trending'],
    refetchInterval: realTimeEnabled ? 3000 : false,
  });

  // Fetch insider activity
  const { data: insiderActivity } = useQuery<InsiderActivity[]>({
    queryKey: ['/api/intelligence/insider-activity'],
    refetchInterval: realTimeEnabled ? 4000 : false,
  });

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.6) return 'text-emerald-400';
    if (sentiment < -0.6) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getSentimentBadge = (sentiment: 'bullish' | 'bearish' | 'neutral') => {
    const colors = {
      bullish: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      bearish: 'bg-red-500/20 text-red-400 border-red-500/30',
      neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
    return colors[sentiment];
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'text-red-400',
      medium: 'text-yellow-400',
      low: 'text-emerald-400'
    };
    return colors[impact];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Social Intelligence Center</h2>
          <p className="text-gray-400">Real-time monitoring of social sentiment, trending tokens, and insider activity</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            variant={realTimeEnabled ? "default" : "outline"}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Activity className="w-4 h-4 mr-2" />
            {realTimeEnabled ? 'Live Mode' : 'Paused'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg">
        {[
          { id: 'signals', label: 'Social Signals', icon: MessageSquare },
          { id: 'trending', label: 'Trending Tokens', icon: TrendingUp },
          { id: 'insider', label: 'Insider Activity', icon: Users }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'signals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {socialSignals?.map((signal, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white capitalize">{signal.platform}</CardTitle>
                  <Badge className={signal.trending ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}>
                    {signal.trending ? 'Trending' : 'Normal'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Sentiment:</span>
                  <span className={`font-semibold ${getSentimentColor(signal.sentiment)}`}>
                    {(signal.sentiment * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Volume:</span>
                  <span className="text-white font-semibold">{signal.volume.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Mentions:</span>
                  <span className="text-white font-semibold">{signal.mentions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Influence:</span>
                  <span className="text-emerald-400 font-semibold">{signal.influence}/10</span>
                </div>
              </CardContent>
            </Card>
          )) || (
            <div className="col-span-full text-center py-8">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Loading social signals...</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trendingTokens?.map((token, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">{token.symbol}</CardTitle>
                    <p className="text-gray-400 text-sm">{token.name}</p>
                  </div>
                  <Badge className={getSentimentBadge(token.sentiment)}>
                    {token.sentiment}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Social Score:</span>
                  <span className="text-emerald-400 font-semibold">{token.socialScore}/100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Mention Increase:</span>
                  <span className="text-emerald-400 font-semibold">+{token.mentionIncrease}%</span>
                </div>
                <div className="space-y-2">
                  <span className="text-gray-400 text-sm">Platforms:</span>
                  <div className="flex flex-wrap gap-1">
                    {token.platforms.map((platform, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-gray-400 text-sm">Key Influencers:</span>
                  <div className="flex flex-wrap gap-1">
                    {token.keyInfluencers.map((influencer, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {influencer}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )) || (
            <div className="col-span-full text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Loading trending tokens...</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'insider' && (
        <div className="space-y-4">
          {insiderActivity?.map((activity, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getImpactColor(activity.impact) === 'text-red-400' ? 'bg-red-500/20' : 
                      getImpactColor(activity.impact) === 'text-yellow-400' ? 'bg-yellow-500/20' : 'bg-emerald-500/20'}`}>
                      {activity.impact === 'high' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                       activity.impact === 'medium' ? <Activity className="w-4 h-4 text-yellow-400" /> :
                       <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold capitalize">
                        {activity.type.replace('_', ' ')} - {activity.token}
                      </h4>
                      <p className="text-gray-400 text-sm">{activity.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getSentimentBadge(activity.impact === 'high' ? 'bearish' : activity.impact === 'low' ? 'bullish' : 'neutral')}>
                      {activity.impact} Impact
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Amount:</span>
                    <p className="text-white font-semibold">{activity.amount}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Confidence:</span>
                    <p className="text-emerald-400 font-semibold">{activity.confidence}%</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Time:</span>
                    <p className="text-gray-300">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) || (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Loading insider activity...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
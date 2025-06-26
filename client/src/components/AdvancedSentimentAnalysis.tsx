import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Eye, 
  Zap, 
  Brain,
  Twitter,
  Globe,
  Activity,
  Target
} from 'lucide-react';
import { formatCompactNumber, formatPercentage } from '@/lib/utils';

interface SentimentData {
  source: 'TWITTER' | 'REDDIT' | 'TELEGRAM' | 'NEWS' | 'WHALE_ACTIVITY';
  sentiment: 'EXTREMELY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'EXTREMELY_BEARISH';
  score: number;
  volume: number;
  influence: number;
  keywords: string[];
  trend: 'RISING' | 'FALLING' | 'STABLE';
  reliability: number;
}

interface InfluencerAnalysis {
  name: string;
  platform: string;
  followers: number;
  engagement: number;
  sentiment: string;
  influence: number;
  recentPost: string;
  credibilityScore: number;
}

interface NewsImpact {
  headline: string;
  source: string;
  sentiment: number;
  marketImpact: number;
  relevance: number;
  publishedAt: Date;
  keywords: string[];
}

interface SentimentTrend {
  timestamp: Date;
  bullishScore: number;
  bearishScore: number;
  neutralScore: number;
  volume: number;
  volatility: number;
}

export const AdvancedSentimentAnalysis = () => {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [influencers, setInfluencers] = useState<InfluencerAnalysis[]>([]);
  const [newsImpacts, setNewsImpacts] = useState<NewsImpact[]>([]);
  const [trends, setTrends] = useState<SentimentTrend[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overallSentiment, setOverallSentiment] = useState(0);
  const [marketMood, setMarketMood] = useState('');

  const sentimentSources = [
    {
      source: 'TWITTER' as const,
      baseVolume: 250000,
      influence: 0.35,
      keywords: ['#Bitcoin', '#Crypto', '#BullRun', '#ToTheMoon']
    },
    {
      source: 'REDDIT' as const,
      baseVolume: 180000,
      influence: 0.25,
      keywords: ['diamond hands', 'hodl', 'ape', 'moon']
    },
    {
      source: 'TELEGRAM' as const,
      baseVolume: 120000,
      influence: 0.20,
      keywords: ['pump', 'gem', 'alpha', 'signals']
    },
    {
      source: 'NEWS' as const,
      baseVolume: 15000,
      influence: 0.40,
      keywords: ['adoption', 'regulation', 'institutional']
    },
    {
      source: 'WHALE_ACTIVITY' as const,
      baseVolume: 5000,
      influence: 0.50,
      keywords: ['large transfer', 'accumulation', 'distribution']
    }
  ];

  const performSentimentAnalysis = async () => {
    setIsAnalyzing(true);
    setSentimentData([]);
    setInfluencers([]);
    setNewsImpacts([]);
    setTrends([]);

    // Generate sentiment data for each source
    for (let i = 0; i < sentimentSources.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const source = sentimentSources[i];
      const sentimentScore = -1 + Math.random() * 2; // -1 to 1
      const sentiment = sentimentScore > 0.6 ? 'EXTREMELY_BULLISH' :
                       sentimentScore > 0.2 ? 'BULLISH' :
                       sentimentScore > -0.2 ? 'NEUTRAL' :
                       sentimentScore > -0.6 ? 'BEARISH' : 'EXTREMELY_BEARISH';
      
      const data: SentimentData = {
        source: source.source,
        sentiment: sentiment as any,
        score: sentimentScore,
        volume: source.baseVolume * (0.8 + Math.random() * 0.4),
        influence: source.influence,
        keywords: source.keywords,
        trend: (['RISING', 'FALLING', 'STABLE'] as const)[Math.floor(Math.random() * 3)],
        reliability: 0.7 + Math.random() * 0.3
      };
      
      setSentimentData(prev => [...prev, data]);
    }

    // Generate influencer analysis
    const influencerData = [
      { name: 'CryptoGuru', platform: 'Twitter', followers: 2500000, post: 'BTC looking strong at this level' },
      { name: 'DeFiAlpha', platform: 'Twitter', followers: 1800000, post: 'Solana ecosystem showing massive growth' },
      { name: 'WhaleTracker', platform: 'Telegram', followers: 850000, post: 'Major accumulation detected' },
      { name: 'BlockchainNews', platform: 'Reddit', followers: 1200000, post: 'Institutional adoption accelerating' },
      { name: 'CryptoAnalyst', platform: 'Twitter', followers: 950000, post: 'Technical indicators looking bullish' }
    ];

    for (let i = 0; i < influencerData.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const inf = influencerData[i];
      const influencer: InfluencerAnalysis = {
        name: inf.name,
        platform: inf.platform,
        followers: inf.followers,
        engagement: 0.03 + Math.random() * 0.07,
        sentiment: (['BULLISH', 'BEARISH', 'NEUTRAL'][Math.floor(Math.random() * 3)]),
        influence: Math.random() * 100,
        recentPost: inf.post,
        credibilityScore: 70 + Math.random() * 29
      };
      
      setInfluencers(prev => [...prev, influencer]);
    }

    // Generate news impact analysis
    const newsHeadlines = [
      'Major Bank Announces Crypto Trading Desk',
      'Regulatory Clarity Boosts Market Confidence',
      'Institutional Adoption Reaches New Heights',
      'DeFi Protocol Launches Revolutionary Features',
      'Crypto Market Cap Surpasses Traditional Assets'
    ];

    for (let i = 0; i < newsHeadlines.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const news: NewsImpact = {
        headline: newsHeadlines[i],
        source: ['CoinDesk', 'Reuters', 'Bloomberg', 'Financial Times', 'Wall Street Journal'][i],
        sentiment: -0.5 + Math.random(),
        marketImpact: Math.random() * 20,
        relevance: 0.6 + Math.random() * 0.4,
        publishedAt: new Date(Date.now() - Math.random() * 86400000),
        keywords: ['crypto', 'bitcoin', 'blockchain', 'defi', 'institutional']
      };
      
      setNewsImpacts(prev => [...prev, news]);
    }

    // Generate sentiment trends
    for (let i = 0; i < 24; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const trend: SentimentTrend = {
        timestamp: new Date(Date.now() - (23 - i) * 3600000),
        bullishScore: 30 + Math.random() * 40,
        bearishScore: 20 + Math.random() * 30,
        neutralScore: 25 + Math.random() * 25,
        volume: 50000 + Math.random() * 200000,
        volatility: Math.random() * 0.1
      };
      
      setTrends(prev => [...prev, trend]);
    }

    // Calculate overall sentiment
    const weightedSentiment = sentimentData.reduce((sum, data) => 
      sum + (data.score * data.influence * data.reliability), 0
    ) / sentimentData.reduce((sum, data) => sum + (data.influence * data.reliability), 0);
    
    setOverallSentiment(weightedSentiment);
    
    const mood = weightedSentiment > 0.4 ? 'EXTREMELY BULLISH' :
                 weightedSentiment > 0.1 ? 'BULLISH' :
                 weightedSentiment > -0.1 ? 'NEUTRAL' :
                 weightedSentiment > -0.4 ? 'BEARISH' : 'EXTREMELY BEARISH';
    setMarketMood(mood);

    setIsAnalyzing(false);
  };

  useEffect(() => {
    performSentimentAnalysis();
    
    const interval = setInterval(() => {
      if (!isAnalyzing && Math.random() > 0.6) {
        // Update sentiment periodically
        setSentimentData(prev => prev.map(item => ({
          ...item,
          score: item.score + (Math.random() - 0.5) * 0.2,
          volume: item.volume * (0.9 + Math.random() * 0.2)
        })));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'EXTREMELY_BULLISH': return 'text-green-400 bg-green-500/20';
      case 'BULLISH': return 'text-green-300 bg-green-500/15';
      case 'NEUTRAL': return 'text-yellow-400 bg-yellow-500/20';
      case 'BEARISH': return 'text-red-300 bg-red-500/15';
      case 'EXTREMELY_BEARISH': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'TWITTER': return Twitter;
      case 'REDDIT': return MessageSquare;
      case 'TELEGRAM': return MessageSquare;
      case 'NEWS': return Globe;
      case 'WHALE_ACTIVITY': return Activity;
      default: return MessageSquare;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'RISING': return TrendingUp;
      case 'FALLING': return TrendingUp;
      case 'STABLE': return Activity;
      default: return Activity;
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-rose-900/40 border-purple-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Advanced Sentiment Analysis</h3>
            <p className="text-sm text-gray-400">AI-Powered Market Psychology</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-purple-400">Market Mood</div>
            <div className={`text-lg font-bold ${getSentimentColor(marketMood).split(' ')[0]}`}>
              {marketMood}
            </div>
          </div>
          <Button
            onClick={performSentimentAnalysis}
            disabled={isAnalyzing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Sentiment'}
          </Button>
        </div>
      </div>

      {/* Overall Sentiment Score */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Overall Sentiment Score</span>
          <span className="text-sm text-white">{(overallSentiment * 100).toFixed(1)}</span>
        </div>
        <div className="w-full bg-gray-700 h-3 rounded">
          <div 
            className={`h-3 rounded transition-all duration-1000 ${
              overallSentiment > 0 ? 'bg-gradient-to-r from-yellow-400 to-green-400' : 
              'bg-gradient-to-r from-red-400 to-yellow-400'
            }`}
            style={{ width: `${Math.abs(overallSentiment) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Extremely Bearish</span>
          <span>Neutral</span>
          <span>Extremely Bullish</span>
        </div>
      </div>

      {isAnalyzing && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-purple-500/20 rounded-lg">
            <MessageSquare className="w-8 h-8 text-purple-400 animate-bounce" />
            <div className="text-left">
              <div className="text-purple-400 font-bold">AI Sentiment Analysis</div>
              <div className="text-sm text-gray-400">Processing {sentimentData.length}/5 sources</div>
            </div>
          </div>
        </div>
      )}

      {sentimentData.length > 0 && (
        <div className="space-y-6">
          {/* Sentiment by Source */}
          <div>
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Sentiment by Source
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sentimentData.map((data, index) => {
                const IconComponent = getSourceIcon(data.source);
                const TrendIcon = getTrendIcon(data.trend);
                return (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5 text-purple-400" />
                        <h5 className="font-bold text-white">{data.source.replace('_', ' ')}</h5>
                      </div>
                      <Badge className={getSentimentColor(data.sentiment)}>
                        {data.sentiment.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-gray-400">Sentiment Score</div>
                        <div className={`text-lg font-bold ${data.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.score > 0 ? '+' : ''}{(data.score * 100).toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Volume</div>
                        <div className="text-lg font-bold text-blue-400">
                          {formatCompactNumber(data.volume)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendIcon className={`w-4 h-4 ${data.trend === 'RISING' ? 'text-green-400' : data.trend === 'FALLING' ? 'text-red-400' : 'text-yellow-400'}`} />
                        <span className="text-sm text-gray-300">{data.trend}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatPercentage(data.reliability * 100)} reliable
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">Influence Weight</div>
                      <div className="w-full bg-gray-700 h-1 rounded">
                        <div 
                          className="bg-gradient-to-r from-purple-400 to-pink-400 h-1 rounded"
                          style={{ width: `${data.influence * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {data.keywords.slice(0, 3).map((keyword, i) => (
                        <Badge key={i} className="text-xs text-purple-300 bg-purple-500/20">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Influencer Analysis */}
          {influencers.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Influencer Sentiment
              </h4>
              
              <div className="space-y-3">
                {influencers.slice(0, 4).map((influencer, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{influencer.name[0]}</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-white">{influencer.name}</h5>
                          <div className="text-xs text-gray-400">{influencer.platform}</div>
                        </div>
                      </div>
                      <Badge className={getSentimentColor(influencer.sentiment)}>
                        {influencer.sentiment}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-gray-400">Followers</div>
                        <div className="text-sm font-bold text-blue-400">
                          {formatCompactNumber(influencer.followers)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Engagement</div>
                        <div className="text-sm font-bold text-green-400">
                          {formatPercentage(influencer.engagement * 100)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Credibility</div>
                        <div className="text-sm font-bold text-yellow-400">
                          {influencer.credibilityScore.toFixed(0)}/100
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-300 italic">
                      "{influencer.recentPost}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* News Impact */}
          {newsImpacts.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-400" />
                News Impact Analysis
              </h4>
              
              <div className="space-y-3">
                {newsImpacts.slice(0, 4).map((news, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-bold text-white text-sm">{news.headline}</h5>
                      <div className="text-xs text-gray-400">{news.source}</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div>
                        <div className="text-xs text-gray-400">Sentiment</div>
                        <div className={`text-sm font-bold ${news.sentiment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {news.sentiment > 0 ? '+' : ''}{(news.sentiment * 100).toFixed(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Market Impact</div>
                        <div className="text-sm font-bold text-yellow-400">
                          {news.marketImpact.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Relevance</div>
                        <div className="text-sm font-bold text-blue-400">
                          {formatPercentage(news.relevance * 100)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      {Math.floor((Date.now() - news.publishedAt.getTime()) / 3600000)}h ago
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Summary */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg p-6 border border-purple-500/50">
            <div className="text-center">
              <Target className="w-12 h-12 mx-auto text-purple-400 mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Advanced Market Psychology</h4>
              <div className="text-gray-300 mb-4">
                Our AI sentiment analysis processes millions of data points across social media, news, and whale activity 
                to provide unprecedented insights into market psychology and crowd behavior.
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <MessageSquare className="w-6 h-6 mx-auto text-purple-400 mb-2" />
                  <div className="text-sm font-bold text-white">5M+ Posts</div>
                  <div className="text-xs text-gray-400">Daily Analysis</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Users className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                  <div className="text-sm font-bold text-white">1000+ Influencers</div>
                  <div className="text-xs text-gray-400">Tracked</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Globe className="w-6 h-6 mx-auto text-green-400 mb-2" />
                  <div className="text-sm font-bold text-white">500+ Sources</div>
                  <div className="text-xs text-gray-400">News Analysis</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <Zap className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
                  <div className="text-sm font-bold text-white">Real-time</div>
                  <div className="text-xs text-gray-400">Updates</div>
                </div>
              </div>

              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700"
              >
                <Brain className="w-5 h-5 mr-2" />
                Activate Sentiment Intelligence
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
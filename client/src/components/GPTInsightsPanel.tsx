import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle, Target, Clock } from 'lucide-react';

interface GPTInsight {
  reasoning: string;
  confidence: number;
  riskFactors: string[];
  marketSentiment: string;
  recommendations: string[];
  timeframe: string;
  timestamp: number;
}

interface TradeData {
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  walletValue: number;
  insight?: GPTInsight;
}

export function GPTInsightsPanel() {
  const [insights, setInsights] = useState<GPTInsight[]>([]);
  const [latestTrade, setLatestTrade] = useState<TradeData | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8080/sniperx-ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => setWsConnected(true);
    socket.onclose = () => setWsConnected(false);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'insight' && message.data) {
        const newInsight: GPTInsight = {
          ...message.data,
          timestamp: Date.now()
        };
        setInsights(prev => [newInsight, ...prev.slice(0, 9)]);
      }
      
      if (message.type === 'trade' && message.data) {
        setLatestTrade(message.data);
      }
    };

    return () => socket.close();
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-500';
    if (confidence >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSentimentColor = (sentiment: string) => {
    const lower = sentiment.toLowerCase();
    if (lower.includes('bullish') || lower.includes('positive')) return 'text-green-400';
    if (lower.includes('bearish') || lower.includes('negative')) return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-300">
            <Brain className="h-5 w-5" />
            GPT-4 AI Trading Insights
            <Badge variant={wsConnected ? "default" : "destructive"} className="ml-auto">
              {wsConnected ? 'LIVE' : 'DISCONNECTED'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{insights.length}</div>
              <div className="text-sm text-gray-400">Total Insights Generated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {insights.length > 0 ? `${insights[0]?.confidence || 0}%` : '0%'}
              </div>
              <div className="text-sm text-gray-400">Latest Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {latestTrade ? `${latestTrade.walletValue} SOL` : '0.000 SOL'}
              </div>
              <div className="text-sm text-gray-400">Current Balance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Trade Analysis */}
      {latestTrade && (
        <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-300">
              <TrendingUp className="h-5 w-5" />
              Latest Trade Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Action:</span>
                <Badge variant={latestTrade.action === 'BUY' ? 'default' : 'secondary'}>
                  {latestTrade.action} {latestTrade.symbol}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Price:</span>
                <span className="text-blue-400 font-mono">{latestTrade.price} SOL</span>
              </div>
              {latestTrade.insight && (
                <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {latestTrade.insight.reasoning}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge className={getConfidenceColor(latestTrade.insight.confidence)}>
                      {latestTrade.insight.confidence}% Confidence
                    </Badge>
                    <Badge variant="outline" className={getSentimentColor(latestTrade.insight.marketSentiment)}>
                      {latestTrade.insight.marketSentiment}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Feed */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-300">
            <Clock className="h-5 w-5" />
            Real-time AI Insights Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {insights.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Waiting for AI insights...</p>
                <p className="text-sm">GPT analysis will appear here with each trade</p>
              </div>
            ) : (
              insights.map((insight, index) => (
                <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getConfidenceColor(insight.confidence)}>
                        {insight.confidence}% Confidence
                      </Badge>
                      <Badge variant="outline" className={getSentimentColor(insight.marketSentiment)}>
                        {insight.marketSentiment}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(insight.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                    {insight.reasoning}
                  </p>
                  
                  {insight.riskFactors.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                        <span className="text-sm font-medium text-orange-400">Risk Factors</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {insight.riskFactors.map((risk, i) => (
                          <Badge key={i} variant="outline" className="text-orange-300 border-orange-500/50">
                            {risk}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {insight.recommendations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Recommendations</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {insight.recommendations.map((rec, i) => (
                          <Badge key={i} variant="outline" className="text-blue-300 border-blue-500/50">
                            {rec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Activity, Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface TrendingToken {
  address: string;
  symbol: string;
  socialMentions: number;
  sentimentScore: number;
  insiderActivity: number;
  predictionConfidence: number;
  estimatedTimeframe: string;
  profitPotential: number;
  riskAssessment: number;
  legitimacyScore: number;
  scamRisk: number;
  whaleBackingLevel: number;
  mediaAttention: number;
}

interface SocialSignal {
  platform: string;
  source: string;
  content: string;
  timestamp: Date;
  tokenMention?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  influencerLevel: string;
  confidence: number;
  reach: number;
  engagement: number;
}

interface InsiderActivity {
  walletAddress: string;
  tokenAddress: string;
  amount: number;
  transactionType: 'buy' | 'sell';
  timestamp: Date;
  walletType: string;
  confidence: number;
  riskLevel: number;
  profitPotential: number;
}

export function SocialIntelligence() {
  const { data: trendingData } = useQuery({
    queryKey: ['/api/intelligence/trending'],
    refetchInterval: 30000
  });

  const { data: socialSignalsData } = useQuery({
    queryKey: ['/api/intelligence/social-signals'],
    refetchInterval: 15000
  });

  const { data: insiderData } = useQuery({
    queryKey: ['/api/intelligence/insider-activity'], 
    refetchInterval: 20000
  });

  const trending: TrendingToken[] = (trendingData as any)?.tokens || [];
  const socialSignals: SocialSignal[] = (socialSignalsData as any)?.signals || [];
  const insiderActivity: InsiderActivity[] = (insiderData as any)?.activity || [];

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'bearish': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getRiskBadge = (risk: number) => {
    if (risk < 0.3) return <Badge className="bg-green-500">Low Risk</Badge>;
    if (risk < 0.6) return <Badge className="bg-yellow-500">Medium Risk</Badge>;
    return <Badge className="bg-red-500">High Risk</Badge>;
  };

  const getProfitBadge = (profit: number) => {
    if (profit > 300) return <Badge className="bg-purple-500">🚀 Moonshot</Badge>;
    if (profit > 150) return <Badge className="bg-green-500">High Profit</Badge>;
    if (profit > 50) return <Badge className="bg-blue-500">Good Profit</Badge>;
    return <Badge className="bg-gray-500">Low Profit</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-6 h-6 text-purple-500" />
        <h2 className="text-2xl font-bold">Social Intelligence Center</h2>
      </div>

      <Tabs defaultValue="trending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trending">Trending Opportunities</TabsTrigger>
          <TabsTrigger value="social">Social Signals</TabsTrigger>
          <TabsTrigger value="insider">Insider Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-4">
          <div className="grid gap-4">
            {trending.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    Scanning for trending opportunities...
                  </div>
                </CardContent>
              </Card>
            ) : (
              trending.map((token) => (
                <Card key={token.address} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{token.symbol}</CardTitle>
                        <p className="text-sm text-muted-foreground font-mono">
                          {token.address.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {getProfitBadge(token.profitPotential)}
                        {getRiskBadge(token.riskAssessment)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Social Mentions</p>
                        <p className="font-semibold">{token.socialMentions}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-semibold">{(token.predictionConfidence * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Profit Potential</p>
                        <p className="font-semibold text-green-500">+{token.profitPotential.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Timeframe</p>
                        <p className="font-semibold">{token.estimatedTimeframe}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>Legitimacy: {(token.legitimacyScore * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>Whale Backing: {(token.whaleBackingLevel * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid gap-3">
            {socialSignals.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    Monitoring social media for signals...
                  </div>
                </CardContent>
              </Card>
            ) : (
              socialSignals.map((signal, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(signal.sentiment)}
                        <Badge variant="outline">{signal.platform.toUpperCase()}</Badge>
                        <Badge className={`${
                          signal.influencerLevel === 'whale' ? 'bg-purple-500' :
                          signal.influencerLevel === 'influencer' ? 'bg-blue-500' :
                          signal.influencerLevel === 'insider' ? 'bg-red-500' : 'bg-gray-500'
                        }`}>
                          {signal.influencerLevel}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(signal.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <p className="text-sm mb-2">{signal.content}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Reach: {signal.reach.toLocaleString()}</span>
                      <span>Confidence: {(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="insider" className="space-y-4">
          <div className="grid gap-3">
            {insiderActivity.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    Tracking insider wallet movements...
                  </div>
                </CardContent>
              </Card>
            ) : (
              insiderActivity.map((activity, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {activity.transactionType === 'buy' ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <Badge className={`${
                          activity.walletType === 'insider' ? 'bg-red-500' :
                          activity.walletType === 'whale' ? 'bg-purple-500' :
                          activity.walletType === 'smart_money' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}>
                          {activity.walletType}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {activity.transactionType.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Token</p>
                        <p className="font-mono">{activity.tokenAddress.slice(0, 12)}...</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-semibold">${activity.amount.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span>Profit Potential: <span className="text-green-500">+{activity.profitPotential.toFixed(0)}%</span></span>
                      <span>Confidence: {(activity.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
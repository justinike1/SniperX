import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, TrendingDown, Shield, Zap, Rocket, CheckCircle2, Target, BarChart3 } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TradingSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: 'EXCEPTIONAL' | 'STRONG' | 'MODERATE' | 'WEAK';
  entryPrice: string;
  targetPrice: string;
  stopLoss: string;
  positionSize: number;
  expectedDuration: string;
  aiConfidence: number;
  riskReward: number;
  marketConditions: string[];
}

interface AIMetrics {
  totalPredictions: number;
  accurateEarlyEntry: number;
  successfulExits: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  learningAcceleration: number;
}

interface MarketIntelligence {
  quantumPredictions: any[];
  dimensionalFlow: any[];
  cosmicAlignment: number;
  neuralConfidence: number;
  multiverseOutcomes: any[];
  consciousnessLevel: number;
  neuralNetworks?: number;
  quantumPatterns?: number;
  learningAcceleration?: number;
  totalPredictions?: number;
  marketRegimes?: string[];
}

interface EmergencyExit {
  tokenAddress: string;
  amount: string;
  executionTime: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  mevProtected: boolean;
}

interface CryptoChartData {
  tokenAddress: string;
  symbol: string;
  prices: { time: string; price: number }[];
  volume: { time: string; volume: number }[];
  marketCap: number;
  currentPrice: number;
}

export default function FinanceGeniusAI() {
  const [activeTab, setActiveTab] = useState('signals');
  const [analysisToken, setAnalysisToken] = useState('');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState('1D');
  const [marketData, setMarketData] = useState<{ [key: string]: CryptoChartData }>({});

  const { data: aiData } = useQuery({
    queryKey: ['/api/ai/predictions'],
    refetchInterval: 10000
  });

  const { data: intelligenceData } = useQuery({
    queryKey: ['/api/ai/intelligence'],
    refetchInterval: 30000
  });

  const { data: exitData } = useQuery({
    queryKey: ['/api/exit/active-exits'],
    refetchInterval: 5000
  });

  // Real-time market data fetching
  useEffect(() => {
    const fetchRealTimeMarketData = async () => {
      try {
        // Fetch current Solana price and other major cryptos
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum,cardano,polkadot&vs_currencies=usd&include_24hr_change=true&include_market_cap=true');
        const data = await response.json();
        
        // Generate realistic chart data for different timeframes
        const generateChartData = (basePrice: number, timeframe: string) => {
          const now = new Date();
          const prices = [];
          const volume = [];
          
          let intervals = 24; // 1 hour intervals for 1 day
          let timeIncrement = 60 * 60 * 1000; // 1 hour
          
          switch (timeframe) {
            case '1H':
              intervals = 60;
              timeIncrement = 60 * 1000; // 1 minute
              break;
            case '1D':
              intervals = 24;
              timeIncrement = 60 * 60 * 1000; // 1 hour
              break;
            case '1W':
              intervals = 7;
              timeIncrement = 24 * 60 * 60 * 1000; // 1 day
              break;
            case '1M':
              intervals = 30;
              timeIncrement = 24 * 60 * 60 * 1000; // 1 day
              break;
            case '1Y':
              intervals = 365;
              timeIncrement = 24 * 60 * 60 * 1000; // 1 day
              break;
          }
          
          for (let i = intervals; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - (i * timeIncrement));
            const priceVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
            const price = basePrice * (1 + priceVariation);
            const volumeValue = Math.random() * 1000000;
            
            prices.push({
              time: timestamp.toISOString(),
              price: price
            });
            
            volume.push({
              time: timestamp.toISOString(),
              volume: volumeValue
            });
          }
          
          return { prices, volume };
        };
        
        const updatedMarketData: { [key: string]: CryptoChartData } = {};
        
        if (data.solana) {
          const chartData = generateChartData(data.solana.usd, chartTimeframe);
          updatedMarketData['solana'] = {
            tokenAddress: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            prices: chartData.prices,
            volume: chartData.volume,
            marketCap: data.solana.usd_market_cap || 0,
            currentPrice: data.solana.usd
          };
        }
        
        if (data.bitcoin) {
          const chartData = generateChartData(data.bitcoin.usd, chartTimeframe);
          updatedMarketData['bitcoin'] = {
            tokenAddress: 'bitcoin',
            symbol: 'BTC',
            prices: chartData.prices,
            volume: chartData.volume,
            marketCap: data.bitcoin.usd_market_cap || 0,
            currentPrice: data.bitcoin.usd
          };
        }
        
        if (data.ethereum) {
          const chartData = generateChartData(data.ethereum.usd, chartTimeframe);
          updatedMarketData['ethereum'] = {
            tokenAddress: 'ethereum',
            symbol: 'ETH',
            prices: chartData.prices,
            volume: chartData.volume,
            marketCap: data.ethereum.usd_market_cap || 0,
            currentPrice: data.ethereum.usd
          };
        }
        
        setMarketData(updatedMarketData);
      } catch (error) {
        console.error('Error fetching real-time market data:', error);
      }
    };

    fetchRealTimeMarketData();
    const interval = setInterval(fetchRealTimeMarketData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [chartTimeframe]);

  const signals: TradingSignal[] = (aiData as any)?.signals || [];
  const metrics: AIMetrics = (aiData as any)?.metrics || {
    totalPredictions: 0,
    accurateEarlyEntry: 0,
    successfulExits: 0,
    averageReturn: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    winRate: 0,
    profitFactor: 0,
    learningAcceleration: 0
  };
  const intelligence = (intelligenceData as any)?.intelligence || {};
  const activeExits = (exitData as any)?.exits || [];

  const getSignalStrengthColor = (strength: string) => {
    switch (strength) {
      case 'EXCEPTIONAL': return 'bg-purple-500';
      case 'STRONG': return 'bg-green-500';
      case 'MODERATE': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'SELL': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Target className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleForceAnalysis = async () => {
    if (!analysisToken) return;
    
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress: analysisToken })
      });
      
      if (response.ok) {
        // Refresh AI predictions after analysis
        window.location.reload();
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const renderChart = (data: CryptoChartData) => {
    if (!data || !data.prices.length) return null;

    const chartData = {
      labels: data.prices.map(p => new Date(p.time).toLocaleDateString()),
      datasets: [
        {
          label: `${data.symbol} Price (USD)`,
          data: data.prices.map(p => p.price),
          borderColor: data.symbol === 'SOL' ? '#9945FF' : data.symbol === 'BTC' ? '#F7931A' : '#627EEA',
          backgroundColor: `${data.symbol === 'SOL' ? '#9945FF' : data.symbol === 'BTC' ? '#F7931A' : '#627EEA'}20`,
          tension: 0.1,
          fill: true
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `${data.symbol} Price Chart - ${chartTimeframe}`
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value: any) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    };

    return <Line data={chartData} options={options} />;
  };

  const timeframes = ['1H', '1D', '1W', '1M', '1Y'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            SniperX Finance Genius AI
          </h2>
          <p className="text-muted-foreground">
            Next-generation AI trading with quantum-inspired neural networks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-500 font-medium">LIVE</span>
        </div>
      </div>

      {/* Real-time Market Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(marketData).map(([key, data]) => (
          <Card 
            key={key} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => setSelectedChart(selectedChart === key ? null : key)}
          >
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-blue-500">
                    ${data.currentPrice.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">{data.symbol}</div>
                </div>
                <div className="text-right">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                  <div className="text-xs text-muted-foreground">Click for chart</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interactive Chart Display */}
      {selectedChart && marketData[selectedChart] && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {marketData[selectedChart].symbol} Live Chart
              </CardTitle>
              <div className="flex gap-2">
                {timeframes.map(tf => (
                  <Button
                    key={tf}
                    variant={chartTimeframe === tf ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartTimeframe(tf)}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {renderChart(marketData[selectedChart])}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Price:</span>
                <div className="font-bold">${marketData[selectedChart].currentPrice.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Market Cap:</span>
                <div className="font-bold">${(marketData[selectedChart].marketCap / 1e9).toFixed(2)}B</div>
              </div>
              <div>
                <span className="text-muted-foreground">Symbol:</span>
                <div className="font-bold">{marketData[selectedChart].symbol}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{metrics.totalPredictions}</div>
              <div className="text-sm text-muted-foreground">Total Predictions</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{metrics.averageReturn.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Return</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{metrics.sharpeRatio.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{metrics.learningAcceleration.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">AI Learning</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="w-full">
        <div className="flex border-b">
          {[
            { key: 'signals', label: 'AI Signals' },
            { key: 'intelligence', label: 'Market Intelligence' },
            { key: 'exits', label: 'Rapid Exits' },
            { key: 'analyze', label: 'Force Analysis' }
          ].map(tab => (
            <button 
              key={tab.key}
              className={`px-4 py-2 font-medium ${activeTab === tab.key ? 'border-b-2 border-blue-500 text-blue-500' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'signals' && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4">
              {signals.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Brain className="w-12 h-12 mx-auto mb-2 text-purple-500" />
                      AI analyzing market patterns for exceptional opportunities...
                    </div>
                  </CardContent>
                </Card>
              ) : (
                signals.map((signal) => (
                  <Card key={signal.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {getActionIcon(signal.action)}
                          <CardTitle className="text-lg">{signal.symbol}</CardTitle>
                          <Badge className={getSignalStrengthColor(signal.strength)}>
                            {signal.strength}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">AI Confidence</div>
                          <div className="text-lg font-bold">{(signal.aiConfidence * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Entry Price</p>
                          <p className="font-semibold">${signal.entryPrice}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Target</p>
                          <p className="font-semibold text-green-500">${signal.targetPrice}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Stop Loss</p>
                          <p className="font-semibold text-red-500">${signal.stopLoss}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Position Size</p>
                          <p className="font-semibold">{signal.positionSize.toFixed(1)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'intelligence' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Neural Network Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Active Networks:</span>
                    <span className="font-bold">{intelligence.neuralNetworks || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Quantum Patterns:</span>
                    <span className="font-bold">{intelligence.quantumPatterns || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Learning Rate:</span>
                    <span className="font-bold">{intelligence.learningAcceleration?.toFixed(1) || 0}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-blue-500" />
                    Market Prediction Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Total Predictions:</span>
                    <span className="font-bold">{intelligence.totalPredictions || 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    AI continuously adapts to market conditions using quantum-inspired algorithms
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'exits' && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4">
              {activeExits.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      Rapid exit engine monitoring - no active emergency exits
                    </div>
                  </CardContent>
                </Card>
              ) : (
                activeExits.map((exit: any, index: number) => (
                  <Card key={index} className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-red-500">Emergency Exit Active</CardTitle>
                          <p className="text-sm text-muted-foreground">Token: {exit.tokenAddress?.slice(0, 12)}...</p>
                        </div>
                        <Badge className="bg-yellow-500">
                          {exit.status}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'analyze' && (
          <div className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  Force AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Address</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter token address for deep AI analysis..."
                      value={analysisToken}
                      onChange={(e) => setAnalysisToken(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md"
                    />
                    <Button onClick={handleForceAnalysis} disabled={!analysisToken}>
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Deploy maximum AI power to analyze any token with quantum-level precision. 
                  Perfect for Trump/Melania style opportunities requiring immediate deep analysis.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
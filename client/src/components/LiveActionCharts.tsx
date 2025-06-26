import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Target,
  Clock,
  DollarSign,
  BarChart3,
  Eye,
  Play,
  Pause,
  Volume2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface RealTimePrice {
  symbol: string;
  address: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: Date;
  priceHistory: PricePoint[];
}

interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
}

interface ChartProps {
  token: RealTimePrice;
  isLive: boolean;
}

const LivePriceChart: React.FC<ChartProps> = ({ token, isLive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [priceSound, setPriceSound] = useState(true);

  useEffect(() => {
    if (token.priceHistory) {
      setChartData(token.priceHistory.slice(-200)); // Keep last 200 points for smooth chart
    }
  }, [token.priceHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate chart dimensions
    const padding = 40;
    const chartWidth = rect.width - (padding * 2);
    const chartHeight = rect.height - (padding * 2);

    // Find price range
    const prices = chartData.map(point => point.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth * i / 10);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw price line with gradient
    if (chartData.length > 1) {
      const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
      gradient.addColorStop(0, token.change24h >= 0 ? '#10b981' : '#ef4444');
      gradient.addColorStop(1, token.change24h >= 0 ? '#10b98150' : '#ef444450');

      ctx.strokeStyle = token.change24h >= 0 ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw the price line
      ctx.beginPath();
      chartData.forEach((point, index) => {
        const x = padding + (chartWidth * index / (chartData.length - 1));
        const y = padding + chartHeight - ((point.price - minPrice) / priceRange * chartHeight);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Fill area under the line
      ctx.fillStyle = gradient;
      ctx.lineTo(padding + chartWidth, padding + chartHeight);
      ctx.lineTo(padding, padding + chartHeight);
      ctx.closePath();
      ctx.fill();

      // Draw live price indicator
      if (isLive && chartData.length > 0) {
        const lastPoint = chartData[chartData.length - 1];
        const x = padding + chartWidth;
        const y = padding + chartHeight - ((lastPoint.price - minPrice) / priceRange * chartHeight);
        
        // Pulsing circle for current price
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = token.change24h >= 0 ? '#10b981' : '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw price labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Inter, system-ui';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange * i / 5);
      const y = padding + (chartHeight * i / 5) + 4;
      ctx.fillText(`$${price.toFixed(6)}`, padding - 5, y);
    }

    // Draw time labels
    ctx.textAlign = 'center';
    const timePoints = [0, Math.floor(chartData.length / 2), chartData.length - 1];
    timePoints.forEach((index) => {
      if (chartData[index]) {
        const x = padding + (chartWidth * index / (chartData.length - 1));
        const time = new Date(chartData[index].timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
        ctx.fillText(time, x, rect.height - 10);
      }
    });

  }, [chartData, token.change24h, isLive]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-64 rounded-lg"
        style={{ width: '100%', height: '256px' }}
      />
      
      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-white font-medium">LIVE</span>
        </div>
      )}

      {/* Chart controls */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsPlaying(!isPlaying)}
          className="bg-black/50 border-gray-600 text-white hover:bg-gray-800"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPriceSound(!priceSound)}
          className="bg-black/50 border-gray-600 text-white hover:bg-gray-800"
        >
          <Volume2 className={`w-4 h-4 ${priceSound ? 'text-green-400' : 'text-gray-400'}`} />
        </Button>
      </div>
    </div>
  );
};

export default function LiveActionCharts() {
  const [selectedToken, setSelectedToken] = useState<RealTimePrice | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [priceUpdates, setPriceUpdates] = useState(0);

  // Fetch real-time market prices
  const { data: marketPrices, isLoading } = useQuery({
    queryKey: ['/api/market/prices'],
    refetchInterval: 3000, // Update every 3 seconds for live action
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Live market data WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'REAL_TIME_PRICES') {
          setPriceUpdates(prev => prev + 1);
          
          // Play sound for price updates if enabled
          if (soundEnabled && message.data.updateType === 'micro') {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return () => {
      socket.close();
    };
  }, [soundEnabled]);

  const prices: RealTimePrice[] = marketPrices?.prices || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-7 h-7 text-green-400 animate-pulse" />
            <span>Live Action Charts</span>
          </h2>
          <p className="text-gray-400 mt-1">
            Real-time price tracking with live updates every 3 seconds
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-medium">{priceUpdates} updates</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <Volume2 className={`w-4 h-4 mr-2 ${soundEnabled ? 'text-green-400' : 'text-gray-400'}`} />
            {soundEnabled ? 'Sound On' : 'Sound Off'}
          </Button>
        </div>
      </div>

      {/* Price overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {prices.slice(0, 10).map((token) => (
          <Card
            key={token.address}
            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
              selectedToken?.address === token.address
                ? 'ring-2 ring-purple-500 bg-gray-800/50'
                : 'bg-gray-900/50 hover:bg-gray-800/50'
            } border-gray-700`}
            onClick={() => setSelectedToken(token)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white">{token.symbol}</span>
                <Badge 
                  variant={token.change24h >= 0 ? "default" : "destructive"}
                  className={token.change24h >= 0 ? "bg-green-600" : "bg-red-600"}
                >
                  {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                </Badge>
              </div>
              <div className="text-2xl font-bold text-white">
                ${token.price.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 6 
                })}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Vol: ${(token.volume24h / 1e6).toFixed(1)}M
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main chart display */}
      {selectedToken ? (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="w-6 h-6 text-purple-400" />
                <span>{selectedToken.symbol} Live Price Chart</span>
                <Badge variant="outline" className="border-green-500 text-green-400">
                  ${selectedToken.price.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 6 
                  })}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Updated: {new Date(selectedToken.timestamp).toLocaleTimeString()}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LivePriceChart token={selectedToken} isLive={true} />
            
            {/* Token stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">24h Change</div>
                <div className={`text-lg font-bold ${
                  selectedToken.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {selectedToken.change24h >= 0 ? '+' : ''}{selectedToken.change24h.toFixed(2)}%
                </div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">24h Volume</div>
                <div className="text-lg font-bold text-white">
                  ${(selectedToken.volume24h / 1e6).toFixed(2)}M
                </div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">Market Cap</div>
                <div className="text-lg font-bold text-white">
                  ${(selectedToken.marketCap / 1e9).toFixed(2)}B
                </div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">Data Points</div>
                <div className="text-lg font-bold text-purple-400">
                  {selectedToken.priceHistory?.length || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Select a Token</h3>
            <p className="text-gray-400">
              Choose a cryptocurrency above to view its live action chart with real-time price movements
            </p>
          </CardContent>
        </Card>
      )}

      {/* Live market feed */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
            <span>Live Market Feed</span>
            <Badge variant="outline" className="border-yellow-500 text-yellow-400">
              {prices.length} Tokens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {prices.map((token) => (
              <div
                key={token.address}
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-white w-12">{token.symbol}</span>
                  <span className="text-gray-400 text-sm">
                    {new Date(token.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-mono text-white">
                    ${token.price.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 6 
                    })}
                  </span>
                  <Badge 
                    variant={token.change24h >= 0 ? "default" : "destructive"}
                    className={token.change24h >= 0 ? "bg-green-600" : "bg-red-600"}
                  >
                    {token.change24h >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
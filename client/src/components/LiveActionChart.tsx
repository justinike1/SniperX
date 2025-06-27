import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
  change: number;
}

interface LiveToken {
  symbol: string;
  address: string;
  currentPrice: number;
  change24h: number;
  volume24h: number;
  priceHistory: PricePoint[];
  lastUpdate: number;
}

export function LiveActionChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedToken, setSelectedToken] = useState<string>('SOL');
  const [chartData, setChartData] = useState<Map<string, PricePoint[]>>(new Map());
  const animationRef = useRef<number>();

  // Ultra-fast market data with 500ms updates
  const { data: marketData } = useQuery({
    queryKey: ['/api/market/prices'],
    queryFn: () => apiRequest('GET', '/api/market/prices'),
    refetchInterval: 500, // Millisecond-level updates
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const tokens: LiveToken[] = marketData?.prices || [];

  // Update chart data with new price points
  useEffect(() => {
    if (tokens.length > 0) {
      const newChartData = new Map(chartData);
      
      tokens.forEach(token => {
        const existing = newChartData.get(token.symbol) || [];
        const newPoint: PricePoint = {
          timestamp: Date.now(),
          price: token.currentPrice,
          volume: token.volume24h,
          change: token.change24h
        };
        
        // Keep last 100 points for smooth chart
        const updatedHistory = [...existing, newPoint].slice(-100);
        newChartData.set(token.symbol, updatedHistory);
      });
      
      setChartData(newChartData);
    }
  }, [tokens]);

  // Real-time chart rendering with 60fps
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const data = chartData.get(selectedToken) || [];
    
    if (data.length < 2) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Calculate chart bounds
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = padding + (chartHeight * i) / 10;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw price line with glow effect
    if (data.length > 1) {
      const currentChange = data[data.length - 1].change;
      const lineColor = currentChange >= 0 ? '#00ff88' : '#ff4444';
      
      // Glow effect
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      data.forEach((point, index) => {
        const x = padding + (chartWidth * index) / (data.length - 1);
        const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowBlur = 0;
    }

    // Draw current price indicator
    if (data.length > 0) {
      const lastPoint = data[data.length - 1];
      const x = width - padding;
      const y = padding + chartHeight - ((lastPoint.price - minPrice) / priceRange) * chartHeight;
      
      ctx.fillStyle = lastPoint.change >= 0 ? '#00ff88' : '#ff4444';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Price label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`$${lastPoint.price.toFixed(6)}`, x - 15, y - 10);
    }

    // Continue animation
    animationRef.current = requestAnimationFrame(drawChart);
  }, [chartData, selectedToken]);

  // Start chart animation
  useEffect(() => {
    drawChart();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawChart]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = 300;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const selectedTokenData = tokens.find(t => t.symbol === selectedToken);

  return (
    <div className="space-y-4 smooth-update">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">Live Action Charts</h2>
          <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
        </div>
        
        <div className="flex gap-2">
          {tokens.slice(0, 5).map(token => (
            <button
              key={token.symbol}
              onClick={() => setSelectedToken(token.symbol)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                selectedToken === token.symbol
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {token.symbol}
            </button>
          ))}
        </div>
      </div>

      <Card className="gpu-accelerated">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {selectedTokenData && (
                <>
                  <span>{selectedTokenData.symbol}</span>
                  <span className="font-mono text-lg">
                    ${selectedTokenData.currentPrice.toFixed(6)}
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedTokenData.change24h >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${
                      selectedTokenData.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {selectedTokenData.change24h >= 0 ? '+' : ''}{selectedTokenData.change24h.toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Activity className="w-3 h-3" />
              <span>500ms updates</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="relative w-full">
            <canvas
              ref={canvasRef}
              className="w-full h-[300px] rounded-lg border border-gray-700"
              style={{ background: '#0a0a0a' }}
            />
            
            {chartData.get(selectedToken)?.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p>Collecting live data...</p>
                </div>
              </div>
            )}
          </div>
          
          {selectedTokenData && (
            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-400">24h Volume</p>
                <p className="font-semibold">${selectedTokenData.volume24h.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Last Update</p>
                <p className="font-semibold text-green-500">Live</p>
              </div>
              <div>
                <p className="text-gray-400">Chart Points</p>
                <p className="font-semibold">{chartData.get(selectedToken)?.length || 0}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
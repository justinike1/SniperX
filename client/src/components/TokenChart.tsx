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
  Filler,
} from 'chart.js';
import { formatCurrency, formatTimeAgo } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PricePoint {
  timestamp: string;
  price: number;
  volume?: number;
}

interface TokenChartProps {
  symbol: string;
  priceHistory: PricePoint[];
  currentPrice: number;
  priceChange24h: number;
  className?: string;
}

export const TokenChart = ({ 
  symbol, 
  priceHistory, 
  currentPrice, 
  priceChange24h,
  className = "" 
}: TokenChartProps) => {
  const isPositive = priceChange24h >= 0;
  
  const chartData = {
    labels: priceHistory.map(point => {
      const date = new Date(point.timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }),
    datasets: [
      {
        label: `${symbol} Price`,
        data: priceHistory.map(point => point.price),
        borderColor: isPositive ? '#00ff88' : '#ff4444',
        backgroundColor: `${isPositive ? '#00ff88' : '#ff4444'}20`,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: isPositive ? '#00ff88' : '#ff4444',
        pointBorderColor: '#1a1a2e',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#333366',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            return `Price: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: '#333366',
          lineWidth: 0.5,
        },
        ticks: {
          color: '#888',
          maxTicksLimit: 6,
          font: {
            size: 10,
          },
        },
      },
      y: {
        display: true,
        position: 'right' as const,
        grid: {
          color: '#333366',
          lineWidth: 0.5,
        },
        ticks: {
          color: '#888',
          maxTicksLimit: 5,
          font: {
            size: 10,
          },
          callback: (value: any) => {
            if (value < 0.01) {
              return `$${value.toFixed(6)}`;
            }
            return `$${value.toFixed(4)}`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className={`bg-gray-900/50 border border-purple-500/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{symbol}</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">
              {formatCurrency(currentPrice)}
            </span>
            <span className={`text-sm font-medium ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">24h Volume</div>
          <div className="text-sm text-white font-medium">
            {formatCurrency(priceHistory[priceHistory.length - 1]?.volume || 0)}
          </div>
        </div>
      </div>
      
      <div className="h-48 relative">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="mt-3 text-xs text-gray-400 text-center">
        Last updated: {formatTimeAgo(new Date(priceHistory[priceHistory.length - 1]?.timestamp || new Date()))}
      </div>
    </div>
  );
};
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TradeData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Trades() {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  const { data: trades = [], isLoading } = useQuery<TradeData[]>({
    queryKey: ['/api/trades'],
  });

  const filteredTrades = trades.filter(trade => {
    if (filter === 'all') return true;
    return trade.type.toLowerCase() === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-profit-green text-dark-bg';
      case 'FAILED':
        return 'bg-loss-red text-white';
      case 'PENDING':
        return 'bg-warning-orange text-dark-bg';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'BUY' ? 'bg-profit-green text-dark-bg' : 'bg-loss-red text-white';
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-dark-bg rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 bg-dark-border rounded w-20"></div>
                  <div className="h-3 bg-dark-border rounded w-16"></div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-4 bg-dark-border rounded w-16"></div>
                  <div className="h-3 bg-dark-border rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="bg-dark-surface rounded-xl border border-dark-border">
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Trade History</h1>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'buy' | 'sell')}
                className="bg-dark-bg border border-dark-border rounded px-3 py-1 text-sm"
              >
                <option value="all">All Trades</option>
                <option value="buy">Buy Orders</option>
                <option value="sell">Sell Orders</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold font-mono text-profit-green">
                {trades.filter(t => t.type === 'BUY').length}
              </p>
              <p className="text-sm text-gray-400">Buy Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-loss-red">
                {trades.filter(t => t.type === 'SELL').length}
              </p>
              <p className="text-sm text-gray-400">Sell Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">
                {trades.filter(t => t.status === 'COMPLETED').length}
              </p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredTrades.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No trades found</p>
              <p className="text-sm mt-2">Your trade history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {filteredTrades.map((trade) => (
                <div key={trade.id} className="p-4 hover:bg-dark-bg transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-mono text-sm font-medium">{trade.tokenSymbol}/SOL</span>
                        <Badge className={`text-xs font-medium ${getTypeColor(trade.type)}`}>
                          {trade.type}
                        </Badge>
                        <Badge className={`text-xs font-medium ${getStatusColor(trade.status)}`}>
                          {trade.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>{formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}</span>
                        {trade.txHash && (
                          <button className="flex items-center space-x-1 hover:text-accent-purple transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            <span>View Tx</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">{trade.amount} SOL</p>
                      <p className="font-mono text-xs text-gray-400">${trade.price}</p>
                      {trade.profitPercentage !== undefined && (
                        <p className={`text-xs font-medium ${
                          trade.profitPercentage >= 0 ? 'text-profit-green' : 'text-loss-red'
                        }`}>
                          {trade.profitPercentage >= 0 ? '+' : ''}{trade.profitPercentage.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

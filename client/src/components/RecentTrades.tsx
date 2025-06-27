import { TradeData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface RecentTradesProps {
  trades: TradeData[];
  onViewAll: () => void;
}

export const RecentTrades = ({ trades = [], onViewAll }: RecentTradesProps) => {
  // Ensure trades is always an array
  const safeTrades = Array.isArray(trades) ? trades : [];
  const getStatusBadgeColor = (status: string) => {
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

  const getTypeBadgeColor = (type: string) => {
    return type === 'BUY' ? 'bg-profit-green text-dark-bg' : 'bg-loss-red text-white';
  };

  return (
    <section className="px-4 pb-6">
      <div className="bg-dark-surface rounded-xl border border-dark-border">
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Trades</h2>
            <button 
              className="text-accent-purple text-sm font-medium hover:text-blue-400 transition-colors"
              onClick={onViewAll}
            >
              View All
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-dark-border">
          {safeTrades.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No trades yet
            </div>
          ) : (
            safeTrades.map((trade) => (
              <div key={trade.id} className="p-4 hover:bg-dark-bg transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono text-sm font-medium">{trade.tokenSymbol}/SOL</span>
                      <Badge className={`text-xs font-medium px-2 py-1 ${getTypeBadgeColor(trade.type)}`}>
                        {trade.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{trade.amount} SOL</p>
                    {trade.profitPercentage !== undefined ? (
                      <p className={`text-xs ${trade.profitPercentage >= 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                        {trade.profitPercentage >= 0 ? '+' : ''}{trade.profitPercentage.toFixed(1)}%
                      </p>
                    ) : trade.status === 'PENDING' ? (
                      <p className="text-xs text-gray-400">PENDING</p>
                    ) : (
                      <Badge className={`text-xs font-medium ${getStatusBadgeColor(trade.status)}`}>
                        {trade.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

import { TokenScanData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LiveScannerProps {
  tokens: TokenScanData[];
  onSnipeToken: (tokenAddress: string) => void;
}

export const LiveScanner = ({ tokens = [], onSnipeToken }: LiveScannerProps) => {
  // Ensure tokens is always an array
  const safeTokens = Array.isArray(tokens) ? tokens : [];
  const formatVolume = (volume: number | null | undefined) => {
    if (!volume || typeof volume !== 'number') return '$0';
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  return (
    <section className="px-4 pb-6">
      <div className="bg-dark-surface rounded-xl border border-dark-border">
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Scanner</h2>
            <div className="flex items-center space-x-1 text-xs text-profit-green">
              <div className="w-2 h-2 bg-profit-green rounded-full animate-pulse"></div>
              <span>SCANNING</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {safeTokens.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              Scanning for new tokens...
            </div>
          ) : (
            safeTokens.map((token) => (
              <div 
                key={token.address} 
                className={`flex items-center justify-between p-3 bg-dark-bg rounded-lg ${
                  token.isFiltered ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-medium">{token.symbol}</span>
                    {!token.isFiltered ? (
                      <Badge className="bg-warning-orange text-dark-bg text-xs font-bold px-2 py-1">
                        NEW
                      </Badge>
                    ) : (
                      <Badge className="bg-loss-red text-white text-xs font-bold px-2 py-1">
                        FILTERED
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {token.isFiltered 
                      ? token.filterReason 
                      : `${token.isLpLocked ? 'LP Locked • ' : ''}${token.isRenounced ? 'Contract Renounced' : 'High Volume'}`
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {token.isFiltered ? 'Risk' : 'Volume'}
                  </p>
                  <p className={`font-mono text-sm ${
                    token.isFiltered 
                      ? 'text-loss-red' 
                      : 'text-profit-green'
                  }`}>
                    {token.isFiltered 
                      ? 'HIGH' 
                      : formatVolume(token.volume24h)
                    }
                  </p>
                </div>
                <Button 
                  className={`ml-3 text-xs font-medium px-3 py-2 ${
                    token.isFiltered
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-accent-purple hover:bg-indigo-600 text-white'
                  }`}
                  disabled={token.isFiltered}
                  onClick={() => !token.isFiltered && onSnipeToken(token.address)}
                >
                  {token.isFiltered ? 'BLOCKED' : 'SNIPE'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

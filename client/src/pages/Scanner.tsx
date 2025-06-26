import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TokenScanData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Search, Filter, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function Scanner() {
  const [filters, setFilters] = useState({
    honeypotFilter: true,
    lpLockFilter: true,
    renounceFilter: true,
    minVolume: 10000,
  });

  const { data: tokens = [], isLoading, refetch } = useQuery<TokenScanData[]>({
    queryKey: ['/api/scanner/tokens'],
    refetchInterval: 3000, // Refetch every 3 seconds
  });

  const filteredTokens = tokens.filter(token => {
    if (filters.honeypotFilter && token.isHoneypot) return false;
    if (filters.lpLockFilter && !token.isLpLocked) return false;
    if (filters.renounceFilter && !token.isRenounced) return false;
    if (token.volume24h < filters.minVolume) return false;
    return true;
  });

  const handleSnipeToken = async (tokenAddress: string) => {
    try {
      await apiRequest('POST', '/api/trading/snipe', { tokenAddress });
    } catch (error) {
      console.error('Failed to snipe token:', error);
    }
  };

  const handleUpdateFilters = async (newFilters: typeof filters) => {
    setFilters(newFilters);
    try {
      await apiRequest('PATCH', '/api/scanner/filters', newFilters);
    } catch (error) {
      console.error('Failed to update filters:', error);
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatMarketCap = (price: number, supply: number) => {
    const mc = price * supply;
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(1)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}K`;
    return `$${mc.toFixed(0)}`;
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Scanner Stats */}
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Token Scanner</h1>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-profit-green rounded-full animate-pulse"></div>
            <span className="text-profit-green">Live Scanning</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold font-mono">{tokens.length}</p>
            <p className="text-sm text-gray-400">Tokens Found</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-profit-green">{filteredTokens.length}</p>
            <p className="text-sm text-gray-400">Passed Filters</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-loss-red">
              {tokens.length - filteredTokens.length}
            </p>
            <p className="text-sm text-gray-400">Filtered Out</p>
          </div>
        </div>
      </div>

      {/* Scanner Filters */}
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Scanner Filters</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Block Honeypots</p>
              <p className="text-sm text-gray-400">Filter out potential honeypot tokens</p>
            </div>
            <Switch
              checked={filters.honeypotFilter}
              onCheckedChange={(checked) => 
                handleUpdateFilters({ ...filters, honeypotFilter: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Require LP Lock</p>
              <p className="text-sm text-gray-400">Only show tokens with locked liquidity</p>
            </div>
            <Switch
              checked={filters.lpLockFilter}
              onCheckedChange={(checked) => 
                handleUpdateFilters({ ...filters, lpLockFilter: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Require Renounced</p>
              <p className="text-sm text-gray-400">Only show tokens with renounced ownership</p>
            </div>
            <Switch
              checked={filters.renounceFilter}
              onCheckedChange={(checked) => 
                handleUpdateFilters({ ...filters, renounceFilter: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Minimum Volume</p>
              <p className="text-sm text-gray-400">24h trading volume threshold</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">$</span>
              <input
                type="number"
                value={filters.minVolume}
                onChange={(e) => 
                  handleUpdateFilters({ ...filters, minVolume: parseInt(e.target.value) || 0 })
                }
                className="bg-dark-bg border border-dark-border rounded px-3 py-1 w-20 text-sm text-center font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="bg-dark-surface rounded-xl border border-dark-border">
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Tokens</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="bg-dark-bg border-dark-border"
            >
              <Search className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Scanning for tokens...</p>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tokens match your filters</p>
              <p className="text-sm mt-2">Try adjusting your filter settings</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {filteredTokens.map((token) => (
                <div key={token.address} className="p-4 hover:bg-dark-bg transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-mono text-sm font-medium">{token.symbol}</span>
                        {token.name && (
                          <span className="text-xs text-gray-400 truncate max-w-32">{token.name}</span>
                        )}
                        <Badge className="bg-warning-orange text-dark-bg text-xs font-bold">
                          NEW
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-400">
                        <span>Vol: {formatVolume(token.volume24h)}</span>
                        <span>Liq: {formatVolume(token.liquidityUsd)}</span>
                        {token.riskScore > 0 && (
                          <span className={`${
                            token.riskScore >= 7 ? 'text-loss-red' : 
                            token.riskScore >= 4 ? 'text-warning-orange' : 'text-profit-green'
                          }`}>
                            Risk: {token.riskScore}/10
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        {token.isLpLocked && (
                          <Badge className="bg-profit-green text-dark-bg text-xs">LP Locked</Badge>
                        )}
                        {token.isRenounced && (
                          <Badge className="bg-profit-green text-dark-bg text-xs">Renounced</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right mr-4">
                      <p className="font-mono text-sm">${token.priceUsd.toFixed(8)}</p>
                      <div className="flex items-center space-x-1 text-xs text-profit-green">
                        <TrendingUp className="w-3 h-3" />
                        <span>Fresh</span>
                      </div>
                    </div>
                    
                    <Button
                      className="bg-accent-purple hover:bg-indigo-600 text-white text-xs font-medium px-4 py-2"
                      onClick={() => handleSnipeToken(token.address)}
                    >
                      SNIPE
                    </Button>
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

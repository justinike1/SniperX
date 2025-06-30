import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, DollarSign, Clock, ExternalLink } from 'lucide-react';

interface TradeReceipt {
  id: string;
  timestamp: number;
  type: 'BUY' | 'SELL';
  tokenSymbol: string;
  tokenAddress: string;
  solAmount: number;
  tokenAmount: number;
  price: number;
  txHash: string;
  solscanLink: string;
  confidence: number;
  priceImpact: number;
  pnl?: number;
  totalPnl?: number;
}

interface PnLTracker {
  totalTrades: number;
  successfulTrades: number;
  totalProfit: number;
  totalLoss: number;
  bestTrade: number;
  worstTrade: number;
  winRate: number;
}

export default function JupiterPnLDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'receipts' | 'testing'>('overview');
  const queryClient = useQueryClient();

  // Query for trading receipts
  const { data: receiptsData } = useQuery({
    queryKey: ['/api/trading/receipts'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Query for P&L tracker
  const { data: pnlData } = useQuery({
    queryKey: ['/api/trading/pnl-tracker'],
    refetchInterval: 10000
  });

  // Query for enhanced trading status
  const { data: statusData } = useQuery({
    queryKey: ['/api/trading/enhanced-status'],
    refetchInterval: 5000
  });

  // Test Jupiter swap mutation
  const testJupiterMutation = useMutation({
    mutationFn: async (params: { tokenAddress?: string; amount?: number; dryRun?: boolean }) => {
      return await apiRequest('/api/trading/test-jupiter-swap', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/pnl-tracker'] });
    }
  });

  // Generate daily summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/trading/generate-daily-summary', {
        method: 'POST'
      });
    }
  });

  const receipts: TradeReceipt[] = receiptsData?.receipts || [];
  const pnl: PnLTracker = pnlData?.pnl || {
    totalTrades: 0,
    successfulTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    bestTrade: 0,
    worstTrade: 0,
    winRate: 0
  };

  const recentTrades = receipts.slice(-10).reverse(); // Last 10 trades, newest first

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSolAmount = (amount: number) => {
    return amount.toFixed(6);
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(4)} SOL`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Jupiter P&L Dashboard</h2>
          <p className="text-gray-400">Real-time token trading performance and transaction receipts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            size="sm"
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'receipts' ? 'default' : 'outline'}
            onClick={() => setActiveTab('receipts')}
            size="sm"
          >
            Receipts
          </Button>
          <Button
            variant={activeTab === 'testing' ? 'default' : 'outline'}
            onClick={() => setActiveTab('testing')}
            size="sm"
          >
            Testing
          </Button>
        </div>
      </div>

      {/* Trading Status */}
      <Card className="bg-black/40 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Live Trading Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400">Mode</div>
              <Badge variant={statusData?.status?.mode === 'LIVE_TRADING' ? 'default' : 'secondary'}>
                {statusData?.status?.mode || 'LOADING'}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Trades</div>
              <div className="text-xl font-bold text-white">{statusData?.status?.totalTrades || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Today's Trades</div>
              <div className="text-xl font-bold text-white">{statusData?.status?.todayTrades || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Win Rate</div>
              <div className="text-xl font-bold text-green-400">{(pnl.winRate * 100).toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'overview' && (
        <>
          {/* P&L Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-black/40 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Total Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {formatPnL(pnl.totalProfit)}
                </div>
                <div className="text-sm text-gray-400">
                  From {pnl.totalTrades} trades
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5" />
                  Total Loss
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">
                  {formatPnL(pnl.totalLoss)}
                </div>
                <div className="text-sm text-gray-400">
                  Net P&L: {formatPnL(pnl.totalProfit + pnl.totalLoss)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Best Trade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {formatPnL(pnl.bestTrade)}
                </div>
                <div className="text-sm text-gray-400">
                  Worst: {formatPnL(pnl.worstTrade)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Trades */}
          <Card className="bg-black/40 border-gray-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Trading Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTrades.length > 0 ? recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {trade.type === 'BUY' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-400" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <div className="text-white font-medium">
                          {trade.type} {trade.tokenSymbol}
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatTime(trade.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">
                        {formatSolAmount(trade.solAmount)} SOL
                      </div>
                      {trade.pnl !== undefined && (
                        <div className={`text-sm ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPnL(trade.pnl)}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(trade.solscanLink, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                )) : (
                  <div className="text-center text-gray-400 py-8">
                    No trading activity yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'receipts' && (
        <Card className="bg-black/40 border-gray-500/20">
          <CardHeader>
            <CardTitle className="text-white">Transaction Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {receipts.length > 0 ? receipts.reverse().map((receipt) => (
                <div key={receipt.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={receipt.type === 'BUY' ? 'default' : 'secondary'}>
                        {receipt.type}
                      </Badge>
                      <span className="text-white font-medium">{receipt.tokenSymbol}</span>
                    </div>
                    <span className="text-sm text-gray-400">{formatTime(receipt.timestamp)}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">SOL Amount:</span>
                      <div className="text-white">{formatSolAmount(receipt.solAmount)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Token Amount:</span>
                      <div className="text-white">{receipt.tokenAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Confidence:</span>
                      <div className="text-white">{receipt.confidence}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">TX Hash:</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-blue-400"
                        onClick={() => window.open(receipt.solscanLink, '_blank')}
                      >
                        {receipt.txHash.substring(0, 8)}...
                      </Button>
                    </div>
                  </div>
                  {receipt.pnl !== undefined && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <span className="text-gray-400">P&L: </span>
                      <span className={receipt.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatPnL(receipt.pnl)}
                      </span>
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center text-gray-400 py-8">
                  No transaction receipts available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'testing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-black/40 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-400">Test Jupiter Swap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Test Parameters</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Token:</span>
                    <div className="text-white">BONK</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Amount:</span>
                    <div className="text-white">0.001 SOL</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => testJupiterMutation.mutate({ dryRun: true })}
                  disabled={testJupiterMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {testJupiterMutation.isPending ? 'Testing...' : 'Test Dry Run Swap'}
                </Button>
                <Button
                  onClick={() => testJupiterMutation.mutate({ dryRun: false })}
                  disabled={testJupiterMutation.isPending}
                  className="w-full"
                >
                  {testJupiterMutation.isPending ? 'Executing...' : 'Execute Live Swap'}
                </Button>
              </div>
              {testJupiterMutation.isError && (
                <div className="text-red-400 text-sm">
                  Test failed: {testJupiterMutation.error?.message}
                </div>
              )}
              {testJupiterMutation.isSuccess && (
                <div className="text-green-400 text-sm">
                  Test completed successfully
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-green-400">Daily Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => generateSummaryMutation.mutate()}
                disabled={generateSummaryMutation.isPending}
                className="w-full"
              >
                {generateSummaryMutation.isPending ? 'Generating...' : 'Generate Daily Summary'}
              </Button>
              {generateSummaryMutation.isSuccess && (
                <div className="text-sm text-white bg-gray-900/50 p-3 rounded">
                  <pre className="whitespace-pre-wrap">
                    {generateSummaryMutation.data?.summary}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
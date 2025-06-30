import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  ArrowUpDown, 
  PlayCircle, 
  StopCircle, 
  ExternalLink,
  Eye,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface MovementStats {
  active: boolean;
  wallet_address: string;
  movement_strategies: number;
  phantom_wallet_report: {
    total_transactions: number;
    confirmed_transactions: number;
    visible_in_phantom: number;
    confirmation_rate: string;
    phantom_visibility_rate: string;
    recent_transactions: Array<{
      signature: string;
      type: 'BUY' | 'SELL';
      tokenSymbol: string;
      amount: number;
      solAmount: number;
      timestamp: number;
      confirmed: boolean;
      visible_in_phantom: boolean;
    }>;
  };
}

export default function PhantomWalletMonitor() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch money movement stats
  const { data: statsData, isLoading: statsLoading } = useQuery<{success: boolean, stats: MovementStats}>({
    queryKey: ['/api/trading/money-movement-stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const stats = statsData?.stats;

  // Start money movement mutation
  const startMovement = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trading/start-money-movement'),
    onSuccess: () => {
      toast({
        title: "Constant Money Movement Started",
        description: "Transactions will now appear in your Phantom wallet every 30 seconds",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/money-movement-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Start Money Movement",
        description: "Please check your wallet balance and try again",
        variant: "destructive",
      });
    }
  });

  // Stop money movement mutation
  const stopMovement = useMutation({
    mutationFn: () => apiRequest('POST', '/api/trading/stop-money-movement'),
    onSuccess: () => {
      toast({
        title: "Money Movement Stopped",
        description: "Constant transaction activity has been paused",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trading/money-movement-stats'] });
    }
  });

  const handleToggleMovement = () => {
    if (stats?.active) {
      stopMovement.mutate();
    } else {
      startMovement.mutate();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getWalletUrl = () => {
    return `https://solscan.io/account/${stats?.wallet_address}`;
  };

  const getTxUrl = (signature: string) => {
    return `https://solscan.io/tx/${signature}`;
  };

  if (statsLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-gray-400">Loading Phantom wallet monitor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Eye className="h-6 w-6 text-purple-400" />
              {stats?.active && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <CardTitle className="text-white text-lg">Phantom Wallet Monitor</CardTitle>
              <p className="text-gray-400 text-sm">Real-time transaction visibility and constant money movement</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={stats?.active ? "default" : "secondary"}
              className={stats?.active ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"}
            >
              {stats?.active ? 'ACTIVE' : 'PAUSED'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Control Panel */}
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Constant Money Movement</span>
            </div>
            {stats?.active && (
              <div className="flex items-center space-x-2 text-green-400">
                <Activity className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Every 30 seconds</span>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleToggleMovement}
            disabled={startMovement.isPending || stopMovement.isPending}
            className={stats?.active 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-green-600 hover:bg-green-700 text-white"
            }
          >
            {stats?.active ? (
              <>
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Movement
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Movement
              </>
            )}
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/30 p-3 rounded-lg">
            <div className="text-2xl font-bold text-white">
              {stats?.phantom_wallet_report?.total_transactions || 0}
            </div>
            <div className="text-sm text-gray-400">Total Transactions</div>
          </div>
          
          <div className="bg-gray-800/30 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {stats?.phantom_wallet_report?.confirmation_rate || '0%'}
            </div>
            <div className="text-sm text-gray-400">Confirmation Rate</div>
          </div>
          
          <div className="bg-gray-800/30 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">
              {stats?.phantom_wallet_report?.phantom_visibility_rate || '0%'}
            </div>
            <div className="text-sm text-gray-400">Phantom Visibility</div>
          </div>
          
          <div className="bg-gray-800/30 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {stats?.movement_strategies || 0}
            </div>
            <div className="text-sm text-gray-400">Movement Strategies</div>
          </div>
        </div>

        {/* Wallet Address */}
        {stats?.wallet_address && (
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <div>
              <div className="text-sm text-gray-400">Phantom Wallet Address</div>
              <div className="text-white font-mono text-sm">
                {stats.wallet_address.substring(0, 8)}...{stats.wallet_address.substring(-8)}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getWalletUrl(), '_blank')}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Solscan
            </Button>
          </div>
        )}

        {/* Recent Transactions */}
        {isExpanded && stats?.phantom_wallet_report?.recent_transactions && (
          <div className="space-y-3">
            <h3 className="text-white font-medium">Recent Phantom Wallet Activity</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.phantom_wallet_report.recent_transactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={tx.type === 'BUY' ? "default" : "secondary"}
                      className={tx.type === 'BUY' ? "bg-green-600" : "bg-red-600"}
                    >
                      {tx.type}
                    </Badge>
                    <div>
                      <div className="text-white text-sm font-medium">
                        {tx.tokenSymbol}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {tx.solAmount.toFixed(6)} SOL
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        {formatTimestamp(tx.timestamp)}
                      </div>
                      <div className="flex items-center space-x-1">
                        {tx.confirmed ? (
                          <CheckCircle className="h-3 w-3 text-green-400" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-yellow-400" />
                        )}
                        <span className="text-xs text-gray-400">
                          {tx.visible_in_phantom ? 'Visible' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(getTxUrl(tx.signature), '_blank')}
                      className="p-1 h-auto"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <Activity className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <div className="text-white font-medium">Phantom Wallet Integration</div>
              <div className="text-gray-300 text-sm mt-1">
                {stats?.active 
                  ? "Constant money movement is active. Round-trip token transactions are executing every 30 seconds to ensure your Phantom wallet shows continuous activity."
                  : "Money movement is paused. Start the system to see constant transaction activity in your Phantom wallet."
                }
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
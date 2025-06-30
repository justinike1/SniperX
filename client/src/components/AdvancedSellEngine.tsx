import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, TrendingUp, TrendingDown, Play, Square, Activity } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SellOpportunity {
  tokenAddress: string;
  tokenSymbol: string;
  currentPrice: number;
  buyPrice: number;
  profitPercentage: number;
  sellReason: string;
  confidence: number;
  urgency: string;
  recommendation: string;
}

interface SellEngineStatus {
  isActive: boolean;
  queueLength: number;
  openPositions: number;
  processing: boolean;
}

export default function AdvancedSellEngine() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [engineActive, setEngineActive] = useState(false);

  // Fetch sell engine status
  const { data: statusData = { isActive: false, queueLength: 0, openPositions: 0, processing: false }, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/sell/status'],
    refetchInterval: 2000
  });

  // Fetch sell opportunities
  const { data: opportunitiesData = { status: 'idle', opportunities: [] }, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['/api/sell/opportunities'],
    refetchInterval: 5000
  });

  // Fetch sell queue status
  const { data: queueData = [] } = useQuery({
    queryKey: ['/api/sell/queue'],
    refetchInterval: 3000
  });

  // Toggle sell engine
  const toggleEngineMutation = useMutation({
    mutationFn: async (active: boolean) => {
      return apiRequest('/api/sell/toggle', 'POST', { active });
    },
    onSuccess: (data) => {
      setEngineActive(data.active);
      toast({
        title: data.active ? "Sell Engine Activated" : "Sell Engine Deactivated",
        description: data.message,
        variant: data.active ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sell/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sell/queue'] });
    },
    onError: () => {
      toast({
        title: "Engine Toggle Failed",
        description: "Failed to toggle sell engine status",
        variant: "destructive"
      });
    }
  });

  // Emergency sell all
  const emergencySellMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/sell/emergency', 'POST');
    },
    onSuccess: (data) => {
      toast({
        title: "Emergency Sell Initiated",
        description: data.message,
        variant: "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sell/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sell/queue'] });
    },
    onError: () => {
      toast({
        title: "Emergency Sell Failed",
        description: "Failed to execute emergency sell",
        variant: "destructive"
      });
    }
  });

  // Manual sell
  const manualSellMutation = useMutation({
    mutationFn: async (opportunity: SellOpportunity) => {
      return apiRequest('/api/sell/manual', 'POST', {
        tokenAddress: opportunity.tokenAddress,
        tokenSymbol: opportunity.tokenSymbol,
        currentPrice: opportunity.currentPrice,
        reason: opportunity.sellReason
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Manual Sell Queued",
        description: data.message,
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sell/queue'] });
    },
    onError: () => {
      toast({
        title: "Manual Sell Failed",
        description: "Failed to queue manual sell",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (statusData && typeof statusData === 'object' && statusData !== null && 'isActive' in statusData) {
      setEngineActive((statusData as any).isActive);
    }
  }, [statusData]);

  const opportunities = (opportunitiesData && typeof opportunitiesData === 'object' && opportunitiesData !== null && 'opportunities' in opportunitiesData) ? (opportunitiesData as any).opportunities || [] : [];
  const queueStatus = queueData || { queueLength: 0, isActive: false, openPositions: 0, processing: false };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getProfitColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-500';
    if (percentage < -2) return 'text-red-500';
    return 'text-yellow-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Advanced Sell Engine
              </CardTitle>
              <CardDescription>
                Intelligent profit optimization and automated selling system
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Engine Status</span>
                <Switch
                  checked={engineActive}
                  onCheckedChange={(checked) => toggleEngineMutation.mutate(checked)}
                  disabled={toggleEngineMutation.isPending}
                />
                <Badge variant={engineActive ? "default" : "secondary"}>
                  {engineActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{(statusData as any)?.queueLength || 0}</div>
              <div className="text-sm text-muted-foreground">Queue Length</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(statusData as any)?.openPositions || 0}</div>
              <div className="text-sm text-muted-foreground">Open Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Array.isArray(opportunities) ? opportunities.length : 0}</div>
              <div className="text-sm text-muted-foreground">Opportunities</div>
            </div>
            <div className="text-center">
              <Badge variant={(statusData as any)?.processing ? "default" : "secondary"}>
                {(statusData as any)?.processing ? "Processing" : "Idle"}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Status</div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => emergencySellMutation.mutate()}
              disabled={emergencySellMutation.isPending || (statusData as any)?.openPositions === 0}
              className="flex items-center gap-1"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency Sell All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sell Opportunities</CardTitle>
          <CardDescription>
            Current positions ready for selling based on profit targets and stop-loss thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {opportunitiesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading opportunities...</p>
            </div>
          ) : !Array.isArray(opportunities) || opportunities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sell opportunities available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opportunity: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{opportunity.tokenSymbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {opportunity.tokenAddress.slice(0, 8)}...{opportunity.tokenAddress.slice(-8)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {opportunity.profitPercentage > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className={getProfitColor(opportunity.profitPercentage)}>
                            {opportunity.profitPercentage > 0 ? '+' : ''}{opportunity.profitPercentage.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${opportunity.currentPrice.toFixed(6)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getUrgencyColor(opportunity.urgency)}>
                        {opportunity.urgency}
                      </Badge>
                      <div className="text-sm mt-1">
                        {opportunity.confidence}% confidence
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{opportunity.recommendation}</div>
                      <div className="text-xs text-muted-foreground">{opportunity.sellReason}</div>
                      {opportunity.urgency === 'HIGH' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => manualSellMutation.mutate(opportunity)}
                          disabled={manualSellMutation.isPending}
                        >
                          {manualSellMutation.isPending ? 'Queuing...' : 'Sell Now'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
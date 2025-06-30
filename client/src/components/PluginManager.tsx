import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Zap, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Plugin {
  name: string;
  enabled: boolean;
  description: string;
}

interface PluginStatus {
  success: boolean;
  plugins: Plugin[];
  activeCount: number;
  totalCount: number;
}

export default function PluginManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pluginStatus, isLoading } = useQuery<PluginStatus>({
    queryKey: ['/api/plugins/status'],
    refetchInterval: 5000,
  });

  const enableMutation = useMutation({
    mutationFn: async (pluginName: string) => {
      return await apiRequest(`/api/plugins/${pluginName}/enable`, {
        method: 'POST',
      });
    },
    onSuccess: (data, pluginName) => {
      toast({
        title: "Plugin Enabled",
        description: `${pluginName} plugin is now active`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins/status'] });
    },
    onError: (error) => {
      toast({
        title: "Enable Failed",
        description: error instanceof Error ? error.message : 'Failed to enable plugin',
        variant: "destructive",
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (pluginName: string) => {
      return await apiRequest(`/api/plugins/${pluginName}/disable`, {
        method: 'POST',
      });
    },
    onSuccess: (data, pluginName) => {
      toast({
        title: "Plugin Disabled",
        description: `${pluginName} plugin has been deactivated`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins/status'] });
    },
    onError: (error) => {
      toast({
        title: "Disable Failed",
        description: error instanceof Error ? error.message : 'Failed to disable plugin',
        variant: "destructive",
      });
    },
  });

  const handleTogglePlugin = async (plugin: Plugin) => {
    if (plugin.enabled) {
      await disableMutation.mutateAsync(plugin.name);
    } else {
      await enableMutation.mutateAsync(plugin.name);
    }
  };

  const getPluginIcon = (pluginName: string) => {
    switch (pluginName) {
      case 'MomentumTrading':
        return <TrendingUp className="h-5 w-5" />;
      case 'Arbitrage':
        return <Zap className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getPluginColor = (pluginName: string) => {
    switch (pluginName) {
      case 'MomentumTrading':
        return 'bg-green-500';
      case 'Arbitrage':
        return 'bg-blue-500';
      default:
        return 'bg-purple-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Plugin System
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Plugin System
        </CardTitle>
        <CardDescription>
          Modular trading strategies and enhanced capabilities
        </CardDescription>
        {pluginStatus && (
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">
              {pluginStatus.activeCount} Active
            </Badge>
            <Badge variant="secondary">
              {pluginStatus.totalCount} Total
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {pluginStatus?.plugins.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No plugins available
          </div>
        ) : (
          <div className="space-y-4">
            {pluginStatus?.plugins.map((plugin) => (
              <div
                key={plugin.name}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getPluginColor(plugin.name)} text-white`}>
                    {getPluginIcon(plugin.name)}
                  </div>
                  <div>
                    <h3 className="font-medium">{plugin.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {plugin.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={plugin.enabled ? "default" : "secondary"}>
                    {plugin.enabled ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={plugin.enabled}
                    onCheckedChange={() => handleTogglePlugin(plugin)}
                    disabled={enableMutation.isPending || disableMutation.isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Plugin Benefits</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Enhanced trading strategies beyond basic token selection</li>
            <li>• Momentum detection for high-probability entries</li>
            <li>• Arbitrage opportunities for risk-free profits</li>
            <li>• Modular system allows easy addition of new strategies</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
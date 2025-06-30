import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Activity, CheckCircle, AlertCircle, Zap, Target, BarChart3 } from 'lucide-react';

interface GPTPerformanceData {
  gptIntegration: {
    enabled: boolean;
    insightsGenerated: number;
    averageResponseTime: number;
    confidenceScore: number;
    status: string;
  };
  tradingPerformance: {
    totalTrades: number;
    successRate: number;
    averageConfidence: number;
    lastTradeTime: number;
  };
  systemMetrics: {
    overallHealth: string;
    healthScore: number;
    componentsOperational: number;
    totalComponents: number;
  };
}

export function GPTPerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<GPTPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const response = await fetch('/api/gpt/insights-performance');
        const data = await response.json();
        if (data.success) {
          setPerformanceData(data);
        }
      } catch (error) {
        console.error('Failed to fetch GPT performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'bg-green-500';
      case 'DEGRADED': return 'bg-yellow-500';
      case 'OFFLINE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-green-500';
      case 'DEGRADED': return 'text-yellow-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            GPT Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            GPT Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            Unable to load performance data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(performanceData.systemMetrics.overallHealth)}`}>
                {performanceData.systemMetrics.overallHealth}
              </div>
              <div className="text-sm text-gray-500">Overall Health</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {performanceData.systemMetrics.healthScore}%
              </div>
              <div className="text-sm text-gray-500">Health Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {performanceData.systemMetrics.componentsOperational}/{performanceData.systemMetrics.totalComponents}
              </div>
              <div className="text-sm text-gray-500">Components Active</div>
            </div>
            <div className="text-center">
              <Badge className={`${getStatusColor(performanceData.gptIntegration.status)} text-white`}>
                {performanceData.gptIntegration.status}
              </Badge>
              <div className="text-sm text-gray-500 mt-1">GPT Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPT Integration Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            GPT-4 Integration Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Insights Generated</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {performanceData.gptIntegration.insightsGenerated.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Real-time AI analysis</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Response Time</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {performanceData.gptIntegration.averageResponseTime}ms
              </div>
              <div className="text-xs text-gray-500">Average processing speed</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Confidence Score</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {performanceData.gptIntegration.confidenceScore}%
              </div>
              <Progress value={performanceData.gptIntegration.confidenceScore} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Integration Status</span>
              </div>
              <Badge variant={performanceData.gptIntegration.enabled ? "default" : "destructive"}>
                {performanceData.gptIntegration.enabled ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
              <div className="text-xs text-gray-500">Real-time monitoring</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            AI-Enhanced Trading Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Total Trades</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {performanceData.tradingPerformance.totalTrades.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">AI-powered executions</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Success Rate</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {performanceData.tradingPerformance.successRate}%
              </div>
              <Progress value={performanceData.tradingPerformance.successRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Avg Confidence</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {performanceData.tradingPerformance.averageConfidence}%
              </div>
              <div className="text-xs text-gray-500">AI prediction accuracy</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Last Trade</span>
              </div>
              <div className="text-sm font-bold text-orange-600">
                {performanceData.tradingPerformance.lastTradeTime ? 
                  new Date(performanceData.tradingPerformance.lastTradeTime).toLocaleTimeString() : 
                  'No recent trades'
                }
              </div>
              <div className="text-xs text-gray-500">Most recent execution</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Status Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">GPT-4 Analysis</span>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                ACTIVE
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Live Trading</span>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                OPERATIONAL
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Real-time Insights</span>
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                STREAMING
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Rocket, Shield, Zap, Activity, Globe, CheckCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DeploymentStatus {
  isOptimized: boolean;
  uptime: number;
  metrics: {
    startTime: number;
    totalTransactions: number;
    successRate: number;
    uptime: number;
    performanceScore: number;
  };
  readyForDeployment: boolean;
}

interface DeploymentReport {
  timestamp: string;
  deploymentStatus: string;
  optimizationLevel: string;
  systemHealth: string;
  tradingStatus: string;
  securityLevel: string;
  performanceScore: number;
  uptime: string;
  readiness: string;
}

export default function FinalDeploymentDashboard() {
  const queryClient = useQueryClient();
  const [activationProgress, setActivationProgress] = useState(0);

  const { data: deploymentStatus } = useQuery<DeploymentStatus>({
    queryKey: ['/api/deployment/status'],
    refetchInterval: 2000
  });

  const { data: deploymentReportData } = useQuery<{ report: DeploymentReport }>({
    queryKey: ['/api/deployment/report'],
    enabled: deploymentStatus?.isOptimized || false
  });

  const activateFinalDeployment = useMutation({
    mutationFn: () => apiRequest('/api/deployment/activate-final', {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deployment/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deployment/report'] });
    }
  });

  const handleActivateDeployment = async () => {
    setActivationProgress(0);
    const interval = setInterval(() => {
      setActivationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    await activateFinalDeployment.mutate();
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (isOptimized: boolean) => {
    return isOptimized ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        FULLY OPTIMIZED
      </Badge>
    ) : (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        PENDING OPTIMIZATION
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-400" />
            Final Deployment Control
          </h2>
          <p className="text-gray-400 mt-1">Production optimization and deployment management</p>
        </div>
        {deploymentStatus && getStatusBadge(deploymentStatus.isOptimized)}
      </div>

      {/* Main Deployment Control */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Deployment Activation
          </CardTitle>
          <CardDescription>
            Activate complete production optimization package
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!deploymentStatus?.isOptimized ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-sm text-gray-300">Security Hardening</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm text-gray-300">Performance Boost</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>
                  <p className="text-sm text-gray-300">Maximum Trading</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-sm text-gray-300">Global Scaling</p>
                </div>
              </div>

              {activationProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Deployment Progress</span>
                    <span className="text-blue-400">{activationProgress}%</span>
                  </div>
                  <Progress value={activationProgress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handleActivateDeployment}
                disabled={activateFinalDeployment.isPending || activationProgress > 0}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {activateFinalDeployment.isPending ? 'Activating...' : 'Activate Final Deployment Package'}
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Deployment Fully Optimized</h3>
              <p className="text-gray-400">All production systems are running at maximum capacity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Metrics */}
      {deploymentStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Uptime</span>
                  <span className="text-white">{formatUptime(deploymentStatus.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-green-400">{deploymentStatus.metrics.successRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Performance</span>
                  <span className="text-blue-400">{deploymentStatus.metrics.performanceScore}/100</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Trading Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Transactions</span>
                  <span className="text-white">{deploymentStatus.metrics.totalTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    ULTRA-AGGRESSIVE
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode</span>
                  <span className="text-purple-400">MAXIMUM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Deployment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ready for Production</span>
                  <span className={deploymentStatus.readyForDeployment ? "text-green-400" : "text-yellow-400"}>
                    {deploymentStatus.readyForDeployment ? "YES" : "PENDING"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Optimization Level</span>
                  <span className="text-blue-400">
                    {deploymentStatus.isOptimized ? "MAXIMUM" : "STANDARD"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Security Level</span>
                  <span className="text-green-400">HARDENED</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deployment Report */}
      {deploymentReportData?.report && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Deployment Report
            </CardTitle>
            <CardDescription>
              Comprehensive system status and readiness assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Deployment Status</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {deploymentReportData.report.deploymentStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">System Health</span>
                  <span className="text-green-400">{deploymentReportData.report.systemHealth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trading Status</span>
                  <span className="text-purple-400">{deploymentReportData.report.tradingStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Security Level</span>
                  <span className="text-blue-400">{deploymentReportData.report.securityLevel}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Performance Score</span>
                  <span className="text-green-400">{deploymentReportData.report.performanceScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Uptime</span>
                  <span className="text-green-400">{deploymentReportData.report.uptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Optimization</span>
                  <span className="text-blue-400">{deploymentReportData.report.optimizationLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Readiness</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {deploymentReportData.report.readiness}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
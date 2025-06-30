import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Globe, Rocket, Server, Database, Shield, Zap, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EnvironmentStatus {
  key: string;
  name: string;
  domain: string;
  tradingMode: string;
  status: {
    deployed: boolean;
    healthy: boolean;
    uptime: number;
  };
}

interface MultiEnvStatus {
  current: string;
  environments: EnvironmentStatus[];
  deploymentStatus: {
    development: { deployed: boolean; healthy: boolean; uptime: number };
    staging: { deployed: boolean; healthy: boolean; uptime: number };
    production: { deployed: boolean; healthy: boolean; uptime: number };
  };
}

export default function MultiEnvDeploymentDashboard() {
  const [envStatus, setEnvStatus] = useState<MultiEnvStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchEnvironmentStatus();
    const interval = setInterval(fetchEnvironmentStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchEnvironmentStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/deployment/multi-env/status');
      if (response && response.success) {
        setEnvStatus({
          current: response.current,
          environments: response.environments || [],
          deploymentStatus: response.deploymentStatus || {}
        });
      }
    } catch (error) {
      console.error('Failed to fetch environment status:', error);
    }
  };

  const deployToEnvironment = async (environment: string) => {
    setIsLoading(true);
    setDeploymentProgress(0);

    try {
      // Simulate deployment progress
      const progressInterval = setInterval(() => {
        setDeploymentProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await apiRequest('POST', '/api/deployment/multi-env/deploy', {
        environment
      });

      clearInterval(progressInterval);
      setDeploymentProgress(100);

      toast({
        title: "Deployment Successful",
        description: `Successfully deployed to ${environment} environment`,
      });

      setTimeout(() => {
        setDeploymentProgress(0);
        fetchEnvironmentStatus();
      }, 2000);

    } catch (error) {
      toast({
        title: "Deployment Failed",
        description: `Failed to deploy to ${environment}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchEnvironment = async (environment: string) => {
    try {
      await apiRequest('POST', '/api/deployment/multi-env/switch', {
        environment
      });

      toast({
        title: "Environment Switched",
        description: `Switched to ${environment} environment`,
      });

      fetchEnvironmentStatus();
    } catch (error) {
      toast({
        title: "Switch Failed",
        description: `Failed to switch environment: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const deployToAll = async () => {
    setIsLoading(true);
    setDeploymentProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setDeploymentProgress(prev => Math.min(prev + 5, 90));
      }, 1000);

      await apiRequest('POST', '/api/deployment/multi-env/deploy-all');

      clearInterval(progressInterval);
      setDeploymentProgress(100);

      toast({
        title: "Global Deployment Complete",
        description: "Successfully deployed to all environments",
      });

      setTimeout(() => {
        setDeploymentProgress(0);
        fetchEnvironmentStatus();
      }, 2000);

    } catch (error) {
      toast({
        title: "Global Deployment Failed",
        description: `Deployment failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const promoteToProduction = async () => {
    setIsLoading(true);

    try {
      await apiRequest('POST', '/api/deployment/multi-env/promote');

      toast({
        title: "Production Promotion Complete",
        description: "Successfully promoted to production with live mainnet trading",
      });

      fetchEnvironmentStatus();
    } catch (error) {
      toast({
        title: "Production Promotion Failed",
        description: `Promotion failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: { deployed: boolean; healthy: boolean }) => {
    if (!status.deployed) return <XCircle className="h-4 w-4 text-red-500" />;
    if (!status.healthy) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusColor = (status: { deployed: boolean; healthy: boolean }) => {
    if (!status.deployed) return 'destructive';
    if (!status.healthy) return 'secondary';
    return 'default';
  };

  const getUptimeDisplay = (uptime: number) => {
    if (uptime === 0) return 'Not deployed';
    const hours = Math.floor((Date.now() - uptime) / (1000 * 60 * 60));
    return `${hours}h uptime`;
  };

  if (!envStatus) {
    return (
      <Card className="bg-black/40 border-blue-500/30">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading environment status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-blue-500/30">
      <CardHeader>
        <CardTitle className="text-blue-300 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Multi-Environment Deployment
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage deployments across Development, Staging, and Production environments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Environment */}
        <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-300 font-medium">Current Environment</h3>
              <p className="text-gray-400 text-sm">Active deployment target</p>
            </div>
            <Badge variant="outline" className="text-blue-300 border-blue-500">
              {envStatus.current.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Deployment Progress */}
        {deploymentProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Deployment Progress</span>
              <span className="text-blue-300">{deploymentProgress}%</span>
            </div>
            <Progress value={deploymentProgress} className="h-2" />
          </div>
        )}

        {/* Environment Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {envStatus.environments.map((env) => (
            <Card key={env.key} className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">{env.name}</h4>
                    {getStatusIcon(env.status)}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Domain:</span>
                      <span className="text-blue-300">{env.domain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mode:</span>
                      <Badge variant={env.tradingMode === 'MAINNET' ? 'destructive' : 'secondary'} className="text-xs">
                        {env.tradingMode}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Uptime:</span>
                      <span className="text-green-400">{getUptimeDisplay(env.status.uptime)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deployToEnvironment(env.key)}
                      disabled={isLoading}
                      className="flex-1 text-xs"
                    >
                      <Rocket className="h-3 w-3 mr-1" />
                      Deploy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => switchEnvironment(env.key)}
                      disabled={isLoading || envStatus.current === env.key}
                      className="flex-1 text-xs"
                    >
                      Switch
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Global Actions */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={deployToAll}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Globe className="h-4 w-4 mr-2" />
              Deploy to All Environments
            </Button>
            <Button
              onClick={promoteToProduction}
              disabled={isLoading || !envStatus.deploymentStatus.staging.healthy}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Promote to Production
            </Button>
          </div>

          {/* Environment Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
              <Server className="h-6 w-6 mx-auto mb-2 text-green-400" />
              <div className="text-xs text-green-400">Auto Scaling</div>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
              <Database className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <div className="text-xs text-blue-400">Database Sync</div>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
              <Shield className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <div className="text-xs text-purple-400">Security</div>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
              <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
              <div className="text-xs text-yellow-400">Performance</div>
            </div>
          </div>
        </div>

        {/* Quick Status */}
        <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-3">Deployment Status</h4>
          <div className="space-y-2">
            {Object.entries(envStatus.deploymentStatus).map(([env, status]) => (
              <div key={env} className="flex items-center justify-between">
                <span className="text-gray-400 capitalize">{env}:</span>
                <Badge variant={getStatusColor(status)}>
                  {status.deployed ? (status.healthy ? 'Healthy' : 'Unhealthy') : 'Not Deployed'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
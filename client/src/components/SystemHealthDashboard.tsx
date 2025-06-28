import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface ComponentHealth {
  name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED';
  responseTime: number;
  errorCount: number;
  details: any;
}

interface SystemHealthReport {
  overallStatus: 'PERFECT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  score: number;
  components: ComponentHealth[];
  errors: string[];
  recommendations: string[];
  timestamp: number;
}

interface EndpointTest {
  endpoint: string;
  status: string;
  responseTime: number;
}

export function SystemHealthDashboard() {
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [endpointTests, setEndpointTests] = useState<EndpointTest[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setIsRunningTests(true);
    try {
      const response = await fetch('/api/system/health');
      const data = await response.json();
      setHealthReport(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
    }
    setIsRunningTests(false);
  };

  const runEndpointTests = async () => {
    setIsRunningTests(true);
    try {
      const response = await fetch('/api/system/test-endpoints');
      const data = await response.json();
      setEndpointTests(data.endpointTests || []);
    } catch (error) {
      console.error('Endpoint tests failed:', error);
    }
    setIsRunningTests(false);
  };

  const runComprehensiveTest = async () => {
    setIsRunningTests(true);
    await runHealthCheck();
    await runEndpointTests();
    setIsRunningTests(false);
  };

  useEffect(() => {
    runComprehensiveTest();
    const interval = setInterval(runHealthCheck, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
      case 'PERFECT':
      case 'GOOD':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'DEGRADED':
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'FAILED':
      case 'CRITICAL':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
      case 'PERFECT':
      case 'GOOD':
        return 'bg-green-500';
      case 'DEGRADED':
      case 'WARNING':
        return 'bg-yellow-500';
      case 'FAILED':
      case 'CRITICAL':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            🔍 System Health Dashboard
          </h1>
          <p className="text-gray-400 mt-2">
            Comprehensive A-Z monitoring of all SniperX components
          </p>
        </div>
        <Button 
          onClick={runComprehensiveTest}
          disabled={isRunningTests}
          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
        >
          {isRunningTests ? (
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Activity className="w-4 h-4 mr-2" />
          )}
          Run Full System Test
        </Button>
      </div>

      {/* Overall System Status */}
      {healthReport && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getStatusIcon(healthReport.overallStatus)}
              System Overall Status: {healthReport.overallStatus}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">System Health Score</span>
                  <span className="text-2xl font-bold text-green-400">{healthReport.score}%</span>
                </div>
                <Progress value={healthReport.score} className="h-3" />
              </div>
              
              {lastUpdate && (
                <p className="text-sm text-gray-400">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Health Status */}
      {healthReport && healthReport.components.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle>Component Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {healthReport.components.map((component, index) => (
                <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{component.name}</h3>
                    {getStatusIcon(component.status)}
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className={getStatusColor(component.status)}>
                        {component.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Response Time:</span>
                      <span>{component.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors:</span>
                      <span>{component.errorCount}</span>
                    </div>
                  </div>
                  {component.details && Object.keys(component.details).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-500">
                        {Object.entries(component.details).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span>{String(value).slice(0, 20)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Endpoint Tests */}
      {endpointTests.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle>API Endpoint Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {endpointTests.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    {test.status.startsWith('SUCCESS') ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <code className="text-sm">{test.endpoint}</code>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <Badge className={test.status.startsWith('SUCCESS') ? 'bg-green-500' : 'bg-red-500'}>
                      {test.status}
                    </Badge>
                    <span className="text-gray-400">{test.responseTime}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Errors and Recommendations */}
      {healthReport && (healthReport.errors.length > 0 || healthReport.recommendations.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {healthReport.errors.length > 0 && (
            <Card className="bg-red-900/20 border-red-700">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  System Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {healthReport.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-300 bg-red-900/30 p-2 rounded">
                      {error}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {healthReport.recommendations.length > 0 && (
            <Card className="bg-yellow-900/20 border-yellow-700">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {healthReport.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-yellow-300 bg-yellow-900/30 p-2 rounded">
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Perfect Status Message */}
      {healthReport && healthReport.overallStatus === 'PERFECT' && healthReport.errors.length === 0 && (
        <Card className="bg-green-900/20 border-green-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-400 mb-2">
                🎯 SYSTEM PERFECTION ACHIEVED
              </h2>
              <p className="text-green-300">
                All SniperX components are operating with absolute perfection. 
                Every function and button tested successfully with {healthReport.score}% system health score.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
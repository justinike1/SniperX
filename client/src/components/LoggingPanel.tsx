import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, DollarSign, Activity } from 'lucide-react';

interface SafetyStatus {
  canTrade: boolean;
  reason?: string;
  walletBalance: number;
  dailySpent: number;
  recentVolatility?: number;
  lastCircuitBreak?: Date;
}

interface SafetyConfig {
  maxSpendPerTrade: number;
  maxDailySpend: number;
  minWalletBalance: number;
  maxVolatility: number;
  maxSlippage: number;
  priceDropThreshold: number;
  circuitBreakerCooldown: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'trade' | 'safety' | 'warning' | 'error' | 'info';
  message: string;
  details?: any;
}

export function LoggingPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Fetch safety status
  const { data: safetyData } = useQuery({
    queryKey: ['/api/safety/status'],
    refetchInterval: 2000
  });

  // Connect to WebSocket for real-time logs
  useEffect(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}://${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('Log panel connected');
      addLog('info', 'Real-time monitoring started');
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addLog('error', 'Connection error');
    };
    
    socket.onclose = () => {
      addLog('warning', 'Real-time monitoring disconnected');
    };
    
    setWs(socket);
    
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);
  
  const addLog = (type: LogEntry['type'], message: string, details?: any) => {
    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
      details
    };
    
    setLogs(prev => [entry, ...prev].slice(0, 100)); // Keep last 100 logs
  };
  
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'NEW_TRADE':
        addLog('trade', `${message.data.action} ${message.data.amount} SOL of ${message.data.token}`, message.data);
        break;
      case 'SECURITY_ALERT':
        addLog('warning', `Security: ${message.data.message}`, message.data);
        break;
      case 'CIRCUIT_BREAKER':
        addLog('safety', `Circuit breaker: ${message.data.reason}`, message.data);
        break;
      case 'WALLET_UPDATE':
        addLog('info', `Wallet balance: ${message.data.balance} SOL`, message.data);
        break;
      case 'PROFIT_UPDATE':
        addLog('trade', `PnL Update: ${message.data.profit >= 0 ? '+' : ''}${message.data.profit.toFixed(4)} SOL`, message.data);
        break;
      default:
        if (message.data?.message) {
          addLog('info', message.data.message, message.data);
        }
    }
  };
  
  const formatTime = (date: Date) => {
    return date.toTimeString().split(' ')[0];
  };
  
  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'trade': return '💹';
      case 'safety': return '🛡️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
    }
  };
  
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'trade': return 'text-green-500';
      case 'safety': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'info': return 'text-gray-500';
    }
  };

  return (
    <div className="grid gap-4">
      {/* Safety Status Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Safety System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trading Status</span>
                <Badge variant={safetyData?.status?.canTrade ? "success" : "destructive"}>
                  {safetyData?.status?.canTrade ? "ACTIVE" : "BLOCKED"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Wallet Balance</span>
                <span className="font-mono font-bold">
                  {safetyData?.status?.walletBalance?.toFixed(4) || '0.0000'} SOL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Spent</span>
                <span className="font-mono">
                  {safetyData?.status?.dailySpent?.toFixed(4) || '0.0000'} / {safetyData?.config?.maxDailySpend || '1.0'} SOL
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Max Per Trade</span>
                <span className="font-mono">
                  {safetyData?.config?.maxSpendPerTrade || '0.1'} SOL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Min Balance</span>
                <span className="font-mono">
                  {safetyData?.config?.minWalletBalance || '0.05'} SOL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Volatility Limit</span>
                <span className="font-mono">
                  {safetyData?.config?.maxVolatility || '20'}%
                </span>
              </div>
            </div>
          </div>
          {safetyData?.status?.reason && (
            <div className="mt-3 p-2 bg-destructive/10 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{safetyData.status.reason}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Activity Log Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-Time Activity Log
            {ws?.readyState === WebSocket.OPEN && (
              <Badge variant="success" className="ml-auto">
                LIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-1">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Waiting for activity...
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xl">{getLogIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatTime(log.timestamp)}
                        </span>
                        <span className={`text-sm font-medium ${getLogColor(log.type)}`}>
                          {log.message}
                        </span>
                      </div>
                      {log.details && (
                        <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
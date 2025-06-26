import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InstantMarketAccess } from '@/components/InstantMarketAccess';
import { WalletOverview } from '@/components/WalletOverview';
import { BotStatus } from '@/components/BotStatus';
import { RecentTrades } from '@/components/RecentTrades';
import { LiveScanner } from '@/components/LiveScanner';
import { QuickSettings } from '@/components/QuickSettings';
import { AITradingEngine } from '@/components/AITradingEngine';
import { MarketIntelligence } from '@/components/MarketIntelligence';
import { ProfitTracker } from '@/components/ProfitTracker';
import FinanceGeniusAI from '@/components/FinanceGeniusAI';
import { SocialIntelligence } from '@/components/SocialIntelligence';
import { WalletConnector } from '@/components/WalletConnector';
import InteractiveCryptoChart from '@/components/InteractiveCryptoChart';
import RealTimeMarketDashboard from '@/components/RealTimeMarketDashboard';
import { NotificationToast } from '@/components/NotificationToast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { 
  WalletData, 
  BotStatusData, 
  TradeData, 
  TokenScanData, 
  BotSettingsData, 
  NotificationData,
  WebSocketMessage 
} from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

export default function Dashboard() {
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatusData>({
    isActive: false,
    tokensScanned: 0,
    snipesToday: 0,
    status: 'PAUSED'
  });

  // Fetch wallet data
  const { data: userWallet } = useQuery({
    queryKey: ['/api/user/wallet'],
  });

  const { walletData: solanaWallet, isLoading: walletLoading } = useSolanaWallet((userWallet as any)?.address);

  // Fetch recent trades
  const { data: recentTrades = [] } = useQuery<TradeData[]>({
    queryKey: ['/api/trades/recent'],
  });

  // Fetch live tokens
  const { data: liveTokens = [] } = useQuery<TokenScanData[]>({
    queryKey: ['/api/scanner/tokens'],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch bot settings
  const { data: settings } = useQuery<BotSettingsData>({
    queryKey: ['/api/bot/settings'],
  });

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket((message: WebSocketMessage) => {
    switch (message.type) {
      case 'WALLET_UPDATE':
        setWalletData(message.data);
        break;
      case 'BOT_STATUS':
        setBotStatus(message.data);
        break;
      case 'NOTIFICATION':
        setCurrentNotification(message.data);
        break;
    }
  });

  useEffect(() => {
    if (solanaWallet) {
      setWalletData(solanaWallet);
    }
  }, [solanaWallet]);

  const handlePauseBot = async () => {
    try {
      await apiRequest('POST', '/api/bot/toggle', {
        isActive: !botStatus.isActive
      });
      setBotStatus(prev => ({
        ...prev,
        isActive: !prev.isActive,
        status: !prev.isActive ? 'ACTIVE' : 'PAUSED'
      }));
    } catch (error) {
      console.error('Failed to toggle bot:', error);
    }
  };

  const handleSnipeToken = async (tokenAddress: string) => {
    try {
      await apiRequest('POST', '/api/trading/snipe', { tokenAddress });
      setCurrentNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Snipe order placed!',
        message: 'Token snipe has been queued for execution',
        timestamp: new Date().toISOString(),
        autoHide: true,
      });
    } catch (error) {
      console.error('Failed to snipe token:', error);
      setCurrentNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Snipe failed',
        message: 'Unable to place snipe order. Please try again.',
        timestamp: new Date().toISOString(),
        autoHide: true,
      });
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<BotSettingsData>) => {
    try {
      await apiRequest('PATCH', '/api/bot/settings', newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleViewAllTrades = () => {
    // Navigation will be handled by parent component
  };

  const handleOpenSettings = () => {
    // Navigation will be handled by parent component
  };

  const handleAITrade = async (action: string, params: any) => {
    try {
      const tradeData = {
        tokenAddress: params.tokenAddress || liveTokens[0]?.address,
        tokenSymbol: liveTokens[0]?.symbol || 'AI',
        amount: params.amount === 'AUTO' ? settings?.autoBuyAmount || '0.1' : '0.1',
        type: action.toLowerCase(),
        aiConfidence: params.confidence,
        targetPrice: params.targetPrice
      };

      await apiRequest('POST', '/api/trades/ai-execute', tradeData);
      
      setCurrentNotification({
        id: Math.random().toString(36).substr(2, 9),
        type: 'success',
        title: 'AI Trade Executed',
        message: `AI ${action} order placed with ${params.confidence.toFixed(1)}% confidence`,
        timestamp: new Date().toISOString(),
        autoHide: true,
      });
    } catch (error) {
      setCurrentNotification({
        id: Math.random().toString(36).substr(2, 9),
        type: 'error',
        title: 'AI Trade Failed',
        message: 'Unable to execute AI trade. Please try again.',
        timestamp: new Date().toISOString(),
        autoHide: true,
      });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <InstantMarketAccess />
      
      <RealTimeMarketDashboard />
      
      <WalletOverview 
        walletData={walletData} 
        isLoading={walletLoading} 
      />
      
      <ProfitTracker />
      
      <FinanceGeniusAI />
      
      <SocialIntelligence />
      
      <AITradingEngine 
        tokenAddress={liveTokens?.length > 0 ? liveTokens[0].address : undefined}
        onExecuteTrade={handleAITrade}
      />
      
      <LiveScanner 
        tokens={liveTokens}
        onSnipeToken={handleSnipeToken}
      />
      
      <BotStatus 
        botStatus={botStatus}
        onPauseBot={handlePauseBot}
        onOpenSettings={handleOpenSettings}
      />
      
      <RecentTrades 
        trades={recentTrades}
        onViewAll={handleViewAllTrades}
      />

      {currentNotification && (
        <NotificationToast 
          notification={currentNotification}
          onClose={() => setCurrentNotification(null)}
        />
      )}
    </div>
  );
}

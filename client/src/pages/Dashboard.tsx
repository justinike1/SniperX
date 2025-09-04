import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { InstantMarketAccess } from '@/components/InstantMarketAccess';
import { WalletOverview } from '@/components/WalletOverview';
import { InstantWalletAccess } from '@/components/InstantWalletAccess';
import { BotStatus } from '@/components/BotStatus';
import { RecentTrades } from '@/components/RecentTrades';
import { LiveScanner } from '@/components/LiveScanner';
import { QuickSettings } from '@/components/QuickSettings';
import { AITradingEngine } from '@/components/AITradingEngine';
import { MarketIntelligence } from '@/components/MarketIntelligence';
import { ProfitTracker } from '@/components/ProfitTracker';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import EnhancedFinanceGeniusAI from '@/components/EnhancedFinanceGeniusAI';
import SocialIntelligenceCenter from '@/components/SocialIntelligenceCenter';
import { SocialIntelligence } from '@/components/SocialIntelligence';
import { SocialIntelligenceAlerts } from '@/components/SocialIntelligenceAlerts';
import { GlobalTradingIntelligence } from '@/components/GlobalTradingIntelligence';
import { InsiderTradingIntelligence } from '@/components/InsiderTradingIntelligence';
import { FixedTradingOnboarding } from '@/components/FixedTradingOnboarding';
import { BeginTradingButton } from '@/components/BeginTradingButton';
import { WalletConnector } from '@/components/WalletConnector';
import InteractiveCryptoChart from '@/components/InteractiveCryptoChart';
import RealTimeMarketDashboard from '@/components/RealTimeMarketDashboard';
import LiveActionCharts from '@/components/LiveActionCharts';
import { LiveActionChart } from '@/components/LiveActionChart';
import HighWinRateStrategy from '@/components/HighWinRateStrategy';
import ContinuousTradingBot from '@/components/ContinuousTradingBot';
import { NotificationToast } from '@/components/NotificationToast';
import { ProductionModeNotification } from '@/components/ProductionModeNotification';
import { AutomatedLightTrading } from '@/components/AutomatedLightTrading';
import { UltimateSuccessDashboard } from '@/components/UltimateSuccessDashboard';
import { WalletFunding } from '@/components/WalletFunding';
import { SupremeTradingBot } from '@/components/SupremeTradingBot';
import { MainTradingHub } from '@/components/MainTradingHub';
import { WalletBalanceSlider } from '@/components/WalletBalanceSlider';
import { RealMoneyBanner } from '@/components/RealMoneyBanner';
import { GPTPerformanceDashboard } from '@/components/GPTPerformanceDashboard';
import AdvancedSellEngine from '@/components/AdvancedSellEngine';
import MaximumBotDashboard from '@/components/MaximumBotDashboard';
import FinalDeploymentDashboard from '@/components/FinalDeploymentDashboard';
import MultiEnvDeploymentDashboard from '@/components/MultiEnvDeploymentDashboard';
import JupiterPnLDashboard from '@/components/JupiterPnLDashboard';
import FundProtectionDashboard from '@/components/FundProtectionDashboard';
import DiversifiedTradingDashboard from '@/components/DiversifiedTradingDashboard';
import Autonomous24x7Dashboard from '@/components/Autonomous24x7Dashboard';
import SimpleWalletBackup from '@/components/SimpleWalletBackup';
import PhantomWalletMonitor from '@/components/PhantomWalletMonitor';
import { EmotionalSentimentVisualizer } from '@/components/EmotionalSentimentVisualizer';
import PluginManager from '@/components/PluginManager';
import { PluginDashboard } from '@/components/PluginDashboard';
import { MasterIntelligenceDashboard } from '@/components/MasterIntelligenceDashboard';
import AlfredAIDashboard from '@/components/AlfredAIDashboard';
import AdvancedSellEngineUI from '@/components/AdvancedSellEngineUI';
import { SimpleTrading } from '@/components/SimpleTrading';
import LiveTradingPanel from '@/components/LiveTradingPanel';
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
  const [showOnboarding, setShowOnboarding] = useState(false); // Only shown when user clicks Setup Trading Configuration
  const [tradingActive, setTradingActive] = useState(true); // Trading hub active by default
  const [botStatus, setBotStatus] = useState<BotStatusData>({
    isActive: false,
    tokensScanned: 0,
    snipesToday: 0,
    status: 'PAUSED'
  });

  // Fetch wallet data with instant access
  const { data: userWallet, isLoading: lightspeedWalletLoading, error: walletError } = useQuery({
    queryKey: ['/api/user/wallet'],
    retry: 3,
    retryDelay: 1000,
  });

  const { walletData: solanaWallet, isLoading: solanaWalletLoading } = useSolanaWallet((userWallet as any)?.wallet?.address);
  
  const isWalletLoading = lightspeedWalletLoading || solanaWalletLoading;

  // Fetch recent trades with safe data handling
  const { data: recentTradesData } = useQuery<any>({
    queryKey: ['/api/trades/recent'],
  });
  
  const recentTrades = Array.isArray(recentTradesData?.trades) ? recentTradesData.trades : [];

  // Fetch live tokens with safe data handling - reduced refresh rate
  const { data: liveTokensData } = useQuery<any>({
    queryKey: ['/api/scanner/tokens'],
    refetchInterval: 15000, // Refetch every 15 seconds for smoother experience
  });
  
  const liveTokens = Array.isArray(liveTokensData?.tokens) ? liveTokensData.tokens : [];

  // Fetch bot settings
  const { data: settings } = useQuery<BotSettingsData>({
    queryKey: ['/api/bot/settings'],
  });

  // Onboarding is only shown when explicitly requested via "Setup Trading Configuration" button

  const handleOnboardingComplete = () => {
    setTradingActive(true);
    setShowOnboarding(false);
    localStorage.setItem('onboarding_completed', 'true');
    
    // Enable all trading systems and profit maximization
    setBotStatus({
      isActive: true,
      tokensScanned: 0,
      snipesToday: 0,
      status: 'ACTIVE'
    });
    
    // Trigger immediate refresh of all trading components
    window.location.reload();
  };

  const handleBeginTrading = () => {
    // Direct navigation to trading bot - no wizard
    setTradingActive(true);
    setShowOnboarding(false);
  };

  const handleSetupTrading = () => {
    setShowOnboarding(true);
  };

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

  // Show onboarding flow only when explicitly requested via Setup Trading Configuration button
  if (showOnboarding) {
    return (
      <FixedTradingOnboarding onComplete={handleOnboardingComplete} />
    );
  }

  return (
    <div className="space-y-6 pb-20 optimized-container">
      <div className="prevent-layout-shift">
        <RealMoneyBanner />
      </div>
      
      <div className="gpu-accelerated">
        <BeginTradingButton 
          onBeginTrading={handleBeginTrading}
          isActive={tradingActive && settings?.isActive}
        />
      </div>
      
      {tradingActive && (
        <div className="flex justify-center mb-4">
          <Button 
            onClick={handleSetupTrading}
            variant="outline"
            className="bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/30"
          >
            Setup Trading Configuration
          </Button>
        </div>
      )}
      
      <div className="smooth-update">
        <SimpleTrading />
      </div>
      
      <div className="smooth-update">
        <LiveTradingPanel />
      </div>
      
      <div className="smooth-update">
        <MasterIntelligenceDashboard />
      </div>
      
      <div className="smooth-update">
        <AlfredAIDashboard />
      </div>
      
      <div className="smooth-update">
        <AdvancedSellEngineUI />
      </div>
      
      <div className="smooth-update">
        <SocialIntelligenceAlerts />
      </div>
      
      <div className="smooth-update">
        <GlobalTradingIntelligence />
      </div>
      
      <div className="smooth-update">
        <InsiderTradingIntelligence />
      </div>
      
      <div className="gpu-accelerated">
        <InstantMarketAccess />
      </div>
      
      <div className="smooth-update">
        <RealTimeMarketDashboard />
      </div>
      
      <div className="smooth-update">
        <GPTPerformanceDashboard />
      </div>
      
      <div className="smooth-update">
        <JupiterPnLDashboard />
      </div>
      
      <div className="smooth-update">
        <FundProtectionDashboard />
      </div>
      
      <div className="smooth-update">
        <DiversifiedTradingDashboard />
      </div>
      
      <div className="smooth-update">
        <Autonomous24x7Dashboard />
      </div>
      
      <div className="smooth-update">
        <SimpleWalletBackup />
      </div>
      
      <div className="smooth-update">
        <PhantomWalletMonitor />
      </div>
      
      <div className="smooth-update">
        <EmotionalSentimentVisualizer />
      </div>
      
      <div className="smooth-update">
        <FinalDeploymentDashboard />
      </div>
      
      <div className="smooth-update">
        <MultiEnvDeploymentDashboard />
      </div>
      
      {/* LiveActionChart temporarily disabled to fix infinite loop */}
      
      <div className="smooth-update">
        <SocialIntelligenceAlerts />
      </div>
      
      <div className="smooth-update">
        <InsiderTradingIntelligence />
      </div>
      
      <div className="gpu-accelerated">
        <InstantWalletAccess />
      </div>
      
      <ErrorBoundary>
        <ProfitTracker />
      </ErrorBoundary>
      
      <ContinuousTradingBot />
      
      <HighWinRateStrategy />
      
      <EnhancedFinanceGeniusAI />
      
      <SocialIntelligence />
      
      <AutomatedLightTrading />
      
      <UltimateSuccessDashboard />
      
      <MaximumBotDashboard />
      
      <AdvancedSellEngine />
      
      <PluginManager />
      
      <PluginDashboard />
      
      <AITradingEngine 
        tokenAddress={liveTokens?.length > 0 ? liveTokens[0].address : undefined}
        onExecuteTrade={handleAITrade}
      />
      
      <LiveActionCharts />
      
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

      {/* Wallet Balance Slider at bottom after setup completion */}
      {!showOnboarding && (
        <WalletBalanceSlider />
      )}
    </div>
  );
}

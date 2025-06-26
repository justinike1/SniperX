import { BotStatusData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Pause, Settings } from 'lucide-react';

interface BotStatusProps {
  botStatus: BotStatusData;
  onPauseBot: () => void;
  onOpenSettings: () => void;
}

export const BotStatus = ({ botStatus, onPauseBot, onOpenSettings }: BotStatusProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-profit-green';
      case 'PAUSED':
        return 'text-warning-orange';
      case 'ERROR':
        return 'text-loss-red';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <section className="px-4 pb-6">
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Bot Status</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${botStatus.isActive ? 'bg-profit-green animate-pulse' : 'bg-warning-orange'}`}></div>
            <span className={`text-sm font-medium ${getStatusColor(botStatus.status)}`}>
              {botStatus.status}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-dark-bg rounded-lg p-3">
            <p className="text-sm text-gray-400">Tokens Scanned</p>
            <p className="text-xl font-bold font-mono">{botStatus.tokensScanned.toLocaleString()}</p>
          </div>
          <div className="bg-dark-bg rounded-lg p-3">
            <p className="text-sm text-gray-400">Snipes Today</p>
            <p className="text-xl font-bold font-mono">{botStatus.snipesToday}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            className="flex-1 bg-loss-red hover:bg-red-600 text-white"
            onClick={onPauseBot}
          >
            <Pause className="w-4 h-4 mr-2" />
            {botStatus.isActive ? 'Pause Bot' : 'Resume Bot'}
          </Button>
          <Button 
            variant="outline"
            className="flex-1 bg-dark-bg hover:bg-gray-700 border-dark-border"
            onClick={onOpenSettings}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </section>
  );
};

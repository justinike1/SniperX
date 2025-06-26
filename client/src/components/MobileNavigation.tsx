import { Settings } from 'lucide-react';

interface MobileNavigationProps {
  isConnected: boolean;
}

export const MobileNavigation = ({ isConnected }: MobileNavigationProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-dark-surface border-b border-dark-border z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-accent-purple to-profit-green rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 7L12 12L20 7L12 2Z" />
              <path d="M4 12L12 17L20 12" />
            </svg>
          </div>
          <span className="font-semibold text-lg">SniperX</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-profit-green animate-pulse' : 'bg-loss-red'}`}></div>
            <span className="text-gray-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button className="p-2 hover:bg-dark-border rounded-lg transition-colors">
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </nav>
  );
};

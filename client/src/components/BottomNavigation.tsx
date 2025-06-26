import { BarChart3, ArrowLeftRight, Search, Settings } from 'lucide-react';
import { useLocation } from 'wouter';

interface BottomNavigationProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const BottomNavigation = ({ onNavigate, currentPage }: BottomNavigationProps) => {
  const [, setLocation] = useLocation();

  const handleNavigation = (page: string, path: string) => {
    onNavigate(page);
    setLocation(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-surface border-t border-dark-border">
      <div className="flex items-center justify-around py-2">
        <button 
          className={`flex flex-col items-center p-2 transition-colors ${
            currentPage === 'dashboard' ? 'text-accent-purple' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => handleNavigation('dashboard', '/')}
        >
          <BarChart3 className="w-5 h-5 mb-1" />
          <span className="text-xs">Dashboard</span>
        </button>
        
        <button 
          className={`flex flex-col items-center p-2 transition-colors ${
            currentPage === 'trades' ? 'text-accent-purple' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => handleNavigation('trades', '/trades')}
        >
          <ArrowLeftRight className="w-5 h-5 mb-1" />
          <span className="text-xs">Trades</span>
        </button>
        
        <button 
          className={`flex flex-col items-center p-2 transition-colors ${
            currentPage === 'scanner' ? 'text-accent-purple' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => handleNavigation('scanner', '/scanner')}
        >
          <Search className="w-5 h-5 mb-1" />
          <span className="text-xs">Scanner</span>
        </button>
        
        <button 
          className={`flex flex-col items-center p-2 transition-colors ${
            currentPage === 'settings' ? 'text-accent-purple' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => handleNavigation('settings', '/settings')}
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </nav>
  );
};

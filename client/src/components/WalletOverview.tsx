import { WalletData } from '@/lib/types';
import { formatAddress } from '@/lib/solana';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletOverviewProps {
  walletData: WalletData | null;
  isLoading: boolean;
}

export const WalletOverview = ({ walletData, isLoading }: WalletOverviewProps) => {
  if (isLoading) {
    return (
      <section className="px-4 py-6">
        <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32 bg-dark-border" />
            <Skeleton className="h-4 w-16 bg-dark-border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <Skeleton className="h-8 w-24 mx-auto mb-2 bg-dark-border" />
              <Skeleton className="h-4 w-20 mx-auto bg-dark-border" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-24 mx-auto mb-2 bg-dark-border" />
              <Skeleton className="h-4 w-16 mx-auto bg-dark-border" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!walletData) {
    return (
      <section className="px-4 py-6">
        <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
          <div className="text-center">
            <p className="text-gray-400">No wallet connected</p>
            <p className="text-sm text-gray-500 mt-2">Connect your Solana wallet to get started</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-6">
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Portfolio Overview</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 7L12 12L20 7L12 2Z" />
              <path d="M4 12L12 17L20 12" />
            </svg>
            <span>Solana</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold font-mono">{walletData.balanceFormatted}</p>
            <p className="text-sm text-gray-400">Total Balance</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-profit-green font-mono">{walletData.profitLossFormatted}</p>
            <p className="text-sm text-gray-400">24h P&L</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-dark-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Wallet Address:</span>
            <span className="font-mono text-xs bg-dark-bg px-2 py-1 rounded">
              {walletData.address ? formatAddress(walletData.address) : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

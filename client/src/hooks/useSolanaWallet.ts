import { useState, useEffect } from 'react';
import { WalletData } from '@/lib/types';
import { getSolBalance, formatSolAmount } from '@/lib/solana';

export const useSolanaWallet = (address?: string) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const balance = await getSolBalance(walletAddress);
      
      // For demo purposes, we'll simulate profit/loss calculation
      // In a real implementation, this would come from trade history
      const mockProfitLoss = 2847.32;
      
      setWalletData({
        address: walletAddress,
        balance,
        balanceFormatted: `${formatSolAmount(balance * 1000000000)} SOL`,
        profitLoss: mockProfitLoss,
        profitLossFormatted: `+$${mockProfitLoss.toFixed(2)}`,
      });
    } catch (err) {
      setError('Failed to fetch wallet data');
      console.error('Wallet fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchWalletData(address);
    }
  }, [address]);

  return {
    walletData,
    isLoading,
    error,
    refetch: () => address && fetchWalletData(address),
  };
};

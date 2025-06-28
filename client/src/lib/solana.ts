// Browser-compatible Solana utilities without Buffer dependency
const LAMPORTS_PER_SOL = 1000000000;
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export const formatSolAmount = (lamports: number): string => {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
};

export const formatAddress = (address: string): string => {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const validateSolanaAddress = (address: string): boolean => {
  try {
    // Basic Solana address validation without Buffer dependency
    if (!address || address.length < 32 || address.length > 44) return false;
    
    // Check if it's base58 encoded
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address);
  } catch {
    return false;
  }
};

export const getSolBalance = async (address: string): Promise<number> => {
  try {
    if (!address || address.length === 0) {
      return 0;
    }
    
    // Use RPC call directly without Web3.js to avoid Buffer issues
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });
    
    const data = await response.json();
    const balance = data.result?.value || 0;
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    return 0;
  }
};

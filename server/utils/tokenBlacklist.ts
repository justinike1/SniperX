/**
 * TOKEN BLACKLIST SYSTEM
 * Prevents trading of banned tokens like BONK
 */

const BANNED_TOKENS = new Set([
  'BONK',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK address
]);

const BANNED_ADDRESSES = new Set([
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
]);

export function isTokenBanned(symbol: string, address?: string): boolean {
  if (BANNED_TOKENS.has(symbol.toUpperCase())) {
    return true;
  }
  
  if (address && BANNED_ADDRESSES.has(address)) {
    return true;
  }
  
  return false;
}

export function banToken(symbol: string, address?: string): void {
  BANNED_TOKENS.add(symbol.toUpperCase());
  if (address) {
    BANNED_ADDRESSES.add(address);
  }
  console.log(`🚫 Banned token: ${symbol} ${address ? `(${address})` : ''}`);
}

export function getBannedTokens(): string[] {
  return Array.from(BANNED_TOKENS);
}

export function getBannedAddresses(): string[] {
  return Array.from(BANNED_ADDRESSES);
}
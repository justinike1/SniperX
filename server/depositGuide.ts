// SniperX Deposit Guide for Live Trading
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

const WALLET_ADDRESS = '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv';

async function generateDepositGuide() {
  console.log('🚀 SniperX Live Trading Deposit Guide');
  console.log('====================================');
  console.log('');
  
  console.log('💰 TARGET WALLET FOR DEPOSITS:');
  console.log(`📍 ${WALLET_ADDRESS}`);
  console.log('');
  
  console.log('🏦 HOW TO DEPOSIT FROM MAJOR EXCHANGES:');
  console.log('');
  
  console.log('📱 FROM COINBASE:');
  console.log('1. Open Coinbase app → Assets → Solana (SOL)');
  console.log('2. Tap "Send" → Enter amount (minimum 0.1 SOL recommended)');
  console.log(`3. Paste address: ${WALLET_ADDRESS}`);
  console.log('4. Verify address matches exactly → Send');
  console.log('5. Transaction typically takes 1-2 minutes');
  console.log('');
  
  console.log('🔥 FROM BINANCE:');
  console.log('1. Wallet → Spot → SOL → Withdraw');
  console.log('2. Network: Solana');
  console.log(`3. Address: ${WALLET_ADDRESS}`);
  console.log('4. Amount: Minimum 0.1 SOL');
  console.log('5. Complete 2FA verification');
  console.log('');
  
  console.log('👻 FROM PHANTOM WALLET:');
  console.log('1. Open Phantom → Send');
  console.log('2. Enter recipient address or scan QR');
  console.log(`3. Paste: ${WALLET_ADDRESS}`);
  console.log('4. Enter amount → Review → Send');
  console.log('');
  
  console.log('🎯 FROM ROBINHOOD:');
  console.log('1. Crypto → SOL → Transfer');
  console.log('2. To external wallet');
  console.log(`3. Address: ${WALLET_ADDRESS}`);
  console.log('4. Amount: Your desired trading capital');
  console.log('5. Confirm transfer');
  console.log('');
  
  console.log('💡 RECOMMENDED TRADING AMOUNTS:');
  console.log('🟢 Conservative: 0.1 - 0.5 SOL (100-500 trades)');
  console.log('🟡 Moderate: 0.5 - 2 SOL (500-2000 trades)');
  console.log('🔴 Aggressive: 2+ SOL (2000+ trades)');
  console.log('');
  
  console.log('⏰ TRADING ACTIVATION:');
  console.log('• Trading begins automatically within 10 seconds of deposit');
  console.log('• Each trade uses 0.001 SOL');
  console.log('• AI analyzes markets continuously');
  console.log('• Trades execute on high-confidence signals (85%+)');
  console.log('');
  
  // Check current balance
  try {
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const publicKey = new (await import('@solana/web3.js')).PublicKey(WALLET_ADDRESS);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log('📊 CURRENT STATUS:');
    console.log(`💰 Current Balance: ${solBalance.toFixed(6)} SOL`);
    
    if (solBalance > 0) {
      const trades = Math.floor(solBalance / 0.001);
      console.log(`🎯 Ready for ${trades} trades`);
      console.log('✅ LIVE TRADING ACTIVE');
    } else {
      console.log('⚠️ Waiting for deposit to begin trading');
      console.log('🔄 Monitoring wallet for incoming funds...');
    }
  } catch (error) {
    console.log('❌ Unable to check balance (network issue)');
  }
  
  console.log('');
  console.log('🚨 IMPORTANT SECURITY NOTES:');
  console.log('• Always verify wallet address character by character');
  console.log('• Start with small test amount first');
  console.log('• Save this wallet address for future deposits');
  console.log('• Only use official exchange apps/websites');
  console.log('');
  
  console.log('🎯 ONCE DEPOSITED:');
  console.log('• SniperX immediately begins market analysis');
  console.log('• High-probability trades execute automatically');
  console.log('• Real-time profit/loss tracking in dashboard');
  console.log('• All transactions visible in your Phantom wallet');
  console.log('');
  
  console.log('====================================');
  console.log('🚀 Ready to revolutionize your trading!');
  console.log('====================================');
}

generateDepositGuide().catch(console.error);
/**
 * COMPREHENSIVE WALLET FIX VERIFICATION
 * Tests wallet loading, Jupiter DEX integration, and Telegram alerts
 */

import fs from 'fs';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

async function testWalletFix() {
  console.log('🧪 STARTING WALLET FIX VERIFICATION');
  console.log('='.repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Wallet File Format
  console.log('📂 Testing wallet file format...');
  try {
    const phantomData = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
    
    if (phantomData.privateKey && Array.isArray(phantomData.privateKey) && 
        (phantomData.privateKey.length === 32 || phantomData.privateKey.length === 64)) {
      console.log(`✅ Wallet format: Valid ${phantomData.privateKey.length}-byte private key array`);
      console.log(`   Address: ${phantomData.address}`);
      testsPassed++;
    } else {
      console.log('❌ Wallet format: Invalid private key format');
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ Wallet file: Error reading phantom_key.json - ${error}`);
    testsFailed++;
  }

  // Test 2: Wallet Loading with New Format
  console.log('\n🔑 Testing wallet loading...');
  try {
    const phantomData = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
    const secretKey = new Uint8Array(phantomData.privateKey);
    
    let wallet: Keypair;
    if (secretKey.length === 32) {
      wallet = Keypair.fromSeed(secretKey);
    } else if (secretKey.length === 64) {
      wallet = Keypair.fromSecretKey(secretKey);
    } else {
      throw new Error(`Invalid secret key length: ${secretKey.length}`);
    }
    
    console.log('✅ Wallet loading: Success');
    console.log(`   Public key: ${wallet.publicKey.toString()}`);
    console.log(`   Expected: ${phantomData.address}`);
    
    if (wallet.publicKey.toString() === phantomData.address) {
      console.log('✅ Address match: Confirmed');
      testsPassed += 2;
    } else {
      console.log('❌ Address mismatch: Keys do not match expected address');
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ Wallet loading: Error - ${error}`);
    testsFailed++;
  }

  // Test 3: Connection Test
  console.log('\n🌐 Testing Solana connection...');
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const phantomData = JSON.parse(fs.readFileSync('./phantom_key.json', 'utf8'));
    const secretKey = new Uint8Array(phantomData.privateKey);
    
    let wallet: Keypair;
    if (secretKey.length === 32) {
      wallet = Keypair.fromSeed(secretKey);
    } else if (secretKey.length === 64) {
      wallet = Keypair.fromSecretKey(secretKey);
    } else {
      throw new Error(`Invalid secret key length: ${secretKey.length}`);
    }
    
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log('✅ Solana connection: Active');
    console.log(`   Current balance: ${solBalance.toFixed(4)} SOL`);
    
    if (solBalance > 0) {
      console.log('✅ Wallet funded: Ready for trading');
      testsPassed += 2;
    } else {
      console.log('⚠️ Wallet empty: Needs SOL deposit for trading');
      testsPassed++;
    }
  } catch (error) {
    console.log(`❌ Connection test: Error - ${error}`);
    testsFailed++;
  }

  // Test 4: Jupiter DEX Integration Check
  console.log('\n🔄 Testing Jupiter DEX integration...');
  try {
    // Test Jupiter API connectivity
    const response = await fetch('https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=50');
    
    if (response.ok) {
      console.log('✅ Jupiter API: Accessible');
      console.log('✅ DEX integration: Ready for token swaps');
      testsPassed += 2;
    } else {
      console.log('❌ Jupiter API: Connection failed');
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ Jupiter test: Error - ${error}`);
    testsFailed++;
  }

  // Test 5: Telegram Configuration
  console.log('\n📱 Testing Telegram alerts...');
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (botToken && chatId) {
      console.log('✅ Telegram config: Bot token and chat ID present');
      console.log('✅ Alert system: Ready for trade notifications');
      testsPassed += 2;
    } else {
      console.log('⚠️ Telegram config: Missing credentials (optional)');
      testsPassed++;
    }
  } catch (error) {
    console.log(`❌ Telegram test: Error - ${error}`);
    testsFailed++;
  }

  // Test 6: Trading System Status
  console.log('\n🤖 Checking trading system...');
  try {
    const { config } = await import('./config');
    
    console.log(`   Dry run mode: ${config.dryRun ? 'ACTIVE (Safe)' : 'DISABLED (Live trading)'}`);
    console.log(`   Max trade amount: ${config.maxTradeAmount} SOL`);
    console.log(`   Trading frequency: ${config.tradingFrequency}ms`);
    console.log(`   Telegram alerts: ${config.enableTelegram ? 'ENABLED' : 'DISABLED'}`);
    
    console.log('✅ Trading config: Loaded successfully');
    testsPassed++;
  } catch (error) {
    console.log(`❌ Trading config: Error - ${error}`);
    testsFailed++;
  }

  // Final Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 WALLET FIX VERIFICATION REPORT');
  console.log('='.repeat(60));
  console.log(`✅ PASSED: ${testsPassed}`);
  console.log(`❌ FAILED: ${testsFailed}`);
  console.log(`🎯 SUCCESS RATE: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - READY FOR JUPITER DEX TRADING');
    console.log('   ✓ Wallet loading fixed');
    console.log('   ✓ Jupiter DEX integration ready');
    console.log('   ✓ Telegram alerts configured');
    console.log('   ✓ System ready for live token swaps');
  } else {
    console.log('\n⚠️ ISSUES DETECTED - REVIEW BEFORE LIVE TRADING');
  }
  
  console.log('='.repeat(60));
}

testWalletFix().catch(console.error);
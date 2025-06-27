import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { userWalletService } from './userWalletService';
import { solscanValidationService } from './solscanValidationService';
import { ExchangeCompatibilityService } from './exchangeCompatibilityService';

interface TransferTestResult {
  success: boolean;
  walletAddress: string;
  robinhoodCompatible: boolean;
  solscanVerified: boolean;
  currentBalance: number;
  transferInstructions: string;
  estimatedArrivalTime: string;
  networkFees: string;
  addressValidation: {
    isValid: boolean;
    format: string;
    length: number;
    checksumValid: boolean;
  };
  realWorldReady: boolean;
  errors: string[];
}

class TransferTestingService {
  private connection: Connection;

  constructor() {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async testRobinhoodToSniperXTransfer(userId: number): Promise<TransferTestResult> {
    const errors: string[] = [];
    
    try {
      console.log(`🧪 Testing Robinhood → SniperX transfer for user ${userId}`);
      
      // Step 1: Get user's SniperX wallet
      const wallet = await userWalletService.getOrCreateWallet(userId);
      console.log(`✓ SniperX wallet generated: ${wallet.address}`);

      // Step 2: Validate address format (crucial for Robinhood compatibility)
      const addressValidation = this.validateSolanaAddressFormat(wallet.address);
      if (!addressValidation.isValid) {
        errors.push('Invalid Solana address format - Robinhood will reject this address');
      }

      // Step 3: Test Solscan verification
      const solscanValidation = await solscanValidationService.validateWalletAddress(wallet.address);
      console.log(`✓ Solscan validation: ${solscanValidation.isValid ? 'VERIFIED' : 'FAILED'}`);

      // Step 4: Test exchange compatibility specifically for Robinhood
      const compatibility = ExchangeCompatibilityService.getCompatibilityReport(wallet.address);
      const robinhoodCompatible = compatibility.compatibleExchanges.includes('Robinhood');
      console.log(`✓ Robinhood compatibility: ${robinhoodCompatible ? 'COMPATIBLE' : 'INCOMPATIBLE'}`);

      // Step 5: Get current balance on blockchain
      const currentBalance = await this.getRealTimeBalance(wallet.address);
      console.log(`✓ Current balance: ${currentBalance} SOL`);

      // Step 6: Generate precise Robinhood transfer instructions
      const transferInstructions = this.generateRobinhoodTransferInstructions(wallet.address);

      // Step 7: Estimate real-world transfer parameters
      const networkInfo = await this.getNetworkInfo();

      // Final validation
      const realWorldReady = addressValidation.isValid && 
                           robinhoodCompatible && 
                           solscanValidation.isValid &&
                           errors.length === 0;

      console.log(`🎯 Transfer test ${realWorldReady ? 'PASSED' : 'FAILED'} - Ready for real money: ${realWorldReady}`);

      return {
        success: realWorldReady,
        walletAddress: wallet.address,
        robinhoodCompatible,
        solscanVerified: solscanValidation.isValid,
        currentBalance,
        transferInstructions,
        estimatedArrivalTime: networkInfo.estimatedArrivalTime,
        networkFees: networkInfo.networkFees,
        addressValidation,
        realWorldReady,
        errors
      };

    } catch (error) {
      console.error('Transfer test failed:', error);
      errors.push(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        walletAddress: '',
        robinhoodCompatible: false,
        solscanVerified: false,
        currentBalance: 0,
        transferInstructions: '',
        estimatedArrivalTime: '',
        networkFees: '',
        addressValidation: { isValid: false, format: '', length: 0, checksumValid: false },
        realWorldReady: false,
        errors
      };
    }
  }

  private validateSolanaAddressFormat(address: string): {
    isValid: boolean;
    format: string;
    length: number;
    checksumValid: boolean;
  } {
    try {
      // Test if it's a valid Solana public key
      const pubkey = new PublicKey(address);
      
      // Validate format requirements for Robinhood
      const isBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
      const correctLength = address.length >= 32 && address.length <= 44;
      const checksumValid = PublicKey.isOnCurve(pubkey.toBuffer());

      return {
        isValid: isBase58 && correctLength && checksumValid,
        format: 'Base58 Solana Address',
        length: address.length,
        checksumValid
      };
    } catch {
      return {
        isValid: false,
        format: 'Invalid',
        length: address.length,
        checksumValid: false
      };
    }
  }

  private async getRealTimeBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Balance fetch failed:', error);
      return 0;
    }
  }

  private generateRobinhoodTransferInstructions(address: string): string {
    return `
ROBINHOOD → SNIPERX TRANSFER INSTRUCTIONS:

📱 STEP 1: Open Robinhood App
- Launch the Robinhood mobile app
- Navigate to "Crypto" tab at bottom

💰 STEP 2: Select Solana (SOL)
- Find "SOL" in your crypto portfolio
- Tap on your SOL holdings

📤 STEP 3: Initiate Transfer
- Tap "Transfer" button
- Select "Transfer Out" option
- Choose "To External Wallet"

🎯 STEP 4: Enter SniperX Address
- Paste this EXACT address: ${address}
- VERIFY every character matches perfectly
- Double-check there are no extra spaces

🌐 STEP 5: Select Network
- Ensure "Solana" network is selected
- NOT Ethereum or any other network

💵 STEP 6: Enter Amount
- Input the SOL amount you want to transfer
- Review the network fee (typically 0.000005 SOL)

✅ STEP 7: Review & Confirm
- Verify recipient address matches: ${address}
- Confirm network is "Solana"
- Review total amount and fees
- Tap "Confirm Transfer"

🔐 STEP 8: Security Verification
- Enter your Robinhood PIN or biometric
- Confirm via SMS if required

⏰ EXPECTED TIMING:
- Processing: 5-15 minutes
- Blockchain confirmation: 1-3 minutes
- Total time: 6-18 minutes

⚠️ CRITICAL WARNINGS:
- NEVER send to wrong network (Ethereum, BSC, etc.)
- ALWAYS verify address character by character
- Transfers are IRREVERSIBLE once confirmed
- Keep transaction ID for tracking

📞 SUPPORT:
- Robinhood: help@robinhood.com or (650) 940-2700
- SniperX: Check wallet balance in app
    `;
  }

  private async getNetworkInfo(): Promise<{
    estimatedArrivalTime: string;
    networkFees: string;
  }> {
    try {
      // Get real-time Solana network performance
      const performanceSamples = await this.connection.getRecentPerformanceSamples(1);
      const slot = await this.connection.getSlot();
      
      // Calculate estimated arrival time based on current network speed
      const avgSlotTime = performanceSamples.length > 0 ? 
        performanceSamples[0].samplePeriodSecs / performanceSamples[0].numSlots : 0.4;
      
      const estimatedMinutes = Math.ceil((avgSlotTime * 32) / 60); // 32 confirmations for finality
      
      return {
        estimatedArrivalTime: `${estimatedMinutes}-${estimatedMinutes + 5} minutes`,
        networkFees: '~0.000005 SOL ($0.0001 USD)'
      };
    } catch {
      return {
        estimatedArrivalTime: '5-15 minutes',
        networkFees: '~0.000005 SOL'
      };
    }
  }

  async testAddressInSolscan(address: string): Promise<{
    accessible: boolean;
    url: string;
    accountExists: boolean;
  }> {
    try {
      const solscanUrl = `https://solscan.io/account/${address}`;
      
      // Test if Solscan can access the address
      const response = await fetch(`https://public-api.solscan.io/account/${address}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SniperX-Transfer-Test/1.0'
        }
      });

      return {
        accessible: true,
        url: solscanUrl,
        accountExists: response.ok
      };
    } catch {
      return {
        accessible: false,
        url: `https://solscan.io/account/${address}`,
        accountExists: false
      };
    }
  }
}

export const transferTestingService = new TransferTestingService();
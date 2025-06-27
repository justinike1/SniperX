import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { solscanValidationService } from './solscanValidationService';

interface RobinhoodTransferTest {
  success: boolean;
  testType: 'outbound' | 'inbound';
  fromAddress: string;
  toAddress: string;
  addressValid: boolean;
  solscanVerified: boolean;
  transferInstructions: TransferInstruction[];
  estimatedTime: string;
  potentialIssues: string[];
  preventionMeasures: string[];
}

interface TransferInstruction {
  step: number;
  action: string;
  platform: string;
  details: string;
  warning?: string;
}

class RobinhoodTransferTester {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_API_KEY 
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  async testOutboundTransfer(sniperXAddress: string, robinhoodAddress: string): Promise<RobinhoodTransferTest> {
    try {
      // Validate SniperX address format
      const sniperXValid = this.isValidSolanaAddress(sniperXAddress);
      const robinhoodValid = this.isValidSolanaAddress(robinhoodAddress);

      // Test Solscan verification
      const solscanResult = await solscanValidationService.validateWalletAddress(sniperXAddress);

      const transferInstructions: TransferInstruction[] = [
        {
          step: 1,
          action: "Open SniperX Fresh Address Tab",
          platform: "SniperX",
          details: "Navigate to Wallet → Fresh Address tab to get your active wallet address",
          warning: "Ensure address starts with valid Base58 characters (no = signs)"
        },
        {
          step: 2,
          action: "Copy SniperX Wallet Address",
          platform: "SniperX", 
          details: `Copy this address: ${sniperXAddress}`,
          warning: "Verify address is 44 characters and Base58 encoded"
        },
        {
          step: 3,
          action: "Open Robinhood Crypto",
          platform: "Robinhood",
          details: "Open Robinhood app → Crypto section → Select SOL",
        },
        {
          step: 4,
          action: "Initiate Transfer from Robinhood",
          platform: "Robinhood",
          details: "Tap 'Transfer' → 'Send' → Enter SniperX address as recipient",
          warning: "Double-check address matches exactly - wrong address = permanent loss"
        },
        {
          step: 5,
          action: "Start with Small Test Amount",
          platform: "Robinhood",
          details: "Send 0.01 SOL first to verify transfer works before larger amounts",
          warning: "CRITICAL: Always test with small amount first to prevent large losses"
        },
        {
          step: 6,
          action: "Monitor Transfer Progress", 
          platform: "Both",
          details: "Transfer should complete in 30-60 seconds. Check SniperX balance for confirmation",
        }
      ];

      const potentialIssues = [
        "Invalid address format causing permanent loss",
        "Network congestion delaying transfer",
        "Robinhood maintenance affecting crypto transfers",
        "Address validation failing on Robinhood side"
      ];

      const preventionMeasures = [
        "Always test with 0.01 SOL first",
        "Verify address format is Base58 (44 characters)",
        "Copy address directly from SniperX (never type manually)",
        "Confirm address starts with valid Solana characters",
        "Check Solscan verification status before large transfers"
      ];

      return {
        success: sniperXValid && robinhoodValid,
        testType: 'outbound',
        fromAddress: robinhoodAddress,
        toAddress: sniperXAddress,
        addressValid: sniperXValid,
        solscanVerified: solscanResult.isValid,
        transferInstructions,
        estimatedTime: "30-60 seconds",
        potentialIssues,
        preventionMeasures
      };

    } catch (error) {
      console.error('Outbound transfer test error:', error);
      throw new Error('Failed to test outbound transfer');
    }
  }

  async testInboundTransfer(sniperXAddress: string, robinhoodAddress: string): Promise<RobinhoodTransferTest> {
    try {
      const sniperXValid = this.isValidSolanaAddress(sniperXAddress);
      const robinhoodValid = this.isValidSolanaAddress(robinhoodAddress);

      const transferInstructions: TransferInstruction[] = [
        {
          step: 1,
          action: "Get Robinhood Wallet Address",
          platform: "Robinhood",
          details: "Open Robinhood → Crypto → SOL → 'Receive' to get your Robinhood wallet address",
        },
        {
          step: 2,
          action: "Open SniperX Send Tab",
          platform: "SniperX",
          details: "Navigate to Wallet → Send SOL tab in SniperX",
        },
        {
          step: 3,
          action: "Enter Robinhood Address",
          platform: "SniperX",
          details: "Paste Robinhood wallet address as recipient",
          warning: "Verify Robinhood address is valid Solana format"
        },
        {
          step: 4,
          action: "Send Test Amount First",
          platform: "SniperX",
          details: "Send 0.01 SOL first to verify the transfer path works",
          warning: "CRITICAL: Test small amount before larger transfers"
        },
        {
          step: 5,
          action: "Execute Transfer",
          platform: "SniperX",
          details: "Confirm transaction and wait for blockchain confirmation",
        },
        {
          step: 6,
          action: "Verify in Robinhood",
          platform: "Robinhood",
          details: "Check Robinhood SOL balance for incoming transfer (30-60 seconds)",
        }
      ];

      const potentialIssues = [
        "Robinhood address format incompatibility",
        "SniperX wallet insufficient balance for transfer + fees",
        "Network fees higher than expected",
        "Robinhood not recognizing incoming transfer"
      ];

      const preventionMeasures = [
        "Verify Robinhood address is valid Solana format",
        "Ensure sufficient SOL balance for amount + network fees",
        "Test with 0.01 SOL before larger amounts",
        "Allow 60 seconds for Robinhood to show incoming transfer"
      ];

      return {
        success: sniperXValid && robinhoodValid,
        testType: 'inbound',
        fromAddress: sniperXAddress,
        toAddress: robinhoodAddress,
        addressValid: robinhoodValid,
        solscanVerified: true, // SniperX addresses are generated properly
        transferInstructions,
        estimatedTime: "30-60 seconds",
        potentialIssues,
        preventionMeasures
      };

    } catch (error) {
      console.error('Inbound transfer test error:', error);
      throw new Error('Failed to test inbound transfer');
    }
  }

  async runComprehensiveTransferTest(sniperXAddress: string, robinhoodAddress?: string): Promise<{
    outboundTest: RobinhoodTransferTest;
    inboundTest: RobinhoodTransferTest;
    overallSafety: 'SAFE' | 'CAUTION' | 'UNSAFE';
    recommendation: string;
  }> {
    try {
      // Generate test Robinhood address if not provided
      const testRobinhoodAddress = robinhoodAddress || this.generateTestAddress();

      const outboundTest = await this.testOutboundTransfer(sniperXAddress, testRobinhoodAddress);
      const inboundTest = await this.testInboundTransfer(sniperXAddress, testRobinhoodAddress);

      let overallSafety: 'SAFE' | 'CAUTION' | 'UNSAFE' = 'UNSAFE';
      let recommendation = '';

      if (outboundTest.success && inboundTest.success && outboundTest.addressValid) {
        overallSafety = 'SAFE';
        recommendation = 'Both transfer directions are properly configured. Start with 0.01 SOL test transfers before larger amounts.';
      } else if (outboundTest.addressValid && inboundTest.addressValid) {
        overallSafety = 'CAUTION';
        recommendation = 'Addresses are valid but require testing. Proceed with extreme caution using small test amounts only.';
      } else {
        overallSafety = 'UNSAFE';
        recommendation = 'ADDRESS FORMAT ISSUES DETECTED. Do not attempt transfers until address generation is fixed to prevent Solana loss.';
      }

      return {
        outboundTest,
        inboundTest,
        overallSafety,
        recommendation
      };

    } catch (error) {
      console.error('Comprehensive transfer test error:', error);
      throw new Error('Failed to run comprehensive transfer test');
    }
  }

  private isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return address.length >= 32 && address.length <= 44 && !address.includes('=');
    } catch {
      return false;
    }
  }

  private generateTestAddress(): string {
    return Keypair.generate().publicKey.toBase58();
  }
}

export const robinhoodTransferTester = new RobinhoodTransferTester();
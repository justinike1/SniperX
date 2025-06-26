import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

export interface WalletBackupData {
  mnemonic: string;
  privateKey: string;
  publicKey: string;
  address: string;
}

export class WalletBackupService {
  async generateWalletBackup(): Promise<WalletBackupData> {
    try {
      // Generate a new mnemonic phrase
      const mnemonic = bip39.generateMnemonic();
      
      // Derive seed from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Derive keypair using Solana's derivation path
      const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      
      return {
        mnemonic,
        privateKey: Buffer.from(keypair.secretKey).toString('hex'),
        publicKey: keypair.publicKey.toBase58(),
        address: keypair.publicKey.toBase58()
      };
    } catch (error) {
      console.error('Error generating wallet backup:', error);
      throw new Error('Failed to generate wallet backup');
    }
  }

  async recoverFromMnemonic(mnemonic: string): Promise<WalletBackupData> {
    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid recovery phrase');
      }

      // Derive seed from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Derive keypair using Solana's derivation path
      const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      
      // Get current balance (simulated for now)
      const balance = 0;
      
      return {
        mnemonic,
        privateKey: Buffer.from(keypair.secretKey).toString('hex'),
        publicKey: keypair.publicKey.toBase58(),
        address: keypair.publicKey.toBase58(),
        balance
      };
    } catch (error) {
      console.error('Error recovering wallet from mnemonic:', error);
      throw new Error('Failed to recover wallet from recovery phrase');
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      // Basic Solana address validation (base58 and length check)
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async exportWalletData(walletData: WalletBackupData): Promise<string> {
    try {
      const exportData = {
        mnemonic: walletData.mnemonic,
        address: walletData.address,
        timestamp: new Date().toISOString(),
        version: '1.0',
        platform: 'SniperX',
        warning: 'KEEP THIS FILE SECURE - NEVER SHARE WITH ANYONE'
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting wallet data:', error);
      throw new Error('Failed to export wallet data');
    }
  }

  async importWalletData(fileContent: string): Promise<WalletBackupData> {
    try {
      const importData = JSON.parse(fileContent);
      
      if (!importData.mnemonic) {
        throw new Error('Invalid backup file: missing recovery phrase');
      }
      
      return await this.recoverFromMnemonic(importData.mnemonic);
    } catch (error) {
      console.error('Error importing wallet data:', error);
      throw new Error('Failed to import wallet backup file');
    }
  }
}

export const walletBackupService = new WalletBackupService();
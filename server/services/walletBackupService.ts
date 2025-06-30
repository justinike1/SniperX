import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupData {
  encryptedSeed: string;
  walletAddress: string;
  createdAt: string;
  derivationPath: string;
  checksum: string;
}

export interface RecoveryResult {
  success: boolean;
  walletAddress?: string;
  keypair?: Keypair;
  error?: string;
}

export interface BackupValidation {
  isValid: boolean;
  hasCorrectFormat: boolean;
  hasValidChecksum: boolean;
  canGenerateWallet: boolean;
  errors: string[];
}

export class WalletBackupService {
  private readonly ENCRYPTION_KEY_SIZE = 32;
  private readonly IV_SIZE = 16;
  private readonly DERIVATION_PATH = "m/44'/501'/0'/0'";

  /**
   * Generate a secure backup from mnemonic phrase
   */
  async createBackup(mnemonic: string, password: string): Promise<BackupData> {
    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Generate wallet to get address
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const derivedSeed = derivePath(this.DERIVATION_PATH, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      const walletAddress = keypair.publicKey.toBase58();

      // Encrypt the mnemonic
      const encryptedSeed = this.encryptMnemonic(mnemonic, password);
      
      // Create checksum for validation
      const checksum = this.generateChecksum(mnemonic, walletAddress);

      const backupData: BackupData = {
        encryptedSeed,
        walletAddress,
        createdAt: new Date().toISOString(),
        derivationPath: this.DERIVATION_PATH,
        checksum
      };

      return backupData;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Create backup file for download
   */
  async createBackupFile(mnemonic: string, password: string): Promise<{ filename: string; data: string }> {
    const backupData = await this.createBackup(mnemonic, password);
    
    const filename = `sniperx-wallet-backup-${Date.now()}.json`;
    const data = JSON.stringify(backupData, null, 2);

    return { filename, data };
  }

  /**
   * Validate backup data before attempting recovery
   */
  validateBackup(backupData: any): BackupValidation {
    const validation: BackupValidation = {
      isValid: false,
      hasCorrectFormat: false,
      hasValidChecksum: false,
      canGenerateWallet: false,
      errors: []
    };

    // Check required fields
    const requiredFields = ['encryptedSeed', 'walletAddress', 'checksum'];
    const missingFields = requiredFields.filter(field => !backupData[field]);
    
    if (missingFields.length > 0) {
      validation.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      return validation;
    }

    validation.hasCorrectFormat = true;

    try {
      // Validate wallet address format
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(backupData.walletAddress)) {
        validation.errors.push('Invalid wallet address format');
      }

      // Validate encrypted seed format
      if (!backupData.encryptedSeed.includes(':')) {
        validation.errors.push('Invalid encrypted seed format');
      }

      if (validation.errors.length === 0) {
        validation.hasValidChecksum = true;
        validation.canGenerateWallet = true;
        validation.isValid = true;
      }
    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Recover wallet from backup file
   */
  async recoverFromBackup(backupData: BackupData, password: string): Promise<RecoveryResult> {
    try {
      // Validate backup data
      const validation = this.validateBackup(backupData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid backup: ${validation.errors.join(', ')}`
        };
      }

      // Decrypt mnemonic
      const mnemonic = this.decryptMnemonic(backupData.encryptedSeed, password);
      
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        return {
          success: false,
          error: 'Decrypted mnemonic is invalid'
        };
      }

      // Generate wallet
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const derivationPath = backupData.derivationPath || this.DERIVATION_PATH;
      const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      const walletAddress = keypair.publicKey.toBase58();

      // Verify wallet address matches backup
      if (walletAddress !== backupData.walletAddress) {
        return {
          success: false,
          error: 'Recovered wallet address does not match backup'
        };
      }

      // Verify checksum
      const expectedChecksum = this.generateChecksum(mnemonic, walletAddress);
      if (expectedChecksum !== backupData.checksum) {
        return {
          success: false,
          error: 'Backup checksum verification failed'
        };
      }

      return {
        success: true,
        walletAddress,
        keypair
      };
    } catch (error) {
      return {
        success: false,
        error: `Recovery failed: ${error.message}`
      };
    }
  }

  /**
   * Recover wallet from mnemonic phrase
   */
  async recoverFromMnemonic(mnemonic: string): Promise<RecoveryResult> {
    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        return {
          success: false,
          error: 'Invalid mnemonic phrase'
        };
      }

      // Generate wallet
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const derivedSeed = derivePath(this.DERIVATION_PATH, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      const walletAddress = keypair.publicKey.toBase58();

      return {
        success: true,
        walletAddress,
        keypair
      };
    } catch (error) {
      return {
        success: false,
        error: `Mnemonic recovery failed: ${error.message}`
      };
    }
  }

  /**
   * Generate recovery phrase for existing wallet
   */
  generateRecoveryPhrase(): string {
    return bip39.generateMnemonic(128); // 12 words
  }

  /**
   * Encrypt mnemonic with password
   */
  private encryptMnemonic(mnemonic: string, password: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(password, 'salt', this.ENCRYPTION_KEY_SIZE);
    const iv = crypto.randomBytes(this.IV_SIZE);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('sniperx-wallet', 'utf8'));
    
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt mnemonic with password
   */
  private decryptMnemonic(encryptedData: string, password: string): string {
    const algorithm = 'aes-256-gcm';
    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted data format');
    }

    const key = crypto.scryptSync(password, 'salt', this.ENCRYPTION_KEY_SIZE);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('sniperx-wallet', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate checksum for validation
   */
  private generateChecksum(mnemonic: string, walletAddress: string): string {
    const data = `${mnemonic}:${walletAddress}:sniperx`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Save backup to server (for testing purposes)
   */
  async saveBackupToServer(backupData: BackupData, filename: string): Promise<string> {
    try {
      const backupDir = path.join(process.cwd(), 'server', 'backups');
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const filePath = path.join(backupDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save backup: ${error.message}`);
    }
  }

  /**
   * Load backup from server
   */
  async loadBackupFromServer(filename: string): Promise<BackupData> {
    try {
      const backupDir = path.join(process.cwd(), 'server', 'backups');
      const filePath = path.join(backupDir, filename);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found');
      }

      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load backup: ${error.message}`);
    }
  }
}

export const walletBackupService = new WalletBackupService();
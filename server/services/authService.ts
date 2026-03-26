import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { storage } from '../storage';

export interface UserRegistration {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: any;
  token?: string;
  wallet?: {
    address: string;
    publicKey: string;
  };
  message?: string;
}

export class AuthService {
  private jwtSecret: string;
  private connection: Connection;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  private generateSecureSecret(): string {
    return randomBytes(64).toString('hex');
  }

  private generateUserWallet(): { publicKey: string; privateKey: string; address: string } {
    const keypair = Keypair.generate();
    
    return {
      publicKey: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('base64'),
      address: keypair.publicKey.toBase58()
    };
  }

  private encryptPrivateKey(privateKey: string, userPassword: string): string {
    // Use modern crypto with proper IV
    const key = Buffer.from(userPassword.padEnd(32, '0').slice(0, 32));
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptPrivateKey(encryptedKey: string, userPassword: string): string {
    try {
      const [ivHex, encrypted] = encryptedKey.split(':');
      const key = Buffer.from(userPassword.padEnd(32, '0').slice(0, 32));
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Invalid password for wallet decryption');
    }
  }

  async registerUser(userData: UserRegistration): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User already exists with this email'
        };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Generate unique wallet for user
      const wallet = this.generateUserWallet();
      const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey, userData.password);

      // Generate username from email
      const username = userData.email.split('@')[0] + '_' + Date.now();

      // Create user with wallet
      const newUser = await storage.createUser({
        username: username,
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        walletAddress: wallet.address,
        encryptedPrivateKey: encryptedPrivateKey,
        phoneNumber: null,
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: false
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email,
          walletAddress: newUser.walletAddress
        },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          walletAddress: newUser.walletAddress,
          emailVerified: newUser.emailVerified
        },
        token,
        wallet: {
          address: wallet.address,
          publicKey: wallet.publicKey
        },
        message: 'Account created successfully'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  async loginUser(credentials: UserLogin): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(credentials.email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(credentials.password, user.password);
      if (!passwordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated. Please contact support.'
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          walletAddress: user.walletAddress
        },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      // Get wallet info (without private key)
      const walletInfo = {
        address: user.walletAddress,
        publicKey: user.walletAddress // Same as address for Solana
      };

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled
        },
        token,
        wallet: walletInfo,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  async verifyToken(token: string): Promise<{ valid: boolean; user?: any }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const user = await storage.getUser(decoded.userId);
      
      if (!user || !user.isActive) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress,
          emailVerified: user.emailVerified
        }
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async getWalletBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1000000000; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return 0;
    }
  }

  async initiateWalletTransfer(fromWalletAddress: string, amount: number, userPassword: string): Promise<any> {
    try {
      // This would integrate with external wallet APIs
      // For security, we'll return transfer instructions instead of executing
      
      return {
        success: true,
        transferInstructions: {
          fromAddress: fromWalletAddress,
          toAddress: 'USER_SNIPERX_WALLET_ADDRESS', // User's SniperX wallet
          amount: amount,
          estimatedFees: 0.00025, // SOL
          estimatedTime: '1-2 minutes',
          supportedWallets: [
            'Phantom', 'Solflare', 'Coinbase Wallet', 'Trust Wallet', 
            'Robinhood', 'Binance', 'Kraken', 'FTX'
          ]
        }
      };
    } catch (error) {
      console.error('Transfer initiation error:', error);
      return {
        success: false,
        message: 'Transfer initiation failed'
      };
    }
  }

  async enableTwoFactor(userId: number): Promise<{ secret: string; qrCode: string }> {
    const speakeasy = require('speakeasy');
    
    const secret = speakeasy.generateSecret({
      name: 'SniperX Trading',
      account: `user_${userId}`,
      issuer: 'SniperX'
    });

    // Save secret to user record
    await storage.updateUser(userId, {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: true
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url
    };
  }

  async verifyTwoFactor(userId: number, token: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return false;
      }

      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      return verified;
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return false; // Don't reveal if email exists
      }

      const resetToken = randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry
      });

      // In production, send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
        return false;
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null
      });

      return true;
    } catch (error) {
      console.error('Password reset completion error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
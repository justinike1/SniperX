import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { Keypair } from '@solana/web3.js';
import crypto from 'crypto';

interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  message?: string;
}

export class SimpleAuth {
  private jwtSecret = process.env.JWT_SECRET || 'sniperx-ultra-secure-revolutionary-trading-2025';

  async register(userData: {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResult> {
    try {
      // Input validation
      if (!userData.email || !userData.password) {
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      if (userData.password.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters long'
        };
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User already exists with this email'
        };
      }

      // Hash password with maximum security
      const hashedPassword = await bcrypt.hash(userData.password, 15);

      // Generate ultra-secure Solana wallet
      const keypair = Keypair.generate();
      const walletAddress = keypair.publicKey.toBase58();
      
      // Military-grade encryption for private key
      const privateKeyBytes = keypair.secretKey;
      const encryptionKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
      let encryptedPrivateKey = cipher.update(Buffer.from(privateKeyBytes)).toString('hex');
      encryptedPrivateKey += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      // Create user with all required fields
      const user = await storage.createUser({
        email: userData.email.toLowerCase().trim(),
        password: hashedPassword,
        username: userData.username || userData.email.split('@')[0],
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        walletAddress,
        encryptedPrivateKey: `${encryptedPrivateKey}:${authTag.toString('hex')}:${iv.toString('hex')}`,
        isActive: true,
        emailVerified: true
      });

      // Generate ultra-secure JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          walletAddress: user.walletAddress,
          iat: Math.floor(Date.now() / 1000)
        },
        this.jwtSecret,
        { 
          expiresIn: '7d',
          algorithm: 'HS256'
        }
      );

      const { password, encryptedPrivateKey: _, ...userWithoutSensitive } = user;

      return {
        success: true,
        user: userWithoutSensitive,
        token,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    try {
      // Input validation
      if (!credentials.email || !credentials.password) {
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      // Find user by email (case insensitive)
      const user = await storage.getUserByEmail(credentials.email.toLowerCase().trim());
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Verify password with timing-safe comparison
      const isValidPassword = await bcrypt.compare(credentials.password, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Update last login timestamp
      await storage.updateUser(user.id, {
        lastLoginAt: new Date()
      });

      // Generate ultra-secure JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          walletAddress: user.walletAddress,
          iat: Math.floor(Date.now() / 1000)
        },
        this.jwtSecret,
        { 
          expiresIn: '7d',
          algorithm: 'HS256'
        }
      );

      const { password, encryptedPrivateKey, ...userWithoutSensitive } = user;

      return {
        success: true,
        user: userWithoutSensitive,
        token,
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
      if (!token) {
        return { valid: false };
      }

      // Verify JWT token with strict validation
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256']
      }) as any;

      if (!decoded.userId) {
        return { valid: false };
      }

      // Fetch fresh user data
      const user = await storage.getUser(decoded.userId);
      
      if (!user || !user.isActive) {
        return { valid: false };
      }

      // Return user without sensitive data
      const { password, encryptedPrivateKey, ...userWithoutSensitive } = user;
      
      return {
        valid: true,
        user: userWithoutSensitive
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Verify old password
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 15);

      // Update password
      await storage.updateUser(userId, {
        password: hashedPassword,
        updatedAt: new Date()
      });

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        message: 'Failed to change password'
      };
    }
  }
}

export const simpleAuth = new SimpleAuth();
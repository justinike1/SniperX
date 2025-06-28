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

      // Generate secure Solana wallet
      const keypair = Keypair.generate();
      const walletAddress = keypair.publicKey.toString();

      // Encrypt private key with AES-256
      const encryptionKey = crypto.randomBytes(32);
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      let encryptedPrivateKey = cipher.update(JSON.stringify(Array.from(keypair.secretKey)), 'utf8', 'hex');
      encryptedPrivateKey += cipher.final('hex');

      // Create user with encrypted wallet
      const user = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
        username: userData.username || userData.email.split('@')[0],
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        walletAddress,
        encryptedPrivateKey,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Generate JWT token
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
        message: 'Registration successful - wallet created'
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
      if (!credentials.email || !credentials.password) {
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      // Get user by email
      const user = await storage.getUserByEmail(credentials.email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
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
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Failed to change password'
      };
    }
  }

  // Express middleware for authentication
  requireAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7)
        : req.cookies?.token;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const verification = await this.verifyToken(token);
      
      if (!verification.valid || !verification.user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Attach user to request
      req.user = {
        userId: verification.user.id,
        email: verification.user.email,
        walletAddress: verification.user.walletAddress
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }
}

export const simpleAuth = new SimpleAuth();
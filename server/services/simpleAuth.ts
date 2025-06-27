import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Keypair } from '@solana/web3.js';
import { storage } from '../storage';

interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  message?: string;
}

export class SimpleAuth {
  private jwtSecret = 'sniperx-secret-key-2025';

  async register(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResult> {
    try {
      // Check if user exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User already exists with this email'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Generate wallet
      const keypair = Keypair.generate();
      const walletAddress = keypair.publicKey.toBase58();

      // Create user
      const user = await storage.createUser({
        username: userData.email.split('@')[0] + '_' + Date.now(),
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        walletAddress,
        phoneNumber: null,
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: false,
        encryptedPrivateKey: null
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress
        },
        token,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    try {
      // Find user
      const user = await storage.getUserByEmail(credentials.email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check password
      const passwordValid = await bcrypt.compare(credentials.password, user.password);
      if (!passwordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress
        },
        token,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  async verifyToken(token: string): Promise<{ valid: boolean; user?: any }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const user = await storage.getUser(decoded.userId);
      
      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress
        }
      };
    } catch (error) {
      return { valid: false };
    }
  }
}

export const simpleAuth = new SimpleAuth();
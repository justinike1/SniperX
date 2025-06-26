import bcrypt from 'bcrypt';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { sendEmail } from './emailService';

interface AuthResponse {
  success: boolean;
  user?: any;
  token?: string;
  requires2FA?: boolean;
  requiresEmailVerification?: boolean;
  message?: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

interface LoginData {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export class AuthenticationService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'sniperx-jwt-secret-2025';
  }

  // Register new user with email verification
  async registerUser(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'Account already exists with this email address'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user account
      const newUser = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        phoneNumber: userData.phoneNumber || null,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpiry,
        isActive: true,
        twoFactorEnabled: false
      });

      // Send verification email
      await this.sendVerificationEmail(userData.email, emailVerificationToken);

      return {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        requiresEmailVerification: true
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Failed to create account. Please try again.'
      };
    }
  }

  // Login user with email verification and 2FA support
  async loginUser(credentials: LoginData): Promise<AuthResponse> {
    try {
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

      // Check if email is verified
      if (!user.emailVerified) {
        return {
          success: false,
          message: 'Please verify your email address before logging in',
          requiresEmailVerification: true
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is temporarily disabled. Please contact support.'
        };
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!credentials.twoFactorCode) {
          return {
            success: false,
            message: 'Two-factor authentication code required',
            requires2FA: true
          };
        }

        const twoFAValid = speakeasy.totp.verify({
          secret: user.twoFactorSecret!,
          encoding: 'base32',
          token: credentials.twoFactorCode,
          window: 2
        });

        if (!twoFAValid) {
          return {
            success: false,
            message: 'Invalid two-factor authentication code'
          };
        }
      }

      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Generate JWT token
      const token = this.generateJWT(user);

      // Create session
      await this.createSession(user.id, token);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          walletAddress: user.walletAddress
        },
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

  // Verify email address
  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const user = await storage.getUserByEmailVerificationToken(token);
      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired verification token'
        };
      }

      if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
        return {
          success: false,
          message: 'Verification token has expired. Please request a new one.'
        };
      }

      // Verify email
      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null
      });

      return {
        success: true,
        message: 'Email verified successfully. You can now log in.'
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: 'Email verification failed. Please try again.'
      };
    }
  }

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<AuthResponse> {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return {
          success: false,
          message: 'No account found with this email address'
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          message: 'Email is already verified'
        };
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateUser(user.id, {
        emailVerificationToken,
        emailVerificationExpiry
      });

      await this.sendVerificationEmail(email, emailVerificationToken);

      return {
        success: true,
        message: 'Verification email sent. Please check your inbox.'
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        message: 'Failed to send verification email. Please try again.'
      };
    }
  }

  // Setup 2FA
  async setup2FA(userId: number): Promise<{ success: boolean; secret?: string; qrCode?: string; message?: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const secret = speakeasy.generateSecret({
        name: `SniperX (${user.email})`,
        issuer: 'SniperX Trading Platform'
      });

      // Save secret to user
      await storage.updateUser(userId, {
        twoFactorSecret: secret.base32
      });

      return {
        success: true,
        secret: secret.base32,
        qrCode: secret.otpauth_url,
        message: 'Scan the QR code with your authenticator app'
      };
    } catch (error) {
      console.error('2FA setup error:', error);
      return {
        success: false,
        message: 'Failed to setup two-factor authentication'
      };
    }
  }

  // Verify and enable 2FA
  async verify2FA(userId: number, token: string): Promise<AuthResponse> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return {
          success: false,
          message: 'Two-factor authentication not setup'
        };
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        return {
          success: false,
          message: 'Invalid authentication code'
        };
      }

      // Enable 2FA
      await storage.updateUser(userId, {
        twoFactorEnabled: true
      });

      return {
        success: true,
        message: 'Two-factor authentication enabled successfully'
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        success: false,
        message: 'Failed to verify two-factor authentication'
      };
    }
  }

  // Disable 2FA
  async disable2FA(userId: number, token: string): Promise<AuthResponse> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled) {
        return {
          success: false,
          message: 'Two-factor authentication is not enabled'
        };
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        return {
          success: false,
          message: 'Invalid authentication code'
        };
      }

      // Disable 2FA
      await storage.updateUser(userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null
      });

      return {
        success: true,
        message: 'Two-factor authentication disabled successfully'
      };
    } catch (error) {
      console.error('2FA disable error:', error);
      return {
        success: false,
        message: 'Failed to disable two-factor authentication'
      };
    }
  }

  // Password reset request
  async requestPasswordReset(email: string): Promise<AuthResponse> {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.'
        };
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry
      });

      await this.sendPasswordResetEmail(email, resetToken);

      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message: 'Failed to send password reset email. Please try again.'
      };
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    try {
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
        return {
          success: false,
          message: 'Reset token has expired. Please request a new one.'
        };
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null
      });

      return {
        success: true,
        message: 'Password reset successfully. You can now log in.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Failed to reset password. Please try again.'
      };
    }
  }

  // Verify JWT token
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
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          walletAddress: user.walletAddress
        }
      };
    } catch (error) {
      return { valid: false };
    }
  }

  // Logout user
  async logout(token: string): Promise<AuthResponse> {
    try {
      await this.deleteSession(token);
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Failed to logout'
      };
    }
  }

  // Private helper methods
  private generateJWT(user: any): string {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        emailVerified: user.emailVerified 
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  private async createSession(userId: number, token: string): Promise<void> {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await storage.createSession({
      id: sessionId,
      userId,
      token,
      expiresAt
    });
  }

  private async deleteSession(token: string): Promise<void> {
    await storage.deleteSessionByToken(token);
  }

  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to SniperX!</h2>
        <p>Please verify your email address to complete your account setup:</p>
        <a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Verify Email Address
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      from: 'noreply@sniperx.ai',
      subject: 'Verify your SniperX account',
      html: emailHtml
    });
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Reset Your Password</h2>
        <p>You requested a password reset for your SniperX account:</p>
        <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this reset, please ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      from: 'noreply@sniperx.ai',
      subject: 'Reset your SniperX password',
      html: emailHtml
    });
  }
}

export const authenticationService = new AuthenticationService();
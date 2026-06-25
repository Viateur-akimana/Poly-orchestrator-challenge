import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '@prisma/client';
import { emailService, auditService, AuditAction } from '../services';
import { prisma, createLogger } from '../lib';

const logger = createLogger('AuthController');

export class AuthController {
  constructor() {
    // Initialize admin user in database if it doesn't exist
    // Commented out due to connection pool issues during startup
    // this.initializeAdminUser();
  }

  private async initializeAdminUser() {
    try {
      const existingAdmin = await prisma.user.findUnique({
        where: { email: 'akimanaviateur94@gmail.com' }
      });

      if (!existingAdmin) {
        await prisma.user.create({
          data: {
            email: 'akimanaviateur94@gmail.com',
            password: await bcrypt.hash('Viateur123', 10),
            firstName: 'Viateur',
            lastName: 'Akimana',
            phoneNumber: '+250788123456',
            role: 'ADMIN',
            status: 'ACTIVE',
            emailVerified: true
          }
        });
        console.log('✅ Admin user initialized in database');
      } else {
        // Update existing user to admin role if not already
        if (existingAdmin.role !== 'ADMIN') {
          await prisma.user.update({
            where: { email: 'akimanaviateur94@gmail.com' },
            data: {
              role: 'ADMIN',
              password: await bcrypt.hash('Viateur123', 10),
              updatedAt: new Date()
            }
          });
          console.log('✅ Existing user updated to admin role');
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize admin user:', error);
    }
  }

  /**
   * Setup admin credentials - One-time setup endpoint
   */
  public setupAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { setupKey } = req.body;

      // Simple protection - only allow with correct setup key
      if (setupKey !== 'SKYLINE_ADMIN_SETUP_2025') {
        res.status(401).json({
          success: false,
          error: { message: 'Invalid setup key' }
        });
        return;
      }

      // Update the user to admin with preferred credentials
      const hashedPassword = await bcrypt.hash('Viateur123', 10);

      const updatedUser = await prisma.user.update({
        where: { email: 'akimanaviateur94@gmail.com' },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          firstName: 'Viateur',
          lastName: 'Akimana',
          emailVerified: true,
          updatedAt: new Date()
        }
      });

      console.log('✅ Admin user credentials updated successfully');

      // Generate new token with admin role
      const token = this.generateToken(updatedUser);

      res.json({
        success: true,
        message: 'Admin credentials updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
            phoneNumber: updatedUser.phoneNumber
          },
          accessToken: token
        }
      });
    } catch (error) {
      console.error('❌ Admin setup failed:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Admin setup failed' }
      });
    }
  };

  private generateToken = (user: User) => {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber
    };
    return jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
  };

  /**
   * Register new user
   */
  public register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, phoneNumber } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          error: { message: 'Email, password, firstName, and lastName are required' }
        });
        return;
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: { message: 'User with this email already exists' }
        });
        return;
      }

      // Validate phone number (Rwanda format)
      if (phoneNumber && !this.validateRwandaPhone(phoneNumber)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid Rwanda phone number format. Use +25072xxxxxxx, +25073xxxxxxx, +25078xxxxxxx, +25079xxxxxxx or 072xxxxxxx, 073xxxxxxx, 078xxxxxxx, 079xxxxxxx' }
        });
        return;
      }

      // Create user in database
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber,
          role: 'USER',
          status: 'ACTIVE'
        }
      });

      const token = this.generateToken(user);

      res.status(201).json({
        success: true,
        data: {
          user: { ...user, password: undefined },
          accessToken: token,
          message: 'Registration successful. You can now create transfer orders.'
        }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Registration failed' }
      });
    }
  };

  /**
   * Login user
   */
  public login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: { message: 'Email and password are required' }
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        logger.warn(`Login attempt failed: User not found for email ${email.toLowerCase()}`);
        res.status(401).json({
          success: false,
          error: { message: 'Invalid email or password' }
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        logger.warn(`Login attempt failed: Invalid password for email ${email.toLowerCase()}`);
        res.status(401).json({
          success: false,
          error: { message: 'Invalid email or password' }
        });
        return;
      }

      if (user.status !== 'ACTIVE') {
        res.status(401).json({
          success: false,
          error: { message: 'Account is not active' }
        });
        return;
      }

      const token = this.generateToken(user);

      // Log successful login
      const ipAddress = (req as any).ip || (req as any).connection?.remoteAddress;
      const userAgent = (req as any).headers?.['user-agent'];
      await auditService.logLogin(user.id, ipAddress, userAgent);

      res.json({
        success: true,
        data: {
          user: { ...user, password: undefined },
          accessToken: token,
          message: `Welcome ${user.firstName}! You can now access SKYLINE transfer services.`
        }
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Login failed' }
      });
    }
  };

  /**
   * Get current user profile
   */
  public getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: { ...user, password: undefined }
        }
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get profile' }
      });
    }
  };

  /**
   * Update user profile
   */
  public updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { firstName, lastName, phoneNumber } = req.body;

      // Validate phone number if provided
      if (phoneNumber && !this.validateRwandaPhone(phoneNumber)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid Rwanda phone number format. Use +25072xxxxxxx, +25073xxxxxxx, +25078xxxxxxx, +25079xxxxxxx or 072xxxxxxx, 073xxxxxxx, 078xxxxxxx, 079xxxxxxx' }
        });
        return;
      }

      // Update user in database
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phoneNumber && { phoneNumber })
        }
      });

      res.json({
        success: true,
        data: {
          user: { ...user, password: undefined },
          message: 'Profile updated successfully'
        }
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to update profile' }
        });
      }
    }
  };

  /**
   * Change password
   */
  public changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: { message: 'Current password and new password are required' }
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
        return;
      }

      // Verify current password
      if (!await bcrypt.compare(currentPassword, user.password)) {
        res.status(400).json({
          success: false,
          error: { message: 'Current password is incorrect' }
        });
        return;
      }

      // Update password in database
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      res.json({
        success: true,
        data: {
          message: 'Password changed successfully'
        }
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to change password' }
      });
    }
  };

  /**
   * Logout user - invalidate any active session token
   */
  public logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      // If user has an active session, delete it from DB
      if (userId) {
        try {
          await prisma.session.deleteMany({
            where: { userId }
          });
        } catch (dbError) {
          // Session table may not have entries, which is fine
          console.warn('Could not delete session records:', dbError);
        }

        // Log the logout action
        try {
          const ipAddress = (req as any).ip || (req as any).connection?.remoteAddress;
          const userAgent = (req as any).headers?.['user-agent'];
          await auditService.log({
            action: AuditAction.LOGOUT,
            entityType: 'User',
            entityId: userId,
            userId,
            ipAddress,
            userAgent
          });
        } catch (auditError) {
          console.warn('Could not log logout audit event:', auditError);
        }
      }

      res.json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even on error, return success so the client always clears local state
      res.json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    }
  };

  /**
   * Get user by ID (for internal use)
   */
  public getUserById = async (userId: string): Promise<User | null> => {
    try {
      return await prisma.user.findUnique({
        where: { id: userId }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  };

  /**
   * Validate Rwanda phone number
   */
  private validateRwandaPhone = (phone: string): boolean => {
    // Rwanda phone format: +25072xxxxxxx, +25073xxxxxxx, +25078xxxxxxx, +25079xxxxxxx 
    // or 072xxxxxxx, 073xxxxxxx, 078xxxxxxx, 079xxxxxxx
    const rwandaPattern = /^(?:\+2507[2389]\d{7}|07[2389]\d{7})$/;
    return rwandaPattern.test(phone.replace(/\s/g, ''));
  };

  /**
   * Generate verification token
   */
  private generateVerificationToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
  };

  /**
   * Verify email address
   */
  public verifyEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: { message: 'Verification token is required' }
        });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpiry: { gt: new Date() }
        }
      });

      if (!user) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid or expired verification token' }
        });
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null
        }
      });

      res.json({
        success: true,
        data: { message: 'Email verified successfully. You can now login.' }
      });
    } catch (error: any) {
      console.error('Verify email error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Email verification failed' }
      });
    }
  };

  /**
   * Resend verification email
   */
  public resendVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: { message: 'Email is required' }
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        // Don't reveal if user exists
        res.json({
          success: true,
          data: { message: 'If your email is registered, you will receive a verification link.' }
        });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({
          success: false,
          error: { message: 'Email is already verified' }
        });
        return;
      }

      const verificationToken = this.generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken,
          verificationTokenExpiry: tokenExpiry
        }
      });

      await emailService.sendVerificationEmail(user.email, user.firstName, verificationToken);

      res.json({
        success: true,
        data: { message: 'Verification email sent. Please check your inbox.' }
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to resend verification email' }
      });
    }
  };

  /**
   * Request password reset
   */
  public forgotPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: { message: 'Email is required' }
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({
          success: true,
          data: { message: 'If your email is registered, you will receive a password reset link.' }
        });
        return;
      }

      const resetToken = this.generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry: tokenExpiry
        }
      });

      await emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

      res.json({
        success: true,
        data: { message: 'If your email is registered, you will receive a password reset link.' }
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to process password reset request' }
      });
    }
  };

  /**
   * Reset password with token
   */
  public resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: { message: 'Token and new password are required' }
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: { message: 'Password must be at least 6 characters' }
        });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() }
        }
      });

      if (!user) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid or expired reset token' }
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      res.json({
        success: true,
        data: { message: 'Password reset successfully. You can now login with your new password.' }
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to reset password' }
      });
    }
  };
}
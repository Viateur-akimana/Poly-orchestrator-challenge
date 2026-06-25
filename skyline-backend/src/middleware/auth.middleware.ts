import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth.controller';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
}

/**
 * JWT Authentication middleware
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token required' }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired token' }
      });
    }

    // Use token payload directly instead of database lookup
    // This is more efficient and avoids database dependency issues
    req.user = {
      userId: decoded.userId,
      email: decoded.email || '',
      role: decoded.role || 'USER',
      firstName: decoded.firstName || '',
      lastName: decoded.lastName || '',
      phoneNumber: decoded.phoneNumber || ''
    };

    next();
  });
};

/**
 * Admin role middleware
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' }
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: { message: 'Admin access required' }
    });
  }

  next();
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, decoded: any) => {
    if (!err && decoded) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email || '',
        role: decoded.role || 'USER',
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || '',
        phoneNumber: decoded.phoneNumber || ''
      };
    }
    next();
  });
};
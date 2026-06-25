/**
 * Request Validation Middleware
 * Centralized validation using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ResponseHandler } from '../lib/response';

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return ResponseHandler.validationError(res, 'Validation failed', errors);
      }
      next(error);
    }
  };
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return ResponseHandler.validationError(res, 'Invalid query parameters', errors);
      }
      next(error);
    }
  };
}

/**
 * Validate request path parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return ResponseHandler.validationError(res, 'Invalid path parameters', errors);
      }
      next(error);
    }
  };
}

// ============ Common Validation Schemas ============

export const schemas = {
  // Pagination
  pagination: z.object({
    page: z.string().optional().transform(v => parseInt(v || '1')),
    limit: z.string().optional().transform(v => Math.min(100, parseInt(v || '20'))),
  }),

  // UUID parameter
  uuid: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Transfer ID parameter
  transferId: z.object({
    transferId: z.string().uuid('Invalid transfer ID format'),
  }),

  // Login
  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  // Register
  register: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    phoneNumber: z.string().optional(),
  }),

  // Create transfer
  createTransfer: z.object({
    recipientName: z.string().min(1, 'Recipient name is required').max(100),
    recipientPhone: z.string()
      .min(10, 'Invalid phone number')
      .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number format'),
    sendAmount: z.number().positive('Amount must be positive').min(100, 'Minimum amount is 100 RUB'),
    sendCurrency: z.enum(['RUB', 'RWF']).default('RUB'),
    receiveCurrency: z.enum(['RWF', 'RUB']).default('RWF'),
    direction: z.enum(['RU_TO_RW', 'RW_TO_RU']).default('RU_TO_RW'),
    notes: z.string().max(500).optional(),
  }),

  // Cancel transfer
  cancelTransfer: z.object({
    reason: z.string().min(1, 'Cancellation reason is required').max(500),
  }),

  // Admin approve transfer
  approveTransfer: z.object({
    adminNotes: z.string().max(500).optional(),
  }),

  // Admin reject transfer
  rejectTransfer: z.object({
    reason: z.string().min(1, 'Rejection reason is required').max(500),
  }),

  // User status change
  userStatus: z.object({
    reason: z.string().max(500).optional(),
  }),

  // User role change
  userRole: z.object({
    role: z.enum(['USER', 'ADMIN']),
  }),

  // Password reset request
  passwordResetRequest: z.object({
    email: z.string().email('Invalid email address'),
  }),

  // Password reset
  passwordReset: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),

  // Update profile
  updateProfile: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phoneNumber: z.string().optional(),
  }),

  // Change password
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
};

export type LoginInput = z.infer<typeof schemas.login>;
export type RegisterInput = z.infer<typeof schemas.register>;
export type CreateTransferInput = z.infer<typeof schemas.createTransfer>;
export type PaginationInput = z.infer<typeof schemas.pagination>;

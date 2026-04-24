/**
 * Middleware Index
 * Central export point for all middleware
 */

// Authentication
export {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  type AuthenticatedRequest
} from './auth.middleware';

// Rate Limiting
export {
  rateLimiter,
  authLimiter,
  transferLimiter,
  strictLimiter
} from './rate-limit.middleware';

// Validation
export {
  validateBody,
  validateQuery,
  validateParams,
  schemas
} from './validation.middleware';

// Error Handling
export { errorHandler } from './error.middleware';
export { notFoundHandler } from './not-found.middleware';

/**
 * Base Controller
 * Provides common functionality for all controllers
 */

import { Response, NextFunction } from 'express';
import { ResponseHandler } from './response';
import { AppError } from './errors';

export type AsyncHandler = (req: any, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps async controller methods with error handling
 */
export function asyncHandler(fn: AsyncHandler): AsyncHandler {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Base controller class with common utilities
 */
export abstract class BaseController {
  /**
   * Send success response
   */
  protected success<T>(res: Response, data: T, statusCode = 200) {
    return ResponseHandler.success(res, data, statusCode);
  }

  /**
   * Send created response
   */
  protected created<T>(res: Response, data: T) {
    return ResponseHandler.created(res, data);
  }

  /**
   * Send paginated response
   */
  protected paginated<T>(
    res: Response,
    data: T[],
    pagination: { page: number; limit: number; total: number }
  ) {
    return ResponseHandler.paginated(res, data, pagination);
  }

  /**
   * Send error response
   */
  protected error(res: Response, message: string, statusCode = 400) {
    return ResponseHandler.error(res, message, statusCode);
  }

  /**
   * Send not found response
   */
  protected notFound(res: Response, message?: string) {
    return ResponseHandler.notFound(res, message);
  }

  /**
   * Send validation error response
   */
  protected validationError(res: Response, message: string, details?: any) {
    return ResponseHandler.validationError(res, message, details);
  }

  /**
   * Get pagination params from request
   */
  protected getPagination(query: any): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  /**
   * Parse query filters
   */
  protected parseFilters(query: any, allowedFields: string[]): Record<string, any> {
    const filters: Record<string, any> = {};
    for (const field of allowedFields) {
      if (query[field] !== undefined && query[field] !== '') {
        filters[field] = query[field];
      }
    }
    return filters;
  }
}

export default BaseController;

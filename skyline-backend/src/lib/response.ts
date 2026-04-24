/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ResponseHandler {
  /**
   * Send success response
   */
  static success<T>(res: Response, data: T, statusCode = 200, meta?: ApiResponse['meta']): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(meta && { meta }),
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(res: Response, data: T): Response {
    return this.success(res, data, 201);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: { page: number; limit: number; total: number }
  ): Response {
    return this.success(res, data, 200, {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    });
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode = 400,
    code?: string,
    details?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        message,
        ...(code && { code }),
        ...(details && { details }),
      },
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send not found response (404)
   */
  static notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Send validation error response (400)
   */
  static validationError(res: Response, message: string, details?: any): Response {
    return this.error(res, message, 400, 'VALIDATION_ERROR', details);
  }

  /**
   * Send internal server error response (500)
   */
  static serverError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500, 'INTERNAL_ERROR');
  }
}

export default ResponseHandler;

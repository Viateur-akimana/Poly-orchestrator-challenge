import { Response } from 'express';
import { logger } from './logger';

type SuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
};

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    validationErrors?: Array<{
      field: string;
      message: string;
    }>;
  };
};

type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

class ApiResponseHandler {
  /**
   * Send a successful response
   */
  public static success<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200,
    meta?: any
  ) {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      message,
    };

    if (meta) {
      response.meta = meta;
    }

    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      logger.info(`API Success [${statusCode}]: ${message}`, {
        statusCode,
        path: res.req?.originalUrl,
        method: res.req?.method,
      });
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send a paginated response
   */
  public static paginated<T>(
    res: Response,
    data: T[], // Array of items
    total: number,
    page: number = 1,
    limit: number = 10,
    message: string = 'Data retrieved successfully',
    statusCode: number = 200
  ) {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };

    return this.success(res, data, message, statusCode, meta);
  }

  /**
   * Send an error response
   */
  public static error(
    res: Response,
    error: Error | string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    let message: string;
    let validationErrors;

    if (error instanceof Error) {
      message = error.message || 'An unexpected error occurred';
      
      // Check if it's a validation error
      if ('errors' in error) {
        const validationError = error as any;
        if (Array.isArray(validationError.errors)) {
          validationErrors = validationError.errors.map((err: any) => ({
            field: err.path || 'unknown',
            message: err.message || 'Validation error',
          }));
        }
      }
    } else {
      message = error || 'An unexpected error occurred';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        ...(validationErrors && { validationErrors }),
      },
    };

    // Log the error
    logger.error(`API Error [${statusCode}]: ${message}`, {
      statusCode,
      errorCode,
      path: res.req?.originalUrl,
      method: res.req?.method,
      details,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return res.status(statusCode).json(errorResponse);
  }

  /**
   * 400 Bad Request
   */
  public static badRequest(
    res: Response,
    message: string = 'Bad Request',
    details?: any
  ) {
    return this.error(res, message, 400, 'BAD_REQUEST', details);
  }

  /**
   * 401 Unauthorized
   */
  public static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    details?: any
  ) {
    return this.error(res, message, 401, 'UNAUTHORIZED', details);
  }

  /**
   * 403 Forbidden
   */
  public static forbidden(
    res: Response,
    message: string = 'Forbidden',
    details?: any
  ) {
    return this.error(res, message, 403, 'FORBIDDEN', details);
  }

  /**
   * 404 Not Found
   */
  public static notFound(
    res: Response,
    message: string = 'Resource not found',
    details?: any
  ) {
    return this.error(res, message, 404, 'NOT_FOUND', details);
  }

  /**
   * 409 Conflict
   */
  public static conflict(
    res: Response,
    message: string = 'Resource already exists',
    details?: any
  ) {
    return this.error(res, message, 409, 'CONFLICT', details);
  }

  /**
   * 422 Unprocessable Entity (Validation Error)
   */
  public static validationError(
    res: Response,
    message: string = 'Validation failed',
    validationErrors: Array<{ field: string; message: string }> = []
  ) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        validationErrors,
      },
    });
  }

  /**
   * 429 Too Many Requests
   */
  public static tooManyRequests(
    res: Response,
    message: string = 'Too many requests, please try again later',
    details?: any
  ) {
    return this.error(res, message, 429, 'TOO_MANY_REQUESTS', details);
  }

  /**
   * 500 Internal Server Error
   */
  public static internalError(
    res: Response,
    error: Error | string = 'Internal Server Error',
    details?: any
  ) {
    // In production, don't expose internal error details
    const errorMessage =
      process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : error;

    return this.error(
      res,
      errorMessage as Error,
      500,
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development' ? details : undefined
    );
  }
}

export { ApiResponse, SuccessResponse, ErrorResponse, ApiResponseHandler };

export default ApiResponseHandler;

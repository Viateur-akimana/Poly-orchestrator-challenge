export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Record<string, string[]>,
    public isOperational: boolean = true,
    public stack: string = ''
  ) {
    super(message);
    this.name = this.constructor.name;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      statusCode: this.statusCode,
      message: this.message,
      ...(this.errors && { errors: this.errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', errors?: Record<string, string[]>) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', errors?: Record<string, string[]>) {
    super(401, message, errors);
  }
}

export class PaymentRequiredError extends ApiError {
  constructor(message: string = 'Payment Required', errors?: Record<string, string[]>) {
    super(402, message, errors);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', errors?: Record<string, string[]>) {
    super(403, message, errors);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found', errors?: Record<string, string[]>) {
    super(404, message, errors);
  }
}

export class MethodNotAllowedError extends ApiError {
  constructor(message: string = 'Method Not Allowed', errors?: Record<string, string[]>) {
    super(405, message, errors);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', errors?: Record<string, string[]>) {
    super(409, message, errors);
  }
}

export class UnprocessableEntityError extends ApiError {
  constructor(message: string = 'Unprocessable Entity', errors?: Record<string, string[]>) {
    super(422, message, errors);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(
    message: string = 'Too Many Requests', 
    errors?: Record<string, string[]>,
    public retryAfter?: number
  ) {
    super(429, message, errors);
  }
}

export class ValidationError extends UnprocessableEntityError {
  constructor(errors: Record<string, string[]>, message: string = 'Validation Failed') {
    super(message, errors);
  }
}

export class InternalServerError extends ApiError {
  constructor(
    message: string = 'Internal Server Error',
    errors?: Record<string, string[]>,
    public code?: string
  ) {
    super(500, message, errors);
  }
}

export class NotImplementedError extends ApiError {
  constructor(message: string = 'Not Implemented', errors?: Record<string, string[]>) {
    super(501, message, errors);
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(
    message: string = 'Service Unavailable',
    errors?: Record<string, string[]>,
    public retryAfter?: number
  ) {
    super(503, message, errors);
  }
}

// Domain-specific errors
export class InsufficientFundsError extends BadRequestError {
  constructor(amount: number, balance: number) {
    super('Insufficient funds', {
      amount: [`Requested amount ${amount} exceeds available balance ${balance}`]
    });
  }
}

export class InvalidTransactionError extends BadRequestError {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(`Invalid transaction: ${message}`, errors);
  }
}

export class TransactionLimitExceededError extends BadRequestError {
  constructor(limit: number, period: string) {
    super(`Transaction limit exceeded. Maximum ${limit} transactions per ${period} allowed.`);
  }
}

export class KycRequiredError extends ForbiddenError {
  constructor(message: string = 'KYC verification required') {
    super(message, {
      kyc: [message]
    });
  }
}

export class RateLimitExceededError extends TooManyRequestsError {
  constructor(retryAfter?: number) {
    super(
      'Too many requests, please try again later.',
      undefined,
      retryAfter
    );
  }
}

// Utility function to handle async/await errors
export const asyncHandler = (fn: Function) => 
  (req: any, res: any, next: any) => 
    Promise.resolve(fn(req, res, next)).catch(next);

export const errorHandler = (err: any, req: any, res: any, next: any) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = (err as ValidationError).errors;

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${new Date().toISOString()}] ${statusCode} - ${message}`);
    console.error(err.stack);
  }

  // Don't leak error details in production
  const response: any = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`,
  });
};

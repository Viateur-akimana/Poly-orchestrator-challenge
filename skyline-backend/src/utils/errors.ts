/**
 * Custom Error Classes for Transfer System
 */

export class TransferError extends Error {
  public code: string;
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, code: string, statusCode = 500) {
    super(message);
    this.name = 'TransferError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PaymentError extends TransferError {
  constructor(message: string, code = 'PAYMENT_ERROR') {
    super(message, code, 400);
    this.name = 'PaymentError';
  }
}

export class ValidationError extends TransferError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, code, 400);
    this.name = 'ValidationError';
  }
}

export class ExternalAPIError extends TransferError {
  public provider: string;

  constructor(message: string, provider: string, code = 'EXTERNAL_API_ERROR') {
    super(message, code, 502);
    this.name = 'ExternalAPIError';
    this.provider = provider;
  }
}

export class InsufficientFundsError extends PaymentError {
  constructor(message = 'Insufficient funds') {
    super(message, 'INSUFFICIENT_FUNDS');
  }
}

export class InvalidPhoneNumberError extends ValidationError {
  constructor(message = 'Invalid phone number format') {
    super(message, 'INVALID_PHONE');
  }
}

export class TransferNotFoundError extends TransferError {
  constructor(message = 'Transfer not found') {
    super(message, 'TRANSFER_NOT_FOUND', 404);
  }
}

export class DuplicateTransferError extends TransferError {
  constructor(message = 'Duplicate transfer detected') {
    super(message, 'DUPLICATE_TRANSFER', 409);
  }
}

export class RateLimitError extends TransferError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429);
  }
}

// Error factory functions
export const createPaymentError = (message: string) => new PaymentError(message);
export const createValidationError = (message: string) => new ValidationError(message);
export const createExternalAPIError = (message: string, provider: string) => new ExternalAPIError(message, provider);

// Error type guards
export const isTransferError = (error: any): error is TransferError => {
  return error instanceof TransferError;
};

export const isPaymentError = (error: any): error is PaymentError => {
  return error instanceof PaymentError;
};

export const isExternalAPIError = (error: any): error is ExternalAPIError => {
  return error instanceof ExternalAPIError;
};
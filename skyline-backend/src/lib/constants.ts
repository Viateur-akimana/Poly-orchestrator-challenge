/**
 * Application Constants
 * Centralized configuration values
 */

export const TRANSFER_STATUS = {
  PENDING: 'PENDING',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID_AWAITING_APPROVAL: 'PAID_AWAITING_APPROVAL',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
} as const;

export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export const CURRENCIES = {
  RUB: { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  RWF: { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw' },
} as const;

export const MOBILE_NETWORKS = {
  MTN: 'MTN',
  AIRTEL: 'AIRTEL',
} as const;

export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  MOBILE_MONEY: 'MOBILE_MONEY',
  CARD: 'CARD',
} as const;

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '24h',
  REFRESH_TOKEN: '7d',
  VERIFICATION_TOKEN: 24 * 60 * 60 * 1000, // 24 hours in ms
  RESET_TOKEN: 60 * 60 * 1000, // 1 hour in ms
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

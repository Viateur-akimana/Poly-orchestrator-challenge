// File upload constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'image/jpg'
];

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Transfer statuses
export const TRANSFER_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  VERIFIED: 'VERIFIED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

// Payment methods
export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  CREDIT_CARD: 'CREDIT_CARD',
  MOBILE_MONEY: 'MOBILE_MONEY',
} as const;

// Mobile networks
export const MOBILE_NETWORKS = {
  MTN: 'MTN',
  AIRTEL: 'AIRTEL',
  TIGO: 'TIGO',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
  },
  TRANSFERS: {
    BASE: '/api/transfers',
    BY_ID: (id: string) => `/api/transfers/${id}`,
    PAYMENT_PROOF: (id: string) => `/api/transfers/${id}/payment-proof`,
    CANCEL: (id: string) => `/api/transfers/${id}/cancel`,
  },
  RATES: {
    CURRENT: '/api/rates/current',
    HISTORY: '/api/rates/history',
  },
  UPLOAD: '/api/upload',
} as const;

// Default pagination
// @ts-ignore
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'skyline_auth_token',
  REFRESH_TOKEN: 'skyline_refresh_token',
  USER: 'skyline_user',
  THEME: 'skyline_theme',
} as const;

// Application settings
export const APP_CONFIG = {
  SITE_NAME: 'SKYLINE Transfers',
  DEFAULT_CURRENCY: 'RUB',
  TARGET_CURRENCY: 'RWF',
  FIXED_FEE: 0, // No commission
  MIN_AMOUNT: 1000, // 1000 RWF
  MAX_AMOUNT: 1000000, // 1,000,000 RWF
  EXCHANGE_RATE_TTL: 15 * 60 * 1000, // 15 minutes in milliseconds
} as const;

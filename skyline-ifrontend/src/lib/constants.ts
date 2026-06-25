/**
 * Application Constants
 * Centralized configuration values for the frontend
 */

export const APP_CONFIG = {
  NAME: 'SKYLINE Transfers',
  TAGLINE: 'Fast & Secure Money Transfers to Rwanda',
  SUPPORT_EMAIL: 'support@skyline-transfers.com',
} as const;

export const TRANSFER_LIMITS = {
  MIN_RUB: 100,
  MAX_RUB: 1000000,
  MIN_RWF: 1000,
  MAX_RWF: 15000000,
} as const;

export const FEES = {
  FIXED_FEE_RUB: 100,
} as const;

export const TRANSFER_STATUS = {
  PENDING: 'PENDING',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID_AWAITING_APPROVAL: 'PAID_AWAITING_APPROVAL',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export const TRANSFER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PENDING_PAYMENT: 'Awaiting Payment',
  PAID_AWAITING_APPROVAL: 'Paid - Awaiting Approval',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const TRANSFER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-700 border-orange-200',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700 border-amber-200',
  PAID_AWAITING_APPROVAL: 'bg-blue-100 text-blue-700 border-blue-200',
  PROCESSING: 'bg-primary/10 text-primary border-primary/20',
  COMPLETED: 'bg-success/10 text-success border-success/20',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/20',
  CANCELLED: 'bg-muted text-muted-foreground border-muted',
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
} as const;

export const MOBILE_NETWORKS = {
  MTN: 'MTN',
  AIRTEL: 'AIRTEL',
} as const;

export const CURRENCIES = {
  RUB: { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: 'ru' },
  RWF: { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw', flag: 'rw' },
} as const;

export const COUNTRIES = {
  RUSSIA: { code: 'RU', name: 'Russia', currency: 'RUB', flag: 'ru' },
  RWANDA: { code: 'RW', name: 'Rwanda', currency: 'RWF', flag: 'rw' },
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  SEND_MONEY: '/send-money',
  TRANSFERS: '/transfers',
  PROFILE: '/profile',
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    TRANSFERS: '/admin/transfers',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
  },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const QUERY_KEYS = {
  USER: 'user',
  TRANSFERS: 'transfers',
  TRANSFER: 'transfer',
  EXCHANGE_RATE: 'exchange-rate',
  ADMIN_STATS: 'admin-stats',
  ADMIN_TRANSFERS: 'admin-transfers',
  NOTIFICATIONS: 'notifications',
} as const;

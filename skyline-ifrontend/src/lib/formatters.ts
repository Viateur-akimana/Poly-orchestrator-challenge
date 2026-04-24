/**
 * Formatting Utilities
 * Reusable formatters for currency, dates, and phone numbers
 */

import { CURRENCIES } from './constants';

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: 'RUB' | 'RWF' = 'RUB'): string {
  const config = CURRENCIES[currency];
  return `${config.symbol} ${amount.toLocaleString()}`;
}

/**
 * Format currency with code
 */
export function formatCurrencyWithCode(amount: number, currency: 'RUB' | 'RWF' = 'RUB'): string {
  return `${amount.toLocaleString()} ${currency}`;
}

/**
 * Format date to locale string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Date(date).toLocaleDateString('en-US', options || defaultOptions);
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string, countryCode: 'RU' | 'RW' = 'RW'): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (countryCode === 'RW') {
    // Rwanda: +250 7XX XXX XXX
    if (cleaned.startsWith('250')) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    if (cleaned.startsWith('07')) {
      return `+250 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
  }
  
  if (countryCode === 'RU') {
    // Russia: +7 XXX XXX XX XX
    if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
      const num = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned;
      return `+${num.slice(0, 1)} ${num.slice(1, 4)} ${num.slice(4, 7)} ${num.slice(7, 9)} ${num.slice(9)}`;
    }
  }
  
  return phone;
}

/**
 * Format transfer reference
 */
export function formatReference(reference: string): string {
  return reference.toUpperCase();
}

/**
 * Format exchange rate
 */
export function formatExchangeRate(rate: number, decimals: number = 4): string {
  return rate.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

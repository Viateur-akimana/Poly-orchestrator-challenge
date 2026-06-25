/**
 * Validation Utilities
 * Reusable validators for form inputs
 */

import { TRANSFER_LIMITS } from './constants';

/**
 * Validate Rwanda phone number (MTN format)
 */
export function isValidRwandaPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  const pattern = /^(?:\+2507[2389]\d{7}|07[2389]\d{7}|7[2389]\d{7})$/;
  return pattern.test(cleaned);
}

/**
 * Validate Russian phone number
 */
export function isValidRussianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const pattern = /^(?:\+7|8)?[0-9]{10}$/;
  return pattern.test(cleaned);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * Validate transfer amount (RUB)
 */
export function isValidTransferAmount(amount: number): { valid: boolean; message?: string } {
  if (!amount || amount <= 0) {
    return { valid: false, message: 'Amount must be greater than 0' };
  }
  if (amount < TRANSFER_LIMITS.MIN_RUB) {
    return { valid: false, message: `Minimum amount is ${TRANSFER_LIMITS.MIN_RUB} RUB` };
  }
  if (amount > TRANSFER_LIMITS.MAX_RUB) {
    return { valid: false, message: `Maximum amount is ${TRANSFER_LIMITS.MAX_RUB.toLocaleString()} RUB` };
  }
  return { valid: true };
}

/**
 * Validate required string
 */
export function isRequired(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate string length
 */
export function isValidLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

/**
 * Normalize phone number (remove spaces and format)
 */
export function normalizePhone(phone: string, countryCode: 'RW' | 'RU' = 'RW'): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (countryCode === 'RW') {
    // Ensure Rwanda format: +250XXXXXXXXX
    if (cleaned.startsWith('250')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('07') || cleaned.startsWith('7')) {
      const num = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
      return `+250${num}`;
    }
  }
  
  if (countryCode === 'RU') {
    // Ensure Russia format: +7XXXXXXXXXX
    if (cleaned.startsWith('8')) {
      return `+7${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('7')) {
      return `+${cleaned}`;
    }
  }
  
  return phone;
}

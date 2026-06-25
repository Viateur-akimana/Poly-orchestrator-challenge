/**
 * Validation Utilities
 * Reusable validation functions for the application
 */

export const Validators = {
  /**
   * Validate Rwanda phone number
   */
  rwandaPhone(phone: string): boolean {
    const pattern = /^(?:\+2507[2389]\d{7}|07[2389]\d{7})$/;
    return pattern.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate Russian phone number
   */
  russianPhone(phone: string): boolean {
    const pattern = /^(?:\+7|8)?[0-9]{10}$/;
    return pattern.test(phone.replace(/[\s\-()]/g, ''));
  },

  /**
   * Validate email
   */
  email(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  },

  /**
   * Validate UUID
   */
  uuid(id: string): boolean {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return pattern.test(id);
  },

  /**
   * Validate positive number
   */
  positiveNumber(value: number): boolean {
    return typeof value === 'number' && value > 0 && isFinite(value);
  },

  /**
   * Validate amount within range
   */
  amountInRange(amount: number, min: number, max: number): boolean {
    return this.positiveNumber(amount) && amount >= min && amount <= max;
  },

  /**
   * Validate required string
   */
  requiredString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  },

  /**
   * Validate string length
   */
  stringLength(value: string, min: number, max: number): boolean {
    return typeof value === 'string' && value.length >= min && value.length <= max;
  },
};

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
  field?: string;
}

/**
 * Validate multiple fields
 */
export function validateFields(
  validations: Array<{ field: string; value: any; validator: (v: any) => boolean; message: string }>
): ValidationResult {
  for (const { field, value, validator, message } of validations) {
    if (!validator(value)) {
      return { valid: false, message, field };
    }
  }
  return { valid: true };
}

export default Validators;

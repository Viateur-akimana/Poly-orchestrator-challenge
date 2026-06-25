import crypto from 'crypto';

/**
 * Generate a random OTP code
 * @param length Length of the OTP code (default: 6)
 * @returns OTP code as string
 */
export const generateOTP = (length = 6): string => {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }

  return otp;
};

/**
 * Generate a random string of specified length
 * @param length Length of the string to generate
 * @returns Random string
 */
export const generateRandomString = (length: number): string => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Format currency amount
 * @param amount Amount to format
 * @param currency Currency code (default: 'RUB')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency = 'RUB'): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format phone number to international format
 * @param phone Phone number to format
 * @param countryCode Country code (default: '250' for Rwanda)
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (phone: string, countryCode = '250'): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // If the number starts with a country code, return as is
  if (cleaned.startsWith(countryCode)) {
    return `+${cleaned}`;
  }

  // If the number starts with a zero, replace it with the country code
  if (cleaned.startsWith('0')) {
    return `+${countryCode}${cleaned.substring(1)}`;
  }

  // Otherwise, assume it's a local number and add the country code
  return `+${countryCode}${cleaned}`;
};

/**
 * Mask sensitive information (e.g., email, phone, etc.)
 * @param str String to mask
 * @param type Type of data to mask (email, phone, card, etc.)
 * @returns Masked string
 */
export const maskSensitiveInfo = (str: string, type: 'email' | 'phone' | 'card' | 'account' = 'email'): string => {
  if (!str) return '';

  switch (type) {
    case 'email': {
      const [username, domain] = str.split('@');
      if (!username || !domain) return str;

      const maskedUsername =
        username.length > 2
          ? username[0] + '*'.repeat(3) + username.slice(-1)
          : '*'.repeat(username.length);

      const [domainName, tld] = domain.split('.');
      const maskedDomain =
        domainName && domainName.length > 2
          ? domainName[0] + '*'.repeat(2) + domainName.slice(-1)
          : domainName || '';

      return `${maskedUsername}@${maskedDomain}${tld ? '.' + tld : ''}`;
    }

    case 'phone': {
      const digits = str.replace(/\D/g, '');
      if (digits.length <= 4) return '*'.repeat(digits.length);

      const visibleDigits = 4;
      const masked = '*'.repeat(digits.length - visibleDigits) + digits.slice(-visibleDigits);

      // Format with spaces for better readability
      return masked.replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    case 'card': {
      const digits = str.replace(/\D/g, '');
      if (digits.length < 4) return str;

      const lastFour = digits.slice(-4);
      return `•••• •••• •••• ${lastFour}`;
    }

    case 'account': {
      const digits = str.replace(/\D/g, '');
      if (digits.length < 4) return str;

      const lastFour = digits.slice(-4);
      return `••••${lastFour}`;
    }

    default:
      return str;
  }
};

/**
 * Calculate pagination metadata
 * @param totalItems Total number of items
 * @param currentPage Current page number (1-based)
 * @param pageSize Number of items per page
 * @returns Pagination metadata
 */
export const paginate = (
  totalItems: number,
  currentPage: number = 1,
  pageSize: number = 10
) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return {
    totalItems,
    currentPage,
    pageSize,
    totalPages,
    startItem,
    endItem,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
};

/**
 * Generate a unique reference number
 * @param prefix Optional prefix for the reference
 * @returns Unique reference string
 */
export const generateReference = (prefix = 'SKY'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');

  return `${prefix}${timestamp}${random}`;
};

/**
 * Calculate transfer fee and recipient amount
 * @param amount Amount to transfer
 * @param rate Exchange rate
 * @param fixedFee Fixed fee (default: 0 RUB)
 * @returns Object containing fee and recipient amount
 */
export const calculateTransfer = (
  amount: number,
  rate: number,
  fixedFee: number = 0
) => {
  const fee = fixedFee;
  const recipientAmount = amount * rate;

  return {
    fee,
    recipientAmount: parseFloat(recipientAmount.toFixed(2)),
  };
};

/**
 * Validate email address
 * @param email Email address to validate
 * @returns Boolean indicating if the email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (basic validation)
 * @param phone Phone number to validate
 * @returns Boolean indicating if the phone number is valid
 */
export const isValidPhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Check if the number has between 8 and 15 digits
  return digits.length >= 8 && digits.length <= 15;
};

/**
 * Format date to a human-readable string
 * @param date Date object or string
 * @param locale Locale (default: 'en-US')
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

/**
 * Environment Configuration
 * Validates required environment variables at startup
 */

import { createLogger } from './logger';

const logger = createLogger('Config');

interface EnvConfig {
  // Server
  NODE_ENV: string;
  PORT: number;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Client
  CLIENT_URL: string;

  // SMTP (optional)
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM_EMAIL?: string;
  SMTP_FROM_NAME?: string;

  // Exchange Rate API (optional)
  EXCHANGE_RATE_API_KEY?: string;
  EXCHANGE_RATE_PROVIDER?: string;

  // Admin
  ADMIN_EMAIL?: string;
}

class Config {
  private config: EnvConfig;
  private validated = false;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvConfig {
    return {
      // Server
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: parseInt(process.env.PORT || '5004'),

      // Database
      DATABASE_URL: process.env.DATABASE_URL || '',

      // JWT
      JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

      // Client
      CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

      // SMTP
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@skyline-transfers.com',
      SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'SKYLINE Transfers',

      // Exchange Rate
      EXCHANGE_RATE_API_KEY: process.env.EXCHANGE_RATE_API_KEY,
      EXCHANGE_RATE_PROVIDER: process.env.EXCHANGE_RATE_PROVIDER || 'fixer',

      // Admin
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    };
  }

  /**
   * Validate required environment variables
   * Call this at application startup
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required in all environments
    if (!this.config.DATABASE_URL) {
      errors.push('DATABASE_URL is required');
    }

    // Required in production
    if (this.config.NODE_ENV === 'production') {
      if (this.config.JWT_SECRET === 'default-secret-change-in-production') {
        errors.push('JWT_SECRET must be set in production');
      }

      if (!this.config.SMTP_HOST) {
        warnings.push('SMTP not configured - email features will be disabled');
      }
    }

    // Log warnings
    warnings.forEach(w => logger.warn(w));

    // Log errors
    errors.forEach(e => logger.error(e));

    this.validated = true;

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Fail fast if configuration is invalid
   */
  validateOrThrow(): void {
    const result = this.validate();
    if (!result.valid) {
      throw new Error(`Configuration validation failed:\n${result.errors.join('\n')}`);
    }
    logger.info('Configuration validated successfully');
  }

  /**
   * Get configuration value
   */
  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * Check if email is configured
   */
  isEmailConfigured(): boolean {
    return !!(this.config.SMTP_HOST && this.config.SMTP_USER && this.config.SMTP_PASS);
  }

  /**
   * Get all config (for debugging - don't expose secrets)
   */
  getSafeConfig(): Record<string, any> {
    return {
      NODE_ENV: this.config.NODE_ENV,
      PORT: this.config.PORT,
      CLIENT_URL: this.config.CLIENT_URL,
      DATABASE_URL: this.config.DATABASE_URL ? '[SET]' : '[NOT SET]',
      JWT_SECRET: this.config.JWT_SECRET ? '[SET]' : '[NOT SET]',
      SMTP_HOST: this.config.SMTP_HOST || '[NOT SET]',
      EXCHANGE_RATE_PROVIDER: this.config.EXCHANGE_RATE_PROVIDER,
    };
  }
}

export const config = new Config();
export default config;

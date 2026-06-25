import axios, { AxiosInstance } from 'axios';
import { RetryableOperation, CircuitBreaker } from '../utils/retry-handler';
import { createLogger } from '../lib';
import { BUSINESS_CONFIG } from '../config/business.config';

const logger = createLogger('ExchangeRateService');

// Define missing error class
class APIConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIConnectionError';
  }
}

class APIResponseError extends Error {
  status?: number;
  response?: any;

  constructor(message: string, options?: { status?: number; response?: any }) {
    super(message);
    this.name = 'APIResponseError';
    this.status = options?.status;
    this.response = options?.response;
  }
}

export interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: { [key: string]: number };
  success: boolean;
}

export interface ExchangeRateCalculation {
  sendAmount: number;
  receiveAmount: number;
  rate: number;
  commission: number;
  totalAmount: number;
  lastUpdated: string;
}

/**
 * Exchange Rate Service with Real-time Rate Fetching
 * Handles RUB to RWF exchange rate calculations using live market data
 */
export class ExchangeRateService {
  private static instance: ExchangeRateService;
  private client: AxiosInstance;
  private retryHandler: RetryableOperation;
  private circuitBreaker: CircuitBreaker;

  private cachedRate = {
    rubToRwf: 0,
    rwfToRub: 0,
    lastUpdated: new Date().toISOString(),
    commission: 0,
    source: 'none',
    isManual: false
  };

  private readonly provider: string;
  private readonly updateIntervalMs: number = 300000; // 5 minutes
  private updateIntervalId?: NodeJS.Timeout;
  private isUpdating = false;

  private constructor() {
    this.provider = process.env.EXCHANGE_RATE_PROVIDER || 'free-currency-api';

    this.client = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'SKYLINE-Transfers/1.0'
      }
    });

    this.retryHandler = new RetryableOperation({
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 8000
    });

    this.circuitBreaker = new CircuitBreaker(3, 120000); // 3 failures, 2 min reset

    // Initialize with live rates
    this.initializeRates();

    // Set up periodic rate updates
    this.startPeriodicUpdates();
  }

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  private startPeriodicUpdates(): void {
    if (this.updateIntervalId) return;

    this.updateIntervalId = setInterval(() => {
      if (!this.isUpdating && !this.cachedRate.isManual) {
        this.updateRatesFromAPI();
      }
    }, this.updateIntervalMs);
  }

  public destroy(): void {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = undefined;
    }
  }

  /**
   * Calculate markup rate based on market rate
   */
  private calculateMarkupRate(marketRate: number): number {
    // No markup, just return market rate for now
    return marketRate;
  }

  /**
   * Calculate exchange rate for RUB to RWF transfer
   * Uses current rate (either manual or fixed)
   */
  public async calculateRate(amountRub: number): Promise<ExchangeRateCalculation> {
    // Ensure we have recent rates (only if not manual)
    if (!this.cachedRate.isManual) {
      await this.ensureFreshRates();
    }

    // Use dynamic rate from cache (prioritizes manual admin settings)
    const rate = this.cachedRate.rubToRwf;
    const receiveAmount = Math.round(amountRub * rate * 100) / 100; // Round to 2 decimal places
    const commission = 0; // Fee is FREE as per requirement
    const totalAmount = amountRub;

    console.log(`💱 Rate calculation: ${amountRub} RUB × ${rate} = ${receiveAmount} RWF (${this.cachedRate.source} rate)`);

    return {
      sendAmount: amountRub,
      receiveAmount,
      rate,
      commission,
      totalAmount,
      lastUpdated: this.cachedRate.lastUpdated
    };
  }

  /**
   * Calculate reverse exchange rate for RWF to RUB transfer
   * Uses the markup rate for consistency
   */
  public async calculateReverseRate(amountRwf: number): Promise<ExchangeRateCalculation> {
    await this.ensureFreshRates();

    // Use dynamic rate from cache (prioritizes manual admin settings)
    const rwfToRubRate = this.cachedRate.rwfToRub;
    const receiveAmount = Math.max(0, Math.round((amountRwf * rwfToRubRate) * 100) / 100);
    const commissionInRwf = 0;

    return {
      sendAmount: amountRwf,
      receiveAmount,
      rate: rwfToRubRate, // Store as RWF/RUB rate for consistency
      commission: commissionInRwf, // Commission in RWF
      totalAmount: amountRwf,
      lastUpdated: this.cachedRate.lastUpdated
    };
  }

  /**
   * Get current exchange rate with metadata
   */
  public getCurrentRate(): {
    rubToRwf: number;
    rwfToRub: number;
    commission: number;
    lastUpdated: string;
    source: string;
    isStale: boolean;
  } {
    const isStale = Date.now() - new Date(this.cachedRate.lastUpdated).getTime() > this.updateIntervalMs;

    return {
      rubToRwf: this.cachedRate.rubToRwf,
      rwfToRub: this.cachedRate.rwfToRub,
      commission: this.cachedRate.commission,
      lastUpdated: this.cachedRate.lastUpdated,
      source: this.cachedRate.source,
      isStale
    };
  }

  /**
   * Force update exchange rates from API
   */
  public async updateRatesFromAPI(): Promise<{ success: boolean; rubToRwf?: number; rwfToRub?: number; source: string; error?: string }> {
    if (this.isUpdating) {
      console.log('⚠️ Rate update already in progress, skipping...');
      return { success: false, source: 'skipped', error: 'Update in progress' };
    }

    if (this.cachedRate.isManual) {
      console.log('🔄 Manual exchange rate is set. Skipping automatic API update.');
      return {
        success: true,
        rubToRwf: this.cachedRate.rubToRwf,
        rwfToRub: this.cachedRate.rwfToRub,
        source: 'manual'
      };
    }

    this.isUpdating = true;
    let rubToRwfRate: number | undefined;
    let source: string = 'fixed'; // Default to fixed if API fails

    try {
      if (this.provider === 'free-currency-api') {
        rubToRwfRate = await this.fetchRatesFromAPI();
        source = 'free-currency-api';
      } else if (this.provider === 'frankfurter') {
        rubToRwfRate = await this.fetchRatesFromFrankfurter();
        source = 'frankfurter';
      } else {
        console.warn(`Unknown exchange rate provider: ${this.provider}. No rates updated.`);
        this.isUpdating = false;
        return { success: false, source: 'none', error: 'Unknown provider' };
      }

      if (rubToRwfRate) {
        const rwfToRubRate = 1 / rubToRwfRate;
        this.cachedRate = {
          rubToRwf: rubToRwfRate,
          rwfToRub: rwfToRubRate,
          lastUpdated: new Date().toISOString(),
          commission: 0,
          source: source,
          isManual: false
        };
        console.log(`✅ Rates updated from ${source}: 1 RUB = ${rubToRwfRate.toFixed(4)} RWF, 1 RWF = ${rwfToRubRate.toFixed(4)} RUB`);
        this.isUpdating = false;
        return {
          success: true,
          rubToRwf: rubToRwfRate,
          rwfToRub: rwfToRubRate,
          source: source
        };
      } else {
        throw new Error('Failed to fetch rate from API, rate is undefined.');
      }


    } catch (error: any) {
      console.error('❌ Failed to update exchange rates:', error.message);

      return {
        success: false,
        source: 'fallback',
        error: error.message
      };
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Validate transfer amount
   */
  public validateAmount(amount: number): { valid: boolean; message?: string } {
    if (amount < 100) {
      return { valid: false, message: 'Minimum transfer amount is 100 RUB' };
    }

    if (amount > 1000000) {
      return { valid: false, message: 'Maximum transfer amount is 1,000,000 RUB' };
    }

    return { valid: true };
  }

  /**
   * Validate RWF transfer amount
   */
  public validateRwfAmount(amount: number): { valid: boolean; message?: string } {
    const minRwf = 1000;
    const maxRwf = 14000000; // ~1M RUB equivalent

    if (amount < minRwf) {
      return { valid: false, message: `Minimum transfer amount is ${minRwf.toLocaleString()} RWF` };
    }

    if (amount > maxRwf) {
      return { valid: false, message: `Maximum transfer amount is ${maxRwf.toLocaleString()} RWF` };
    }

    return { valid: true };
  }

  /**
   * Get historical rates (if available)
   */
  public async getHistoricalRates(days: number = 7): Promise<{ date: string; rate: number }[]> {
    // For now, return current rate
    // In production, this would fetch from a database or API
    return [{
      date: this.cachedRate.lastUpdated,
      rate: this.cachedRate.rubToRwf
    }];
  }

  // Private methods
  private async initializeRates(): Promise<void> {
    try {
      // Try to load manual rates from DB first
      const { prisma } = await import('../lib/prisma');
      const rubCurrency = await prisma.currency.findUnique({ where: { code: 'RUB' } });
      const rwfCurrency = await prisma.currency.findUnique({ where: { code: 'RWF' } });

      if (rubCurrency && rwfCurrency) {
        const manualRubToRwf = await prisma.exchangeRate.findUnique({
          where: {
            fromCurrencyId_toCurrencyId: {
              fromCurrencyId: rubCurrency.id,
              toCurrencyId: rwfCurrency.id
            }
          }
        });

        const manualRwfToRub = await prisma.exchangeRate.findUnique({
          where: {
            fromCurrencyId_toCurrencyId: {
              fromCurrencyId: rwfCurrency.id,
              toCurrencyId: rubCurrency.id
            }
          }
        });

        if (manualRubToRwf && (manualRubToRwf.source === 'manual' || manualRubToRwf.isActive)) {
          console.log(`📡 Loaded manual RUB to RWF rate from DB: ${manualRubToRwf.rate}`);
          this.cachedRate.rubToRwf = Number(manualRubToRwf.rate);
          this.cachedRate.isManual = true;
          this.cachedRate.source = 'manual';
          this.cachedRate.lastUpdated = manualRubToRwf.updatedAt.toISOString();
        }

        if (manualRwfToRub && (manualRwfToRub.source === 'manual' || manualRwfToRub.isActive)) {
          console.log(`📡 Loaded manual RWF to RUB rate from DB: ${manualRwfToRub.rate}`);
          this.cachedRate.rwfToRub = Number(manualRwfToRub.rate);
          this.cachedRate.isManual = true;
          this.cachedRate.source = 'manual';
          this.cachedRate.lastUpdated = manualRwfToRub.updatedAt.toISOString();
        }
      }

      if (!this.cachedRate.isManual) {
        await this.updateRatesFromAPI();
      }
    } catch (error) {
      console.warn('Failed to initialize rates from DB or API, using default fixed values');
    }
  }

  private async ensureFreshRates(): Promise<void> {
    const rateAge = Date.now() - new Date(this.cachedRate.lastUpdated).getTime();

    if (rateAge > this.updateIntervalMs) {
      console.log('Refreshing cached rate timestamp (Fixed rate: 18.4 RWF per RUB remains unchanged)');
      await this.updateRatesFromAPI();
    }
  }

  /**
   * Fetch rates from API with circuit breaker and retry logic
   */
  private async fetchRatesFromAPI(): Promise<number> {
    return this.circuitBreaker.execute(async () => {
      return this.retryHandler.execute(async () => {
        try {
          // Using free ExchangeRate-API (no key required for limited use)
          const response = await this.client.get(
            'https://api.exchangerate-api.com/v4/latest/RUB',
            { timeout: 8000 }
          );

          const data = response.data;

          if (!data || !data.rates || !data.rates.RWF) {
            throw new APIResponseError('Invalid response from exchange rate API', {
              status: response.status,
              response: data
            });
          }

          return data.rates.RWF;

        } catch (error: any) {
          if (error.code === 'ECONNABORTED') {
            throw new APIConnectionError('API request timeout');
          }

          if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new APIConnectionError('Cannot connect to exchange rate API');
          }

          if (error.response?.status >= 500) {
            throw new APIResponseError(`Server error: ${error.response.status}`, {
              status: error.response.status
            });
          }

          throw error; // Re-throw for other types of errors
        }
      }, 'Exchange rate API call');
    }, 'Exchange Rate API');
  }

  /**
   * Alternative method using Frankfurter.app (completely free, no key required)
   */
  private async fetchRatesFromFrankfurter(): Promise<number> {
    return this.circuitBreaker.execute(async () => {
      return this.retryHandler.execute(async () => {
        try {
          // Frankfurter.app - completely free, no API key needed
          const response = await this.client.get(
            'https://api.frankfurter.app/latest?from=RUB&to=RWF',
            { timeout: 8000 }
          );

          const data = response.data;

          if (!data || !data.rates || !data.rates.RWF) {
            throw new APIResponseError('Invalid response from Frankfurter API', {
              status: response.status,
              response: data
            });
          }

          return data.rates.RWF;

        } catch (error: any) {
          console.error('Frankfurter API error:', error.message);
          throw error;
        }
      }, 'Frankfurter API call');
    }, 'Frankfurter API');
  }

  /**
   * Admin function to manually update rate
   */
  public updateRate(newRate: number, newReverseRate?: number): { success: boolean; rubToRwf: number; rwfToRub: number; lastUpdated: string } {
    if (newRate <= 0 || (newReverseRate !== undefined && newReverseRate <= 0)) {
      throw new Error('Exchange rates must be positive');
    }

    this.cachedRate.rubToRwf = newRate;
    this.cachedRate.rwfToRub = newReverseRate !== undefined ? newReverseRate : 1 / newRate;
    this.cachedRate.lastUpdated = new Date().toISOString();
    this.cachedRate.source = 'manual';
    this.cachedRate.isManual = true;

    console.log(`✅ Exchange rates manually updated: 1 RUB = ${this.cachedRate.rubToRwf} RWF, 1 RWF = ${this.cachedRate.rwfToRub} RUB`);

    return {
      success: true,
      rubToRwf: this.cachedRate.rubToRwf,
      rwfToRub: this.cachedRate.rwfToRub,
      lastUpdated: this.cachedRate.lastUpdated
    };
  }

  /**
   * Get service status
   */
  public getStatus(): {
    state: string;
    failures: number;
    lastFailureTime: number;
  } {
    return this.circuitBreaker.getState();
  }
}
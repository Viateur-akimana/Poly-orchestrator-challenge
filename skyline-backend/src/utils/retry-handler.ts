import { APIConnectionError } from '../middleware/error.middleware';

export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffFactor: number;
    retryCondition?: (error: any) => boolean;
}

export const defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
        // Retry on network errors, timeouts, and 5xx status codes
        return (
            error.code === 'ENOTFOUND' ||
            error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT' ||
            (error.response?.status >= 500 && error.response?.status < 600) ||
            error.message?.includes('timeout')
        );
    }
};

export class RetryableOperation {
    private config: RetryConfig;

    constructor(config: Partial<RetryConfig> = {}) {
        this.config = { ...defaultRetryConfig, ...config };
    }

    async execute<T>(operation: () => Promise<T>, operationName: string = 'API call'): Promise<T> {
        let lastError: any;

        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
            try {
                console.log(`[RetryableOperation] ${operationName} - Attempt ${attempt}/${this.config.maxAttempts}`);
                return await operation();
            } catch (error: any) {
                lastError = error;

                console.error(`[RetryableOperation] ${operationName} - Attempt ${attempt} failed:`, {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                    attempt,
                    maxAttempts: this.config.maxAttempts
                });

                // Don't retry if we've reached max attempts
                if (attempt === this.config.maxAttempts) {
                    break;
                }

                // Don't retry if error doesn't meet retry condition
                if (this.config.retryCondition && !this.config.retryCondition(error)) {
                    console.log(`[RetryableOperation] ${operationName} - Error not retryable, aborting`);
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt - 1),
                    this.config.maxDelay
                );

                console.log(`[RetryableOperation] ${operationName} - Waiting ${delay}ms before retry`);
                await this.sleep(delay);
            }
        }

        // If we get here, all attempts failed
        throw new APIConnectionError(operationName, lastError);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export class CircuitBreaker {
    private failures: number = 0;
    private lastFailureTime: number = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private failureThreshold: number = 5,
        private resetTimeoutMs: number = 60000 // 1 minute
    ) { }

    async execute<T>(operation: () => Promise<T>, serviceName: string): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime < this.resetTimeoutMs) {
                throw new APIConnectionError(`Circuit breaker is OPEN for ${serviceName}`);
            } else {
                this.state = 'HALF_OPEN';
                console.log(`[CircuitBreaker] ${serviceName} - State changed to HALF_OPEN`);
            }
        }

        try {
            const result = await operation();

            if (this.state === 'HALF_OPEN' || this.failures > 0) {
                this.reset(serviceName);
            }

            return result;
        } catch (error) {
            this.recordFailure(serviceName);
            throw error;
        }
    }

    private recordFailure(serviceName: string): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            console.error(`[CircuitBreaker] ${serviceName} - Circuit breaker OPENED after ${this.failures} failures`);
        } else {
            console.warn(`[CircuitBreaker] ${serviceName} - Failure recorded: ${this.failures}/${this.failureThreshold}`);
        }
    }

    private reset(serviceName: string): void {
        this.failures = 0;
        this.state = 'CLOSED';
        console.log(`[CircuitBreaker] ${serviceName} - Circuit breaker CLOSED (reset)`);
    }

    getState(): { state: string; failures: number; lastFailureTime: number } {
        return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime
        };
    }
}

export class TimeoutHandler {
    static withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string = 'Operation'): Promise<T> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });

        return Promise.race([promise, timeoutPromise]);
    }
}

export class APIErrorHandler {
    static handleAPIError(error: any, serviceName: string, operationName: string): never {
        console.error(`[APIErrorHandler] ${serviceName} ${operationName} error:`, {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data
        });

        if (error.response?.status === 401) {
            throw new APIConnectionError(`${serviceName} authentication failed`);
        } else if (error.response?.status === 403) {
            throw new APIConnectionError(`${serviceName} access forbidden`);
        } else if (error.response?.status === 429) {
            throw new APIConnectionError(`${serviceName} rate limit exceeded`);
        } else if (error.response?.status >= 500) {
            throw new APIConnectionError(`${serviceName} server error`);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new APIConnectionError(`${serviceName} connection failed`);
        } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            throw new APIConnectionError(`${serviceName} request timed out`);
        }

        // Re-throw original error if we don't know how to handle it
        throw error;
    }
}
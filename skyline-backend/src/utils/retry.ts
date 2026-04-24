export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number; // initial delay
  maxDelayMs?: number;
  onRetry?: (error: any, attempt: number) => void;
  shouldRetry?: (error: any) => boolean;
};

export async function withExponentialBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    onRetry,
    shouldRetry,
  } = options;

  let attempt = 0;
  let lastError: any;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.response?.status;
      const retryable = shouldRetry
        ? shouldRetry(err)
        : // default: retry on 429, 5xx, and network errors
          (status === 429 || (status && status >= 500) || !status);
      if (attempt === retries || !retryable) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      if (onRetry) onRetry(err, attempt + 1);
      await new Promise((res) => setTimeout(res, delay));
      attempt += 1;
    }
  }
  throw lastError;
}

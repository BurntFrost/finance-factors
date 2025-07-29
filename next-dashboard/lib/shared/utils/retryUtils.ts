/**
 * Retry Utilities with Exponential Backoff
 * 
 * Provides robust retry mechanisms for API calls with exponential backoff,
 * jitter, and rate limit handling specifically designed for government APIs.
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitterMs: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBase: 2,
  jitterMs: 100,
  retryableErrors: [
    'rate limit',
    'too many requests',
    'too many attempts',
    'timeout',
    'network error',
    'connection error',
    '429',
    '500',
    '502',
    '503',
    '504',
  ],
};

/**
 * Check if an error is retryable based on error message or status code
 */
export function isRetryableError(error: Error | string, retryableErrors: string[]): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerErrorMessage = errorMessage.toLowerCase();
  
  return retryableErrors.some(retryableError => 
    lowerErrorMessage.includes(retryableError.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  exponentialBase: number,
  jitterMs: number
): number {
  // Exponential backoff: baseDelay * (exponentialBase ^ attempt)
  const exponentialDelay = baseDelayMs * Math.pow(exponentialBase, attempt - 1);
  
  // Add random jitter to prevent thundering herd
  const jitter = Math.random() * jitterMs;
  
  // Cap at maximum delay
  const totalDelay = Math.min(exponentialDelay + jitter, maxDelayMs);
  
  return Math.round(totalDelay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalDuration: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (!isRetryableError(lastError, config.retryableErrors)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
        };
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay for next attempt
      const delayMs = calculateDelay(
        attempt,
        config.baseDelayMs,
        config.maxDelayMs,
        config.exponentialBase,
        config.jitterMs
      );

      // Call retry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, lastError, delayMs);
      }

      // Wait before next attempt
      await sleep(delayMs);
    }
  }

  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: config.maxAttempts,
    totalDuration: Date.now() - startTime,
  };
}

/**
 * Specialized retry configuration for FRED API
 */
export const FRED_RETRY_CONFIG: RetryOptions = {
  maxAttempts: 4,
  baseDelayMs: 2000, // Start with 2 seconds
  maxDelayMs: 60000, // Max 1 minute
  exponentialBase: 2,
  jitterMs: 500,
  retryableErrors: [
    'rate limit',
    'too many requests',
    'too many attempts',
    '429',
    'timeout',
    'network error',
    'connection error',
    '500',
    '502',
    '503',
    '504',
  ],
  onRetry: (attempt, error, delayMs) => {
    console.warn(`FRED API retry attempt ${attempt}: ${error.message}. Waiting ${delayMs}ms before next attempt.`);
  },
};

/**
 * Specialized retry configuration for BLS API
 */
export const BLS_RETRY_CONFIG: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 3000, // BLS has stricter rate limits
  maxDelayMs: 120000, // Max 2 minutes
  exponentialBase: 2,
  jitterMs: 1000,
  retryableErrors: [
    'rate limit',
    'too many requests',
    '429',
    'timeout',
    'network error',
    'connection error',
    '500',
    '502',
    '503',
    '504',
  ],
  onRetry: (attempt, error, delayMs) => {
    console.warn(`BLS API retry attempt ${attempt}: ${error.message}. Waiting ${delayMs}ms before next attempt.`);
  },
};

/**
 * Specialized retry configuration for Census API
 */
export const CENSUS_RETRY_CONFIG: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1500,
  maxDelayMs: 45000,
  exponentialBase: 2,
  jitterMs: 300,
  retryableErrors: [
    'rate limit',
    'too many requests',
    '429',
    'timeout',
    'network error',
    'connection error',
    '500',
    '502',
    '503',
    '504',
  ],
  onRetry: (attempt, error, delayMs) => {
    console.warn(`Census API retry attempt ${attempt}: ${error.message}. Waiting ${delayMs}ms before next attempt.`);
  },
};

/**
 * Specialized retry configuration for Alpha Vantage API
 */
export const ALPHA_VANTAGE_RETRY_CONFIG: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 5000, // Alpha Vantage has very strict rate limits
  maxDelayMs: 300000, // Max 5 minutes
  exponentialBase: 2,
  jitterMs: 2000,
  retryableErrors: [
    'rate limit',
    'too many requests',
    'api call frequency',
    '429',
    'timeout',
    'network error',
    'connection error',
    '500',
    '502',
    '503',
    '504',
  ],
  onRetry: (attempt, error, delayMs) => {
    console.warn(`Alpha Vantage API retry attempt ${attempt}: ${error.message}. Waiting ${delayMs}ms before next attempt.`);
  },
};

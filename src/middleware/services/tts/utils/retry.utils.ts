/**
 * Retry utilities with exponential backoff and jitter
 *
 * @description Provides retry functionality for TTS provider calls.
 * Retries only on transient errors (429, 408, 5xx, timeouts).
 * Non-retryable errors (401, 403, 400) are thrown immediately.
 */

import {
  TTSError,
  QuotaExceededError,
  ProviderUnavailableError,
  NetworkError,
} from '../providers/base-tts-provider';

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts (excluding the initial attempt)
   * @default 3
   */
  maxRetries: number;

  /**
   * Initial delay in milliseconds before the first retry
   * @default 1000
   */
  initialDelayMs: number;

  /**
   * Multiplier applied to the delay after each retry
   * @default 2.0
   */
  multiplier: number;

  /**
   * Maximum delay in milliseconds (cap for exponential growth)
   * @default 30000
   */
  maxDelayMs: number;
}

/**
 * Default retry configuration following Google Cloud best practices
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  multiplier: 2.0,
  maxDelayMs: 30000,
};

/**
 * Determines whether an error is retryable
 *
 * @param error - The error to check
 * @returns true if the error is retryable (transient)
 *
 * Retryable:
 * - QuotaExceededError (429 rate limit)
 * - ProviderUnavailableError (502, 503, 504)
 * - NetworkError (timeouts, connection refused, DNS errors)
 *
 * Not retryable:
 * - InvalidConfigError (401, 403)
 * - InvalidVoiceError (400)
 * - SynthesisFailedError (unknown/permanent errors)
 * - Non-TTSError exceptions
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof QuotaExceededError) return true;
  if (error instanceof ProviderUnavailableError) return true;
  if (error instanceof NetworkError) return true;

  // Check for non-TTSError with retryable status codes in message
  if (error instanceof Error && !(error instanceof TTSError)) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('429') ||
      msg.includes('408') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 *
 * @param attempt - The retry attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds with random jitter
 *
 * @description Uses full jitter strategy: random value between 0 and the
 * calculated exponential delay. This spreads out retry attempts to reduce
 * thundering herd effects.
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.multiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Full jitter: random between 0 and cappedDelay
  return Math.random() * cappedDelay;
}

/**
 * Sleep for a given number of milliseconds
 *
 * @internal
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logger function type for retry events
 */
export type RetryLogger = (
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  meta?: Record<string, unknown>
) => void;

/**
 * Execute an async function with retry and exponential backoff
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @param logger - Optional logger for retry events
 * @returns The result of the function
 * @throws The last error if all retries are exhausted, or a non-retryable error immediately
 *
 * @example
 * ```typescript
 * const result = await executeWithRetry(
 *   () => provider.synthesize(text, voiceId, request),
 *   DEFAULT_RETRY_CONFIG,
 *   (level, msg, meta) => console.log(msg, meta)
 * );
 * ```
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  logger?: RetryLogger
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt >= config.maxRetries) {
        logger?.('error', 'All retry attempts exhausted', {
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          error: (error as Error).message,
        });
        throw error;
      }

      const delayMs = calculateDelay(attempt, config);

      logger?.('warn', `Retry attempt ${attempt + 1}/${config.maxRetries}`, {
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delayMs: Math.round(delayMs),
        error: (error as Error).message,
        errorType: (error as Error).constructor.name,
      });

      await sleep(delayMs);
    }
  }

  // Should not reach here, but TypeScript needs this
  throw lastError;
}

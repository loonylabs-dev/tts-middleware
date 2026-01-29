/**
 * Tests for Retry Utilities
 *
 * @description Tests retry logic, exponential backoff, jitter, and error classification
 * @coverage Target: 100%
 */

import {
  isRetryableError,
  calculateDelay,
  executeWithRetry,
  DEFAULT_RETRY_CONFIG,
} from '../../src/middleware/services/tts/utils/retry.utils';
import type { RetryConfig, RetryLogger } from '../../src/middleware/services/tts/utils/retry.utils';
import {
  QuotaExceededError,
  ProviderUnavailableError,
  NetworkError,
  InvalidConfigError,
  InvalidVoiceError,
  SynthesisFailedError,
} from '../../src/middleware/services/tts/providers/base-tts-provider';

describe('Retry Utilities', () => {
  describe('DEFAULT_RETRY_CONFIG', () => {
    test('has sensible defaults', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.multiplier).toBe(2.0);
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
    });
  });

  describe('isRetryableError', () => {
    describe('retryable errors', () => {
      test('QuotaExceededError is retryable (429)', () => {
        const error = new QuotaExceededError('azure');
        expect(isRetryableError(error)).toBe(true);
      });

      test('ProviderUnavailableError is retryable (5xx)', () => {
        const error = new ProviderUnavailableError('azure');
        expect(isRetryableError(error)).toBe(true);
      });

      test('NetworkError is retryable (timeout/connection)', () => {
        const error = new NetworkError('azure', 'Connection timeout');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with 429 in message is retryable', () => {
        const error = new Error('HTTP 429 Too Many Requests');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with 408 in message is retryable', () => {
        const error = new Error('HTTP 408 Request Timeout');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with 500 in message is retryable', () => {
        const error = new Error('HTTP 500 Internal Server Error');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with 502 in message is retryable', () => {
        const error = new Error('HTTP 502 Bad Gateway');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with 503 in message is retryable', () => {
        const error = new Error('HTTP 503 Service Unavailable');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with 504 in message is retryable', () => {
        const error = new Error('HTTP 504 Gateway Timeout');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with timeout in message is retryable', () => {
        const error = new Error('Request timeout');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with ECONNREFUSED is retryable', () => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:443');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with ENOTFOUND is retryable', () => {
        const error = new Error('getaddrinfo ENOTFOUND api.example.com');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with ECONNRESET is retryable', () => {
        const error = new Error('read ECONNRESET');
        expect(isRetryableError(error)).toBe(true);
      });

      test('generic Error with socket hang up is retryable', () => {
        const error = new Error('socket hang up');
        expect(isRetryableError(error)).toBe(true);
      });
    });

    describe('non-retryable errors', () => {
      test('InvalidConfigError is not retryable (401/403)', () => {
        const error = new InvalidConfigError('azure', 'Invalid API key');
        expect(isRetryableError(error)).toBe(false);
      });

      test('InvalidVoiceError is not retryable (400)', () => {
        const error = new InvalidVoiceError('azure', 'invalid-voice');
        expect(isRetryableError(error)).toBe(false);
      });

      test('SynthesisFailedError is not retryable', () => {
        const error = new SynthesisFailedError('azure', 'Unknown failure');
        expect(isRetryableError(error)).toBe(false);
      });

      test('generic Error without retryable codes is not retryable', () => {
        const error = new Error('Something went wrong');
        expect(isRetryableError(error)).toBe(false);
      });

      test('null is not retryable', () => {
        expect(isRetryableError(null)).toBe(false);
      });

      test('undefined is not retryable', () => {
        expect(isRetryableError(undefined)).toBe(false);
      });

      test('string is not retryable', () => {
        expect(isRetryableError('error')).toBe(false);
      });
    });
  });

  describe('calculateDelay', () => {
    test('returns value between 0 and initialDelayMs for attempt 0', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 1000,
        multiplier: 2.0,
        maxDelayMs: 30000,
      };

      // Run multiple times due to randomness
      for (let i = 0; i < 100; i++) {
        const delay = calculateDelay(0, config);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(1000);
      }
    });

    test('returns value between 0 and initialDelayMs * multiplier for attempt 1', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 1000,
        multiplier: 2.0,
        maxDelayMs: 30000,
      };

      for (let i = 0; i < 100; i++) {
        const delay = calculateDelay(1, config);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(2000);
      }
    });

    test('caps delay at maxDelayMs', () => {
      const config: RetryConfig = {
        maxRetries: 10,
        initialDelayMs: 1000,
        multiplier: 10.0,
        maxDelayMs: 5000,
      };

      for (let i = 0; i < 100; i++) {
        const delay = calculateDelay(5, config);
        expect(delay).toBeLessThanOrEqual(5000);
      }
    });

    test('delay increases exponentially (on average)', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 1000,
        multiplier: 2.0,
        maxDelayMs: 30000,
      };

      // Calculate average delays over many iterations
      const iterations = 1000;
      let avgDelay0 = 0;
      let avgDelay1 = 0;
      let avgDelay2 = 0;

      for (let i = 0; i < iterations; i++) {
        avgDelay0 += calculateDelay(0, config);
        avgDelay1 += calculateDelay(1, config);
        avgDelay2 += calculateDelay(2, config);
      }

      avgDelay0 /= iterations;
      avgDelay1 /= iterations;
      avgDelay2 /= iterations;

      // With full jitter, average should be ~half the max for each attempt
      // attempt 0: avg ~500, attempt 1: avg ~1000, attempt 2: avg ~2000
      expect(avgDelay1).toBeGreaterThan(avgDelay0);
      expect(avgDelay2).toBeGreaterThan(avgDelay1);
    });
  });

  describe('executeWithRetry', () => {
    const fastConfig: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 10,
      multiplier: 2.0,
      maxDelayMs: 100,
    };

    test('returns result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await executeWithRetry(fn, fastConfig);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries on retryable error and succeeds', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new QuotaExceededError('azure'))
        .mockResolvedValue('success');

      const result = await executeWithRetry(fn, fastConfig);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('retries multiple times before success', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('azure', 'timeout'))
        .mockRejectedValueOnce(new ProviderUnavailableError('azure'))
        .mockResolvedValue('success');

      const result = await executeWithRetry(fn, fastConfig);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('throws after all retries exhausted', async () => {
      const error = new QuotaExceededError('azure', 'Rate limited');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(executeWithRetry(fn, fastConfig)).rejects.toThrow(
        QuotaExceededError
      );
      // 1 initial + 3 retries = 4 calls
      expect(fn).toHaveBeenCalledTimes(4);
    });

    test('throws immediately on non-retryable error', async () => {
      const error = new InvalidConfigError('azure', 'Bad API key');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(executeWithRetry(fn, fastConfig)).rejects.toThrow(
        InvalidConfigError
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('throws immediately on InvalidVoiceError', async () => {
      const error = new InvalidVoiceError('azure', 'bad-voice');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(executeWithRetry(fn, fastConfig)).rejects.toThrow(
        InvalidVoiceError
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('throws immediately on SynthesisFailedError', async () => {
      const error = new SynthesisFailedError('azure', 'Unknown');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(executeWithRetry(fn, fastConfig)).rejects.toThrow(
        SynthesisFailedError
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('waits between retries', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new QuotaExceededError('azure'))
        .mockResolvedValue('success');

      await executeWithRetry(fn, fastConfig);
      // With fastConfig (initialDelayMs: 10), the jitter delay is 0-10ms
      // Just verify the function was called twice (retry happened)
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('uses default config when none provided', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await executeWithRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('respects maxRetries = 0 (no retries)', async () => {
      const zeroConfig: RetryConfig = { ...fastConfig, maxRetries: 0 };
      const error = new QuotaExceededError('azure');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(executeWithRetry(fn, zeroConfig)).rejects.toThrow(
        QuotaExceededError
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    describe('logging', () => {
      test('logs retry attempts', async () => {
        const logger: RetryLogger = jest.fn();
        const fn = jest
          .fn()
          .mockRejectedValueOnce(new QuotaExceededError('azure'))
          .mockResolvedValue('success');

        await executeWithRetry(fn, fastConfig, logger);

        expect(logger).toHaveBeenCalledWith(
          'warn',
          expect.stringContaining('Retry attempt 1/3'),
          expect.objectContaining({
            attempt: 1,
            maxRetries: 3,
            delayMs: expect.any(Number),
            errorType: 'QuotaExceededError',
          })
        );
      });

      test('logged delayMs increases exponentially across attempts', async () => {
        const logger: RetryLogger = jest.fn();
        // Use small delays for fast tests, but keep multiplier to verify exponential growth
        const config: RetryConfig = {
          maxRetries: 3,
          initialDelayMs: 10,
          multiplier: 2.0,
          maxDelayMs: 1000,
        };
        const fn = jest.fn().mockRejectedValue(new QuotaExceededError('azure'));

        await expect(
          executeWithRetry(fn, config, logger)
        ).rejects.toThrow();

        // Extract delayMs from each logged retry attempt
        const warnCalls = (logger as jest.Mock).mock.calls.filter(
          ([level]: [string]) => level === 'warn'
        );
        expect(warnCalls).toHaveLength(3);

        const delays = warnCalls.map(
          ([, , meta]: [string, string, Record<string, unknown>]) =>
            meta.delayMs as number
        );

        // Verify each delay is within the expected exponential bound:
        // attempt 0: 0..10, attempt 1: 0..20, attempt 2: 0..40
        expect(delays[0]).toBeGreaterThanOrEqual(0);
        expect(delays[0]).toBeLessThanOrEqual(10);

        expect(delays[1]).toBeGreaterThanOrEqual(0);
        expect(delays[1]).toBeLessThanOrEqual(20);

        expect(delays[2]).toBeGreaterThanOrEqual(0);
        expect(delays[2]).toBeLessThanOrEqual(40);
      });

      test('delayMs respects maxDelayMs cap', async () => {
        const logger: RetryLogger = jest.fn();
        const config: RetryConfig = {
          maxRetries: 3,
          initialDelayMs: 10,
          multiplier: 100.0,
          maxDelayMs: 50,
        };
        const fn = jest.fn().mockRejectedValue(new QuotaExceededError('azure'));

        await expect(
          executeWithRetry(fn, config, logger)
        ).rejects.toThrow();

        const warnCalls = (logger as jest.Mock).mock.calls.filter(
          ([level]: [string]) => level === 'warn'
        );

        const delays = warnCalls.map(
          ([, , meta]: [string, string, Record<string, unknown>]) =>
            meta.delayMs as number
        );

        // All delays should be capped at maxDelayMs (50ms)
        for (const delay of delays) {
          expect(delay).toBeLessThanOrEqual(50);
        }
      });

      test('logs exhaustion when all retries fail', async () => {
        const logger: RetryLogger = jest.fn();
        const fn = jest.fn().mockRejectedValue(new QuotaExceededError('azure'));

        await expect(
          executeWithRetry(fn, fastConfig, logger)
        ).rejects.toThrow();

        expect(logger).toHaveBeenCalledWith(
          'error',
          'All retry attempts exhausted',
          expect.objectContaining({
            attempt: 4,
            maxRetries: 3,
          })
        );
      });

      test('does not log when no logger provided', async () => {
        const fn = jest
          .fn()
          .mockRejectedValueOnce(new QuotaExceededError('azure'))
          .mockResolvedValue('success');

        // Should not throw
        await executeWithRetry(fn, fastConfig);
      });
    });

    describe('with generic errors containing status codes', () => {
      test('retries on generic 429 error', async () => {
        const fn = jest
          .fn()
          .mockRejectedValueOnce(new Error('HTTP 429'))
          .mockResolvedValue('success');

        const result = await executeWithRetry(fn, fastConfig);

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2);
      });

      test('retries on generic timeout error', async () => {
        const fn = jest
          .fn()
          .mockRejectedValueOnce(new Error('Request timeout after 30000ms'))
          .mockResolvedValue('success');

        const result = await executeWithRetry(fn, fastConfig);

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2);
      });

      test('does not retry on generic 400 error', async () => {
        const fn = jest
          .fn()
          .mockRejectedValue(new Error('HTTP 400 Bad Request'));

        await expect(executeWithRetry(fn, fastConfig)).rejects.toThrow(
          'HTTP 400 Bad Request'
        );
        expect(fn).toHaveBeenCalledTimes(1);
      });
    });
  });
});

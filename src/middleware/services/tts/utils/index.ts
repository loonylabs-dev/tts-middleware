/**
 * TTS Utility Functions
 *
 * Export all utility functions for TTS operations
 */

export {
  countCharacters,
  countCharactersWithoutSSML,
  validateCharacterCount,
  countBillableCharacters,
  estimateAudioDuration,
  formatCharacterCount,
} from './character-counter.utils';

// Logger utilities
export {
  setLogger,
  getLogger,
  resetLogger,
  setLogLevel,
  getLogLevel,
  silentLogger,
  log,
} from './logger.utils';

export type { TTSLogger, LogLevel } from './logger.utils';

// Retry utilities
export {
  executeWithRetry,
  isRetryableError,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
} from './retry.utils';

export type { RetryConfig, RetryLogger } from './retry.utils';

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

export { getMp3Duration } from './mp3-duration.utils';

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

// Request logger (per-call Markdown debug logs, gated by DEBUG_TTS_REQUESTS)
export {
  writeRequestLog,
  isRequestLoggingEnabled,
} from './request-logger.utils';

export type {
  TTSRequestLogEntry,
  TTSRequestLogKind,
} from './request-logger.utils';

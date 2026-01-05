/**
 * Pluggable Logger Interface for TTS Middleware
 *
 * @description Allows customization of logging behavior.
 * By default, uses console logging, but can be replaced
 * with any logger implementation (Winston, Pino, etc.)
 *
 * @example
 * ```typescript
 * // Use custom logger
 * import { setLogger } from '@loonylabs/tts-middleware';
 *
 * setLogger({
 *   info: (msg, meta) => winston.info(msg, meta),
 *   warn: (msg, meta) => winston.warn(msg, meta),
 *   error: (msg, meta) => winston.error(msg, meta),
 *   debug: (msg, meta) => winston.debug(msg, meta),
 * });
 * ```
 */

/**
 * Log level type
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Logger interface that can be implemented by any logging library
 */
export interface TTSLogger {
  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log an error message
   */
  error(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Default console logger implementation
 */
const consoleLogger: TTSLogger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    if (meta) {
      console.info(message, meta);
    } else {
      console.info(message);
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (meta) {
      console.warn(message, meta);
    } else {
      console.warn(message);
    }
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (meta) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (meta) {
      console.debug(message, meta);
    } else {
      console.debug(message);
    }
  },
};

/**
 * Silent logger that discards all messages
 * Useful for testing or when logging should be disabled
 */
export const silentLogger: TTSLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

/**
 * Current logger instance
 */
let currentLogger: TTSLogger = consoleLogger;

/**
 * Current log level (messages below this level are discarded)
 */
let currentLogLevel: LogLevel = 'info';

/**
 * Log level priority (higher = more important)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Set the logger implementation
 *
 * @param logger - The logger implementation to use
 *
 * @example
 * ```typescript
 * import { setLogger, silentLogger } from '@loonylabs/tts-middleware';
 *
 * // Disable logging
 * setLogger(silentLogger);
 *
 * // Use custom logger
 * setLogger({
 *   info: (msg, meta) => myLogger.info(msg, meta),
 *   warn: (msg, meta) => myLogger.warn(msg, meta),
 *   error: (msg, meta) => myLogger.error(msg, meta),
 *   debug: (msg, meta) => myLogger.debug(msg, meta),
 * });
 * ```
 */
export function setLogger(logger: TTSLogger): void {
  currentLogger = logger;
}

/**
 * Get the current logger implementation
 *
 * @returns The current logger
 */
export function getLogger(): TTSLogger {
  return currentLogger;
}

/**
 * Reset logger to default console logger
 */
export function resetLogger(): void {
  currentLogger = consoleLogger;
}

/**
 * Set the minimum log level
 *
 * @param level - The minimum log level to display
 *
 * @example
 * ```typescript
 * import { setLogLevel } from '@loonylabs/tts-middleware';
 *
 * // Only show warnings and errors
 * setLogLevel('warn');
 *
 * // Show all messages including debug
 * setLogLevel('debug');
 * ```
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get the current log level
 *
 * @returns The current minimum log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Check if a log level should be displayed
 *
 * @param level - The level to check
 * @returns True if the level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * Internal logging function used by TTS components
 *
 * @internal
 * @param provider - Provider name for log prefix
 * @param level - Log level
 * @param message - Log message
 * @param meta - Optional metadata
 */
export function log(
  provider: string,
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${provider.toUpperCase()}] [${level.toUpperCase()}]`;
  const formattedMessage = `${prefix} ${message}`;

  currentLogger[level](formattedMessage, meta);
}

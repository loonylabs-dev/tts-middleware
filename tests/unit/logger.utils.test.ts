/**
 * Tests for Logger Utilities
 *
 * @description Tests the pluggable logger interface
 */

import {
  setLogger,
  getLogger,
  resetLogger,
  setLogLevel,
  getLogLevel,
  silentLogger,
  log,
  TTSLogger,
} from '../../src/middleware/services/tts/utils/logger.utils';

describe('Logger Utils', () => {
  // Store original console methods
  const originalConsole = {
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  beforeEach(() => {
    // Reset logger to default before each test
    resetLogger();
    setLogLevel('info');

    // Mock console methods
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });

  describe('Default Logger', () => {
    test('logs info messages to console', () => {
      log('TEST', 'info', 'Test message');

      expect(console.info).toHaveBeenCalled();
      const call = (console.info as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[TEST]');
      expect(call[0]).toContain('[INFO]');
      expect(call[0]).toContain('Test message');
    });

    test('logs warn messages to console', () => {
      log('TEST', 'warn', 'Warning message');

      expect(console.warn).toHaveBeenCalled();
      const call = (console.warn as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[TEST]');
      expect(call[0]).toContain('[WARN]');
    });

    test('logs error messages to console', () => {
      log('TEST', 'error', 'Error message');

      expect(console.error).toHaveBeenCalled();
      const call = (console.error as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[TEST]');
      expect(call[0]).toContain('[ERROR]');
    });

    test('logs debug messages when level is debug', () => {
      setLogLevel('debug');
      log('TEST', 'debug', 'Debug message');

      expect(console.debug).toHaveBeenCalled();
      const call = (console.debug as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[TEST]');
      expect(call[0]).toContain('[DEBUG]');
    });

    test('includes metadata in log output', () => {
      const meta = { key: 'value', count: 42 };
      log('TEST', 'info', 'Message with meta', meta);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Message with meta'),
        meta
      );
    });

    test('includes timestamp in log output', () => {
      log('TEST', 'info', 'Test message');

      const call = (console.info as jest.Mock).mock.calls[0];
      // Should contain ISO timestamp pattern
      expect(call[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Log Level Filtering', () => {
    test('filters out debug messages when level is info', () => {
      setLogLevel('info');
      log('TEST', 'debug', 'Debug message');

      expect(console.debug).not.toHaveBeenCalled();
    });

    test('filters out info messages when level is warn', () => {
      setLogLevel('warn');
      log('TEST', 'info', 'Info message');

      expect(console.info).not.toHaveBeenCalled();
    });

    test('filters out warn messages when level is error', () => {
      setLogLevel('error');
      log('TEST', 'warn', 'Warn message');

      expect(console.warn).not.toHaveBeenCalled();
    });

    test('always shows error messages regardless of level', () => {
      setLogLevel('error');
      log('TEST', 'error', 'Error message');

      expect(console.error).toHaveBeenCalled();
    });

    test('shows all messages when level is debug', () => {
      setLogLevel('debug');

      log('TEST', 'debug', 'Debug');
      log('TEST', 'info', 'Info');
      log('TEST', 'warn', 'Warn');
      log('TEST', 'error', 'Error');

      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test('getLogLevel returns current level', () => {
      setLogLevel('warn');
      expect(getLogLevel()).toBe('warn');

      setLogLevel('debug');
      expect(getLogLevel()).toBe('debug');
    });
  });

  describe('Custom Logger', () => {
    test('setLogger replaces default logger', () => {
      const customLogger: TTSLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };

      setLogger(customLogger);
      log('TEST', 'info', 'Custom log');

      expect(customLogger.info).toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
    });

    test('getLogger returns current logger', () => {
      const customLogger: TTSLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };

      setLogger(customLogger);
      expect(getLogger()).toBe(customLogger);
    });

    test('resetLogger restores default console logger', () => {
      const customLogger: TTSLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };

      setLogger(customLogger);
      resetLogger();
      log('TEST', 'info', 'Back to console');

      expect(console.info).toHaveBeenCalled();
      expect(customLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Silent Logger', () => {
    test('silentLogger discards all messages', () => {
      setLogger(silentLogger);

      log('TEST', 'info', 'Should be silent');
      log('TEST', 'warn', 'Should be silent');
      log('TEST', 'error', 'Should be silent');
      log('TEST', 'debug', 'Should be silent');

      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });

    test('silentLogger functions are no-ops', () => {
      // Should not throw
      silentLogger.info('test');
      silentLogger.warn('test');
      silentLogger.error('test');
      silentLogger.debug('test');
    });
  });

  describe('Provider Name Formatting', () => {
    test('converts provider name to uppercase', () => {
      log('azure', 'info', 'Test');

      const call = (console.info as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[AZURE]');
    });

    test('handles multi-word provider names', () => {
      log('edenai', 'info', 'Test');

      const call = (console.info as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[EDENAI]');
    });
  });
});

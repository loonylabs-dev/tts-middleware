/**
 * Tests for BaseTTSProvider Abstract Class
 *
 * @description Tests the abstract base class, error classes, and utility methods
 * @coverage Target: 90%
 */

import type { TTSSynthesizeRequest, TTSResponse } from '../../src/middleware/services/tts/types';
import { TTSProvider } from '../../src/middleware/services/tts/types';
import {
  BaseTTSProvider,
  TTSError,
  InvalidConfigError,
  InvalidVoiceError,
  QuotaExceededError,
  ProviderUnavailableError,
  SynthesisFailedError,
  NetworkError,
} from '../../src/middleware/services/tts/providers/base-tts-provider';

/**
 * Mock implementation of BaseTTSProvider for testing
 */
class MockTTSProvider extends BaseTTSProvider {
  constructor() {
    super(TTSProvider.AZURE);
  }

  async synthesize(
    text: string,
    voiceId: string,
    request: TTSSynthesizeRequest
  ): Promise<TTSResponse> {
    this.validateConfig(request);

    return {
      audio: Buffer.from(`mock-audio-${text}`),
      metadata: {
        provider: this.getProviderName(),
        voice: voiceId,
        duration: 1000,
        audioFormat: 'mp3',
        sampleRate: 24000,
      },
      billing: {
        characters: this.countCharacters(text),
      },
    };
  }

  // Expose protected methods for testing
  public testCountCharacters(text: string): number {
    return this.countCharacters(text);
  }

  public testValidateConfig(request: TTSSynthesizeRequest): void {
    this.validateConfig(request);
  }

  public async testValidateVoiceExists(voiceId: string): Promise<boolean> {
    return this.validateVoiceExists(voiceId);
  }

  public testHandleError(error: Error, context?: string): TTSError {
    return this.handleError(error, context);
  }
}

describe('BaseTTSProvider', () => {
  let provider: MockTTSProvider;

  beforeEach(() => {
    provider = new MockTTSProvider();
  });

  describe('Constructor', () => {
    test('sets provider name correctly', () => {
      expect(provider.getProviderName()).toBe(TTSProvider.AZURE);
    });

    test('abstract class requires implementation via subclass', () => {
      // TypeScript prevents direct instantiation at compile time
      // This test verifies that we can only use it through a concrete subclass
      expect(provider).toBeInstanceOf(BaseTTSProvider);
      expect(provider.getProviderName()).toBeDefined();
    });
  });

  describe('getProviderName()', () => {
    test('returns correct provider name', () => {
      const providerName = provider.getProviderName();
      expect(providerName).toBe(TTSProvider.AZURE);
      expect(providerName).toBe('azure');
    });
  });

  describe('validateConfig()', () => {
    test('passes validation for valid request', () => {
      const request: TTSSynthesizeRequest = {
        text: 'Hello world',
        voice: { id: 'en-US-JennyNeural' },
      };

      expect(() => provider.testValidateConfig(request)).not.toThrow();
    });

    test('throws InvalidConfigError if text is empty', () => {
      const request: TTSSynthesizeRequest = {
        text: '',
        voice: { id: 'en-US-JennyNeural' },
      };

      expect(() => provider.testValidateConfig(request)).toThrow(
        InvalidConfigError
      );
      expect(() => provider.testValidateConfig(request)).toThrow(
        'Text cannot be empty'
      );
    });

    test('throws InvalidConfigError if text is only whitespace', () => {
      const request: TTSSynthesizeRequest = {
        text: '   ',
        voice: { id: 'en-US-JennyNeural' },
      };

      expect(() => provider.testValidateConfig(request)).toThrow(
        InvalidConfigError
      );
    });

    test('throws InvalidConfigError if voice ID is missing', () => {
      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: '' },
      };

      expect(() => provider.testValidateConfig(request)).toThrow(
        InvalidConfigError
      );
      expect(() => provider.testValidateConfig(request)).toThrow(
        'Voice ID is required'
      );
    });
  });

  describe('countCharacters()', () => {
    test('counts simple text correctly', () => {
      expect(provider.testCountCharacters('Hello World')).toBe(11);
    });

    test('includes spaces in count', () => {
      expect(provider.testCountCharacters('a b c')).toBe(5);
    });

    test('includes punctuation in count', () => {
      expect(provider.testCountCharacters('Hello, World!')).toBe(13);
    });

    test('includes newlines in count', () => {
      expect(provider.testCountCharacters('Line 1\nLine 2')).toBe(13);
    });

    test('handles empty string', () => {
      expect(provider.testCountCharacters('')).toBe(0);
    });

    test('handles Unicode characters', () => {
      expect(provider.testCountCharacters('Café')).toBe(4);
      expect(provider.testCountCharacters('日本語')).toBe(3);
    });

    test('handles emoji', () => {
      expect(provider.testCountCharacters('Hello 👋')).toBe(8);
    });
  });

  describe('validateVoiceExists()', () => {
    test('returns true by default (base implementation)', async () => {
      const result = await provider.testValidateVoiceExists('any-voice-id');
      expect(result).toBe(true);
    });

    test('returns true for any voice ID', async () => {
      const voices = [
        'en-US-JennyNeural',
        'de-DE-KatjaNeural',
        'invalid-voice',
      ];

      for (const voiceId of voices) {
        const result = await provider.testValidateVoiceExists(voiceId);
        expect(result).toBe(true);
      }
    });
  });

  describe('synthesize() abstract method', () => {
    test('must be implemented by subclass', async () => {
      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'test-voice' },
      };

      const response = await provider.synthesize('Test', 'test-voice', request);

      expect(response.audio).toBeInstanceOf(Buffer);
      expect(response.metadata.provider).toBe('azure');
      expect(response.metadata.voice).toBe('test-voice');
      expect(response.billing.characters).toBe(4);
    });
  });
});

describe('TTSError', () => {
  test('creates error with all properties', () => {
    const error = new TTSError('azure', 'SYNTHESIS_FAILED' as any, 'Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TTSError');
    expect(error.provider).toBe('azure');
    expect(error.code).toBe('SYNTHESIS_FAILED');
    expect(error.message).toBe('Test error');
    expect(error.cause).toBeUndefined();
  });

  test('includes cause if provided', () => {
    const cause = new Error('Original error');
    const error = new TTSError(
      'azure',
      'SYNTHESIS_FAILED' as any,
      'Test error',
      cause
    );

    expect(error.cause).toBe(cause);
  });

  test('toString() formats error correctly', () => {
    const error = new TTSError('azure', 'SYNTHESIS_FAILED' as any, 'Test error');
    expect(error.toString()).toBe('[azure] SYNTHESIS_FAILED: Test error');
  });

  test('toString() includes cause if present', () => {
    const cause = new Error('Original error');
    const error = new TTSError(
      'azure',
      'SYNTHESIS_FAILED' as any,
      'Test error',
      cause
    );

    expect(error.toString()).toContain('caused by: Original error');
  });
});

describe('InvalidConfigError', () => {
  test('creates error with correct properties', () => {
    const error = new InvalidConfigError('azure', 'Invalid API key');

    expect(error).toBeInstanceOf(TTSError);
    expect(error.name).toBe('InvalidConfigError');
    expect(error.provider).toBe('azure');
    expect(error.code).toBe('INVALID_CONFIG');
    expect(error.message).toBe('Invalid API key');
  });

  test('includes cause if provided', () => {
    const cause = new Error('Missing env var');
    const error = new InvalidConfigError('azure', 'Invalid API key', cause);

    expect(error.cause).toBe(cause);
  });
});

describe('InvalidVoiceError', () => {
  test('creates error with default message', () => {
    const error = new InvalidVoiceError('azure', 'invalid-voice-id');

    expect(error).toBeInstanceOf(TTSError);
    expect(error.name).toBe('InvalidVoiceError');
    expect(error.provider).toBe('azure');
    expect(error.code).toBe('INVALID_VOICE');
    expect(error.message).toBe('Voice not found: invalid-voice-id');
  });

  test('accepts custom message', () => {
    const error = new InvalidVoiceError(
      'azure',
      'invalid-voice-id',
      'Custom error message'
    );

    expect(error.message).toBe('Custom error message');
  });

  test('includes cause if provided', () => {
    const cause = new Error('API returned 404');
    const error = new InvalidVoiceError(
      'azure',
      'invalid-voice-id',
      undefined,
      cause
    );

    expect(error.cause).toBe(cause);
  });
});

describe('QuotaExceededError', () => {
  test('creates error with default message', () => {
    const error = new QuotaExceededError('azure');

    expect(error).toBeInstanceOf(TTSError);
    expect(error.name).toBe('QuotaExceededError');
    expect(error.provider).toBe('azure');
    expect(error.code).toBe('QUOTA_EXCEEDED');
    expect(error.message).toBe('Provider quota or rate limit exceeded');
  });

  test('accepts custom message', () => {
    const error = new QuotaExceededError('azure', 'Monthly limit reached');

    expect(error.message).toBe('Monthly limit reached');
  });
});

describe('ProviderUnavailableError', () => {
  test('creates error with default message', () => {
    const error = new ProviderUnavailableError('azure');

    expect(error).toBeInstanceOf(TTSError);
    expect(error.name).toBe('ProviderUnavailableError');
    expect(error.provider).toBe('azure');
    expect(error.code).toBe('PROVIDER_UNAVAILABLE');
    expect(error.message).toBe('Provider service is temporarily unavailable');
  });

  test('accepts custom message', () => {
    const error = new ProviderUnavailableError(
      'azure',
      'Service maintenance in progress'
    );

    expect(error.message).toBe('Service maintenance in progress');
  });
});

describe('SynthesisFailedError', () => {
  test('creates error with message', () => {
    const error = new SynthesisFailedError(
      'azure',
      'Synthesis process failed'
    );

    expect(error).toBeInstanceOf(TTSError);
    expect(error.name).toBe('SynthesisFailedError');
    expect(error.provider).toBe('azure');
    expect(error.code).toBe('SYNTHESIS_FAILED');
    expect(error.message).toBe('Synthesis process failed');
  });

  test('includes cause if provided', () => {
    const cause = new Error('Buffer allocation failed');
    const error = new SynthesisFailedError(
      'azure',
      'Synthesis process failed',
      cause
    );

    expect(error.cause).toBe(cause);
  });
});

describe('NetworkError', () => {
  test('creates error with message', () => {
    const error = new NetworkError('azure', 'Connection timeout');

    expect(error).toBeInstanceOf(TTSError);
    expect(error.name).toBe('NetworkError');
    expect(error.provider).toBe('azure');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toBe('Connection timeout');
  });

  test('includes cause if provided', () => {
    const cause = new Error('ECONNREFUSED');
    const error = new NetworkError('azure', 'Connection timeout', cause);

    expect(error.cause).toBe(cause);
  });
});

describe('handleError()', () => {
  let provider: MockTTSProvider;

  beforeEach(() => {
    provider = new MockTTSProvider();
  });

  test('returns TTSError as-is if already a TTSError', () => {
    const original = new InvalidConfigError('azure', 'Test error');
    const handled = provider.testHandleError(original);

    expect(handled).toBe(original);
  });

  test('converts 401 error to InvalidConfigError', () => {
    const error = new Error('401 Unauthorized');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(InvalidConfigError);
    expect(handled.message).toContain('Authentication failed');
  });

  test('converts 403 error to InvalidConfigError', () => {
    const error = new Error('403 Forbidden');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(InvalidConfigError);
    expect(handled.message).toContain('Authentication failed');
  });

  test('converts 429 error to QuotaExceededError', () => {
    const error = new Error('429 Too Many Requests');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(QuotaExceededError);
    expect(handled.message).toContain('Rate limit exceeded');
  });

  test('converts 503 error to ProviderUnavailableError', () => {
    const error = new Error('503 Service Unavailable');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(ProviderUnavailableError);
    expect(handled.message).toContain('Service temporarily unavailable');
  });

  test('converts 504 error to ProviderUnavailableError', () => {
    const error = new Error('504 Gateway Timeout');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(ProviderUnavailableError);
  });

  test('converts timeout error to NetworkError', () => {
    const error = new Error('Request timeout after 30s');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(NetworkError);
    expect(handled.message).toContain('Network error');
  });

  test('converts ECONNREFUSED to NetworkError', () => {
    const error = new Error('ECONNREFUSED - Connection refused');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(NetworkError);
  });

  test('converts ENOTFOUND to NetworkError', () => {
    const error = new Error('ENOTFOUND - DNS lookup failed');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(NetworkError);
  });

  test('includes context in error message', () => {
    const error = new Error('Unknown error');
    const handled = provider.testHandleError(error, 'during voice validation');

    expect(handled.message).toContain('during voice validation');
  });

  test('defaults to SynthesisFailedError for unknown errors', () => {
    const error = new Error('Unknown error occurred');
    const handled = provider.testHandleError(error);

    expect(handled).toBeInstanceOf(SynthesisFailedError);
    expect(handled.message).toContain('Synthesis failed');
    expect(handled.message).toContain('Unknown error occurred');
  });

  test('preserves original error as cause', () => {
    const original = new Error('Original error');
    const handled = provider.testHandleError(original);

    expect(handled.cause).toBe(original);
  });
});

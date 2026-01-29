/**
 * Tests for EdenAI TTS Provider
 *
 * @description Tests EdenAI multi-provider aggregator implementation
 * @coverage Target: >90%
 */

import type { TTSSynthesizeRequest } from '../../src/middleware/services/tts/types';
import { TTSProvider } from '../../src/middleware/services/tts/types';
import { EdenAIProvider } from '../../src/middleware/services/tts/providers/edenai-provider';
import { InvalidConfigError } from '../../src/middleware/services/tts/providers/base-tts-provider';

// Mock fetch globally
global.fetch = jest.fn();

describe('EdenAIProvider', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.EDENAI_API_KEY = 'test-edenai-key';

    // Reset mocks
    jest.clearAllMocks();

    // Setup default successful fetch response
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        google: {
          audio: Buffer.from('mock-audio-data').toString('base64'),
          cost: 0.001,
        },
      }),
    });
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Constructor and Configuration', () => {
    test('initializes with environment variable', () => {
      const provider = new EdenAIProvider();

      expect(provider.getProviderName()).toBe(TTSProvider.EDENAI);
    });

    test('initializes with provided API key', () => {
      const provider = new EdenAIProvider({
        apiKey: 'custom-key',
      });

      expect(provider.getProviderName()).toBe(TTSProvider.EDENAI);
    });

    test('initializes with custom API URL', () => {
      const customUrl = 'https://custom.edenai.com/api';
      const provider = new EdenAIProvider({
        apiKey: 'test-key',
        apiUrl: customUrl,
      });

      expect(provider.getProviderName()).toBe(TTSProvider.EDENAI);
    });

    test('throws InvalidConfigError if API key is missing', () => {
      delete process.env.EDENAI_API_KEY;

      expect(() => new EdenAIProvider()).toThrow(InvalidConfigError);
      expect(() => new EdenAIProvider()).toThrow(/API key is required/i);
    });

    test('logs initialization info', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      new EdenAIProvider();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Synthesis', () => {
    test('synthesizes text successfully', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'en-US' },
      };

      const response = await provider.synthesize('Hello World', 'en-US', request);

      expect(response.audio).toBeInstanceOf(Buffer);
      expect(response.audio.length).toBeGreaterThan(0);
      expect(response.metadata.provider).toBe('edenai');
      expect(response.metadata.voice).toBe('en-US');
      expect(response.billing.characters).toBe(11);
    });

    test('passes correct request to EdenAI API', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'en-US' },
      };

      await provider.synthesize('Hello World', 'en-US', request);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.edenai.run/v2/audio/text_to_speech',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-edenai-key',
            'Content-Type': 'application/json',
          },
        })
      );

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.text).toBe('Hello World');
      expect(requestBody.language).toBe('en-US');
      // Option always defaults to FEMALE (EdenAI requires this field)
      expect(requestBody.option).toBe('FEMALE');
      // Providers defaults to google
      expect(requestBody.providers).toBe('google');
    });

    test('uses voiceId for language extraction but always defaults option to FEMALE', async () => {
      const provider = new EdenAIProvider();

      // Azure-style voice IDs are NOT valid for EdenAI option field
      // They should extract language but use FEMALE as option
      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-JennyNeural' },
      };

      await provider.synthesize('Test', 'en-US-JennyNeural', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Language extracted correctly
      expect(requestBody.language).toBe('en-US');
      // But option is always FEMALE (not the Azure voice ID)
      expect(requestBody.option).toBe('FEMALE');
    });

    test('validates config before synthesis', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: '',
        voice: { id: 'en-US' },
      };

      await expect(provider.synthesize('', 'en-US', request)).rejects.toThrow(
        InvalidConfigError
      );
    });
  });

  describe('API Request Building', () => {
    test('includes provider selection at top level (not in settings)', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
        providerOptions: {
          provider: 'google',
        },
      };

      await provider.synthesize('Test', 'en-US', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Provider must be at top level, NOT in settings
      expect(requestBody.providers).toBe('google');
      expect(requestBody.settings?.providers).toBeUndefined();
    });

    test('includes option field with FEMALE default for language codes', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'de' }, // Simple language code
        providerOptions: {
          provider: 'openai',
        },
      };

      await provider.synthesize('Test', 'de', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Option defaults to FEMALE for language-only voice IDs
      expect(requestBody.option).toBe('FEMALE');
    });

    test('includes explicit option when provided', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
        providerOptions: {
          provider: 'google',
          option: 'MALE',
        },
      };

      await provider.synthesize('Test', 'en-US', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.option).toBe('MALE');
    });

    test('includes model in settings when provided', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
        providerOptions: {
          provider: 'google',
          model: 'Neural',
        },
      };

      await provider.synthesize('Test', 'en-US', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Legacy model is converted to settings format: { provider: model }
      expect(requestBody.settings?.google).toBe('Neural');
    });

    test('does not include settings when no model specified', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
        providerOptions: {
          provider: 'google',
        },
      };

      await provider.synthesize('Test', 'en-US', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Settings should be undefined if no model is specified
      expect(requestBody.settings).toBeUndefined();
    });

    // NOTE: speaking_rate, speaking_pitch, speaking_volume, audio_format, sampling_rate
    // are NOT supported by EdenAI API in the settings object.
    // These tests were removed as part of the fix for the EdenAI API format.
    // See: https://docs.edenai.co/reference/audio_text_to_speech_create

    test('includes fallback_providers in request', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
        providerOptions: {
          fallback_providers: ['google', 'amazon'],
        },
      };

      await provider.synthesize('Test', 'en-US', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.fallback_providers).toEqual(['google', 'amazon']);
    });

    test('includes voice_id in request when specified', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hallo',
        voice: { id: 'de' },
        providerOptions: {
          provider: 'elevenlabs',
          voice_id: 'Aria',
        },
      };

      await provider.synthesize('Hallo', 'de', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.voice_id).toBe('Aria');
      expect(requestBody.providers).toBe('elevenlabs');
    });

    test('does not include voice_id when not specified', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en' },
        providerOptions: {
          provider: 'google',
        },
      };

      await provider.synthesize('Test', 'en', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.voice_id).toBeUndefined();
    });
  });

  describe('Language Extraction', () => {
    test('extracts language from Azure-style voice ID', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-JennyNeural' },
      };

      await provider.synthesize('Test', 'en-US-JennyNeural', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.language).toBe('en-US');
    });

    test('extracts language from German voice ID', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'de-DE-KatjaNeural' },
      };

      await provider.synthesize('Test', 'de-DE-KatjaNeural', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.language).toBe('de-DE');
    });

    test('uses voice ID directly if already a language code', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'fr-FR' },
      };

      await provider.synthesize('Test', 'fr-FR', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.language).toBe('fr-FR');
    });

    test('handles simple language codes', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en' },
      };

      await provider.synthesize('Test', 'en', request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.language).toBe('en');
    });
  });

  describe('Audio Response Handling', () => {
    test('handles base64-encoded audio response', async () => {
      const mockAudioData = Buffer.from('test-audio-data');

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          google: {
            audio: mockAudioData.toString('base64'),
            cost: 0.001,
          },
        }),
      });

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      const response = await provider.synthesize('Test', 'en-US', request);

      expect(response.audio).toBeInstanceOf(Buffer);
      expect(response.audio.toString()).toBe(mockAudioData.toString());
    });

    test('handles audio_resource_url response', async () => {
      const mockAudioData = Buffer.from('downloaded-audio-data');

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            google: {
              audio_resource_url: 'https://example.com/audio.mp3',
              cost: 0.001,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => mockAudioData.buffer,
        });

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      const response = await provider.synthesize('Test', 'en-US', request);

      expect(response.audio).toBeInstanceOf(Buffer);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(2, 'https://example.com/audio.mp3');
    });

    test('tries multiple providers if first fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          amazon: {
            status: 'fail',
            error: 'Provider failed',
          },
          google: {
            audio: Buffer.from('success').toString('base64'),
            cost: 0.001,
          },
        }),
      });

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      const response = await provider.synthesize('Test', 'en-US', request);

      expect(response.audio).toBeInstanceOf(Buffer);
    });
  });

  describe('Error Handling', () => {
    test('throws SynthesisFailedError on HTTP 400', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      await expect(provider.synthesize('Test', 'en-US', request)).rejects.toThrow();
    });

    test('throws error on HTTP 401 (authentication failure)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      await expect(provider.synthesize('Test', 'en-US', request)).rejects.toThrow();
    });

    test('throws error on HTTP 429 (rate limit)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      await expect(provider.synthesize('Test', 'en-US', request)).rejects.toThrow();
    });

    test('throws error on HTTP 503 (service unavailable)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      await expect(provider.synthesize('Test', 'en-US', request)).rejects.toThrow();
    });

    test('throws error when no audio data in response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          google: {
            status: 'fail',
            error: 'No audio generated',
          },
        }),
      });

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      await expect(provider.synthesize('Test', 'en-US', request)).rejects.toThrow(
        'No audio data in EdenAI response'
      );
    });

    test('throws error on fetch network failure', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      await expect(provider.synthesize('Test', 'en-US', request)).rejects.toThrow();
    });
  });

  describe('Response Structure', () => {
    test('returns complete TTSResponse', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
        audio: {
          format: 'mp3',
          speed: 1.0,
          sampleRate: 24000,
        },
      };

      const response = await provider.synthesize('Test', 'en-US', request);

      // Audio
      expect(response.audio).toBeInstanceOf(Buffer);

      // Metadata
      expect(response.metadata.provider).toBe('edenai');
      expect(response.metadata.voice).toBe('en-US');
      expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(response.metadata.audioFormat).toBe('mp3');
      expect(response.metadata.sampleRate).toBe(24000);

      // Billing
      expect(response.billing.characters).toBe(4);
      expect(response.billing.tokensUsed).toBeUndefined();
    });

    test('uses default audio format if not specified', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      const response = await provider.synthesize('Test', 'en-US', request);

      expect(response.metadata.audioFormat).toBe('mp3');
      expect(response.metadata.sampleRate).toBe(24000);
    });
  });

  describe('Character Counting', () => {
    test('counts characters correctly', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World!',
        voice: { id: 'en-US' },
      };

      const response = await provider.synthesize('Hello World!', 'en-US', request);

      expect(response.billing.characters).toBe(12);
    });

    test('counts Unicode characters correctly', async () => {
      const provider = new EdenAIProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Héllo Wörld',
        voice: { id: 'en-US' },
      };

      const response = await provider.synthesize(
        'Héllo Wörld',
        'en-US',
        request
      );

      expect(response.billing.characters).toBe(11);
    });
  });
});

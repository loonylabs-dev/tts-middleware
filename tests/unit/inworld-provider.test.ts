/**
 * Tests for Inworld AI TTS Provider
 *
 * @description Tests Inworld AI provider implementation
 * @coverage Target: >90%
 */

import type { TTSSynthesizeRequest } from '../../src/middleware/services/tts/types';
import { TTSProvider } from '../../src/middleware/services/tts/types';
import { InworldProvider } from '../../src/middleware/services/tts/providers/inworld-provider';
import {
  InvalidConfigError,
  QuotaExceededError,
  SynthesisFailedError,
} from '../../src/middleware/services/tts/providers/base-tts-provider';

// Mock fetch globally
global.fetch = jest.fn();

/**
 * Helper to create a mock Inworld API response
 */
function mockInworldResponse(audioSize = 1024, processedChars?: number) {
  const audioContent = Buffer.from(new ArrayBuffer(audioSize)).toString('base64');
  const responseBody: Record<string, unknown> = { audioContent };
  if (processedChars !== undefined) {
    responseBody.usage = { processedCharactersCount: processedChars };
  }
  return {
    ok: true,
    json: async () => responseBody,
  };
}

describe('InworldProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.INWORLD_API_KEY = 'test-inworld-key';
    jest.clearAllMocks();

    // Default successful fetch response
    (fetch as jest.Mock).mockResolvedValue(mockInworldResponse());
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor and Configuration', () => {
    test('initializes with environment variable', () => {
      const provider = new InworldProvider();
      expect(provider.getProviderName()).toBe(TTSProvider.INWORLD);
    });

    test('initializes with provided API key', () => {
      const provider = new InworldProvider({ apiKey: 'custom-key' });
      expect(provider.getProviderName()).toBe(TTSProvider.INWORLD);
    });

    test('initializes with custom API URL', () => {
      const provider = new InworldProvider({
        apiKey: 'test-key',
        apiUrl: 'https://custom.inworld.ai/tts/v1/voice',
      });
      expect(provider.getProviderName()).toBe(TTSProvider.INWORLD);
    });

    test('throws InvalidConfigError if API key is missing', () => {
      delete process.env.INWORLD_API_KEY;
      expect(() => new InworldProvider()).toThrow(InvalidConfigError);
      expect(() => new InworldProvider()).toThrow(/API key is required/i);
    });

    test('logs initialization info', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      new InworldProvider();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Inworld AI provider initialized'),
        expect.objectContaining({ hasApiKey: true })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Synthesize - Basic', () => {
    test('synthesizes text successfully', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'Ashley' },
        audio: { format: 'mp3' },
      };

      const result = await provider.synthesize('Hello World', 'Ashley', request);

      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.metadata.provider).toBe(TTSProvider.INWORLD);
      expect(result.metadata.voice).toBe('Ashley');
      expect(result.metadata.audioFormat).toBe('mp3');
      expect(result.metadata.sampleRate).toBe(48000);
      expect(result.billing.characters).toBe(11);
    });

    test('uses default format mp3 when not specified', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      const result = await provider.synthesize('test', 'Ashley', request);
      expect(result.metadata.audioFormat).toBe('mp3');
    });

    test('uses default sample rate 48000 when not specified', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      const result = await provider.synthesize('test', 'Ashley', request);
      expect(result.metadata.sampleRate).toBe(48000);
    });

    test('uses custom sample rate from request', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { sampleRate: 24000 },
      };

      const result = await provider.synthesize('test', 'Ashley', request);
      expect(result.metadata.sampleRate).toBe(24000);
    });

    test('sends correct headers with Basic auth', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await provider.synthesize('test', 'Ashley', request);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.inworld.ai/tts/v1/voice',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Basic test-inworld-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('sends default modelId inworld-tts-1.5-max', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.modelId).toBe('inworld-tts-1.5-max');
    });

    test('sends voiceId in request body', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.voiceId).toBe('Ashley');
      expect(body.text).toBe('test');
    });
  });

  describe('Synthesize - Provider Options', () => {
    test('sends custom modelId', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        providerOptions: { modelId: 'inworld-tts-1.5-mini' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.modelId).toBe('inworld-tts-1.5-mini');
    });

    test('sends temperature from audio options', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { temperature: 0.8 },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.temperature).toBe(0.8);
    });

    test('maps audio.speed to audioConfig.speakingRate', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { speed: 1.3 },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.audioConfig.speakingRate).toBe(1.3);
    });

    test('maps audio.format to Inworld audioEncoding in audioConfig', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { format: 'opus' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.audioConfig.audioEncoding).toBe('OGG_OPUS');
    });

    test('maps audio.format wav to LINEAR16', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { format: 'wav' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.audioConfig.audioEncoding).toBe('LINEAR16');
    });

    test('maps audio.format flac to FLAC', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { format: 'flac' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.audioConfig.audioEncoding).toBe('FLAC');
    });

    test('reports audioFormat from request.audio.format', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { format: 'opus' },
      };

      const result = await provider.synthesize('test', 'Ashley', request);
      expect(result.metadata.audioFormat).toBe('opus');
    });

    test('sends bitRate in audioConfig', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        providerOptions: { bitRate: 192000 },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.audioConfig.bitRate).toBe(192000);
    });

    test('sends sampleRateHertz in audioConfig from request', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { sampleRate: 24000 },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.audioConfig.sampleRateHertz).toBe(24000);
    });

    test('sends timestampType parameter', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        providerOptions: { timestampType: 'WORD' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.timestampType).toBe('WORD');
    });

    test('sends applyTextNormalization parameter', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        providerOptions: { applyTextNormalization: 'ON' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.applyTextNormalization).toBe('ON');
    });

    test('omits audioConfig when no audio options provided', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.audioConfig).toBeUndefined();
    });

    test('omits undefined optional parameters', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await provider.synthesize('test', 'Ashley', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({
        text: 'test',
        voiceId: 'Ashley',
        modelId: 'inworld-tts-1.5-max',
      });
    });
  });

  describe('Synthesize - Billing', () => {
    test('uses processedCharactersCount from API response when available', async () => {
      (fetch as jest.Mock).mockResolvedValue(mockInworldResponse(1024, 42));

      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      const result = await provider.synthesize('test', 'Ashley', request);
      expect(result.billing.characters).toBe(42);
    });

    test('falls back to text length when API does not return usage', async () => {
      (fetch as jest.Mock).mockResolvedValue(mockInworldResponse(1024));

      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'Ashley' },
      };

      const result = await provider.synthesize('Hello World', 'Ashley', request);
      expect(result.billing.characters).toBe(11);
    });
  });

  describe('Synthesize - Audio Duration', () => {
    test('audioDuration is undefined for non-mp3 formats', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { format: 'opus' },
      };

      const result = await provider.synthesize('test', 'Ashley', request);
      expect(result.metadata.audioDuration).toBeUndefined();
    });

    test('audioDuration is computed for mp3 format', async () => {
      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
        audio: { format: 'mp3' },
      };

      const result = await provider.synthesize('test', 'Ashley', request);
      // Mock buffer has no valid MP3 frames, so getMp3Duration returns undefined
      expect(result.metadata).toHaveProperty('audioDuration');
    });
  });

  describe('Synthesize - Error Handling', () => {
    test('throws on API error response', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request: invalid voiceId',
      });

      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await expect(provider.synthesize('test', 'Ashley', request)).rejects.toThrow(
        /Inworld AI API error \(400\)/
      );
    });

    test('throws InvalidConfigError on 403', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await expect(provider.synthesize('test', 'Ashley', request)).rejects.toThrow(InvalidConfigError);
    });

    test('throws QuotaExceededError on 429', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await expect(provider.synthesize('test', 'Ashley', request)).rejects.toThrow(QuotaExceededError);
    });

    test('throws SynthesisFailedError on unknown errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Something unexpected'));

      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await expect(provider.synthesize('test', 'Ashley', request)).rejects.toThrow(SynthesisFailedError);
    });

    test('logs error on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const provider = new InworldProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await expect(provider.synthesize('test', 'Ashley', request)).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Synthesis failed'),
        expect.objectContaining({ error: 'Connection refused' })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Synthesize - Custom API URL', () => {
    test('calls custom API URL', async () => {
      const customUrl = 'https://custom.inworld.ai/tts/v1/voice';
      const provider = new InworldProvider({ apiKey: 'key', apiUrl: customUrl });
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Ashley' },
      };

      await provider.synthesize('test', 'Ashley', request);

      expect(fetch).toHaveBeenCalledWith(customUrl, expect.any(Object));
    });
  });
});

/**
 * Tests for Fish Audio TTS Provider
 *
 * @description Tests Fish Audio provider implementation
 * @coverage Target: >90%
 */

import type { TTSSynthesizeRequest } from '../../src/middleware/services/tts/types';
import { TTSProvider } from '../../src/middleware/services/tts/types';
import { FishAudioProvider } from '../../src/middleware/services/tts/providers/fish-audio-provider';
import { InvalidConfigError } from '../../src/middleware/services/tts/providers/base-tts-provider';

// Mock fetch globally
global.fetch = jest.fn();

describe('FishAudioProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.FISH_AUDIO_API_KEY = 'test-fish-audio-key';
    jest.clearAllMocks();

    // Default successful fetch response
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1024),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor and Configuration', () => {
    test('initializes with environment variable', () => {
      const provider = new FishAudioProvider();
      expect(provider.getProviderName()).toBe(TTSProvider.FISH_AUDIO);
    });

    test('initializes with provided API key', () => {
      const provider = new FishAudioProvider({ apiKey: 'custom-key' });
      expect(provider.getProviderName()).toBe(TTSProvider.FISH_AUDIO);
    });

    test('initializes with custom API URL', () => {
      const provider = new FishAudioProvider({
        apiKey: 'test-key',
        apiUrl: 'https://custom.fish.audio/v1/tts',
      });
      expect(provider.getProviderName()).toBe(TTSProvider.FISH_AUDIO);
    });

    test('throws InvalidConfigError if API key is missing', () => {
      delete process.env.FISH_AUDIO_API_KEY;
      expect(() => new FishAudioProvider()).toThrow(InvalidConfigError);
      expect(() => new FishAudioProvider()).toThrow(/API key is required/i);
    });

    test('logs initialization info', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      new FishAudioProvider();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fish Audio provider initialized'),
        expect.objectContaining({ hasApiKey: true })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Synthesize - Basic', () => {
    test('synthesizes text successfully', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'default' },
        audio: { format: 'mp3' },
      };

      const result = await provider.synthesize('Hello World', 'default', request);

      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.audio.length).toBe(1024);
      expect(result.metadata.provider).toBe(TTSProvider.FISH_AUDIO);
      expect(result.metadata.voice).toBe('default');
      expect(result.metadata.audioFormat).toBe('mp3');
      expect(result.metadata.sampleRate).toBe(44100);
      expect(result.billing.characters).toBe(11);
    });

    test('uses default format mp3 when not specified', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      const result = await provider.synthesize('test', 'default', request);
      expect(result.metadata.audioFormat).toBe('mp3');
    });

    test('uses custom sample rate from request', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
        audio: { sampleRate: 24000 },
      };

      const result = await provider.synthesize('test', 'default', request);
      expect(result.metadata.sampleRate).toBe(24000);
    });

    test('sends correct headers including model', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
        providerOptions: { model: 'speech-1.6' },
      };

      await provider.synthesize('test', 'default', request);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.fish.audio/v1/tts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-fish-audio-key',
            'Content-Type': 'application/json',
            'model': 'speech-1.6',
          }),
        })
      );
    });

    test('defaults model to s1', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      await provider.synthesize('test', 'default', request);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ model: 's1' }),
        })
      );
    });
  });

  describe('Synthesize - Voice Selection', () => {
    test('does not send reference_id for default voice', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      await provider.synthesize('test', 'default', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.reference_id).toBeUndefined();
    });

    test('sends voice.id as reference_id when not default', async () => {
      const provider = new FishAudioProvider();
      const voiceId = '90042f762dbf49baa2e7776d011eee6b';
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: voiceId },
      };

      await provider.synthesize('test', voiceId, request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.reference_id).toBe(voiceId);
    });

    test('providerOptions.referenceId takes priority over voice.id', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'some-voice' },
        providerOptions: { referenceId: 'override-ref-id' },
      };

      await provider.synthesize('test', 'some-voice', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.reference_id).toBe('override-ref-id');
    });
  });

  describe('Synthesize - Provider Options', () => {
    test('sends quality parameters', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
        audio: { temperature: 0.5 },
        providerOptions: {
          topP: 0.8,
          repetitionPenalty: 1.5,
        },
      };

      await provider.synthesize('test', 'default', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.temperature).toBe(0.5);
      expect(body.top_p).toBe(0.8);
      expect(body.repetition_penalty).toBe(1.5);
    });

    test('sends processing parameters', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
        providerOptions: {
          latency: 'low',
          chunkLength: 200,
          normalize: false,
        },
      };

      await provider.synthesize('test', 'default', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.latency).toBe('low');
      expect(body.chunk_length).toBe(200);
      expect(body.normalize).toBe(false);
    });

    test('sends audio parameters', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
        audio: { sampleRate: 48000 },
        providerOptions: {
          mp3Bitrate: 192,
          opusBitrate: 64,
        },
      };

      await provider.synthesize('test', 'default', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.sample_rate).toBe(48000);
      expect(body.mp3_bitrate).toBe(192);
      expect(body.opus_bitrate).toBe(64);
    });

    test('sends prosody speed from audio options', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
        audio: { speed: 1.5 },
      };

      await provider.synthesize('test', 'default', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.prosody).toEqual({ speed: 1.5 });
    });

    test('sends prosody volume from audio options', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
        audio: { volumeGainDb: 5 },
      };

      await provider.synthesize('test', 'default', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.prosody).toEqual({ volume: 5 });
    });

    test('sends both speed and volume in prosody', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
        audio: { speed: 1.2, volumeGainDb: -3 },
      };

      await provider.synthesize('test', 'default', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.prosody).toEqual({ speed: 1.2, volume: -3 });
    });

    test('omits undefined optional parameters', async () => {
      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      await provider.synthesize('test', 'default', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({ text: 'test', format: 'mp3' });
    });
  });

  describe('Synthesize - Error Handling', () => {
    test('throws on API error response', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request: invalid reference_id',
      });

      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      await expect(provider.synthesize('test', 'default', request)).rejects.toThrow(
        /Fish Audio API error \(400\)/
      );
    });

    test('throws on 429 rate limit', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      await expect(provider.synthesize('test', 'default', request)).rejects.toThrow();
    });

    test('throws on network error', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      await expect(provider.synthesize('test', 'default', request)).rejects.toThrow();
    });

    test('logs error on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const provider = new FishAudioProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      await expect(provider.synthesize('test', 'default', request)).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Synthesis failed'),
        expect.objectContaining({ error: 'Connection refused' })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Synthesize - Custom API URL', () => {
    test('calls custom API URL', async () => {
      const customUrl = 'https://custom.fish.audio/v1/tts';
      const provider = new FishAudioProvider({ apiKey: 'key', apiUrl: customUrl });
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'default' },
      };

      await provider.synthesize('test', 'default', request);

      expect(fetch).toHaveBeenCalledWith(customUrl, expect.any(Object));
    });
  });
});

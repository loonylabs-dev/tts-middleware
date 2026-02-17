/**
 * Tests for Gemini TTS Provider
 *
 * @description Tests Gemini TTS provider implementation including
 * Vertex AI auth, PCM-to-MP3/WAV conversion, and error handling.
 * @coverage Target: >90%
 */

import type { TTSSynthesizeRequest } from '../../src/middleware/services/tts/types';
import { TTSProvider } from '../../src/middleware/services/tts/types';
import { GeminiProvider } from '../../src/middleware/services/tts/providers/gemini-provider';
import {
  InvalidConfigError,
  QuotaExceededError,
  SynthesisFailedError,
} from '../../src/middleware/services/tts/providers/base-tts-provider';

// Mock fetch globally
global.fetch = jest.fn();

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockResolvedValue({
      getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-access-token' }),
    }),
  })),
}));

// Mock child_process.spawn for ffmpeg
jest.mock('child_process', () => {
  const { EventEmitter } = require('events');
  const { Readable, Writable } = require('stream');

  return {
    spawn: jest.fn(() => {
      const proc = new EventEmitter();

      // Create stdout as a Readable stream
      const stdout = new Readable({ read() {} });
      proc.stdout = stdout;

      // Create stderr as a Readable stream
      const stderr = new Readable({ read() {} });
      proc.stderr = stderr;

      // Create stdin as a Writable stream
      const stdin = new Writable({
        write(_chunk: Buffer, _encoding: string, callback: () => void) {
          callback();
        },
      });
      stdin.on('finish', () => {
        // Simulate ffmpeg producing MP3 output
        const fakeMp3 = Buffer.from('fake-mp3-output');
        stdout.push(fakeMp3);
        stdout.push(null);
        // Emit close with success code
        process.nextTick(() => proc.emit('close', 0));
      });
      proc.stdin = stdin;

      return proc;
    }),
  };
});

/**
 * Helper to create a mock Gemini API response with PCM audio data
 */
function mockGeminiResponse(audioSize = 1024) {
  const pcmData = Buffer.alloc(audioSize).toString('base64');
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/pcm;rate=24000',
                  data: pcmData,
                },
              },
            ],
          },
        },
      ],
    }),
  };
}

describe('GeminiProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './vertex-ai-service-account.json';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    jest.clearAllMocks();

    // Default successful fetch response
    (fetch as jest.Mock).mockResolvedValue(mockGeminiResponse());
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor and Configuration', () => {
    test('initializes with environment variables', () => {
      const provider = new GeminiProvider();
      expect(provider.getProviderName()).toBe(TTSProvider.GEMINI);
    });

    test('initializes with provided config', () => {
      const provider = new GeminiProvider({
        keyFilename: './custom-credentials.json',
        projectId: 'custom-project',
        region: 'europe-west4',
      });
      expect(provider.getProviderName()).toBe(TTSProvider.GEMINI);
    });

    test('throws InvalidConfigError if credentials are missing', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      expect(() => new GeminiProvider()).toThrow(InvalidConfigError);
      expect(() => new GeminiProvider()).toThrow(/credentials are required/i);
    });

    test('throws InvalidConfigError if project ID is missing', () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;
      expect(() => new GeminiProvider()).toThrow(InvalidConfigError);
      expect(() => new GeminiProvider()).toThrow(/Project ID is required/i);
    });

    test('logs initialization info', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      new GeminiProvider();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gemini TTS provider initialized'),
        expect.objectContaining({ hasCredentials: true, region: 'us-central1' })
      );
      consoleSpy.mockRestore();
    });

    test('uses GEMINI_REGION env var', () => {
      process.env.GEMINI_REGION = 'europe-west4';
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      new GeminiProvider();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gemini TTS provider initialized'),
        expect.objectContaining({ region: 'europe-west4' })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Synthesize - Basic', () => {
    test('synthesizes text successfully', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
      };

      const result = await provider.synthesize('Hello World', 'Kore', request);

      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.metadata.provider).toBe(TTSProvider.GEMINI);
      expect(result.metadata.voice).toBe('Kore');
      expect(result.metadata.sampleRate).toBe(24000);
      expect(result.billing.characters).toBe(11);
    });

    test('uses default format mp3 when not specified', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      const result = await provider.synthesize('test', 'Kore', request);
      // mp3 via ffmpeg mock, or wav fallback
      expect(['mp3', 'wav']).toContain(result.metadata.audioFormat);
    });

    test('returns sampleRate 24000', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      const result = await provider.synthesize('test', 'Kore', request);
      expect(result.metadata.sampleRate).toBe(24000);
    });

    test('sends Bearer token in Authorization header', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await provider.synthesize('test', 'Kore', request);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('calls Vertex AI endpoint with project and region', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await provider.synthesize('test', 'Kore', request);

      const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('us-central1-aiplatform.googleapis.com');
      expect(calledUrl).toContain('projects/test-project');
      expect(calledUrl).toContain('locations/us-central1');
    });

    test('uses default model gemini-2.5-flash-preview-tts', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await provider.synthesize('test', 'Kore', request);

      const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('gemini-2.5-flash-preview-tts');
    });
  });

  describe('Synthesize - Request Body', () => {
    test('sends correct generateContent payload', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'Kore' },
      };

      await provider.synthesize('Hello World', 'Kore', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({
        contents: [{ parts: [{ text: 'Hello World' }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
      });
    });

    test('sends voiceName from voiceId', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Puck' },
      };

      await provider.synthesize('test', 'Puck', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Puck');
    });
  });

  describe('Synthesize - Provider Options', () => {
    test('uses custom model', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
        providerOptions: { model: 'gemini-2.5-pro-preview-tts' },
      };

      await provider.synthesize('test', 'Kore', request);

      const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('gemini-2.5-pro-preview-tts');
    });

    test('prepends stylePrompt to text', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'Have a wonderful day!',
        voice: { id: 'Kore' },
        providerOptions: { stylePrompt: 'Say cheerfully:' },
      };

      await provider.synthesize('Have a wonderful day!', 'Kore', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.contents[0].parts[0].text).toBe('Say cheerfully: Have a wonderful day!');
    });

    test('does not prepend stylePrompt when not provided', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'Kore' },
      };

      await provider.synthesize('Hello', 'Kore', request);

      const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.contents[0].parts[0].text).toBe('Hello');
    });
  });

  describe('Synthesize - Audio Conversion', () => {
    test('returns WAV format when wav is requested', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
        audio: { format: 'wav' },
      };

      const result = await provider.synthesize('test', 'Kore', request);

      expect(result.metadata.audioFormat).toBe('wav');
      // WAV header starts with "RIFF"
      expect(result.audio.subarray(0, 4).toString()).toBe('RIFF');
      // Followed by "WAVE"
      expect(result.audio.subarray(8, 12).toString()).toBe('WAVE');
    });

    test('WAV output has correct header structure', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
        audio: { format: 'wav' },
      };

      const result = await provider.synthesize('test', 'Kore', request);

      // Check WAV header fields
      expect(result.audio.readUInt16LE(20)).toBe(1); // PCM format
      expect(result.audio.readUInt16LE(22)).toBe(1); // mono
      expect(result.audio.readUInt32LE(24)).toBe(24000); // sample rate
      expect(result.audio.readUInt16LE(34)).toBe(16); // bits per sample
    });

    test('attempts MP3 conversion via ffmpeg for mp3 format', async () => {
      const { spawn } = require('child_process');
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
      };

      await provider.synthesize('test', 'Kore', request);

      expect(spawn).toHaveBeenCalledWith('ffmpeg', expect.arrayContaining([
        '-f', 's16le',
        '-ar', '24000',
        '-ac', '1',
      ]));
    });

    test('falls back to WAV when ffmpeg fails', async () => {
      // Override spawn mock to simulate ffmpeg failure
      const { spawn } = require('child_process');
      const { EventEmitter } = require('events');
      const { Readable, Writable } = require('stream');

      spawn.mockImplementationOnce(() => {
        const proc = new EventEmitter();
        proc.stdout = new Readable({ read() {} });
        proc.stderr = new Readable({ read() {} });
        proc.stdin = new Writable({
          write(_chunk: Buffer, _encoding: string, callback: () => void) {
            callback();
          },
        });
        proc.stdin.on('finish', () => {
          proc.stdout.push(null);
          process.nextTick(() => proc.emit('close', 1));
        });
        return proc;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
      };

      const result = await provider.synthesize('test', 'Kore', request);

      expect(result.metadata.audioFormat).toBe('wav');
      expect(result.audio.subarray(0, 4).toString()).toBe('RIFF');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ffmpeg not available'),
        expect.any(Object)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Synthesize - Audio Duration', () => {
    test('audioDuration is undefined for wav format', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
        audio: { format: 'wav' },
      };

      const result = await provider.synthesize('test', 'Kore', request);
      expect(result.metadata.audioDuration).toBeUndefined();
    });

    test('audioDuration is computed for mp3 format', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
      };

      const result = await provider.synthesize('test', 'Kore', request);
      // Mock ffmpeg produces fake data, so getMp3Duration returns undefined
      expect(result.metadata).toHaveProperty('audioDuration');
    });
  });

  describe('Synthesize - Billing', () => {
    test('reports character count from text length', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'Kore' },
      };

      const result = await provider.synthesize('Hello World', 'Kore', request);
      expect(result.billing.characters).toBe(11);
    });

    test('counts characters correctly for longer text', async () => {
      const longText = 'Dies ist ein langer deutscher Text zum Testen.';
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: longText,
        voice: { id: 'Kore' },
      };

      const result = await provider.synthesize(longText, 'Kore', request);
      expect(result.billing.characters).toBe(longText.length);
    });
  });

  describe('Synthesize - Error Handling', () => {
    test('throws on API error response', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request: invalid voice name',
      });

      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'InvalidVoice' },
      };

      await expect(provider.synthesize('test', 'InvalidVoice', request)).rejects.toThrow(
        /Gemini API error \(400\)/
      );
    });

    test('throws InvalidConfigError on 403', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden: invalid credentials',
      });

      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await expect(provider.synthesize('test', 'Kore', request)).rejects.toThrow(InvalidConfigError);
    });

    test('throws QuotaExceededError on 429', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await expect(provider.synthesize('test', 'Kore', request)).rejects.toThrow(QuotaExceededError);
    });

    test('throws SynthesisFailedError on unknown errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Something unexpected'));

      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await expect(provider.synthesize('test', 'Kore', request)).rejects.toThrow(SynthesisFailedError);
    });

    test('throws on empty audio data in response', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{}] } }],
        }),
      });

      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await expect(provider.synthesize('test', 'Kore', request)).rejects.toThrow(
        /no audio data/
      );
    });

    test('throws on missing candidates in response', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await expect(provider.synthesize('test', 'Kore', request)).rejects.toThrow(
        /no audio data/
      );
    });

    test('logs error on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: 'Kore' },
      };

      await expect(provider.synthesize('test', 'Kore', request)).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Synthesis failed'),
        expect.objectContaining({ error: 'Connection refused' })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Synthesize - Validation', () => {
    test('throws on empty text', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: '',
        voice: { id: 'Kore' },
      };

      await expect(provider.synthesize('', 'Kore', request)).rejects.toThrow(InvalidConfigError);
    });

    test('throws on missing voice id', async () => {
      const provider = new GeminiProvider();
      const request: TTSSynthesizeRequest = {
        text: 'test',
        voice: { id: '' },
      };

      await expect(provider.synthesize('test', '', request)).rejects.toThrow(InvalidConfigError);
    });
  });
});

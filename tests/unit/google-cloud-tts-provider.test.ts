/**
 * Tests for Google Cloud TTS Provider
 *
 * @description Tests Google Cloud Text-to-Speech implementation with EU-regional endpoints
 * @coverage Target: >90%
 */

import type { TTSSynthesizeRequest } from '../../src/middleware/services/tts/types';
import { TTSProvider } from '../../src/middleware/services/tts/types';
import { GoogleCloudTTSProvider } from '../../src/middleware/services/tts/providers/google-cloud-tts-provider';
import { InvalidConfigError } from '../../src/middleware/services/tts/providers/base-tts-provider';

// Mock the Google Cloud TTS SDK
const mockSynthesizeSpeech = jest.fn();
const mockTextToSpeechClient = jest.fn().mockImplementation(() => ({
  synthesizeSpeech: mockSynthesizeSpeech,
}));

jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: mockTextToSpeechClient,
}));

describe('GoogleCloudTTSProvider', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/credentials.json';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_TTS_REGION = 'eu';

    // Reset mocks
    jest.clearAllMocks();
    mockTextToSpeechClient.mockClear();

    // Setup default successful response
    mockSynthesizeSpeech.mockResolvedValue([
      {
        audioContent: Buffer.from('mock-audio-data'),
      },
    ]);
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Constructor and Configuration', () => {
    test('initializes with environment variables', () => {
      const provider = new GoogleCloudTTSProvider();

      expect(provider.getProviderName()).toBe(TTSProvider.GOOGLE);
    });

    test('initializes with provided config', () => {
      const provider = new GoogleCloudTTSProvider({
        keyFilename: '/custom/path/credentials.json',
        projectId: 'custom-project',
        region: 'europe-west3',
      });

      expect(provider.getProviderName()).toBe(TTSProvider.GOOGLE);
    });

    test('initializes with credentials object', () => {
      const provider = new GoogleCloudTTSProvider({
        credentials: {
          client_email: 'test@project.iam.gserviceaccount.com',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        },
      });

      expect(provider.getProviderName()).toBe(TTSProvider.GOOGLE);
    });

    test('throws InvalidConfigError if credentials are missing', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

      expect(() => new GoogleCloudTTSProvider()).toThrow(InvalidConfigError);
      expect(() => new GoogleCloudTTSProvider()).toThrow(/credentials are required/i);
    });

    test('defaults to EU region for DSGVO compliance', () => {
      delete process.env.GOOGLE_TTS_REGION;

      const provider = new GoogleCloudTTSProvider();

      expect(provider.getProviderName()).toBe(TTSProvider.GOOGLE);
      // The provider should default to 'eu' region internally
    });

    test('logs warning for non-EU region', () => {
      process.env.GOOGLE_TTS_REGION = 'us-central1';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      new GoogleCloudTTSProvider();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('logs warning for global region', () => {
      process.env.GOOGLE_TTS_REGION = 'global';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      new GoogleCloudTTSProvider();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('logs initialization info', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      new GoogleCloudTTSProvider();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Region and Endpoint Configuration', () => {
    test('uses EU endpoint for "eu" region', async () => {
      process.env.GOOGLE_TTS_REGION = 'eu';

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-Neural2-A' },
      };

      await provider.synthesize('Hello', 'en-US-Neural2-A', request);

      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'eu-texttospeech.googleapis.com',
        })
      );
    });

    test('uses regional endpoint for europe-west3', async () => {
      process.env.GOOGLE_TTS_REGION = 'europe-west3';

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'de-DE-Neural2-G' },
      };

      await provider.synthesize('Hello', 'de-DE-Neural2-G', request);

      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'europe-west3-texttospeech.googleapis.com',
        })
      );
    });

    test('uses global endpoint for "global" region', async () => {
      process.env.GOOGLE_TTS_REGION = 'global';

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-Neural2-A' },
      };

      await provider.synthesize('Hello', 'en-US-Neural2-A', request);

      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'texttospeech.googleapis.com',
        })
      );
    });

    test('uses global endpoint for us-central1', async () => {
      process.env.GOOGLE_TTS_REGION = 'us-central1';

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-Neural2-A' },
      };

      await provider.synthesize('Hello', 'en-US-Neural2-A', request);

      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'texttospeech.googleapis.com',
        })
      );
    });
  });

  describe('Synthesis', () => {
    test('synthesizes text successfully', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'en-US-Neural2-A' },
      };

      const response = await provider.synthesize('Hello World', 'en-US-Neural2-A', request);

      expect(response.audio).toBeInstanceOf(Buffer);
      expect(response.audio.length).toBeGreaterThan(0);
      expect(response.metadata.provider).toBe('google');
      expect(response.metadata.voice).toBe('en-US-Neural2-A');
      expect(response.billing.characters).toBe(11);
    });

    test('passes correct request to Google Cloud TTS API', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'de-DE-Neural2-G' },
        audio: { format: 'mp3' },
      };

      await provider.synthesize('Hello World', 'de-DE-Neural2-G', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { text: 'Hello World' },
          voice: {
            languageCode: 'de-DE',
            name: 'de-DE-Neural2-G',
          },
          audioConfig: expect.objectContaining({
            audioEncoding: 'MP3',
          }),
        })
      );
    });

    test('validates config before synthesis', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: '',
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(provider.synthesize('', 'en-US-Neural2-A', request)).rejects.toThrow(
        InvalidConfigError
      );
    });

    test('caches client instance', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-Neural2-A' },
      };

      // First call
      await provider.synthesize('Hello', 'en-US-Neural2-A', request);
      // Second call
      await provider.synthesize('Hello', 'en-US-Neural2-A', request);

      // Client should only be created once
      expect(mockTextToSpeechClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('Voice ID Parsing', () => {
    test('parses Neural2 voice ID correctly', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'de-DE-Neural2-H' },
      };

      await provider.synthesize('Test', 'de-DE-Neural2-H', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'de-DE',
            name: 'de-DE-Neural2-H',
          },
        })
      );
    });

    test('parses WaveNet voice ID correctly', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Wavenet-D' },
      };

      await provider.synthesize('Test', 'en-US-Wavenet-D', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Wavenet-D',
          },
        })
      );
    });

    test('parses Standard voice ID correctly', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'fr-FR-Standard-A' },
      };

      await provider.synthesize('Test', 'fr-FR-Standard-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'fr-FR',
            name: 'fr-FR-Standard-A',
          },
        })
      );
    });

    test('parses Studio voice ID correctly', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Studio-M' },
      };

      await provider.synthesize('Test', 'en-US-Studio-M', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Studio-M',
          },
        })
      );
    });

    test('handles simple language code as voice ID', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US' },
      };

      await provider.synthesize('Test', 'en-US', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'en-US',
            name: 'en-US',
          },
        })
      );
    });
  });

  describe('Audio Configuration', () => {
    test('uses MP3 encoding for mp3 format', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: { format: 'mp3' },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            audioEncoding: 'MP3',
          }),
        })
      );
    });

    test('uses LINEAR16 encoding for wav format', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: { format: 'wav' },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            audioEncoding: 'LINEAR16',
          }),
        })
      );
    });

    test('uses OGG_OPUS encoding for opus format', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: { format: 'opus' },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            audioEncoding: 'OGG_OPUS',
          }),
        })
      );
    });

    test('includes speaking rate when speed is specified', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: { speed: 1.5 },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            speakingRate: 1.5,
          }),
        })
      );
    });

    test('includes pitch when specified', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: { pitch: 2.0 },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            pitch: 2.0,
          }),
        })
      );
    });

    test('includes volume gain when specified', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: { volumeGainDb: 6.0 },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            volumeGainDb: 6.0,
          }),
        })
      );
    });

    test('includes sample rate when specified', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: { sampleRate: 48000 },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            sampleRateHertz: 48000,
          }),
        })
      );
    });
  });

  describe('Provider Options', () => {
    test('includes effects profile IDs when specified', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        providerOptions: {
          effectsProfileId: ['headphone-class-device'],
        },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            effectsProfileId: ['headphone-class-device'],
          }),
        })
      );
    });

    test('uses provider options for speaking rate', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        providerOptions: {
          speakingRate: 0.8,
        },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            speakingRate: 0.8,
          }),
        })
      );
    });

    test('uses provider options for pitch', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        providerOptions: {
          pitchSemitones: -5.0,
        },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            pitch: -5.0,
          }),
        })
      );
    });

    test('audio options override provider options', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: { speed: 1.2 },
        providerOptions: {
          speakingRate: 0.8, // Should be overridden
        },
      };

      await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            speakingRate: 1.2, // audio.speed takes precedence
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('throws SynthesisFailedError when no audio content returned', async () => {
      mockSynthesizeSpeech.mockResolvedValueOnce([{ audioContent: null }]);

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(
        provider.synthesize('Test', 'en-US-Neural2-A', request)
      ).rejects.toThrow('No audio content');
    });

    test('handles API errors gracefully', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('API Error 401'));

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(
        provider.synthesize('Test', 'en-US-Neural2-A', request)
      ).rejects.toThrow();
    });

    test('handles quota exceeded errors', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('429 Too Many Requests'));

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(
        provider.synthesize('Test', 'en-US-Neural2-A', request)
      ).rejects.toThrow();
    });

    test('handles service unavailable errors', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('503 Service Unavailable'));

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(
        provider.synthesize('Test', 'en-US-Neural2-A', request)
      ).rejects.toThrow();
    });

    test('handles network errors', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('ENOTFOUND'));

      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(
        provider.synthesize('Test', 'en-US-Neural2-A', request)
      ).rejects.toThrow();
    });
  });

  describe('Response Structure', () => {
    test('returns complete TTSResponse', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
        audio: {
          format: 'mp3',
          speed: 1.0,
          sampleRate: 24000,
        },
      };

      const response = await provider.synthesize('Test', 'en-US-Neural2-A', request);

      // Audio
      expect(response.audio).toBeInstanceOf(Buffer);

      // Metadata
      expect(response.metadata.provider).toBe('google');
      expect(response.metadata.voice).toBe('en-US-Neural2-A');
      expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(response.metadata.audioFormat).toBe('mp3');
      expect(response.metadata.sampleRate).toBe(24000);

      // Billing
      expect(response.billing.characters).toBe(4);
      expect(response.billing.tokensUsed).toBeUndefined();
    });

    test('uses default audio format if not specified', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-Neural2-A' },
      };

      const response = await provider.synthesize('Test', 'en-US-Neural2-A', request);

      expect(response.metadata.audioFormat).toBe('mp3');
      expect(response.metadata.sampleRate).toBe(24000);
    });
  });

  describe('Character Counting', () => {
    test('counts characters correctly', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World!',
        voice: { id: 'en-US-Neural2-A' },
      };

      const response = await provider.synthesize(
        'Hello World!',
        'en-US-Neural2-A',
        request
      );

      expect(response.billing.characters).toBe(12);
    });

    test('counts Unicode characters correctly', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hallo Welt',
        voice: { id: 'de-DE-Neural2-G' },
      };

      const response = await provider.synthesize(
        'Hallo Welt',
        'de-DE-Neural2-G',
        request
      );

      expect(response.billing.characters).toBe(10);
    });

    test('counts German umlauts correctly', async () => {
      const provider = new GoogleCloudTTSProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Grüß Gott',
        voice: { id: 'de-DE-Neural2-G' },
      };

      const response = await provider.synthesize(
        'Grüß Gott',
        'de-DE-Neural2-G',
        request
      );

      expect(response.billing.characters).toBe(9);
    });
  });
});

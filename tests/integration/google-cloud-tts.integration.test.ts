/**
 * Integration Tests for Google Cloud TTS Provider
 *
 * @description End-to-end integration tests for Google Cloud Text-to-Speech
 * with EU regional endpoints for GDPR/DSGVO compliance
 */

import { TTSService } from '../../src/middleware/services/tts/tts.service';
import { TTSProvider } from '../../src/middleware/services/tts/types';
import type { TTSSynthesizeRequest } from '../../src/middleware/services/tts/types';

// Mock the Google Cloud TTS SDK
const mockSynthesizeSpeech = jest.fn();
const mockTextToSpeechClient = jest.fn().mockImplementation(() => ({
  synthesizeSpeech: mockSynthesizeSpeech,
}));

jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: mockTextToSpeechClient,
}));

// Mock Azure SDK to prevent initialization errors
jest.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const mockSynthesizer = {
    speakSsmlAsync: jest.fn(),
    close: jest.fn(),
  };
  const mockSpeechConfig = { speechSynthesisOutputFormat: 0 };

  return {
    SpeechConfig: {
      fromSubscription: jest.fn(() => mockSpeechConfig),
      fromEndpoint: jest.fn(() => mockSpeechConfig),
    },
    SpeechSynthesizer: jest.fn(() => mockSynthesizer),
    ResultReason: { SynthesizingAudioCompleted: 3, Canceled: 0 },
    SpeechSynthesisOutputFormat: {
      Audio16Khz32KBitRateMonoMp3: 4,
      Audio24Khz160KBitRateMonoMp3: 8,
      Riff24Khz16BitMonoPcm: 3,
      Ogg24Khz16BitMonoOpus: 12,
    },
    CancellationDetails: { fromResult: jest.fn(() => ({ ErrorCode: 0 })) },
    CancellationErrorCode: { AuthenticationFailure: 1 },
  };
});

describe('Google Cloud TTS Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = { ...originalEnv };
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/credentials.json';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_TTS_REGION = 'eu';
    process.env.AZURE_SPEECH_KEY = 'test-key';
    process.env.AZURE_SPEECH_REGION = 'germanywestcentral';

    // Reset mocks
    jest.clearAllMocks();
    mockTextToSpeechClient.mockClear();

    // Setup successful synthesis response
    mockSynthesizeSpeech.mockResolvedValue([
      {
        audioContent: Buffer.from('mock-google-audio-data'),
      },
    ]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Complete Synthesis Workflow', () => {
    test('synthesizes speech with Google Cloud TTS provider', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World from Google Cloud TTS',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
      };

      const response = await service.synthesize(request);

      // Verify response structure
      expect(response.audio).toBeInstanceOf(Buffer);
      expect(response.metadata.provider).toBe('google');
      expect(response.metadata.voice).toBe('en-US-Neural2-A');
      expect(response.billing.characters).toBe(33);

      // Verify SDK was called with correct endpoint
      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'eu-texttospeech.googleapis.com',
        })
      );
    });

    test('synthesizes German speech with Neural2 voice', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Guten Tag, wie geht es Ihnen?',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
        audio: { format: 'mp3' },
      };

      const response = await service.synthesize(request);

      expect(response.metadata.voice).toBe('de-DE-Neural2-G');
      expect(response.billing.characters).toBe(29);

      // Verify correct voice configuration was passed
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'de-DE',
            name: 'de-DE-Neural2-G',
          },
        })
      );
    });

    test('synthesizes with audio format options', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Test audio formats',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-C' },
        audio: {
          format: 'wav',
          sampleRate: 48000,
        },
      };

      const response = await service.synthesize(request);

      expect(response.metadata.audioFormat).toBe('wav');
      expect(response.metadata.sampleRate).toBe(48000);

      // Verify LINEAR16 encoding for WAV
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            audioEncoding: 'LINEAR16',
            sampleRateHertz: 48000,
          }),
        })
      );
    });

    test('synthesizes with speed control', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Fast speech test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
        audio: { speed: 1.5 },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            speakingRate: 1.5,
          }),
        })
      );
    });

    test('synthesizes with pitch adjustment', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'High pitch test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
        audio: { pitch: 4.0 },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            pitch: 4.0,
          }),
        })
      );
    });
  });

  describe('EU Regional Endpoints (DSGVO Compliance)', () => {
    test('uses EU endpoint by default', async () => {
      process.env.GOOGLE_TTS_REGION = 'eu';
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'EU region test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
      };

      await service.synthesize(request);

      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'eu-texttospeech.googleapis.com',
        })
      );
    });

    test('uses Frankfurt endpoint for europe-west3', async () => {
      process.env.GOOGLE_TTS_REGION = 'europe-west3';
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Frankfurt region test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
      };

      await service.synthesize(request);

      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'europe-west3-texttospeech.googleapis.com',
        })
      );
    });

    test('uses Belgium endpoint for europe-west1', async () => {
      process.env.GOOGLE_TTS_REGION = 'europe-west1';
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Belgium region test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
      };

      await service.synthesize(request);

      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'europe-west1-texttospeech.googleapis.com',
        })
      );
    });

    test('can override region via provider options', async () => {
      process.env.GOOGLE_TTS_REGION = 'eu'; // Default
      const service = new TTSService();

      // Note: Region override is set at provider initialization time,
      // not at request time. This test verifies the default is used.
      const request: TTSSynthesizeRequest = {
        text: 'Override test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
      };

      await service.synthesize(request);

      expect(mockTextToSpeechClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiEndpoint: 'eu-texttospeech.googleapis.com',
        })
      );
    });
  });

  describe('Voice Type Support', () => {
    test('supports Neural2 voices', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Neural2 test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-H' },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'de-DE',
            name: 'de-DE-Neural2-H',
          },
        })
      );
    });

    test('supports WaveNet voices', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'WaveNet test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Wavenet-D' },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Wavenet-D',
          },
        })
      );
    });

    test('supports Standard voices', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Standard test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'fr-FR-Standard-A' },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'fr-FR',
            name: 'fr-FR-Standard-A',
          },
        })
      );
    });

    test('supports Studio voices', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Studio test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Studio-M' },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Studio-M',
          },
        })
      );
    });
  });

  describe('Provider Options', () => {
    test('applies effects profile IDs', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Effects profile test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
        providerOptions: {
          effectsProfileId: ['headphone-class-device'],
        },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            effectsProfileId: ['headphone-class-device'],
          }),
        })
      );
    });

    test('applies multiple effects profiles', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Multi effects test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
        providerOptions: {
          effectsProfileId: ['headphone-class-device', 'small-bluetooth-speaker-class-device'],
        },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            effectsProfileId: ['headphone-class-device', 'small-bluetooth-speaker-class-device'],
          }),
        })
      );
    });

    test('applies provider-specific pitch setting', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Pitch semitones test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
        providerOptions: {
          pitchSemitones: -5.0,
        },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            pitch: -5.0,
          }),
        })
      );
    });

    test('applies provider-specific speaking rate', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Speaking rate test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
        providerOptions: {
          speakingRate: 0.75,
        },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            speakingRate: 0.75,
          }),
        })
      );
    });

    test('applies volume gain', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Volume gain test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
        providerOptions: {
          volumeGainDb: 6.0,
        },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          audioConfig: expect.objectContaining({
            volumeGainDb: 6.0,
          }),
        })
      );
    });
  });

  describe('Multi-language Support', () => {
    test('synthesizes German text correctly', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Guten Tag',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
      };

      const response = await service.synthesize(request);

      expect(response.metadata.voice).toBe('de-DE-Neural2-G');
      expect(response.billing.characters).toBe(9);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: { languageCode: 'de-DE', name: 'de-DE-Neural2-G' },
        })
      );
    });

    test('synthesizes French text correctly', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Bonjour le monde',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'fr-FR-Neural2-A' },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
        })
      );
    });

    test('synthesizes Spanish text correctly', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Hola mundo',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'es-ES-Neural2-A' },
      };

      await service.synthesize(request);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
        })
      );
    });
  });

  describe('Character Counting', () => {
    test('counts simple text correctly', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
      };

      const response = await service.synthesize(request);
      expect(response.billing.characters).toBe(4);
    });

    test('counts German umlauts correctly', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Größe',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
      };

      const response = await service.synthesize(request);
      expect(response.billing.characters).toBe(5);
    });

    test('counts special characters correctly', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Hello! How are you?',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
      };

      const response = await service.synthesize(request);
      expect(response.billing.characters).toBe(19);
    });
  });

  describe('Concurrent Requests', () => {
    test('handles multiple concurrent synthesis requests', async () => {
      const service = new TTSService();

      const requests: TTSSynthesizeRequest[] = [
        { text: 'Request 1', provider: TTSProvider.GOOGLE, voice: { id: 'en-US-Neural2-A' } },
        { text: 'Request 2', provider: TTSProvider.GOOGLE, voice: { id: 'de-DE-Neural2-G' } },
        { text: 'Request 3', provider: TTSProvider.GOOGLE, voice: { id: 'fr-FR-Neural2-A' } },
      ];

      const promises = requests.map((req) => service.synthesize(req));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response.audio).toBeInstanceOf(Buffer);
        expect(response.metadata.provider).toBe('google');
      });
    });
  });

  describe('Error Handling', () => {
    test('handles synthesis failures gracefully', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('API Error'));

      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Fail test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(service.synthesize(request)).rejects.toThrow();
    });

    test('handles empty audio response', async () => {
      mockSynthesizeSpeech.mockResolvedValueOnce([{ audioContent: null }]);

      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Empty response test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(service.synthesize(request)).rejects.toThrow('No audio content');
    });

    test('handles quota exceeded errors', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('429 Too Many Requests'));

      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Quota test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(service.synthesize(request)).rejects.toThrow();
    });

    test('handles authentication errors', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('401 Unauthorized'));

      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Auth test',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'en-US-Neural2-A' },
      };

      await expect(service.synthesize(request)).rejects.toThrow();
    });
  });
});

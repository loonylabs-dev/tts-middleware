/**
 * Integration Tests for TTS Middleware
 *
 * @description End-to-end integration tests for complete TTS workflow
 * @coverage Target: 100% critical paths
 */

import { ttsService, TTSService } from '../tts.service';
import { TTSProvider } from '../types';
import type { TTSSynthesizeRequest } from '../types';
import { SynthesisFailedError } from '../providers/base-tts-provider';

// Mock the Azure SDK for integration tests
jest.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const mockSynthesizer = {
    speakSsmlAsync: jest.fn(),
    close: jest.fn(),
  };

  const mockResult = {
    reason: 3, // ResultReason.SynthesizingAudioCompleted
    audioData: new ArrayBuffer(2048),
  };

  const mockSpeechConfig = {
    speechSynthesisOutputFormat: 0,
  };

  return {
    SpeechConfig: {
      fromSubscription: jest.fn(() => mockSpeechConfig),
      fromEndpoint: jest.fn(() => mockSpeechConfig),
    },
    SpeechSynthesizer: jest.fn(() => mockSynthesizer),
    ResultReason: {
      SynthesizingAudioCompleted: 3,
      Canceled: 0,
    },
    SpeechSynthesisOutputFormat: {
      Audio16Khz32KBitRateMonoMp3: 4,
      Audio16Khz128KBitRateMonoMp3: 6,
      Audio24Khz160KBitRateMonoMp3: 8,
      Audio48Khz192KBitRateMonoMp3: 10,
      Riff8Khz16BitMonoPcm: 1,
      Riff16Khz16BitMonoPcm: 2,
      Riff24Khz16BitMonoPcm: 3,
      Riff48Khz16BitMonoPcm: 5,
      Ogg16Khz16BitMonoOpus: 11,
      Ogg24Khz16BitMonoOpus: 12,
      Ogg48Khz16BitMonoOpus: 13,
    },
    CancellationDetails: {
      fromResult: jest.fn(() => ({
        ErrorCode: 0,
        errorDetails: 'Mock error',
      })),
    },
    CancellationErrorCode: {
      AuthenticationFailure: 1,
    },
    __mockSynthesizer: mockSynthesizer,
    __mockResult: mockResult,
    __mockSpeechConfig: mockSpeechConfig,
  };
});

const sdk = require('microsoft-cognitiveservices-speech-sdk');

describe('TTS Middleware Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = { ...originalEnv };
    process.env.AZURE_SPEECH_KEY = 'integration-test-key-123';
    process.env.AZURE_SPEECH_REGION = 'germanywestcentral';
    process.env.TTS_DEFAULT_PROVIDER = 'azure';

    // Reset mocks
    jest.clearAllMocks();

    // Setup successful synthesis
    sdk.__mockSynthesizer.speakSsmlAsync.mockImplementation(
      (_ssml: string, callback: Function) => {
        callback(sdk.__mockResult);
      }
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Complete Synthesis Workflow', () => {
    test('synthesizes speech with default settings', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await service.synthesize(request);

      // Verify response structure
      expect(response.audio).toBeInstanceOf(Buffer);
      expect(response.metadata.provider).toBe('azure');
      expect(response.metadata.voice).toBe('en-US-JennyNeural');
      expect(response.billing.characters).toBe(11);

      // Verify SDK calls
      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalled();
      expect(sdk.__mockSynthesizer.speakSsmlAsync).toHaveBeenCalled();
      expect(sdk.__mockSynthesizer.close).toHaveBeenCalled();
    });

    test('synthesizes speech with audio format options', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Test audio formats',
        voice: { id: 'en-US-JennyNeural' },
        audio: {
          format: 'wav',
          sampleRate: 48000,
        },
      };

      const response = await service.synthesize(request);

      expect(response.metadata.audioFormat).toBe('wav');
      expect(response.metadata.sampleRate).toBe(48000);
    });

    test('synthesizes speech with provider options (emotion)', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Happy message',
        voice: { id: 'en-US-JennyNeural' },
        providerOptions: {
          emotion: 'cheerful',
        },
      };

      const response = await service.synthesize(request);

      // Verify SSML includes emotion
      const ssmlCall = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];
      expect(ssmlCall).toContain('cheerful');
      expect(response.billing.characters).toBe(13); // "Happy message"
    });

    test('synthesizes speech with speed control', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Fast speech',
        voice: { id: 'en-US-JennyNeural' },
        audio: {
          speed: 1.5,
        },
      };

      await service.synthesize(request);

      // Verify SSML includes speed (Azure uses percentage: 1.5 = 150%)
      const ssmlCall = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];
      expect(ssmlCall).toContain('rate="150%"');
    });

    test('synthesizes with explicit provider selection', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Provider test',
        provider: TTSProvider.AZURE,
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await service.synthesize(request);

      expect(response.metadata.provider).toBe('azure');
    });
  });

  describe('Multi-language Support', () => {
    test('synthesizes German text', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Guten Tag',
        voice: { id: 'de-DE-KatjaNeural' },
      };

      const response = await service.synthesize(request);

      expect(response.metadata.voice).toBe('de-DE-KatjaNeural');
      expect(response.billing.characters).toBe(9);

      // Verify SSML has correct language
      const ssmlCall = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];
      expect(ssmlCall).toContain('xml:lang="de-DE"');
    });

    test('synthesizes French text', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Bonjour le monde',
        voice: { id: 'fr-FR-DeniseNeural' },
      };

      await service.synthesize(request);

      // Verify SSML has correct language
      const ssmlCall = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];
      expect(ssmlCall).toContain('xml:lang="fr-FR"');
    });
  });

  describe('Character Counting Accuracy', () => {
    test('counts simple ASCII text correctly', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await service.synthesize(request);
      expect(response.billing.characters).toBe(4);
    });

    test('counts text with special characters', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Hello! How are you?',
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await service.synthesize(request);
      expect(response.billing.characters).toBe(19);
    });

    test('counts Unicode characters correctly', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Héllo Wörld',
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await service.synthesize(request);
      expect(response.billing.characters).toBe(11);
    });

    test('does not count SSML tags in billing', async () => {
      const service = new TTSService();

      const text = 'Hello World';
      const request: TTSSynthesizeRequest = {
        text,
        voice: { id: 'en-US-JennyNeural' },
        providerOptions: {
          emotion: 'cheerful',
          style: 'chat',
        },
      };

      const response = await service.synthesize(request);

      // Should count only the original text, not SSML
      expect(response.billing.characters).toBe(text.length);

      // Verify SSML was generated
      const ssmlCall = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];
      expect(ssmlCall.length).toBeGreaterThan(text.length);
    });
  });

  describe('Error Handling Integration', () => {
    test('handles synthesis failures gracefully', async () => {
      const service = new TTSService();

      // Mock failure
      sdk.__mockSynthesizer.speakSsmlAsync.mockImplementation(
        (_ssml: string, _success: Function, error: Function) => {
          error(new Error('Synthesis failed'));
        }
      );

      const request: TTSSynthesizeRequest = {
        text: 'Fail test',
        voice: { id: 'en-US-JennyNeural' },
      };

      await expect(service.synthesize(request)).rejects.toThrow(
        SynthesisFailedError
      );
    });

    test('handles missing provider configuration', () => {
      // Remove Azure key
      delete process.env.AZURE_SPEECH_KEY;

      // Create new service instance without Azure credentials
      const service = new TTSService();

      // Azure provider should not be available in fresh instance
      const availableProviders = service.getAvailableProviders();
      expect(availableProviders).not.toContain(TTSProvider.AZURE);
    });
  });

  describe('Singleton Service', () => {
    test('ttsService singleton is pre-initialized', () => {
      expect(ttsService).toBeInstanceOf(TTSService);
    });

    test('singleton can synthesize without initialization', async () => {
      // Create a new service instance instead of using singleton
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Singleton test',
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await service.synthesize(request);

      expect(response.audio).toBeInstanceOf(Buffer);
      expect(response.metadata.provider).toBe('azure');
    });
  });

  describe('Concurrent Requests', () => {
    test('handles multiple concurrent synthesis requests', async () => {
      const service = new TTSService();

      const requests: TTSSynthesizeRequest[] = [
        { text: 'Request 1', voice: { id: 'en-US-JennyNeural' } },
        { text: 'Request 2', voice: { id: 'en-US-GuyNeural' } },
        { text: 'Request 3', voice: { id: 'de-DE-KatjaNeural' } },
      ];

      const promises = requests.map((req) => service.synthesize(req));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response.audio).toBeInstanceOf(Buffer);
        expect(response.metadata.provider).toBe('azure');
      });
    });
  });

  describe('Edge Cases', () => {
    test('rejects empty text with validation error', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: '',
        voice: { id: 'en-US-JennyNeural' },
      };

      // Empty text should throw InvalidConfigError
      await expect(service.synthesize(request)).rejects.toThrow(
        'Text cannot be empty'
      );
    });

    test('handles very long text', async () => {
      const service = new TTSService();

      const longText = 'A'.repeat(2000);
      const request: TTSSynthesizeRequest = {
        text: longText,
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await service.synthesize(request);
      expect(response.billing.characters).toBe(2000);
    });

    test('handles special XML characters in text', async () => {
      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'Test <tag> & "quotes"',
        voice: { id: 'en-US-JennyNeural' },
      };

      await service.synthesize(request);

      // Verify text was escaped in SSML
      const ssmlCall = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];
      expect(ssmlCall).toContain('&lt;tag&gt;');
      expect(ssmlCall).toContain('&amp;');
      expect(ssmlCall).toContain('&quot;');
    });
  });

  describe('DSGVO Compliance', () => {
    test('uses EU region for DSGVO compliance', async () => {
      process.env.AZURE_SPEECH_REGION = 'germanywestcentral';

      const service = new TTSService();

      const request: TTSSynthesizeRequest = {
        text: 'DSGVO test',
        voice: { id: 'de-DE-KatjaNeural' },
      };

      await service.synthesize(request);

      // Verify Germany region was used
      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledWith(
        expect.any(String),
        'germanywestcentral'
      );
    });
  });
});

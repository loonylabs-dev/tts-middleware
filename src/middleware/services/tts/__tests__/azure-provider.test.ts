/**
 * Tests for Azure TTS Provider
 *
 * @description Tests Azure Speech Services provider implementation
 * @coverage Target: 85%
 */

import type { TTSSynthesizeRequest } from '../types';
import { TTSProvider } from '../types';
import { AzureProvider } from '../providers/azure-provider';
import {
  InvalidConfigError,
  InvalidVoiceError,
  SynthesisFailedError,
} from '../providers/base-tts-provider';

// Mock the Azure SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const mockSynthesizer = {
    speakSsmlAsync: jest.fn(),
    close: jest.fn(),
  };

  const mockResult = {
    reason: 3, // ResultReason.SynthesizingAudioCompleted
    audioData: new ArrayBuffer(1024),
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

describe('AzureProvider', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.AZURE_SPEECH_KEY = 'test-key';
    process.env.AZURE_SPEECH_REGION = 'germanywestcentral';
    delete process.env.AZURE_SPEECH_ENDPOINT;

    // Reset mocks
    jest.clearAllMocks();

    // Setup default successful synthesis
    sdk.__mockSynthesizer.speakSsmlAsync.mockImplementation(
      (_ssml: string, callback: Function) => {
        callback(sdk.__mockResult);
      }
    );
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Constructor and Configuration', () => {
    test('initializes with environment variables', () => {
      const provider = new AzureProvider();

      expect(provider.getProviderName()).toBe(TTSProvider.AZURE);
      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledWith(
        'test-key',
        'germanywestcentral'
      );
    });

    test('initializes with provided config', () => {
      new AzureProvider({
        subscriptionKey: 'custom-key',
        region: 'westus',
      });

      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledWith(
        'custom-key',
        'westus'
      );
    });

    test('initializes with custom endpoint', () => {
      const endpoint = 'https://custom.cognitiveservices.azure.com';
      new AzureProvider({
        subscriptionKey: 'test-key',
        region: 'westus',
        endpoint,
      });

      expect(sdk.SpeechConfig.fromEndpoint).toHaveBeenCalled();
    });

    test('throws InvalidConfigError if subscription key missing', () => {
      delete process.env.AZURE_SPEECH_KEY;

      expect(() => new AzureProvider()).toThrow(InvalidConfigError);
      expect(() => new AzureProvider()).toThrow(/subscription key is required/i);
    });

    test('throws InvalidConfigError if region missing', () => {
      delete process.env.AZURE_SPEECH_REGION;

      expect(() => new AzureProvider()).toThrow(InvalidConfigError);
      expect(() => new AzureProvider()).toThrow(/region is required/i);
    });
  });

  describe('Synthesis', () => {
    test('synthesizes text successfully', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await provider.synthesize(
        'Hello World',
        'en-US-JennyNeural',
        request
      );

      expect(response.audio).toBeInstanceOf(Buffer);
      expect(response.audio.length).toBeGreaterThan(0);
      expect(response.metadata.provider).toBe('azure');
      expect(response.metadata.voice).toBe('en-US-JennyNeural');
      expect(response.metadata.audioFormat).toBe('mp3');
      expect(response.metadata.sampleRate).toBe(24000);
      expect(response.billing.characters).toBe(11);
    });

    test('passes SSML to Azure SDK', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'en-US-JennyNeural' },
      };

      await provider.synthesize('Hello World', 'en-US-JennyNeural', request);

      expect(sdk.__mockSynthesizer.speakSsmlAsync).toHaveBeenCalled();

      const ssmlArg = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];
      expect(ssmlArg).toContain('<speak');
      expect(ssmlArg).toContain('en-US-JennyNeural');
      expect(ssmlArg).toContain('Hello World');
    });

    test('validates config before synthesis', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: '',
        voice: { id: 'en-US-JennyNeural' },
      };

      await expect(
        provider.synthesize('', 'en-US-JennyNeural', request)
      ).rejects.toThrow(InvalidConfigError);
    });
  });

  describe('SSML Generation', () => {
    test('generates valid SSML with voice', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'de-DE-KatjaNeural' },
      };

      await provider.synthesize('Hello', 'de-DE-KatjaNeural', request);

      const ssml = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];

      expect(ssml).toContain('<speak version="1.0"');
      expect(ssml).toContain('xml:lang="de-DE"');
      expect(ssml).toContain('<voice name="de-DE-KatjaNeural">');
      expect(ssml).toContain('</voice>');
      expect(ssml).toContain('</speak>');
    });

    test('includes emotion in SSML', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
        providerOptions: {
          emotion: 'cheerful',
        },
      };

      await provider.synthesize('Hello', 'en-US-JennyNeural', request);

      const ssml = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];

      expect(ssml).toContain('<mstts:express-as style="cheerful">');
      expect(ssml).toContain('</mstts:express-as>');
    });

    test('includes style in SSML', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
        providerOptions: {
          style: 'newscast',
        },
      };

      await provider.synthesize('Hello', 'en-US-JennyNeural', request);

      const ssml = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];

      expect(ssml).toContain('<mstts:express-as style="newscast">');
    });

    test('applies speed as prosody rate', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
        audio: {
          speed: 1.5,
        },
      };

      await provider.synthesize('Hello', 'en-US-JennyNeural', request);

      const ssml = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];

      expect(ssml).toContain('<prosody rate="150%">');
      expect(ssml).toContain('</prosody>');
    });

    test('uses medium rate for speed 1.0', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
        audio: {
          speed: 1.0,
        },
      };

      await provider.synthesize('Hello', 'en-US-JennyNeural', request);

      const ssml = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];

      expect(ssml).toContain('<prosody rate="medium">');
    });

    test('escapes XML special characters', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello & "World" <test>',
        voice: { id: 'en-US-JennyNeural' },
      };

      await provider.synthesize(
        'Hello & "World" <test>',
        'en-US-JennyNeural',
        request
      );

      const ssml = sdk.__mockSynthesizer.speakSsmlAsync.mock.calls[0][0];

      expect(ssml).toContain('&amp;');
      expect(ssml).toContain('&quot;');
      expect(ssml).toContain('&lt;');
      expect(ssml).toContain('&gt;');
    });
  });

  describe('Audio Format Handling', () => {
    test('sets MP3 format by default', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
      };

      await provider.synthesize('Hello', 'en-US-JennyNeural', request);

      expect(sdk.__mockSpeechConfig.speechSynthesisOutputFormat).toBeDefined();
    });

    test('sets WAV format when requested', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
        audio: {
          format: 'wav',
        },
      };

      const response = await provider.synthesize(
        'Hello',
        'en-US-JennyNeural',
        request
      );

      expect(response.metadata.audioFormat).toBe('wav');
    });

    test('sets Opus format when requested', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
        audio: {
          format: 'opus',
        },
      };

      const response = await provider.synthesize(
        'Hello',
        'en-US-JennyNeural',
        request
      );

      expect(response.metadata.audioFormat).toBe('opus');
    });

    test('respects sample rate', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
        audio: {
          sampleRate: 48000,
        },
      };

      const response = await provider.synthesize(
        'Hello',
        'en-US-JennyNeural',
        request
      );

      expect(response.metadata.sampleRate).toBe(48000);
    });
  });

  describe('Character Counting', () => {
    test('counts characters without SSML markup', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello World!',
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await provider.synthesize(
        'Hello World!',
        'en-US-JennyNeural',
        request
      );

      // Should count only "Hello World!" (12 chars), not the SSML tags
      expect(response.billing.characters).toBe(12);
    });

    test('counts special characters correctly', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello & "World"',
        voice: { id: 'en-US-JennyNeural' },
      };

      const response = await provider.synthesize(
        'Hello & "World"',
        'en-US-JennyNeural',
        request
      );

      // Should count the original text, not the escaped version
      expect(response.billing.characters).toBe(15);
    });
  });

  describe('Error Handling', () => {
    test('throws InvalidVoiceError on voice not found', async () => {
      sdk.__mockSynthesizer.speakSsmlAsync.mockImplementation(
        (_ssml: string, callback: Function) => {
          callback({
            reason: sdk.ResultReason.Canceled,
          });
        }
      );

      sdk.CancellationDetails.fromResult.mockReturnValue({
        ErrorCode: 0,
        errorDetails: 'voice not found',
      });

      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'invalid-voice' },
      };

      await expect(
        provider.synthesize('Hello', 'invalid-voice', request)
      ).rejects.toThrow(InvalidVoiceError);
    });

    test('throws InvalidConfigError on authentication failure', async () => {
      sdk.__mockSynthesizer.speakSsmlAsync.mockImplementation(
        (_ssml: string, callback: Function) => {
          callback({
            reason: sdk.ResultReason.Canceled,
          });
        }
      );

      sdk.CancellationDetails.fromResult.mockReturnValue({
        ErrorCode: sdk.CancellationErrorCode.AuthenticationFailure,
        errorDetails: 'Invalid subscription key',
      });

      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
      };

      await expect(
        provider.synthesize('Hello', 'en-US-JennyNeural', request)
      ).rejects.toThrow(InvalidConfigError);
    });

    test('throws SynthesisFailedError on unknown cancellation', async () => {
      sdk.__mockSynthesizer.speakSsmlAsync.mockImplementation(
        (_ssml: string, callback: Function) => {
          callback({
            reason: sdk.ResultReason.Canceled,
          });
        }
      );

      sdk.CancellationDetails.fromResult.mockReturnValue({
        ErrorCode: 999,
        errorDetails: 'Unknown error',
      });

      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
      };

      await expect(
        provider.synthesize('Hello', 'en-US-JennyNeural', request)
      ).rejects.toThrow(SynthesisFailedError);
    });

    test('handles SDK errors gracefully', async () => {
      sdk.__mockSynthesizer.speakSsmlAsync.mockImplementation(
        (_ssml: string, _successCallback: Function, errorCallback: Function) => {
          errorCallback('Network timeout');
        }
      );

      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Hello',
        voice: { id: 'en-US-JennyNeural' },
      };

      await expect(
        provider.synthesize('Hello', 'en-US-JennyNeural', request)
      ).rejects.toThrow();
    });
  });

  describe('Response Structure', () => {
    test('returns complete TTSResponse', async () => {
      const provider = new AzureProvider();

      const request: TTSSynthesizeRequest = {
        text: 'Test',
        voice: { id: 'en-US-JennyNeural' },
        audio: {
          format: 'mp3',
          speed: 1.0,
          sampleRate: 24000,
        },
      };

      const response = await provider.synthesize(
        'Test',
        'en-US-JennyNeural',
        request
      );

      // Audio
      expect(response.audio).toBeInstanceOf(Buffer);

      // Metadata
      expect(response.metadata.provider).toBe('azure');
      expect(response.metadata.voice).toBe('en-US-JennyNeural');
      expect(response.metadata.duration).toBeGreaterThanOrEqual(0); // Mock may return instantly (0ms)
      expect(response.metadata.audioFormat).toBe('mp3');
      expect(response.metadata.sampleRate).toBe(24000);

      // Billing
      expect(response.billing.characters).toBe(4);
      expect(response.billing.tokensUsed).toBeUndefined(); // Azure doesn't use tokens
    });
  });
});

/**
 * Tests for Public API Exports
 *
 * @description Tests that all public exports are accessible and correctly typed
 * @coverage Target: 100% (critical for public API)
 */

// Import everything that should be exported
import {
  // Main Service
  TTSService,
  ttsService,
  // Types (Enums)
  TTSProvider,
  TTSErrorCode,
  // Providers
  BaseTTSProvider,
  AzureProvider,
  // Error Classes
  TTSError,
  InvalidConfigError,
  InvalidVoiceError,
  QuotaExceededError,
  ProviderUnavailableError,
  SynthesisFailedError,
  NetworkError,
  // Type Guards
  isAzureOptions,
  isOpenAIOptions,
  isElevenLabsOptions,
  isGoogleCloudOptions,
  isDeepgramOptions,
  // Utilities
  countCharacters,
  countCharactersWithoutSSML,
  validateCharacterCount,
  countBillableCharacters,
  estimateAudioDuration,
  formatCharacterCount,
} from '../../src';

// Type-only imports
import type {
  AudioFormat,
  AudioOptions,
  VoiceConfig,
  TTSSynthesizeRequest,
  TTSResponse,
  TTSResponseMetadata,
  TTSBillingInfo,
  TTSVoice,
  TTSVoiceMetadata,
  AzureProviderOptions,
  OpenAIProviderOptions,
  ElevenLabsProviderOptions,
  GoogleCloudProviderOptions,
  DeepgramProviderOptions,
  ProviderOptions,
} from '../../src';

describe('Public API Exports', () => {
  describe('Main Service Exports', () => {
    test('exports TTSService class', () => {
      expect(TTSService).toBeDefined();
      expect(typeof TTSService).toBe('function');
      expect(TTSService.name).toBe('TTSService');
    });

    test('exports ttsService singleton instance', () => {
      expect(ttsService).toBeDefined();
      expect(ttsService).toBeInstanceOf(TTSService);
    });

    test('ttsService is a singleton', () => {
      const instance1 = ttsService;
      const instance2 = ttsService;
      expect(instance1).toBe(instance2);
    });

    test('can create new TTSService instances', () => {
      const newInstance = new TTSService();
      expect(newInstance).toBeInstanceOf(TTSService);
      expect(newInstance).not.toBe(ttsService);
    });
  });

  describe('Type Exports (Enums)', () => {
    test('exports TTSProvider enum', () => {
      expect(TTSProvider).toBeDefined();
      expect(TTSProvider.AZURE).toBe('azure');
      expect(TTSProvider.OPENAI).toBe('openai');
      expect(TTSProvider.ELEVENLABS).toBe('elevenlabs');
      expect(TTSProvider.GOOGLE).toBe('google');
      expect(TTSProvider.DEEPGRAM).toBe('deepgram');
    });

    test('exports TTSErrorCode enum', () => {
      expect(TTSErrorCode).toBeDefined();
      expect(TTSErrorCode.INVALID_CONFIG).toBe('INVALID_CONFIG');
      expect(TTSErrorCode.INVALID_VOICE).toBe('INVALID_VOICE');
      expect(TTSErrorCode.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
      expect(TTSErrorCode.PROVIDER_UNAVAILABLE).toBe('PROVIDER_UNAVAILABLE');
      expect(TTSErrorCode.SYNTHESIS_FAILED).toBe('SYNTHESIS_FAILED');
      expect(TTSErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });

    test('AudioFormat type is available (type alias)', () => {
      // AudioFormat is a type alias, not an enum, so we test it through usage
      const format: AudioFormat = 'mp3';
      expect(format).toBe('mp3');

      const formats: AudioFormat[] = ['mp3', 'wav', 'opus', 'aac', 'flac'];
      expect(formats).toHaveLength(5);
    });
  });

  describe('Provider Exports', () => {
    test('exports BaseTTSProvider abstract class', () => {
      expect(BaseTTSProvider).toBeDefined();
      expect(typeof BaseTTSProvider).toBe('function');
      expect(BaseTTSProvider.name).toBe('BaseTTSProvider');
    });

    test('exports AzureProvider class', () => {
      expect(AzureProvider).toBeDefined();
      expect(typeof AzureProvider).toBe('function');
      expect(AzureProvider.name).toBe('AzureProvider');
    });

    test('AzureProvider extends BaseTTSProvider', () => {
      // Need to mock environment variables for Azure
      const originalEnv = process.env;
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'germanywestcentral';

      const provider = new AzureProvider();
      expect(provider).toBeInstanceOf(BaseTTSProvider);
      expect(provider).toBeInstanceOf(AzureProvider);

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Error Class Exports', () => {
    test('exports TTSError base class', () => {
      expect(TTSError).toBeDefined();
      expect(typeof TTSError).toBe('function');
      expect(TTSError.name).toBe('TTSError');
    });

    test('exports InvalidConfigError', () => {
      expect(InvalidConfigError).toBeDefined();
      const error = new InvalidConfigError('azure', 'Test error');
      expect(error).toBeInstanceOf(TTSError);
      expect(error).toBeInstanceOf(InvalidConfigError);
    });

    test('exports InvalidVoiceError', () => {
      expect(InvalidVoiceError).toBeDefined();
      const error = new InvalidVoiceError('azure', 'invalid-voice');
      expect(error).toBeInstanceOf(TTSError);
      expect(error).toBeInstanceOf(InvalidVoiceError);
    });

    test('exports QuotaExceededError', () => {
      expect(QuotaExceededError).toBeDefined();
      const error = new QuotaExceededError('azure', 'Quota exceeded');
      expect(error).toBeInstanceOf(TTSError);
      expect(error).toBeInstanceOf(QuotaExceededError);
    });

    test('exports ProviderUnavailableError', () => {
      expect(ProviderUnavailableError).toBeDefined();
      const error = new ProviderUnavailableError('azure', 'Provider unavailable');
      expect(error).toBeInstanceOf(TTSError);
      expect(error).toBeInstanceOf(ProviderUnavailableError);
    });

    test('exports SynthesisFailedError', () => {
      expect(SynthesisFailedError).toBeDefined();
      const error = new SynthesisFailedError('azure', 'Synthesis failed');
      expect(error).toBeInstanceOf(TTSError);
      expect(error).toBeInstanceOf(SynthesisFailedError);
    });

    test('exports NetworkError', () => {
      expect(NetworkError).toBeDefined();
      const error = new NetworkError('azure', 'Network error');
      expect(error).toBeInstanceOf(TTSError);
      expect(error).toBeInstanceOf(NetworkError);
    });
  });

  describe('Type Guard Exports', () => {
    test('exports isAzureOptions', () => {
      expect(isAzureOptions).toBeDefined();
      expect(typeof isAzureOptions).toBe('function');

      const azureOpts: AzureProviderOptions = { emotion: 'cheerful' };
      expect(isAzureOptions(azureOpts)).toBe(true);
      expect(isAzureOptions({})).toBe(false);
      expect(isAzureOptions(null)).toBe(false);
    });

    test('exports isOpenAIOptions', () => {
      expect(isOpenAIOptions).toBeDefined();
      expect(typeof isOpenAIOptions).toBe('function');

      const openaiOpts: OpenAIProviderOptions = { model: 'tts-1' };
      expect(isOpenAIOptions(openaiOpts)).toBe(true);
      expect(isOpenAIOptions({})).toBe(false);
    });

    test('exports isElevenLabsOptions', () => {
      expect(isElevenLabsOptions).toBeDefined();
      expect(typeof isElevenLabsOptions).toBe('function');

      const elevenOpts: ElevenLabsProviderOptions = { stability: 0.5 };
      expect(isElevenLabsOptions(elevenOpts)).toBe(true);
      expect(isElevenLabsOptions({})).toBe(false);
    });

    test('exports isGoogleCloudOptions', () => {
      expect(isGoogleCloudOptions).toBeDefined();
      expect(typeof isGoogleCloudOptions).toBe('function');

      const googleOpts: GoogleCloudProviderOptions = { region: 'eu' };
      expect(isGoogleCloudOptions(googleOpts)).toBe(true);
      expect(isGoogleCloudOptions({})).toBe(false);
    });

    test('exports isDeepgramOptions', () => {
      expect(isDeepgramOptions).toBeDefined();
      expect(typeof isDeepgramOptions).toBe('function');

      const deepgramOpts: DeepgramProviderOptions = { encoding: 'linear16' };
      expect(isDeepgramOptions(deepgramOpts)).toBe(true);
      expect(isDeepgramOptions({})).toBe(false);
    });
  });

  describe('Utility Function Exports', () => {
    test('exports countCharacters', () => {
      expect(countCharacters).toBeDefined();
      expect(typeof countCharacters).toBe('function');
      expect(countCharacters('Hello World')).toBe(11);
    });

    test('exports countCharactersWithoutSSML', () => {
      expect(countCharactersWithoutSSML).toBeDefined();
      expect(typeof countCharactersWithoutSSML).toBe('function');
      expect(countCharactersWithoutSSML('<speak>Hello</speak>')).toBe(5);
    });

    test('exports validateCharacterCount', () => {
      expect(validateCharacterCount).toBeDefined();
      expect(typeof validateCharacterCount).toBe('function');
      expect(validateCharacterCount('Hello', 0, 100)).toBe(true);
    });

    test('exports countBillableCharacters', () => {
      expect(countBillableCharacters).toBeDefined();
      expect(typeof countBillableCharacters).toBe('function');
      expect(countBillableCharacters('Hello World')).toBe(11);
    });

    test('exports estimateAudioDuration', () => {
      expect(estimateAudioDuration).toBeDefined();
      expect(typeof estimateAudioDuration).toBe('function');
      expect(estimateAudioDuration('Hello World')).toBeGreaterThan(0);
    });

    test('exports formatCharacterCount', () => {
      expect(formatCharacterCount).toBeDefined();
      expect(typeof formatCharacterCount).toBe('function');
      expect(formatCharacterCount(1000)).toBe('1.0K chars');
    });
  });

  describe('Type-only Exports (TypeScript)', () => {
    test('AudioOptions type is available', () => {
      const audioOpts: AudioOptions = {
        format: 'mp3',
        speed: 1.0,
        sampleRate: 24000,
      };
      expect(audioOpts.format).toBe('mp3');
    });

    test('VoiceConfig type is available', () => {
      const voiceConfig: VoiceConfig = {
        id: 'en-US-JennyNeural',
      };
      expect(voiceConfig.id).toBe('en-US-JennyNeural');
    });

    test('TTSSynthesizeRequest type is available', () => {
      const request: TTSSynthesizeRequest = {
        text: 'Hello World',
        voice: { id: 'en-US-JennyNeural' },
      };
      expect(request.text).toBe('Hello World');
    });

    test('TTSResponse type is available', () => {
      const response: TTSResponse = {
        audio: Buffer.from('test'),
        metadata: {
          provider: 'azure',
          voice: 'en-US-JennyNeural',
          duration: 1000,
          audioFormat: 'mp3',
          sampleRate: 24000,
        },
        billing: {
          characters: 11,
        },
      };
      expect(response.audio).toBeInstanceOf(Buffer);
    });

    test('TTSResponseMetadata type is available', () => {
      const metadata: TTSResponseMetadata = {
        provider: 'azure',
        voice: 'en-US-JennyNeural',
        duration: 1000,
        audioFormat: 'mp3',
        sampleRate: 24000,
      };
      expect(metadata.provider).toBe('azure');
    });

    test('TTSBillingInfo type is available', () => {
      const billing: TTSBillingInfo = {
        characters: 100,
      };
      expect(billing.characters).toBe(100);
    });

    test('TTSVoice type is available', () => {
      const voice: TTSVoice = {
        id: 'en-US-JennyNeural',
        name: 'Jenny',
        language: 'en-US',
        gender: 'female',
        provider: TTSProvider.AZURE,
      };
      expect(voice.id).toBe('en-US-JennyNeural');
    });

    test('TTSVoiceMetadata type is available', () => {
      const metadata: TTSVoiceMetadata = {
        locale: 'en-US',
        sampleRate: 24000,
        description: 'Jenny Neural Voice',
      };
      expect(metadata.locale).toBe('en-US');
    });

    test('AzureProviderOptions type is available', () => {
      const opts: AzureProviderOptions = {
        emotion: 'cheerful',
        style: 'chat',
        styleDegree: 1.5,
        role: 'Narrator',
      };
      expect(opts.emotion).toBe('cheerful');
    });

    test('OpenAIProviderOptions type is available', () => {
      const opts: OpenAIProviderOptions = {
        model: 'tts-1-hd',
        responseFormat: 'mp3',
      };
      expect(opts.model).toBe('tts-1-hd');
    });

    test('ElevenLabsProviderOptions type is available', () => {
      const opts: ElevenLabsProviderOptions = {
        stability: 0.5,
        similarity_boost: 0.75,
        model_id: 'eleven_multilingual_v2',
      };
      expect(opts.stability).toBe(0.5);
    });

    test('GoogleCloudProviderOptions type is available', () => {
      const opts: GoogleCloudProviderOptions = {
        region: 'eu',
        effectsProfileId: ['headphone-class-device'],
      };
      expect(opts.region).toBe('eu');
    });

    test('DeepgramProviderOptions type is available', () => {
      const opts: DeepgramProviderOptions = {
        encoding: 'linear16',
        container: 'wav',
        bitrate: '128000',
      };
      expect(opts.encoding).toBe('linear16');
    });

    test('ProviderOptions type is available (union type)', () => {
      // ProviderOptions is a union type, so we test it with each provider type
      const azureOpts: ProviderOptions = { emotion: 'cheerful' };
      const openaiOpts: ProviderOptions = { model: 'tts-1' };
      const elevenOpts: ProviderOptions = { stability: 0.5 };

      expect(azureOpts).toBeDefined();
      expect(openaiOpts).toBeDefined();
      expect(elevenOpts).toBeDefined();
    });
  });

  describe('Namespace Imports', () => {
    test('can import all exports as namespace', async () => {
      const TTS = await import('../../src');

      // Services
      expect(TTS.TTSService).toBeDefined();
      expect(TTS.ttsService).toBeDefined();

      // Types
      expect(TTS.TTSProvider).toBeDefined();
      expect(TTS.TTSErrorCode).toBeDefined();

      // Providers
      expect(TTS.BaseTTSProvider).toBeDefined();
      expect(TTS.AzureProvider).toBeDefined();

      // Errors
      expect(TTS.TTSError).toBeDefined();
      expect(TTS.InvalidConfigError).toBeDefined();

      // Type Guards
      expect(TTS.isAzureOptions).toBeDefined();

      // Utilities
      expect(TTS.countCharacters).toBeDefined();
    });
  });

  describe('API Surface Coverage', () => {
    test('all acceptance criteria exports are available', () => {
      // AC6.1: Main service and singleton
      expect(TTSService).toBeDefined();
      expect(ttsService).toBeDefined();

      // AC6.2: All types and type guards
      expect(TTSProvider).toBeDefined();
      expect(TTSErrorCode).toBeDefined();
      expect(isAzureOptions).toBeDefined();
      expect(isOpenAIOptions).toBeDefined();
      expect(isElevenLabsOptions).toBeDefined();
      expect(isGoogleCloudOptions).toBeDefined();
      expect(isDeepgramOptions).toBeDefined();

      // AC6.3: All providers and errors
      expect(BaseTTSProvider).toBeDefined();
      expect(AzureProvider).toBeDefined();
      expect(TTSError).toBeDefined();
      expect(InvalidConfigError).toBeDefined();
      expect(InvalidVoiceError).toBeDefined();
      expect(QuotaExceededError).toBeDefined();
      expect(ProviderUnavailableError).toBeDefined();
      expect(SynthesisFailedError).toBeDefined();
      expect(NetworkError).toBeDefined();

      // AC6.4: All utilities
      expect(countCharacters).toBeDefined();
      expect(countCharactersWithoutSSML).toBeDefined();
      expect(validateCharacterCount).toBeDefined();
      expect(countBillableCharacters).toBeDefined();
      expect(estimateAudioDuration).toBeDefined();
      expect(formatCharacterCount).toBeDefined();
    });
  });
});

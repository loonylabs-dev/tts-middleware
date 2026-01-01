/**
 * TTS Middleware - Public API
 *
 * @description Main entry point for the TTS middleware.
 * Exports all public types, providers, and the main service.
 *
 * @example
 * ```typescript
 * import { ttsService, TTSProvider } from '@loonylabs/tts-middleware';
 *
 * const response = await ttsService.synthesize({
 *   text: "Hello World",
 *   provider: TTSProvider.AZURE,
 *   voice: { id: "en-US-JennyNeural" },
 *   audio: { speed: 1.0, format: "mp3" }
 * });
 * ```
 *
 * @module @loonylabs/tts-middleware
 */

// ===== Main Service =====
export { TTSService, ttsService } from './tts.service';

// ===== Types =====
export {
  TTSProvider,
  TTSErrorCode,
  AudioFormat,
} from './types';

export type {
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
} from './types';

export {
  isAzureOptions,
  isOpenAIOptions,
  isElevenLabsOptions,
  isGoogleCloudOptions,
  isDeepgramOptions,
} from './types';

// ===== Providers =====
export {
  BaseTTSProvider,
  AzureProvider,
} from './providers';

// ===== Errors =====
export {
  TTSError,
  InvalidConfigError,
  InvalidVoiceError,
  QuotaExceededError,
  ProviderUnavailableError,
  SynthesisFailedError,
  NetworkError,
} from './providers';

// ===== Utilities =====
export {
  countCharacters,
  countCharactersWithoutSSML,
  validateCharacterCount,
  countBillableCharacters,
  estimateAudioDuration,
  formatCharacterCount,
} from './utils';

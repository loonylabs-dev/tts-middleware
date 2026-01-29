/**
 * TTS Providers
 *
 * Export all provider classes and error types
 */

// Base provider and errors
export {
  BaseTTSProvider,
  TTSError,
  InvalidConfigError,
  InvalidVoiceError,
  QuotaExceededError,
  ProviderUnavailableError,
  SynthesisFailedError,
  NetworkError,
} from './base-tts-provider';

// Provider implementations
export { AzureProvider } from './azure-provider';
export { EdenAIProvider } from './edenai-provider';
export { GoogleCloudTTSProvider } from './google-cloud-tts-provider';
export type { GoogleCloudTTSRegion, GoogleCloudTTSConfig } from './google-cloud-tts-provider';
export { FishAudioProvider } from './fish-audio-provider';

// Future provider implementations will be exported here:
// export { OpenAIProvider } from './openai-provider';
// export { ElevenLabsProvider } from './elevenlabs-provider';
// export { DeepgramProvider } from './deepgram-provider';

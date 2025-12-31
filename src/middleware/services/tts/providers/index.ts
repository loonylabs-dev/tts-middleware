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

// Provider implementations (MVP)
export { AzureProvider } from './azure-provider';

// Future provider implementations will be exported here:
// export { OpenAIProvider } from './openai-provider';
// export { ElevenLabsProvider } from './elevenlabs-provider';
// export { GoogleProvider } from './google-provider';
// export { DeepgramProvider } from './deepgram-provider';

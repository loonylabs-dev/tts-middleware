/**
 * Provider-specific option types for TTS synthesis
 *
 * These types define all possible provider-specific parameters.
 * All providers are typed NOW (MVP + Future) to prevent breaking API changes.
 *
 * @MVP ✅ Azure options are implemented
 * @Future 🔮 Other providers typed but not implemented yet
 */

/**
 * Azure Speech Services provider options
 *
 * @MVP ✅ Implemented
 * @provider Azure Speech Services
 *
 * @see https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice
 */
export interface AzureProviderOptions {
  /**
   * Emotional tone of the speech
   * @MVP ✅ Implemented
   *
   * @description Maps to SSML style attribute. Only supported by
   * specific Azure neural voices (e.g., Jenny, Guy, Aria).
   *
   * @options 'sad', 'angry', 'cheerful', 'friendly', 'terrified',
   *          'shouting', 'whispering', 'hopeful', 'gentle', 'excited',
   *          'empathetic', 'calm', 'fearful', 'disgruntled', 'serious',
   *          'depressed', 'embarrassed'
   *
   * @example 'cheerful'
   */
  emotion?:
    | 'sad'
    | 'angry'
    | 'cheerful'
    | 'friendly'
    | 'terrified'
    | 'shouting'
    | 'whispering'
    | 'hopeful'
    | 'gentle'
    | 'excited'
    | 'empathetic'
    | 'calm'
    | 'fearful'
    | 'disgruntled'
    | 'serious'
    | 'depressed'
    | 'embarrassed';

  /**
   * Speaking style for the voice
   * @MVP ✅ Implemented
   *
   * @description Maps to SSML style attribute. Voice-dependent feature.
   *
   * @options 'chat', 'customerservice', 'newscast', 'assistant',
   *          'newscast-casual', 'newscast-formal', 'chat-casual',
   *          'lyrical', 'advertisement-upbeat', 'narration-professional',
   *          'narration-relaxed', 'sports-commentary',
   *          'sports-commentary-excited'
   *
   * @example 'chat'
   */
  style?:
    | 'chat'
    | 'customerservice'
    | 'newscast'
    | 'assistant'
    | 'newscast-casual'
    | 'newscast-formal'
    | 'chat-casual'
    | 'lyrical'
    | 'advertisement-upbeat'
    | 'narration-professional'
    | 'narration-relaxed'
    | 'sports-commentary'
    | 'sports-commentary-excited';

  /**
   * Style intensity/degree (0.01 to 2.0)
   * @Future 🔮 Not implemented in MVP
   *
   * @range 0.01 - 2.0
   * @default 1.0
   */
  styleDegree?: number;

  /**
   * Role play scenario
   * @Future 🔮 Not implemented in MVP
   *
   * @options 'YoungAdultFemale', 'YoungAdultMale', 'OlderAdultFemale', 'OlderAdultMale', 'Girl', 'Boy'
   */
  role?: string;
}

/**
 * OpenAI TTS provider options
 *
 * @Future 🔮 Not implemented in MVP
 * @provider OpenAI TTS API
 *
 * @see https://platform.openai.com/docs/guides/text-to-speech
 */
export interface OpenAIProviderOptions {
  /**
   * TTS model to use
   * @Future 🔮 Not implemented in MVP
   *
   * @options
   * - 'tts-1': Standard quality, lower latency
   * - 'tts-1-hd': High quality, higher latency
   * - 'gpt-4o-mini-tts': Token-based model
   *
   * @default 'tts-1'
   */
  model?: 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';

  /**
   * Response format override
   * @Future 🔮 Not implemented in MVP
   *
   * @description If not specified, uses the format from audio.format
   *
   * @options 'mp3', 'opus', 'aac', 'flac'
   * @default 'mp3'
   */
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
}

/**
 * ElevenLabs TTS provider options
 *
 * @Future 🔮 Not implemented in MVP
 * @provider ElevenLabs TTS API
 *
 * @see https://elevenlabs.io/docs/api-reference/text-to-speech
 */
export interface ElevenLabsProviderOptions {
  /**
   * Voice model ID
   * @Future 🔮 Not implemented in MVP
   *
   * @options
   * - 'eleven_monolingual_v1': English only, lower latency
   * - 'eleven_multilingual_v1': Multiple languages
   * - 'eleven_multilingual_v2': Latest multilingual model
   * - 'eleven_turbo_v2': Fastest, lower quality
   *
   * @default 'eleven_multilingual_v2'
   */
  model_id?: string;

  /**
   * Voice stability (0.0 - 1.0)
   * @Future 🔮 Not implemented in MVP
   *
   * @description Higher values = more stable/consistent, less expressive
   * Lower values = more variable/expressive
   *
   * @range 0.0 - 1.0
   * @default 0.5
   */
  stability?: number;

  /**
   * Similarity boost (0.0 - 1.0)
   * @Future 🔮 Not implemented in MVP
   *
   * @description Higher values = more similar to original voice sample
   *
   * @range 0.0 - 1.0
   * @default 0.75
   */
  similarity_boost?: number;

  /**
   * Enable speaker boost
   * @Future 🔮 Not implemented in MVP
   *
   * @description Enhances voice clarity and reduces artifacts
   *
   * @default true
   */
  speaker_boost?: boolean;

  /**
   * Style exaggeration (0.0 - 1.0)
   * @Future 🔮 Not implemented in MVP
   *
   * @description Higher values = more exaggerated style (different from Azure style!)
   *
   * @range 0.0 - 1.0
   * @default 0.0
   */
  style?: number;

  /**
   * Use speaker boost (legacy parameter)
   * @Future 🔮 Not implemented in MVP
   * @deprecated Use speaker_boost instead
   */
  use_speaker_boost?: boolean;
}

/**
 * Google Cloud Text-to-Speech provider options
 *
 * @Future 🔮 Not implemented in MVP
 * @provider Google Cloud TTS
 *
 * @see https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
 */
export interface GoogleCloudProviderOptions {
  /**
   * Audio effects profile IDs
   * @Future 🔮 Not implemented in MVP
   *
   * @description Array of audio effect profile IDs to apply
   *
   * @options
   * - 'wearable-class-device'
   * - 'handset-class-device'
   * - 'headphone-class-device'
   * - 'small-bluetooth-speaker-class-device'
   * - 'medium-bluetooth-speaker-class-device'
   * - 'large-home-entertainment-class-device'
   * - 'large-automotive-class-device'
   * - 'telephony-class-application'
   *
   * @example ['headphone-class-device']
   */
  effectsProfileId?: string[];

  /**
   * Pitch adjustment in semitones
   * @Future 🔮 Not implemented in MVP
   *
   * @description Overrides the pitch parameter in AudioOptions if both are specified
   *
   * @range -20.0 to 20.0
   * @default 0.0
   */
  pitchSemitones?: number;

  /**
   * Speaking rate multiplier
   * @Future 🔮 Not implemented in MVP
   *
   * @description Alternative to speed in AudioOptions
   *
   * @range 0.25 - 4.0
   * @default 1.0
   */
  speakingRate?: number;

  /**
   * Volume gain in dB
   * @Future 🔮 Not implemented in MVP
   *
   * @description Alternative to volumeGainDb in AudioOptions
   *
   * @range -96.0 to 16.0
   * @default 0.0
   */
  volumeGainDb?: number;
}

/**
 * Deepgram TTS provider options
 *
 * @Future 🔮 Not implemented in MVP
 * @provider Deepgram TTS API
 *
 * @see https://developers.deepgram.com/docs/tts-rest
 */
export interface DeepgramProviderOptions {
  /**
   * TTS model to use
   * @Future 🔮 Not implemented in MVP
   *
   * @options
   * - 'aura-asteria-en': Female, US English
   * - 'aura-luna-en': Female, US English
   * - 'aura-stella-en': Female, US English
   * - 'aura-athena-en': Female, UK English
   * - 'aura-hera-en': Female, US English
   * - 'aura-orion-en': Male, US English
   * - 'aura-arcas-en': Male, US English
   * - 'aura-perseus-en': Male, US English
   * - 'aura-angus-en': Male, Irish English
   * - 'aura-orpheus-en': Male, US English
   * - 'aura-helios-en': Male, UK English
   * - 'aura-zeus-en': Male, US English
   *
   * @default 'aura-asteria-en'
   */
  model?: string;

  /**
   * Audio encoding format
   * @Future 🔮 Not implemented in MVP
   *
   * @description Alternative to format in AudioOptions
   *
   * @options 'linear16', 'mulaw', 'alaw', 'opus', 'aac', 'mp3'
   * @default 'linear16'
   */
  encoding?: 'linear16' | 'mulaw' | 'alaw' | 'opus' | 'aac' | 'mp3';

  /**
   * Audio container format
   * @Future 🔮 Not implemented in MVP
   *
   * @options 'wav', 'mp3', 'opus', 'flac'
   * @default 'wav'
   */
  container?: 'wav' | 'mp3' | 'opus' | 'flac';

  /**
   * Bitrate for encoded audio
   * @Future 🔮 Not implemented in MVP
   *
   * @example '128000' (128 kbps)
   */
  bitrate?: string;

  /**
   * Sample rate in Hz
   * @Future 🔮 Not implemented in MVP
   *
   * @description Alternative to sampleRate in AudioOptions
   *
   * @options 8000, 16000, 24000, 48000
   * @default 24000
   */
  sampleRate?: number;
}

/**
 * EdenAI TTS provider options
 *
 * @description EdenAI is a multi-provider aggregator that provides access
 * to multiple TTS providers through a single API.
 *
 * @provider EdenAI (multi-provider aggregator)
 *
 * @see https://docs.edenai.co/reference/text_to_speech_create
 */
export interface EdenAIProviderOptions {
  /**
   * Underlying provider to use via EdenAI
   *
   * @description EdenAI acts as an aggregator, routing requests to the selected provider.
   *
   * @options
   * - 'amazon': Amazon Polly
   * - 'google': Google Cloud TTS
   * - 'ibm': IBM Watson TTS
   * - 'microsoft': Microsoft Azure Speech
   * - 'openai': OpenAI TTS
   * - 'elevenlabs': ElevenLabs TTS
   *
   * @default Auto-selected by EdenAI based on language/voice
   */
  provider?:
    | 'amazon'
    | 'google'
    | 'ibm'
    | 'microsoft'
    | 'openai'
    | 'elevenlabs';

  /**
   * Speaking rate multiplier
   *
   * @description Controls the speed of speech synthesis
   *
   * @range 0.25 - 4.0
   * @default 1.0
   */
  speaking_rate?: number;

  /**
   * Pitch adjustment in semitones
   *
   * @description Adjusts the pitch of the synthesized voice
   *
   * @range -20.0 to 20.0
   * @default 0.0
   */
  speaking_pitch?: number;

  /**
   * Volume adjustment in decibels
   *
   * @description Adjusts the volume of the synthesized speech
   *
   * @range -96.0 to 16.0
   * @default 0.0
   */
  speaking_volume?: number;

  /**
   * Audio format override
   *
   * @description If not specified, uses the format from audio.format
   *
   * @options 'mp3', 'wav', 'ogg', 'flac'
   * @default 'mp3'
   */
  audio_format?: 'mp3' | 'wav' | 'ogg' | 'flac';

  /**
   * Sample rate in Hz
   *
   * @description If not specified, uses the sampleRate from audio options
   *
   * @options 8000, 16000, 22050, 24000, 44100, 48000
   * @default 24000
   */
  sampling_rate?: number;

  /**
   * Fallback providers
   *
   * @description List of provider names to use as fallbacks if the primary provider fails
   *
   * @example ['google', 'amazon', 'microsoft']
   */
  fallback_providers?: string[];

  /**
   * Webhook URL for async notifications
   *
   * @description URL to receive notifications when synthesis completes (for async requests)
   */
  webhook_url?: string;

  /**
   * Webhook receiver identifier
   *
   * @description Identifier for the webhook receiver
   */
  webhook_receiver?: string;
}

/**
 * Union type of all provider options
 *
 * @description Use this type when you need to accept any provider options
 */
export type ProviderOptions =
  | AzureProviderOptions
  | OpenAIProviderOptions
  | ElevenLabsProviderOptions
  | GoogleCloudProviderOptions
  | DeepgramProviderOptions
  | EdenAIProviderOptions;

/**
 * Type guard to check if options are for Azure
 */
export function isAzureOptions(
  options: unknown
): options is AzureProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    ('emotion' in options || 'style' in options)
  );
}

/**
 * Type guard to check if options are for OpenAI
 */
export function isOpenAIOptions(
  options: unknown
): options is OpenAIProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    'model' in options &&
    typeof (options as { model: unknown }).model === 'string'
  );
}

/**
 * Type guard to check if options are for ElevenLabs
 */
export function isElevenLabsOptions(
  options: unknown
): options is ElevenLabsProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    ('stability' in options || 'similarity_boost' in options)
  );
}

/**
 * Type guard to check if options are for Google Cloud
 */
export function isGoogleCloudOptions(
  options: unknown
): options is GoogleCloudProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    ('effectsProfileId' in options || 'pitchSemitones' in options)
  );
}

/**
 * Type guard to check if options are for Deepgram
 */
export function isDeepgramOptions(
  options: unknown
): options is DeepgramProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    ('encoding' in options || 'container' in options)
  );
}

/**
 * Type guard to check if options are for EdenAI
 */
export function isEdenAIOptions(
  options: unknown
): options is EdenAIProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    ('speaking_rate' in options ||
      'speaking_pitch' in options ||
      'speaking_volume' in options ||
      'fallback_providers' in options ||
      'webhook_url' in options)
  );
}

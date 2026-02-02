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
 * Supported Google Cloud TTS regions for EU data residency
 *
 * @description Use EU regions for GDPR/CDPA compliance with data residency guarantees.
 * The 'eu' region uses the EU multi-region endpoint (eu-texttospeech.googleapis.com).
 *
 * @see https://cloud.google.com/text-to-speech/docs/endpoints
 */
export type GoogleCloudTTSRegion =
  | 'eu' // EU multi-region endpoint (recommended for DSGVO)
  | 'europe-west1' // Belgium
  | 'europe-west2' // London, UK
  | 'europe-west3' // Frankfurt, Germany (recommended for DACH)
  | 'europe-west4' // Netherlands
  | 'europe-west6' // Zurich, Switzerland
  | 'europe-west9' // Paris, France
  | 'us-central1' // Iowa (NOT EU-compliant)
  | 'global'; // Global endpoint (no data residency guarantee)

/**
 * Google Cloud Text-to-Speech provider options
 *
 * @provider Google Cloud TTS
 * @description Direct Google Cloud TTS integration with EU-regional endpoint support
 * for GDPR/CDPA compliance. Uses Service Account authentication.
 *
 * @see https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
 */
export interface GoogleCloudTTSProviderOptions {
  /**
   * Region for data residency (EU-compliance)
   *
   * @description Use 'eu' or specific EU regions (europe-west3, etc.) for DSGVO compliance.
   * Data will be processed in the specified region without leaving it.
   *
   * @env GOOGLE_TTS_REGION
   * @default 'eu' (EU multi-region endpoint)
   *
   * @example 'eu' - EU multi-region (recommended)
   * @example 'europe-west3' - Frankfurt, Germany
   */
  region?: GoogleCloudTTSRegion;

  /**
   * Audio effects profile IDs
   *
   * @description Array of audio effect profile IDs to apply.
   * These optimize the audio for specific playback devices.
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
   *
   * @description Overrides the pitch parameter in AudioOptions if both are specified
   *
   * @range -20.0 to 20.0
   * @default 0.0
   */
  pitchSemitones?: number;

  /**
   * Speaking rate multiplier
   *
   * @description Alternative to speed in AudioOptions
   *
   * @range 0.25 - 4.0
   * @default 1.0
   */
  speakingRate?: number;

  /**
   * Volume gain in dB
   *
   * @description Alternative to volumeGainDb in AudioOptions
   *
   * @range -96.0 to 16.0
   * @default 0.0
   */
  volumeGainDb?: number;
}

/**
 * @deprecated Use GoogleCloudTTSProviderOptions instead
 */
export type GoogleCloudProviderOptions = GoogleCloudTTSProviderOptions;

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
   * Model/quality tier to use (legacy)
   *
   * @description Provider-specific model selection (e.g., 'Neural', 'Standard', 'Wavenet')
   * @deprecated Use `settings` instead for provider-specific voice/model selection
   *
   * @example 'Neural'
   */
  model?: string;

  /**
   * Provider-specific settings for model/voice selection
   *
   * @description Object mapping provider names to their model/voice IDs.
   * This is the correct way to specify OpenAI voices via EdenAI.
   *
   * @example { "openai": "de_nova" }
   * @example { "google": "Neural" }
   */
  settings?: Record<string, string>;

  /**
   * Voice option/gender
   *
   * @description Voice selection for EdenAI. Common values: 'FEMALE', 'MALE', or provider-specific voice IDs.
   * If not specified and voice.id is just a language code, defaults to 'FEMALE'.
   *
   * @example 'FEMALE'
   */
  option?: string;

  /**
   * Specific voice ID for the underlying provider
   *
   * @description Passed as top-level `voice_id` to EdenAI API for provider-specific voice selection.
   * Useful for providers like ElevenLabs where `option` only supports MALE/FEMALE.
   *
   * @example 'Aria' (ElevenLabs)
   * @example 'Roger' (ElevenLabs)
   */
  voice_id?: string;

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
 * Fish Audio TTS provider options
 *
 * @provider Fish Audio TTS API
 * @description Fish Audio S1 model with 13 language support and 64+ emotional expressions.
 * Test/Admin only – no EU data residency guarantees.
 *
 * @see https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech
 */
export interface FishAudioProviderOptions {
  /**
   * TTS model to use
   *
   * @options
   * - 's1': Fish Audio S1 (flagship, 4B params, recommended)
   * - 'speech-1.6': Previous generation, production-tested
   * - 'speech-1.5': Legacy, lower resource demands
   *
   * @default 's1'
   */
  model?: 's1' | 'speech-1.6' | 'speech-1.5';

  /**
   * Voice model reference ID from Fish Audio library
   *
   * @description Use a model ID from the Fish Audio voice library or a custom cloned voice.
   * If not set, uses the default Fish Audio voice.
   *
   * @example '8ef4a238714b45718ce04243307c57a7' (E-girl)
   * @example '802e3bc2b27e49c2995d23ef70e6ac89' (Energetic Male)
   */
  referenceId?: string;

  /**
   * Controls expressiveness of the speech
   *
   * @range 0 - 1
   * @default 0.7
   */
  temperature?: number;

  /**
   * Controls diversity via nucleus sampling
   *
   * @range 0 - 1
   * @default 0.7
   */
  topP?: number;

  /**
   * Reduces repeated patterns in output
   *
   * @default 1.2
   */
  repetitionPenalty?: number;

  /**
   * Latency mode
   *
   * @options 'low', 'normal', 'balanced'
   * @default 'normal'
   */
  latency?: 'low' | 'normal' | 'balanced';

  /**
   * Characters per processing chunk
   *
   * @range 100 - 300
   * @default 300
   */
  chunkLength?: number;

  /**
   * Whether to normalize text (improves stability for numbers)
   *
   * @default true
   */
  normalize?: boolean;

  /**
   * MP3 bitrate in kbps (only for mp3 format)
   *
   * @options 64, 128, 192
   * @default 128
   */
  mp3Bitrate?: 64 | 128 | 192;

  /**
   * Opus bitrate in bps (only for opus format)
   *
   * @options -1000 (auto), 24, 32, 48, 64
   * @default -1000
   */
  opusBitrate?: -1000 | 24 | 32 | 48 | 64;
}

/**
 * Inworld AI TTS provider options
 *
 * @provider Inworld AI TTS API
 * @description Inworld TTS 1.5 models with 15 language support and voice cloning.
 * Test/Admin only – no EU data residency guarantees.
 *
 * @see https://docs.inworld.ai/docs/tts/tts
 */
export interface InworldProviderOptions {
  /**
   * TTS model to use
   *
   * @options
   * - 'inworld-tts-1.5-max': Rich, expressive, ~200ms latency ($10/1M chars)
   * - 'inworld-tts-1.5-mini': Ultra-low latency ~120ms ($5/1M chars)
   *
   * @default 'inworld-tts-1.5-max'
   */
  modelId?: 'inworld-tts-1.5-max' | 'inworld-tts-1.5-mini';

  /**
   * Controls randomness when sampling audio tokens
   *
   * @range 0 (exclusive) to 2 (inclusive)
   * @default 1.1
   */
  temperature?: number;

  /**
   * Speaking rate multiplier
   *
   * @range 0.5 - 1.5
   * @default 1.0
   */
  speakingRate?: number;

  /**
   * Audio encoding format
   *
   * @options 'LINEAR16', 'MP3', 'OGG_OPUS', 'ALAW', 'MULAW', 'FLAC'
   * @default 'MP3'
   */
  audioEncoding?: 'LINEAR16' | 'MP3' | 'OGG_OPUS' | 'ALAW' | 'MULAW' | 'FLAC';

  /**
   * Bitrate in bits per second for compressed formats
   *
   * @default 128000
   */
  bitRate?: number;

  /**
   * Timestamp alignment type
   *
   * @options 'TIMESTAMP_TYPE_UNSPECIFIED', 'WORD', 'CHARACTER'
   * @default 'TIMESTAMP_TYPE_UNSPECIFIED'
   */
  timestampType?: 'TIMESTAMP_TYPE_UNSPECIFIED' | 'WORD' | 'CHARACTER';

  /**
   * Text normalization control
   *
   * @options 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED', 'ON', 'OFF'
   * @default 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED'
   */
  applyTextNormalization?: 'APPLY_TEXT_NORMALIZATION_UNSPECIFIED' | 'ON' | 'OFF';
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
  | GoogleCloudTTSProviderOptions
  | DeepgramProviderOptions
  | EdenAIProviderOptions
  | FishAudioProviderOptions
  | InworldProviderOptions;

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
 * Type guard to check if options are for Google Cloud TTS
 */
export function isGoogleCloudTTSOptions(
  options: unknown
): options is GoogleCloudTTSProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    ('effectsProfileId' in options || 'pitchSemitones' in options || 'region' in options)
  );
}

/**
 * @deprecated Use isGoogleCloudTTSOptions instead
 */
export const isGoogleCloudOptions = isGoogleCloudTTSOptions;

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

/**
 * Type guard to check if options are for Fish Audio
 */
export function isFishAudioOptions(
  options: unknown
): options is FishAudioProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    ('referenceId' in options ||
      'temperature' in options ||
      'topP' in options ||
      'repetitionPenalty' in options ||
      'chunkLength' in options)
  );
}

/**
 * Type guard to check if options are for Inworld AI
 */
export function isInworldOptions(
  options: unknown
): options is InworldProviderOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    ('modelId' in options ||
      'speakingRate' in options ||
      'timestampType' in options ||
      'applyTextNormalization' in options ||
      'audioEncoding' in options)
  );
}

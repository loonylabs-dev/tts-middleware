/**
 * Google Cloud Text-to-Speech Provider
 *
 * @description Provider for Google Cloud TTS API with EU-regional endpoint support.
 * Uses Service Account authentication for CDPA/GDPR compliant TTS usage with EU hosting.
 *
 * Key features:
 * - Supports regional endpoints (e.g., europe-west3 for Frankfurt)
 * - Service Account JSON for authentication (via GOOGLE_APPLICATION_CREDENTIALS)
 * - Zero Data Retention (no persistent storage of text or audio)
 * - Neural2, WaveNet, Standard, and Studio voice support
 *
 * @see https://cloud.google.com/text-to-speech/docs
 */

import type { TextToSpeechClient } from '@google-cloud/text-to-speech';
import type { TTSSynthesizeRequest, TTSResponse, AudioFormat } from '../types';
import { TTSProvider } from '../types';
import { getMp3Duration } from '../utils/mp3-duration.utils';
import {
  BaseTTSProvider,
  InvalidConfigError,
  SynthesisFailedError,
} from './base-tts-provider';
import type { GoogleCloudTTSProviderOptions } from '../types/provider-options.types';

/**
 * Supported Google Cloud TTS regions for EU data residency
 *
 * @see https://cloud.google.com/text-to-speech/docs/endpoints
 */
export type GoogleCloudTTSRegion =
  | 'eu' // EU multi-region endpoint (eu-texttospeech.googleapis.com)
  | 'europe-west1' // Belgium
  | 'europe-west2' // London, UK
  | 'europe-west3' // Frankfurt, Germany (recommended for DACH)
  | 'europe-west4' // Netherlands
  | 'europe-west6' // Zurich, Switzerland
  | 'europe-west9' // Paris, France
  | 'us-central1' // Iowa (default, NOT EU-compliant)
  | 'global'; // Global endpoint (no data residency guarantee)

/**
 * Google Cloud TTS provider configuration
 */
export interface GoogleCloudTTSConfig {
  /**
   * Google Cloud Project ID
   * @env GOOGLE_CLOUD_PROJECT
   */
  projectId?: string;

  /**
   * Region for data residency (EU-compliance)
   * @env GOOGLE_TTS_REGION
   * @default 'eu' (EU multi-region endpoint)
   */
  region?: GoogleCloudTTSRegion;

  /**
   * Path to Service Account JSON file
   * @env GOOGLE_APPLICATION_CREDENTIALS
   */
  keyFilename?: string;

  /**
   * Service Account credentials as JSON object (for programmatic use)
   */
  credentials?: {
    client_email: string;
    private_key: string;
    project_id?: string;
  };
}

/**
 * Google Cloud TTS audio encoding types
 */
type GoogleAudioEncoding = 'MP3' | 'LINEAR16' | 'OGG_OPUS' | 'MULAW' | 'ALAW';

/**
 * Google Cloud TTS audio encoding mapping
 */
const AUDIO_ENCODING_MAP: Record<AudioFormat, GoogleAudioEncoding> = {
  mp3: 'MP3',
  wav: 'LINEAR16',
  opus: 'OGG_OPUS',
  aac: 'MP3', // Fallback to MP3 (AAC not directly supported)
  flac: 'LINEAR16', // Fallback to LINEAR16
};

/**
 * Google Cloud TTS Provider
 *
 * @description Provides TTS synthesis using Google Cloud Text-to-Speech API
 * with EU-regional endpoint support for GDPR/CDPA compliance.
 *
 * @example
 * ```typescript
 * const provider = new GoogleCloudTTSProvider({
 *   region: 'eu', // Use EU endpoint for DSGVO compliance
 * });
 *
 * const response = await provider.synthesize(
 *   "Hallo Welt",
 *   "de-DE-Neural2-C",
 *   {
 *     text: "Hallo Welt",
 *     voice: { id: "de-DE-Neural2-C" },
 *     audio: { format: "mp3" }
 *   }
 * );
 * ```
 */
export class GoogleCloudTTSProvider extends BaseTTSProvider {
  private config: GoogleCloudTTSConfig;
  /**
   * Client cache per region - allows runtime region override via providerOptions
   * Key: region string (e.g., 'eu', 'europe-west3')
   * Value: TextToSpeechClient instance for that region
   */
  private clientsByRegion: Map<string, TextToSpeechClient> = new Map();

  /**
   * Creates a new Google Cloud TTS provider
   *
   * @param config - Optional configuration (uses env vars if not provided)
   * @throws {InvalidConfigError} If credentials are missing
   */
  constructor(config?: Partial<GoogleCloudTTSConfig>) {
    super(TTSProvider.GOOGLE);

    // Load configuration from environment or provided config
    this.config = {
      projectId: config?.projectId || process.env.GOOGLE_CLOUD_PROJECT,
      region:
        (config?.region as GoogleCloudTTSRegion) ||
        (process.env.GOOGLE_TTS_REGION as GoogleCloudTTSRegion) ||
        'eu', // Default to EU endpoint for DSGVO compliance
      keyFilename:
        config?.keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS,
      credentials: config?.credentials,
    };

    // Validate configuration
    this.validateGoogleConfig();

    // Log region compliance warning if not EU
    if (this.config.region === 'global' || this.config.region === 'us-central1') {
      this.log('warn', 'Using non-EU region - no EU data residency guarantee', {
        region: this.config.region,
      });
    }

    this.log('info', 'Google Cloud TTS provider initialized', {
      projectId: this.config.projectId ? '***' : undefined,
      region: this.config.region,
      hasCredentials: !!(this.config.keyFilename || this.config.credentials),
    });
  }

  /**
   * Validate Google Cloud TTS configuration
   *
   * @private
   * @throws {InvalidConfigError} If configuration is invalid
   */
  private validateGoogleConfig(): void {
    // Check for credentials
    if (!this.config.keyFilename && !this.config.credentials) {
      throw new InvalidConfigError(
        this.providerName,
        'Google Cloud credentials are required. Set GOOGLE_APPLICATION_CREDENTIALS environment variable ' +
          'or provide credentials in config.'
      );
    }
  }

  /**
   * Get the API endpoint for a specific region
   *
   * @private
   * @param region - The region to get the endpoint for
   * @returns API endpoint URL
   */
  private getApiEndpoint(region: GoogleCloudTTSRegion): string {
    switch (region) {
      case 'eu':
        return 'eu-texttospeech.googleapis.com';
      case 'global':
      case 'us-central1':
        return 'texttospeech.googleapis.com';
      default:
        // Regional endpoints follow the pattern: {region}-texttospeech.googleapis.com
        return `${region}-texttospeech.googleapis.com`;
    }
  }

  /**
   * Get or create a Google Cloud TTS client for the specified region
   *
   * @private
   * @param region - Optional region override (uses config.region if not specified)
   * @returns Initialized TextToSpeechClient for the region
   *
   * @description Clients are cached per region to allow runtime region override
   * via providerOptions while avoiding client recreation overhead.
   */
  private async getClient(region?: GoogleCloudTTSRegion): Promise<TextToSpeechClient> {
    // Use provided region or fall back to config region
    const effectiveRegion = region || this.config.region || 'eu';

    // Check cache first
    const cachedClient = this.clientsByRegion.get(effectiveRegion);
    if (cachedClient) {
      return cachedClient;
    }

    // Dynamic import to avoid loading SDK if not used
    const { TextToSpeechClient } = await import('@google-cloud/text-to-speech');

    // Get endpoint for the specified region
    const apiEndpoint = this.getApiEndpoint(effectiveRegion);

    const clientOptions: {
      apiEndpoint: string;
      projectId?: string;
      keyFilename?: string;
      credentials?: { client_email: string; private_key: string };
    } = {
      apiEndpoint,
    };

    if (this.config.projectId) {
      clientOptions.projectId = this.config.projectId;
    }

    if (this.config.keyFilename) {
      clientOptions.keyFilename = this.config.keyFilename;
    } else if (this.config.credentials) {
      clientOptions.credentials = this.config.credentials;
    }

    const client = new TextToSpeechClient(clientOptions);

    // Cache the client for this region
    this.clientsByRegion.set(effectiveRegion, client);

    this.log('debug', 'Google Cloud TTS client initialized', {
      region: effectiveRegion,
      apiEndpoint,
    });

    return client;
  }

  /**
   * Synthesize text to speech using Google Cloud TTS
   *
   * @param text - The input text to synthesize
   * @param voiceId - The voice identifier (e.g., "de-DE-Neural2-C")
   * @param request - The full synthesis request with options
   * @returns Promise resolving to the synthesis response
   * @throws {InvalidConfigError} If configuration is invalid
   * @throws {SynthesisFailedError} If synthesis fails
   */
  async synthesize(
    text: string,
    voiceId: string,
    request: TTSSynthesizeRequest
  ): Promise<TTSResponse> {
    // Validate configuration
    this.validateConfig(request);

    const startTime = Date.now();

    // Extract options including region override
    const options = (request.providerOptions || {}) as GoogleCloudTTSProviderOptions;

    // Use region from providerOptions if specified, otherwise use config default
    const effectiveRegion = options.region || this.config.region || 'eu';

    this.log('debug', 'Synthesizing with Google Cloud TTS', {
      voiceId,
      textLength: text.length,
      region: effectiveRegion,
      regionSource: options.region ? 'providerOptions' : 'config',
    });

    try {
      // Get client for the specified region
      const client = await this.getClient(effectiveRegion);

      // Parse voice ID to extract language code and voice name
      const { languageCode, voiceName } = this.parseVoiceId(voiceId);

      // Build the synthesis request
      const synthesisRequest = this.buildSynthesisRequest(
        text,
        languageCode,
        voiceName,
        request,
        options
      );

      // Call Google Cloud TTS API
      const result = await client.synthesizeSpeech(synthesisRequest);
      const response = result[0];

      if (!response.audioContent) {
        throw new SynthesisFailedError(
          this.providerName,
          'No audio content in Google Cloud TTS response'
        );
      }

      // Convert audio content to Buffer
      const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Count billable characters
      const characters = this.countCharacters(text);

      this.log('info', 'Synthesis successful', {
        voiceId,
        characters,
        duration,
        audioSize: audioBuffer.length,
      });

      // Return response
      return {
        audio: audioBuffer,
        metadata: {
          provider: this.providerName,
          voice: voiceId,
          duration,
          audioDuration: getMp3Duration(audioBuffer),
          audioFormat: request.audio?.format || 'mp3',
          sampleRate: request.audio?.sampleRate || 24000,
        },
        billing: {
          characters,
        },
      };
    } catch (error) {
      this.log('error', 'Synthesis failed', {
        voiceId,
        error: (error as Error).message,
      });

      throw this.handleError(error as Error, 'during Google Cloud TTS API call');
    }
  }

  /**
   * Parse voice ID to extract language code and voice name
   *
   * @private
   * @param voiceId - Voice identifier (e.g., "de-DE-Neural2-C", "en-US-Wavenet-D")
   * @returns Object with languageCode and voiceName
   *
   * Google Cloud TTS voice ID format: {language}-{region}-{type}-{variant}
   * Examples:
   * - de-DE-Neural2-C
   * - en-US-Wavenet-D
   * - fr-FR-Standard-A
   * - de-DE-Studio-B
   */
  private parseVoiceId(voiceId: string): { languageCode: string; voiceName: string } {
    // Voice ID is typically in format: de-DE-Neural2-C
    // Language code is the first two parts: de-DE
    const parts = voiceId.split('-');

    if (parts.length >= 2) {
      const languageCode = `${parts[0]}-${parts[1]}`;
      return {
        languageCode,
        voiceName: voiceId, // Full voice ID is the voice name
      };
    }

    // If we can't parse, use the voice ID as-is
    return {
      languageCode: voiceId,
      voiceName: voiceId,
    };
  }

  /**
   * Build the Google Cloud TTS synthesis request
   *
   * @private
   */
  private buildSynthesisRequest(
    text: string,
    languageCode: string,
    voiceName: string,
    request: TTSSynthesizeRequest,
    options: GoogleCloudTTSProviderOptions
  ): {
    input: { text: string };
    voice: { languageCode: string; name: string };
    audioConfig: {
      audioEncoding: GoogleAudioEncoding;
      speakingRate?: number;
      pitch?: number;
      volumeGainDb?: number;
      sampleRateHertz?: number;
      effectsProfileId?: string[];
    };
  } {
    // Determine audio encoding
    const format = request.audio?.format || 'mp3';
    const audioEncoding: GoogleAudioEncoding = AUDIO_ENCODING_MAP[format] || 'MP3';

    // Build audio config
    const audioConfig: {
      audioEncoding: GoogleAudioEncoding;
      speakingRate?: number;
      pitch?: number;
      volumeGainDb?: number;
      sampleRateHertz?: number;
      effectsProfileId?: string[];
    } = {
      audioEncoding,
    };

    // Speaking rate (speed)
    if (request.audio?.speed !== undefined) {
      audioConfig.speakingRate = request.audio.speed;
    }

    // Pitch
    if (request.audio?.pitch !== undefined) {
      audioConfig.pitch = request.audio.pitch;
    }

    // Volume
    if (request.audio?.volumeGainDb !== undefined) {
      audioConfig.volumeGainDb = request.audio.volumeGainDb;
    }

    // Sample rate
    if (request.audio?.sampleRate !== undefined) {
      audioConfig.sampleRateHertz = request.audio.sampleRate;
    }

    // Effects profile (Google-specific)
    if (options.effectsProfileId && options.effectsProfileId.length > 0) {
      audioConfig.effectsProfileId = options.effectsProfileId;
    }

    return {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig,
    };
  }
}

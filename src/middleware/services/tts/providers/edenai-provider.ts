/**
 * EdenAI TTS Provider
 *
 * @description Provider for EdenAI TTS API (multi-provider aggregator)
 * EdenAI acts as an aggregator, providing access to multiple TTS providers
 * (Amazon, Google, IBM, Microsoft, OpenAI, ElevenLabs) through a single API.
 *
 * @see https://docs.edenai.co/reference/text_to_speech_create
 */

import type { TTSSynthesizeRequest, TTSResponse } from '../types';
import { TTSProvider } from '../types';
import {
  BaseTTSProvider,
  InvalidConfigError,
} from './base-tts-provider';
import type { EdenAIProviderOptions } from '../types/provider-options.types';

/**
 * EdenAI-specific configuration
 */
interface EdenAIConfig {
  apiKey: string;
  apiUrl?: string;
}

/**
 * EdenAI API response structure
 */
interface EdenAIResponse {
  [provider: string]: {
    audio?: string; // base64-encoded audio
    audio_resource_url?: string; // URL to download audio
    cost?: number;
    status?: string;
    error?: string;
  };
}

/**
 * EdenAI provider implementation
 *
 * @description Provides TTS synthesis using EdenAI's multi-provider aggregator API.
 * EdenAI routes requests to underlying providers (Amazon, Google, IBM, Microsoft, OpenAI, ElevenLabs).
 *
 * @example
 * ```typescript
 * const provider = new EdenAIProvider();
 * const response = await provider.synthesize(
 *   "Hello World",
 *   "en-US",
 *   {
 *     text: "Hello World",
 *     voice: { id: "en-US-JennyNeural" },
 *     audio: { speed: 1.0, format: "mp3" },
 *     providerOptions: { provider: "google" }
 *   }
 * );
 * ```
 */
export class EdenAIProvider extends BaseTTSProvider {
  private config: EdenAIConfig;
  private readonly apiUrl: string;

  /**
   * Creates a new EdenAI TTS provider
   *
   * @param config - Optional EdenAI configuration (uses env vars if not provided)
   * @throws {InvalidConfigError} If API key is missing
   */
  constructor(config?: Partial<EdenAIConfig>) {
    super(TTSProvider.EDENAI);

    // Load configuration from environment or provided config
    this.config = {
      apiKey: config?.apiKey || process.env.EDENAI_API_KEY || '',
      apiUrl: config?.apiUrl,
    };

    this.apiUrl =
      this.config.apiUrl || 'https://api.edenai.run/v2/audio/text_to_speech';

    // Validate configuration
    this.validateEdenAIConfig();

    this.log('info', 'EdenAI provider initialized', {
      hasApiKey: !!this.config.apiKey,
      apiUrl: this.apiUrl,
    });
  }

  /**
   * Validate EdenAI-specific configuration
   *
   * @private
   * @throws {InvalidConfigError} If configuration is invalid
   */
  private validateEdenAIConfig(): void {
    if (!this.config.apiKey) {
      throw new InvalidConfigError(
        this.providerName,
        'EdenAI API key is required (EDENAI_API_KEY)'
      );
    }
  }

  /**
   * Synthesize text to speech using EdenAI
   *
   * @param text - The input text to synthesize
   * @param voiceId - The voice identifier (language code or voice name)
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

    // Extract options (use as EdenAIProviderOptions if it looks like it, otherwise empty)
    const options = (request.providerOptions || {}) as EdenAIProviderOptions;

    // Build EdenAI request
    const edenaiRequest = this.buildEdenAIRequest(text, voiceId, request, options);

    this.log('debug', 'Synthesizing with EdenAI', {
      voiceId,
      provider: options.provider || 'auto',
      textLength: text.length,
    });

    try {
      // Call EdenAI API
      const audioBuffer = await this.callEdenAIAPI(edenaiRequest);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Count billable characters (original text)
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
          audioFormat: request.audio?.format || options.audio_format || 'mp3',
          sampleRate: request.audio?.sampleRate || options.sampling_rate || 24000,
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

      throw this.handleError(error as Error, 'during EdenAI API call');
    }
  }

  /**
   * Build EdenAI API request payload
   *
   * @private
   * @param text - The input text
   * @param voiceId - The voice identifier (language code like 'en', 'de', 'en-US')
   * @param request - The synthesis request
   * @param options - EdenAI-specific options
   * @returns Request payload for EdenAI API
   *
   * @see https://docs.edenai.co/reference/audio_text_to_speech_create
   *
   * EdenAI API expects:
   * - text: The content to convert
   * - language: Language code (e.g., 'en', 'de', 'en-US')
   * - providers: Provider name at TOP LEVEL (e.g., 'openai', 'google')
   * - settings: Optional model-specific config (e.g., { "model": "Neural" })
   * - option: Optional specific voice name (provider-dependent)
   */
  private buildEdenAIRequest(
    text: string,
    voiceId: string,
    _request: TTSSynthesizeRequest,
    options: EdenAIProviderOptions
  ): Record<string, unknown> {
    // Extract language from voice ID (e.g., 'en-US-JennyNeural' -> 'en-US', 'en-US' -> 'en-US')
    const language = this.extractLanguage(voiceId);

    // Base request - minimal required fields
    // See: https://docs.edenai.co/reference/audio_text_to_speech_create
    const edenaiRequest: Record<string, unknown> = {
      text,
      language,
      providers: options.provider || 'google', // Provider at top level
    };

    // Handle 'option' field - EdenAI uses this for voice selection
    // Valid values: 'FEMALE', 'MALE', or provider-specific voice names (NOT Azure-style IDs)
    // Note: Azure-style voice IDs like 'en-US-JennyNeural' are NOT valid for EdenAI
    if (options.option) {
      // Use explicitly provided option (e.g., 'FEMALE', 'MALE')
      edenaiRequest.option = options.option;
    } else {
      // Default to FEMALE - EdenAI requires this field
      edenaiRequest.option = 'FEMALE';
    }

    // Build settings object for model-specific options only
    // Note: EdenAI settings format is { "model": "Neural" } style, NOT speaking_rate etc.
    const settings: Record<string, unknown> = {};

    // Model selection (e.g., "Neural", "Standard", "Wavenet")
    if (options.model) {
      settings.model = options.model;
    }

    // Add settings to request only if model is specified
    if (Object.keys(settings).length > 0) {
      edenaiRequest.settings = settings;
    }

    // Fallback providers (top-level)
    if (options.fallback_providers && options.fallback_providers.length > 0) {
      edenaiRequest.fallback_providers = options.fallback_providers;
    }

    return edenaiRequest;
  }

  /**
   * Call EdenAI API
   *
   * @private
   * @param requestBody - The request payload
   * @returns Promise resolving to audio buffer
   * @throws {SynthesisFailedError} If API call fails
   */
  private async callEdenAIAPI(requestBody: Record<string, unknown>): Promise<Buffer> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EdenAI API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as EdenAIResponse;

      // Extract audio from response
      // EdenAI returns provider-specific results
      const audioBuffer = await this.extractAudioFromResponse(data);

      if (!audioBuffer) {
        throw new Error('No audio data in EdenAI response');
      }

      return audioBuffer;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`EdenAI API call failed: ${error}`);
    }
  }

  /**
   * Extract audio buffer from EdenAI response
   *
   * @private
   * @param data - The EdenAI API response
   * @returns Audio buffer or null
   */
  private async extractAudioFromResponse(
    data: EdenAIResponse
  ): Promise<Buffer | null> {
    // EdenAI returns results keyed by provider name
    // Find the first successful provider response
    for (const providerName of Object.keys(data)) {
      const providerResult = data[providerName];

      // Check for errors
      if (providerResult.error || providerResult.status === 'fail') {
        this.log('warn', `Provider ${providerName} failed`, {
          error: providerResult.error,
        });
        continue;
      }

      // Check for base64-encoded audio
      if (providerResult.audio) {
        this.log('debug', `Using audio from provider: ${providerName}`);
        return Buffer.from(providerResult.audio, 'base64');
      }

      // Check for audio URL
      if (providerResult.audio_resource_url) {
        this.log('debug', `Downloading audio from URL (provider: ${providerName})`);
        const audioResponse = await fetch(providerResult.audio_resource_url);

        if (!audioResponse.ok) {
          this.log('warn', `Failed to download audio from URL`, {
            provider: providerName,
            url: providerResult.audio_resource_url,
          });
          continue;
        }

        const arrayBuffer = await audioResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }

    return null;
  }

  /**
   * Extract language code from voice ID
   *
   * @private
   * @param voiceId - The voice identifier
   * @returns Language code (e.g., 'en-US', 'de-DE')
   *
   * @description Extracts language code from voice IDs like:
   * - 'en-US-JennyNeural' -> 'en-US'
   * - 'de-DE-KatjaNeural' -> 'de-DE'
   * - 'en-US' -> 'en-US'
   * - 'en' -> 'en'
   */
  private extractLanguage(voiceId: string): string {
    // Match language code patterns: en-US, de-DE, etc.
    const match = voiceId.match(/^([a-z]{2}(-[A-Z]{2})?)/);

    if (match) {
      return match[1];
    }

    // If no match, assume voice ID is already a language code
    return voiceId;
  }
}

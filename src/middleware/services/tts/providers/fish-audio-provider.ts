/**
 * Fish Audio TTS Provider
 *
 * @description Provider for Fish Audio TTS API.
 * Test/Admin only – no EU data residency guarantees.
 *
 * Supports 13 languages (EN, DE, FR, ES, JA, ZH, KO, AR, RU, NL, IT, PL, PT)
 * with automatic language detection. 64+ emotional expressions via text markers.
 *
 * @see https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech
 */

import type { TTSSynthesizeRequest, TTSResponse } from '../types';
import { TTSProvider } from '../types';
import {
  BaseTTSProvider,
  InvalidConfigError,
} from './base-tts-provider';
import type { FishAudioProviderOptions } from '../types/provider-options.types';

/**
 * Fish Audio configuration
 */
interface FishAudioConfig {
  apiKey: string;
  apiUrl?: string;
}

/**
 * Fish Audio provider implementation
 *
 * @description Provides TTS synthesis using Fish Audio's S1 model via REST API.
 * Fish Audio supports 13 languages with automatic detection and 64+ emotional expressions.
 *
 * Billing: $15 per million UTF-8 bytes (~180,000 English words, ~12 hours of speech).
 *
 * @example
 * ```typescript
 * const provider = new FishAudioProvider();
 * const response = await provider.synthesize(
 *   "Hello World",
 *   "default",
 *   {
 *     text: "Hello World",
 *     voice: { id: "default" },
 *     audio: { format: "mp3" },
 *     providerOptions: {
 *       model: "s1",
 *       referenceId: "8ef4a238714b45718ce04243307c57a7"
 *     }
 *   }
 * );
 * ```
 */
export class FishAudioProvider extends BaseTTSProvider {
  private config: FishAudioConfig;
  private readonly apiUrl: string;

  /**
   * Creates a new Fish Audio TTS provider
   *
   * @param config - Optional configuration (uses env vars if not provided)
   * @throws {InvalidConfigError} If API key is missing
   */
  constructor(config?: Partial<FishAudioConfig>) {
    super(TTSProvider.FISH_AUDIO);

    this.config = {
      apiKey: config?.apiKey || process.env.FISH_AUDIO_API_KEY || '',
      apiUrl: config?.apiUrl,
    };

    this.apiUrl = this.config.apiUrl || 'https://api.fish.audio/v1/tts';

    this.validateFishAudioConfig();

    this.log('info', 'Fish Audio provider initialized', {
      hasApiKey: !!this.config.apiKey,
      apiUrl: this.apiUrl,
    });
  }

  /**
   * Validate Fish Audio configuration
   *
   * @private
   * @throws {InvalidConfigError} If configuration is invalid
   */
  private validateFishAudioConfig(): void {
    if (!this.config.apiKey) {
      throw new InvalidConfigError(
        this.providerName,
        'Fish Audio API key is required (FISH_AUDIO_API_KEY)'
      );
    }
  }

  /**
   * Synthesize text to speech using Fish Audio
   *
   * @param text - The input text to synthesize
   * @param voiceId - The voice identifier (Fish Audio reference_id or "default")
   * @param request - The full synthesis request with options
   * @returns Promise resolving to the synthesis response
   */
  async synthesize(
    text: string,
    voiceId: string,
    request: TTSSynthesizeRequest
  ): Promise<TTSResponse> {
    this.validateConfig(request);

    const startTime = Date.now();
    const options = (request.providerOptions || {}) as FishAudioProviderOptions;

    const requestBody = this.buildRequest(text, voiceId, request, options);
    const model = options.model || 's1';

    this.log('debug', 'Synthesizing with Fish Audio', {
      voiceId,
      model,
      textLength: text.length,
    });

    try {
      const audioBuffer = await this.callAPI(requestBody, model);
      const duration = Date.now() - startTime;
      const characters = this.countCharacters(text);

      this.log('info', 'Synthesis successful', {
        voiceId,
        characters,
        duration,
        audioSize: audioBuffer.length,
      });

      return {
        audio: audioBuffer,
        metadata: {
          provider: this.providerName,
          voice: voiceId,
          duration,
          audioFormat: request.audio?.format || 'mp3',
          sampleRate: request.audio?.sampleRate || 44100,
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

      throw this.handleError(error as Error, 'during Fish Audio API call');
    }
  }

  /**
   * Build Fish Audio API request payload
   *
   * @private
   */
  private buildRequest(
    text: string,
    voiceId: string,
    request: TTSSynthesizeRequest,
    options: FishAudioProviderOptions
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      text,
      format: request.audio?.format || 'mp3',
    };

    // Voice selection: providerOptions.referenceId takes priority, then voice.id (if not "default")
    const referenceId = options.referenceId || (voiceId !== 'default' ? voiceId : undefined);
    if (referenceId) {
      body.reference_id = referenceId;
    }

    // Quality parameters
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.repetitionPenalty !== undefined) body.repetition_penalty = options.repetitionPenalty;

    // Processing parameters
    if (options.latency) body.latency = options.latency;
    if (options.chunkLength !== undefined) body.chunk_length = options.chunkLength;
    if (options.normalize !== undefined) body.normalize = options.normalize;

    // Audio parameters
    if (request.audio?.sampleRate) body.sample_rate = request.audio.sampleRate;
    if (options.mp3Bitrate) body.mp3_bitrate = options.mp3Bitrate;
    if (options.opusBitrate !== undefined) body.opus_bitrate = options.opusBitrate;

    // Prosody from universal audio options
    if (request.audio?.speed) {
      body.prosody = { ...(body.prosody as Record<string, unknown> || {}), speed: request.audio.speed };
    }
    if (request.audio?.volumeGainDb) {
      body.prosody = { ...(body.prosody as Record<string, unknown> || {}), volume: request.audio.volumeGainDb };
    }

    return body;
  }

  /**
   * Call Fish Audio API
   *
   * @private
   * @param requestBody - The request payload
   * @param model - The model to use (sent as header)
   * @returns Promise resolving to audio buffer
   */
  private async callAPI(
    requestBody: Record<string, unknown>,
    model: string
  ): Promise<Buffer> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'model': model,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fish Audio API error (${response.status}): ${errorText}`);
    }

    // Fish Audio returns audio as a chunked stream
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

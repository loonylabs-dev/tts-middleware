/**
 * Inworld AI TTS Provider
 *
 * @description Provider for Inworld AI TTS API.
 * Test/Admin only – no EU data residency guarantees.
 *
 * Supports 15 languages with instant voice cloning.
 * Two models: TTS 1.5 Max (expressive, ~200ms) and TTS 1.5 Mini (ultra-low latency, ~120ms).
 *
 * @see https://docs.inworld.ai/docs/tts/tts
 */

import type { TTSSynthesizeRequest, TTSResponse } from '../types';
import { TTSProvider } from '../types';
import { getMp3Duration } from '../utils/mp3-duration.utils';
import {
  BaseTTSProvider,
  InvalidConfigError,
} from './base-tts-provider';
import type { InworldProviderOptions } from '../types/provider-options.types';

/**
 * Inworld AI configuration
 */
interface InworldConfig {
  apiKey: string;
  apiUrl?: string;
}

/**
 * Inworld AI provider implementation
 *
 * @description Provides TTS synthesis using Inworld AI's TTS 1.5 models via REST API.
 * Inworld supports 15 languages with voice cloning and audio markups for emotion/style.
 *
 * Billing: $10 per million characters (Max) / $5 per million characters (Mini).
 *
 * @example
 * ```typescript
 * const provider = new InworldProvider();
 * const response = await provider.synthesize(
 *   "Hello World",
 *   "Ashley",
 *   {
 *     text: "Hello World",
 *     voice: { id: "Ashley" },
 *     audio: { format: "mp3" },
 *     providerOptions: {
 *       modelId: "inworld-tts-1.5-max",
 *       temperature: 1.1
 *     }
 *   }
 * );
 * ```
 */
export class InworldProvider extends BaseTTSProvider {
  private config: InworldConfig;
  private readonly apiUrl: string;

  /**
   * Creates a new Inworld AI TTS provider
   *
   * @param config - Optional configuration (uses env vars if not provided)
   * @throws {InvalidConfigError} If API key is missing
   */
  constructor(config?: Partial<InworldConfig>) {
    super(TTSProvider.INWORLD);

    this.config = {
      apiKey: config?.apiKey || process.env.INWORLD_API_KEY || '',
      apiUrl: config?.apiUrl,
    };

    this.apiUrl = this.config.apiUrl || 'https://api.inworld.ai/tts/v1/voice';

    this.validateInworldConfig();

    this.log('info', 'Inworld AI provider initialized', {
      hasApiKey: !!this.config.apiKey,
      apiUrl: this.apiUrl,
    });
  }

  /**
   * Validate Inworld AI configuration
   *
   * @private
   * @throws {InvalidConfigError} If configuration is invalid
   */
  private validateInworldConfig(): void {
    if (!this.config.apiKey) {
      throw new InvalidConfigError(
        this.providerName,
        'Inworld AI API key is required (INWORLD_API_KEY)'
      );
    }
  }

  /**
   * Synthesize text to speech using Inworld AI
   *
   * @param text - The input text to synthesize (max 2000 characters)
   * @param voiceId - The voice identifier (e.g. "Ashley")
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
    const options = (request.providerOptions || {}) as InworldProviderOptions;

    const requestBody = this.buildRequest(text, voiceId, request, options);

    this.log('debug', 'Synthesizing with Inworld AI', {
      voiceId,
      modelId: options.modelId || 'inworld-tts-1.5-max',
      textLength: text.length,
    });

    try {
      const { audioBuffer, processedCharacters } = await this.callAPI(requestBody);
      const duration = Date.now() - startTime;
      const audioFormat = request.audio?.format || 'mp3';
      const characters = processedCharacters ?? this.countCharacters(text);

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
          audioDuration: audioFormat === 'mp3' ? getMp3Duration(audioBuffer) : undefined,
          audioFormat,
          sampleRate: request.audio?.sampleRate || 48000,
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

      throw this.handleError(error as Error, 'during Inworld AI API call');
    }
  }

  /**
   * Resolve audio format from request and provider options
   *
   * @private
   */
  /**
   * Map middleware audio format to Inworld API audioEncoding
   *
   * @private
   */
  private mapFormatToEncoding(format: string): string {
    const formatMap: Record<string, string> = {
      mp3: 'MP3',
      wav: 'LINEAR16',
      opus: 'OGG_OPUS',
      alaw: 'ALAW',
      mulaw: 'MULAW',
      flac: 'FLAC',
    };
    return formatMap[format] || 'MP3';
  }

  /**
   * Build Inworld AI API request payload
   *
   * @private
   */
  private buildRequest(
    text: string,
    voiceId: string,
    request: TTSSynthesizeRequest,
    options: InworldProviderOptions
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      text,
      voiceId,
      modelId: options.modelId || 'inworld-tts-1.5-max',
    };

    // Audio config
    const audioConfig: Record<string, unknown> = {};
    if (request.audio?.format) {
      audioConfig.audioEncoding = this.mapFormatToEncoding(request.audio.format);
    }
    if (options.bitRate !== undefined) {
      audioConfig.bitRate = options.bitRate;
    }
    if (request.audio?.sampleRate) {
      audioConfig.sampleRateHertz = request.audio.sampleRate;
    }
    if (request.audio?.speed !== undefined) {
      audioConfig.speakingRate = request.audio.speed;
    }

    if (Object.keys(audioConfig).length > 0) {
      body.audioConfig = audioConfig;
    }

    // Synthesis parameters
    if (request.audio?.temperature !== undefined) body.temperature = request.audio.temperature;
    if (options.timestampType) body.timestampType = options.timestampType;
    if (options.applyTextNormalization) body.applyTextNormalization = options.applyTextNormalization;

    return body;
  }

  /**
   * Call Inworld AI API
   *
   * @private
   * @param requestBody - The request payload
   * @returns Promise resolving to audio buffer and optional processed character count
   */
  private async callAPI(
    requestBody: Record<string, unknown>
  ): Promise<{ audioBuffer: Buffer; processedCharacters?: number }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Inworld AI API error (${response.status}): ${errorText}`);
    }

    const responseJson = await response.json() as {
      audioContent: string;
      usage?: { processedCharactersCount?: number };
    };

    const audioBuffer = Buffer.from(responseJson.audioContent, 'base64');
    const processedCharacters = responseJson.usage?.processedCharactersCount;

    return { audioBuffer, processedCharacters };
  }
}

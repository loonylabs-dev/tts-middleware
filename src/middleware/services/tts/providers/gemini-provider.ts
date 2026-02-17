/**
 * Gemini TTS Provider
 *
 * @description Provider for Google Gemini TTS via Vertex AI, using the generateContent
 * endpoint with responseModalities: ['AUDIO']. Authenticates via Service Account
 * (same as Google Cloud TTS — reuses GOOGLE_APPLICATION_CREDENTIALS).
 *
 * Supports 30 multilingual voices with auto-detect language and natural language
 * style control. Output is raw PCM (24kHz, 16-bit, mono) which is converted to
 * MP3 via ffmpeg or WAV as fallback.
 *
 * Test/Admin only -- no EU data residency guarantees.
 *
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/text-to-speech
 */

import { spawn } from 'child_process';
import type { TTSSynthesizeRequest, TTSResponse } from '../types';
import { TTSProvider } from '../types';
import { getMp3Duration } from '../utils/mp3-duration.utils';
import {
  BaseTTSProvider,
  InvalidConfigError,
} from './base-tts-provider';
import type { GeminiProviderOptions } from '../types/provider-options.types';

/**
 * Gemini TTS configuration (Vertex AI)
 */
export interface GeminiConfig {
  /**
   * Path to Service Account JSON file
   * @env GOOGLE_APPLICATION_CREDENTIALS
   */
  keyFilename?: string;

  /**
   * Google Cloud Project ID
   * @env GOOGLE_CLOUD_PROJECT
   */
  projectId?: string;

  /**
   * Vertex AI region
   * @env GEMINI_REGION
   * @default 'us-central1'
   */
  region?: string;
}

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_REGION = 'us-central1';

/**
 * Gemini TTS provider implementation
 *
 * @description Provides TTS synthesis using Google's Gemini generateContent API
 * via Vertex AI. Authenticates with Service Account OAuth2 (same credentials as
 * Google Cloud TTS). Gemini outputs raw PCM which is converted to MP3 (via ffmpeg)
 * or WAV (pure Node.js fallback).
 *
 * Billing: Token-based ($0.50-1.00/M input + $10-20/M audio output tokens).
 * For billing compatibility, reports character count like all other providers.
 *
 * @example
 * ```typescript
 * const provider = new GeminiProvider();
 * const response = await provider.synthesize(
 *   "Hello World",
 *   "Kore",
 *   {
 *     text: "Hello World",
 *     voice: { id: "Kore" },
 *     audio: { format: "mp3" },
 *     providerOptions: {
 *       model: "gemini-2.5-flash-preview-tts",
 *       stylePrompt: "Say cheerfully:"
 *     }
 *   }
 * );
 * ```
 */
export class GeminiProvider extends BaseTTSProvider {
  private config: GeminiConfig;
  private authClient: { getAccessToken: () => Promise<{ token?: string | null }> } | null = null;

  /**
   * Creates a new Gemini TTS provider
   *
   * @param config - Optional configuration (uses env vars if not provided)
   * @throws {InvalidConfigError} If credentials are missing
   */
  constructor(config?: Partial<GeminiConfig>) {
    super(TTSProvider.GEMINI);

    this.config = {
      keyFilename: config?.keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: config?.projectId || process.env.GOOGLE_CLOUD_PROJECT,
      region: config?.region || process.env.GEMINI_REGION || DEFAULT_REGION,
    };

    this.validateGeminiConfig();

    this.log('info', 'Gemini TTS provider initialized', {
      hasCredentials: !!this.config.keyFilename,
      projectId: this.config.projectId ? '***' : undefined,
      region: this.config.region,
    });
  }

  /**
   * Validate Gemini configuration
   *
   * @private
   * @throws {InvalidConfigError} If configuration is invalid
   */
  private validateGeminiConfig(): void {
    if (!this.config.keyFilename) {
      throw new InvalidConfigError(
        this.providerName,
        'Google Cloud credentials are required for Gemini TTS (GOOGLE_APPLICATION_CREDENTIALS)'
      );
    }

    if (!this.config.projectId) {
      throw new InvalidConfigError(
        this.providerName,
        'Google Cloud Project ID is required for Gemini TTS (GOOGLE_CLOUD_PROJECT)'
      );
    }
  }

  /**
   * Get an authenticated access token via Service Account
   *
   * @private
   * @returns OAuth2 access token
   */
  private async getAccessToken(): Promise<string> {
    if (!this.authClient) {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        keyFilename: this.config.keyFilename,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      this.authClient = await auth.getClient() as { getAccessToken: () => Promise<{ token?: string | null }> };
    }

    const tokenResponse = await this.authClient.getAccessToken();
    if (!tokenResponse.token) {
      throw new InvalidConfigError(
        this.providerName,
        'Failed to obtain access token from Service Account'
      );
    }

    return tokenResponse.token;
  }

  /**
   * Synthesize text to speech using Gemini TTS
   *
   * @param text - The input text to synthesize
   * @param voiceId - The voice name (e.g. "Kore", "Puck", "Charon")
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
    const options = (request.providerOptions || {}) as GeminiProviderOptions;
    const model = options.model || DEFAULT_MODEL;
    const requestedFormat = request.audio?.format || 'mp3';

    const requestBody = this.buildRequest(text, voiceId, options);

    this.log('debug', 'Synthesizing with Gemini TTS', {
      voiceId,
      model,
      textLength: text.length,
      requestedFormat,
    });

    try {
      const pcmBuffer = await this.callAPI(requestBody, model);
      const { audioBuffer, audioFormat } = await this.convertPcmAudio(pcmBuffer, requestedFormat);
      const duration = Date.now() - startTime;

      this.log('info', 'Synthesis successful', {
        voiceId,
        characters: text.length,
        duration,
        audioSize: audioBuffer.length,
        audioFormat,
      });

      return {
        audio: audioBuffer,
        metadata: {
          provider: this.providerName,
          voice: voiceId,
          duration,
          audioDuration: audioFormat === 'mp3' ? getMp3Duration(audioBuffer) : undefined,
          audioFormat,
          sampleRate: DEFAULT_SAMPLE_RATE,
        },
        billing: {
          characters: this.countCharacters(text),
        },
      };
    } catch (error) {
      this.log('error', 'Synthesis failed', {
        voiceId,
        error: (error as Error).message,
      });

      throw this.handleError(error as Error, 'during Gemini TTS API call');
    }
  }

  /**
   * Build Gemini generateContent request payload
   *
   * @private
   */
  private buildRequest(
    text: string,
    voiceId: string,
    options: GeminiProviderOptions
  ): Record<string, unknown> {
    const synthesisText = options.stylePrompt
      ? `${options.stylePrompt} ${text}`
      : text;

    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: synthesisText }],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceId,
            },
          },
        },
      },
    };
  }

  /**
   * Call Gemini generateContent API via Vertex AI
   *
   * @private
   * @param requestBody - The request payload
   * @param model - The Gemini model to use
   * @returns Promise resolving to raw PCM audio buffer
   */
  private async callAPI(
    requestBody: Record<string, unknown>,
    model: string
  ): Promise<Buffer> {
    const accessToken = await this.getAccessToken();

    const region = this.config.region || DEFAULT_REGION;
    const projectId = this.config.projectId;
    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const responseJson = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: {
              mimeType?: string;
              data?: string;
            };
          }>;
        };
      }>;
    };

    const inlineData = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      throw new Error('Gemini API returned no audio data');
    }

    return Buffer.from(inlineData.data, 'base64');
  }

  /**
   * Convert raw PCM audio to the requested format
   *
   * @private
   * @param pcmBuffer - Raw PCM buffer (24kHz, 16-bit, mono, little-endian)
   * @param requestedFormat - The desired output format ('mp3', 'wav', etc.)
   * @returns The converted audio buffer and actual format used
   */
  private async convertPcmAudio(
    pcmBuffer: Buffer,
    requestedFormat: string
  ): Promise<{ audioBuffer: Buffer; audioFormat: string }> {
    if (requestedFormat === 'wav') {
      return {
        audioBuffer: this.pcmToWav(pcmBuffer),
        audioFormat: 'wav',
      };
    }

    // For mp3 (and any other format), try ffmpeg first, fall back to WAV
    try {
      const mp3Buffer = await this.pcmToMp3(pcmBuffer);
      return { audioBuffer: mp3Buffer, audioFormat: 'mp3' };
    } catch (error) {
      this.log('warn', 'ffmpeg not available, falling back to WAV output', {
        error: (error as Error).message,
      });
      return {
        audioBuffer: this.pcmToWav(pcmBuffer),
        audioFormat: 'wav',
      };
    }
  }

  /**
   * Convert raw PCM to MP3 using ffmpeg via child_process
   *
   * @private
   * @param pcmBuffer - Raw PCM buffer (24kHz, 16-bit, mono, little-endian)
   * @returns Promise resolving to MP3 buffer
   */
  private pcmToMp3(pcmBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-f', 's16le',
        '-ar', String(DEFAULT_SAMPLE_RATE),
        '-ac', '1',
        '-i', 'pipe:0',
        '-codec:a', 'libmp3lame',
        '-b:a', '128k',
        '-f', 'mp3',
        'pipe:1',
      ]);

      const chunks: Buffer[] = [];
      ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.stderr.on('data', () => {});

      ffmpeg.on('error', (err: Error) => {
        reject(new Error(`ffmpeg spawn failed: ${err.message}`));
      });

      ffmpeg.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      ffmpeg.stdin.write(pcmBuffer);
      ffmpeg.stdin.end();
    });
  }

  /**
   * Convert raw PCM to WAV by prepending a 44-byte WAV header
   *
   * @private
   * @param pcmBuffer - Raw PCM buffer (24kHz, 16-bit, mono, little-endian)
   * @returns WAV buffer
   */
  private pcmToWav(pcmBuffer: Buffer): Buffer {
    const channels = 1;
    const bitsPerSample = 16;
    const byteRate = DEFAULT_SAMPLE_RATE * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);
    const dataLength = pcmBuffer.length;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);       // PCM chunk size
    header.writeUInt16LE(1, 20);        // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(DEFAULT_SAMPLE_RATE, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);

    return Buffer.concat([header, pcmBuffer]);
  }
}

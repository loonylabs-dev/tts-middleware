/**
 * TTS Service Orchestrator
 *
 * @description Main service class that orchestrates TTS provider access.
 * This is the primary API that consuming applications use.
 *
 * Analogous to LLMService in the LLM middleware.
 */

import type { TTSSynthesizeRequest, TTSResponse } from './types';
import { TTSProvider } from './types';
import type { BaseTTSProvider } from './providers/base-tts-provider';
import { AzureProvider } from './providers/azure-provider';
import { EdenAIProvider } from './providers/edenai-provider';
import { GoogleCloudTTSProvider } from './providers/google-cloud-tts-provider';

/**
 * TTS Service - Main orchestrator for TTS operations
 *
 * @description Singleton service that manages TTS providers and provides
 * a unified API for text-to-speech synthesis across multiple providers.
 *
 * @example
 * ```typescript
 * import { ttsService, TTSProvider } from '@loonylabs/tts-middleware';
 *
 * // Using default provider
 * const response = await ttsService.synthesize({
 *   text: "Hello World",
 *   voice: { id: "en-US-JennyNeural" }
 * });
 *
 * // Using specific provider
 * const response = await ttsService.synthesize({
 *   text: "Guten Tag",
 *   provider: TTSProvider.AZURE,
 *   voice: { id: "de-DE-KatjaNeural" }
 * });
 * ```
 */
export class TTSService {
  /**
   * Provider registry - maps provider enum to provider instance
   */
  private providers: Map<TTSProvider, BaseTTSProvider>;

  /**
   * Default provider to use when none is specified
   */
  private defaultProvider: TTSProvider;

  /**
   * Creates a new TTS Service instance
   *
   * @description Initializes the service with all available providers.
   * Providers are lazily initialized - they're only created when first accessed.
   */
  constructor() {
    this.providers = new Map();

    // Set default provider from environment or use Azure as fallback
    const envDefaultProvider = process.env.TTS_DEFAULT_PROVIDER?.toLowerCase();
    this.defaultProvider = this.parseProvider(envDefaultProvider) || TTSProvider.AZURE;

    // Initialize MVP provider (Azure)
    this.initializeProviders();

    this.log('info', 'TTS Service initialized', {
      defaultProvider: this.defaultProvider,
      availableProviders: this.getAvailableProviders(),
    });
  }

  /**
   * Initialize available providers
   *
   * @private
   */
  private initializeProviders(): void {
    try {
      // Initialize Azure provider (MVP)
      const azureProvider = new AzureProvider();
      this.providers.set(TTSProvider.AZURE, azureProvider);

      this.log('debug', 'Azure provider initialized');
    } catch (error) {
      this.log('warn', 'Failed to initialize Azure provider', {
        error: (error as Error).message,
      });
    }

    try {
      // Initialize EdenAI provider
      const edenaiProvider = new EdenAIProvider();
      this.providers.set(TTSProvider.EDENAI, edenaiProvider);

      this.log('debug', 'EdenAI provider initialized');
    } catch (error) {
      this.log('warn', 'Failed to initialize EdenAI provider', {
        error: (error as Error).message,
      });
    }

    try {
      // Initialize Google Cloud TTS provider
      const googleProvider = new GoogleCloudTTSProvider();
      this.providers.set(TTSProvider.GOOGLE, googleProvider);

      this.log('debug', 'Google Cloud TTS provider initialized');
    } catch (error) {
      this.log('warn', 'Failed to initialize Google Cloud TTS provider', {
        error: (error as Error).message,
      });
    }

    // Future providers will be initialized here:
    // try {
    //   const openaiProvider = new OpenAIProvider();
    //   this.providers.set(TTSProvider.OPENAI, openaiProvider);
    // } catch (error) {
    //   this.log('warn', 'Failed to initialize OpenAI provider', { error });
    // }
  }

  /**
   * Parse provider string to TTSProvider enum
   *
   * @private
   * @param provider - Provider string (case-insensitive)
   * @returns TTSProvider enum value or undefined
   */
  private parseProvider(provider?: string): TTSProvider | undefined {
    if (!provider) {
      return undefined;
    }

    const normalized = provider.toLowerCase();
    const providerMap: Record<string, TTSProvider> = {
      azure: TTSProvider.AZURE,
      edenai: TTSProvider.EDENAI,
      openai: TTSProvider.OPENAI,
      elevenlabs: TTSProvider.ELEVENLABS,
      google: TTSProvider.GOOGLE,
      deepgram: TTSProvider.DEEPGRAM,
    };

    return providerMap[normalized];
  }

  /**
   * Synthesize text to speech
   *
   * @param request - The synthesis request
   * @returns Promise resolving to synthesis response with audio buffer
   * @throws {Error} If provider is not available or synthesis fails
   *
   * @example
   * ```typescript
   * const response = await ttsService.synthesize({
   *   text: "Hello World",
   *   voice: { id: "en-US-JennyNeural" },
   *   audio: { speed: 1.0, format: "mp3" }
   * });
   *
   * fs.writeFileSync('output.mp3', response.audio);
   * console.log(`Cost: ${response.billing.characters} characters`);
   * ```
   */
  async synthesize(request: TTSSynthesizeRequest): Promise<TTSResponse> {
    // Determine which provider to use
    const providerEnum = request.provider || this.defaultProvider;

    // Get provider instance
    const provider = this.getProvider(providerEnum);

    // Log synthesis request
    this.log('info', 'Synthesizing speech', {
      provider: providerEnum,
      voiceId: request.voice.id,
      textLength: request.text.length,
    });

    try {
      // Delegate to provider
      const response = await provider.synthesize(
        request.text,
        request.voice.id,
        request
      );

      this.log('info', 'Synthesis completed', {
        provider: providerEnum,
        characters: response.billing.characters,
        audioSize: response.audio.length,
      });

      return response;
    } catch (error) {
      this.log('error', 'Synthesis failed', {
        provider: providerEnum,
        error: (error as Error).message,
      });

      // Re-throw with provider context
      throw error;
    }
  }

  /**
   * Get a provider instance
   *
   * @param provider - The provider enum
   * @returns The provider instance
   * @throws {Error} If provider is not registered
   *
   * @example
   * ```typescript
   * const azureProvider = ttsService.getProvider(TTSProvider.AZURE);
   * ```
   */
  public getProvider(provider: TTSProvider): BaseTTSProvider {
    const providerInstance = this.providers.get(provider);

    if (!providerInstance) {
      const availableProviders = this.getAvailableProviders().join(', ');
      throw new Error(
        `Provider '${provider}' is not available. Available providers: ${availableProviders}`
      );
    }

    return providerInstance;
  }

  /**
   * Set the default provider
   *
   * @param provider - The provider to set as default
   * @throws {Error} If provider is not registered
   *
   * @example
   * ```typescript
   * ttsService.setDefaultProvider(TTSProvider.AZURE);
   * ```
   */
  public setDefaultProvider(provider: TTSProvider): void {
    // Validate that provider exists
    if (!this.providers.has(provider)) {
      const availableProviders = this.getAvailableProviders().join(', ');
      throw new Error(
        `Cannot set default provider '${provider}': provider is not available. Available providers: ${availableProviders}`
      );
    }

    this.defaultProvider = provider;

    this.log('info', 'Default provider changed', {
      newDefault: provider,
    });
  }

  /**
   * Get the current default provider
   *
   * @returns The default provider enum
   *
   * @example
   * ```typescript
   * const defaultProvider = ttsService.getDefaultProvider();
   * console.log(`Using ${defaultProvider} by default`);
   * ```
   */
  public getDefaultProvider(): TTSProvider {
    return this.defaultProvider;
  }

  /**
   * Get list of available providers
   *
   * @returns Array of available provider enums
   *
   * @example
   * ```typescript
   * const providers = ttsService.getAvailableProviders();
   * console.log(`Available: ${providers.join(', ')}`);
   * ```
   */
  public getAvailableProviders(): TTSProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available
   *
   * @param provider - The provider to check
   * @returns True if provider is available
   *
   * @example
   * ```typescript
   * if (ttsService.isProviderAvailable(TTSProvider.AZURE)) {
   *   // Use Azure
   * }
   * ```
   */
  public isProviderAvailable(provider: TTSProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Log a message
   *
   * @private
   * @param level - Log level
   * @param message - Log message
   * @param meta - Optional metadata
   */
  private log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    meta?: Record<string, unknown>
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [TTSService] [${level.toUpperCase()}]`;

    if (meta) {
      console[level](prefix, message, meta);
    } else {
      console[level](prefix, message);
    }
  }
}

/**
 * Singleton instance of TTS Service
 *
 * @description This is the main export that consuming applications should use.
 *
 * @example
 * ```typescript
 * import { ttsService } from '@loonylabs/tts-middleware';
 *
 * const response = await ttsService.synthesize({
 *   text: "Hello World",
 *   voice: { id: "en-US-JennyNeural" }
 * });
 * ```
 */
export const ttsService = new TTSService();

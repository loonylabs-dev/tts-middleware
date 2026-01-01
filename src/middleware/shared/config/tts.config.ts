/**
 * TTS Middleware Configuration
 *
 * @description Central configuration for TTS middleware
 * Manages environment variables, provider settings, and validation
 *
 * @critical Configuration errors can prevent synthesis - validate early
 */

import { TTSProvider } from '../../services/tts/types';

/**
 * Azure Speech Services Configuration
 */
export interface AzureConfig {
  /**
   * Azure Speech Services subscription key
   * @env AZURE_SPEECH_KEY
   * @required true
   * @example 'abc123def456...'
   */
  KEY: string;

  /**
   * Azure region for Speech Services
   * @env AZURE_SPEECH_REGION
   * @required true
   * @default 'germanywestcentral'
   * @example 'germanywestcentral', 'westus', 'eastus'
   */
  REGION: string;

  /**
   * Custom Azure Speech endpoint (optional)
   * @env AZURE_SPEECH_ENDPOINT
   * @required false
   * @example 'https://germanywestcentral.tts.speech.microsoft.com'
   */
  ENDPOINT?: string;

  /**
   * DSGVO/GDPR compliance flag
   * @description When true, uses EU-based regions for data processing
   * @default true (for German region)
   */
  DSGVO_COMPLIANT: boolean;

  /**
   * Free tier character limit per month
   * @description Azure Free Tier: 500,000 characters/month
   * @see https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
   */
  FREE_TIER_CHARS_PER_MONTH: number;
}

/**
 * TTS Middleware Configuration Object
 */
export interface TTSConfig {
  /**
   * Default TTS provider
   * @env TTS_DEFAULT_PROVIDER
   * @default 'azure'
   */
  DEFAULT_PROVIDER: TTSProvider;

  /**
   * Azure Speech Services configuration
   */
  AZURE: AzureConfig;

  /**
   * Enable debug logging
   * @env TTS_DEBUG
   * @default false
   */
  DEBUG: boolean;

  /**
   * Maximum text length per synthesis request
   * @description Prevents excessive API costs
   * @default 3000 (Azure limit)
   */
  MAX_TEXT_LENGTH: number;

  /**
   * Default audio format
   * @default 'mp3'
   */
  DEFAULT_AUDIO_FORMAT: 'mp3' | 'wav' | 'opus';

  /**
   * Default sample rate in Hz
   * @default 24000
   */
  DEFAULT_SAMPLE_RATE: number;
}

/**
 * Load and validate TTS configuration from environment variables
 *
 * @returns {TTSConfig} Validated TTS configuration
 * @throws {Error} If required environment variables are missing
 *
 * @example
 * ```typescript
 * const config = getTTSConfig();
 * console.log(config.AZURE.REGION); // 'germanywestcentral'
 * ```
 */
export function getTTSConfig(): TTSConfig {
  // Read environment variables
  const azureKey = process.env.AZURE_SPEECH_KEY || '';
  const azureRegion = process.env.AZURE_SPEECH_REGION?.trim() || 'germanywestcentral';
  const azureEndpoint = process.env.AZURE_SPEECH_ENDPOINT;
  const defaultProvider =
    (process.env.TTS_DEFAULT_PROVIDER as TTSProvider) || TTSProvider.AZURE;
  const debug = process.env.TTS_DEBUG === 'true';

  // Determine DSGVO compliance based on region
  const euRegions = [
    'germanywestcentral',
    'northeurope',
    'westeurope',
    'francecentral',
    'switzerlandnorth',
    'uksouth',
  ];
  const isDsgvoCompliant = euRegions.includes(azureRegion.toLowerCase());

  // Build configuration object
  const config: TTSConfig = {
    DEFAULT_PROVIDER: defaultProvider,
    AZURE: {
      KEY: azureKey,
      REGION: azureRegion,
      ENDPOINT: azureEndpoint,
      DSGVO_COMPLIANT: isDsgvoCompliant,
      FREE_TIER_CHARS_PER_MONTH: 500_000,
    },
    DEBUG: debug,
    MAX_TEXT_LENGTH: 3000,
    DEFAULT_AUDIO_FORMAT: 'mp3',
    DEFAULT_SAMPLE_RATE: 24000,
  };

  return config;
}

/**
 * Validate TTS configuration
 *
 * @param {TTSConfig} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 *
 * @description
 * Validates that all required configuration values are present and valid.
 * Should be called before initializing TTS services.
 *
 * @example
 * ```typescript
 * const config = getTTSConfig();
 * validateTTSConfig(config);
 * // If validation passes, config is safe to use
 * ```
 */
export function validateTTSConfig(config: TTSConfig): void {
  const errors: string[] = [];

  // Validate default provider
  if (!config.DEFAULT_PROVIDER) {
    errors.push('DEFAULT_PROVIDER is required');
  }

  const validProviders = Object.values(TTSProvider);
  if (!validProviders.includes(config.DEFAULT_PROVIDER)) {
    errors.push(
      `DEFAULT_PROVIDER must be one of: ${validProviders.join(', ')}`
    );
  }

  // Validate Azure configuration (required for MVP)
  if (config.DEFAULT_PROVIDER === TTSProvider.AZURE) {
    if (!config.AZURE.KEY) {
      errors.push(
        'AZURE_SPEECH_KEY is required when using Azure provider (set in environment variable)'
      );
    }

    if (!config.AZURE.REGION) {
      errors.push(
        'AZURE_SPEECH_REGION is required when using Azure provider (set in environment variable)'
      );
    }

    // Validate region format (should be lowercase, no spaces)
    if (config.AZURE.REGION && /\s/.test(config.AZURE.REGION)) {
      errors.push('AZURE_SPEECH_REGION cannot contain spaces');
    }

    // Validate key format (should be alphanumeric)
    if (
      config.AZURE.KEY &&
      !/^[a-zA-Z0-9]+$/.test(config.AZURE.KEY) &&
      config.AZURE.KEY !== ''
    ) {
      errors.push('AZURE_SPEECH_KEY should be alphanumeric');
    }

    // Validate endpoint format if provided
    if (config.AZURE.ENDPOINT && !config.AZURE.ENDPOINT.startsWith('https://')) {
      errors.push('AZURE_SPEECH_ENDPOINT must start with https://');
    }
  }

  // Validate numeric values
  if (config.MAX_TEXT_LENGTH <= 0) {
    errors.push('MAX_TEXT_LENGTH must be greater than 0');
  }

  if (config.DEFAULT_SAMPLE_RATE <= 0) {
    errors.push('DEFAULT_SAMPLE_RATE must be greater than 0');
  }

  // Throw if any errors
  if (errors.length > 0) {
    throw new Error(
      `TTS Configuration validation failed:\n- ${errors.join('\n- ')}`
    );
  }
}

/**
 * Singleton TTS configuration instance
 *
 * @description
 * Pre-loaded and validated configuration for easy access across the application.
 * Use this instead of calling getTTSConfig() multiple times.
 *
 * @example
 * ```typescript
 * import { TTS_CONFIG } from './tts.config';
 * console.log(TTS_CONFIG.AZURE.REGION);
 * ```
 */
export const TTS_CONFIG: TTSConfig = getTTSConfig();

// Validate configuration on module load (fail fast)
try {
  validateTTSConfig(TTS_CONFIG);
} catch (error) {
  if (TTS_CONFIG.DEBUG) {
    console.warn('[TTS Config] Validation failed:', (error as Error).message);
  }
  // Don't throw in tests or when key is not set (allows testing without credentials)
  if (
    process.env.NODE_ENV !== 'test' &&
    TTS_CONFIG.DEFAULT_PROVIDER === TTSProvider.AZURE &&
    TTS_CONFIG.AZURE.KEY
  ) {
    throw error;
  }
}

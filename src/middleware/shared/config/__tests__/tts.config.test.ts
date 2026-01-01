/**
 * Tests for TTS Configuration
 *
 * @description Tests configuration loading, validation, and environment variable handling
 * @coverage Target: >80%
 */

import { TTSProvider } from '../../../services/tts/types';

describe('TTS Configuration', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getTTSConfig', () => {
    test('loads configuration from environment variables', () => {
      // Set environment variables
      process.env.AZURE_SPEECH_KEY = 'test-key-123';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';
      process.env.TTS_DEBUG = 'true';

      // Import after setting env vars
      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.AZURE.KEY).toBe('test-key-123');
      expect(config.AZURE.REGION).toBe('westus');
      expect(config.DEFAULT_PROVIDER).toBe(TTSProvider.AZURE);
      expect(config.DEBUG).toBe(true);
    });

    test('uses default values when environment variables are missing', () => {
      // Don't set any env vars
      delete process.env.AZURE_SPEECH_KEY;
      delete process.env.AZURE_SPEECH_REGION;
      delete process.env.TTS_DEFAULT_PROVIDER;
      delete process.env.TTS_DEBUG;

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.AZURE.KEY).toBe('');
      expect(config.AZURE.REGION).toBe('germanywestcentral'); // Default
      expect(config.DEFAULT_PROVIDER).toBe(TTSProvider.AZURE);
      expect(config.DEBUG).toBe(false);
    });

    test('loads Azure endpoint from environment variable', () => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.AZURE_SPEECH_ENDPOINT =
        'https://custom.tts.speech.microsoft.com';

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.AZURE.ENDPOINT).toBe(
        'https://custom.tts.speech.microsoft.com'
      );
    });

    test('sets DSGVO_COMPLIANT to true for EU regions', () => {
      const euRegions = [
        'germanywestcentral',
        'northeurope',
        'westeurope',
        'francecentral',
        'switzerlandnorth',
        'uksouth',
      ];

      euRegions.forEach((region) => {
        jest.resetModules();
        process.env.AZURE_SPEECH_KEY = 'test-key';
        process.env.AZURE_SPEECH_REGION = region;

        const { getTTSConfig } = require('../tts.config');
        const config = getTTSConfig();

        expect(config.AZURE.DSGVO_COMPLIANT).toBe(true);
      });
    });

    test('sets DSGVO_COMPLIANT to false for non-EU regions', () => {
      const nonEuRegions = ['westus', 'eastus', 'southeastasia', 'japaneast'];

      nonEuRegions.forEach((region) => {
        jest.resetModules();
        process.env.AZURE_SPEECH_KEY = 'test-key';
        process.env.AZURE_SPEECH_REGION = region;

        const { getTTSConfig } = require('../tts.config');
        const config = getTTSConfig();

        expect(config.AZURE.DSGVO_COMPLIANT).toBe(false);
      });
    });

    test('sets correct default values', () => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'westus';

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.MAX_TEXT_LENGTH).toBe(3000);
      expect(config.DEFAULT_AUDIO_FORMAT).toBe('mp3');
      expect(config.DEFAULT_SAMPLE_RATE).toBe(24000);
      expect(config.AZURE.FREE_TIER_CHARS_PER_MONTH).toBe(500_000);
    });
  });

  describe('validateTTSConfig', () => {
    test('passes validation with valid Azure configuration', () => {
      process.env.AZURE_SPEECH_KEY = 'abc123def456';
      process.env.AZURE_SPEECH_REGION = 'germanywestcentral';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(() => validateTTSConfig(config)).not.toThrow();
    });

    test('fails validation when Azure key is missing', () => {
      process.env.AZURE_SPEECH_KEY = '';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(() => validateTTSConfig(config)).toThrow(
        /AZURE_SPEECH_KEY is required/
      );
    });

    test('uses default region when Azure region is empty', () => {
      process.env.AZURE_SPEECH_KEY = 'testkey123';
      process.env.AZURE_SPEECH_REGION = '';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      // Should use default region and pass validation
      expect(config.AZURE.REGION).toBe('germanywestcentral');
      expect(() => validateTTSConfig(config)).not.toThrow();
    });

    test('fails validation when Azure region contains spaces', () => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'west us';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(() => validateTTSConfig(config)).toThrow(
        /AZURE_SPEECH_REGION cannot contain spaces/
      );
    });

    test('fails validation when Azure key contains non-alphanumeric characters', () => {
      process.env.AZURE_SPEECH_KEY = 'test-key-with-dashes!';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(() => validateTTSConfig(config)).toThrow(
        /AZURE_SPEECH_KEY should be alphanumeric/
      );
    });

    test('fails validation when Azure endpoint does not start with https://', () => {
      process.env.AZURE_SPEECH_KEY = 'testkey123';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.AZURE_SPEECH_ENDPOINT = 'http://insecure.endpoint.com';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(() => validateTTSConfig(config)).toThrow(
        /AZURE_SPEECH_ENDPOINT must start with https:\/\//
      );
    });

    test('passes validation with valid Azure endpoint', () => {
      process.env.AZURE_SPEECH_KEY = 'testkey123';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.AZURE_SPEECH_ENDPOINT = 'https://secure.endpoint.com';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(() => validateTTSConfig(config)).not.toThrow();
    });

    test('fails validation when DEFAULT_PROVIDER is invalid', () => {
      process.env.AZURE_SPEECH_KEY = 'testkey123';
      process.env.AZURE_SPEECH_REGION = 'westus';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();
      config.DEFAULT_PROVIDER = 'invalid-provider' as TTSProvider;

      expect(() => validateTTSConfig(config)).toThrow(
        /DEFAULT_PROVIDER must be one of/
      );
    });

    test('fails validation when MAX_TEXT_LENGTH is zero or negative', () => {
      process.env.AZURE_SPEECH_KEY = 'testkey123';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();
      config.MAX_TEXT_LENGTH = 0;

      expect(() => validateTTSConfig(config)).toThrow(
        /MAX_TEXT_LENGTH must be greater than 0/
      );
    });

    test('fails validation when DEFAULT_SAMPLE_RATE is zero or negative', () => {
      process.env.AZURE_SPEECH_KEY = 'testkey123';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();
      config.DEFAULT_SAMPLE_RATE = -1;

      expect(() => validateTTSConfig(config)).toThrow(
        /DEFAULT_SAMPLE_RATE must be greater than 0/
      );
    });

    test('fails validation with missing key but uses default region', () => {
      process.env.AZURE_SPEECH_KEY = '';
      process.env.AZURE_SPEECH_REGION = '';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { getTTSConfig, validateTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      // Should use default region but fail on missing key
      expect(config.AZURE.REGION).toBe('germanywestcentral'); // Default is used
      expect(() => validateTTSConfig(config)).toThrow(/AZURE_SPEECH_KEY is required/);
    });
  });

  describe('TTS_CONFIG Singleton', () => {
    test('exports pre-loaded configuration', () => {
      process.env.AZURE_SPEECH_KEY = 'singleton-test-key';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      const { TTS_CONFIG } = require('../tts.config');

      expect(TTS_CONFIG).toBeDefined();
      expect(TTS_CONFIG.AZURE.KEY).toBe('singleton-test-key');
      expect(TTS_CONFIG.AZURE.REGION).toBe('westus');
    });

    test('singleton is validated on load', () => {
      // This test verifies that validation runs, but in test env it doesn't throw
      process.env.NODE_ENV = 'test';
      process.env.AZURE_SPEECH_KEY = '';
      process.env.AZURE_SPEECH_REGION = 'westus';
      process.env.TTS_DEFAULT_PROVIDER = 'azure';

      // Should not throw in test environment even with invalid config
      expect(() => {
        require('../tts.config');
      }).not.toThrow();
    });
  });

  describe('Environment Variable Handling', () => {
    test('handles TTS_DEBUG=true correctly', () => {
      process.env.TTS_DEBUG = 'true';
      process.env.AZURE_SPEECH_KEY = 'test';
      process.env.AZURE_SPEECH_REGION = 'westus';

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.DEBUG).toBe(true);
    });

    test('handles TTS_DEBUG=false correctly', () => {
      process.env.TTS_DEBUG = 'false';
      process.env.AZURE_SPEECH_KEY = 'test';
      process.env.AZURE_SPEECH_REGION = 'westus';

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.DEBUG).toBe(false);
    });

    test('defaults DEBUG to false when TTS_DEBUG is not set', () => {
      delete process.env.TTS_DEBUG;
      process.env.AZURE_SPEECH_KEY = 'test';
      process.env.AZURE_SPEECH_REGION = 'westus';

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.DEBUG).toBe(false);
    });

    test('handles all TTSProvider enum values', () => {
      const providers = [
        'azure',
        'openai',
        'elevenlabs',
        'google',
        'deepgram',
      ];

      providers.forEach((provider) => {
        jest.resetModules();
        process.env.TTS_DEFAULT_PROVIDER = provider;
        process.env.AZURE_SPEECH_KEY = 'test';
        process.env.AZURE_SPEECH_REGION = 'westus';

        const { getTTSConfig } = require('../tts.config');
        const config = getTTSConfig();

        expect(config.DEFAULT_PROVIDER).toBe(provider);
      });
    });
  });

  describe('Azure Configuration Details', () => {
    test('FREE_TIER_CHARS_PER_MONTH is set to 500,000', () => {
      process.env.AZURE_SPEECH_KEY = 'test';
      process.env.AZURE_SPEECH_REGION = 'westus';

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.AZURE.FREE_TIER_CHARS_PER_MONTH).toBe(500_000);
    });

    test('ENDPOINT is optional', () => {
      process.env.AZURE_SPEECH_KEY = 'test';
      process.env.AZURE_SPEECH_REGION = 'westus';
      delete process.env.AZURE_SPEECH_ENDPOINT;

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      expect(config.AZURE.ENDPOINT).toBeUndefined();
    });

    test('DSGVO_COMPLIANT is case-insensitive for region', () => {
      const regions = [
        'GermanyWestCentral',
        'GERMANYWESTCENTRAL',
        'germanywestcentral',
      ];

      regions.forEach((region) => {
        jest.resetModules();
        process.env.AZURE_SPEECH_KEY = 'test';
        process.env.AZURE_SPEECH_REGION = region;

        const { getTTSConfig } = require('../tts.config');
        const config = getTTSConfig();

        expect(config.AZURE.DSGVO_COMPLIANT).toBe(true);
      });
    });
  });

  describe('Configuration Structure', () => {
    test('has correct structure', () => {
      process.env.AZURE_SPEECH_KEY = 'test';
      process.env.AZURE_SPEECH_REGION = 'westus';

      const { getTTSConfig } = require('../tts.config');
      const config = getTTSConfig();

      // Top-level properties
      expect(config).toHaveProperty('DEFAULT_PROVIDER');
      expect(config).toHaveProperty('AZURE');
      expect(config).toHaveProperty('DEBUG');
      expect(config).toHaveProperty('MAX_TEXT_LENGTH');
      expect(config).toHaveProperty('DEFAULT_AUDIO_FORMAT');
      expect(config).toHaveProperty('DEFAULT_SAMPLE_RATE');

      // Azure properties
      expect(config.AZURE).toHaveProperty('KEY');
      expect(config.AZURE).toHaveProperty('REGION');
      expect(config.AZURE).toHaveProperty('DSGVO_COMPLIANT');
      expect(config.AZURE).toHaveProperty('FREE_TIER_CHARS_PER_MONTH');
    });
  });
});

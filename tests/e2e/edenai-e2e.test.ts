/**
 * End-to-End Tests for EdenAI TTS Provider
 *
 * @description Tests against real EdenAI API to validate request format
 * @author LoonyLabs
 * @since 0.2.0
 *
 * IMPORTANT: These tests make real API calls and may incur costs.
 * They are skipped by default unless EDENAI_API_KEY is set.
 *
 * Run with: npm test -- --testPathPattern="edenai-e2e"
 * Run with env: node run-e2e.js
 */

import { EdenAIProvider } from '../../src/middleware/services/tts/providers/edenai-provider';
import type { TTSSynthesizeRequest } from '../../src/middleware/services/tts/types';
import { TTSProvider } from '../../src/middleware/services/tts/types';

// Skip all tests if no API key is available
const SKIP_E2E = !process.env.EDENAI_API_KEY;
const testIf = SKIP_E2E ? test.skip : test;

describe('EdenAI E2E Tests', () => {
  beforeAll(() => {
    if (SKIP_E2E) {
      console.log('⏭️  Skipping EdenAI E2E tests - EDENAI_API_KEY not set');
    } else {
      console.log('🚀 Running EdenAI E2E tests against real API');
    }
  });

  describe('OpenAI Provider via EdenAI', () => {
    testIf(
      'synthesizes German text correctly',
      async () => {
        const provider = new EdenAIProvider();

        const request: TTSSynthesizeRequest = {
          text: 'Hallo, dies ist ein Test.',
          provider: TTSProvider.EDENAI,
          voice: { id: 'de' },
          audio: { format: 'mp3' },
          providerOptions: { provider: 'openai' },
        };

        const response = await provider.synthesize(
          request.text,
          request.voice.id,
          request
        );

        expect(response.audio).toBeInstanceOf(Buffer);
        expect(response.audio.length).toBeGreaterThan(1000);
        expect(response.metadata.provider).toBe('edenai');
        expect(response.metadata.voice).toBe('de');
        expect(response.billing.characters).toBe(25);
      },
      30000
    );

    testIf(
      'synthesizes English text correctly',
      async () => {
        const provider = new EdenAIProvider();

        const request: TTSSynthesizeRequest = {
          text: 'Hello, this is a test.',
          provider: TTSProvider.EDENAI,
          voice: { id: 'en' },
          audio: { format: 'mp3' },
          providerOptions: { provider: 'openai' },
        };

        const response = await provider.synthesize(
          request.text,
          request.voice.id,
          request
        );

        expect(response.audio).toBeInstanceOf(Buffer);
        expect(response.audio.length).toBeGreaterThan(1000);
        expect(response.metadata.provider).toBe('edenai');
        expect(response.billing.characters).toBe(22);
      },
      30000
    );

    testIf(
      'uses MALE voice option correctly',
      async () => {
        const provider = new EdenAIProvider();

        const request: TTSSynthesizeRequest = {
          text: 'Test with male voice.',
          provider: TTSProvider.EDENAI,
          voice: { id: 'en' },
          audio: { format: 'mp3' },
          providerOptions: {
            provider: 'openai',
            option: 'MALE',
          },
        };

        const response = await provider.synthesize(
          request.text,
          request.voice.id,
          request
        );

        expect(response.audio).toBeInstanceOf(Buffer);
        expect(response.audio.length).toBeGreaterThan(1000);
      },
      30000
    );
  });

  describe('Google Provider via EdenAI', () => {
    testIf(
      'synthesizes English text correctly',
      async () => {
        const provider = new EdenAIProvider();

        const request: TTSSynthesizeRequest = {
          text: 'Hello from Google TTS.',
          provider: TTSProvider.EDENAI,
          voice: { id: 'en-US' },
          audio: { format: 'mp3' },
          providerOptions: { provider: 'google' },
        };

        const response = await provider.synthesize(
          request.text,
          request.voice.id,
          request
        );

        expect(response.audio).toBeInstanceOf(Buffer);
        expect(response.audio.length).toBeGreaterThan(1000);
        expect(response.metadata.provider).toBe('edenai');
      },
      30000
    );
  });

  describe('Error Handling', () => {
    testIf(
      'returns audio even without explicit option (defaults to FEMALE)',
      async () => {
        const provider = new EdenAIProvider();

        const request: TTSSynthesizeRequest = {
          text: 'Default voice test.',
          provider: TTSProvider.EDENAI,
          voice: { id: 'en' },
          providerOptions: { provider: 'openai' },
        };

        const response = await provider.synthesize(
          request.text,
          request.voice.id,
          request
        );

        // Should succeed with FEMALE default
        expect(response.audio).toBeInstanceOf(Buffer);
        expect(response.audio.length).toBeGreaterThan(100);
      },
      30000
    );
  });
});

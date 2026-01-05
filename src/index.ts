/**
 * @loonylabs/tts-middleware
 *
 * Provider-agnostic Text-to-Speech middleware for Azure, EdenAI, OpenAI,
 * ElevenLabs, Google Cloud, and Deepgram.
 *
 * @example
 * ```typescript
 * import { ttsService, TTSProvider } from '@loonylabs/tts-middleware';
 *
 * const response = await ttsService.synthesize({
 *   text: "Hello World",
 *   provider: TTSProvider.AZURE,
 *   voice: { id: "en-US-JennyNeural" },
 *   audio: { speed: 1.0, format: "mp3" }
 * });
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from the TTS middleware
export * from './middleware/services/tts';

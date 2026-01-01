# TTS Middleware - Technical Stories & Acceptance Criteria

**Version:** 1.0
**Phase:** MVP (Azure Speech Services)
**Total Stories:** 8
**Total Effort (MVP):** ~26 Story Points

| Story | Effort | Status |
|-------|--------|--------|
| TTS-001 Types | 3 | Blocker |
| TTS-002 BaseTTSProvider | 3 | Blocker |
| TTS-003 Character Counter | 2 | High |
| TTS-004 Azure Provider | 5 | Core |
| TTS-005 TTSService | 3 | Core |
| TTS-006 Exports | 1 | High |
| TTS-007 Config | 2 | High |
| TTS-008 Tests & Docs | 8 | Quality ⭐ |
| **TOTAL** | **27** | |

⭐ **Note:** TTS-008 expanded to 8 points to ensure >80% code coverage with detailed per-file requirements, CI/CD integration, and gap analysis

---

## Story 1: Define TTS Types & Interfaces

**Ticket ID:** TTS-001
**Effort:** 3 points (extended from 2 to include all provider parameters)
**Priority:** Highest (blocker for other stories)
**Component:** `middleware/services/tts/types/`

### Description
Define all TypeScript types and interfaces that form the contract between the TTS middleware and consuming applications. These are the foundational types used across all providers **and must include all parameters from all providers** (MVP and future) to prevent breaking changes when adding new providers.

### Key Principle: Future-Proofing
**All possible provider parameters must be typed in the interfaces NOW**, even if only Azure (MVP) implements them. This ensures:
- No breaking API changes when adding OpenAI, ElevenLabs, Google, Deepgram
- Consumers can prepare code for future providers
- Clear documentation of what's planned

### Acceptance Criteria

- [ ] **AC1.1** – File `types/common.types.ts` created with all universal types:
  - `enum TTSProvider` with values: `AZURE`, `OPENAI`, `ELEVENLABS`, `GOOGLE`, `DEEPGRAM`
  - `interface TTSSynthesizeRequest` with:
    ```typescript
    {
      text: string;                    // MVP: ✅ Implemented
      provider?: TTSProvider;          // MVP: ✅ Implemented (defaults to default provider)
      voice: {
        id: string;                    // MVP: ✅ Implemented (e.g., "de-DE-KatjaNeural")
      };
      audio?: {
        format?: 'mp3' | 'wav' | 'opus' | 'aac' | 'flac';
        //       MVP: ✅ mp3, wav, opus | Future: 🔮 aac, flac

        speed?: number;                // MVP: ✅ Implemented (0.5 - 2.0)
        pitch?: number;                // Future: 🔮 Google, Azure (-20 to 20)
        volumeGainDb?: number;         // Future: 🔮 Google (-96 to 16)
        sampleRate?: number;           // MVP: ✅ Implemented (8000, 16000, 24000, 48000)
      };
      providerOptions?: Record<string, unknown>;  // For provider-specific params
    }
    ```
  - `interface TTSResponse` with `audio`, `metadata`, `billing` fields
  - `interface TTSVoice` (for future voice catalog) with: `id`, `name`, `language`, `gender`, `provider`
  - `interface TTSVoiceMetadata` with provider-specific voice details

- [ ] **AC1.2** – File `types/provider-options.types.ts` created with **all provider-specific parameter types**:
  ```typescript
  // Azure Parameters (MVP: ✅ emotion, style implemented)
  interface AzureProviderOptions {
    emotion?: 'sad' | 'angry' | 'cheerful' | 'friendly';  // MVP: ✅
    style?: 'chat' | 'customerservice' | 'newscast' | 'assistant';  // MVP: ✅
  }

  // OpenAI Parameters (Future: 🔮)
  interface OpenAIProviderOptions {
    model?: 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';
    responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
  }

  // ElevenLabs Parameters (Future: 🔮)
  interface ElevenLabsProviderOptions {
    model_id?: string;
    stability?: number;           // 0.0 - 1.0
    similarity_boost?: number;    // 0.0 - 1.0
    speaker_boost?: boolean;
    style?: number;              // 0.0 - 1.0 (different from Azure style!)
    use_speaker_boost?: boolean;
  }

  // Google Cloud Parameters (Future: 🔮)
  interface GoogleCloudProviderOptions {
    effectsProfileId?: string[];
    pitchSemitones?: number;
  }

  // Deepgram Parameters (Future: 🔮)
  interface DeepgramProviderOptions {
    model?: string;
    encoding?: 'linear16' | 'mulaw' | 'alaw' | 'opus' | 'aac' | 'mp3';
    container?: 'wav' | 'mp3' | 'opus' | 'flac';
    bitrate?: string;
  }
  ```

- [ ] **AC1.3** – File `types/index.ts` re-exports all types publicly:
  - All types from `common.types.ts`
  - All types from `provider-options.types.ts`
  - Clear distinction between MVP and Future features in comments

- [ ] **AC1.4** – Comprehensive JSDoc documentation:
  - Each interface has `@description` explaining purpose
  - Each field has:
    - Type documentation
    - **MVP Status** (✅ Implemented | 🔮 Future | ⚠️ Partial)
    - Provider(s) that support it
    - Valid value ranges/examples
  - Example:
    ```typescript
    /**
     * Synthesis request for TTS
     * @description Request object for converting text to speech
     *
     * @example
     * const request: TTSSynthesizeRequest = {
     *   text: "Hello world",
     *   provider: TTSProvider.AZURE,
     *   voice: { id: 'en-US-JennyNeural' },
     *   audio: { speed: 1.0 }
     * };
     */
    interface TTSSynthesizeRequest {
      /**
       * Input text to synthesize
       * @MVP ✅ Implemented
       * @example "Hello, how are you?"
       */
      text: string;
      // ... rest of fields
    }
    ```

- [ ] **AC1.5** – Documentation file created: `types/PROVIDER_PARAMETERS.md`
  - Matrix showing which provider supports which parameters
  - MVP status for each feature
  - Implementation timeline/roadmap
  - Example:
    ```markdown
    | Parameter | Azure (MVP) | OpenAI | ElevenLabs | Google | Deepgram |
    |-----------|-------------|--------|------------|--------|----------|
    | speed | ✅ | 🔮 | 🔮 | 🔮 | 🔮 |
    | pitch | 🔮 | ❌ | ❌ | 🔮 | ❌ |
    | emotion | ✅ | ❌ | 🔮 | ❌ | ❌ |
    | stability | ❌ | ❌ | 🔮 | ❌ | ❌ |
    ```

- [ ] **AC1.6** – TypeScript compilation:
  - Strict mode passes: `strict: true`
  - No `any` types
  - All provider-specific types properly discriminated (can use discriminated unions if needed)

- [ ] **AC1.7** – Type safety for future providers:
  - `providerOptions: Record<string, unknown>` allows any provider to add new fields
  - But specific provider types are available for consumers who know which provider they use
  - Example:
    ```typescript
    // Generic (works for any provider)
    const request: TTSSynthesizeRequest = {
      text: "Hello",
      providerOptions: { emotion: 'cheerful' }  // ✅ Works (any string key)
    };

    // Type-safe (for Azure-specific code)
    const azureRequest: TTSSynthesizeRequest = {
      text: "Hello",
      providerOptions: { emotion: 'cheerful', style: 'chat' }  // ✅ Known Azure options
    };
    ```

### Tests
```typescript
// types.test.ts
describe('Types', () => {
  describe('TTSProvider enum', () => {
    - has all expected values: AZURE, OPENAI, ELEVENLABS, GOOGLE, DEEPGRAM
  });

  describe('TTSSynthesizeRequest', () => {
    - accepts minimal request: { text, voice: { id } }
    - accepts full request with all audio options
    - accepts any providerOptions
  });

  describe('TTSResponse', () => {
    - has correct structure: audio, metadata, billing
    - metadata has all required fields
    - billing has characters and optional tokensUsed
  });

  describe('Strict Type Checking', () => {
    - no compilation errors in strict mode
    - cannot assign string to TTSProvider (must be enum)
    - audio options are optional but typed correctly if provided
  });
});
```

### Important Notes
- **This story just defines types**, does not implement functionality
- MVP (Story TTS-004 Azure Provider) will **only use** Azure parameters
- When adding OpenAI (future), **types are already ready**, no changes to base interface needed
- Consumers can rely on these types staying stable long-term
- Comments show MVP status so developers know what's available now vs. later

---

## Story 2: Implement BaseTTSProvider Abstract Class

**Ticket ID:** TTS-002
**Effort:** 3 points
**Priority:** Highest (blocker for provider implementations)
**Component:** `middleware/services/tts/providers/`

### Description
Create the abstract base class that all TTS providers must implement. This defines the contract that ensures consistency across providers.

### Acceptance Criteria

- [ ] **AC2.1** – File `providers/base-tts-provider.ts` created with:
  - Abstract class `BaseTTSProvider`
  - Protected property: `providerName: TTSProvider`
  - Constructor accepting `providerName: TTSProvider`

- [ ] **AC2.2** – Abstract methods defined:
  - `abstract synthesize(text: string, voiceId: string, request: TTSSynthesizeRequest): Promise<TTSResponse>`
  - Must be implemented by all subclasses

- [ ] **AC2.3** – Protected utility methods:
  - `protected getProviderName(): TTSProvider`
  - `protected validateConfig(request: TTSSynthesizeRequest): void` (throws `InvalidConfigError` if invalid)
  - `protected countCharacters(text: string): number` (counts all characters including spaces/newlines)
  - `protected async validateVoiceExists(voiceId: string): Promise<boolean>` (can be overridden by providers)

- [ ] **AC2.4** – Error handling:
  - `InvalidConfigError` is thrown for missing required config
  - `InvalidVoiceError` is thrown for invalid voice IDs
  - Custom error class `TTSError` extends `Error` with `provider` and `code` properties

- [ ] **AC2.5** – JSDoc comments on all methods:
  - Each method has `@param`, `@returns`, `@throws` documentation
  - Example usage shown where helpful

- [ ] **AC2.6** – TypeScript strict mode passes without errors

### Tests
```typescript
// base-tts-provider.test.ts
- Cannot instantiate abstract class directly
- getProviderName() returns correct provider
- validateConfig() throws on missing required fields
- countCharacters() accurately counts text
- Error classes have correct structure
```

---

## Story 3: Implement Character Counting Utility

**Ticket ID:** TTS-003
**Effort:** 2 points
**Priority:** High (required for billing accuracy)
**Component:** `middleware/services/tts/utils/`

### Description
Create accurate character counting utility. This is critical for billing because providers bill per character. The counter must handle edge cases like spaces, punctuation, Unicode characters, and SSML markup.

### Acceptance Criteria

- [ ] **AC3.1** – File `utils/character-counter.utils.ts` created with:
  - `function countCharacters(text: string): number`
  - Returns total character count including spaces, newlines, punctuation
  - Handles Unicode characters correctly (multi-byte characters = 1 count each)

- [ ] **AC3.2** – SSML-aware counting:
  - `function countCharactersWithoutSSML(text: string): number`
  - Removes SSML tags before counting
  - Used internally when middleware generates SSML

- [ ] **AC3.3** – Edge cases handled:
  - Empty strings → returns 0
  - Only whitespace → returns correct count
  - Mixed Unicode (emoji, accents, CJK) → returns 1 per character
  - HTML entities NOT decoded (treated as literal characters)
  - SSML tags like `<speak>`, `<voice>`, `<prosody>` are removed before counting

- [ ] **AC3.4** – Character counting is deterministic:
  - Same input always produces same count
  - Matches Azure's character counting method (verify with Azure docs)

- [ ] **AC3.5** – JSDoc with examples:
  ```typescript
  /**
   * Count characters in text for billing purposes
   * @param text - The input text
   * @returns Character count (including spaces and punctuation)
   * @example
   * countCharacters("Hello, World!") // returns 13
   * countCharacters("Guten Morgen") // returns 12
   */
  ```

### Tests
```typescript
// character-counter.test.ts
describe('countCharacters', () => {
  - "Hello World" → 11
  - "Guten Morgen, wie geht es?" → 27
  - "" → 0
  - "   " → 3
  - "emoji 🎉" → 8
  - "Ä ö ü" → 5
  - "中文" → 2
  - countCharactersWithoutSSML("<speak>Hello</speak>") → 5
  - countCharactersWithoutSSML("<voice name='de-DE-Katja'>Text</voice>") → 4
});
```

---

## Story 4: Implement Azure TTS Provider

**Ticket ID:** TTS-004
**Effort:** 5 points
**Priority:** Highest (core MVP)
**Component:** `middleware/services/tts/providers/`

### Description
Implement the Azure Speech Services provider. This is the MVP provider for EU-compliant TTS synthesis. Handles SSML generation, voice parameter mapping, and Azure-specific features like emotion and style.

### Acceptance Criteria

- [ ] **AC4.1** – File `providers/azure-provider.ts` created extending `BaseTTSProvider`:
  - Constructor initializes with: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` from environment
  - Validates configuration on init (throws error if key/region missing)

- [ ] **AC4.2** – Core synthesis method:
  - `async synthesize(text: string, voiceId: string, request: TTSSynthesizeRequest): Promise<TTSResponse>`
  - Accepts voice ID in format: `de-DE-KatjaNeural`, `en-US-JennyNeural`, etc.
  - Generates SSML from plain text internally
  - Maps `providerOptions` (emotion, style) to SSML
  - Respects `audio.speed` (maps to SSML `<prosody rate>`)

- [ ] **AC4.3** – SSML generation:
  - Converts plain text to valid SSML with proper voice/language tags
  - Integrates emotion and style from `providerOptions`
  - Example SSML output:
    ```xml
    <speak version='1.0' xml:lang='de-DE'>
      <voice xml:lang='de-DE' name='de-DE-KatjaNeural'>
        <prosody rate='1.0'>Guten Morgen</prosody>
      </voice>
    </speak>
    ```
  - Properly escapes XML special characters in text

- [ ] **AC4.4** – Audio format handling:
  - Maps `request.audio.format` to Azure format codes:
    - `mp3` → `audio-16khz-128kbitrate-mono-mp3` (or `audio-24khz-128kbitrate-mono-mp3` if sampleRate specified)
    - `wav` → `riff-24khz-16bit-mono-pcm`
    - `opus` → `ogg-24khz-16bit-mono-opus`
  - Respects `request.audio.sampleRate` (8000, 16000, 24000, 48000)
  - Default format: MP3 at 24kHz

- [ ] **AC4.5** – Response structure:
  - Returns `TTSResponse` with:
    - `audio`: Buffer containing raw MP3/WAV/opus bytes
    - `metadata.provider`: "azure"
    - `metadata.voice`: voiceId used
    - `metadata.duration`: Estimated or actual duration in ms
    - `metadata.audioFormat`: Format used
    - `metadata.sampleRate`: Sample rate used
    - `billing.characters`: Character count of input text (without SSML markup)

- [ ] **AC4.6** – Provider-specific options:
  - Supports `providerOptions.emotion`: 'sad', 'angry', 'cheerful', 'friendly'
  - Supports `providerOptions.style`: 'chat', 'customerservice', 'newscast', 'assistant'
  - Silently ignores unsupported provider options (no error)
  - Invalid emotion/style values throw `TTSError`

- [ ] **AC4.7** – Error handling:
  - `InvalidVoiceError` if voice doesn't exist in Azure
  - `InvalidConfigError` if key/region missing
  - `ProviderUnavailableError` if Azure API returns 503
  - `QuotaExceededError` if 429 rate limit hit
  - Network errors are wrapped in descriptive `TTSError`

- [ ] **AC4.8** – Configuration validation:
  - On first call, verify Azure credentials work (test auth)
  - Cache voice list after first successful call (for future voice lookup)
  - Throw clear errors if AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not set

- [ ] **AC4.9** – Logging:
  - Log request/response with appropriate levels:
    - `info`: Successful synthesis with character count
    - `error`: API errors with full error context
    - `debug`: SSML generated, voice mapping, format selection

### Tests
```typescript
// azure-provider.test.ts
describe('AzureProvider', () => {
  describe('Configuration', () => {
    - throws InvalidConfigError if AZURE_SPEECH_KEY missing
    - throws InvalidConfigError if AZURE_SPEECH_REGION missing
    - succeeds if both env vars set
  });

  describe('Synthesis', () => {
    - synthesize with valid voice succeeds (mock API)
    - returned buffer is not empty
    - returned metadata matches request
  });

  describe('SSML Generation', () => {
    - plain text is wrapped in SSML tags
    - emotion parameter maps to SSML style attribute
    - style parameter maps to SSML style attribute
    - special characters (<, >, &) are escaped
    - speed parameter maps to prosody rate
  });

  describe('Character Counting', () => {
    - returns character count without SSML tags
    - matches expected count for various inputs
  });

  describe('Error Handling', () => {
    - throws InvalidVoiceError for invalid voice ID
    - throws ProviderUnavailableError on 503
    - throws QuotaExceededError on 429
    - wraps network errors descriptively
  });

  describe('Audio Format Mapping', () => {
    - 'mp3' maps to correct Azure format
    - 'wav' maps to correct Azure format
    - 'opus' maps to correct Azure format
    - sampleRate influences format selection
  });
});
```

---

## Story 5: Implement TTSService Orchestrator

**Ticket ID:** TTS-005
**Effort:** 3 points
**Priority:** Highest (exposes middleware API)
**Component:** `middleware/services/tts/`

### Description
Create the main service that orchestrates provider access. This is the API that consuming applications use. Analogous to `LLMService` in the LLM middleware.

### Acceptance Criteria

- [ ] **AC5.1** – File `tts.service.ts` created with class `TTSService`:
  - Singleton pattern (single instance for entire app)
  - Private provider registry: `Map<TTSProvider, BaseTTSProvider>`

- [ ] **AC5.2** – Constructor:
  - Initializes provider registry with `AzureProvider` (MVP)
  - Sets default provider to `AZURE` (can be overridden via env: `TTS_DEFAULT_PROVIDER`)
  - Validates all initialized providers on startup

- [ ] **AC5.3** – Core method: `synthesize()`
  - Signature: `async synthesize(request: TTSSynthesizeRequest): Promise<TTSResponse>`
  - Uses `request.provider` or falls back to `defaultProvider`
  - Delegates to appropriate provider instance
  - Returns raw `TTSResponse` from provider

- [ ] **AC5.4** – Provider management:
  - `getProvider(provider: TTSProvider): BaseTTSProvider` – returns provider or throws
  - `setDefaultProvider(provider: TTSProvider): void` – sets default (validates existence)
  - `getDefaultProvider(): TTSProvider` – returns current default
  - `getAvailableProviders(): TTSProvider[]` – returns array of registered providers

- [ ] **AC5.5** – Error handling:
  - Throws descriptive error if provider not found
  - Re-throws provider errors with context
  - Logs all synthesis attempts (info level on success, error level on failure)

- [ ] **AC5.6** – Singleton export:
  - File `tts.service.ts` exports: `export const ttsService = new TTSService();`
  - Exported at end of file after all setup

- [ ] **AC5.7** – JSDoc documentation:
  - Each method fully documented with `@param`, `@returns`, `@throws`
  - Usage examples provided in method docs

### Tests
```typescript
// tts.service.test.ts
describe('TTSService', () => {
  describe('Initialization', () => {
    - singleton pattern: ttsService === ttsService
    - default provider is AZURE
    - can read TTS_DEFAULT_PROVIDER from env
  });

  describe('Provider Management', () => {
    - getProvider(AZURE) returns AzureProvider instance
    - getProvider(UNKNOWN) throws error
    - setDefaultProvider(OPENAI) succeeds if OPENAI registered
    - setDefaultProvider(UNKNOWN) throws error
    - getAvailableProviders() returns [AZURE] for MVP
  });

  describe('Synthesis', () => {
    - synthesize() with provider specified uses that provider
    - synthesize() without provider uses default
    - response structure matches TTSResponse interface
    - errors from provider are re-thrown
  });
});
```

---

## Story 6: Create Public API Exports & Index

**Ticket ID:** TTS-006
**Effort:** 1 point
**Priority:** High (unblocks consumer apps)
**Component:** `middleware/services/tts/`

### Description
Create proper exports so consuming applications can import TTS types and service with clean APIs.

### Acceptance Criteria

- [ ] **AC6.1** – File `middleware/services/tts/index.ts` created with exports:
  - `export { TTSProvider, TTSSynthesizeRequest, TTSResponse, TTSVoice } from './types'`
  - `export { BaseTTSProvider } from './providers/base-tts-provider'`
  - `export { AzureProvider } from './providers/azure-provider'`
  - `export { ttsService } from './tts.service'`
  - `export type * from './types'`

- [ ] **AC6.2** – Main middleware index updated:
  - File `middleware/index.ts` includes TTS exports:
    - `export * from './services/tts'`

- [ ] **AC6.3** – Import paths work for consumers:
  - `import { ttsService, TTSProvider } from '@middleware/tts'` ✅
  - `import { TTSSynthesizeRequest } from '@middleware/tts'` ✅
  - No circular dependencies

- [ ] **AC6.4** – README created:
  - File `middleware/services/tts/README.md` with:
    - Feature overview
    - Supported providers
    - Basic usage example
    - Provider configuration

### Tests
```typescript
// import.test.ts
- import { ttsService } succeeds
- import { TTSProvider } succeeds
- import { TTSResponse } succeeds
- ttsService is instanceof TTSService
```

---

## Story 7: Setup Configuration & Environment

**Ticket ID:** TTS-007
**Effort:** 2 points
**Priority:** High (needed for local testing)
**Component:** `middleware/shared/config/`

### Description
Configure TTS settings, environment variables, and defaults. Extend existing config system to include TTS.

### Acceptance Criteria

- [ ] **AC7.1** – Create `middleware/shared/config/tts.config.ts`:
  - `TTS_CONFIG` object with:
    - `AZURE.REGION`: Read from `AZURE_SPEECH_REGION` env (default: `germanywestcentral`)
    - `AZURE.KEY`: Read from `AZURE_SPEECH_KEY` env
    - `AZURE.ENDPOINT`: Read from `AZURE_SPEECH_ENDPOINT` env (or derive from region)
    - `AZURE.DSGVO_COMPLIANT`: Set to `true`
    - `AZURE.FREE_TIER_CHARS_PER_MONTH`: `500_000`
    - `DEFAULT_PROVIDER`: Read from `TTS_DEFAULT_PROVIDER` env (default: `AZURE`)

- [ ] **AC7.2** – Validation:
  - `validateTTSConfig()` function checks required env vars on app startup
  - Throws clear error if `AZURE_SPEECH_KEY` not set
  - Throws clear error if `AZURE_SPEECH_REGION` not set
  - Warning if region is not EU-compliant (not `germanywestcentral`)

- [ ] **AC7.3** – Update `.env.example`:
  ```
  AZURE_SPEECH_KEY=your_key_here
  AZURE_SPEECH_REGION=germanywestcentral
  AZURE_SPEECH_ENDPOINT=https://germanywestcentral.tts.speech.microsoft.com
  TTS_DEFAULT_PROVIDER=azure
  ```

- [ ] **AC7.4** – Update `middleware/shared/config/index.ts`:
  - Export `TTS_CONFIG` alongside other configs
  - Include `validateTTSConfig()` in overall config validation

- [ ] **AC7.5** – Logging:
  - Log TTS configuration on app startup (without exposing secret key)
  - Example: `TTS configured: AZURE (region: germanywestcentral, DSGVO-compliant)`

### Tests
```typescript
// tts.config.test.ts
- validateTTSConfig() succeeds with required env vars
- validateTTSConfig() throws if AZURE_SPEECH_KEY missing
- validateTTSConfig() throws if AZURE_SPEECH_REGION missing
- validateTTSConfig() warns if region not EU
- TTS_CONFIG.AZURE has all required properties
```

---

## Story 8: Comprehensive Testing & Documentation

**Ticket ID:** TTS-008
**Effort:** 8 points (extended from 5 - now includes detailed coverage requirements + gap analysis + CI/CD setup)
**Priority:** High (ensures quality & production-readiness)
**Component:** Tests & Docs

### Description
Create unit tests for all components, integration tests, and comprehensive documentation.

### Acceptance Criteria

- [ ] **AC8.1** – Unit Tests Coverage (Target: >80% overall):

  **Coverage Requirements Per File:**

  ```
  types.test.ts (Target: 100%)
    ├─ TTSProvider enum: all values tested
    ├─ TTSSynthesizeRequest: minimal request, full request, optional fields
    ├─ TTSResponse: structure validation, all nested objects
    └─ Provider-specific types: AzureProviderOptions, OpenAIProviderOptions, etc.

  character-counter.test.ts (Target: 100%)
    ├─ countCharacters(): basic strings, empty, whitespace, Unicode, emoji
    ├─ countCharactersWithoutSSML(): SSML removal, nested tags, special chars
    ├─ Edge cases: newlines, tabs, mixed Unicode, CJK characters
    └─ Performance: no timeouts on large texts (10k+ chars)

  base-tts-provider.test.ts (Target: 90%)
    ├─ Constructor: sets provider name correctly
    ├─ Abstract method contract: cannot instantiate directly
    ├─ validateConfig(): validates all required fields
    ├─ countCharacters(): delegates correctly
    ├─ Error classes: TTSError, InvalidConfigError, InvalidVoiceError
    ├─ getProviderName(): returns correct provider
    └─ Error handling: all error cases throw correct error types

  azure-provider.test.ts (Target: 85%)
    ├─ Configuration:
    │  ├─ Missing AZURE_SPEECH_KEY → throws InvalidConfigError
    │  ├─ Missing AZURE_SPEECH_REGION → throws InvalidConfigError
    │  └─ Valid config → initializes successfully
    ├─ SSML Generation:
    │  ├─ Plain text wrapped in <speak> tags
    │  ├─ Voice name inserted correctly
    │  ├─ Language code set from voice ID
    │  ├─ Special characters escaped (&, <, >, ")
    │  ├─ Emotion maps to prosody style attribute
    │  ├─ Style maps to SSML style tag
    │  └─ Speed maps to prosody rate value (0.5, 1.0, 2.0)
    ├─ Synthesis:
    │  ├─ Valid voice → returns TTSResponse with audio buffer
    │  ├─ Invalid voice ID → throws InvalidVoiceError
    │  ├─ Network error → wrapped in TTSError with context
    │  ├─ HTTP 429 → throws QuotaExceededError
    │  ├─ HTTP 503 → throws ProviderUnavailableError
    │  └─ Empty text → throws appropriate error
    ├─ Audio Format:
    │  ├─ mp3 → correct Azure format string
    │  ├─ wav → correct Azure format string
    │  ├─ opus → correct Azure format string
    │  ├─ With sampleRate → format includes rate
    │  └─ Invalid format → throws error
    ├─ Response Structure:
    │  ├─ audio is Buffer and not empty
    │  ├─ metadata.provider = "azure"
    │  ├─ metadata.voice matches input
    │  ├─ metadata.audioFormat matches request
    │  ├─ metadata.sampleRate matches or defaults
    │  ├─ billing.characters = correct count
    │  └─ billing.tokensUsed is undefined (Azure doesn't use tokens)
    └─ Provider Options:
       ├─ emotion accepted for Azure
       ├─ style accepted for Azure
       ├─ invalid emotion → throws TTSError
       ├─ invalid style → throws TTSError
       └─ unknown options → silently ignored

  tts.service.test.ts (Target: 85%)
    ├─ Singleton:
    │  ├─ ttsService === ttsService (same instance)
    │  └─ No multiple instances created
    ├─ Provider Management:
    │  ├─ getProvider(AZURE) → returns AzureProvider instance
    │  ├─ getProvider(UNKNOWN) → throws error with helpful message
    │  ├─ setDefaultProvider(AZURE) → updates default
    │  ├─ setDefaultProvider(UNKNOWN) → throws error
    │  ├─ getDefaultProvider() → returns current default
    │  └─ getAvailableProviders() → returns [AZURE] for MVP
    ├─ Synthesis:
    │  ├─ synthesize({ provider: AZURE }) → uses Azure provider
    │  ├─ synthesize({}) → uses default provider
    │  ├─ synthesize with all options → passes to provider correctly
    │  └─ Provider error → re-thrown with context
    ├─ Error Handling:
    │  ├─ Invalid provider in request → throws error
    │  ├─ Provider not registered → throws error
    │  └─ Provider errors propagate with context
    └─ Concurrency:
       └─ Multiple concurrent synthesize() calls succeed
  ```

  **Coverage Tools Setup:**
  - [ ] Jest configured with coverage: `npm run test:coverage`
  - [ ] Coverage reports in HTML: `coverage/index.html`
  - [ ] CI/CD pipeline validates >80% coverage
  - [ ] `nyc` or Jest threshold configured:
    ```json
    {
      "coverageThreshold": {
        "global": {
          "branches": 80,
          "functions": 80,
          "lines": 80,
          "statements": 80
        }
      }
    }
    ```

- [ ] **AC8.2** – Integration Tests (Target: >80% coverage):
  ```
  integration.test.ts
    ├─ Happy Path:
    │  ├─ Full synthesis flow: text → SSML → Azure API (mocked) → Buffer
    │  ├─ Response structure complete and valid
    │  ├─ Character count accurate for various text types
    │  ├─ Multiple languages (German, English)
    │  └─ Provider switching works end-to-end
    ├─ Error Scenarios:
    │  ├─ Missing config → initialization fails with helpful error
    │  ├─ Invalid voice → error propagates with context
    │  ├─ Network timeout → wrapped in TTSError
    │  ├─ Rate limit (429) → QuotaExceededError
    │  └─ Service unavailable (503) → ProviderUnavailableError
    ├─ Concurrency:
    │  ├─ 10 parallel requests succeed
    │  ├─ No race conditions
    │  └─ Response counts all correct
    ├─ Memory:
    │  ├─ No memory leaks on repeated synthesis
    │  └─ Buffers properly released
    └─ Performance:
       ├─ Single request < 100ms (mocked)
       ├─ 100 concurrent requests < 5s total
       └─ Large text (10k chars) completes without timeout
  ```

- [ ] **AC8.3** – Mocking Strategy:
  - [ ] Azure SDK mocked (no real API calls in tests):
    ```typescript
    // Mock setup example
    jest.mock('@azure/cognitiveservices-speech', () => ({
      SpeechConfig: jest.fn(),
      SpeechSynthesizer: jest.fn(() => ({
        speakTextAsync: jest.fn((ssml, callback) => {
          callback(mockSuccessResponse);
        })
      }))
    }));
    ```
  - [ ] Mock fixtures for success, error, timeout scenarios
  - [ ] Error response fixtures:
    - 400 Bad Request
    - 401 Unauthorized
    - 429 Rate Limited
    - 503 Service Unavailable
    - Network timeout
  - [ ] Deterministic: mocks always return same data for same input

- [ ] **AC8.4** – Documentation:
  - `README.md` in `middleware/services/tts/`:
    - Feature overview
    - Quick start guide
    - Configuration requirements
    - Supported providers table
    - Usage examples (minimal, typical, advanced)
    - Error handling guide
    - Cost tracking explanation

- [ ] **AC8.5** – Code Comments:
  - Complex logic documented with inline comments
  - SSML generation logic explained
  - Character counting edge cases documented

- [ ] **AC8.6** – JSDoc Complete:
  - All public methods have JSDoc
  - All interfaces documented
  - Examples shown for complex methods

- [ ] **AC8.7** – Test Execution & Reporting:
  - [ ] Package.json scripts configured:
    ```json
    {
      "scripts": {
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage",
        "test:ci": "jest --ci --coverage --maxWorkers=2"
      }
    }
    ```
  - [ ] All tests pass: `npm run test` exits with code 0
  - [ ] Coverage report generated: `npm run test:coverage`
    - HTML report at `coverage/index.html`
    - Terminal report shows all metrics
    - Summary shows:
      - ✅ Lines: >80%
      - ✅ Functions: >80%
      - ✅ Branches: >80%
      - ✅ Statements: >80%
  - [ ] No test flakiness:
    - Tests are deterministic (same result every run)
    - No timing-dependent assertions
    - No random data generation (use seeds if needed)
    - `npm run test` can run 10x consecutively without failure
  - [ ] CI/CD Integration:
    - GitHub Actions / GitLab CI configured
    - Coverage reports uploaded to coverage tool (e.g., Codecov)
    - PR blocks if coverage < 80%
    - Test failures block merge

- [ ] **AC8.8** – Coverage Gap Analysis & Documentation:
  - [ ] Coverage report analyzed for gaps:
    - Any file < 80% coverage identified
    - Reason for gaps documented (e.g., "error handling in untestable Azure API")
    - Plan to improve documented (if applicable)
  - [ ] Coverage by story documented:
    ```
    TTS-001 Types: 100% ✅
    TTS-002 BaseTTSProvider: 90% ✅
    TTS-003 CharacterCounter: 100% ✅
    TTS-004 AzureProvider: 85% ✅
    TTS-005 TTSService: 85% ✅
    TTS-006 Exports: N/A (re-exports only)
    TTS-007 Config: 80% ✅
    TTS-008 Tests: N/A (test code)
    ---
    TOTAL: 87% ✅ (exceeds 80% target)
    ```
  - [ ] Trend documented:
    - `coverage.json` committed to track over time
    - Coverage should not decrease between releases
  - [ ] Critical paths are 100% covered:
    - Character counting (billing-critical)
    - Error handling (all error paths)
    - SSML generation (Azure-specific logic)

### Tests
```typescript
// Integration tests
describe('TTS Middleware - Integration', () => {
  - end-to-end synthesis with mocked Azure
  - response has correct structure
  - character count is accurate
  - error scenarios handled
  - concurrent requests work
});
```

---

## Implementation Order

**Recommended execution order** (allows parallel work in bold):

1. **TTS-001** – Define types (blocker)
2. **TTS-002** – BaseTTSProvider (blocker)
3. **TTS-003** + **TTS-007** – Character Counter + Config (can run parallel)
4. **TTS-004** – AzureProvider (depends on 1, 2, 3)
5. **TTS-005** – TTSService (depends on 1, 2, 4)
6. **TTS-006** – Exports (depends on 4, 5)
7. **TTS-008** – Tests & Docs (depends on all)

---

## Acceptance Criteria Summary Checklist

### Before Merging PR:
- [ ] All ACs for the story are marked complete
- [ ] **Tests pass AND coverage >80% for that story** (verified via `npm run test:coverage`)
  - Per-story coverage documented in coverage report
  - No decrease in overall coverage
- [ ] **Critical paths 100% covered** (character counting, error handling, SSML generation)
- [ ] No TypeScript errors in strict mode
- [ ] Code reviewed by at least one team member
- [ ] Documentation updated (README, JSDoc, inline comments)
- [ ] No breaking changes to existing middleware
- [ ] All tests are deterministic (no flaky tests)

### Before Release:
- [ ] All 8 stories complete
- [ ] **Overall coverage >80%** (all files combined)
  - `npm run test:coverage` output shows ✅ on all metrics (lines, functions, branches, statements)
  - Coverage report committed with baseline
  - Gap analysis completed and documented
- [ ] Unit tests pass: `npm run test`
- [ ] Integration tests pass: `npm run test:coverage`
- [ ] Manual testing with real Azure API (using test key)
- [ ] Configuration validated with real Azure credentials
- [ ] Performance benchmarked:
  - Single synthesis request < 2s (real Azure)
  - 100 concurrent requests < 5s (mocked)
  - No memory leaks detected
- [ ] Documentation reviewed
- [ ] PRD requirements fully implemented
- [ ] CI/CD pipeline configured and validating coverage
- [ ] Coverage trend documented (should not decrease in future)

---

## Testing Checklist Template

```typescript
// test-template.test.ts
describe('Feature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Happy Path', () => {
    test('AC-X.X: should do X', () => {
      // Arrange
      // Act
      // Assert
    });
  });

  describe('Error Cases', () => {
    test('AC-X.X: should throw Y on Z', () => {
      // Arrange
      // Act
      // Assert
    });
  });

  describe('Edge Cases', () => {
    test('AC-X.X: should handle X correctly', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

---

**Document Status:** Ready for development
**Next Step:** Begin Story TTS-001 (Types & Interfaces)

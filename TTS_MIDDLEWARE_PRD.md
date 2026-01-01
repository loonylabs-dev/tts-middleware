# TTS Middleware - Product Requirements Document

**Version:** 1.0
**Status:** Draft - Ready for Implementation Planning
**Created:** 2025-12-31
**Owner:** Architecture Team

---

## 1. Executive Summary

Build a **provider-agnostic Text-to-Speech middleware** analogous to the existing LLM middleware. This middleware abstracts multiple TTS providers (Azure, OpenAI, ElevenLabs, Google, Deepgram) behind a unified API, allowing applications to:

- Switch between providers transparently
- Support multiple languages and voice options
- Bill usage based on character/token consumption (delegated to consuming application)
- Scale to additional providers without changing consumer code

**MVP Scope:** Azure Speech Services (EU-compliant, free tier)
**Roadmap:** OpenAI, ElevenLabs, Google Cloud, Deepgram, and gateway solutions

---

## 2. Architecture Overview

### 2.1 Design Pattern

```
BaseTTSProvider (abstract)
    ↓
├─ AzureProvider
├─ OpenAIProvider
├─ ElevenLabsProvider
├─ GoogleProvider
├─ DeepgramProvider
└─ ...additional providers

TTSService (Orchestrator - singleton)
    ├─ Provider Registry & Management
    ├─ Default Provider Configuration
    └─ Unified API for all providers

Consumer Application
    ├─ Calls: ttsService.synthesize()
    ├─ Receives: audio buffer + billing metadata
    └─ Calculates: costs based on characters/tokens
```

### 2.2 Parallel to LLM Middleware

| Aspect | LLM Middleware | TTS Middleware |
|--------|---|---|
| **Base Class** | `BaseLLMProvider` | `BaseTTSProvider` |
| **Orchestrator** | `LLMService` | `TTSService` |
| **Configuration** | Model name, options | Voice ID, audio format, speed |
| **Billing Data** | `{ inputTokens, outputTokens }` | `{ characters, tokensUsed? }` |
| **Cost Calculation** | Consumer app (knows rates) | Consumer app (knows rates) |
| **Singleton Export** | `export const llmService = new LLMService()` | `export const ttsService = new TTSService()` |

---

## 3. API Contract

### 3.1 Request Interface

```typescript
interface TTSSynthesizeRequest {
  text: string;
  provider?: TTSProvider;  // optional, uses default if omitted
  voice: {
    id: string;            // e.g., "de-DE-KatjaNeural", "voice_xyz"
  };
  audio?: {
    format?: 'mp3' | 'wav' | 'opus';
    speed?: number;        // 0.5 - 2.0 (universal across providers)
    sampleRate?: number;   // 8000 | 16000 | 24000 | 48000
  };
  providerOptions?: Record<string, unknown>;  // provider-specific params
}
```

### 3.2 Response Interface

```typescript
interface TTSResponse {
  audio: Buffer;
  metadata: {
    provider: string;
    voice: string;
    duration: number;      // milliseconds
    audioFormat: string;   // 'mp3', 'wav', etc.
    sampleRate: number;    // Hz
  };
  billing: {
    characters: number;    // Input text character count (consumer app uses this)
    tokensUsed?: number;   // Only for token-based providers (e.g., OpenAI gpt-4o-mini-tts)
  };
}
```

### 3.3 Service Methods

```typescript
export class TTSService {
  // Core synthesis
  public async synthesize(
    request: TTSSynthesizeRequest
  ): Promise<TTSResponse>

  // Provider management
  public getProvider(provider: TTSProvider): BaseTTSProvider
  public setDefaultProvider(provider: TTSProvider): void
  public getDefaultProvider(): TTSProvider
  public getAvailableProviders(): TTSProvider[]

  // List supported voices for a provider (Future)
  // public async listVoices(provider: TTSProvider): Promise<Voice[]>
}
```

### 3.4 Consumer Application Example

```typescript
import { ttsService, TTSProvider } from '@middleware/tts';

// Synthesis
const response = await ttsService.synthesize({
  text: "Guten Morgen, wie geht es dir?",
  provider: TTSProvider.AZURE,
  voice: { id: 'de-DE-KatjaNeural' },
  audio: {
    speed: 1.0,
    sampleRate: 24000,
    format: 'mp3'
  }
});

// Consumer app handles cost calculation
const costUSD = (response.billing.characters / 1_000_000) * 16;  // $16 per 1M chars for Azure

// Use the audio
fs.writeFileSync('output.mp3', response.audio);
```

---

## 4. Provider Details

### 4.1 Supported Providers (MVP → Roadmap)

#### MVP: Microsoft Azure (EU-Compliant, Free Tier)

**Configuration:**
- Environment: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`
- Region: `germanywestcentral` (Frankfurt) for GDPR compliance
- Free Tier: 500,000 characters/month

**Billing Model:** Character-based (~$16 per 1M characters)

**Provider Options:**
- `emotion`: 'sad', 'angry', 'cheerful', 'friendly' (Azure-specific)
- `style`: 'chat', 'customerservice', 'newscast', 'assistant' (Azure-specific)

**Voices:** ~180 voices across languages
**SSML Support:** Yes (internal only, not exposed to consumers)

---

#### Roadmap: OpenAI TTS

**Billing Model:** Character-based (~$15 per 1M characters) OR Token-based (gpt-4o-mini-tts)

**Voices:** Limited set (6 standard voices) but high quality

**Provider Options:** None (OpenAI intentionally minimal)

---

#### Roadmap: ElevenLabs

**Billing Model:** Character-based (~$150-200 per 1M characters depending on plan)

**Voices:** 500+ voices, voice cloning capability

**Provider Options:**
- `stability`: 0.0 - 1.0
- `similarity_boost`: 0.0 - 1.0

---

#### Roadmap: Google Cloud TTS

**Billing Model:** Character-based (~$16 per 1M characters)

**Voices:** 400+ voices, extensive language support

**Provider Options:** None exposed (defaults used)

---

#### Roadmap: Deepgram (EU-compliant)

**Configuration:** Use `api.eu.deepgram.com` for EU data residency

**Billing Model:** Character-based (~$15 per 1M characters)

**Voices:** Limited but high quality, optimized for latency

---

### 4.2 Provider Implementation Requirements

Each provider must:

```typescript
export abstract class BaseTTSProvider {
  protected providerName: TTSProvider;

  abstract synthesize(
    text: string,
    voiceId: string,
    options: TTSSynthesizeRequest,
    providerOptions?: Record<string, unknown>
  ): Promise<TTSResponse>;

  protected validateConfig(options: TTSSynthesizeRequest): void;
  protected countCharacters(text: string): number;
  protected countTokens?(text: string): number;  // Optional, if token-based
}
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (MVP)

#### 1.1 Project Structure
```
llm-middleware/src/middleware/services/tts/
├── providers/
│   ├── base-tts-provider.ts
│   ├── azure-provider.ts
│   └── index.ts
├── types/
│   ├── common.types.ts
│   ├── azure.types.ts
│   └── index.ts
├── utils/
│   ├── character-counter.utils.ts
│   └── index.ts
├── tts.service.ts
├── index.ts
└── README.md
```

#### 1.2 Core Files (MVP)

1. **types/common.types.ts**
   - `TTSProvider` enum
   - `TTSSynthesizeRequest` interface
   - `TTSResponse` interface
   - `TTSVoice` interface (for future voice catalog)

2. **providers/base-tts-provider.ts**
   - Abstract class with contract for all providers
   - Methods: `synthesize()`, `validateConfig()`, `countCharacters()`

3. **providers/azure-provider.ts**
   - Azure Speech Services implementation
   - SSML generation from plain text
   - Character counting (including SSML markup)
   - Voice parameter mapping (emotion, style)

4. **utils/character-counter.utils.ts**
   - Accurate character counting (spaces, punctuation, etc.)
   - SSML-aware counting (for internal SSML generation)

5. **tts.service.ts** (Orchestrator)
   - Provider registry (Map of providers)
   - `synthesize()` method
   - `setDefaultProvider()`, `getProvider()`
   - Singleton export

6. **index.ts**
   - Public API exports
   - `TTSProvider` enum
   - `TTSSynthesizeRequest`, `TTSResponse`
   - `ttsService` singleton

#### 1.3 Configuration

```typescript
// .env
AZURE_SPEECH_KEY=xxx
AZURE_SPEECH_REGION=germanywestcentral
TTS_DEFAULT_PROVIDER=azure

// middleware/shared/config/models.config.ts (extend existing)
export const TTS_PROVIDERS = {
  AZURE: {
    region: process.env.AZURE_SPEECH_REGION,
    key: process.env.AZURE_SPEECH_KEY,
    freeCharactersPerMonth: 500000,
  },
  // ... other providers (empty for now)
};
```

#### 1.4 Error Handling

```typescript
class TTSError extends Error {
  constructor(
    public provider: string,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

// Specific errors
class InvalidVoiceError extends TTSError {}
class InvalidConfigError extends TTSError {}
class QuotaExceededError extends TTSError {}
class ProviderUnavailableError extends TTSError {}
```

---

### Phase 2: Additional Providers

#### 2.1 OpenAI TTS
- Character-based billing + optional token-counting
- Simple implementation (no SSML needed)
- Add token estimator (similar to LLM middleware)

#### 2.2 ElevenLabs
- Provider options (stability, similarity_boost)
- Streaming support (for later)
- Voice cloning API (for future)

#### 2.3 Google Cloud & Deepgram
- Google: Full feature parity
- Deepgram: EU endpoint support

---

### Phase 3: Future Enhancements

- [ ] Voice Catalog Service (cache voices, list by language/quality)
- [ ] SSML Support (consumers can pass SSML)
- [ ] Streaming Output (WebSocket/chunked responses)
- [ ] Batch Synthesis API (multiple texts in one request)
- [ ] Voice Quality Recommendations (suggest best voice for language/use-case)
- [ ] Analytics & Monitoring
- [ ] Gateway Integration (Eden AI, Sieve, UnifiedTTS)

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Per Provider:**
- Configuration validation
- Character/token counting accuracy
- SSML generation (Azure)
- Response parsing
- Error handling (invalid voice, auth failure, etc.)

**TTSService:**
- Provider registration/retrieval
- Default provider management
- Fallback scenarios (for future fallback feature)

### 6.2 Integration Tests

- End-to-end synthesis with real Azure API (mocked for CI/CD)
- Response buffer integrity
- Billing metadata accuracy

### 6.3 Mocking

```typescript
// Mock Azure response
jest.mock('@azure/cognitiveservices-speech', () => ({
  SpeechConfig: jest.fn(),
  SpeechSynthesizer: jest.fn(() => ({
    speakTextAsync: jest.fn((text, callback) => {
      callback({
        audioData: Buffer.from('mock-audio')
      });
    })
  }))
}));
```

---

## 7. Billing & Cost Tracking

### 7.1 Character Counting

```typescript
function countCharacters(text: string): number {
  // Simple: count all characters including spaces, punctuation, newlines
  // SSML-aware: remove markup before counting (if SSML is pre-generated)
  return text.replace(/<[^>]*>/g, '').length;
}
```

### 7.2 Consumer Application Responsibility

```typescript
// Example in consuming app:
const PROVIDER_RATES = {
  [TTSProvider.AZURE]: 16 / 1_000_000,      // $16 per 1M chars
  [TTSProvider.OPENAI_TTS1]: 15 / 1_000_000, // $15 per 1M chars
  [TTSProvider.ELEVENLABS]: 160 / 1_000_000, // $160 per 1M chars
};

async function synthesizeAndTrackCost(text, provider) {
  const response = await ttsService.synthesize({
    text,
    provider,
    voice: { id: '...' }
  });

  const costUSD = response.billing.characters * PROVIDER_RATES[provider];

  // Log to analytics, bill user, etc.
  await analytics.track({
    event: 'tts_synthesis',
    provider,
    characters: response.billing.characters,
    costUSD
  });

  return response;
}
```

---

## 8. Configuration & Environment

```typescript
// middleware/shared/config/index.ts (extend)
export const TTS_CONFIG = {
  AZURE: {
    REGION: process.env.AZURE_SPEECH_REGION || 'germanywestcentral',
    KEY: process.env.AZURE_SPEECH_KEY,
    ENDPOINT: process.env.AZURE_SPEECH_ENDPOINT,
    DSGVO_COMPLIANT: true,
    FREE_TIER_CHARS_PER_MONTH: 500_000,
  },
  DEFAULT_PROVIDER: 'azure',
  // ... other providers
};
```

---

## 9. API Documentation

### 9.1 Example: Simple Synthesis

```typescript
import { ttsService, TTSProvider } from '@middleware/tts';

const response = await ttsService.synthesize({
  text: "Willkommen bei unserem Service",
  provider: TTSProvider.AZURE,
  voice: { id: 'de-DE-KatjaNeural' }
});

// response.audio: Buffer (binary MP3 data)
// response.billing.characters: 27
```

### 9.2 Example: With Audio Options

```typescript
const response = await ttsService.synthesize({
  text: "This is a slower speech example",
  provider: TTSProvider.AZURE,
  voice: { id: 'en-US-JennyNeural' },
  audio: {
    speed: 0.8,        // 20% slower
    sampleRate: 24000, // High quality
    format: 'mp3'
  }
});
```

### 9.3 Example: With Provider-Specific Options (Azure)

```typescript
const response = await ttsService.synthesize({
  text: "I'm so happy!",
  provider: TTSProvider.AZURE,
  voice: { id: 'en-US-JennyNeural' },
  audio: { speed: 1.0 },
  providerOptions: {
    emotion: 'cheerful',
    style: 'chat'
  }
});
```

---

## 10. Success Criteria

### MVP (Azure only)
- ✅ Middleware successfully abstracts Azure Speech Services
- ✅ Character counting is accurate
- ✅ Response includes correct billing metadata
- ✅ All error cases are handled
- ✅ Unit tests have >80% coverage
- ✅ Documentation is complete

### Full Feature Release (All Providers)
- ✅ At least 3 additional providers implemented
- ✅ Provider switching works seamlessly
- ✅ Cost calculation in consuming apps is straightforward
- ✅ Voice catalog is cached efficiently
- ✅ Performance benchmarks met (< 2s synthesis for typical text)

---

## 11. Non-Goals (MVP)

- ❌ Streaming output (Buffer only)
- ❌ Voice Catalog API (manual voice ID selection)
- ❌ SSML consumer input (internal SSML only for Azure)
- ❌ Fallback provider logic (consumer app decides)
- ❌ Cost estimation before synthesis
- ❌ Gateway aggregators (Eden AI, Sieve) – direct APIs only

---

## 12. References

- **RealtimeTTS** (Open-source TTS aggregator): https://github.com/KoljaB/RealtimeTTS
- **Azure Speech Services**: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/
- **OpenAI TTS**: https://platform.openai.com/docs/guides/text-to-speech
- **ElevenLabs TTS**: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- **Google Cloud TTS**: https://docs.cloud.google.com/text-to-speech/docs/
- **Deepgram TTS**: https://developers.deepgram.com/docs/tts-rest

---

## 13. Appendix: Provider Capabilities Matrix

| Feature | Azure | OpenAI | ElevenLabs | Google | Deepgram |
|---------|-------|--------|------------|--------|----------|
| **Char Billing** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Token Billing** | ❌ | ⚠️ (gpt-4o-mini-tts only) | ❌ | ❌ | ❌ |
| **Speed Control** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pitch Control** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Emotion/Style** | ✅ | ❌ | ⚠️ (limited) | ❌ | ❌ |
| **Streaming** | ✅ | ⚠️ (chunks only) | ✅ | ❌ | ✅ |
| **SSML Support** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **EU Hosting** | ✅ (Frankfurt) | ⚠️ (US default) | ⚠️ (on request) | ⚠️ (EU available) | ✅ (api.eu.*) |
| **DPA/GDPR** | ✅ | ⚠️ (available) | ⚠️ (available) | ✅ | ✅ |
| **Free Tier** | 500k/month | ❌ | 10k/month | 1M/month | ❌ |

---

**Document Status:** Ready for technical planning and implementation
**Next Step:** Create detailed implementation plan with task breakdown

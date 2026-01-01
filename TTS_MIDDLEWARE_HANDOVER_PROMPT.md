# TTS Middleware Implementation - Complete Context & Handover

## 🎯 Mission
Build a **provider-agnostic Text-to-Speech (TTS) middleware** for the LLM Middleware project, starting with Microsoft Azure Speech Services (MVP) and planning for future providers (OpenAI, ElevenLabs, Google Cloud, Deepgram).

**Architecture Pattern:** Directly analogous to the existing LLM Middleware, but for TTS synthesis with character/token-based billing.

---

## 📋 Core Documents (Already Created)

Two comprehensive documents have been created and are ready for use:

### 1. **TTS_MIDDLEWARE_PRD.md**
**Location:** `c:\Development\loonylabs\TTS_MIDDLEWARE_PRD.md`

Product Requirements Document covering:
- Executive summary and vision
- Architecture parallel to LLM Middleware
- Complete API contracts (Request/Response interfaces)
- Provider comparison matrix (Azure, OpenAI, ElevenLabs, Google, Deepgram)
- Implementation roadmap (MVP, Phase 2, Phase 3)
- Configuration & billing strategy
- Success criteria

**Read this first to understand WHAT we're building and WHY.**

### 2. **TTS_MIDDLEWARE_TECHNICAL_STORIES.md**
**Location:** `c:\Development\loonylabs\TTS_MIDDLEWARE_TECHNICAL_STORIES.md`

Technical specification with 8 stories + detailed acceptance criteria (ACs):
- TTS-001: Define TTS Types & Interfaces (3 pts) - **MVP: all provider parameters pre-typed**
- TTS-002: Implement BaseTTSProvider Abstract Class (3 pts)
- TTS-003: Implement Character Counting Utility (2 pts)
- TTS-004: Implement Azure TTS Provider (5 pts) - **Core MVP**
- TTS-005: Implement TTSService Orchestrator (3 pts) - **Core MVP**
- TTS-006: Create Public API Exports (1 pt)
- TTS-007: Setup Configuration & Environment (2 pts)
- TTS-008: Comprehensive Testing & Documentation (8 pts) - **>80% code coverage required**

**Total Effort:** 27 Story Points

**Read this to understand HOW to implement and WHEN things are done (acceptance criteria).**

---

## 🏗️ Architecture Overview

### Design Pattern (Parallel to LLM Middleware)

```
BaseTTSProvider (abstract)
    ↓
├─ AzureProvider         ✅ MVP
├─ OpenAIProvider        🔮 Future
├─ ElevenLabsProvider    🔮 Future
├─ GoogleProvider        🔮 Future
└─ DeepgramProvider      🔮 Future

TTSService (Orchestrator - singleton)
    ├─ Provider Registry (Map<TTSProvider, BaseTTSProvider>)
    ├─ Default Provider Management
    └─ Unified API for all providers
```

### Key Principle: Future-Proofing

**ALL possible provider parameters are typed in interfaces NOW**, even if only Azure (MVP) implements them:
- ✅ Azure: `emotion`, `style` (MVP implemented)
- 🔮 OpenAI: `model`, `responseFormat` (types ready, not implemented)
- 🔮 ElevenLabs: `stability`, `similarity_boost`, `style` (types ready, not implemented)
- 🔮 Google: `effectsProfileId`, `pitchSemitones` (types ready, not implemented)
- 🔮 Deepgram: `model`, `encoding`, `container` (types ready, not implemented)

This ensures **zero breaking API changes** when adding new providers.

---

## 📝 API Contract (What Consumers Use)

### Request Interface
```typescript
interface TTSSynthesizeRequest {
  text: string;                    // Input text
  provider?: TTSProvider;          // Optional, defaults to default provider
  voice: {
    id: string;                    // e.g., "de-DE-KatjaNeural"
  };
  audio?: {
    format?: 'mp3' | 'wav' | 'opus' | 'aac' | 'flac';
    speed?: number;                // 0.5 - 2.0 (universal)
    sampleRate?: number;           // 8000, 16000, 24000, 48000
  };
  providerOptions?: Record<string, unknown>;  // Provider-specific params
}
```

### Response Interface
```typescript
interface TTSResponse {
  audio: Buffer;                   // Raw audio bytes
  metadata: {
    provider: string;              // Which provider was used
    voice: string;                 // Voice ID used
    duration: number;              // Milliseconds
    audioFormat: string;           // 'mp3', 'wav', etc.
    sampleRate: number;            // Hz
  };
  billing: {
    characters: number;            // Consumer app calculates cost from this
    tokensUsed?: number;           // Only for token-based providers (future)
  };
}
```

### Consumer Responsibility
```typescript
// Consuming app knows the provider rates and calculates costs itself
const response = await ttsService.synthesize({
  text: "Hallo Welt",
  provider: 'azure',
  voice: { id: 'de-DE-KatjaNeural' }
});

const costUSD = (response.billing.characters / 1_000_000) * 16;  // $16 per 1M chars for Azure
```

---

## 🔑 Critical Design Decisions

### 1. Billing Responsibility
- ❌ **NOT in middleware:** No cost calculation
- ✅ **In consuming app:** App knows provider rates and calculates costs
- **Why:** Enables flexible billing (bulk discounts, enterprise pricing, etc.)
- **Middleware gives:** `characters` and `tokensUsed` counts only

### 2. Character Counting
- ✅ **In middleware:** Must be 100% accurate for billing
- Must remove SSML markup before counting (Azure uses SSML internally)
- Must handle Unicode, emoji, CJK characters correctly
- Must match provider's official counting method

### 3. Parameter Strategy
- ✅ **All provider parameters typed NOW** (MVP + Future in same interfaces)
- ✅ **Universal parameters:** `text`, `voice.id`, `audio.speed`, `audio.sampleRate`
- ✅ **Provider-specific parameters:** Via `providerOptions: Record<string, unknown>`
- ✅ **No breaking changes:** New providers just add new providerOptions entries

### 4. No Streaming (MVP)
- ❌ No WebSocket or chunked streaming
- ✅ Buffer only (simplicity)
- 🔮 Streaming for future providers if needed

### 5. No Voice Catalog (MVP)
- ❌ No `listVoices()` API yet
- ✅ Consumer manually selects voice ID
- 🔮 Voice catalog for future (requires caching strategy)

### 6. No Fallback Logic (MVP)
- ❌ Middleware doesn't implement fallback
- ✅ Consumer app decides fallback strategy
- 🔮 Fallback for future (if needed)

---

## 📊 MVP Implementation Scope

### What's Included (Azure Only)
- ✅ Types & interfaces (all providers pre-typed)
- ✅ BaseTTSProvider abstract class
- ✅ AzureProvider with:
  - SSML generation (plain text → XML with emotion/style mapping)
  - Audio format handling (mp3, wav, opus)
  - Speed control (prosody rate)
  - Sample rate selection (8k, 16k, 24k, 48k)
  - Error handling (InvalidVoiceError, QuotaExceededError, etc.)
- ✅ TTSService orchestrator (singleton, provider registry)
- ✅ Character counting utility (100% accurate, SSML-aware)
- ✅ Configuration (Azure credentials from env)
- ✅ Complete test suite (>80% coverage)
- ✅ Documentation (README, JSDoc, PROVIDER_PARAMETERS.md)

### What's NOT Included (Marked for Future)
- 🔮 OpenAI, ElevenLabs, Google, Deepgram providers
- 🔮 Voice catalog & listing API
- 🔮 SSML consumer input (internal only for Azure)
- 🔮 Streaming output
- 🔮 Batch synthesis API
- 🔮 Cost estimation endpoint
- 🔮 Fallback provider logic

---

## 🧪 Testing & Quality Requirements

### Coverage Targets (AC8.1)
```
types.test.ts               → 100%
character-counter.test.ts   → 100%
base-tts-provider.test.ts   → 90%
azure-provider.test.ts      → 85%
tts.service.test.ts         → 85%
OVERALL                     → >80%

Critical Paths (MUST be 100%):
  - Character counting (billing-critical)
  - Error handling (all error paths)
  - SSML generation (Azure-specific logic)
```

### Integration Tests (AC8.2)
- Full synthesis flow: text → SSML → Azure API (mocked) → Buffer
- Error scenarios: 429, 503, timeouts, invalid config
- Concurrency: 10 parallel requests
- Memory: No leaks on repeated calls
- Performance: Single < 100ms, 100 concurrent < 5s

### Mocking Strategy (AC8.3)
- Azure SDK fully mocked (no real API calls in tests)
- Mock fixtures for success/error/timeout scenarios
- Deterministic: same input → same output always

### CI/CD Integration (AC8.7-8.8)
- Jest configured with `coverageThreshold` (80% global)
- `npm run test:coverage` generates HTML report
- GitHub Actions / GitLab CI validates >80%
- Coverage trend tracked over time (should not decrease)

---

## 📁 Project Structure (After Implementation)

```
llm-middleware/src/middleware/services/tts/
├── providers/
│   ├── base-tts-provider.ts
│   ├── azure-provider.ts
│   └── index.ts
├── types/
│   ├── common.types.ts           (universal types)
│   ├── provider-options.types.ts  (all provider params)
│   ├── PROVIDER_PARAMETERS.md    (matrix: who supports what)
│   └── index.ts
├── utils/
│   ├── character-counter.utils.ts
│   └── index.ts
├── tts.service.ts               (Orchestrator - singleton)
├── index.ts                     (Public API exports)
└── README.md

llm-middleware/src/middleware/shared/config/
└── tts.config.ts               (Configuration management)

Tests (mirrors src structure):
llm-middleware/src/middleware/services/tts/__tests__/
├── types.test.ts
├── base-tts-provider.test.ts
├── character-counter.test.ts
├── azure-provider.test.ts
├── tts.service.test.ts
└── integration.test.ts
```

---

## 🚀 Implementation Order (Recommended)

**Execution sequence** (allows parallel work where noted):

1. **TTS-001** – Define types (blocker for all others)
   - `types/common.types.ts` (universal types)
   - `types/provider-options.types.ts` (all provider params NOW)
   - `types/PROVIDER_PARAMETERS.md` (documentation matrix)

2. **TTS-002** – BaseTTSProvider (blocker for providers)
   - Abstract class with contract
   - Error classes (TTSError, InvalidConfigError, etc.)

3. **TTS-003** + **TTS-007** (can run in parallel)
   - Character counter utility (100% accurate, SSML-aware)
   - Configuration setup (env vars, validation)

4. **TTS-004** – AzureProvider (core MVP)
   - SSML generation from plain text
   - Emotion/style mapping
   - Audio format handling
   - Error handling for Azure-specific errors

5. **TTS-005** – TTSService (core MVP)
   - Provider registry & management
   - Singleton pattern
   - Default provider handling

6. **TTS-006** – Public API Exports
   - Clean import paths for consumers
   - Re-exports from index files

7. **TTS-008** – Tests & Documentation
   - Unit tests (>80% coverage per story)
   - Integration tests
   - Documentation (README, JSDoc)
   - CI/CD setup

---

## ✅ Acceptance Criteria Summary

### Before Merging PR:
- [ ] All ACs for the story are marked complete
- [ ] **Tests pass AND coverage >80% for that story**
- [ ] **Critical paths 100% covered** (character counting, error handling, SSML)
- [ ] No TypeScript errors in strict mode
- [ ] Code reviewed
- [ ] Documentation updated (README, JSDoc, inline comments)
- [ ] No breaking changes to existing middleware
- [ ] All tests are deterministic (no flaky tests)

### Before Release:
- [ ] All 8 stories complete
- [ ] **Overall coverage >80%**
- [ ] Manual testing with real Azure API (using test credentials)
- [ ] Performance benchmarked
- [ ] CI/CD pipeline configured
- [ ] Coverage trend documented

---

## 🔗 Reference: LLM Middleware Pattern

The TTS Middleware follows the exact same pattern as LLM Middleware:

```typescript
// LLM Middleware (existing - your template)
export abstract class BaseLLMProvider {
  protected providerName: LLMProvider;
  abstract callWithSystemMessage(...): Promise<CommonLLMResponse>;
  protected validateConfig(): void;
}

export class LLMService {
  private providers: Map<LLMProvider, BaseLLMProvider>;
  private defaultProvider: LLMProvider = OLLAMA;
  public async callWithSystemMessage(...): Promise<CommonLLMResponse>;
  public getProvider(provider: LLMProvider): BaseLLMProvider;
  public setDefaultProvider(provider: LLMProvider): void;
}

export const llmService = new LLMService();  // singleton

// ---

// TTS Middleware (what we're building)
export abstract class BaseTTSProvider {
  protected providerName: TTSProvider;
  abstract synthesize(...): Promise<TTSResponse>;
  protected validateConfig(): void;
  protected countCharacters(text: string): number;
}

export class TTSService {
  private providers: Map<TTSProvider, BaseTTSProvider>;
  private defaultProvider: TTSProvider = AZURE;
  public async synthesize(...): Promise<TTSResponse>;
  public getProvider(provider: TTSProvider): BaseTTSProvider;
  public setDefaultProvider(provider: TTSProvider): void;
}

export const ttsService = new TTSService();  // singleton
```

**Key Difference:** TTS returns audio (Buffer) instead of text, but billing model is similar.

---

## 🎓 Key Learnings & Constraints

### Character Counting (Critical)
- Must include ALL characters (spaces, newlines, punctuation)
- Must remove SSML markup before counting (Azure uses SSML internally)
- Must match Azure's official counting method
- 100% coverage required (billing-critical)

### Provider-Specific Parameters (Future-Proof)
- Azure: `emotion`, `style` → maps to SSML attributes
- OpenAI: `model`, `responseFormat` (typed but not implemented in MVP)
- ElevenLabs: `stability`, `similarity_boost` (typed but not implemented in MVP)
- Use `providerOptions: Record<string, unknown>` for flexibility

### SSML (Azure Only in MVP)
- Middleware generates SSML internally (plain text input)
- NOT exposed to consumers (internal implementation detail)
- Handles special character escaping (`&`, `<`, `>`, `"`)
- Future: May allow consumer SSML input (AC1 marked as optional)

### Error Handling (Explicit)
- `TTSError` (base) - wraps all provider errors with context
- `InvalidVoiceError` - voice ID doesn't exist
- `InvalidConfigError` - missing env vars
- `QuotaExceededError` - HTTP 429
- `ProviderUnavailableError` - HTTP 503

---

## 📌 Next Steps (For New Chat)

1. **Read the two documents thoroughly:**
   - `TTS_MIDDLEWARE_PRD.md` (understanding)
   - `TTS_MIDDLEWARE_TECHNICAL_STORIES.md` (implementation)

2. **Begin with TTS-001 (Define Types):**
   - Create `types/common.types.ts` with all universal types
   - Create `types/provider-options.types.ts` with all provider-specific parameters
   - Create `types/PROVIDER_PARAMETERS.md` documentation matrix
   - Create `types/index.ts` exports

3. **Each story follows the acceptance criteria exactly:**
   - Check all ACs for the story
   - Write tests matching AC requirements
   - Verify >80% coverage for that story
   - Document in JSDoc and README

4. **Use this as your specification:**
   - If something is unclear, refer to the PRD or Technical Stories
   - All acceptance criteria are the definition of "done"
   - Coverage thresholds are hard requirements

---

## 💡 Tips for Success

- **Start with types (TTS-001)** - everything else depends on it
- **Character counting (TTS-003) is billing-critical** - make it bulletproof with 100% tests
- **SSML generation (TTS-004) is complex** - test all edge cases thoroughly
- **Tests come first** - write test cases matching ACs before implementation
- **No shortcuts on coverage** - >80% is hard requirement, critical paths 100%
- **Azure SDK is well-documented** - refer to official Azure Speech docs for format strings
- **Keep it simple** - MVP is minimal scope, resist scope creep

---

## 📞 Questions to Answer During Implementation

- ✅ Does character counting exactly match Azure's method?
- ✅ Do all error types have appropriate error classes?
- ✅ Is SSML generation handling all special characters?
- ✅ Are all provider-specific parameters typed (even if not implemented)?
- ✅ Is coverage >80% for each story?
- ✅ Are critical paths (character counting, error handling, SSML) 100% covered?
- ✅ Does the API match LLM Middleware pattern?
- ✅ Can new providers be added without API changes?

---

## 📚 Reference Files in Repo

```
c:\Development\loonylabs\
├── TTS_MIDDLEWARE_PRD.md                    ← Product Requirements (WHAT & WHY)
├── TTS_MIDDLEWARE_TECHNICAL_STORIES.md      ← Technical Specs + ACs (HOW & WHEN)
├── TTS_MIDDLEWARE_HANDOVER_PROMPT.md        ← This file (Context for new chat)
└── llm-middleware/
    └── src/middleware/
        ├── services/llm/                    ← Reference architecture
        │   ├── providers/base-llm-provider.ts
        │   ├── services/llm.service.ts
        │   └── types/
        └── services/tts/                    ← New: TTS Middleware (mirror pattern)
            ├── providers/
            ├── services/
            └── types/
```

---

**Status:** Ready for implementation in new project/repo
**Quality Bar:** >80% code coverage, all ACs met, no breaking changes
**Effort:** 27 Story Points for complete MVP

Good luck! 🚀

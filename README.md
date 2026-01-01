# TTS Middleware

Provider-agnostic Text-to-Speech middleware for the LLM Middleware project.

**Status:** ✅ MVP Complete (Azure + EdenAI)
**Effort:** 32/32 Story Points (100%)
**Coverage:** 94.91% (Target: >80%) ✅
**Tests:** 345 passing ✅

---

## 📋 Quick Start

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`
2. Add your Azure Speech Services credentials:
   ```env
   AZURE_SPEECH_KEY=your_azure_speech_key_here
   AZURE_SPEECH_REGION=germanywestcentral
   AZURE_SPEECH_ENDPOINT=https://germanywestcentral.tts.speech.microsoft.com
   TTS_DEFAULT_PROVIDER=azure
   TTS_DEBUG=false
   ```

### Basic Usage

```typescript
import { ttsService, TTSProvider } from './middleware/services/tts';

// Simple synthesis
const response = await ttsService.synthesize({
  text: 'Hello World',
  voice: { id: 'en-US-JennyNeural' },
});

// Save audio to file
import fs from 'fs';
fs.writeFileSync('output.mp3', response.audio);

// With options
const response2 = await ttsService.synthesize({
  text: 'Cheerful message!',
  voice: { id: 'en-US-JennyNeural' },
  audio: {
    format: 'mp3',
    speed: 1.2,
    sampleRate: 24000,
  },
  providerOptions: {
    emotion: 'cheerful',
    style: 'chat',
  },
});

console.log(`Generated ${response2.billing.characters} billable characters`);
```

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Building

```bash
npm run build
```

---

## 🏗️ Project Structure

```
tts-middleware/
├── src/
│   └── middleware/
│       └── services/
│           └── tts/
│               ├── providers/
│               │   ├── base-tts-provider.ts
│               │   ├── azure-provider.ts
│               │   └── index.ts
│               ├── types/
│               │   ├── common.types.ts
│               │   ├── provider-options.types.ts
│               │   ├── PROVIDER_PARAMETERS.md
│               │   └── index.ts
│               ├── utils/
│               │   ├── character-counter.utils.ts
│               │   └── index.ts
│               ├── tts.service.ts
│               └── index.ts
├── src/middleware/shared/
│   └── config/
│       └── tts.config.ts
├── src/__tests__/
│   ├── types.test.ts
│   ├── base-tts-provider.test.ts
│   ├── character-counter.test.ts
│   ├── azure-provider.test.ts
│   ├── tts.service.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js (in package.json)
├── .env.example
└── README.md
```

---

## 📚 Documentation

See the following files for complete context:

- **[TTS_MIDDLEWARE_PRD.md](../TTS_MIDDLEWARE_PRD.md)** - Product Requirements (WHAT & WHY)
- **[TTS_MIDDLEWARE_TECHNICAL_STORIES.md](../TTS_MIDDLEWARE_TECHNICAL_STORIES.md)** - Technical Specs & Acceptance Criteria (HOW & WHEN)
- **[TTS_MIDDLEWARE_HANDOVER_PROMPT.md](../TTS_MIDDLEWARE_HANDOVER_PROMPT.md)** - Complete context for implementation

---

## 🎯 MVP Scope (27 Story Points)

### Core Stories

| ID | Story | Effort | Status |
|---|---|---|---|
| TTS-001 | Define TTS Types & Interfaces | 3 | ✅ Complete |
| TTS-002 | BaseTTSProvider Abstract Class | 3 | ✅ Complete |
| TTS-003 | Character Counting Utility | 2 | ✅ Complete |
| TTS-004 | Azure TTS Provider | 5 | ✅ Complete |
| TTS-005 | TTSService Orchestrator | 3 | ✅ Complete |
| TTS-006 | Public API Exports | 1 | ✅ Complete |
| TTS-007 | Configuration & Environment | 2 | ✅ Complete |
| TTS-008 | Testing & Documentation | 8 | ✅ Complete |

### Quality Requirements

- **Code Coverage:** >80% (critical paths 100%)
- **TypeScript:** Strict mode enabled
- **Tests:** Deterministic, no flakiness
- **Documentation:** JSDoc + README + inline comments

---

## 🚀 Implementation Order

1. **TTS-001** - Define types (blocker)
2. **TTS-002** - BaseTTSProvider (blocker)
3. **TTS-003 + TTS-007** - Character counter + Config (parallel)
4. **TTS-004** - Azure Provider (core MVP)
5. **TTS-005** - TTSService (core MVP)
6. **TTS-006** - Exports
7. **TTS-008** - Tests & Docs

---

## 🔧 Development

### Add a Story

Each story follows a pattern:
1. Read the story in `TTS_MIDDLEWARE_TECHNICAL_STORIES.md`
2. Implement according to acceptance criteria (ACs)
3. Write tests matching the test requirements
4. Verify >80% coverage for that story
5. Update README if needed

### Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting

```bash
npm run lint
npm run format
```

---

## 🧪 Testing

### Test Coverage Results

```
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   94.91 |     89.2 |   98.36 |   94.91 |
-----------------------------|---------|----------|---------|---------|
services/tts/                |   96.15 |      100 |     100 |   96.15 |
  tts.service.ts             |   96.15 |      100 |     100 |   96.15 | ✅
services/tts/providers/      |   95.08 |    93.18 |     100 |   95.08 |
  azure-provider.ts          |   94.38 |     87.5 |     100 |   94.38 | ✅
  base-tts-provider.ts       |     100 |      100 |     100 |     100 | ✅
  edenai-provider.ts         |   92.68 |    93.18 |     100 |   92.68 | ✅
services/tts/types/          |   96.29 |    77.41 |    87.5 |   96.29 |
  common.types.ts            |     100 |      100 |     100 |     100 | ✅
  provider-options.types.ts  |   91.66 |    74.07 |   83.33 |   91.66 | ✅
services/tts/utils/          |     100 |      100 |     100 |     100 |
  character-counter.utils.ts |     100 |      100 |     100 |     100 | ✅ (billing-critical)
shared/config/               |   89.13 |    78.78 |     100 |   89.13 |
  tts.config.ts              |   89.13 |    78.78 |     100 |   89.13 | ✅

Total Tests: 345 passing ✅
- types.test.ts: 48 tests
- base-tts-provider.test.ts: 46 tests
- character-counter.test.ts: 68 tests
- azure-provider.test.ts: 25 tests
- edenai-provider.test.ts: 33 tests
- tts.service.test.ts: 34 tests
- exports.test.ts: 44 tests
- tts.config.test.ts: 27 tests
- integration.test.ts: 20 tests
```

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage report (HTML)
npm run test:coverage
# View at: coverage/index.html

# CI mode (for GitHub Actions, etc.)
npm run test:ci
```

---

## 📋 Acceptance Criteria Checklist

### Before Merging PR:
- [ ] All ACs for the story are complete
- [ ] Tests pass with >80% coverage
- [ ] Critical paths 100% covered
- [ ] No TypeScript errors (strict mode)
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] All tests deterministic (no flakiness)

### Before Release:
- [ ] All 8 stories complete
- [ ] Overall coverage >80%
- [ ] Manual testing with Azure API
- [ ] Performance benchmarked
- [ ] CI/CD configured

---

## 🔗 Architecture Pattern

Follows the same pattern as LLM Middleware:

```typescript
BaseTTSProvider (abstract)
  ├─ AzureProvider ✅ (MVP)
  ├─ EdenAIProvider ✅ (Multi-provider aggregator)
  ├─ OpenAIProvider 🔮 (Future)
  ├─ ElevenLabsProvider 🔮 (Future)
  ├─ GoogleProvider 🔮 (Future)
  └─ DeepgramProvider 🔮 (Future)

TTSService (Orchestrator - singleton)
  ├─ Provider Registry
  ├─ Default Provider Management
  └─ Unified API
```

---

## 💡 Key Principles

1. **Future-Proofing:** All provider parameters typed NOW (no breaking changes later)
2. **Character Counting:** In middleware, 100% accurate (billing-critical)
3. **Billing:** Handled by consuming app (flexible pricing strategies)
4. **No Streaming (MVP):** Buffer only for simplicity
5. **No Voice Catalog (MVP):** Consumer selects voice ID manually
6. **No Fallback (MVP):** Consumer app handles fallback logic

---

## 📞 Questions?

Refer to:
- **PRD** for "what" and "why"
- **Technical Stories** for "how" and "when"
- **Handover Prompt** for complete context

---

## 🎉 Project Status: Complete

**Implementation:** ✅ All 32 story points completed (MVP + EdenAI)
**Quality:** ✅ 94.91% code coverage (target: >80%)
**Tests:** ✅ 345 tests passing
**Documentation:** ✅ Complete with examples

### What's Working

- ✅ Azure Speech Services integration
- ✅ EdenAI multi-provider aggregator (access to Amazon, Google, IBM, Microsoft, OpenAI, ElevenLabs via one API)
- ✅ Provider-agnostic architecture (ready for direct OpenAI, ElevenLabs, Google, Deepgram)
- ✅ Accurate character counting (billing-critical)
- ✅ SSML generation with emotion/style support (Azure)
- ✅ Comprehensive error handling
- ✅ DSGVO/GDPR compliance detection
- ✅ TypeScript strict mode

### Next Steps

1. **Add More Providers:** Implement OpenAI, ElevenLabs, Google Cloud, or Deepgram providers
2. **Voice Catalog:** Build voice discovery/listing feature
3. **Streaming:** Add real-time audio streaming support
4. **Caching:** Implement response caching for repeated requests
5. **Fallback:** Add automatic provider fallback logic

### Contributing

This project follows strict quality standards:
- All changes must maintain >80% coverage
- Critical paths (billing, error handling) require 100% coverage
- TypeScript strict mode enforced
- All tests must be deterministic

Good luck! 🚀

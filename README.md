# TTS Middleware

Provider-agnostic Text-to-Speech middleware for the LLM Middleware project.

**Status:** MVP Phase (Azure Speech Services only)
**Effort:** 27 Story Points
**Coverage Target:** >80% code coverage

---

## 📋 Quick Start

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`
2. Add your Azure Speech Services credentials:
   ```
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=germanywestcentral
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
| TTS-001 | Define TTS Types & Interfaces | 3 | Blocker |
| TTS-002 | BaseTTSProvider Abstract Class | 3 | Blocker |
| TTS-003 | Character Counting Utility | 2 | High |
| TTS-004 | Azure TTS Provider | 5 | Core |
| TTS-005 | TTSService Orchestrator | 3 | Core |
| TTS-006 | Public API Exports | 1 | High |
| TTS-007 | Configuration & Environment | 2 | High |
| TTS-008 | Testing & Documentation | 8 | Quality |

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

### Test Coverage Targets

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
  - SSML generation (Azure-specific)
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

**Status:** Ready for implementation
**Quality Bar:** >80% coverage, all ACs met, no breaking changes
**Next:** Start with TTS-001 (Define Types & Interfaces)

Good luck! 🚀

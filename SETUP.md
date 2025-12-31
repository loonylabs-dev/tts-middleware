# TTS Middleware - Initial Setup Guide

This guide helps you get started with the TTS Middleware project.

---

## 📦 Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git
- Azure Speech Services account (for Azure provider)

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit .env and add your Azure Speech Services credentials
# AZURE_SPEECH_KEY=your_key_here
# AZURE_SPEECH_REGION=germanywestcentral
```

### 3. Build Project

```bash
npm run build
```

### 4. Run Tests

```bash
npm run test
npm run test:coverage
```

---

## 📚 Read the Documentation

Before starting implementation, read these files in order:

1. **[TTS_MIDDLEWARE_HANDOVER_PROMPT.md](../TTS_MIDDLEWARE_HANDOVER_PROMPT.md)** (5 min)
   - Complete overview and context

2. **[TTS_MIDDLEWARE_PRD.md](../TTS_MIDDLEWARE_PRD.md)** (15 min)
   - Product requirements and vision
   - Architecture overview
   - API contract specification

3. **[TTS_MIDDLEWARE_TECHNICAL_STORIES.md](../TTS_MIDDLEWARE_TECHNICAL_STORIES.md)** (30 min)
   - 8 technical stories with acceptance criteria
   - Test requirements per story
   - Implementation order

---

## 🎯 Implementation Workflow

### For Each Story

1. **Read the story** in TTS_MIDDLEWARE_TECHNICAL_STORIES.md
2. **Check acceptance criteria (ACs)**
3. **Create the files** listed in the story
4. **Write tests first** matching AC requirements
5. **Implement code** to pass tests
6. **Verify coverage** >80% (critical paths 100%)
7. **Check all ACs** are complete
8. **Move to next story**

### Example: Starting TTS-001

```bash
# 1. Read TTS-001 in TTS_MIDDLEWARE_TECHNICAL_STORIES.md

# 2. Create files
touch src/middleware/services/tts/types/common.types.ts
touch src/middleware/services/tts/types/provider-options.types.ts
touch src/middleware/services/tts/types/PROVIDER_PARAMETERS.md
touch src/middleware/services/tts/types/index.ts

# 3. Create tests
touch src/middleware/services/tts/__tests__/types.test.ts

# 4. Write code and tests following ACs

# 5. Run tests
npm run test types.test.ts

# 6. Check coverage
npm run test:coverage

# 7. Move to TTS-002
```

---

## 📋 Commands Reference

```bash
# Development
npm run build              # Compile TypeScript
npm run test              # Run all tests once
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report
npm run test:ci           # CI mode (GitHub Actions, etc.)
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
npm run clean             # Remove dist and coverage
```

---

## 🧪 Testing Strategy

### Before Writing Code

1. Understand the test requirements in the story
2. Write test cases that match acceptance criteria
3. Tests should fail at first (red)
4. Implement code to make tests pass (green)
5. Refactor if needed (blue)

### Coverage Requirements

```
Minimum per story: >80%
Critical paths:    100% (character counting, error handling, SSML)
Target overall:    >87% (exceeds minimum)
```

### Run Coverage Report

```bash
npm run test:coverage
open coverage/index.html  # View HTML report in browser
```

---

## 📁 Project Structure

Files are created following this pattern:

```
tts-middleware/
├── src/
│   └── middleware/
│       └── services/
│           └── tts/
│               ├── __tests__/           ← Test files go here
│               ├── providers/           ← Provider implementations
│               ├── types/               ← TypeScript interfaces
│               ├── utils/               ← Utility functions
│               ├── tts.service.ts       ← Main orchestrator
│               └── index.ts             ← Public exports
├── dist/                                ← Compiled output (generated)
├── coverage/                            ← Test coverage (generated)
├── package.json
├── tsconfig.json
└── .env                                 ← Local config (don't commit!)
```

---

## 🔄 Git Workflow

```bash
# Create a branch for each story
git checkout -b feature/tts-001-define-types
git checkout -b feature/tts-002-base-provider
# etc.

# Commit after each completed story
git add .
git commit -m "TTS-001: Define TTS Types & Interfaces (3 pts)"

# Push and create PR
git push -u origin feature/tts-001-define-types
```

---

## ✅ Acceptance Checklist

Before moving to the next story, verify:

- [ ] All ACs for the story are complete
- [ ] Tests pass: `npm run test`
- [ ] Coverage >80%: `npm run test:coverage`
- [ ] Critical paths 100% covered (if applicable)
- [ ] No TypeScript errors: `npm run build`
- [ ] Code formatted: `npm run format`
- [ ] Linting passes: `npm run lint`
- [ ] Documentation updated (README, JSDoc)

---

## 🚨 Common Issues

### Issue: Tests not found

**Solution:** Make sure test files are in `__tests__/` directory and follow `*.test.ts` naming.

```bash
# Correct
src/middleware/services/tts/__tests__/types.test.ts

# Incorrect
src/middleware/services/tts/types.test.ts
```

### Issue: Coverage threshold failing

**Solution:** Add more test cases to reach >80% coverage. Check `coverage/index.html` for uncovered lines.

```bash
npm run test:coverage
# Look for files with <80% coverage
# Add tests for uncovered code paths
```

### Issue: TypeScript compilation errors

**Solution:** Enable strict mode checks and fix all errors.

```bash
npm run build
# Review and fix all errors
# Use `any` only as last resort (discouraged)
```

### Issue: Environment variables not loading

**Solution:** Ensure `.env` file exists with correct values.

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

---

## 📞 Quick Reference

| Story | Files | Effort | Blocker? |
|-------|-------|--------|----------|
| TTS-001 | types/*.ts | 3 pts | Yes |
| TTS-002 | providers/base-tts-provider.ts | 3 pts | Yes |
| TTS-003 | utils/character-counter.utils.ts | 2 pts | No |
| TTS-004 | providers/azure-provider.ts | 5 pts | Core |
| TTS-005 | tts.service.ts | 3 pts | Core |
| TTS-006 | index.ts exports | 1 pt | No |
| TTS-007 | config/tts.config.ts | 2 pts | No |
| TTS-008 | __tests__/*.test.ts | 8 pts | Quality |

---

## 🎓 Key Principles

1. **Types First** - TTS-001 is the foundation, don't skip it
2. **Tests First** - Write tests before implementing code
3. **Coverage Matters** - >80% is a hard requirement
4. **Strict Mode** - No `any` types, full TypeScript strictness
5. **Documentation** - JSDoc + inline comments + README
6. **No Scope Creep** - Stick to MVP requirements

---

## 🚀 Ready to Start?

1. Ensure all dependencies are installed: `npm install`
2. Configure `.env` with your credentials
3. Run tests to verify setup: `npm run test`
4. Read the technical stories document
5. Start with **TTS-001: Define TTS Types & Interfaces**

Good luck! 🎯

---

**Next:** Open `../TTS_MIDDLEWARE_TECHNICAL_STORIES.md` and start with Story TTS-001

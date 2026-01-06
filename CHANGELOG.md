# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-06

### Fixed
- **EdenAI Provider:** Corrected API request payload format
  - `providers` field now correctly placed at top level (was incorrectly in `settings`)
  - `option` field now defaults to `'FEMALE'` (EdenAI requires this field)
  - Removed unsupported fields from `settings`: `speaking_rate`, `speaking_pitch`, `speaking_volume`, `audio_format`, `sampling_rate`
  - Added new `option` and `model` fields to `EdenAIProviderOptions`

### Added
- **E2E Tests:** Real API integration tests for EdenAI provider (`tests/e2e/`)
- **Test Scripts:** New npm scripts for targeted testing
  - `npm run test:unit` - Run unit tests only
  - `npm run test:integration` - Run integration tests only
  - `npm run test:e2e` - Run E2E tests (requires `EDENAI_API_KEY`)

### Changed
- **Test Structure:** Reorganized tests into centralized `tests/` directory
  - `tests/unit/` - Unit tests (mocked)
  - `tests/integration/` - Integration tests (mocked)
  - `tests/e2e/` - End-to-end tests (real API calls)
- **EdenAI Options:** Removed deprecated options that were never functional
  - `speaking_rate`, `speaking_pitch`, `speaking_volume` - Not supported by EdenAI API
  - `audio_format`, `sampling_rate` - Not supported in settings object

### Breaking Changes
- **EdenAI `providerOptions`:** The following options are no longer passed to the API:
  - `speaking_rate` - Use `option: 'FEMALE'` or `option: 'MALE'` instead
  - `speaking_pitch`, `speaking_volume` - Not supported by EdenAI
  - `audio_format`, `sampling_rate` - Configure via `audio` parameter instead

## [0.1.1] - 2026-01-05

### Added
- **Pluggable Logger Interface:**
  - `setLogger()` - Replace default console logger with custom implementation (Winston, Pino, etc.)
  - `silentLogger` - Disable all logging output
  - `setLogLevel()` / `getLogLevel()` - Control log verbosity (debug, info, warn, error)
  - `resetLogger()` - Restore default console logger
- **Documentation:**
  - `CONTRIBUTING.md` - Contribution guidelines for developers

### Fixed
- **EdenAI Provider:** Corrected API request payload structure (`settings` object)
- **Package Exports:** Added root `src/index.ts` for proper module resolution

### Changed
- **Coverage Threshold:** Increased from 80% to 90% (lines/functions/statements), 85% (branches)

## [0.1.0] - 2026-01-01

### Added
- **Core Architecture:**
  - Provider-agnostic `TTSService` orchestrator.
  - Abstract `BaseTTSProvider` for standardized provider implementation.
  - Comprehensive TypeScript types for requests, responses, and options.
- **Providers:**
  - **Azure Speech Services:** Full support for neural voices, styles, and emotions.
  - **EdenAI:** Support for multi-provider aggregation (access to Google, OpenAI, etc. via EdenAI).
- **Features:**
  - **Character Counting:** Accurate billing estimation logic.
  - **Audio Formats:** Support for MP3, WAV, and Opus.
  - **SSML Generation:** Automatic SSML construction for Azure with prosody and style support.
- **Infrastructure:**
  - Configuration management via `tts.config.ts`.
  - Full test suite with Jest (Unit & Integration tests).
  - Manual test scripts for verification.
  - ESLint and Prettier configuration.

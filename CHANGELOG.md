# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

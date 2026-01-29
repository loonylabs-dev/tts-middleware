# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-01-29

### Added
- **EdenAI `voice_id` Support:** Pass provider-specific voice names to EdenAI API
  - New `voice_id` field in `EdenAIProviderOptions` for specific voice selection
  - Enables ElevenLabs voices (Aria, Roger, Sarah, Laura, Charlie, George) via EdenAI
  - Works with any EdenAI-supported provider, not just ElevenLabs
  - Example: `providerOptions: { provider: 'elevenlabs', voice_id: 'Aria' }`

### Documentation
- Updated PROVIDER_PARAMETERS.md with `voice_id` parameter and ElevenLabs voice examples
- Updated README with ElevenLabs via EdenAI usage example

## [0.5.0] - 2026-01-29

### Added
- **Fish Audio TTS Provider:** New provider for Fish Audio's S1 model (test/admin only)
  - REST API integration via `POST https://api.fish.audio/v1/tts` (zero dependencies)
  - 3 models: `s1` (flagship, 4B params), `speech-1.6`, `speech-1.5`
  - 13 languages with automatic detection (EN, DE, FR, ES, JA, ZH, KO, AR, RU, NL, IT, PL, PT)
  - 64+ emotional expressions via text markers (e.g., `(excited)`, `(sad)`, `(whispering)`)
  - Voice selection via `reference_id` from Fish Audio voice library or custom cloned voices
  - Quality controls: `temperature`, `topP`, `repetitionPenalty`
  - Latency modes: `low`, `normal`, `balanced`
  - Audio formats: MP3, WAV, PCM, Opus with configurable bitrate and sample rate
  - Prosody controls: speed and volume via universal `AudioOptions`
  - **Note:** No EU data residency guarantees – intended for test/admin use only
- **New Environment Variable:** `FISH_AUDIO_API_KEY` for Fish Audio API authentication
- **New Types:** `FishAudioProviderOptions`, `isFishAudioOptions()` type guard
- **Manual Test Script:** `scripts/manual-test-fish-audio.ts` with native German and English voice sets

### Changed
- **TTSProvider enum:** Added `FISH_AUDIO = 'fish_audio'`
- **ProviderOptions union:** Includes `FishAudioProviderOptions`

## [0.4.1] - 2026-01-16

### Fixed
- **Google Cloud TTS Region Override:** Region from `providerOptions` is now correctly applied
  - Previously, `providerOptions.region` was ignored and only the config/environment region was used
  - Now, per-request region override works as documented
  - Example: `providerOptions: { region: 'europe-west3' }` correctly uses Frankfurt endpoint
- **Client Caching per Region:** TTS clients are now cached per region
  - Enables efficient runtime region switching without recreating clients
  - Each unique region gets its own cached client instance

### Added
- **New Unit Tests:** 2 tests for region override and per-region client caching

## [0.4.0] - 2026-01-16

### Added
- **Google Cloud Text-to-Speech Provider:** Full DSGVO/GDPR-compliant TTS integration
  - EU regional endpoints (`eu-texttospeech.googleapis.com`, `europe-west3` for Frankfurt)
  - Service Account authentication via `GOOGLE_APPLICATION_CREDENTIALS`
  - Support for Neural2, WaveNet, Standard, Studio, and Chirp3-HD voices
  - Audio configuration: MP3, WAV, Opus formats with speed, pitch, and volume controls
  - Effects profiles for device-optimized audio (headphone, speaker, etc.)
  - Automatic language code extraction from voice IDs
- **New Environment Variables:**
  - `GOOGLE_APPLICATION_CREDENTIALS` - Path to Service Account JSON
  - `GOOGLE_CLOUD_PROJECT` - Google Cloud Project ID
  - `GOOGLE_TTS_REGION` - Region for data residency (default: `eu`)
- **Voice Listing Script:** `scripts/list-google-voices.ts` to query available voices
- **Manual Test Script:** `scripts/manual-test-google-cloud-tts.ts` for verification
- **Comprehensive Tests:** 71 new tests for Google Cloud TTS (unit + integration)

### Changed
- **Exports:** Added `GoogleCloudTTSProvider`, `GoogleCloudTTSRegion`, `GoogleCloudTTSConfig` to public API
- **Dependencies:** Added `@google-cloud/text-to-speech` SDK

### Documentation
- Updated README with Google Cloud TTS usage examples
- Added German voice reference (Neural2-G/H, WaveNet-G/H, Studio-B/C, Chirp3-HD)

## [0.3.0] - 2026-01-08

### Added
- **EdenAI OpenAI Voice Selection:** Support for specific OpenAI voice selection via EdenAI
  - New `settings` field in `EdenAIProviderOptions` for provider-specific voice/model selection
  - Format: `settings: { openai: 'de_nova' }` to select specific voices
  - Supports all 6 OpenAI voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
  - Supports all 57 languages via language prefix (e.g., `de_nova`, `en_alloy`, `fr_shimmer`)

### Changed
- **EdenAI Provider:** Updated request building to use `settings` object for voice selection
  - `settings` field now correctly passed to EdenAI API for provider-specific configuration
  - `model` field deprecated in favor of `settings` (still works for backwards compatibility)

### Documentation
- Updated README with EdenAI + OpenAI voice selection examples
- Updated PROVIDER_PARAMETERS.md with EdenAI settings documentation

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

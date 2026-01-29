<div align="center">

# TTS Middleware

*Provider-agnostic Text-to-Speech middleware with **GDPR compliance** support. Currently supports Azure Speech Services, EdenAI, Google Cloud TTS, and Fish Audio. Features EU data residency via Azure and Google Cloud, pluggable logging, character-based billing, and comprehensive error handling.*

<!-- Horizontal Badge Navigation Bar -->
[![npm version](https://img.shields.io/npm/v/@loonylabs/tts-middleware.svg?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/@loonylabs/tts-middleware)
[![npm downloads](https://img.shields.io/npm/dm/@loonylabs/tts-middleware.svg?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/@loonylabs/tts-middleware)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg?style=for-the-badge&logo=typescript&logoColor=white)](#features)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#prerequisites)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge&logo=opensource&logoColor=white)](#license)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/loonylabs-dev/tts-middleware)

</div>

<!-- Table of Contents -->
<details>
<summary><strong>Table of Contents</strong></summary>

- [Features](#features)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Providers & Models](#providers--models)
- [GDPR / Compliance](#gdpr--compliance)
- [API Reference](#api-reference)
- [Advanced Features](#advanced-features)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Links](#links)

</details>

---

## Features

- **Multi-Provider Architecture**: Unified API for all TTS providers
  - **Azure Speech Services** (MVP): Neural voices with emotion/style, EU regions
  - **EdenAI**: Aggregator with access to Google, OpenAI, Amazon, IBM, ElevenLabs
  - **Google Cloud TTS**: Neural2, WaveNet, Studio voices with EU data residency
  - **Fish Audio**: S1 model with 13 languages & 64+ emotions (test/admin only)
  - **Ready for:** OpenAI, ElevenLabs, Deepgram (interfaces prepared)
- **GDPR/DSGVO Compliance**: Built-in EU region support for Azure and Google Cloud
- **SSML Abstraction**: Auto-generates provider-specific SSML from simple JSON options
- **Character Billing**: Accurate character counting for cost calculation
- **Pluggable Logger**: Bring your own logger (Winston, Pino, etc.) or use the built-in console logger
- **TypeScript First**: Full type safety with comprehensive interfaces
- **Retry with Backoff**: Automatic retry for transient errors (429, 5xx, timeouts) with exponential backoff and jitter
- **Error Handling**: Typed error classes (InvalidConfig, QuotaExceeded, SynthesisFailed, etc.)
- **Zero Lock-in**: Switch providers without changing your application code

## Quick Start

### Installation

Install from npm:

```bash
npm install @loonylabs/tts-middleware
```

Or install directly from GitHub:

```bash
npm install github:loonylabs-dev/tts-middleware
```

### Basic Usage

```typescript
import { ttsService, TTSProvider } from '@loonylabs/tts-middleware';
import fs from 'fs';

const response = await ttsService.synthesize({
  text: 'Hallo Welt! Dies ist ein Test.',
  voice: { id: 'de-DE-KatjaNeural' },
  audio: { format: 'mp3', speed: 1.0 },
});

fs.writeFileSync('output.mp3', response.audio);
console.log('Characters billed:', response.billing.characters);
console.log('Duration:', response.metadata.duration, 'ms');
```

<details>
<summary><strong>Switching Providers</strong></summary>

```typescript
// Azure with emotion
const azure = await ttsService.synthesize({
  text: 'Great news!',
  provider: TTSProvider.AZURE,
  voice: { id: 'en-US-JennyNeural' },
  providerOptions: { emotion: 'cheerful', style: 'chat' },
});

// Google Cloud TTS (EU-compliant)
const google = await ttsService.synthesize({
  text: 'Hallo aus Frankfurt!',
  provider: TTSProvider.GOOGLE,
  voice: { id: 'de-DE-Neural2-C' },
  providerOptions: { region: 'europe-west3' },
});

// EdenAI (OpenAI voices via aggregator)
const edenai = await ttsService.synthesize({
  text: 'Hello World',
  provider: TTSProvider.EDENAI,
  voice: { id: 'en-US' },
  providerOptions: { provider: 'openai', settings: { openai: 'en_nova' } },
});

// EdenAI (ElevenLabs with specific voice)
const elevenlabs = await ttsService.synthesize({
  text: 'Hallo, willkommen!',
  provider: TTSProvider.EDENAI,
  voice: { id: 'de' },
  providerOptions: { provider: 'elevenlabs', voice_id: 'Aria' },
});

// Fish Audio (test/admin only)
const fish = await ttsService.synthesize({
  text: '(excited) Das ist fantastisch!',
  provider: TTSProvider.FISH_AUDIO,
  voice: { id: '90042f762dbf49baa2e7776d011eee6b' },
  providerOptions: { model: 's1' },
});
```

</details>

<details>
<summary><strong>Using OpenAI Voices via EdenAI</strong></summary>

```typescript
// German with OpenAI "nova" voice (female)
const response = await ttsService.synthesize({
  text: 'Hallo Welt! Das ist ein Test.',
  provider: TTSProvider.EDENAI,
  voice: { id: 'de' },
  providerOptions: {
    provider: 'openai',
    settings: { openai: 'de_nova' },
  },
});
```

**Available OpenAI Voices:**

| Voice | Character |
|-------|-----------|
| `alloy` | Neutral |
| `echo` | Male |
| `fable` | Expressive |
| `onyx` | Male, deep |
| `nova` | Female |
| `shimmer` | Female, warm |

Format: `{language}_{voice}` (e.g., `de_nova`, `en_alloy`, `fr_shimmer`)

</details>

<details>
<summary><strong>Using Google Cloud TTS (GDPR/DSGVO-Compliant)</strong></summary>

```typescript
// With Frankfurt endpoint for maximum DSGVO compliance
const response = await ttsService.synthesize({
  text: 'Guten Tag, wie geht es Ihnen?',
  provider: TTSProvider.GOOGLE,
  voice: { id: 'de-DE-Neural2-G' },
  audio: { format: 'mp3' },
  providerOptions: {
    region: 'europe-west3',
    effectsProfileId: ['headphone-class-device'],
  },
});
```

**Available German Voices:**

| Type | Female | Male | Quality |
|------|--------|------|---------|
| Neural2 | `de-DE-Neural2-G` | `de-DE-Neural2-H` | Best value |
| WaveNet | `de-DE-Wavenet-G` | `de-DE-Wavenet-H` | Good |
| Studio | `de-DE-Studio-C` | `de-DE-Studio-B` | Premium |
| Chirp3-HD | `Aoede`, `Kore`, ... | `Fenrir`, `Puck`, ... | Newest |

</details>

## Prerequisites

<details>
<summary><strong>Required Dependencies</strong></summary>

- **Node.js** 18+
- **TypeScript** 5.3+
- Provider credentials (API keys / service accounts)

</details>

## Configuration

<details>
<summary><strong>Environment Setup</strong></summary>

Create a `.env` file in your project root:

```env
# Default provider
TTS_DEFAULT_PROVIDER=azure

# Azure Speech Services (EU-compliant)
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=germanywestcentral

# EdenAI (multi-provider aggregator)
EDENAI_API_KEY=your-edenai-api-key

# Google Cloud TTS (EU-compliant)
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_TTS_REGION=eu

# Fish Audio (test/admin only – no EU data residency)
FISH_AUDIO_API_KEY=your-fish-audio-api-key

# Logging
TTS_DEBUG=false
LOG_LEVEL=info
```

</details>

## Providers & Models

### Azure Speech Services (MVP)

| Feature | Details |
|---------|---------|
| **Voices** | 180+ neural voices |
| **Languages** | 100+ locales |
| **Emotions** | cheerful, sad, angry, friendly, etc. |
| **Styles** | chat, newscast, customerservice, etc. |
| **Audio** | MP3, WAV, Opus |
| **EU Region** | germanywestcentral (Frankfurt) |
| **Pricing** | ~$16/1M characters |

### Google Cloud TTS

| Feature | Details |
|---------|---------|
| **Voices** | Neural2, WaveNet, Standard, Studio, Chirp3-HD |
| **Languages** | 40+ languages |
| **Audio** | MP3, WAV, Opus |
| **EU Regions** | eu, europe-west1 through europe-west9 |
| **Pricing** | ~$16/1M characters |

### EdenAI (Aggregator)

| Feature | Details |
|---------|---------|
| **Providers** | Google, OpenAI, Amazon, IBM, Microsoft, ElevenLabs |
| **Voices** | Depends on underlying provider |
| **OpenAI Voices** | alloy, echo, fable, onyx, nova, shimmer (57 languages) |
| **ElevenLabs Voices** | Aria, Roger, Sarah, Laura, Charlie, George (via `voice_id`) |

### Fish Audio (Test/Admin Only)

| Feature | Details |
|---------|---------|
| **Models** | S1 (flagship, 4B params), speech-1.6, speech-1.5 |
| **Languages** | 13 with auto-detection (EN, DE, FR, ES, JA, ZH, KO, AR, RU, NL, IT, PL, PT) |
| **Emotions** | 64+ expressions via text markers: `(excited)`, `(sad)`, `(whispering)` |
| **Voices** | Community library + custom voice cloning |
| **Audio** | MP3, WAV, PCM, Opus |
| **Pricing** | $15/1M UTF-8 bytes |
| **EU Compliance** | No data residency guarantees |

## GDPR / Compliance

### Provider Compliance Overview

| Provider | DPA | GDPR | EU Data Residency | Notes |
|----------|-----|------|-------------------|-------|
| **Azure** | Yes | Yes | Yes (Frankfurt) | Recommended for EU |
| **Google Cloud** | Yes | Yes | Yes (EU multi-region) | Full EU endpoint support |
| **EdenAI** | Yes | Depends* | Depends* | Depends on underlying provider |
| **Fish Audio** | No | No | No | Test/admin only |

*EdenAI is an aggregator - compliance depends on the underlying provider.

## API Reference

### TTSService

```typescript
class TTSService {
  synthesize(request: TTSSynthesizeRequest): Promise<TTSResponse>;
  getProvider(provider: TTSProvider): BaseTTSProvider;
  setDefaultProvider(provider: TTSProvider): void;
  getAvailableProviders(): TTSProvider[];
  isProviderAvailable(provider: TTSProvider): boolean;
}
```

### TTSSynthesizeRequest

```typescript
interface TTSSynthesizeRequest {
  text: string;
  provider?: TTSProvider;
  voice: { id: string };
  audio?: {
    format?: 'mp3' | 'wav' | 'opus' | 'aac' | 'flac';
    speed?: number;        // 0.5 - 2.0
    pitch?: number;        // -20 to 20
    volumeGainDb?: number; // -96 to 16
    sampleRate?: number;
  };
  providerOptions?: Record<string, unknown>;
  retry?: boolean | RetryConfig; // default: true
}
```

### TTSResponse

```typescript
interface TTSResponse {
  audio: Buffer;
  metadata: {
    provider: string;
    voice: string;
    duration: number;
    audioFormat: string;
    sampleRate: number;
  };
  billing: {
    characters: number;
    tokensUsed?: number;
  };
}
```

## Advanced Features

<details>
<summary><strong>Pluggable Logger</strong></summary>

Replace the default console logger with your own:

```typescript
import { setLogger, silentLogger, setLogLevel } from '@loonylabs/tts-middleware';

// Use Winston, Pino, or any custom logger
setLogger({
  info: (msg, meta) => winston.info(msg, meta),
  warn: (msg, meta) => winston.warn(msg, meta),
  error: (msg, meta) => winston.error(msg, meta),
  debug: (msg, meta) => winston.debug(msg, meta),
});

// Disable all logging
setLogger(silentLogger);

// Control log level
setLogLevel('warn');
```

</details>

<details>
<summary><strong>Retry with Exponential Backoff</strong></summary>

All provider calls are automatically retried on transient errors (429 rate limit, 5xx server errors, timeouts). Non-retryable errors (401, 403, 400) are thrown immediately.

```typescript
// Default: retry enabled (3 retries, 1s initial delay, 2x multiplier)
const response = await ttsService.synthesize({
  text: 'Hello World',
  voice: { id: 'en-US-JennyNeural' },
});

// Disable retry
const response = await ttsService.synthesize({
  text: 'Hello World',
  voice: { id: 'en-US-JennyNeural' },
  retry: false,
});

// Custom retry config
const response = await ttsService.synthesize({
  text: 'Hello World',
  voice: { id: 'en-US-JennyNeural' },
  retry: {
    maxRetries: 5,
    initialDelayMs: 500,
    multiplier: 2,
    maxDelayMs: 10000,
  },
});
```

| Error Type | Retried? | Examples |
|------------|----------|----------|
| Rate limit | Yes | 429 Too Many Requests |
| Server error | Yes | 500, 502, 503, 504 |
| Timeout | Yes | Request timeout, ECONNREFUSED, ECONNRESET |
| Auth error | No | 401, 403 |
| Bad request | No | 400, invalid voice |
| Unknown | No | SynthesisFailedError |

</details>

<details>
<summary><strong>Error Handling</strong></summary>

Typed error classes for precise error handling:

```typescript
import {
  TTSError,
  InvalidConfigError,
  InvalidVoiceError,
  QuotaExceededError,
  ProviderUnavailableError,
  SynthesisFailedError,
  NetworkError,
} from '@loonylabs/tts-middleware';

try {
  const result = await ttsService.synthesize({ text: 'test', voice: { id: 'en-US' } });
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.log('Rate limit hit, try again later');
  } else if (error instanceof InvalidVoiceError) {
    console.log('Voice not found');
  } else if (error instanceof TTSError) {
    console.log(`TTS Error [${error.code}]: ${error.message}`);
  }
}
```

</details>

<details>
<summary><strong>Billing & Cost Calculation</strong></summary>

The middleware returns character counts for cost calculation:

```typescript
const PROVIDER_RATES = {
  [TTSProvider.AZURE]: 16 / 1_000_000,
  [TTSProvider.GOOGLE]: 16 / 1_000_000,
  [TTSProvider.FISH_AUDIO]: 15 / 1_000_000,
};

const response = await ttsService.synthesize({ /* ... */ });
const costUSD = response.billing.characters * PROVIDER_RATES[TTSProvider.AZURE];
```

</details>

## Architecture

```mermaid
graph TD
    App[Your Application] -->|synthesize()| Service[TTSService]
    Service -->|getProvider()| Registry{Provider Registry}

    Registry -->|Select| Azure[AzureProvider]
    Registry -->|Select| GCloud[GoogleCloudTTSProvider]
    Registry -->|Select| Eden[EdenAIProvider]
    Registry -->|Select| Fish[FishAudioProvider]

    Azure -->|SSML/SDK| AzureAPI[Azure Speech API]
    GCloud -->|gRPC/SDK| GoogleAPI[Google Cloud TTS API]
    Eden -->|REST| EdenAPI[EdenAI API]
    Fish -->|REST| FishAPI[Fish Audio API]

    GoogleAPI -->|EU Endpoint| EU[eu-texttospeech.googleapis.com]
    EdenAPI -.-> OpenAI[OpenAI TTS]
    EdenAPI -.-> Amazon[Amazon Polly]
```

## Testing

```bash
# Run all tests (512 tests, >90% coverage)
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Manual test scripts
npx ts-node scripts/manual-test-edenai.ts
npx ts-node scripts/manual-test-google-cloud-tts.ts
npx ts-node scripts/manual-test-fish-audio.ts [en] [de]

# List available Google Cloud voices
npx ts-node scripts/list-google-voices.ts de-DE
```

## Contributing

We welcome contributions! Please ensure:

1. **Tests:** Add tests for new features
2. **Linting:** Run `npm run lint` before committing
3. **Conventions:** Follow the existing project structure

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [NPM Package](https://www.npmjs.com/package/@loonylabs/tts-middleware)
- [Issues](https://github.com/loonylabs-dev/tts-middleware/issues)
- [CHANGELOG](CHANGELOG.md)

---

<div align="center">

**Made with care by the LoonyLabs Team**

[![GitHub stars](https://img.shields.io/github/stars/loonylabs-dev/tts-middleware?style=social)](https://github.com/loonylabs-dev/tts-middleware/stargazers)
[![Follow on GitHub](https://img.shields.io/github/followers/loonylabs-dev?style=social&label=Follow)](https://github.com/loonylabs-dev)

</div>

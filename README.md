# @loonylabs/tts-middleware

[![npm version](https://img.shields.io/npm/v/@loonylabs/tts-middleware.svg)](https://www.npmjs.com/package/@loonylabs/tts-middleware)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen)]()

**Provider-agnostic Text-to-Speech (TTS) middleware infrastructure.**

Build voice-enabled applications that switch seamlessly between Azure, EdenAI, OpenAI, ElevenLabs, and more without changing your application logic. Includes standardized error handling, accurate character counting for billing, and uniform audio output.

---

## ✨ Key Features

- **🔌 Provider Agnostic:** Unified API for all TTS providers. Switch providers by changing one config parameter.
- **☁️ Multi-Provider Support:**
  - **Azure Speech Services:** Full support for Neural voices, emotions, and speaking styles.
  - **Google Cloud TTS:** Neural2, WaveNet, Studio, Chirp3-HD voices with EU regional endpoints.
  - **EdenAI:** Access to 6+ providers (OpenAI, Amazon, IBM, etc.) via a single aggregator API.
  - **Ready for:** OpenAI, ElevenLabs, Deepgram (interfaces prepared).
- **📝 SSML Abstraction:** Auto-generates provider-specific SSML markup (e.g., for Azure prosody/styles) from simple JSON options.
- **💰 Character Counting:** Precise character counting logic for billing estimation.
- **🛡️ Robust Error Handling:** Standardized error types (`InvalidConfigError`, `QuotaExceededError`, `NetworkError`) across all providers.
- **📐 TypeScript First:** Fully typed request/response objects and provider options.
- **🇪🇺 GDPR/DSGVO Ready:** Configurable region support (e.g., Azure Germany/Europe regions).

---

## 📦 Installation

```bash
npm install @loonylabs/tts-middleware
```

## 🚀 Quick Start

### 1. Configure Environment

Create a `.env` file in your project root:

```env
# Default Provider
TTS_DEFAULT_PROVIDER=azure

# Azure Speech Services
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=germanywestcentral

# Google Cloud TTS (GDPR/DSGVO-compliant with EU endpoints)
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_TTS_REGION=eu  # Options: eu, europe-west3 (Frankfurt), europe-west1, etc.

# EdenAI (Optional - no DPA available)
EDENAI_API_KEY=your_edenai_key
```

### 2. Basic Usage

```typescript
import { ttsService, TTSProvider } from '@loonylabs/tts-middleware';
import fs from 'fs';

async function generateSpeech() {
  try {
    // Synthesize speech
    const response = await ttsService.synthesize({
      text: "Hello! This is a test of the LoonyLabs TTS middleware.",
      voice: { id: "en-US-JennyNeural" }, // Provider-specific voice ID
      audio: {
        format: "mp3",
        speed: 1.0
      }
    });

    // Save to file
    fs.writeFileSync('output.mp3', response.audio);
    
    console.log(`Generated audio: ${response.metadata.duration}ms`);
    console.log(`Billed characters: ${response.billing.characters}`);

  } catch (error) {
    console.error("Synthesis failed:", error);
  }
}

generateSpeech();
```

---

## 🛠️ Advanced Usage

### Using Provider-Specific Features (e.g., Azure Emotions)

```typescript
const response = await ttsService.synthesize({
  text: "I am so excited to tell you this!",
  provider: TTSProvider.AZURE,
  voice: { id: "en-US-JennyNeural" },
  providerOptions: {
    emotion: "cheerful", // Azure-specific
    style: "chat",       // Azure-specific
    styleDegree: 1.5
  }
});
```

### Switching Providers Dynamically

```typescript
// Use EdenAI to access Google's TTS engine
const response = await ttsService.synthesize({
  text: "Hello from Google via EdenAI",
  provider: TTSProvider.EDENAI,
  voice: { id: "en-US" },
  providerOptions: {
    provider: "google" // Select underlying provider
  }
});
```

### Using OpenAI Voices via EdenAI

Access OpenAI's TTS voices (alloy, echo, fable, onyx, nova, shimmer) through EdenAI with specific voice selection:

```typescript
// German with OpenAI "nova" voice (female)
const response = await ttsService.synthesize({
  text: "Hallo Welt! Das ist ein Test.",
  provider: TTSProvider.EDENAI,
  voice: { id: "de" },  // Language code
  providerOptions: {
    provider: "openai",
    settings: { openai: "de_nova" }  // Voice: {lang}_{voice}
  }
});

// English with OpenAI "onyx" voice (male, deep)
const response = await ttsService.synthesize({
  text: "Hello World! This is a test.",
  provider: TTSProvider.EDENAI,
  voice: { id: "en" },
  providerOptions: {
    provider: "openai",
    settings: { openai: "en_onyx" }
  }
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

### Using Google Cloud TTS (GDPR/DSGVO-Compliant)

Google Cloud TTS with EU regional endpoints for data residency compliance:

```typescript
// Basic usage with EU endpoint (default)
const response = await ttsService.synthesize({
  text: "Guten Tag, wie geht es Ihnen?",
  provider: TTSProvider.GOOGLE,
  voice: { id: "de-DE-Neural2-G" },  // G=Female, H=Male
  audio: { format: "mp3" }
});

// With Frankfurt endpoint for maximum DSGVO compliance
const response = await ttsService.synthesize({
  text: "Hallo Welt!",
  provider: TTSProvider.GOOGLE,
  voice: { id: "de-DE-Studio-C" },  // Premium Studio voice
  audio: { format: "mp3", speed: 1.0, pitch: 0.0 },
  providerOptions: {
    region: "europe-west3",  // Frankfurt
    effectsProfileId: ["headphone-class-device"]  // Audio optimization
  }
});
```

**Available German Voices:**

| Type | Female | Male | Quality |
|------|--------|------|---------|
| Neural2 | `de-DE-Neural2-G` | `de-DE-Neural2-H` | Best value |
| WaveNet | `de-DE-Wavenet-G` | `de-DE-Wavenet-H` | Good |
| Studio | `de-DE-Studio-C` | `de-DE-Studio-B` | Premium |
| Chirp3-HD | `de-DE-Chirp3-HD-Aoede`, `Kore`, ... | `de-DE-Chirp3-HD-Fenrir`, `Puck`, ... | Newest |

> **Note:** German Neural2/WaveNet only have G and H variants (no A-F). Use `scripts/list-google-voices.ts` to query all available voices.

---

## 🏗️ Architecture

The middleware uses a singleton orchestrator pattern to manage provider instances.

```mermaid
graph TD
    App[Your Application] -->|synthesize()| Service[TTSService]
    Service -->|getProvider()| Registry{Provider Registry}

    Registry -->|Select| Azure[AzureProvider]
    Registry -->|Select| GCloud[GoogleCloudTTSProvider]
    Registry -->|Select| Eden[EdenAIProvider]

    Azure -->|SSML/SDK| AzureAPI[Azure Speech API]
    GCloud -->|gRPC/SDK| GoogleAPI[Google Cloud TTS API]
    Eden -->|REST| EdenAPI[EdenAI API]

    GoogleAPI -->|EU Endpoint| EU[eu-texttospeech.googleapis.com]
    EdenAPI -.-> OpenAI[OpenAI TTS]
    EdenAPI -.-> Amazon[Amazon Polly]
```

---

## 🧩 Supported Providers

| Provider | Status | GDPR/DSGVO | Key Features |
|----------|--------|------------|--------------|
| **Azure** | ✅ Stable | ✅ EU Regions | Neural Voices, Emotions, Styles, SSML |
| **Google Cloud** | ✅ Stable | ✅ EU Endpoints | Neural2, WaveNet, Studio, Chirp3-HD, Effects Profiles |
| **EdenAI** | ✅ Stable | ⚠️ No DPA | Aggregator for Google, OpenAI, Amazon, IBM |
| **OpenAI** | 🔮 Planned | ❌ | HD Audio, Simple API |
| **ElevenLabs** | 🔮 Planned | ❌ | Voice Cloning, High Expressivity |

---

## 🔧 Logging Configuration

The middleware includes a pluggable logger interface. By default, it uses `console`, but you can replace it with any logger (Winston, Pino, etc.).

```typescript
import { setLogger, silentLogger, setLogLevel } from '@loonylabs/tts-middleware';

// Disable all logging (useful for tests)
setLogger(silentLogger);

// Set minimum log level (debug, info, warn, error)
setLogLevel('warn'); // Only show warnings and errors

// Use custom logger (e.g., Winston)
setLogger({
  info: (msg, meta) => winston.info(msg, meta),
  warn: (msg, meta) => winston.warn(msg, meta),
  error: (msg, meta) => winston.error(msg, meta),
  debug: (msg, meta) => winston.debug(msg, meta),
});
```

---

## 🧪 Testing

The project maintains high code coverage (>90%) with 434+ tests using Jest.

```bash
# Run all tests
npm test

# Run specific provider tests
npm test -- --testPathPattern="google"
npm test -- --testPathPattern="azure"
npm test -- --testPathPattern="edenai"

# Manual verification scripts (require .env)
npx ts-node scripts/manual-test-google-cloud-tts.ts de neural2
npx ts-node scripts/manual-test-edenai.ts

# List available Google Cloud voices
npx ts-node scripts/list-google-voices.ts de-DE
npx ts-node scripts/list-google-voices.ts en-US
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

Contributions are welcome! Please ensure:
1.  **Tests:** Add tests for new features.
2.  **Linting:** Run `npm run lint` before committing.
3.  **Conventions:** Follow the existing project structure.

## 📄 License

[MIT](LICENSE) © 2026 LoonyLabs Team
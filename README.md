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
  - **EdenAI:** Access to 6+ providers (Google, OpenAI, Amazon, IBM, etc.) via a single aggregator API.
  - **Ready for:** OpenAI, ElevenLabs, Google, Deepgram (interfaces prepared).
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

# EdenAI (Optional)
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
      text: "Hello! This is a test of the Loonylabs TTS middleware.",
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

---

## 🏗️ Architecture

The middleware uses a singleton orchestrator pattern to manage provider instances.

```mermaid
graph TD
    App[Your Application] -->|synthesize()| Service[TTSService]
    Service -->|getProvider()| Registry{Provider Registry}
    
    Registry -->|Select| Azure[AzureProvider]
    Registry -->|Select| Eden[EdenAIProvider]
    
    Azure -->|SSML/SDK| AzureAPI[Azure Speech API]
    Eden -->|REST| EdenAPI[EdenAI API]
    
    EdenAPI -.-> Google[Google TTS]
    EdenAPI -.-> OpenAI[OpenAI TTS]
    EdenAPI -.-> Amazon[Amazon Polly]
```

---

## 🧩 Supported Providers

| Provider | Status | Key Features |
|----------|--------|--------------|
| **Azure** | ✅ Stable | Neural Voices, Emotions, Styles, SSML, Visemes (planned) |
| **EdenAI** | ✅ Stable | Aggregator for Google, OpenAI, Amazon, IBM, Microsoft |
| **OpenAI** | 🔮 Planned | HD Audio, Simple API |
| **ElevenLabs** | 🔮 Planned | Voice Cloning, High Expressivity |
| **Google** | 🔮 Planned | WaveNet Voices, Pitch/Volume control |

---

## 🧪 Testing

The project maintains high code coverage (>94%) using Jest.

```bash
# Run unit & integration tests
npm test

# Run manual verification script (requires .env)
npx ts-node scripts/manual-test-edenai.ts
```

## 🤝 Contributing

Contributions are welcome! Please ensure:
1.  **Tests:** Add tests for new features.
2.  **Linting:** Run `npm run lint` before committing.
3.  **Conventions:** Follow the existing project structure.

## 📄 License

[MIT](LICENSE) © 2026 LoolyLabs Team
# TTS Provider Parameters Matrix

This document shows which parameters are supported by each TTS provider and their implementation status.

## Legend

- ✅ **MVP**: Implemented in current MVP release
- 🔮 **Future**: Typed but not implemented yet
- ❌ **Not Supported**: Provider doesn't support this feature
- ⚠️ **Partial**: Limited support or specific conditions apply

---

## Universal Parameters (All Providers)

These parameters are part of the core `TTSSynthesizeRequest` interface and work across all providers:

| Parameter | Azure (MVP) | OpenAI | ElevenLabs | Google | Deepgram | Notes |
|-----------|-------------|--------|------------|--------|----------|-------|
| **text** | ✅ | 🔮 | 🔮 | 🔮 | 🔮 | Input text to synthesize |
| **voice.id** | ✅ | 🔮 | 🔮 | 🔮 | 🔮 | Voice identifier (provider-specific) |
| **audio.format** | ✅ | 🔮 | 🔮 | 🔮 | 🔮 | mp3, wav, opus, aac, flac |
| **audio.speed** | ✅ | 🔮 | 🔮 | 🔮 | 🔮 | 0.5 - 2.0 multiplier |
| **audio.sampleRate** | ✅ | 🔮 | 🔮 | 🔮 | 🔮 | 8000, 16000, 24000, 48000 Hz |
| **audio.pitch** | 🔮 | ❌ | ❌ | 🔮 | ❌ | -20 to 20 semitones |
| **audio.volumeGainDb** | 🔮 | ❌ | ❌ | 🔮 | ❌ | -96 to 16 dB |

---

## Provider-Specific Parameters

These parameters are passed via `providerOptions: Record<string, unknown>` in the request.

### Azure Speech Services (MVP ✅)

| Parameter | Status | Type | Range/Options | Description |
|-----------|--------|------|---------------|-------------|
| **emotion** | ✅ MVP | string | 'sad', 'angry', 'cheerful', 'friendly', etc. | Emotional tone of speech |
| **style** | ✅ MVP | string | 'chat', 'customerservice', 'newscast', 'assistant', etc. | Speaking style |
| **styleDegree** | 🔮 Future | number | 0.01 - 2.0 | Style intensity |
| **role** | 🔮 Future | string | 'YoungAdultFemale', 'Boy', etc. | Role play scenario |

**Implementation Status**: MVP (emotion, style implemented)
**Billing Model**: Character-based (~$16 per 1M characters)
**Free Tier**: 500,000 characters/month
**EU Compliance**: ✅ (germanywestcentral region)

---

### EdenAI (✅ Stable)

EdenAI is a multi-provider aggregator. Use `settings` to configure provider-specific options.

| Parameter | Status | Type | Range/Options | Description |
|-----------|--------|------|---------------|-------------|
| **provider** | ✅ Stable | string | 'google', 'openai', 'amazon', 'ibm', 'microsoft', 'elevenlabs' | Underlying TTS provider |
| **settings** | ✅ Stable | object | `{ openai: 'de_nova' }` | Provider-specific voice/model selection |
| **option** | ✅ Stable | string | 'FEMALE', 'MALE' | Gender option (fallback) |
| **model** | ⚠️ Deprecated | string | 'Neural', 'Standard' | Use `settings` instead |

**Implementation Status**: Stable
**Billing Model**: Varies by underlying provider
**Free Tier**: Trial credits available

#### OpenAI Voices via EdenAI

Format: `{language_code}_{voice_name}` (e.g., `de_nova`, `en_alloy`)

| Voice | Character | Example (German) | Example (English) |
|-------|-----------|------------------|-------------------|
| `alloy` | Neutral | `de_alloy` | `en_alloy` |
| `echo` | Male | `de_echo` | `en_echo` |
| `fable` | Expressive | `de_fable` | `en_fable` |
| `onyx` | Male, deep | `de_onyx` | `en_onyx` |
| `nova` | Female | `de_nova` | `en_nova` |
| `shimmer` | Female, warm | `de_shimmer` | `en_shimmer` |

**Supported Languages (57):** af, ar, az, be, bg, bs, ca, cs, cy, da, de, el, en, es, et, fa, fi, fr, gl, he, hi, hr, hu, hy, id, is, it, ja, kk, kn, ko, lt, lv, mi, mk, mr, ms, ne, nl, no, pl, pt, ro, ru, sk, sl, sr, sv, sw, ta, th, tl, tr, uk, ur, vi, zh

---

### OpenAI TTS (🔮 Future - Direct API)

| Parameter | Status | Type | Range/Options | Description |
|-----------|--------|------|---------------|-------------|
| **model** | 🔮 Future | string | 'tts-1', 'tts-1-hd', 'gpt-4o-mini-tts' | TTS model selection |
| **responseFormat** | 🔮 Future | string | 'mp3', 'opus', 'aac', 'flac' | Output format override |

**Implementation Status**: Not implemented (use EdenAI for OpenAI access)
**Billing Model**: Character-based (~$15 per 1M characters) OR Token-based (gpt-4o-mini-tts)
**Free Tier**: None
**EU Compliance**: ⚠️ (available but US default)

**Voices**: 6 standard voices (alloy, echo, fable, onyx, nova, shimmer)

---

### ElevenLabs (🔮 Future)

| Parameter | Status | Type | Range/Options | Description |
|-----------|--------|------|---------------|-------------|
| **model_id** | 🔮 Future | string | 'eleven_monolingual_v1', 'eleven_multilingual_v2', etc. | Voice model |
| **stability** | 🔮 Future | number | 0.0 - 1.0 | Voice stability vs. expressiveness |
| **similarity_boost** | 🔮 Future | number | 0.0 - 1.0 | Similarity to original voice |
| **speaker_boost** | 🔮 Future | boolean | true/false | Enhanced clarity |
| **style** | 🔮 Future | number | 0.0 - 1.0 | Style exaggeration (different from Azure!) |

**Implementation Status**: Not implemented (types ready)
**Billing Model**: Character-based (~$150-200 per 1M characters depending on plan)
**Free Tier**: 10,000 characters/month
**EU Compliance**: ⚠️ (available on request)

**Voices**: 500+ voices, voice cloning available

---

### Google Cloud Text-to-Speech (🔮 Future)

| Parameter | Status | Type | Range/Options | Description |
|-----------|--------|------|---------------|-------------|
| **effectsProfileId** | 🔮 Future | string[] | 'headphone-class-device', 'telephony-class-application', etc. | Audio effects profiles |
| **pitchSemitones** | 🔮 Future | number | -20.0 to 20.0 | Pitch adjustment (overrides audio.pitch) |
| **speakingRate** | 🔮 Future | number | 0.25 - 4.0 | Speaking rate (alternative to speed) |
| **volumeGainDb** | 🔮 Future | number | -96.0 to 16.0 | Volume gain (alternative to volumeGainDb) |

**Implementation Status**: Not implemented (types ready)
**Billing Model**: Character-based (~$16 per 1M characters)
**Free Tier**: 1M characters/month
**EU Compliance**: ✅ (EU region available)

**Voices**: 400+ voices, extensive language support

---

### Deepgram TTS (🔮 Future)

| Parameter | Status | Type | Range/Options | Description |
|-----------|--------|------|---------------|-------------|
| **model** | 🔮 Future | string | 'aura-asteria-en', 'aura-luna-en', etc. | TTS model/voice selection |
| **encoding** | 🔮 Future | string | 'linear16', 'mulaw', 'alaw', 'opus', 'aac', 'mp3' | Audio encoding |
| **container** | 🔮 Future | string | 'wav', 'mp3', 'opus', 'flac' | Container format |
| **bitrate** | 🔮 Future | string | '128000' (128 kbps) | Bitrate for encoded audio |
| **sampleRate** | 🔮 Future | number | 8000, 16000, 24000, 48000 | Sample rate override |

**Implementation Status**: Not implemented (types ready)
**Billing Model**: Character-based (~$15 per 1M characters)
**Free Tier**: None
**EU Compliance**: ✅ (api.eu.deepgram.com endpoint)

**Voices**: Limited but high quality, optimized for low latency

---

## Feature Comparison

| Feature | Azure | OpenAI | ElevenLabs | Google | Deepgram |
|---------|-------|--------|------------|--------|----------|
| **Character Billing** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Token Billing** | ❌ | ⚠️ (gpt-4o-mini-tts only) | ❌ | ❌ | ❌ |
| **Speed Control** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pitch Control** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Emotion/Style** | ✅ | ❌ | ⚠️ (limited) | ❌ | ❌ |
| **Streaming** | ✅ | ⚠️ (chunks only) | ✅ | ❌ | ✅ |
| **SSML Support** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **EU Hosting** | ✅ (Frankfurt) | ⚠️ (US default) | ⚠️ (on request) | ✅ (EU available) | ✅ (api.eu.*) |
| **DPA/GDPR** | ✅ | ⚠️ (available) | ⚠️ (available) | ✅ | ✅ |
| **Free Tier** | 500k/month | ❌ | 10k/month | 1M/month | ❌ |

---

## Audio Format Support

| Format | Azure | OpenAI | ElevenLabs | Google | Deepgram |
|--------|-------|--------|------------|--------|----------|
| **MP3** | ✅ MVP | 🔮 | 🔮 | 🔮 | 🔮 |
| **WAV** | ✅ MVP | ❌ | ❌ | 🔮 | 🔮 |
| **Opus** | ✅ MVP | 🔮 | ❌ | 🔮 | 🔮 |
| **AAC** | ❌ | 🔮 | ❌ | ❌ | 🔮 |
| **FLAC** | ❌ | 🔮 | ❌ | 🔮 | 🔮 |

---

## Sample Rate Support

| Sample Rate | Azure | OpenAI | ElevenLabs | Google | Deepgram |
|-------------|-------|--------|------------|--------|----------|
| **8000 Hz** | ✅ MVP | ❌ | ❌ | 🔮 | 🔮 |
| **16000 Hz** | ✅ MVP | ❌ | ❌ | 🔮 | 🔮 |
| **24000 Hz** | ✅ MVP | ❌ | ❌ | 🔮 | 🔮 |
| **48000 Hz** | ✅ MVP | ❌ | ❌ | 🔮 | 🔮 |

---

## Implementation Roadmap

### Phase 1: MVP (Current)
- ✅ Azure Speech Services
  - Character-based billing
  - Emotion and style support
  - MP3, WAV, Opus formats
  - Multiple sample rates (8k, 16k, 24k, 48k)
  - EU compliance (germanywestcentral)

### Phase 2: Additional Providers
- 🔮 OpenAI TTS
  - Character/token-based billing
  - Simple API (minimal options)
  - High-quality voices (6 standard)

- 🔮 ElevenLabs
  - Character-based billing
  - Voice cloning capability
  - Advanced voice tuning (stability, similarity)

### Phase 3: Enterprise Features
- 🔮 Google Cloud TTS
  - Full feature parity
  - Extensive language support (400+ voices)
  - Audio effects profiles

- 🔮 Deepgram
  - EU endpoint support
  - Low-latency optimization
  - Streaming capabilities

### Future Enhancements
- 🔮 Voice Catalog API
- 🔮 SSML Consumer Input
- 🔮 Streaming Output
- 🔮 Batch Synthesis
- 🔮 Voice Quality Recommendations

---

## Usage Examples

### Azure with Emotion (MVP)

```typescript
const request: TTSSynthesizeRequest = {
  text: "I'm so excited!",
  provider: TTSProvider.AZURE,
  voice: { id: 'en-US-JennyNeural' },
  audio: { speed: 1.0, format: 'mp3' },
  providerOptions: {
    emotion: 'cheerful',
    style: 'chat'
  }
};
```

### OpenAI with Model Selection (Future)

```typescript
const request: TTSSynthesizeRequest = {
  text: "Hello world",
  provider: TTSProvider.OPENAI,
  voice: { id: 'alloy' },
  providerOptions: {
    model: 'tts-1-hd',
    responseFormat: 'opus'
  }
};
```

### ElevenLabs with Voice Tuning (Future)

```typescript
const request: TTSSynthesizeRequest = {
  text: "Custom voice synthesis",
  provider: TTSProvider.ELEVENLABS,
  voice: { id: 'voice_xyz123' },
  providerOptions: {
    stability: 0.5,
    similarity_boost: 0.75,
    speaker_boost: true
  }
};
```

### Google with Audio Effects (Future)

```typescript
const request: TTSSynthesizeRequest = {
  text: "Optimized for headphones",
  provider: TTSProvider.GOOGLE,
  voice: { id: 'en-US-Neural2-A' },
  providerOptions: {
    effectsProfileId: ['headphone-class-device'],
    pitchSemitones: 2.0
  }
};
```

---

## Notes

### Breaking Changes Policy

All provider parameters are typed NOW to prevent breaking API changes:

- ✅ **Adding new providers**: No changes to base types needed
- ✅ **Adding new parameters**: Just update provider-options types
- ✅ **Consumer code**: No changes needed when providers are added
- ✅ **Type safety**: Full TypeScript support for all providers

### Provider Selection Strategy

Consumers should choose providers based on:

1. **Cost**: Azure/OpenAI/Deepgram (~$15-16/M) vs. ElevenLabs (~$150-200/M)
2. **Quality**: ElevenLabs > Azure > OpenAI > Google > Deepgram (subjective)
3. **Latency**: Deepgram < OpenAI < Azure < Google < ElevenLabs
4. **Voice Selection**: ElevenLabs (500+) > Google (400+) > Azure (180+) > OpenAI (6)
5. **EU Compliance**: Azure, Google, Deepgram have EU regions
6. **Free Tier**: Google (1M) > Azure (500k) > ElevenLabs (10k) > Others (none)

### Billing Responsibility

The middleware **does NOT calculate costs**. It only returns:
- `billing.characters`: Character count (excluding SSML)
- `billing.tokensUsed`: Token count (if applicable)

Consumer applications calculate costs based on their provider rates:

```typescript
const PROVIDER_RATES = {
  [TTSProvider.AZURE]: 16 / 1_000_000,
  [TTSProvider.OPENAI]: 15 / 1_000_000,
  [TTSProvider.ELEVENLABS]: 160 / 1_000_000,
  [TTSProvider.GOOGLE]: 16 / 1_000_000,
  [TTSProvider.DEEPGRAM]: 15 / 1_000_000,
};

const costUSD = response.billing.characters * PROVIDER_RATES[provider];
```

---

**Document Version**: 1.1
**Last Updated**: 2026-01-08
**Status**: Azure + EdenAI stable - Types ready for all providers

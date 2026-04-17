import * as fs from 'fs';
import * as path from 'path';
import { VertexAITTSProvider } from '../src/middleware/services/tts/providers/vertex-ai-tts-provider';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

/**
 * Fenrir variance test — probes stochastic voice-drift at the Gemini API.
 *
 * Background: Variant E (Fenrir + neutral text + simple prompt) rendered
 * as a female voice, while the hosted Fenrir voice-preview (different
 * model generation) is clearly male, and Scribomate's real seg0 Narrator
 * with the same voiceName rendered male. The byte-identical shape of the
 * request rules out our code path — the variance must come from the
 * Gemini `gemini-3.1-flash-tts-preview` model itself.
 *
 * This script runs the SAME neutral-text + Fenrir request four times:
 *   - 3× at temperature 1.0 (our current default) → varies per call?
 *   - 1× at temperature 0.0 → deterministic mode
 *
 * Listening outcomes:
 *   - 3× temp=1.0 all same gender   → no stochasticity, deterministic
 *     mis-rendering for this input.
 *   - 3× temp=1.0 mixed genders     → Gemini is stochastic at temp=1.
 *     Workaround: retry-on-wrong-voice, or lower the default temperature.
 *   - temp=0.0 male                 → dropping to temp=0 (or 0.3) fixes
 *     the drift at the cost of prosody variety.
 *   - temp=0.0 also female          → the preview model itself has drifted
 *     Fenrir away from reliably male. Workaround: stop using Fenrir in
 *     the voice-cascade until Google fixes it.
 *
 * Usage:
 *   cd C:/Development/loonylabs/tts-middleware
 *   npx ts-node scripts/manual-test-gemini-dialog-fenrir-variance.ts
 */

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('.env file loaded from root.');
    } else {
      console.warn('No .env file found in root. Relying on system environment variables.');
    }
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
}

const NEUTRAL_TEXT =
  'Es war ein ruhiger Morgen am großen Teich. Die Sonne schien warm auf das Wasser und die Seerosen bewegten sich sanft. Viele Enten schwammen umher, jede auf ihrer eigenen Spur. In der Ferne konnte man das leise Quaken hören. Ein kleiner Fisch sprang aus dem Wasser und tauchte gleich wieder unter.';

function buildRequest(temperature: number): SynthesizeDialogRequest {
  return {
    speakers: [{ speaker: 'Narrator', voice: 'Fenrir' }],
    segments: [
      {
        stylePrompt: 'Lies den folgenden Text als ruhiger, beobachtender Erzähler:',
        turns: [{ speaker: 'Narrator', text: NEUTRAL_TEXT }],
      },
    ],
    voice: { languageCode: 'de-DE' },
    audio: { format: 'mp3' },
    providerOptions: {
      model: 'gemini-3.1-flash-tts-preview',
      temperature,
    },
  };
}

async function runOnce(
  provider: VertexAITTSProvider,
  label: string,
  temperature: number,
  outPath: string,
) {
  console.log(`\n=== ${label} (temp=${temperature}) ===`);
  const startTime = Date.now();
  const response = await provider.synthesizeDialog(buildRequest(temperature));
  const duration = Date.now() - startTime;

  fs.writeFileSync(outPath, response.audio);
  console.log(
    `  ✅ ${(response.audio.length / 1024).toFixed(1)} KB, ${
      response.metadata.audioDuration ? (response.metadata.audioDuration / 1000).toFixed(1) + 's' : 'N/A'
    }, ${duration}ms`,
  );
  console.log(`  Output: ${outPath}`);
}

async function main() {
  loadEnv();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS is not set.');
    process.exit(1);
  }
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    console.error('❌ GOOGLE_CLOUD_PROJECT is not set.');
    process.exit(1);
  }

  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const provider = new VertexAITTSProvider();

  await runOnce(provider, 'Run 1 — Fenrir + neutral text', 1.0, path.join(outputDir, `fenrir-variance-t1-run1-${ts}.mp3`));
  await runOnce(provider, 'Run 2 — Fenrir + neutral text', 1.0, path.join(outputDir, `fenrir-variance-t1-run2-${ts}.mp3`));
  await runOnce(provider, 'Run 3 — Fenrir + neutral text', 1.0, path.join(outputDir, `fenrir-variance-t1-run3-${ts}.mp3`));
  await runOnce(provider, 'Run 4 — Fenrir + neutral text, DETERMINISTIC', 0.0, path.join(outputDir, `fenrir-variance-t0-${ts}.mp3`));

  console.log('\n=== Done ===');
  console.log('Listen to all four. Gender of each:');
  console.log('  Run 1 (t=1.0):  ?');
  console.log('  Run 2 (t=1.0):  ?');
  console.log('  Run 3 (t=1.0):  ?');
  console.log('  Run 4 (t=0.0):  ?');
  console.log('');
  console.log('Three of kind at t=1.0 → deterministic misinterpretation.');
  console.log('Mixed at t=1.0       → stochastic drift. Solution: lower temperature or retry.');
  console.log('t=0.0 male           → drop temperature to 0.0 or 0.3 as workaround.');
  console.log('t=0.0 female         → Fenrir has drifted; switch Narrator-cascade to Orus/Charon.');
}

main().catch((err) => {
  console.error('\n❌ Script failed:', err);
  if (err instanceof Error) console.error('Message:', err.message);
  process.exit(1);
});

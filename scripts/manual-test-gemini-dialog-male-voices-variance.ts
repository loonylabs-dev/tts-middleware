import * as fs from 'fs';
import * as path from 'path';
import { VertexAITTSProvider } from '../src/middleware/services/tts/providers/vertex-ai-tts-provider';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

/**
 * Male-voice stability test for Scribomate Narrator-cascade replacement.
 *
 * Background: Fenrir variance test proved Gemini 3.1 Flash TTS Preview
 * renders Fenrir stochastically at temp=1.0 (mixed male/female) AND
 * deterministically female at temp=0.0 for neutral-narrative text. Fenrir
 * can no longer be trusted as a stable male Narrator voice.
 *
 * This test runs the SAME neutral-text input through two candidate
 * replacement voices — Orus and Charon — at four settings each:
 *   - 3× at temp=1.0 (varies per call)
 *   - 1× at temp=0.0 (deterministic floor)
 *
 * Goal: find a male voice that is RELIABLY male across all four runs.
 * That voice becomes the new Narrator default.
 *
 * Usage:
 *   cd C:/Development/loonylabs/tts-middleware
 *   npx ts-node scripts/manual-test-gemini-dialog-male-voices-variance.ts
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

function buildRequest(voiceName: string, temperature: number): SynthesizeDialogRequest {
  return {
    speakers: [{ speaker: 'Narrator', voice: voiceName }],
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
  voiceName: string,
  runLabel: string,
  temperature: number,
  outPath: string,
) {
  console.log(`  ${runLabel} (t=${temperature}) …`);
  const startTime = Date.now();
  const response = await provider.synthesizeDialog(buildRequest(voiceName, temperature));
  const duration = Date.now() - startTime;

  fs.writeFileSync(outPath, response.audio);
  console.log(
    `    ✅ ${(response.audio.length / 1024).toFixed(1)} KB, ${
      response.metadata.audioDuration ? (response.metadata.audioDuration / 1000).toFixed(1) + 's' : 'N/A'
    }, ${duration}ms → ${outPath}`,
  );
}

async function testVoice(
  provider: VertexAITTSProvider,
  voiceName: string,
  outputDir: string,
  ts: string,
) {
  console.log(`\n=== Voice: ${voiceName} ===`);
  await runOnce(provider, voiceName, `${voiceName} Run 1`, 1.0, path.join(outputDir, `voice-${voiceName}-t1-run1-${ts}.mp3`));
  await runOnce(provider, voiceName, `${voiceName} Run 2`, 1.0, path.join(outputDir, `voice-${voiceName}-t1-run2-${ts}.mp3`));
  await runOnce(provider, voiceName, `${voiceName} Run 3`, 1.0, path.join(outputDir, `voice-${voiceName}-t1-run3-${ts}.mp3`));
  await runOnce(provider, voiceName, `${voiceName} DETERMINISTIC`, 0.0, path.join(outputDir, `voice-${voiceName}-t0-${ts}.mp3`));
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

  await testVoice(provider, 'Orus', outputDir, ts);
  await testVoice(provider, 'Charon', outputDir, ts);

  console.log('\n=== Done ===');
  console.log('Per voice: listen to 4 files (t1-run1..3, t0). Note gender of each.');
  console.log('');
  console.log('Decision rule:');
  console.log('  If ALL 4 runs of a voice are clearly male → that voice is the new Narrator default.');
  console.log('  If any run is female/neutral → unreliable. Don\'t use.');
  console.log('');
  console.log('If BOTH Orus and Charon wobble like Fenrir → the preview model is broadly broken for');
  console.log('male narration of neutral German text. We\'d need to either accept stochastic drift');
  console.log('or pick a voice that is male-coded strongly enough to survive the drift.');
}

main().catch((err) => {
  console.error('\n❌ Script failed:', err);
  if (err instanceof Error) console.error('Message:', err.message);
  process.exit(1);
});

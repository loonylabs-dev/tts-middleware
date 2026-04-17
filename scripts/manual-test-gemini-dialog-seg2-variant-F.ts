import * as fs from 'fs';
import * as path from 'path';
import { VertexAITTSProvider } from '../src/middleware/services/tts/providers/vertex-ai-tts-provider';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

/**
 * Variant F — minimal Replicate-style prompt.
 *
 * Same voice (Fenrir) and same seg2 text as Variant C, but the elaborate
 * Scribomate stylePrompt is replaced with a trivial three-word imperative
 * — the same pattern Replicate's wrapper uses as its default for the
 * Gemini 3.1 Flash TTS model ("Say the following.").
 *
 * If C renders female and F renders male, we've localized the drift to the
 * stylePrompt length/verbosity interacting with the voice config.
 *
 * Usage:
 *   cd C:/Development/loonylabs/tts-middleware
 *   npx ts-node scripts/manual-test-gemini-dialog-seg2-variant-F.ts
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

const SEG2_TEXT_AS_SENT =
  '[short pause] , rief er und raste wie eine wilde Rakete über das Wasser. Isander paddelte ganz entspannt los. Sie schaute nach links und rechts. Plötzlich glitzerte etwas unter einem Seerosenblatt. Es war eine goldene Scherbe! Isander stoppte kurz, um sie zu bewundern. Sie paddelte nicht den langen Weg um die Insel, sondern nutzte den schmalen Pfad durch die Schilf-Geheimtür, den nur sie kannte. Sie sah Turbosahne in der Ferne keuchend gegen die Strömung kämpfen. Als Isander ganz gemütlich am alten Baum ankam, saß sie schon seelenruhig da, als Turbosahne endlich völlig außer Puste auftauchte.';

function buildVariantF(): SynthesizeDialogRequest {
  return {
    speakers: [{ speaker: 'Narrator', voice: 'Fenrir' }],
    segments: [
      {
        stylePrompt: 'Lies das Folgende.',
        turns: [{ speaker: 'Narrator', text: SEG2_TEXT_AS_SENT }],
      },
    ],
    voice: { languageCode: 'de-DE' },
    audio: { format: 'mp3' },
    providerOptions: { model: 'gemini-3.1-flash-tts-preview', temperature: 1.0 },
  };
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
  const outPath = path.join(outputDir, `seg2-isolation-F-fenrir-minimalprompt-${ts}.mp3`);

  const provider = new VertexAITTSProvider();
  const request = buildVariantF();

  console.log('\n=== Variant F — Fenrir, seg2 original text, MINIMAL prompt ===');
  console.log(`  Voice:       ${request.speakers[0].voice}`);
  console.log(`  stylePrompt: "${request.segments[0].stylePrompt}"`);
  const t = request.segments[0].turns[0].text;
  console.log(`  text (${t.length}B): "${t.slice(0, 120)}${t.length > 120 ? '…' : ''}"`);

  const startTime = Date.now();
  const response = await provider.synthesizeDialog(request);
  const duration = Date.now() - startTime;

  fs.writeFileSync(outPath, response.audio);
  console.log(
    `  ✅ ${(response.audio.length / 1024).toFixed(1)} KB, ${
      response.metadata.audioDuration ? (response.metadata.audioDuration / 1000).toFixed(1) + 's' : 'N/A'
    }, ${duration}ms`,
  );
  console.log(`  Output: ${outPath}`);

  console.log('\n=== Diagnose ===');
  console.log('F männlich  → elaborate stylePrompt war der Treiber. Fix: stylePrompts drastisch kürzen.');
  console.log('F weiblich  → stylePrompt-Länge ist nicht der Grund. Text-Inhalt kippt die Voice.');
}

main().catch((err) => {
  console.error('\n❌ Script failed:', err);
  if (err instanceof Error) console.error('Message:', err.message);
  process.exit(1);
});

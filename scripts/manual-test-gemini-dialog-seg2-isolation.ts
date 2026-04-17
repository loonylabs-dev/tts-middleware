import * as fs from 'fs';
import * as path from 'path';
import { VertexAITTSProvider } from '../src/middleware/services/tts/providers/vertex-ai-tts-provider';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

/**
 * seg2 isolation diagnostic — three variants, each changes exactly ONE
 * variable to localize the Fenrir-reads-as-female bug.
 *
 * Background: In Scribomate section df9d36a5 seg2 is configured with
 * `prebuiltVoiceConfig.voiceName: "Fenrir"` (male) but renders as a
 * female voice. Neither the leading "[short pause] , rief er" fragment
 * (Variant B in the previous script) nor the full 7-segment context
 * fixed it — both A and B had the same female drift.
 *
 * Variants here isolate independent variables:
 *
 *   C: seg2 as a standalone SINGLE-SEGMENT request (no seg0/seg1 context).
 *      If C still sounds female → per-call Gemini behavior, no cross-call
 *      leakage. Confirms HTTP statelessness. Narrows the bug to seg2's
 *      own input.
 *
 *   D: seg2 with voiceName = "Leda" (known female) instead of "Fenrir".
 *      If Leda sounds clearly different from Fenrir → Gemini IS respecting
 *      the voice config; Fenrir just happens to render feminine for this
 *      text. If Leda sounds identical to Fenrir → Gemini ignores the
 *      voice config for this text entirely.
 *
 *   E: seg2 with text replaced by a neutral clean sentence + Fenrir.
 *      If E sounds clearly male → text content drives Gemini's voice
 *      selection, overriding prebuiltVoiceConfig. That would be the root
 *      cause. If E still sounds female → not text content; something
 *      else (stylePrompt? segment length? combination?).
 *
 * Usage:
 *   cd C:/Development/loonylabs/tts-middleware
 *   npx ts-node scripts/manual-test-gemini-dialog-seg2-isolation.ts
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

// ---------------------------------------------------------------------------
// seg2 reference data — verbatim from Scribomate section df9d36a5,
// formatted exactly as Scribomate would send it (tag prepended, trailing
// comma stripped by formatTurnForMiddleware).
// ---------------------------------------------------------------------------

const SEG2_STYLE_PROMPT =
  'Lies die folgende Passage als beobachtender Erzähler, der den Kontrast zwischen den beiden Schwimmern beschreibt:';

const SEG2_TEXT_AS_SENT =
  '[short pause] , rief er und raste wie eine wilde Rakete über das Wasser. Isander paddelte ganz entspannt los. Sie schaute nach links und rechts. Plötzlich glitzerte etwas unter einem Seerosenblatt. Es war eine goldene Scherbe! Isander stoppte kurz, um sie zu bewundern. Sie paddelte nicht den langen Weg um die Insel, sondern nutzte den schmalen Pfad durch die Schilf-Geheimtür, den nur sie kannte. Sie sah Turbosahne in der Ferne keuchend gegen die Strömung kämpfen. Als Isander ganz gemütlich am alten Baum ankam, saß sie schon seelenruhig da, als Turbosahne endlich völlig außer Puste auftauchte.';

const NEUTRAL_SAFE_TEXT =
  'Es war ein ruhiger Morgen am großen Teich. Die Sonne schien warm auf das Wasser und die Seerosen bewegten sich sanft. Viele Enten schwammen umher, jede auf ihrer eigenen Spur. In der Ferne konnte man das leise Quaken hören. Ein kleiner Fisch sprang aus dem Wasser und tauchte gleich wieder unter.';

// ---------------------------------------------------------------------------
// Request builders
// ---------------------------------------------------------------------------

function buildVariantC(): SynthesizeDialogRequest {
  // C: seg2 alone, exact Scribomate formatting, Fenrir voice.
  return {
    speakers: [{ speaker: 'Narrator', voice: 'Fenrir' }],
    segments: [
      {
        stylePrompt: SEG2_STYLE_PROMPT,
        turns: [{ speaker: 'Narrator', text: SEG2_TEXT_AS_SENT }],
      },
    ],
    voice: { languageCode: 'de-DE' },
    audio: { format: 'mp3' },
    providerOptions: { model: 'gemini-3.1-flash-tts-preview', temperature: 1.0 },
  };
}

function buildVariantD(): SynthesizeDialogRequest {
  // D: same as C but voiceName Leda (known female). If this renders male
  // or identical to Fenrir → Gemini ignores voice config for this text.
  return {
    speakers: [{ speaker: 'Narrator', voice: 'Leda' }],
    segments: [
      {
        stylePrompt: SEG2_STYLE_PROMPT,
        turns: [{ speaker: 'Narrator', text: SEG2_TEXT_AS_SENT }],
      },
    ],
    voice: { languageCode: 'de-DE' },
    audio: { format: 'mp3' },
    providerOptions: { model: 'gemini-3.1-flash-tts-preview', temperature: 1.0 },
  };
}

function buildVariantE(): SynthesizeDialogRequest {
  // E: Fenrir voice, Fenrir stylePrompt (different — to match the content
  // better), neutral clean text with NO fragment, NO character names in
  // dialog-attribution patterns. If E renders male → the seg2 text itself
  // is what drags Gemini toward a female voice. If E renders female →
  // text content isn't the driver.
  return {
    speakers: [{ speaker: 'Narrator', voice: 'Fenrir' }],
    segments: [
      {
        stylePrompt: 'Lies den folgenden Text als ruhiger, beobachtender Erzähler:',
        turns: [{ speaker: 'Narrator', text: NEUTRAL_SAFE_TEXT }],
      },
    ],
    voice: { languageCode: 'de-DE' },
    audio: { format: 'mp3' },
    providerOptions: { model: 'gemini-3.1-flash-tts-preview', temperature: 1.0 },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function renderVariant(
  provider: VertexAITTSProvider,
  label: string,
  request: SynthesizeDialogRequest,
  outPath: string,
) {
  console.log(`\n=== ${label} ===`);
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
  const pathC = path.join(outputDir, `seg2-isolation-C-fenrir-solo-${ts}.mp3`);
  const pathD = path.join(outputDir, `seg2-isolation-D-leda-solo-${ts}.mp3`);
  const pathE = path.join(outputDir, `seg2-isolation-E-fenrir-neutraltext-${ts}.mp3`);

  const provider = new VertexAITTSProvider();

  await renderVariant(
    provider,
    'Variant C — seg2 solo, Fenrir, exact Scribomate text',
    buildVariantC(),
    pathC,
  );
  await renderVariant(
    provider,
    'Variant D — seg2 solo, LEDA (female), exact Scribomate text',
    buildVariantD(),
    pathD,
  );
  await renderVariant(
    provider,
    'Variant E — solo, Fenrir, NEUTRAL clean text',
    buildVariantE(),
    pathE,
  );

  console.log('\n=== Done. Listen and triage ===');
  console.log(`C: ${pathC}`);
  console.log(`D: ${pathD}`);
  console.log(`E: ${pathE}`);
  console.log('');
  console.log('Triage matrix:');
  console.log('  C male, D female   → Gemini respects voice config; cross-call effect was never the issue (expected — HTTP stateless).');
  console.log('                       Original bug must be something about seg2\'s combined input. Proceed to E.');
  console.log('  C female           → Gemini ignores Fenrir for seg2\'s text. Seg2 input drives the drift.');
  console.log('  C & D sound same   → Gemini ignores the voice config entirely for this text.');
  console.log('  E male             → Fenrir works fine on neutral text. seg2\'s text content is the driver.');
  console.log('  E female           → Fenrir + this stylePrompt no matter what text → voice naming or stylePrompt interaction.');
}

main().catch((err) => {
  console.error('\n❌ Script failed:', err);
  if (err instanceof Error) {
    console.error('Message:', err.message);
  }
  process.exit(1);
});

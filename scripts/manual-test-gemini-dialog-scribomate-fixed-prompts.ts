import * as fs from 'fs';
import * as path from 'path';
import { VertexAITTSProvider } from '../src/middleware/services/tts/providers/vertex-ai-tts-provider';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

/**
 * Sanity-Check — does Scribomate's 7-segment structure sound clean
 * WHEN given per-segment-appropriate (human-corrected) stylePrompts?
 *
 * Input: the EXACT 7 segments that Scribomate's parser produced in the
 * 2026-04-17T14:29 run (same text, same speakers, same voice mapping),
 * but each stylePrompt rewritten by hand to match ONLY that segment's
 * actual speakers — test-script-style.
 *
 * If the output sounds clean → the API and middleware are fine; the bug
 * is purely the parser LLM's tendency to copy scene-level prompts across
 * segments with different speakers. The fix is a stricter parser prompt.
 *
 * If the output still sounds buggy → there's another factor in play we
 * haven't identified yet.
 *
 * Usage:
 *   cd C:/Development/loonylabs/tts-middleware
 *   npx ts-node scripts/manual-test-gemini-dialog-scribomate-fixed-prompts.ts
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

/**
 * Scribomate's 7-segment structure (from the 2026-04-17T14:29 parse run),
 * but with per-segment-appropriate stylePrompts hand-written to match each
 * segment's ACTUAL speakers — NOT a scene-level copy.
 *
 * Voices mirror what Scribomate's cascade picked:
 *   Narrator  → Fenrir
 *   Turbosahne → Aoede
 *   Isander   → Leda
 */
function buildScribomateRequest(): SynthesizeDialogRequest {
  return {
    speakers: [
      { speaker: 'Narrator',   voice: 'Fenrir' },
      { speaker: 'Turbosahne', voice: 'Aoede'  },
      { speaker: 'Isander',    voice: 'Leda'   },
    ],
    segments: [
      // --- seg0: Narrator opens the scene ---
      {
        stylePrompt:
          'Lies den folgenden Text als ruhiger, warmer Erzähler, der eine friedliche Szene am Teich mit einer geheimnisvollen Entdeckung beschreibt:',
        turns: [
          {
            speaker: 'Narrator',
            text:
              'Am großen Teich ging es drunter und drüber. Überall flitzten Enten hin und her, quatschten laut und machten riesige Wellen. Isander aber schwamm ganz gemächlich. Sie liebte die Stille unter den Trauerweiden. Plötzlich sah sie etwas Blaues im Sand funkeln. Es war eine wunderschöne Glasmurmel! Isander stieß ein leises Freudenquaken aus und versteckte den Schatz behutsam in ihrem geheimen Nest zwischen den Schilfhalmen.\n\nPlötzlich schoss Turbosahne wie ein kleiner, grüner Blitz an ihr vorbei. Er wirbelte das Wasser auf, bis Isanders Federn wackelten. Turbosahne bremste quietschend ab und sah sie spöttisch an.',
          },
        ],
      },

      // --- seg1: Turbosahne shouts (solo) ---
      {
        stylePrompt:
          'Lies den folgenden Ausruf als Turbosahne, vorlaut, spöttisch und herausfordernd:',
        turns: [
          {
            speaker: 'Turbosahne',
            text: '[shouting] Komm schon, Isander! Beweg dich endlich, du lahme Ente!',
          },
        ],
      },

      // --- seg2: Narrator interstitial (solo) ---
      {
        stylePrompt:
          'Lies die folgende kurze Erzählpassage ruhig und beobachtend:',
        turns: [
          {
            speaker: 'Narrator',
            text: ', rief er und spritzte mit den Flügeln. Isander sah ihn nur ruhig an.',
          },
        ],
      },

      // --- seg3: Isander replies (solo) ---
      {
        stylePrompt:
          'Lies den folgenden Satz als Isander, gelassen und sanft:',
        turns: [
          {
            speaker: 'Isander',
            text: 'Ich habe es nicht eilig',
          },
        ],
      },

      // --- seg4: Narrator interstitial (solo) ---
      {
        stylePrompt:
          'Lies die folgende kurze Erzählpassage ruhig und beobachtend:',
        turns: [
          {
            speaker: 'Narrator',
            text: ', antwortete sie sanft. Turbosahne schüttelte den Kopf.',
          },
        ],
      },

      // --- seg5: Turbosahne challenges (solo) ---
      {
        stylePrompt:
          'Lies den folgenden Ausruf als Turbosahne, energiegeladen und herausfordernd:',
        turns: [
          {
            speaker: 'Turbosahne',
            text: 'Wer langsam ist, verpasst das Leben! Ich fordere dich heraus! Morgen ein Wettrennen rund um den Teich! Wer zuerst am alten Baum ist, gewinnt!',
          },
        ],
      },

      // --- seg6: Narrator closes (solo) ---
      {
        stylePrompt:
          'Lies den folgenden Schlusssatz als ruhiger Erzähler, der Isanders Zufriedenheit und Gelassenheit betont:',
        turns: [
          {
            speaker: 'Narrator',
            text: ' Isander lächelte nur und betrachtete ihre glitzernde Murmel.',
          },
        ],
      },
    ],
    voice: { languageCode: 'de-DE' },
    audio: { format: 'mp3' },
    providerOptions: {
      model: 'gemini-3.1-flash-tts-preview',
      temperature: 1.0,
    },
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
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `scribomate-fixed-prompts-${timestamp}.mp3`);

  const provider = new VertexAITTSProvider();
  const request = buildScribomateRequest();

  console.log('\n=== Scribomate Sanity-Check — Fixed Per-Segment Prompts ===');
  console.log(`Speakers: ${request.speakers.map((s) => `${s.speaker}(${s.voice})`).join(', ')}`);
  console.log(`Segments: ${request.segments.length}`);
  request.segments.forEach((seg, i) => {
    const speakers = Array.from(new Set(seg.turns.map((t) => t.speaker))).join('+');
    const textBytes = Buffer.byteLength(
      seg.turns.map((t) => t.text).join('\n'),
      'utf8',
    );
    const promptBytes = Buffer.byteLength(seg.stylePrompt ?? '', 'utf8');
    console.log(
      `  Seg#${i}: [${speakers}] ${textBytes}B text, ${promptBytes}B prompt`,
    );
    console.log(`    prompt: "${seg.stylePrompt}"`);
  });

  console.log(`\nModel: ${request.providerOptions?.model}`);
  console.log('\n--- Synthesizing... ---');

  const startTime = Date.now();
  try {
    const response = await provider.synthesizeDialog(request);
    const duration = Date.now() - startTime;

    fs.writeFileSync(outputPath, response.audio);

    console.log('\n✅ Success!');
    console.log(`   Output:          ${outputPath}`);
    console.log(`   Audio format:    ${response.metadata.audioFormat}`);
    console.log(`   Audio size:      ${response.audio.length.toLocaleString()} bytes`);
    console.log(
      `   Audio duration:  ${
        response.metadata.audioDuration
          ? `${(response.metadata.audioDuration / 1000).toFixed(2)}s`
          : 'N/A (WAV)'
      }`,
    );
    console.log(`   Total latency:   ${duration}ms`);
    console.log(`   Billed chars:    ${response.billing.characters}`);
    console.log('\n=== Listen to the output — does it sound clean? ===');
    console.log('If YES: API + middleware are fine. Parser prompt needs to be stricter.');
    console.log('If NO:  There is another factor we have not identified yet.');
  } catch (error) {
    console.error('\n❌ Dialog synthesis failed:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if ('segmentIndex' in error && error.segmentIndex !== undefined) {
        console.error(`   Failed at segment: #${(error as { segmentIndex: number }).segmentIndex}`);
      }
    }
    process.exit(1);
  }
}

main();

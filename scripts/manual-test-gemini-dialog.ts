import * as fs from 'fs';
import * as path from 'path';
import { VertexAITTSProvider } from '../src/middleware/services/tts/providers/vertex-ai-tts-provider';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

/**
 * Manual test script for Gemini 3.1 Flash TTS dialog mode
 *
 * Demonstrates synthesizeDialog() with:
 *   - 3 speakers (2 dialog + 1 narrator/commentator) with distinct voices
 *   - Inline audio tags ([laughing], [whispering], [sigh], [short pause], ...)
 *   - 2 segments with different stylePrompts (mood shift mid-dialog)
 *   - Single request → single concatenated MP3 → aggregated billing
 *
 * Usage:
 *   npx ts-node scripts/manual-test-gemini-dialog.ts
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS (Service Account JSON)
 *   - GOOGLE_CLOUD_PROJECT (Project ID)
 *   - ffmpeg available (else WAV fallback)
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
 * Build the demo dialog.
 *
 * Constraint: Vertex AI multi-speaker TTS supports at most 2 distinct speakers
 * per segment. 3-speaker scenes (Dialog 1 + Narrator + Dialog 2) must therefore
 * be split into alternating segments:
 *   - Narrator-only segment (single-voice)
 *   - Dialog segment with exactly 2 speakers (multi-voice)
 *   - Narrator-only segment (single-voice)
 *   - Dialog segment with exactly 2 speakers (multi-voice)
 *   - Narrator-only segment (single-voice)
 *
 * This also gives each narrator intro/outro its own stylePrompt, which matches
 * what the user typically wants when the mood shifts mid-scene.
 */
function buildDialogRequest(): SynthesizeDialogRequest {
  return {
    speakers: [
      { speaker: 'Sarah', voice: 'Aoede' },       // Dialogsprecherin 1 (warm, weiblich)
      { speaker: 'Kommentator', voice: 'Charon' }, // Narrativer Kommentator (tief, männlich)
      { speaker: 'Marcus', voice: 'Puck' },       // Dialogsprecher 2 (lebhaft, männlich)
    ],
    segments: [
      // --- Kommentator-Intro (solo) ---
      {
        stylePrompt:
          'Ruhiger, warmer Erzähler. Eröffnet eine Szene mit leichter Spannung, aber freundlich.',
        turns: [
          {
            speaker: 'Kommentator',
            text:
              'Es war ein sonniger Nachmittag in Berlin. [short pause] Sarah und Marcus ' +
              'hatten sich seit Monaten nicht mehr gesehen, und keiner der beiden ahnte, ' +
              'wie dieser Tag enden würde.',
          },
        ],
      },
      // --- Dialog 1: Wiedersehen (Sarah + Marcus) ---
      {
        stylePrompt:
          'Lockeres, herzliches Wiedersehen zwischen zwei alten Freunden. Unbeschwert und fröhlich.',
        turns: [
          {
            speaker: 'Sarah',
            text: '[laughing] Marcus! Du hast dich ja überhaupt nicht verändert!',
          },
          {
            speaker: 'Marcus',
            text:
              'Sarah! [short pause] Ich kann es kaum glauben, dich wiederzusehen. ' +
              'Wie lange ist das jetzt her?',
          },
          {
            speaker: 'Sarah',
            text: 'Mindestens zwei Jahre. [sigh] Viel zu lange, wenn du mich fragst.',
          },
          {
            speaker: 'Marcus',
            text: 'Auf jeden Fall! Komm, lass uns einen Kaffee trinken. Du musst mir alles erzählen.',
          },
        ],
      },
      // --- Kommentator-Überleitung (solo) ---
      {
        stylePrompt:
          'Ernster, nachdenklicher Erzähler. Die Stimmung wird ruhiger, leicht melancholisch.',
        turns: [
          {
            speaker: 'Kommentator',
            text:
              'Doch hinter Sarahs Lächeln verbarg sich eine Nachricht, die sie noch nicht ' +
              'ausgesprochen hatte. [short pause] Sie wartete auf den richtigen Moment.',
          },
        ],
      },
      // --- Dialog 2: Das Geständnis (Sarah + Marcus) ---
      {
        stylePrompt:
          'Emotionaler, leiser Moment. Sarah ist zögerlich und traurig, Marcus überrascht und betroffen.',
        turns: [
          {
            speaker: 'Sarah',
            text:
              '[medium pause] Marcus, ich muss dir etwas sagen. ' +
              '[whispering] Ich ziehe nach Tokyo.',
          },
          {
            speaker: 'Marcus',
            text: 'Tokyo? [short pause] Du meinst... für immer?',
          },
          {
            speaker: 'Sarah',
            text: 'Für mindestens fünf Jahre. [sigh] Ich wollte es dir persönlich sagen.',
          },
        ],
      },
      // --- Kommentator-Outro (solo) ---
      {
        stylePrompt: 'Stiller, leiser Schluss. Nachdenklich, fast flüsternd.',
        turns: [
          {
            speaker: 'Kommentator',
            text: 'Die Worte hingen schwer in der Luft zwischen ihnen.',
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
  const outputPath = path.join(outputDir, 'gemini-dialog-demo.mp3');

  if (fs.existsSync(outputPath)) {
    console.log(`\nℹ️  Output already exists: ${outputPath}`);
    console.log(`   Delete it to re-synthesize.`);
    return;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const provider = new VertexAITTSProvider();
  const request = buildDialogRequest();

  // Diagnostic: print segment sizes
  console.log('\n=== Dialog Request ===');
  console.log(`Speakers: ${request.speakers.map((s) => `${s.speaker}(${s.voice})`).join(', ')}`);
  console.log(`Segments: ${request.segments.length}`);
  request.segments.forEach((seg, i) => {
    const text = seg.turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
    const promptBytes = Buffer.byteLength(seg.stylePrompt ?? '', 'utf8');
    const textBytes = Buffer.byteLength(text, 'utf8');
    console.log(
      `  Segment #${i}: ${seg.turns.length} turns, ${textBytes} text bytes, ${promptBytes} prompt bytes`,
    );
  });

  console.log(`\nModel: ${request.providerOptions?.model}`);
  console.log(`Language: ${request.voice?.languageCode}`);
  console.log(`Region: ${process.env.VERTEX_AI_TTS_REGION || 'us-central1'}`);
  console.log('\n--- Synthesizing dialog... ---');

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
    console.log(`   Sample rate:     ${response.metadata.sampleRate}Hz`);
    console.log(`   Voices:          ${response.metadata.voice}`);
    console.log(`   Total latency:   ${duration}ms (${request.segments.length} segments, sequential)`);
    console.log(`   Billed chars:    ${response.billing.characters}`);
    console.log(
      `     → Consumer app should bill their customer for exactly this many characters.`,
    );
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

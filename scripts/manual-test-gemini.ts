import * as fs from 'fs';
import * as path from 'path';
import { TTSProvider, TTSSynthesizeRequest } from '../src/middleware/services/tts/types';

/**
 * Manual test script for Gemini TTS provider (via Vertex AI)
 *
 * Usage:
 *   npx ts-node scripts/manual-test-gemini.ts           - Run all tests
 *   npx ts-node scripts/manual-test-gemini.ts en        - Run only English
 *   npx ts-node scripts/manual-test-gemini.ts de        - Run only German
 *   npx ts-node scripts/manual-test-gemini.ts pro       - Run only Pro model tests
 *   npx ts-node scripts/manual-test-gemini.ts style     - Run only style prompt tests
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS (Service Account JSON)
 *   - GOOGLE_CLOUD_PROJECT (Project ID)
 *   - ffmpeg installed (for MP3 output, falls back to WAV otherwise)
 */

// Simple .env parser since dotenv might not be installed
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

async function runSynthesisTest(
  testName: string,
  params: TTSSynthesizeRequest,
  filename: string
) {
  const outputDir = path.join(__dirname, '../output');
  const outputPath = path.join(outputDir, filename);

  // Skip if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`\n--- Skipping: ${testName} (file exists: ${filename}) ---`);
    return;
  }

  // Dynamically import ttsService to ensure env vars are loaded first
  const { ttsService } = await import('../src/middleware/services/tts/tts.service');

  console.log(`\n--- Running Test: ${testName} ---`);
  console.log(`Text length: ${params.text.length} chars`);
  console.log(`Voice: ${params.voice.id}`);
  console.log(`Model: ${(params.providerOptions as Record<string, unknown>)?.model || 'gemini-2.5-flash-preview-tts'}`);

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const startTime = Date.now();
    const response = await ttsService.synthesize(params);
    const duration = Date.now() - startTime;

    fs.writeFileSync(outputPath, response.audio);

    console.log(`✅ Success!`);
    console.log(`   - Output: ${outputPath}`);
    console.log(`   - Billed chars: ${response.billing.characters}`);
    console.log(`   - Latency: ${duration}ms`);
    console.log(`   - Audio size: ${response.audio.length} bytes`);
    console.log(`   - Audio format: ${response.metadata.audioFormat}`);
    console.log(`   - Audio duration: ${response.metadata.audioDuration ?? 'N/A'}ms`);
    console.log(`   - Sample rate: ${response.metadata.sampleRate}Hz`);

  } catch (error) {
    console.error(`❌ Test '${testName}' Failed:`, error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
}

async function main() {
  loadEnv();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.error('   Set it in .env or as environment variable.');
    process.exit(1);
  }

  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    console.error('❌ Error: GOOGLE_CLOUD_PROJECT is not set.');
    console.error('   Set it in .env or as environment variable.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const runEn = args.length === 0 || args.includes('en');
  const runDe = args.length === 0 || args.includes('de');
  const runPro = args.length === 0 || args.includes('pro');
  const runStyle = args.length === 0 || args.includes('style');

  console.log('Usage: npx ts-node scripts/manual-test-gemini.ts [en] [de] [pro] [style]');
  console.log('Running tests:', [runEn ? 'English' : '', runDe ? 'German' : '', runPro ? 'Pro' : '', runStyle ? 'Style' : ''].filter(Boolean).join(', '));
  console.log(`Region: ${process.env.GEMINI_REGION || 'us-central1'}`);

  // English tests with Flash model
  if (runEn) {
    await runSynthesisTest(
      'English (Kore, Flash)',
      {
        text: 'Hello! This is a test of the LoonyLabs TTS middleware using Google Gemini.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
      },
      'gemini-en-kore-flash.mp3'
    );

    await runSynthesisTest(
      'English (Puck, Flash)',
      {
        text: 'Hey there! Testing the Puck voice with Gemini TTS. Pretty exciting, right?',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Puck' },
        audio: { format: 'mp3' },
      },
      'gemini-en-puck-flash.mp3'
    );

    await runSynthesisTest(
      'English (Charon, Flash)',
      {
        text: 'Good evening. This is the Charon voice providing informative narration.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Charon' },
        audio: { format: 'mp3' },
      },
      'gemini-en-charon-flash.mp3'
    );

    // WAV format test (no ffmpeg needed)
    await runSynthesisTest(
      'English (Kore, Flash, WAV)',
      {
        text: 'Testing WAV output format without ffmpeg dependency.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Kore' },
        audio: { format: 'wav' },
      },
      'gemini-en-kore-flash.wav'
    );
  }

  // German tests
  if (runDe) {
    await runSynthesisTest(
      'German (Kore, Flash)',
      {
        text: 'Die warme Herbstsonne tauchte den Goldähren-Hof in ein flüssiges Gold, das fast so hell strahlte wie Tims Vorfreude.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
      },
      'gemini-de-kore-flash.mp3'
    );

    await runSynthesisTest(
      'German (Sulafat, Flash)',
      {
        text: 'Guten Tag! Dies ist ein Test der Gemini Sprachsynthese mit der warmen Sulafat-Stimme.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Sulafat' },
        audio: { format: 'mp3' },
      },
      'gemini-de-sulafat-flash.mp3'
    );
  }

  // Pro model tests
  if (runPro) {
    await runSynthesisTest(
      'English (Kore, Pro)',
      {
        text: 'This is the premium Pro model. It should sound more natural and expressive.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
        providerOptions: { model: 'gemini-2.5-pro-preview-tts' },
      },
      'gemini-en-kore-pro.mp3'
    );

    await runSynthesisTest(
      'German (Kore, Pro)',
      {
        text: 'Dies ist das Premium Pro-Modell. Es sollte natürlicher und ausdrucksvoller klingen.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
        providerOptions: { model: 'gemini-2.5-pro-preview-tts' },
      },
      'gemini-de-kore-pro.mp3'
    );
  }

  // Style prompt tests
  if (runStyle) {
    await runSynthesisTest(
      'Style: Cheerful (Kore)',
      {
        text: 'Have a wonderful day! Everything is going to be amazing!',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Kore' },
        audio: { format: 'mp3' },
        providerOptions: { stylePrompt: 'Say cheerfully:' },
      },
      'gemini-style-cheerful.mp3'
    );

    await runSynthesisTest(
      'Style: Spooky Whisper (Charon)',
      {
        text: 'The old house creaked in the wind. Something was watching from the shadows.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Charon' },
        audio: { format: 'mp3' },
        providerOptions: { stylePrompt: 'Say in a spooky whisper:' },
      },
      'gemini-style-spooky.mp3'
    );

    await runSynthesisTest(
      'Style: Professional Narrator (Orus)',
      {
        text: 'Chapter one. In the beginning, there was nothing but an empty field and a dream.',
        provider: TTSProvider.GEMINI,
        voice: { id: 'Orus' },
        audio: { format: 'mp3' },
        providerOptions: { stylePrompt: 'Read in a calm, professional narration style:' },
      },
      'gemini-style-narrator.mp3'
    );
  }
}

main();

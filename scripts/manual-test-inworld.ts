import * as fs from 'fs';
import * as path from 'path';
import { TTSProvider, TTSSynthesizeRequest } from '../src/middleware/services/tts/types';

/**
 * Manual test script for Inworld AI provider
 *
 * Usage:
 *   npx ts-node scripts/manual-test-inworld.ts           - Run all tests
 *   npx ts-node scripts/manual-test-inworld.ts en        - Run only English
 *   npx ts-node scripts/manual-test-inworld.ts de        - Run only German
 *   npx ts-node scripts/manual-test-inworld.ts mini      - Run only Mini model tests
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
  console.log(`Model: ${(params.providerOptions as Record<string, unknown>)?.modelId || 'inworld-tts-1.5-max'}`);

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

  if (!process.env.INWORLD_API_KEY) {
    console.error('❌ Error: INWORLD_API_KEY is not set.');
    console.error('   Set it in .env or as environment variable.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const runEn = args.length === 0 || args.includes('en');
  const runDe = args.length === 0 || args.includes('de');
  const runMini = args.length === 0 || args.includes('mini');

  console.log('Usage: npx ts-node scripts/manual-test-inworld.ts [en] [de] [mini]');
  console.log('Running tests:', [runEn ? 'English' : '', runDe ? 'German' : '', runMini ? 'Mini' : ''].filter(Boolean).join(', '));

  // English tests with Max model
  if (runEn) {
    await runSynthesisTest(
      'English (Ashley, Max)',
      {
        text: 'Hello! This is a test of the LoonyLabs TTS middleware using Inworld AI.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Ashley' },
        audio: { format: 'mp3' },
        providerOptions: { modelId: 'inworld-tts-1.5-max' },
      },
      'inworld-en-ashley-max.mp3'
    );

    // Temperature test
    await runSynthesisTest(
      'English (Ashley, Max, low temperature)',
      {
        text: 'Hello! This is a test with low temperature for more consistent output.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Ashley' },
        audio: { format: 'mp3' },
        providerOptions: { modelId: 'inworld-tts-1.5-max', temperature: 0.5 },
      },
      'inworld-en-ashley-max-low-temp.mp3'
    );

    // Speaking rate test
    await runSynthesisTest(
      'English (Ashley, Max, fast speaking rate)',
      {
        text: 'This is a test with increased speaking rate to check speed control.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Ashley' },
        audio: { format: 'mp3' },
        providerOptions: { modelId: 'inworld-tts-1.5-max', speakingRate: 1.3 },
      },
      'inworld-en-ashley-max-fast.mp3'
    );

    // Opus format test (via audio.format)
    await runSynthesisTest(
      'English (Ashley, Max, Opus)',
      {
        text: 'Testing Opus audio format output.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Ashley' },
        audio: { format: 'opus' },
        providerOptions: { modelId: 'inworld-tts-1.5-max' },
      },
      'inworld-en-ashley-max-opus.ogg'
    );
  }

  // German tests – native German voices: Johanna (female), Josef (male)
  if (runDe) {
    await runSynthesisTest(
      'German (Johanna – female, Max)',
      {
        text: 'Die warme Herbstsonne tauchte den Goldähren-Hof in ein flüssiges Gold, das fast so hell strahlte wie Tims Vorfreude.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Johanna' },
        audio: { format: 'mp3' },
        providerOptions: { modelId: 'inworld-tts-1.5-max' },
      },
      'inworld-de-johanna-max.mp3'
    );

    await runSynthesisTest(
      'German (Josef – male, Max)',
      {
        text: 'Die warme Herbstsonne tauchte den Goldähren-Hof in ein flüssiges Gold, das fast so hell strahlte wie Tims Vorfreude.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Josef' },
        audio: { format: 'mp3' },
        providerOptions: { modelId: 'inworld-tts-1.5-max' },
      },
      'inworld-de-josef-max.mp3'
    );

    await runSynthesisTest(
      'German (Johanna, Max, slow)',
      {
        text: 'Guten Tag! Dies ist ein Test der Sprachsynthese mit langsamer Geschwindigkeit.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Johanna' },
        audio: { format: 'mp3' },
        providerOptions: { modelId: 'inworld-tts-1.5-max', speakingRate: 0.7 },
      },
      'inworld-de-johanna-max-slow.mp3'
    );
  }

  // Mini model tests (ultra-low latency)
  if (runMini) {
    await runSynthesisTest(
      'English (Ashley, Mini – low latency)',
      {
        text: 'This is a test of the Mini model with ultra-low latency.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Ashley' },
        audio: { format: 'mp3' },
        providerOptions: { modelId: 'inworld-tts-1.5-mini' },
      },
      'inworld-en-ashley-mini.mp3'
    );

    await runSynthesisTest(
      'German (Johanna, Mini – low latency)',
      {
        text: 'Ein kurzer Test des Mini-Modells für niedrige Latenz.',
        provider: TTSProvider.INWORLD,
        voice: { id: 'Johanna' },
        audio: { format: 'mp3' },
        providerOptions: { modelId: 'inworld-tts-1.5-mini' },
      },
      'inworld-de-johanna-mini.mp3'
    );
  }
}

main();

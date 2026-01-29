import * as fs from 'fs';
import * as path from 'path';
import { TTSProvider, TTSSynthesizeRequest } from '../src/middleware/services/tts/types';

/**
 * Manual test script for Fish Audio provider
 *
 * Usage:
 *   npx ts-node scripts/manual-test-fish-audio.ts       - Run all tests
 *   npx ts-node scripts/manual-test-fish-audio.ts en    - Run only English
 *   npx ts-node scripts/manual-test-fish-audio.ts de    - Run only German
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
  console.log(`Model: ${(params.providerOptions as Record<string, unknown>)?.model || 's1'}`);

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

  } catch (error) {
    console.error(`❌ Test '${testName}' Failed:`, error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
}

async function main() {
  loadEnv();

  if (!process.env.FISH_AUDIO_API_KEY) {
    console.error('❌ Error: FISH_AUDIO_API_KEY is not set.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const runEn = args.length === 0 || args.includes('en');
  const runDe = args.length === 0 || args.includes('de');

  console.log('Usage: npx ts-node scripts/manual-test-fish-audio.ts [en] [de]');
  console.log('Running tests:', [runEn ? 'English' : '', runDe ? 'German' : ''].filter(Boolean).join(', '));

  // English demo voices (native English speakers)
  const enVoices = [
    { id: '8ef4a238714b45718ce04243307c57a7', name: 'e-girl' },
    { id: '802e3bc2b27e49c2995d23ef70e6ac89', name: 'energetic-male' },
    { id: '933563129e564b19a115bedd57b7406a', name: 'sarah' },
    { id: 'bf322df2096a46f18c579d0baa36f41d', name: 'adrian' },
    { id: 'b347db033a6549378b48d00acb0d06cd', name: 'selene' },
    { id: '536d3a5e000945adb7038665781a4aca', name: 'ethan' },
  ];

  // German voices (native German speakers from Fish Audio library, sorted by popularity)
  const deVoices = [
    { id: '90042f762dbf49baa2e7776d011eee6b', name: 'vorlesen-stimlagen', desc: 'male, narrator' },
    { id: '88b18e0d81474a0ca08e2ea6f9df5ff4', name: 'christa-deutsch', desc: 'female' },
    { id: '76fe193e97674d1ebd33541f23ab1622', name: 'sabine-loft', desc: 'female, business' },
    { id: '40f470ff12064bf1897215b41819147c', name: 'stoische-gewohnheiten', desc: 'male, storyteller' },
    { id: 'e891954162584409bce5cf43aebd1726', name: 'bao-de2-chau', desc: 'female, news' },
  ];

  // English tests
  if (runEn) {
    await runSynthesisTest(
      'English (default voice, S1)',
      {
        text: 'Hello! This is a test of the LoonyLabs TTS middleware using Fish Audio.',
        provider: TTSProvider.FISH_AUDIO,
        voice: { id: 'default' },
        audio: { format: 'mp3' },
        providerOptions: { model: 's1' },
      },
      'fish-audio-en-default.mp3'
    );

    for (const voice of enVoices) {
      await runSynthesisTest(
        `English (${voice.name}, S1)`,
        {
          text: 'Hello! This is a test of the LoonyLabs TTS middleware using Fish Audio.',
          provider: TTSProvider.FISH_AUDIO,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: { model: 's1' },
        },
        `fish-audio-en-${voice.name}.mp3`
      );
    }
  }

  // German tests – native German voices
  if (runDe) {
    // Default voice (auto language detection)
    await runSynthesisTest(
      'German (default voice, S1)',
      {
        text: 'Die warme Herbstsonne tauchte den Goldähren-Hof in ein flüssiges Gold, das fast so hell strahlte wie Tims Vorfreude.',
        provider: TTSProvider.FISH_AUDIO,
        voice: { id: 'default' },
        audio: { format: 'mp3' },
        providerOptions: { model: 's1' },
      },
      'fish-audio-de-default.mp3'
    );

    // Native German voices
    for (const voice of deVoices) {
      await runSynthesisTest(
        `German (${voice.name} – ${voice.desc}, S1)`,
        {
          text: 'Die warme Herbstsonne tauchte den Goldähren-Hof in ein flüssiges Gold, das fast so hell strahlte wie Tims Vorfreude.',
          provider: TTSProvider.FISH_AUDIO,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: { model: 's1' },
        },
        `fish-audio-de-${voice.name}.mp3`
      );
    }

    // Emotion test
    await runSynthesisTest(
      'German (emotion test – excited, S1)',
      {
        text: '(excited) Das ist fantastisch! Ich kann es kaum erwarten, das auszuprobieren!',
        provider: TTSProvider.FISH_AUDIO,
        voice: { id: 'default' },
        audio: { format: 'mp3' },
        providerOptions: { model: 's1' },
      },
      'fish-audio-de-emotion-excited.mp3'
    );
  }
}

main();

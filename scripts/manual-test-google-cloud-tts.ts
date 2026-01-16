import * as fs from 'fs';
import * as path from 'path';
import { TTSProvider, TTSSynthesizeRequest } from '../src/middleware/services/tts/types';

/**
 * Manual test script for Google Cloud TTS provider
 *
 * Prerequisites:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
 *   2. Optionally set GOOGLE_CLOUD_PROJECT and GOOGLE_TTS_REGION
 *
 * Usage:
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts         - Run default tests (Neural2 + WaveNet)
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts en      - Run only English voices
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts de      - Run only German voices
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts neural2 - Run only Neural2 voices
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts wavenet - Run only WaveNet voices
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts chirp   - Run Chirp3-HD voices (newest, best quality)
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts studio  - Run Studio voices (premium)
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts config  - Run audio config tests
 *   npx ts-node scripts/manual-test-google-cloud-tts.ts region  - Run region test (Frankfurt)
 *
 * Combine flags: npx ts-node scripts/manual-test-google-cloud-tts.ts de chirp
 *
 * Voice Types (from best to budget):
 *   - Chirp3-HD: Newest premium voices with natural intonation
 *   - Studio: High-quality studio-recorded voices
 *   - Neural2: Deep learning based, very natural
 *   - WaveNet: Good quality, cost-effective
 *   - Standard: Basic, most affordable
 *
 * @see https://docs.cloud.google.com/text-to-speech/docs/voices
 */

// Simple .env parser since dotenv might not be installed
function loadEnv() {
  try {
    // Look for .env in project root
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
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
  console.log(`Region: ${(params.providerOptions as Record<string, unknown>)?.region || process.env.GOOGLE_TTS_REGION || 'eu (default)'}`);

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
  // 1. Load environment variables
  loadEnv();

  // Check for credentials
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.error('   Please set it to the path of your service account JSON file.');
    console.error('   Example: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json');
    process.exit(1);
  }

  // Verify credentials file exists
  if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    console.error(`❌ Error: Service account file not found: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Google Cloud TTS Manual Test');
  console.log('='.repeat(60));
  console.log(`Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  console.log(`Project: ${process.env.GOOGLE_CLOUD_PROJECT || '(from credentials)'}`);
  console.log(`Region: ${process.env.GOOGLE_TTS_REGION || 'eu (default)'}`);
  console.log('='.repeat(60));

  // Parse arguments
  const args = process.argv.slice(2);
  const runEn = args.length === 0 || args.includes('en');
  const runDe = args.length === 0 || args.includes('de');
  const runNeural2 = args.length === 0 || args.includes('neural2');
  const runWavenet = args.length === 0 || args.includes('wavenet');
  const runStudio = args.includes('studio'); // Studio voices are premium, opt-in

  console.log('\nUsage: npx ts-node scripts/manual-test-google-cloud-tts.ts [en] [de] [neural2] [wavenet] [studio]');
  console.log('Running tests:', [
    runEn ? 'English' : '',
    runDe ? 'German' : '',
    runNeural2 ? 'Neural2' : '',
    runWavenet ? 'WaveNet' : '',
    runStudio ? 'Studio' : '',
  ].filter(Boolean).join(', ') || 'all');

  // German test text
  const germanText = 'Die warme Herbstsonne tauchte den Goldähren-Hof in ein flüssiges Gold, das fast so hell strahlte wie Tims Vorfreude.';

  // English test text
  const englishText = 'Hello! This is a test of the LoonyLabs TTS middleware using Google Cloud Text-to-Speech with EU regional endpoints for GDPR compliance.';

  // ==========================================
  // German Neural2 Voices (Best quality)
  // Source: https://docs.cloud.google.com/text-to-speech/docs/voices
  // Note: German only has G and H variants (no A-F)!
  // ==========================================
  if (runDe && runNeural2) {
    const germanNeural2Voices = [
      { id: 'de-DE-Neural2-G', desc: 'Female' },
      { id: 'de-DE-Neural2-H', desc: 'Male' },
    ];

    for (const voice of germanNeural2Voices) {
      await runSynthesisTest(
        `German Neural2 - ${voice.id} (${voice.desc})`,
        {
          text: germanText,
          provider: TTSProvider.GOOGLE,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: { region: 'eu' },
        },
        `google-${voice.id.toLowerCase()}.mp3`
      );
    }
  }

  // ==========================================
  // German WaveNet Voices
  // Source: https://docs.cloud.google.com/text-to-speech/docs/voices
  // Note: German only has G and H variants (no A-F)!
  // ==========================================
  if (runDe && runWavenet) {
    const germanWavenetVoices = [
      { id: 'de-DE-Wavenet-G', desc: 'Female' },
      { id: 'de-DE-Wavenet-H', desc: 'Male' },
    ];

    for (const voice of germanWavenetVoices) {
      await runSynthesisTest(
        `German WaveNet - ${voice.id} (${voice.desc})`,
        {
          text: germanText,
          provider: TTSProvider.GOOGLE,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: { region: 'eu' },
        },
        `google-${voice.id.toLowerCase()}.mp3`
      );
    }
  }

  // ==========================================
  // English Neural2 Voices
  // ==========================================
  if (runEn && runNeural2) {
    const englishNeural2Voices = [
      { id: 'en-US-Neural2-A', desc: 'Male' },
      { id: 'en-US-Neural2-C', desc: 'Female' },
      { id: 'en-US-Neural2-D', desc: 'Male' },
      { id: 'en-US-Neural2-E', desc: 'Female' },
      { id: 'en-US-Neural2-F', desc: 'Female' },
      { id: 'en-US-Neural2-G', desc: 'Female' },
      { id: 'en-US-Neural2-H', desc: 'Female' },
      { id: 'en-US-Neural2-I', desc: 'Male' },
      { id: 'en-US-Neural2-J', desc: 'Male' },
    ];

    for (const voice of englishNeural2Voices) {
      await runSynthesisTest(
        `English Neural2 - ${voice.id} (${voice.desc})`,
        {
          text: englishText,
          provider: TTSProvider.GOOGLE,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: { region: 'eu' },
        },
        `google-${voice.id.toLowerCase()}.mp3`
      );
    }
  }

  // ==========================================
  // English WaveNet Voices
  // ==========================================
  if (runEn && runWavenet) {
    const englishWavenetVoices = [
      { id: 'en-US-Wavenet-A', desc: 'Male' },
      { id: 'en-US-Wavenet-B', desc: 'Male' },
      { id: 'en-US-Wavenet-C', desc: 'Female' },
      { id: 'en-US-Wavenet-D', desc: 'Male' },
      { id: 'en-US-Wavenet-E', desc: 'Female' },
      { id: 'en-US-Wavenet-F', desc: 'Female' },
    ];

    for (const voice of englishWavenetVoices) {
      await runSynthesisTest(
        `English WaveNet - ${voice.id} (${voice.desc})`,
        {
          text: englishText,
          provider: TTSProvider.GOOGLE,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: { region: 'eu' },
        },
        `google-${voice.id.toLowerCase()}.mp3`
      );
    }
  }

  // ==========================================
  // Chirp3-HD Voices (Newest Premium voices)
  // Source: https://docs.cloud.google.com/text-to-speech/docs/voices
  // ==========================================
  if (args.includes('chirp') || args.includes('chirp3')) {
    const chirp3Voices = [
      // German female voices
      { id: 'de-DE-Chirp3-HD-Aoede', desc: 'Female' },
      { id: 'de-DE-Chirp3-HD-Kore', desc: 'Female' },
      { id: 'de-DE-Chirp3-HD-Leda', desc: 'Female' },
      { id: 'de-DE-Chirp3-HD-Zephyr', desc: 'Female' },
      // German male voices
      { id: 'de-DE-Chirp3-HD-Achird', desc: 'Male' },
      { id: 'de-DE-Chirp3-HD-Fenrir', desc: 'Male' },
      { id: 'de-DE-Chirp3-HD-Orus', desc: 'Male' },
      { id: 'de-DE-Chirp3-HD-Puck', desc: 'Male' },
    ];

    for (const voice of chirp3Voices) {
      await runSynthesisTest(
        `German Chirp3-HD - ${voice.id} (${voice.desc})`,
        {
          text: germanText,
          provider: TTSProvider.GOOGLE,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: { region: 'eu' },
        },
        `google-${voice.id.toLowerCase()}.mp3`
      );
    }
  }

  // ==========================================
  // Studio Voices (Premium, opt-in)
  // Note: en-US has O (Female) and Q (Male)
  //       de-DE has B (Male) and C (Female)
  // ==========================================
  if (runStudio) {
    const studioVoices = [
      { id: 'en-US-Studio-O', desc: 'Female Studio' },
      { id: 'en-US-Studio-Q', desc: 'Male Studio' },
      { id: 'de-DE-Studio-B', desc: 'Male Studio German' },
      { id: 'de-DE-Studio-C', desc: 'Female Studio German' },
    ];

    for (const voice of studioVoices) {
      const text = voice.id.startsWith('de') ? germanText : englishText;
      await runSynthesisTest(
        `Studio - ${voice.id} (${voice.desc})`,
        {
          text,
          provider: TTSProvider.GOOGLE,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: { region: 'eu' },
        },
        `google-${voice.id.toLowerCase()}.mp3`
      );
    }
  }

  // ==========================================
  // Audio Configuration Tests
  // ==========================================
  if (args.includes('config') || args.length === 0) {
    // Test with different audio formats
    await runSynthesisTest(
      'German Neural2 - WAV format',
      {
        text: 'Test der WAV-Ausgabe mit Linear16 Encoding.',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
        audio: { format: 'wav', sampleRate: 24000 },
        providerOptions: { region: 'eu' },
      },
      'google-de-neural2-a-wav.wav'
    );

    // Test with speed adjustment
    await runSynthesisTest(
      'German Neural2 - Slow speech (0.8x)',
      {
        text: germanText,
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
        audio: { format: 'mp3', speed: 0.8 },
        providerOptions: { region: 'eu' },
      },
      'google-de-neural2-a-slow.mp3'
    );

    // Test with fast speed
    await runSynthesisTest(
      'German Neural2 - Fast speech (1.25x)',
      {
        text: germanText,
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
        audio: { format: 'mp3', speed: 1.25 },
        providerOptions: { region: 'eu' },
      },
      'google-de-neural2-a-fast.mp3'
    );

    // Test with pitch adjustment
    await runSynthesisTest(
      'German Neural2 - High pitch (+4 semitones)',
      {
        text: germanText,
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
        audio: { format: 'mp3', pitch: 4.0 },
        providerOptions: { region: 'eu' },
      },
      'google-de-neural2-a-highpitch.mp3'
    );

    // Test with effects profile
    await runSynthesisTest(
      'German Neural2 - Headphone optimized',
      {
        text: germanText,
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
        audio: { format: 'mp3' },
        providerOptions: {
          region: 'eu',
          effectsProfileId: ['headphone-class-device'],
        },
      },
      'google-de-neural2-a-headphone.mp3'
    );
  }

  // ==========================================
  // Region Test (Frankfurt specifically)
  // ==========================================
  if (args.includes('region') || args.length === 0) {
    await runSynthesisTest(
      'German Neural2 - Frankfurt Region (europe-west3)',
      {
        text: 'Dieser Test verwendet explizit den Frankfurt-Endpunkt für maximale DSGVO-Konformität.',
        provider: TTSProvider.GOOGLE,
        voice: { id: 'de-DE-Neural2-G' },
        audio: { format: 'mp3' },
        providerOptions: { region: 'europe-west3' },
      },
      'google-de-neural2-a-frankfurt.mp3'
    );
  }

  console.log('\n' + '='.repeat(60));
  console.log('Tests completed. Check the output/ directory for audio files.');
  console.log('='.repeat(60));
}

main();

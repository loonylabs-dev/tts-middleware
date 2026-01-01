import * as fs from 'fs';
import * as path from 'path';
import { TTSProvider, TTSSynthesizeRequest } from '../src/middleware/services/tts/types';

/**
 * Manual test script for EdenAI provider
 * 
 * Usage:
 *   npx ts-node scripts/manual-test-edenai.ts       - Run all tests
 *   npx ts-node scripts/manual-test-edenai.ts en    - Run only English (Google)
 *   npx ts-node scripts/manual-test-edenai.ts de    - Run only German (OpenAI)
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
  // Dynamically import ttsService to ensure env vars are loaded first
  const { ttsService } = await import('../src/middleware/services/tts/tts.service');

  console.log(`\n--- Running Test: ${testName} ---`);
  console.log(`Text length: ${params.text.length} chars`);
  console.log(`Target Voice: ${params.voice.id}`);
  console.log(`Provider: ${params.providerOptions?.provider || 'auto'}`);

  try {
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const startTime = Date.now();
    const response = await ttsService.synthesize(params);
    const duration = Date.now() - startTime;

    const outputPath = path.join(outputDir, filename);
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

  if (!process.env.EDENAI_API_KEY) {
    console.error('❌ Error: EDENAI_API_KEY is not set.');
    process.exit(1);
  }

  // Parse arguments: npx ts-node scripts/manual-test-edenai.ts [en|de]
  const args = process.argv.slice(2);
  const runEn = args.length === 0 || args.includes('en');
  const runDe = args.length === 0 || args.includes('de');

  console.log('Usage: npx ts-node scripts/manual-test-edenai.ts [en] [de]');
  console.log('Running tests:', [runEn ? 'English' : '', runDe ? 'German' : ''].filter(Boolean).join(', '));

  // 2. Run English Test (Google)
  if (runEn) {
    await runSynthesisTest(
    'English (Google)',
    {
      text: 'Hello! This is a test of the LoonyLabs TTS middleware using Eden AI with Google.',
      provider: TTSProvider.EDENAI,
        voice: { id: 'en-US' }, 
        audio: { speed: 1.0, format: 'mp3' },
        providerOptions: { provider: 'google' }
      },
      'edenai-en-google.mp3'
    );
  }

  // 3. Run German Test (OpenAI)
  // Using 'de' as OpenAI often prefers generic codes via EdenAI
  if (runDe) {
    await runSynthesisTest(
      'German (OpenAI)',
      {
        text: 'Die warme Herbstsonne tauchte den Goldähren-Hof in ein flüssiges Gold, das fast so hell strahlte wie Tims Vorfreude. Er schnupperte tief und sog den süßen Duft von frisch gebackenem Apfelkuchen und den staubigen Geruch von trockenem Heu ein. „Heute klappt alles, ganz sicher“, murmelte Tim und strich sich über den samtenen Stoff seines blauen Zauberermantels. Er rückte den spitzen Hut zurecht, der ihm immer ein wenig zu tief in die Stirn rutschte. In seiner Tasche begann sein Zauberstab ungeduldig zu kribbeln und zu vibrieren, als könnte er die Elektrizität in der Luft spüren. „Ganz ruhig, Kleiner“, flüsterte er und klopfte sanft auf das glatte Holz, „dein großer Auftritt kommt noch.“',
        provider: TTSProvider.EDENAI,
        voice: { id: 'de' }, 
        audio: { speed: 1.0, format: 'mp3' },
        providerOptions: { provider: 'openai' }
      },
      'edenai-de-openai.mp3'
    );
  }
}

main();
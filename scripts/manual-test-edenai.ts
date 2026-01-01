import * as fs from 'fs';
import * as path from 'path';
import { TTSProvider } from '../src/middleware/services/tts/types';

/**
 * Manual test script for EdenAI provider
 * 
 * Run with: npx ts-node scripts/manual-test-edenai.ts
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

async function testEdenAI() {
  // 1. Load environment variables FIRST
  loadEnv();

  // 2. Dynamically import ttsService AFTER env vars are loaded
  // This ensures the singleton is initialized with the correct config
  const { ttsService } = await import('../src/middleware/services/tts/tts.service');

  console.log('\n--- Starting EdenAI Manual Test ---\n');

  if (!process.env.EDENAI_API_KEY) {
    console.error('❌ Error: EDENAI_API_KEY is not set.');
    console.log('Please check your .env file or environment variables.');
    process.exit(1);
  }

  try {
    // Ensure output directory exists in root
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    console.log('Synthesizing speech with EdenAI...');
    
    // Test basic synthesis
    const response = await ttsService.synthesize({
      text: 'Hello! This is a test of the Loonylabs TTS middleware using Eden AI.',
      provider: TTSProvider.EDENAI,
      voice: { id: 'en-US' }, // Generic language code, EdenAI picks voice
      audio: {
        speed: 1.0,
        format: 'mp3',
      },
      providerOptions: {
        provider: 'google', // Force specific underlying provider
      }
    });

    const outputPath = path.join(outputDir, 'edenai-test.mp3');
    fs.writeFileSync(outputPath, response.audio);

    console.log('\n✅ Synthesis Successful!');
    console.log(`   - Output saved to: ${outputPath}`);
    console.log(`   - Characters billed: ${response.billing.characters}`);
    console.log(`   - Provider used: ${response.metadata.provider}`);
    console.log(`   - Voice: ${response.metadata.voice}`);
    console.log(`   - Duration: ${response.metadata.duration}ms`);

  } catch (error) {
    console.error('\n❌ EdenAI Test Failed:', error);
    if (error instanceof Error) {
      console.error('   Error Message:', error.message);
    }
  }
}

testEdenAI();

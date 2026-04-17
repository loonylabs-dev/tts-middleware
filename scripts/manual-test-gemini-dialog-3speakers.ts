import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { GoogleAuth } from 'google-auth-library';

/**
 * Hard-fact test — does Vertex AI Gemini 3.1 Flash TTS actually accept
 * MORE THAN 2 speakers in a single `multiSpeakerVoiceConfig` request?
 *
 * Background: The middleware currently enforces a hard 2-speaker-per-segment
 * limit (see vertex-ai-tts-provider.ts `buildDialogRequest`). The canonical
 * dialog test script (manual-test-gemini-dialog.ts) documents the same
 * constraint in its header comment. However Google's own docs and the AI
 * chatbot output suggest that the API may accept more — with a soft upper
 * bound around 5 speakers before stability degrades.
 *
 * This script BYPASSES the middleware entirely. It constructs the raw Vertex
 * AI generateContent request body with 3 distinct speakers and POSTs it
 * directly. The goal is not to produce useful audio — the goal is to observe
 * the raw HTTP response so we can decide, with evidence, whether to invest in
 * a middleware change that supports N speakers per segment.
 *
 * Outcomes of interest:
 *   - HTTP 400 with "at most 2 speakers" / similar → middleware limit is
 *     justified, stop here.
 *   - HTTP 200 with audio → middleware limit is over-conservative; we can
 *     consider lifting it (separate change, not now).
 *   - HTTP 200 but audio is degraded (voice mismatches, skipped turns) →
 *     documented instability, keep the 2-speaker limit.
 *
 * Usage:
 *   cd C:/Development/loonylabs/tts-middleware
 *   npx ts-node scripts/manual-test-gemini-dialog-3speakers.ts
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS (Service Account JSON)
 *   - GOOGLE_CLOUD_PROJECT (Project ID)
 *   - ffmpeg available (else output stays as WAV fallback)
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

const MODEL = 'gemini-3.1-flash-tts-preview';
const REGION = process.env.VERTEX_AI_TTS_REGION || 'us-central1';
const SAMPLE_RATE = 24000;

/**
 * 3-speaker test request — Erzähler + Alice + Bob all in ONE multiSpeakerVoiceConfig.
 *
 * The stylePrompt is imperative + colon-terminated (our new Scribomate pattern)
 * so we validate that path too.
 */
function buildThreeSpeakerRequest(): Record<string, unknown> {
  const stylePrompt =
    'Lies den folgenden Dialog in einem dunklen Labor, Alice flüsternd und angespannt, Bob resigniert, der Erzähler ruhig beobachtend:';

  const scriptText =
    'Erzähler: Das Labor war vollkommen dunkel.\n' +
    'Alice: [whispering] Hast du den Schalter gefunden?\n' +
    'Bob: [sigh] Nein, hier ist nur eine kalte Wand.\n' +
    'Alice: [excited] Warte! Da leuchtet etwas!\n' +
    'Erzähler: Ein schwacher blauer Schein fiel auf ihre Gesichter.\n' +
    'Bob: Das ist... das kann nicht sein.';

  const synthesisText = `${stylePrompt}\n${scriptText}`;

  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: synthesisText }],
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'Erzähler',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
            },
            {
              speaker: 'Alice',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
            },
            {
              speaker: 'Bob',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
          ],
        },
      },
      temperature: 1.0,
    },
  };
}

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = (await auth.getClient()) as {
    getAccessToken: () => Promise<{ token?: string | null }>;
  };
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) {
    throw new Error('Failed to obtain access token');
  }
  return tokenResponse.token;
}

function pcmToWav(pcmBuffer: Buffer): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataLength = pcmBuffer.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function pcmToMp3(pcmBuffer: Buffer, ffmpegPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-f', 's16le',
      '-ar', String(SAMPLE_RATE),
      '-ac', '1',
      '-i', 'pipe:0',
      '-codec:a', 'libmp3lame',
      '-b:a', '128k',
      '-f', 'mp3',
      'pipe:1',
    ]);

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr.on('data', () => {});

    ffmpeg.on('error', (err: Error) => {
      reject(new Error(`ffmpeg spawn failed: ${err.message}`));
    });

    ffmpeg.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    ffmpeg.stdin.write(pcmBuffer);
    ffmpeg.stdin.end();
  });
}

function resolveFfmpegPath(): string | null {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegStatic = require('ffmpeg-static') as string | null;
    if (ffmpegStatic) return ffmpegStatic;
  } catch {
    /* noop */
  }
  return 'ffmpeg';
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

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPathMp3 = path.join(outputDir, `gemini-dialog-3speakers-${timestamp}.mp3`);
  const outputPathWav = path.join(outputDir, `gemini-dialog-3speakers-${timestamp}.wav`);

  const requestBody = buildThreeSpeakerRequest();

  console.log('\n=== 3-Speaker Hard-Fact Test ===');
  console.log(`Model:   ${MODEL}`);
  console.log(`Region:  ${REGION}`);
  console.log(`Project: ${projectId}`);
  console.log(`Speakers in multiSpeakerVoiceConfig: 3 (Erzähler, Alice, Bob)`);
  console.log('\n--- Request body ---');
  console.log(JSON.stringify(requestBody, null, 2));

  const textBytes = Buffer.byteLength(
    (requestBody.contents as Array<{ parts: Array<{ text: string }> }>)[0].parts[0].text,
    'utf8',
  );
  console.log(`\nText payload: ${textBytes} bytes (Gemini TTS hard limit is 4000 bytes text, 8000 bytes combined)`);

  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${REGION}/publishers/google/models/${MODEL}:generateContent`;
  console.log(`\nEndpoint: ${url}`);

  console.log('\n--- Requesting access token... ---');
  const token = await getAccessToken();
  console.log('✅ Token acquired.');

  console.log('\n--- Calling Vertex AI... ---');
  const startTime = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  const duration = Date.now() - startTime;

  console.log(`\n--- HTTP ${response.status} (${duration}ms) ---`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Vertex AI rejected the request.\n');
    console.error('Response body:');
    console.error(errorText);
    console.error(
      '\n=== VERDICT: 3 speakers in a single multiSpeakerVoiceConfig is REJECTED by Vertex AI. ===',
    );
    console.error('Middleware limit is justified. Stop here.');
    process.exit(1);
  }

  const responseJson = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
        }>;
      };
    }>;
    usageMetadata?: unknown;
  };

  const inlineData = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData?.data) {
    console.error('❌ HTTP 200 but no inline audio data in response.');
    console.error('Full response:');
    console.error(JSON.stringify(responseJson, null, 2));
    process.exit(1);
  }

  const pcmBuffer = Buffer.from(inlineData.data, 'base64');
  console.log(`✅ PCM audio received: ${pcmBuffer.length.toLocaleString()} bytes`);
  console.log(`   mimeType: ${inlineData.mimeType ?? '(unknown)'}`);
  console.log(`   usageMetadata: ${JSON.stringify(responseJson.usageMetadata ?? {})}`);

  // WAV fallback always works
  const wavBuffer = pcmToWav(pcmBuffer);
  fs.writeFileSync(outputPathWav, wavBuffer);
  console.log(`\n   WAV saved: ${outputPathWav}`);

  // MP3 if ffmpeg available
  const ffmpegPath = resolveFfmpegPath();
  if (ffmpegPath) {
    try {
      const mp3Buffer = await pcmToMp3(pcmBuffer, ffmpegPath);
      fs.writeFileSync(outputPathMp3, mp3Buffer);
      console.log(`   MP3 saved: ${outputPathMp3}`);
    } catch (err) {
      console.warn(`   ffmpeg failed (${(err as Error).message}), MP3 skipped.`);
    }
  }

  console.log('\n=== VERDICT: 3 speakers in a single multiSpeakerVoiceConfig is ACCEPTED by Vertex AI. ===');
  console.log('Listen to the output file to judge audio quality (voice distinction, skipped turns, etc.)');
  console.log('If audio quality is good: consider a separate middleware change to raise the 2-speaker limit.');
  console.log('If audio is degraded: keep the 2-speaker limit — documented instability is real.');
}

main().catch((err) => {
  console.error('\n❌ Script failed:', err);
  if (err instanceof Error) {
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
  }
  process.exit(1);
});

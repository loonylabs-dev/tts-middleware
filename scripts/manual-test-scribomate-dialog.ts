import * as fs from 'fs';
import * as path from 'path';
import { VertexAITTSProvider } from '../src/middleware/services/tts/providers/vertex-ai-tts-provider';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

/**
 * Reproduce the EXACT dialog request that Scribomate sends for section
 * fc779b18-b0aa-4e9d-bb01-28e340cad684 (Isander / Turbosahne / Narrator).
 *
 * The user reports that when generating audio in Scribomate, the voice
 * swap between Character and Narrator is unreliable — sometimes the
 * character keeps talking through the Narrator's turn, sometimes not.
 *
 * This script bypasses Scribomate entirely to verify:
 *   1. Is the text being passed to Gemini wrong? (we'd see it here)
 *   2. Is Gemini misbehaving even with textbook-clean input?
 *
 * Usage:
 *   npx ts-node scripts/manual-test-scribomate-dialog.ts
 *   npx ts-node scripts/manual-test-scribomate-dialog.ts raw     # un-transformed data (as LLM emits)
 *   npx ts-node scripts/manual-test-scribomate-dialog.ts cleaned # post-transformation (what Scribomate currently sends)
 *
 * Requires (same as manual-test-gemini-dialog.ts):
 *   - GOOGLE_APPLICATION_CREDENTIALS
 *   - GOOGLE_CLOUD_PROJECT
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
      console.log('.env loaded.');
    }
  } catch (error) {
    console.error('Error loading .env:', error);
  }
}

// ==========================================================================
// Mode: 'raw' = text exactly as LLM emitted (leading commas, no end period)
//       'cleaned' = Scribomate's current transformation (period appended,
//                   leading comma stripped, first letter capitalized)
// ==========================================================================

const MODE = (process.argv[2] ?? 'cleaned') as 'raw' | 'cleaned';

// ==========================================================================
// EXACT data from the DB — speakers + voices + stylePrompts + turns
// (section fc779b18-b0aa-4e9d-bb01-28e340cad684)
// ==========================================================================

const SPEAKERS = [
  { speaker: 'Narrator',   voice: 'Fenrir' },
  { speaker: 'Isander',    voice: 'Leda' },
  { speaker: 'Turbosahne', voice: 'Aoede' },
];

const STYLE_SEG1 = 'Ruhiger, bildhafter Erzähler. Die friedliche Atmosphäre am Teichufer wird durch eine kleine Entdeckung untermalt. Sanft und leicht geheimnisvoll.';
const STYLE_CONTRAST = 'Ein dynamischer Kontrast am Teichufer. Turbosahne ist frech, laut und voller Energie, während Isander gelassen und sanft reagiert.';

// RAW texts straight from the DB (what the LLM parser produced)
const RAW_TURNS = {
  seg1_narrator: 'Am großen Teich ging es drunter und drüber. Überall flitzten Enten hin und her, quatschten laut und machten riesige Wellen. Isander aber schwamm ganz gemächlich. Sie liebte die Stille unter den Trauerweiden. Plötzlich sah sie etwas Blaues im Sand funkeln. Es war eine wunderschöne Glasmurmel! Isander stieß ein leises Freudenquaken aus und versteckte den Schatz behutsam in ihrem geheimen Nest zwischen den Schilfhalmen.\n\nPlötzlich schoss Turbosahne wie ein kleiner, grüner Blitz an ihr vorbei. Er wirbelte das Wasser auf, bis Isanders Federn wackelten. Turbosahne bremste quietschend ab und sah sie spöttisch an.',

  seg2_turbosahne: 'Komm schon, Isander! Beweg dich endlich, du lahme Ente!',
  seg2_narrator:   ', rief er und spritzte mit den Flügeln. Isander sah ihn nur ruhig an.',

  seg3_isander:    'Ich habe es nicht eilig',
  seg3_narrator:   ', antwortete sie sanft. Turbosahne schüttelte den Kopf.',

  seg4_turbosahne: 'Wer langsam ist, verpasst das Leben! Ich fordere dich heraus! Morgen ein Wettrennen rund um den Teich! Wer zuerst am alten Baum ist, gewinnt!',
  seg4_narrator:   ' Isander lächelte nur und betrachtete ihre glitzernde Murmel.',
};

// Apply Scribomate's current transformations (formatTurnForMiddleware)
function cleanNarrator(t: string): string {
  let s = t.trim();
  s = s.replace(/^[,;:]+\s*/, '');
  if (s.length > 0 && /[a-zäöüß]/u.test(s[0])) {
    s = s[0].toLocaleUpperCase('de') + s.slice(1);
  }
  return s;
}
function ensureTerminalPunct(t: string): string {
  const s = t.trim();
  if (s.length === 0) return s;
  const last = s[s.length - 1];
  if (last === '.' || last === '!' || last === '?' || last === '…') return s;
  return `${s}.`;
}

function xform(speaker: string, text: string, tags?: string[]): string {
  const base = speaker === 'Narrator' ? cleanNarrator(text) : ensureTerminalPunct(text);
  if (!tags || tags.length === 0) return base;
  return tags.map((t) => `[${t}]`).join(' ') + ' ' + base;
}

const t = MODE === 'cleaned'
  ? {
      seg1_narrator:    xform('Narrator', RAW_TURNS.seg1_narrator),
      seg2_turbosahne:  xform('Turbosahne', RAW_TURNS.seg2_turbosahne, ['shouting']),
      seg2_narrator:    xform('Narrator', RAW_TURNS.seg2_narrator),
      seg3_isander:     xform('Isander', RAW_TURNS.seg3_isander),
      seg3_narrator:    xform('Narrator', RAW_TURNS.seg3_narrator),
      seg4_turbosahne:  xform('Turbosahne', RAW_TURNS.seg4_turbosahne),
      seg4_narrator:    xform('Narrator', RAW_TURNS.seg4_narrator),
    }
  : {
      seg1_narrator:    RAW_TURNS.seg1_narrator,
      seg2_turbosahne:  '[shouting] ' + RAW_TURNS.seg2_turbosahne,
      seg2_narrator:    RAW_TURNS.seg2_narrator,
      seg3_isander:     RAW_TURNS.seg3_isander,
      seg3_narrator:    RAW_TURNS.seg3_narrator,
      seg4_turbosahne:  RAW_TURNS.seg4_turbosahne,
      seg4_narrator:    RAW_TURNS.seg4_narrator,
    };

function buildRequest(): SynthesizeDialogRequest {
  return {
    speakers: SPEAKERS,
    segments: [
      // Segment 1: solo narrator
      {
        stylePrompt: STYLE_SEG1,
        turns: [{ speaker: 'Narrator', text: t.seg1_narrator }],
      },
      // Segment 2: Turbosahne → Narrator
      {
        stylePrompt: STYLE_CONTRAST,
        turns: [
          { speaker: 'Turbosahne', text: t.seg2_turbosahne },
          { speaker: 'Narrator',   text: t.seg2_narrator },
        ],
      },
      // Segment 3: Isander → Narrator
      {
        stylePrompt: STYLE_CONTRAST,
        turns: [
          { speaker: 'Isander',  text: t.seg3_isander },
          { speaker: 'Narrator', text: t.seg3_narrator },
        ],
      },
      // Segment 4: Turbosahne → Narrator
      {
        stylePrompt: STYLE_CONTRAST,
        turns: [
          { speaker: 'Turbosahne', text: t.seg4_turbosahne },
          { speaker: 'Narrator',   text: t.seg4_narrator },
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
    console.error('GOOGLE_APPLICATION_CREDENTIALS not set.');
    process.exit(1);
  }

  const outDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, `scribomate-dialog-${MODE}.mp3`);

  console.log(`\n=== Scribomate Dialog Test (MODE: ${MODE}) ===`);
  console.log(`Speakers: ${SPEAKERS.map((s) => `${s.speaker}(${s.voice})`).join(', ')}`);
  console.log(`Output:   ${outPath}\n`);

  const req = buildRequest();

  // Dump the full request (same location/format as Scribomate's dump)
  const os = await import('node:os');
  const debugDir = path.join(os.tmpdir(), 'scribomate-dialog-tts-debug');
  fs.mkdirSync(debugDir, { recursive: true });
  const dumpPath = path.join(debugDir, `script-${MODE}-${Date.now()}.json`);
  fs.writeFileSync(dumpPath, JSON.stringify(req, null, 2), 'utf-8');
  console.log(`\n📝 Request dumped to: ${dumpPath}`);

  console.log('--- Segments ---');
  req.segments.forEach((seg, i) => {
    const speakers = Array.from(new Set(seg.turns.map((t) => t.speaker)));
    console.log(`\nSegment ${i} [${speakers.length} speaker${speakers.length !== 1 ? 's' : ''}: ${speakers.join(', ')}]`);
    const sp = seg.stylePrompt ?? '';
    console.log(`  stylePrompt: "${sp.slice(0, 100)}${sp.length > 100 ? '…' : ''}"`);
    seg.turns.forEach((turn) => {
      const preview = turn.text.length > 120 ? turn.text.slice(0, 117) + '…' : turn.text;
      console.log(`  ${turn.speaker}: "${preview}"`);
    });
  });

  console.log('\n--- Synthesizing... ---');
  const provider = new VertexAITTSProvider();
  const start = Date.now();
  try {
    const response = await provider.synthesizeDialog(req);
    const duration = Date.now() - start;
    fs.writeFileSync(outPath, response.audio);

    console.log('\n✅ Success!');
    console.log(`   Output:        ${outPath}`);
    console.log(`   Audio size:    ${response.audio.length.toLocaleString()} bytes`);
    console.log(`   Audio duration: ${response.metadata.audioDuration ? (response.metadata.audioDuration / 1000).toFixed(2) + 's' : 'N/A'}`);
    console.log(`   Total latency:  ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Billed chars:   ${response.billing.characters}`);
    console.log(`\nListen to the file, then run with the other mode:`);
    console.log(`  npx ts-node scripts/manual-test-scribomate-dialog.ts ${MODE === 'cleaned' ? 'raw' : 'cleaned'}`);
  } catch (err) {
    console.error('\n❌ Failed:', err);
    if (err instanceof Error) {
      console.error('  Message:', err.message);
      if ('segmentIndex' in err && err.segmentIndex !== undefined) {
        console.error(`  Segment: #${(err as { segmentIndex: number }).segmentIndex}`);
      }
    }
    process.exit(1);
  }
}

main();

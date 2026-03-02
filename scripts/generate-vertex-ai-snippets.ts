import * as fs from 'fs';
import * as path from 'path';
import { TTSProvider, TTSSynthesizeRequest } from '../src/middleware/services/tts/types';

/**
 * Vertex AI TTS Snippet Generator
 *
 * Generates a large variety of voice + style combinations for audition.
 * Each snippet is 5-10 seconds (1-2 sentences with dialogue or narration).
 *
 * Usage:
 *   npx ts-node scripts/generate-vertex-ai-snippets.ts              - ALL snippets
 *   npx ts-node scripts/generate-vertex-ai-snippets.ts de           - German only
 *   npx ts-node scripts/generate-vertex-ai-snippets.ts en           - English only
 *   npx ts-node scripts/generate-vertex-ai-snippets.ts kinderbuch   - One style only
 *   npx ts-node scripts/generate-vertex-ai-snippets.ts kore         - One voice only
 *
 * Output: ./output/snippets/{lang}-{voice}-{style}.mp3
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT
 *   - ffmpeg (for MP3 output)
 */

// ---------------------------------------------------------------------------
// ENV
// ---------------------------------------------------------------------------

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
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// VOICES (curated selection — mix of genders and timbres)
// ---------------------------------------------------------------------------

const VOICES = [
  // Female / bright / soft
  { id: 'Kore',       tag: 'kore',       gender: 'f', desc: 'Firm' },
  { id: 'Aoede',      tag: 'aoede',      gender: 'f', desc: 'Breezy' },
  { id: 'Leda',       tag: 'leda',       gender: 'f', desc: 'Youthful' },
  { id: 'Zephyr',     tag: 'zephyr',     gender: 'f', desc: 'Bright' },
  { id: 'Achernar',   tag: 'achernar',   gender: 'f', desc: 'Soft' },
  { id: 'Sulafat',    tag: 'sulafat',    gender: 'f', desc: 'Warm' },
  // Male / deep / mature
  { id: 'Charon',     tag: 'charon',     gender: 'm', desc: 'Informative' },
  { id: 'Puck',       tag: 'puck',       gender: 'm', desc: 'Upbeat' },
  { id: 'Orus',       tag: 'orus',       gender: 'm', desc: 'Firm' },
  { id: 'Fenrir',     tag: 'fenrir',     gender: 'm', desc: 'Excitable' },
  { id: 'Gacrux',     tag: 'gacrux',     gender: 'm', desc: 'Mature' },
  { id: 'Sadaltager', tag: 'sadaltager', gender: 'm', desc: 'Knowledgeable' },
];

// ---------------------------------------------------------------------------
// STYLES — narrative styles relevant for book generation
// ---------------------------------------------------------------------------

interface StyleDef {
  tag: string;
  label: string;
  stylePrompt: string;
  textDe: string;
  textEn: string;
}

const STYLES: StyleDef[] = [
  // ── Neutral (no style prompt) ──────────────────────────────────────────
  {
    tag: 'neutral',
    label: 'Neutral / Default',
    stylePrompt: '',
    textDe: 'Die warme Herbstsonne tauchte den Hof in goldenes Licht. Lisa schloss die Augen. „Genau so hab ich mir das vorgestellt", flüsterte sie.',
    textEn: 'The warm autumn sun bathed the courtyard in golden light. Lisa closed her eyes and breathed deeply.',
  },

  // ── Kinderbuch (Children's book) ───────────────────────────────────────
  {
    tag: 'kinderbuch',
    label: 'Kinderbuch / Playful',
    stylePrompt: 'Read this like a warm, playful children\'s book narrator with gentle enthusiasm:',
    textDe: '„Lass das lieber, Eddi!", rief Robbe Rita besorgt. Doch Eddi wollte modern sein. Mit einem lauten Bzzzz rasierte er sein warmes, weißes Fell einfach ab.',
    textEn: '"Look, a rainbow!" cried Mia, pointing excitedly at the sky. The little dog barked happily and jumped in circles.',
  },

  // ── Young Adult ────────────────────────────────────────────────────────
  {
    tag: 'youngadult',
    label: 'Young Adult / Emotional',
    stylePrompt: 'Read this in an emotionally engaging young adult fiction style, with tension and vulnerability:',
    textDe: 'Ihr Herz raste. „Du hättest mir die Wahrheit sagen können", flüsterte sie. Er senkte den Blick. „Ich wollte dich beschützen."',
    textEn: 'Her heart raced. "You could have told me the truth," she whispered. He lowered his gaze. "I was trying to protect you."',
  },

  // ── Romance ────────────────────────────────────────────────────────────
  {
    tag: 'romance',
    label: 'Romance / Soft & Intimate',
    stylePrompt: 'Read this in a soft, intimate romance novel style with warmth and longing:',
    textDe: 'Seine Hand fand ihre im Dunkeln. „Bleib", sagte er leise. Das Wort hing zwischen ihnen wie ein Versprechen.',
    textEn: 'His hand found hers in the darkness. "Stay," he said quietly. The word hung between them like a promise.',
  },

  // ── Dialog-stark (Dialogue-heavy) ──────────────────────────────────────
  {
    tag: 'dialog',
    label: 'Dialogue-heavy / Expressive',
    stylePrompt: 'Read this with distinct character voices and expressive dialogue delivery. Give each speaker a slightly different energy:',
    textDe: '„Das ist dein Ernst?" Max verschränkte die Arme. „Absolut", grinste Sarah. „Entweder wir springen, oder wir gehen nach Hause."',
    textEn: '"You\'re serious?" Max crossed his arms. "Absolutely," Sarah grinned. "Either we jump, or we go home."',
  },

  // ── Ruhig / Calm narrator ──────────────────────────────────────────────
  {
    tag: 'calm',
    label: 'Calm Narrator / Steady',
    stylePrompt: 'Read this in a calm, measured, professional audiobook narration style with a steady pace:',
    textDe: 'Der Fluss schlängelte sich durch das stille Tal. „Hier bleiben wir", sagte er ruhig und setzte den Rucksack ab.',
    textEn: 'The river wound its way through the quiet valley. In the distance, the mountains rose as dark silhouettes against the evening sky.',
  },

  // ── Enthusiastisch / Energetic ─────────────────────────────────────────
  {
    tag: 'energetic',
    label: 'Energetic / Dynamic',
    stylePrompt: 'Read this with high energy, excitement, and a dynamic pace as if narrating an adventure:',
    textDe: 'Sie rannten los! Der Wind peitschte durch ihre Haare, der Boden bebte unter ihren Füßen. „Schneller!", schrie Tom.',
    textEn: 'They took off running! The wind whipped through their hair, the ground trembled beneath their feet. "Faster!" Tom shouted.',
  },

  // ── Märchen / Fairy tale ───────────────────────────────────────────────
  {
    tag: 'fairytale',
    label: 'Fairy tale / Magical',
    stylePrompt: 'Read this like a classic fairy tale narrator, with wonder and a touch of magic in your voice:',
    textDe: 'Es war einmal ein kleines Mädchen am Rande des Zauberwaldes. „Wer bist du?", fragte es den sprechenden Fuchs. „Ein Freund", antwortete er und lächelte.',
    textEn: 'Once upon a time, long, long ago, there lived a little girl in a house at the edge of the Enchanted Forest.',
  },

  // ── Thriller / Suspense ────────────────────────────────────────────────
  {
    tag: 'thriller',
    label: 'Thriller / Suspenseful',
    stylePrompt: 'Read this with building suspense, a low tense voice, and dramatic pauses:',
    textDe: 'Das Licht flackerte. Dann erlosch es. „Hast du das gehört?", flüsterte sie. Die Schritte kamen näher – langsam, gleichmäßig.',
    textEn: 'The light flickered. Then it went out. In the silence, she heard footsteps — slow, steady, and getting closer.',
  },

  // ── Sachbuch / Non-fiction ─────────────────────────────────────────────
  {
    tag: 'nonfiction',
    label: 'Non-fiction / Informative',
    stylePrompt: 'Read this in a clear, authoritative, and engaging non-fiction style like a documentary narrator:',
    textDe: '„Das verändert alles", sagte die Forscherin und starrte auf die Daten. Zum ersten Mal konnten sie nachweisen, dass das Universum sich ausdehnt.',
    textEn: 'The discovery changed everything. For the first time, scientists could prove that the universe was expanding.',
  },

  // ── Hörbuch Classic / Audiobook ────────────────────────────────────────
  {
    tag: 'audiobook',
    label: 'Audiobook Classic / Warm',
    stylePrompt: 'Read this as a warm, professional audiobook narrator with excellent pacing and natural intonation:',
    textDe: 'Kapitel eins. Marie öffnete leise die Tür und trat in den Garten. „Heute wird ein guter Tag", sagte sie leise zu sich selbst.',
    textEn: 'Chapter one. In the morning, as the sun was just rising above the rooftops, Marie quietly opened the door and stepped into the garden.',
  },

  // ── Dramatisch / Dramatic reading ──────────────────────────────────────
  {
    tag: 'dramatic',
    label: 'Dramatic / Theatrical',
    stylePrompt: 'Read this with dramatic flair and theatrical intensity, like a stage performance:',
    textDe: '„Niemals!", donnerte er und schlug mit der Faust auf den Tisch. „Solange ich lebe, wird das nicht geschehen!"',
    textEn: '"Never!" he thundered, slamming his fist on the table. "As long as I live, that will not happen!"',
  },

  // ── Bedtime story ──────────────────────────────────────────────────────
  {
    tag: 'bedtime',
    label: 'Bedtime Story / Soothing',
    stylePrompt: 'Read this as a gentle, soothing bedtime story. Speak slowly and softly, as if lulling a child to sleep:',
    textDe: 'Der kleine Bär gähnte und kuschelte sich in sein weiches Moosbett. „Gute Nacht, Wald", flüsterte er. Die Sterne leuchteten leise über ihm.',
    textEn: 'The little bear yawned and snuggled into his soft mossy bed. "Goodnight, forest," he whispered. The stars glowed softly above him.',
  },

  // ── Witzig / Comedic ──────────────────────────────────────────────────
  {
    tag: 'comedic',
    label: 'Comedic / Humorous',
    stylePrompt: 'Read this with comedic timing, playful exaggeration, and a hint of mischief:',
    textDe: '„Ich bin absolut KEIN Morgenmensch", murmelte der Kater und fiel vom Sofa. Der Wecker klingelte weiter, völlig unbeeindruckt.',
    textEn: '"I am absolutely NOT a morning person," the cat grumbled and fell off the sofa. The alarm clock kept ringing, entirely unfazed.',
  },
];

// ---------------------------------------------------------------------------
// RUNNER
// ---------------------------------------------------------------------------

const MODEL = 'gemini-2.5-flash-preview-tts';
const MODEL_TAG = MODEL.includes('pro') ? 'pro' : 'flash';

let successCount = 0;
let skipCount = 0;
let failCount = 0;

async function synthesize(
  testName: string,
  params: TTSSynthesizeRequest,
  filename: string
) {
  const outputDir = path.join(__dirname, '../output/snippets');
  const outputPath = path.join(outputDir, filename);

  if (fs.existsSync(outputPath)) {
    skipCount++;
    return;
  }

  // Lazy import so env vars are loaded first
  const { ttsService } = await import('../src/middleware/services/tts/tts.service');

  process.stdout.write(`  ${testName} ... `);

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const start = Date.now();
    const response = await ttsService.synthesize(params);
    const ms = Date.now() - start;

    fs.writeFileSync(outputPath, response.audio);
    successCount++;
    console.log(`✅ ${ms}ms (${response.audio.length} bytes) → ${filename}`);
  } catch (error) {
    failCount++;
    console.log(`❌ ${(error as Error).message.slice(0, 80)}`);
  }
}

async function generateSnippets(
  lang: 'de' | 'en',
  voices: typeof VOICES,
  styles: StyleDef[]
) {
  const langLabel = lang === 'de' ? 'German' : 'English';

  for (const style of styles) {
    console.log(`\n━━━ ${langLabel} · ${style.label} ━━━`);

    for (const voice of voices) {
      const text = lang === 'de' ? style.textDe : style.textEn;
      const fullText = style.stylePrompt ? `${style.stylePrompt} ${text}` : text;
      const filename = `${lang}-${MODEL_TAG}-${voice.tag}-${style.tag}.mp3`;

      await synthesize(
        `${voice.id} (${voice.gender}) — ${style.tag}`,
        {
          text: fullText,
          provider: TTSProvider.VERTEX_AI,
          voice: { id: voice.id },
          audio: { format: 'mp3' },
          providerOptions: {
            model: MODEL,
          },
        },
        filename
      );
    }
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  loadEnv();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !process.env.GOOGLE_CLOUD_PROJECT) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT required.');
    process.exit(1);
  }

  const args = process.argv.slice(2).map(a => a.toLowerCase());

  // Filter languages
  const runDe = args.length === 0 || args.includes('de');
  const runEn = args.length === 0 || args.includes('en');

  // Filter voices by name
  const voiceFilter = args.find(a => VOICES.some(v => v.tag === a));
  const filteredVoices = voiceFilter
    ? VOICES.filter(v => v.tag === voiceFilter)
    : VOICES;

  // Filter styles by tag
  const styleFilter = args.find(a => STYLES.some(s => s.tag === a));
  const filteredStyles = styleFilter
    ? STYLES.filter(s => s.tag === styleFilter)
    : STYLES;

  const totalSnippets = filteredVoices.length * filteredStyles.length * ((runDe ? 1 : 0) + (runEn ? 1 : 0));

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Vertex AI TTS Snippet Generator (Flash model)      ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Voices:  ${filteredVoices.length} (${filteredVoices.map(v => v.id).join(', ').slice(0, 40)}...)`);
  console.log(`║  Styles:  ${filteredStyles.length} (${filteredStyles.map(s => s.tag).join(', ').slice(0, 40)}...)`);
  console.log(`║  Langs:   ${[runDe ? 'de' : '', runEn ? 'en' : ''].filter(Boolean).join(', ')}`);
  console.log(`║  Total:   ${totalSnippets} snippets`);
  console.log(`║  Output:  ./output/snippets/`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Filters: npx ts-node scripts/generate-vertex-ai-snippets.ts [de|en] [voice] [style]');
  console.log('Example: npx ts-node scripts/generate-vertex-ai-snippets.ts de kore kinderbuch');
  console.log('');

  if (runDe) await generateSnippets('de', filteredVoices, filteredStyles);
  if (runEn) await generateSnippets('en', filteredVoices, filteredStyles);

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`Done! ✅ ${successCount} generated · ⏭ ${skipCount} skipped · ❌ ${failCount} failed`);
  console.log(`Output: ${path.join(__dirname, '../output/snippets/')}`);
  console.log('');

  if (successCount > 0) {
    console.log(`Naming pattern: {lang}-{model}-{voice}-{style}.mp3  (model=${MODEL_TAG})`);
    console.log(`Example:        de-${MODEL_TAG}-kore-kinderbuch.mp3`);
    console.log('');
    console.log('Tip: Play all German Kinderbuch snippets:');
    console.log(`  ls output/snippets/de-${MODEL_TAG}-*-kinderbuch.mp3`);
    console.log('');
    console.log('Tip: Play all Kore voice variants:');
    console.log(`  ls output/snippets/*-${MODEL_TAG}-kore-*.mp3`);
  }
}

main().catch(console.error);

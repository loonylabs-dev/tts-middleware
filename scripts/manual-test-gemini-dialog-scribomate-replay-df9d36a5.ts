import * as fs from 'fs';
import * as path from 'path';
import { VertexAITTSProvider } from '../src/middleware/services/tts/providers/vertex-ai-tts-provider';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

/**
 * A/B replay for Scribomate section df9d36a5-c4f0-4c0c-b942-7f6fbee6e16e.
 *
 * Variant A: EXACT 1:1 replay of what Scribomate sent at 2026-04-17 15:24
 *   — data copied verbatim from cnt_book_sections.voice_assignments.
 *   — turn text formatted by our replica of formatTurnForMiddleware
 *     (prepend audio-tags as [tag] prefixes + strip trailing [,\s]).
 *   Purpose: confirm the MP3 sounds acoustically identical to Scribomate's
 *   output → if yes, it's 100 % data-driven, no Scribomate-runtime factor.
 *
 * Variant B: seg2 and seg6 (narrator turns reporting a character's previous
 *   utterance) cleaned — [short pause] tag removed AND the leading ", "
 *   fragment stripped so each narrator segment starts with a complete
 *   clause.
 *   Purpose: test the hypothesis that the `[short pause] , rief er`
 *   opening causes Gemini to ignore `prebuiltVoiceConfig` and render with
 *   the previous turn's voice characteristics.
 *
 * Expected outcomes:
 *   - A buggy + B clean  → the text fragment at segment start is what
 *     triggers Gemini's voice-drift. Fix: sanitize narrator-turn leading
 *     fragments + move/strip pause tags from narrator-reporting turns.
 *   - A buggy + B buggy  → something deeper. The fragment isn't the cause.
 *   - A clean            → Gemini was just nondeterministically off on
 *     the original Scribomate run; rerun would fix it. Not a code bug.
 *
 * Usage:
 *   cd C:/Development/loonylabs/tts-middleware
 *   npx ts-node scripts/manual-test-gemini-dialog-scribomate-replay-df9d36a5.ts
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

// ---------------------------------------------------------------------------
// DB data — voice_assignments copied verbatim from Scribomate section
// df9d36a5-c4f0-4c0c-b942-7f6fbee6e16e at 2026-04-17T15:24:24.
// ---------------------------------------------------------------------------

interface DBTurn {
  id: string;
  speaker: string;
  text: string;
  suggestedTags?: string[];
}
interface DBSegment {
  id: string;
  stylePrompt: string;
  turns: DBTurn[];
}

const DB_SPEAKERS = [
  { speaker: 'Narrator',   voice: 'Fenrir'   },
  { speaker: 'Turbosahne', voice: 'Achernar' },
  { speaker: 'Isander',    voice: 'Puck'     },
];

const DB_SEGMENTS: DBSegment[] = [
  {
    id: 'seg0',
    stylePrompt: 'Lies den folgenden Text als lebendiger Erzähler, der die morgendliche Aufregung am See schildert:',
    turns: [
      { id: 't0', speaker: 'Narrator',
        text: 'Am nächsten Morgen quakte Turbosahne schon ungeduldig am Ufer. ' },
    ],
  },
  {
    id: 'seg1',
    stylePrompt: 'Lies den folgenden Ausruf als Turbosahne, voller Energie und Tatendrang:',
    turns: [
      { id: 't1', speaker: 'Turbosahne',
        text: 'Los, Isander! Auf die Plätze, fertig, los!',
        suggestedTags: ['shouting'] },
    ],
  },
  {
    id: 'seg2',
    stylePrompt: 'Lies die folgende Passage als beobachtender Erzähler, der den Kontrast zwischen den beiden Schwimmern beschreibt:',
    turns: [
      { id: 't2', speaker: 'Narrator',
        text: ', rief er und raste wie eine wilde Rakete über das Wasser. Isander paddelte ganz entspannt los. Sie schaute nach links und rechts. Plötzlich glitzerte etwas unter einem Seerosenblatt. Es war eine goldene Scherbe! Isander stoppte kurz, um sie zu bewundern. Sie paddelte nicht den langen Weg um die Insel, sondern nutzte den schmalen Pfad durch die Schilf-Geheimtür, den nur sie kannte. Sie sah Turbosahne in der Ferne keuchend gegen die Strömung kämpfen. Als Isander ganz gemütlich am alten Baum ankam, saß sie schon seelenruhig da, als Turbosahne endlich völlig außer Puste auftauchte. ',
        suggestedTags: ['short pause'] },
    ],
  },
  {
    id: 'seg3',
    stylePrompt: 'Lies die folgenden Fragen als Turbosahne, völlig erschöpft und außer Atem:',
    turns: [
      { id: 't3', speaker: 'Turbosahne',
        text: 'Wo warst du denn? Du musst doch abkürzen!',
        suggestedTags: ['whispering'] },
    ],
  },
  {
    id: 'seg4',
    stylePrompt: 'Lies den folgenden kurzen Erzählteil ruhig und begleitend:',
    turns: [
      { id: 't4', speaker: 'Narrator',
        text: ', japste er. Isander lächelte und zeigte ihm ihren neuen Schatz. ' },
    ],
  },
  {
    id: 'seg5',
    stylePrompt: 'Lies die folgende Antwort als Isander, ruhig, weise und sehr sanft:',
    turns: [
      { id: 't5', speaker: 'Isander',
        text: 'Das Leben ist kein Rennen, Turbosahne. Wer genau hinschaut, findet die schönsten Schätze' },
    ],
  },
  {
    id: 'seg6',
    stylePrompt: 'Lies den abschließenden Text als warmer Erzähler, der die friedliche Stimmung zum Ende hin einfängt:',
    turns: [
      { id: 't6', speaker: 'Narrator',
        text: ', sagte sie sanft. Turbosahne staunte nicht schlecht. Er setzte sich neben sie und wurde plötzlich ganz still.',
        suggestedTags: ['short pause'] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Replica of Scribomate's formatTurnForMiddleware — prepend [tag] + strip
// trailing commas/whitespace. This is what Scribomate actually sends for
// each turn's text.
// ---------------------------------------------------------------------------

function formatTurnForMiddleware(text: string, tags?: string[]): string {
  const stripped = text.replace(/[,\s\n]+$/u, '');
  if (!tags || tags.length === 0) return stripped;
  return tags.map((t) => `[${t}]`).join(' ') + ' ' + stripped;
}

// ---------------------------------------------------------------------------
// Build the middleware request from the DB segments. `cleanNarratorLeadIns`
// enables Variant B: strip leading fragment tokens (", ", "[short pause] ")
// from narrator turns reporting a character's previous utterance.
// ---------------------------------------------------------------------------

function buildRequest(cleanNarratorLeadIns: boolean): SynthesizeDialogRequest {
  const segments = DB_SEGMENTS.map((seg) => {
    const cleanedTurns = seg.turns.map((t) => {
      let text = t.text;
      let tags = t.suggestedTags;

      if (cleanNarratorLeadIns && t.speaker === 'Narrator') {
        // Drop pause tags (conceptually belong to prior character utterance,
        // not to the narrator reporting it).
        if (tags) {
          tags = tags.filter((tag) => !/pause$/i.test(tag));
          if (tags.length === 0) tags = undefined;
        }
        // Strip leading ", " or ". " that remained after quote-boundary split.
        // Replace with nothing so the narrator turn starts with a proper
        // subject/clause ("rief er..." instead of ", rief er...").
        text = text.replace(/^[,\s]+/u, '');
      }

      return { speaker: t.speaker, text, tags };
    });

    return {
      stylePrompt: seg.stylePrompt,
      turns: cleanedTurns.map((ct) => ({
        speaker: ct.speaker,
        text: formatTurnForMiddleware(ct.text, ct.tags),
      })),
    };
  });

  return {
    speakers: DB_SPEAKERS,
    segments,
    voice: { languageCode: 'de-DE' },
    audio: { format: 'mp3' },
    providerOptions: {
      model: 'gemini-3.1-flash-tts-preview',
      temperature: 1.0,
    },
  };
}

// ---------------------------------------------------------------------------
// Main — render both variants sequentially.
// ---------------------------------------------------------------------------

async function renderVariant(
  provider: VertexAITTSProvider,
  label: string,
  request: SynthesizeDialogRequest,
  outPath: string,
) {
  console.log(`\n=== Variant ${label} ===`);
  request.segments.forEach((seg, i) => {
    const speakers = Array.from(new Set(seg.turns.map((t) => t.speaker))).join('+');
    const textPreview = seg.turns[0].text.slice(0, 80);
    console.log(`  seg${i} [${speakers}] ${textPreview}${seg.turns[0].text.length > 80 ? '…' : ''}`);
  });

  const startTime = Date.now();
  const response = await provider.synthesizeDialog(request);
  const duration = Date.now() - startTime;

  fs.writeFileSync(outPath, response.audio);
  console.log(`  ✅ ${(response.audio.length / 1024).toFixed(1)} KB, ${
    response.metadata.audioDuration ? (response.metadata.audioDuration / 1000).toFixed(1) + 's' : 'N/A'
  }, ${duration}ms latency`);
  console.log(`  Output: ${outPath}`);
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
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const pathA = path.join(outputDir, `scribomate-replay-df9d36a5-A-asIs-${ts}.mp3`);
  const pathB = path.join(outputDir, `scribomate-replay-df9d36a5-B-cleaned-${ts}.mp3`);

  const provider = new VertexAITTSProvider();

  await renderVariant(provider, 'A (exact 1:1 replay of Scribomate request)', buildRequest(false), pathA);
  await renderVariant(provider, 'B (narrator lead-ins cleaned: no pause tag, no leading ", ")', buildRequest(true), pathB);

  console.log('\n=== Done. Compare the two MP3s ===');
  console.log(`A: ${pathA}`);
  console.log(`B: ${pathB}`);
  console.log('');
  console.log('Listen specifically to seg2 (~4s to ~25s into the file — the long narrator passage).');
  console.log('If A sounds like Achernar (female) on the narrator and B sounds like Fenrir (male) → text fragment triggered voice drift.');
  console.log('If both sound the same → the bug is elsewhere (or Gemini is nondeterministic on this input).');
}

main().catch((err) => {
  console.error('\n❌ Script failed:', err);
  if (err instanceof Error) {
    console.error('Message:', err.message);
  }
  process.exit(1);
});

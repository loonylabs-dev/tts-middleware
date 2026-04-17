import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { SynthesizeDialogRequest } from '../src/middleware/services/tts/types';

const SPEAKERS = [
  { speaker: 'Narrator', voice: 'Fenrir' },
  { speaker: 'Isander', voice: 'Leda' },
  { speaker: 'Turbosahne', voice: 'Aoede' },
];
const STYLE_SEG1 = 'Ruhiger, bildhafter Erzähler. Die friedliche Atmosphäre am Teichufer wird durch eine kleine Entdeckung untermalt. Sanft und leicht geheimnisvoll.';
const STYLE_CONTRAST = 'Ein dynamischer Kontrast am Teichufer. Turbosahne ist frech, laut und voller Energie, während Isander gelassen und sanft reagiert.';
const t = {
  seg1_narrator: 'Am großen Teich ging es drunter und drüber. Überall flitzten Enten hin und her, quatschten laut und machten riesige Wellen. Isander aber schwamm ganz gemächlich. Sie liebte die Stille unter den Trauerweiden. Plötzlich sah sie etwas Blaues im Sand funkeln. Es war eine wunderschöne Glasmurmel! Isander stieß ein leises Freudenquaken aus und versteckte den Schatz behutsam in ihrem geheimen Nest zwischen den Schilfhalmen.\n\nPlötzlich schoss Turbosahne wie ein kleiner, grüner Blitz an ihr vorbei. Er wirbelte das Wasser auf, bis Isanders Federn wackelten. Turbosahne bremste quietschend ab und sah sie spöttisch an.',
  seg2_turbosahne: '[shouting] Komm schon, Isander! Beweg dich endlich, du lahme Ente!',
  seg2_narrator: ', rief er und spritzte mit den Flügeln. Isander sah ihn nur ruhig an.',
  seg3_isander: 'Ich habe es nicht eilig',
  seg3_narrator: ', antwortete sie sanft. Turbosahne schüttelte den Kopf.',
  seg4_turbosahne: 'Wer langsam ist, verpasst das Leben! Ich fordere dich heraus! Morgen ein Wettrennen rund um den Teich! Wer zuerst am alten Baum ist, gewinnt!',
  seg4_narrator: ' Isander lächelte nur und betrachtete ihre glitzernde Murmel.',
};
const req: SynthesizeDialogRequest = {
  speakers: SPEAKERS,
  segments: [
    { stylePrompt: STYLE_SEG1, turns: [{ speaker: 'Narrator', text: t.seg1_narrator }] },
    { stylePrompt: STYLE_CONTRAST, turns: [
      { speaker: 'Turbosahne', text: t.seg2_turbosahne },
      { speaker: 'Narrator', text: t.seg2_narrator }] },
    { stylePrompt: STYLE_CONTRAST, turns: [
      { speaker: 'Isander', text: t.seg3_isander },
      { speaker: 'Narrator', text: t.seg3_narrator }] },
    { stylePrompt: STYLE_CONTRAST, turns: [
      { speaker: 'Turbosahne', text: t.seg4_turbosahne },
      { speaker: 'Narrator', text: t.seg4_narrator }] },
  ],
  voice: { languageCode: 'de-DE' },
  audio: { format: 'mp3' },
  providerOptions: { model: 'gemini-3.1-flash-tts-preview', temperature: 1.0 },
};
const dir = path.join(os.tmpdir(), 'scribomate-dialog-tts-debug');
fs.mkdirSync(dir, { recursive: true });
const p = path.join(dir, `script-raw-reference.json`);
fs.writeFileSync(p, JSON.stringify(req, null, 2), 'utf-8');
console.log(p);

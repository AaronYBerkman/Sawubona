// Explicit release inputs: never copy research videos, checkpoints or private notes.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
function tree(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => e.isDirectory() ? tree(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
}
export const RUNTIME_FILES = [
  'index.html', 'sentences.html', 'review.html', 'manifest.webmanifest', 'sw.js', ...tree('src'), ...tree('assets'),
  'data/signs.json', 'data/signs.bin',
  'data/signclip.bin', 'data/signclip-mirror.bin',
  'data/signclip-asl3.bin', 'data/signclip-asl3-mirror.bin',
  'data/replay.json', ...tree('data/replay'),
  'data/letter-model.json', 'data/lessons.json', 'data/clip-review.json', 'data/clip-audit.json',
  ...['wlasl_slgcn', 'lsa64_slgcn', 'gsl_slgcn', 'signclip', 'signclip-asl3']
    .map((name) => `models/onnx/${name}.onnx`),
];

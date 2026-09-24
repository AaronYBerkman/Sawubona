import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT, RUNTIME_FILES } from './runtime-files.mjs';

const output = join(ROOT, 'dist', 'site');
// Check every input before replacing the previous build.
const sizes = RUNTIME_FILES.map((file) => ({ file, bytes: statSync(join(ROOT, file)).size }));
for (const { file, bytes } of sizes) {
  if (bytes >= 100 * 1024 ** 2) throw new Error(`GitHub file limit exceeded: ${file}`);
}
const bytes = sizes.reduce((sum, item) => sum + item.bytes, 0);
if (bytes >= 1024 ** 3) throw new Error('Site exceeds the GitHub Pages 1 GiB limit');
rmSync(output, { recursive: true, force: true });
for (const file of RUNTIME_FILES) {
  mkdirSync(dirname(join(output, file)), { recursive: true });
  cpSync(join(ROOT, file), join(output, file));
}
// The offline cache keeps each file under its content hash (sw.js).
const hashes = Object.fromEntries(RUNTIME_FILES.filter((f) => f !== 'sw.js').map((file) =>
  [file, createHash('sha256').update(readFileSync(join(ROOT, file))).digest('hex').slice(0, 16)]));
const version = createHash('sha256').update(JSON.stringify(hashes)).digest('hex').slice(0, 12);
const worker = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const placeholder = "const BUILD = { version: 'dev', files: {} };";
if (!worker.includes(placeholder)) throw new Error('sw.js: BUILD placeholder not found');
writeFileSync(join(output, 'sw.js'), worker.replace(placeholder, `const BUILD = ${JSON.stringify({ version, files: hashes })};`));
writeFileSync(join(output, '.nojekyll'), '');
writeFileSync(join(output, 'build-manifest.json'), JSON.stringify({ bytes, files: sizes }, null, 2));
console.log(`GitHub Pages build ${version}: ${RUNTIME_FILES.length} files, ${(bytes / 1024 ** 2).toFixed(1)} MiB in dist/site`);

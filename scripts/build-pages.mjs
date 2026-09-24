import { cpSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
writeFileSync(join(output, '.nojekyll'), '');
writeFileSync(join(output, 'build-manifest.json'), JSON.stringify({ bytes, files: sizes }, null, 2));
console.log(`GitHub Pages build: ${RUNTIME_FILES.length} files, ${(bytes / 1024 ** 2).toFixed(1)} MiB in dist/site`);

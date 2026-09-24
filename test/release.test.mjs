import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { ROOT, RUNTIME_FILES } from '../scripts/runtime-files.mjs';

const files = new Set(RUNTIME_FILES);
for (const file of files) assert.ok(existsSync(join(ROOT, file)), file);
// Both static imports and lazy imports must survive a release, including Sentences.
for (const file of files) {
  if (!file.endsWith('.js')) continue;
  const source = readFileSync(join(ROOT, file), 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*)['"]([.][^'"]+)['"]/g)) {
    const target = normalize(join(dirname(file), match[1]));
    assert.ok(files.has(target), `${file} imports an unpackaged file: ${target}`);
  }
}
for (const page of ['index.html', 'sentences.html', 'review.html']) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = match[1];
    if (/^(?:https?:|data:|#)/.test(url)) continue;
    assert.ok(!url.startsWith('/'), `Root-relative URL breaks project Pages: ${url}`);
    const target = normalize(join(dirname(page), url.split('#')[0]));
    assert.ok(files.has(target), `${page} references an unpackaged file: ${target}`);
  }
}
assert.ok(!RUNTIME_FILES.some((f) => /(?:calibration|external|handpoints|holistic-v|\.mp4$|fp32)/.test(f)),
  'Research inputs do not belong in a public build');
console.log('release: imports, page assets and public file boundaries pass');

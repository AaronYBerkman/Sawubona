import assert from 'node:assert/strict';

const fetched = [];
const originalFetch = globalThis.fetch;
const index = { count: 1, dim: 768, entries: [{ label: 'HELLO', file: 'HELLO [1].mp4' }] };
globalThis.fetch = async (url) => {
  fetched.push(String(url));
  if (String(url).endsWith('signs.json')) {
    return { ok: true, json: async () => index };
  }
  return { ok: true, arrayBuffer: async () => new Float32Array(768).buffer };
};

try {
  const { loadReference } = await import('../src/reference.js?lazy-load-test');
  const metadata = await loadReference();
  assert.deepEqual(fetched, ['data/signs.json'], 'opening the app fetches only dictionary metadata');
  assert.deepEqual(metadata.labels, ['HELLO']);
  assert.equal(metadata.openhands, undefined);

  const ready = await loadReference({ vectors: true });
  assert.ok(fetched.includes('data/signs.bin'), 'recognition loads OpenHands references on demand');
  assert.ok(fetched.includes('data/signclip.bin'), 'recognition loads SignCLIP references on demand');
  assert.ok(ready.openhands && ready.signclip && ready.mirror);
  const count = fetched.length;
  await loadReference({ vectors: true });
  assert.equal(fetched.length, count, 'recognition vectors load only once');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('reference loading: dictionary first, recognition vectors on demand');

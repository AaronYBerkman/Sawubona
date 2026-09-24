// The gallery: ranking that fuses every model it has, one row per sign, and
// the replay's shards loading on demand. Synthetic data, so it runs anywhere.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { setReference, rankSigns, nidId, nidUrl, sourceOf, realSaslId } from '../src/reference.js';
import { joinUnit, unit } from '../src/encoder.js';
import { Replay } from '../src/replay-data.js';

// --- ids and sources ---------------------------------------------------------------

assert.equal(realSaslId('ABOUT [846].mp4'), 846);
assert.equal(realSaslId('MOTHER [nid9303].mp4'), null, 'an NID id is not a Real SASL id');
assert.equal(nidId('AIR CONDITIONER, AC [nid25843].mp4'), 25843);
assert.equal(sourceOf('MOTHER [nid9303].mp4'), 'nid');
assert.equal(sourceOf('MOTHER [12].mp4'), 'realsasl');
assert.equal(nidUrl('MOTHER'), null, 'no NID page address is known, so none is made up');

// --- ranking -----------------------------------------------------------------------

const D = 768;
const basis = (k, sign = 1) => { const v = new Float32Array(D); v[k] = sign; return v; };
const bank = (rows) => { const out = new Float32Array(rows.length * D); rows.forEach((r, i) => out.set(r, i * D)); return out; };
// Four clips of three signs; the query is clip 0's sign as far as OpenHands and
// citizen can tell, but asl3 says clip 2 (B) - and asl3 must be able to move it.
const clips = [
  { label: 'A', file: 'A [1].mp4', source: 'realsasl' },
  { label: 'A', file: 'A [nid5].mp4', source: 'nid' },
  { label: 'B', file: 'B [nid6].mp4', source: 'nid' },
  { label: 'C', file: 'C [3].mp4', source: 'realsasl' },
];
const ref = {
  clips, labels: ['A', 'B', 'C'], dimOpenHands: D,
  openhands: bank([basis(0), basis(1), basis(2), basis(3)]),
  signclip: bank([basis(0), basis(1), basis(2), basis(3)]),
  mirror: bank([basis(4), basis(5), basis(6), basis(7)]),
  asl3: null, asl3Mirror: null,
};
setReference(ref);
const q = unit(Float32Array.from({ length: D }, (_, i) => (i === 0 ? 1 : i === 2 ? 0.9 : 0)));
let ranked = rankSigns({ openhands: q, signclip: q });
assert.deepEqual(ranked.map((r) => r.label), ['A', 'B', 'C'], 'one row per sign, best first');
assert.equal(ranked[0].clip, 'A [1].mp4');
assert.equal(ranked[0].source, 'realsasl');
assert.equal(ranked[1].source, 'nid');
assert.ok(ranked.every((r, i) => r.rank === i));

// The mirrored bank counts: a query that matches only B's mirror still finds B.
const onlyMirror = unit(basis(6));
const sc = rankSigns({ openhands: onlyMirror, signclip: onlyMirror });
assert.equal(sc[0].label, 'B', 'max of plain and mirror');

// asl3: fused when both the embedding and the bank exist, from embedSignCLIP's property too.
ref.asl3 = bank([basis(9), basis(9), basis(2), basis(9)]);
ref.asl3Mirror = bank([basis(9), basis(9), basis(9), basis(9)]);
const a3 = unit(basis(2));
const with3 = rankSigns({ openhands: q, signclip: q, asl3: a3 });
const viaProperty = rankSigns({ openhands: q, signclip: Object.assign(Float32Array.from(q), { asl3: a3 }) });
assert.deepEqual(with3.map((r) => r.label), viaProperty.map((r) => r.label), 'asl3 rides on the SignCLIP embedding');
const scoreOf = (list, l) => list.find((r) => r.label === l).score;
assert.ok(scoreOf(with3, 'B') - scoreOf(with3, 'A') > scoreOf(ranked, 'B') - scoreOf(ranked, 'A'),
  'asl3 moves the ranking toward what it sees');
ref.asl3 = null;
assert.deepEqual(rankSigns({ openhands: q, signclip: q, asl3: a3 }).map((r) => r.score), ranked.map((r) => r.score),
  'without the asl3 bank the ranking is exactly the two-model one');

// joinUnit: blocks normalised, then the whole.
const j = joinUnit([Float32Array.from([3, 4]), Float32Array.from([0, 2])]);
assert.ok(Math.abs(Math.hypot(...j) - 1) < 1e-6);
assert.ok(Math.abs(j[0] - 0.6 / Math.SQRT2) < 1e-6 && Math.abs(j[3] - 1 / Math.SQRT2) < 1e-6);

// --- replay shards -------------------------------------------------------------------

// Two one-frame clips in two shards, each frame just a body (flags bit 0).
const shard = (x) => {
  const buf = new ArrayBuffer(2 + 56 * 2 + 404);
  new Uint8Array(buf, 0, 1)[0] = 1;
  const q16 = new Int16Array(buf, 2, 56);
  q16[22] = x; q16[23] = 0; q16[24] = -x; q16[25] = 0;   // shoulders 11 and 12
  return buf;
};
const info = {
  version: 3, fps: 15, count: 2, totalFrames: 2,
  layout: {},
  scale: { body: 1 / 400, local: 1 / 160, bodyZ: 1e-3, handZ: 1e-3 },
  shards: [0, 1].map((s) => ({ file: `replay/00${s}.bin`, clips: [s, s + 1], frames: 1, layout: { flags: 0, int16: 2, int8: 114 } })),
  clips: [
    { file: 'A [1].mp4', label: 'A', shard: 0, offset: 0, frames: 1 },
    { file: 'B [2].mp4', label: 'B', shard: 1, offset: 0, frames: 1 },
  ],
};
const fetched = [];
const replay = new Replay(info, null, { load: async (s) => { fetched.push(s.file); return shard(s.file.endsWith('0.bin') ? 200 : 400); } });
assert.throws(() => replay.clipFrames('B'), /ready/);
assert.equal(await replay.ready('B'), true);
assert.deepEqual(fetched, ['replay/001.bin'], 'only the shard holding B');
assert.equal(replay.clipFrames('B')[0][11 * 3], 1, '400 steps of 1/400 is one shoulder width');
await Promise.all([replay.ready('A'), replay.ready(['A', 'B'])]);
assert.deepEqual(fetched, ['replay/001.bin', 'replay/000.bin'], 'each shard fetched once');
assert.equal(replay.clipFrames('A')[0][12 * 3], -0.5);

// The built gallery, when there is one, lines up with its embedding files.
const signs = new URL('../data/signs.json', import.meta.url);
if (existsSync(signs)) {
  const idx = JSON.parse(readFileSync(signs));
  for (const f of ['signs.bin', 'signclip.bin', 'signclip-mirror.bin', 'signclip-asl3.bin', 'signclip-asl3-mirror.bin']) {
    const p = new URL(`../data/${f}`, import.meta.url);
    if (existsSync(p)) assert.equal(readFileSync(p).length, idx.count * 768 * 4, `${f} has one row per signs.json entry`);
  }
}
console.log('gallery: ok');

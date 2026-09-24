// The sign replay: the packed reference poses (data/replay.*) and the figure's
// clip preparation, headless. Drawing itself needs a canvas and is checked by
// eye in tools/exp-ui/figure-demo.html.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Replay, displayFrames } from '../src/replay-data.js';
import { prepareClip, fitZScale, handView, VIEW } from '../src/figure.js';
import { FRAME_DIM } from '../src/holistic.js';

const PARTS = [[0, 25], [33, 161], [161, 182], [182, 203]];
const seen = (f, i) => f[i * 3] !== 0 || f[i * 3 + 1] !== 0 || f[i * 3 + 2] !== 0;

// --- the pack ----------------------------------------------------------------

const data = (name) => new URL(`../data/${name}`, import.meta.url);
const json = data('replay.json');
let reference = null;
if (existsSync(json)) {
  const info = JSON.parse(readFileSync(json));
  const inflate = (buf) => {
    const raw = gunzipSync(buf);
    return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  };
  const replay = info.shards
    ? new Replay(info, null, { load: async (shard) => inflate(readFileSync(data(shard.file))) })
    : new Replay(info, inflate(readFileSync(data('replay.bin'))));

  const signs = JSON.parse(readFileSync(data('signs.json')));
  assert.equal(replay.clips.length, signs.entries.length, 'one replay clip per signs.json entry');
  signs.entries.forEach((e, i) => assert.equal(replay.clips[i].file, e.file, `clip ${i} is in signs.json order`));
  if (info.shards) {
    // Sharded so the page fetches a few MB per sign, never the whole gallery.
    assert.ok(readFileSync(json).length < 4e6, 'the index stays small');
    for (const sh of info.shards) {
      assert.ok(readFileSync(data(sh.file)).length < 10e6, `${sh.file} stays under 10 MB`);
    }
    assert.throws(() => replay.clipFrames('HELLO'), /ready/, 'clipFrames asks for ready() before its shard is in');
    assert.equal(await replay.ready(['THANK YOU', 'FRIDAY', 'HELLO']), true);
    assert.equal(await replay.ready('NOT A SIGN'), false);
  } else {
    assert.ok(readFileSync(data('replay.bin')).length < 25e6, 'the pack stays under 25 MB');
  }

  for (const label of ['THANK YOU', 'FRIDAY', 'HELLO']) {
    const frames = replay.clipFrames(label);
    assert.ok(frames && frames.length > 10, `${label} decodes`);
    let cx = 0; let cy = 0; let w = 0; let n = 0;
    for (const f of frames) {
      assert.equal(f.length, FRAME_DIM);
      assert.ok(f.every(Number.isFinite), `${label}: finite values`);
      for (let i = 25; i < 33; i++) assert.ok(!seen(f, i), `${label}: legs dropped`);
      // A part is all there or all missing - never half a hand.
      for (const [lo, hi] of PARTS.slice(1)) {
        let k = 0;
        for (let i = lo; i < hi; i++) k += seen(f, i);
        assert.ok(k === 0 || k === hi - lo, `${label}: a part is whole or absent`);
      }
      if (!seen(f, 11) || !seen(f, 12)) continue;
      cx += (f[33] + f[36]) / 2; cy += (f[34] + f[37]) / 2;
      w += Math.hypot(f[33] - f[36], f[34] - f[37]); n++;
    }
    // Normalised like normaliseClip: centred on the mean shoulder midpoint,
    // one unit the mean shoulder width (smoothing and resampling blur it a hair).
    assert.ok(Math.abs(cx / n) < 0.05 && Math.abs(cy / n) < 0.05, `${label}: centred on the shoulders`);
    assert.ok(Math.abs(w / n - 1) < 0.05, `${label}: one shoulder width is one unit`);
  }
  assert.ok(replay.variants('HELLO').length >= 1);
  assert.equal(replay.indexOf('NOT A SIGN'), -1);
  reference = replay.clipFrames('HELLO');
} else {
  console.log('replay: data/replay.json not built (python tools/pack-replay.py) - pack checks skipped');
}

// --- a learner's attempt in pixels ------------------------------------------------

/** A synthetic attempt: shoulders 200 px apart, a hand that rises and drops out. */
function attempt(T = 40) {
  const frames = [];
  for (let t = 0; t < T; t++) {
    const f = new Float32Array(FRAME_DIM);
    const put = (i, x, y, z = -0.1) => { f[i * 3] = x; f[i * 3 + 1] = y; f[i * 3 + 2] = z; };
    put(11, 420, 400); put(12, 220, 400);           // the subject's left shoulder is on the image right
    put(13, 460, 520); put(14, 180, 520);
    const lift = Math.sin((t / (T - 1)) * Math.PI);
    put(15, 440, 620 - 260 * lift); put(16, 170, 640);
    for (let i = 0; i < 11; i++) put(i, 320 + (i - 5) * 6, 250 + i);
    for (let i = 17; i < 25; i++) put(i, 300, 700);
    for (let k = 33; k < 161; k++) put(k, 320 + 40 * Math.cos(k), 260 + 50 * Math.sin(k), 0);
    if (t % 7 !== 3) {                                // the tracker loses the hand now and then
      for (let j = 0; j < 21; j++) put(161 + j, 440 + (j % 5) * 8, 610 - 260 * lift - Math.floor(j / 5) * 12, -0.004 * (j % 4));
    }
    frames.push(f);
  }
  return frames;
}

const px = attempt();
const shown = displayFrames(px);
assert.equal(shown.length, px.length);
assert.ok(Math.abs(shown[0][33] - 0.5) < 0.02 && Math.abs(shown[0][36] + 0.5) < 0.02,
  'an attempt in pixels lands in shoulder-width units');

const clip = prepareClip(px, { fps: 25 });
assert.equal(clip.frames.length, px.length);
for (let t = 0; t < clip.frames.length; t++) {
  for (let k = 0; k < 4; k++) {
    const a = clip.alpha[t * 4 + k];
    assert.ok(a >= 0 && a <= 1, 'opacity in [0, 1]');
    if (a <= 0) continue;
    // Whatever is drawn has somewhere real to be drawn: never the origin.
    const [lo, hi] = PARTS[k];
    for (let i = lo; i < hi; i++) {
      if (k === 0 && i > 16) continue;
      assert.ok(seen(clip.frames[t], i), `frame ${t}: a visible part has no point at the origin`);
    }
  }
}
// The dropped hand frames are filled (short gaps) - no flicker to nothing.
assert.ok([3, 10, 17].every((t) => clip.alpha[t * 4 + 2] > 0.9), 'short hand dropouts are bridged');
assert.ok(clip.handSize[0] > 0.05 && clip.handSize[0] < 1, 'a plausible palm size');

// A hand the tracker put far from its own arm is not the signer's hand.
const stray = attempt(12).map((f) => {
  const o = f.slice();
  for (let j = 0; j < 21; j++) { o[(182 + j) * 3] = 900; o[(182 + j) * 3 + 1] = 100; o[(182 + j) * 3 + 2] = 0; }
  return o;
});
const strayClip = prepareClip(stray, { fps: 25 });
assert.ok(strayClip.alpha.every((a, i) => i % 4 !== 3 || a === 0), 'a hand far from its wrist is dropped');

// Shoulders never seen: framed by the face instead of vanishing.
const noShoulders = attempt(12).map((f) => { const o = f.slice(); o.fill(0, 0, 33 * 3); return o; });
const faceOnly = prepareClip(noShoulders, { fps: 25 });
assert.ok(faceOnly.alpha[1] === 1 && seen(faceOnly.frames[0], 40), 'no shoulders: the face still shows');
assert.ok(Math.abs(faceOnly.frames[0][40 * 3]) < 1.5, 'no shoulders: the face is framed');

assert.equal(prepareClip([]).frames.length, 0, 'an empty attempt is empty, not an error');

// The reference and the same sign as pixels come out alike.
if (reference) {
  const asPixels = reference.map((f) => {
    const o = new Float32Array(FRAME_DIM);
    for (let i = 0; i < 203; i++) {
      if (!seen(f, i)) continue;
      o[i * 3] = 640 + f[i * 3] * 230; o[i * 3 + 1] = 380 + f[i * 3 + 1] * 230; o[i * 3 + 2] = f[i * 3 + 2];
    }
    return o;
  });
  const a = prepareClip(reference, { fps: 15 });
  const b = prepareClip(asPixels, { fps: 15 });
  let worst = 0;
  for (let t = 0; t < a.frames.length; t++) {
    for (let i = 33; i < 161; i++) worst = Math.max(worst, Math.abs(a.frames[t][i * 3] - b.frames[t][i * 3]));
  }
  assert.ok(worst < 0.05, `a reference and the same sign in pixels draw alike (face ${worst.toFixed(3)})`);
  const z = fitZScale(reference);
  assert.ok(z > 300 && z < 12000, 'z proportion fitted from the palm');
}

console.log('replay: ok');

// Close-up contains the complete active hand extent and leaves inputs unchanged.
const closeFrame = new Float32Array(FRAME_DIM);
for (let j = 0; j < 21; j++) { closeFrame[(161 + j) * 3] = -0.3 + j * 0.03; closeFrame[(161 + j) * 3 + 1] = 0.2; }
const beforeClose = closeFrame.slice();
const close = handView([closeFrame]);
assert.ok(close.w < VIEW.w);
for (let j = 0; j < 21; j++) assert.ok(Math.abs(closeFrame[(161 + j) * 3] - close.cx) < close.w / 2);
assert.deepEqual(closeFrame, beforeClose);
assert.deepEqual(handView([]), VIEW);

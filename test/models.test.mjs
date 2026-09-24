// The browser ports of the offline models, checked against fixtures the Python
// side wrote. A port that only agrees with itself proves nothing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setLetterModel, letterFeatures, letterLogProbs, letterNames } from '../src/letters.js';
import { holisticFrame, normaliseClip, resample, FRAME_DIM } from '../src/holistic.js';

const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const pt = ([x, y, z]) => ({ x, y, z });

// --- Letters (tools/letters.py) --------------------------------------------

setLetterModel(json('../data/letter-model.json'));
const letters = json('./fixtures/letters.json');
let worstFeature = 0;
let worstLogp = 0;
for (const f of letters.frames) {
  const feats = letterFeatures(f.img.map(pt), f.world.map(pt), letters.aspect);
  feats.forEach((v, i) => { worstFeature = Math.max(worstFeature, Math.abs(v - f.features[i])); });
  const lp = letterLogProbs(feats);
  lp.forEach((v, i) => { worstLogp = Math.max(worstLogp, Math.abs(v - f.logp[i])); });
  const best = lp.indexOf(Math.max(...lp));
  assert.equal(letterNames()[best], f.letter, `fixture frame should read ${f.letter}`);
}
assert.ok(worstFeature < 1e-4, `letter features match Python (worst ${worstFeature})`);
assert.ok(worstLogp < 1e-3, `letter log-probs match Python (worst ${worstLogp})`);
assert.ok(!letterNames().includes('J') && !letterNames().includes('Z'), 'J and Z are movements');
assert.ok(letterNames().includes('Y'), 'SASL Y is thumb-and-pinky, a static shape');
console.log(`letters: ${letters.frames.length} frames match Python `
  + `(features ${worstFeature.toExponential(1)}, log-probs ${worstLogp.toExponential(1)})`);

// --- SignCLIP input (tools/holistic.py, tools/signclip.py) -----------------


const hol = json('./fixtures/holistic.json');
hol.frames.forEach((f, k) => {
  const handResult = {
    landmarks: f.hands.map((h) => h.map(pt)),
    handedness: f.handedness.map((c) => [{ categoryName: c }]),
  };
  const poseResult = { landmarks: f.pose.map((p) => p.map(pt)) };
  const faceResult = { faceLandmarks: [f.face.map(pt)] };
  const got = holisticFrame(handResult, poseResult, faceResult, hol.width, hol.height);
  const want = f.expected.flat();
  let worst = 0;
  for (let i = 0; i < FRAME_DIM; i++) worst = Math.max(worst, Math.abs(got[i] - want[i]) / (Math.abs(want[i]) + 1));
  assert.ok(worst < 1e-5, `holistic frame ${k} matches Python (worst ${worst})`);
});

const clip = hol.clip.map((f) => Float32Array.from(f.flat()));
const norm = normaliseClip(clip);
const wantNorm = hol.normalised.flat();
let worstNorm = 0;
for (let i = 0; i < norm.length; i++) worstNorm = Math.max(worstNorm, Math.abs(norm[i] - wantNorm[i]));
assert.ok(worstNorm < 1e-4, `clip normalisation matches Python (worst ${worstNorm})`);

// 15 fps for two seconds becomes 25 fps for two seconds, frames in order.
const slow = Array.from({ length: 31 }, (_, i) => i);
const times = slow.map((i) => 1000 + (i * 1000) / 15);
const steady = resample(slow, times, 25);
assert.equal(steady.length, 51);
assert.equal(steady[0], 0);
assert.equal(steady[steady.length - 1], 30);
assert.ok(steady.every((v, i) => i === 0 || v >= steady[i - 1]), 'resampling keeps order');
console.log(`holistic: ${hol.frames.length} frames and a ${clip.length}-frame clip match Python `
  + `(normalised ${worstNorm.toExponential(1)})`);

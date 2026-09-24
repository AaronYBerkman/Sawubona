// Headless sanity checks for the parts that do not need a camera.
import assert from 'node:assert/strict';
import { DIM, SEQ_LEN, buildSequence, frameVector, hasHands } from '../src/features.js';
import { findSegments, splitIntoSigns, motionEnergy } from '../src/segment.js';
import { hand, handResult } from './hand-fixture.mjs';

// --- Synthetic landmark helpers -------------------------------------------

const frame = { ox: 0.5, oy: 0.5, oz: 0, scale: 0.25 };

/** A recording: hand travels from (x0,y0) to (x1,y1) over n frames, with jitter. */
function recording({ x0, y0, x1, y1, curl = 0, n = 20, jitter = 0 }) {
  const frames = [];
  const r = (m) => (Math.random() - 0.5) * m;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    frames.push(
      frameVector(
        handResult([hand(x0 + (x1 - x0) * t + r(jitter), y0 + (y1 - y0) * t + r(jitter), curl)], ['Right']),
        frame,
      ),
    );
  }
  return buildSequence(frames);
}

// --- Features --------------------------------------------------------------

const empty = frameVector({ landmarks: [], handedness: [] }, frame);
assert.equal(empty.length, DIM);
assert.equal(hasHands(empty), false, 'no hands -> zero vector');

const withHand = frameVector(handResult([hand(0.5, 0.4)], ['Right']), frame);
assert.equal(hasHands(withHand), true);

const seq = recording({ x0: 0.4, y0: 0.5, x1: 0.6, y1: 0.3 });
assert.equal(seq.length, SEQ_LEN * DIM, 'sequences resample to a fixed length');

// Silent lead-in and tail are trimmed away.
const padded = buildSequence([empty, empty, ...Array(10).fill(withHand), empty]);
assert.ok(padded, 'padding alone does not kill a recording');
assert.equal(buildSequence([empty, empty, empty]), null, 'all-silent recording is rejected');

// --- Segmenting a phrase ---------------------------------------------------

// Build a phrase: a sign, hands dropped, another sign, hands dropped, a third.
function phrase() {
  const still = frameVector({ landmarks: [], handedness: [] }, frame);
  const moving = (x0, y0, x1, y1, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      out.push(frameVector(
        handResult([hand(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)], ['Right']), frame));
    }
    return out;
  };
  return [
    ...Array(4).fill(still),
    ...moving(0.4, 0.5, 0.6, 0.35, 14),
    ...Array(6).fill(still),
    ...moving(0.7, 0.3, 0.4, 0.55, 14),
    ...Array(6).fill(still),
    ...moving(0.5, 0.6, 0.55, 0.25, 14),
    ...Array(4).fill(still),
  ];
}

const p = phrase();
const segments = findSegments(p);
assert.equal(segments.length, 3, `three signs should be found, got ${segments.length}`);
assert.ok(segments.every((s) => s.end > s.start), 'segments are non-empty');
for (let i = 1; i < segments.length; i++) {
  assert.ok(segments[i].start >= segments[i - 1].end, 'segments do not overlap');
}

// Each segment becomes a sequence the matcher can take directly.
const signs = splitIntoSigns(p);
assert.equal(signs.length, 3);
assert.ok(signs.every((s) => s.sequence.length === SEQ_LEN * DIM),
  'each segment resamples to a matchable sequence');

// A single sign is one segment, not three.
assert.equal(findSegments(p.slice(4, 18)).length, 1,
  'one continuous sign is one segment, not several');

// Stillness alone yields nothing.
const silence = Array(30).fill(frameVector({ landmarks: [], handedness: [] }, frame));
assert.equal(findSegments(silence).length, 0, 'an empty recording has no signs');
assert.equal(motionEnergy(silence).every((e) => e === 0), true, 'no motion in stillness');

// --- Keypoint tensor: the JS port must agree with the Python one ------------
//
// src/keypoints.js and tools/embed.py build the same tensor for the pretrained
// encoders, and the encoder weights are fixed, so a disagreement is not a small
// error - a point in the wrong slot is a different graph node. Every costly bug
// in this project so far has been two implementations drifting apart, so this
// pins them together.
{
  const { readFileSync } = await import('node:fs');
  const { toTensor } = await import('../src/keypoints.js');

  const fixture = JSON.parse(readFileSync(new URL('./fixtures/keypoints.json', import.meta.url)));
  const { data, dims } = toTensor(fixture.frames.map((f) => Float32Array.from(f)));

  assert.equal(dims.slice(1).join('x'), fixture.dims.join('x'),
    'keypoint tensor has the shape Python produced');

  let worst = 0;
  for (let i = 0; i < data.length; i++) {
    worst = Math.max(worst, Math.abs(data[i] - fixture.tensor[i]));
  }
  assert.ok(worst < 1e-4,
    `keypoint tensor matches Python (largest difference ${worst.toExponential(2)})`);
}

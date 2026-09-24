import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pointsFromHolistic, framePoints } from '../src/keypoints.js';
import { holisticFrame, resample } from '../src/holistic.js';
import { createAutoCapture } from '../src/auto-capture.js';
import { DIM } from '../src/features.js';
import { findSegments } from '../src/segment.js';

// The independent Python fixture includes contradictory hand labels. Compare
// live input with the exact conversion used to embed the reference gallery.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/holistic.json', import.meta.url)));
const pt = ([x, y, z]) => ({ x, y, z });
let corrected = 0;
for (const f of fixture.frames) {
  const hands = { landmarks: f.hands.map((h) => h.map(pt)), handedness: f.handedness.map((name) => [{ categoryName: name }]) };
  const pose = { landmarks: f.pose.map((p) => p.map(pt)) };
  const live = holisticFrame(hands, pose, { faceLandmarks: [f.face.map(pt)] }, fixture.width, fixture.height);
  const landmarks = [], handedness = [];
  const point = (i) => ({ x: f.expected[i][0] / fixture.width, y: f.expected[i][1] / fixture.height });
  for (const [offset, label] of [[161, 'Left'], [182, 'Right']]) {
    if (!f.expected[offset].some(Boolean)) continue;
    landmarks.push(Array.from({ length: 21 }, (_, i) => point(offset + i)));
    handedness.push([{ categoryName: label }]);
  }
  const reference = framePoints({ landmarks, handedness }, { landmarks: f.pose.length ? [Array.from({ length: 33 }, (_, i) => point(i))] : [] });
  const input = pointsFromHolistic(live, fixture.width, fixture.height);
  input.forEach((x, i) => assert.ok(Math.abs(x - reference[i]) < 1e-6));
  if (framePoints(hands, pose).some((x, i) => Math.abs(x - reference[i]) > 1e-4)) corrected++;
}
assert.ok(corrected > 0, 'the fixture must exercise the old live/gallery mismatch');

const frames = Array.from({ length: 181 }, (_, i) => i);
const times = frames.map((i) => i * 1000 / 30);
const capped = resample(frames, times, 27, 128);
assert.equal(capped.length, 128);
assert.equal(capped[0], 0);
assert.equal(capped.at(-1), 180, 'a six-second sign keeps its final movement');
assert.ok(capped.every((x, i) => !i || x >= capped[i - 1]));

for (const fps of [6, 10, 15, 30, 60]) {
  const times = Array.from({ length: Math.ceil(6 * fps) }, (_, i) => i * 1000 / fps);
  const windows = [[300, 1600], [2200, 3500], [4100, 5400]];
  const vectors = times.map((t) => {
    const frame = new Float32Array(DIM);
    const window = windows.find(([a, b]) => t >= a && t < b);
    if (window) { frame[0] = 1; frame[1] = (t - window[0]) / 1000; }
    return frame;
  });
  const segments = findSegments(vectors, { times });
  assert.equal(segments.length, 3, `${fps} fps preserves three separated signs`);
  segments.forEach((s, i) => {
    assert.ok(Math.abs(times[s.start] - windows[i][0]) < 250);
    assert.ok(Math.abs(times[s.end - 1] - windows[i][1]) < 250);
  });
}

const gate = createAutoCapture();
assert.equal(gate.observe(true, 0), false);
assert.equal(gate.observe(true, 250), true, 'starts without a click');
assert.equal(gate.observe(true, 1000), false, 'a held sign never starts another attempt');
gate.finish(false);
assert.equal(gate.observe(true, 3000), false, 'timeout does not repeatedly capture a held sign');
gate.observe(false, 3100);
assert.equal(gate.observe(true, 3200), false);
assert.equal(gate.observe(true, 3450), true, 'resting rearms the next attempt');
gate.finish(true);
assert.equal(gate.observe(true, 4000), false);
assert.equal(gate.observe(true, 4250), true, 'automatic hands-down completion rearms');
console.log(`capture: ${corrected} fixture hand-slot mismatches corrected; full-duration inputs, 6–60 fps boundaries and automatic capture pass`);

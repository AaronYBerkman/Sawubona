// J and Z (src/motion-letters.js) on synthetic hands: the letters drawn either
// way round must be read, and the movements that are not letters must not be.
import assert from 'node:assert/strict';
import { createMotionReader, motionShape, drawsJ, drawsZ } from '../src/motion-letters.js';
import { wantsExtraViews } from '../src/device.js';

// A right hand in world metres, fingers up (y negative is up): straight
// fingers reach past their middle joint, curled ones fold back towards the palm.
function hand(up) {
  const pts = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  pts[1] = { x: -0.03, y: -0.02, z: 0 }; pts[2] = { x: -0.045, y: -0.04, z: 0 };
  pts[3] = { x: -0.05, y: -0.055, z: 0.01 }; pts[4] = { x: -0.045, y: -0.065, z: 0.02 };
  const fingers = { index: [5, -0.02], middle: [9, 0], ring: [13, 0.02], little: [17, 0.037] };
  for (const [name, [k, x]] of Object.entries(fingers)) {
    pts[k] = { x, y: -0.08, z: 0 };
    if (up.includes(name)) {
      pts[k + 1] = { x, y: -0.11, z: 0 }; pts[k + 2] = { x, y: -0.125, z: 0 }; pts[k + 3] = { x, y: -0.14, z: 0 };
    } else {
      pts[k + 1] = { x, y: -0.095, z: -0.02 }; pts[k + 2] = { x, y: -0.085, z: -0.025 }; pts[k + 3] = { x, y: -0.075, z: -0.015 };
    }
  }
  return pts;
}
const I_HAND = hand(['little']);
const ONE_HAND = hand(['index']);
const OPEN = hand(['index', 'middle', 'ring', 'little']);
const FIST = hand([]);

// Image landmarks: the same hand, placed at (ox, oy) in units of its own size.
const SIZE = 0.24;              // wrist to middle knuckle in the image
function frame(world, ox, oy, t, seed) {
  const jitter = (k) => (Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453 % 1) * 0.004;
  const img = world.map((p, k) => ({ x: 0.5 + p.x * 3 + ox * SIZE + jitter(k), y: 0.6 + p.y * 3 + oy * SIZE + jitter(k + 21), z: 0 }));
  return { t, img, world, aspect: 1 };
}
/** Play a path of [dx, dy] steps (hand sizes) at 30 frames a second; the letters read. */
function play(world, steps, { hold = 6 } = {}) {
  const reader = createMotionReader();
  const read = [];
  let x = 0; let y = 0; let t = 0; let n = 0;
  const at = () => { const r = reader.push(frame(world, x, y, t, n++)); if (r) read.push(r.letter); t += 33; };
  for (let i = 0; i < hold; i++) at();
  for (const [dx, dy, count] of steps) for (let i = 0; i < count; i++) { x += dx / count; y += dy / count; at(); }
  for (let i = 0; i < 6; i++) at();
  return read;
}

assert.equal(motionShape(I_HAND), 'J');
assert.equal(motionShape(ONE_HAND), 'Z');
assert.equal(motionShape(OPEN), null);
assert.equal(motionShape(FIST), null);

// J: down, then the hook, either way round (right hand, left hand, mirrored view)
assert.deepEqual(play(I_HAND, [[0.05, 0.8, 12], [0.4, 0.1, 8]]), ['J']);
assert.deepEqual(play(I_HAND, [[-0.05, 0.8, 12], [-0.4, 0.1, 8]]), ['J']);
assert.deepEqual(play(I_HAND, [[0, 0.7, 10], [0.3, -0.15, 6]]), ['J']);
// not J: holding I still, sliding it sideways, or a shape that is not I
assert.deepEqual(play(I_HAND, [], { hold: 60 }), []);
assert.deepEqual(play(I_HAND, [[1.2, 0.1, 20]]), []);
assert.deepEqual(play(OPEN, [[0.05, 0.8, 12], [0.4, 0.1, 8]]), []);

// Z: across, back down the diagonal, across again - either way round
const Z = [[0.8, 0, 10], [-0.8, 0.7, 10], [0.8, 0, 10]];
assert.deepEqual(play(ONE_HAND, Z), ['Z']);
assert.deepEqual(play(ONE_HAND, Z.map(([dx, dy, n]) => [-dx, dy, n])), ['Z']);
// not Z: a horizontal wave, pointing downwards, a sideways line, or an open hand
assert.deepEqual(play(ONE_HAND, [[0.8, 0, 8], [-0.8, 0, 8], [0.8, 0, 8], [-0.8, 0, 8]]), []);
assert.deepEqual(play(ONE_HAND, [[0, 1.2, 15]]), []);
assert.deepEqual(play(ONE_HAND, [[1.2, 0, 15]]), []);
assert.deepEqual(play(OPEN, Z), []);
// a Z drawn once is read once
assert.deepEqual(play(ONE_HAND, [...Z, [0, 0, 20]]), ['Z']);

// the path tests on their own
assert.ok(drawsJ([{ x: 0, y: 0 }, { x: 0, y: 0.3 }, { x: 0, y: 0.6 }, { x: 0.3, y: 0.6 }]));
assert.ok(!drawsJ([{ x: 0, y: 0 }, { x: 0.5, y: 0.2 }, { x: 1, y: 0.4 }, { x: 1.5, y: 0.6 }]));
assert.ok(!drawsZ([{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 }]));

// Phones leave out the second SignCLIP view; ?full and ?light override
const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148', maxTouchPoints: 5 };
const ipad = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', maxTouchPoints: 5 };
const mac = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', maxTouchPoints: 0 };
const smallPc = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', deviceMemory: 2 };
const bigAndroid = { userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/130 Mobile', deviceMemory: 8 };
assert.equal(wantsExtraViews(iphone, ''), false);
assert.equal(wantsExtraViews(ipad, ''), false);
assert.equal(wantsExtraViews(mac, ''), true);
assert.equal(wantsExtraViews(smallPc, ''), false);
assert.equal(wantsExtraViews(bigAndroid, ''), true);
assert.equal(wantsExtraViews(iphone, '?full'), true);
assert.equal(wantsExtraViews(mac, '?light'), false);

console.log('motion letters and device: ok');

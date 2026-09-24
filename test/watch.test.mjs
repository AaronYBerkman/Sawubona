// Watch and Compare (src/watch.js): a learner's recording at the pack's rate,
// and one clock that stretches every figure to the reference's length.
// The drawing itself needs a canvas; stand-in players record what they are told.
import assert from 'node:assert/strict';
import { attemptClip, createStage, DISPLAY_FPS } from '../src/watch.js';

// --- a recording -> steady frames ----------------------------------------------

const times = [];
const frames = [];
for (let t = 0; t <= 2000; t += 1000 / 27 + (t % 3)) {   // an uneven ~27 fps capture
  times.push(t);
  frames.push(new Float32Array(609).fill(times.length));
}
const clip = attemptClip(frames, times);
assert.equal(clip.fps, DISPLAY_FPS);
assert.ok(Math.abs(clip.frames.length - (Math.round((times.at(-1) / 1000) * DISPLAY_FPS) + 1)) <= 1,
  'a 2 s recording becomes about 31 frames at 15 a second');
assert.equal(attemptClip([], []), null, 'nothing recorded, nothing to compare');

// --- one clock, two lengths -------------------------------------------------------

const queue = [];
globalThis.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
globalThis.cancelAnimationFrame = () => {};

function standIn(duration) {
  return () => {
    const p = { duration, at: 0, mirror: null, destroyed: false };
    return {
      get duration() { return p.duration; },
      seek(s) { p.at = s; },
      setMirror(m) { p.mirror = m; },
      redraw() {},
      destroy() { p.destroyed = true; },
      p,
    };
  };
}
const made = [];
const durations = [2, 3.2];               // the reference, then a slower try
const stage = createStage([{}, {}], [{ frames: [], fps: 15 }, { frames: [], fps: 15 }], {
  makePlayer: (...args) => { const pl = standIn(durations[made.length])(...args); made.push(pl); return pl; },
});
assert.equal(stage.duration, 2, 'the reference sets the length');
stage.seek(0.5);
assert.equal(made[0].p.at, 1, 'halfway through the reference');
assert.ok(Math.abs(made[1].p.at - 1.6) < 1e-9, 'and halfway through the try, stretched to match');

stage.setMirror(0, true);
assert.equal(made[0].p.mirror, true);
assert.equal(made[1].p.mirror, null, 'the left-handed mirror flips the reference only');

// Play at half speed: 4 s of wall time to reach the end, both together.
stage.seek(0);
stage.setSpeed(0.5);
stage.play();
let now = 0;
while (queue.length && now < 3900) { now += 50; queue.shift()(now); }
assert.ok(stage.progress > 0.9 && stage.progress < 1, `3.9 s at half speed is near the end (${stage.progress})`);
while (queue.length && now < 4200) { now += 50; queue.shift()(now); }
assert.equal(made[0].p.at, 2, 'the reference ends…');
assert.ok(Math.abs(made[1].p.at - 3.2) < 1e-9, '…with the try');
stage.destroy();
assert.ok(made.every((m) => m.p.destroyed));

console.log('watch: ok');

// J and Z: the two letters that are movements, not held shapes.
//
//   J  the I hand (little finger up, the others closed) draws a J: the
//      fingertip goes down, then hooks to the side.
//   Z  the index finger alone draws a Z: across, back and down on the
//      diagonal, then across again.
//
// The held-shape classifier (src/letters.js) cannot see either, so this
// watches the fingertip's path instead. The hand shape is read from the 3D
// world landmarks (a finger is straight and reaches past its middle joint), so
// it survives the wrist turning; the path is read from the image, in units of
// the hand's own size, so it does not matter how far the signer stands from the
// camera. Left hands and the mirrored selfie view draw the same letters in the
// other direction, so only the pattern of the strokes is checked, not which way
// they go.

const FINGERS = {                // [knuckle, middle joint, tip]
  index: [5, 6, 8], middle: [9, 10, 12], ring: [13, 14, 16], little: [17, 18, 20],
};
const SHAPES = {
  J: { up: ['little'], down: ['index', 'middle', 'ring'], tip: 20 },
  Z: { up: ['index'], down: ['middle', 'ring', 'little'], tip: 8 },
};

const MIN_MS = 200;              // quicker than this is a twitch, not a letter
const MAX_MS = 2500;             // the stroke window: older frames are forgotten
// Mid-stroke the hand blurs and the shape is often lost for a few frames (NID's
// J: 280 ms; a 15 fps video's: 600 ms); the stroke carries on through a gap this long.
const GAP_MS = 650;
const STILL_MS = 150;            // a letter starts from a held shape, still this long...
const STILL = 0.15;              // ...moving less than this (hand sizes)
const COOLDOWN_MS = 700;

const sub = (a, b) => [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)];
const len = (v) => Math.hypot(...v);
const cos = (a, b) => (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b) || 1);

/** Is this finger straight (extended), from 21 world landmarks? */
export function fingerStraight(world, name) {
  const [k, m, t] = FINGERS[name].map((i) => world[i]);
  const wrist = world[0];
  return cos(sub(m, k), sub(t, m)) > 0.55 && len(sub(t, wrist)) > len(sub(m, wrist)) * 1.08;
}

/**
 * How far the thumb tip stands out from the middle knuckle, in wrist-to-knuckle
 * lengths: I and J fold it across (0.48-0.58 in NID's clips), Y holds it out (0.86-0.97).
 */
export function thumbOut(world) {
  return len(sub(world[4], world[9])) / (len(sub(world[0], world[9])) || 1);
}

/** 'J' or 'Z' when the hand is in that letter's shape, else null. */
export function motionShape(world) {
  if (!world || world.length < 21) return null;
  for (const [letter, s] of Object.entries(SHAPES)) {
    if (s.up.every((f) => fingerStraight(world, f)) && s.down.every((f) => !fingerStraight(world, f))
      && (letter !== 'J' || thumbOut(world) < 0.72)) return letter;
  }
  return null;
}

/** Split a path into runs that keep one horizontal direction, ignoring wobbles under `min`. */
function horizontalStrokes(pts, min) {
  const strokes = [];
  let start = 0;
  let dir = 0;
  let ext = 0;                  // the furthest point in the current direction
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[ext].x;
    if (!dir) {
      if (Math.abs(pts[i].x - pts[start].x) >= min) { dir = Math.sign(pts[i].x - pts[start].x); ext = i; }
      continue;
    }
    if (Math.sign(dx) === dir) ext = i;
    else if (Math.abs(dx) >= min) {            // turned back far enough: a new stroke
      strokes.push({ from: pts[start], to: pts[ext], dir });
      start = ext; dir = -dir; ext = i;
    }
  }
  if (dir) strokes.push({ from: pts[start], to: pts[ext], dir });
  return strokes;
}

/**
 * Does this path (image units of hand size, y down) draw a J? Down, then the
 * hook: at the bottom the fingertip turns, sideways or back up. Real signers
 * (NID, five alphabet videos) curve on the way down as well, so the curve can
 * start early; a path that is mostly sideways is not a J.
 */
export function drawsJ(pts) {
  if (pts.length < 4) return false;
  const start = pts[0];
  // the bottom of the J: where the downward stroke first reaches (nearly) its lowest,
  // since the hook itself may drift a little lower as it turns
  const lowest = Math.max(...pts.map((p) => p.y));
  const low = pts.findIndex((p) => p.y >= lowest - 0.15);
  const bottom = pts[low];
  const drop = lowest - start.y;
  const after = pts.slice(low);
  const rise = lowest - Math.min(...after.map((p) => p.y));
  const side = Math.max(...after.map((p) => Math.abs(p.x - bottom.x)));
  const xs = pts.map((p) => p.x);
  const width = Math.max(...xs) - Math.min(...xs);
  return drop >= 0.5 && (side >= 0.25 || rise >= 0.25) && width >= 0.25 && width <= drop * 1.5;
}

/** Does this path draw a Z? */
export function drawsZ(pts) {
  const s = horizontalStrokes(pts, 0.25);
  for (let i = 0; i + 2 < s.length; i++) {
    const [a, b, c] = s.slice(i, i + 3);
    const w = (k) => Math.abs(k.to.x - k.from.x);
    const drop = (k) => k.to.y - k.from.y;
    if (w(a) >= 0.35 && w(c) >= 0.35 && w(b) >= 0.25
      && Math.abs(drop(a)) <= w(a) * 0.6 && Math.abs(drop(c)) <= w(c) * 0.6
      && drop(b) >= 0.25 && drop(b) >= w(b) * 0.35
      && (c.from.y + c.to.y) / 2 - (a.from.y + a.to.y) / 2 >= 0.25) return true;
  }
  return false;
}

/**
 * Feed it one hand a frame; it answers { letter, start } the moment a J or Z
 * has been drawn (start: when that letter's hand shape began), else null.
 *
 * A letter is read from a held shape into a stroke: the fingertip keeps still
 * for a moment in the letter's shape, then draws. Signing that merely passes
 * through the shape on the move is not read, which is what keeps ordinary
 * signing from reading as J or Z. When the learner is expected to draw one
 * (push's `expect`), a stroke may also start the moment the shape appears, as
 * fluent signers draw it: more of them are read, at the cost of more false
 * alarms elsewhere (measured on NID's clips and five alphabet videos, README).
 */
export function createMotionReader() {
  let run = [];                  // frames since the shape began: { t, x, y, scale, on }
  let shape = null;
  let began = 0;
  let lastSeen = -Infinity;
  let quietUntil = -Infinity;
  const reset = () => { run = []; shape = null; };
  return {
    clear: reset,
    push({ t, img, world, aspect = 1, expect = null }) {
      const now = motionShape(world);
      if (now && now !== shape) { reset(); shape = now; began = t; }
      if (!now && t - lastSeen > GAP_MS) { reset(); return null; }
      if (!shape) return null;
      if (now) lastSeen = t;
      const tip = img[SHAPES[shape].tip];
      const scale = Math.hypot((img[9].x - img[0].x) * aspect, img[9].y - img[0].y) || 1;
      run.push({ t, x: tip.x * aspect, y: tip.y, scale, on: Boolean(now) });
      while (run.length && t - run[0].t > MAX_MS) run.shift();
      if (t < quietUntil || !now || run.length < 4) return null;
      const scales = run.map((p) => p.scale).sort((a, b) => a - b);
      const s = scales[scales.length >> 1];
      // the stroke starts at the last moment the fingertip was held still
      const still = (i) => {
        let j = i;
        while (j > 0 && run[i].t - run[j - 1].t <= STILL_MS) j--;
        if (run[i].t - run[j].t < STILL_MS * 0.7) return false;
        for (let k = j; k < i; k++) if (Math.hypot(run[k].x - run[i].x, run[k].y - run[i].y) / s > STILL) return false;
        return true;
      };
      // A stroke starts where a still moment ends. The signer may also pause
      // mid-letter (at a corner of the Z), so every such start is tried.
      const flags = run.map((_, i) => still(i));
      let hit = false;
      for (let from = 0; from < run.length - 3 && !hit; from++) {
        if (!(flags[from] && !flags[from + 1] || expect === shape && from === 0) || t - run[from].t < MIN_MS) continue;
        const stroke = run.slice(from);
        if (stroke.filter((p) => p.on).length < stroke.length * 0.5) continue;
        const pts = stroke.map((p) => ({ x: (p.x - stroke[0].x) / s, y: (p.y - stroke[0].y) / s }));
        hit = shape === 'J' ? drawsJ(pts) : drawsZ(pts);
      }
      if (hit) {
        const found = { letter: shape, start: began };
        quietUntil = t + COOLDOWN_MS;
        run = [];
        return found;
      }
      return null;
    },
  };
}

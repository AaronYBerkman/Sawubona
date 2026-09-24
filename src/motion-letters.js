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

const MIN_MS = 250;              // quicker than this is a twitch, not a letter
const MAX_MS = 2200;             // the stroke window: older frames are forgotten
const GAP_MS = 180;              // the shape may be lost this long without breaking the stroke
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

/** 'J' or 'Z' when the hand is in that letter's shape, else null. */
export function motionShape(world) {
  if (!world || world.length < 21) return null;
  for (const [letter, s] of Object.entries(SHAPES)) {
    if (s.up.every((f) => fingerStraight(world, f)) && s.down.every((f) => !fingerStraight(world, f))) return letter;
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

/** Does this path (image units of hand size, y down) draw a J? */
export function drawsJ(pts) {
  if (pts.length < 4) return false;
  const start = pts[0];
  // the bottom of the J: where the downward stroke first reaches (nearly) its lowest,
  // since the hook itself may drift a little lower as it turns
  const lowest = Math.max(...pts.map((p) => p.y));
  const low = pts.findIndex((p) => p.y >= lowest - 0.15);
  const drop = pts[low].y - start.y;
  const across = Math.abs(pts[pts.length - 1].x - pts[low].x);
  const sideOnWay = Math.abs(pts[low].x - start.x);
  const beyond = Math.max(...pts.slice(low).map((p) => Math.abs(p.x - pts[low].x)));
  // down first, then a hook: the turn at the bottom, not a sideways slide
  return drop >= 0.45 && Math.max(across, beyond) >= 0.2 && sideOnWay <= drop * 0.9;
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
 */
export function createMotionReader() {
  let run = [];                  // frames of the current shape: { t, x, y, scale }
  let shape = null;
  let lastSeen = -Infinity;
  let quietUntil = -Infinity;
  const reset = () => { run = []; shape = null; };
  return {
    clear: reset,
    push({ t, img, world, aspect = 1 }) {
      const now = motionShape(world);
      if (now && now !== shape) { reset(); shape = now; }
      if (!now) {
        if (t - lastSeen > GAP_MS) reset();
        return null;
      }
      lastSeen = t;
      const tip = img[SHAPES[now].tip];
      const scale = Math.hypot((img[9].x - img[0].x) * aspect, img[9].y - img[0].y) || 1;
      run.push({ t, x: tip.x * aspect, y: tip.y, scale });
      while (run.length && t - run[0].t > MAX_MS) run.shift();
      if (t < quietUntil || run.length < 4 || t - run[0].t < MIN_MS) return null;
      const scales = run.map((p) => p.scale).sort((a, b) => a - b);
      const s = scales[scales.length >> 1];
      const pts = run.map((p) => ({ x: (p.x - run[0].x) / s, y: (p.y - run[0].y) / s }));
      if (shape === 'J' ? drawsJ(pts) : drawsZ(pts)) {
        const hit = { letter: shape, start: run[0].t };
        quietUntil = t + COOLDOWN_MS;
        run = [];
        return hit;
      }
      return null;
    },
  };
}

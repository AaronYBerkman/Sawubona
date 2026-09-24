// The illustrated signer: an ink-and-wash figure that performs a sign.
//
// It draws any 203-point frame - a Real SASL reference decoded by
// src/replay-data.js, or a learner's own attempt straight from holisticFrame in
// src/holistic.js - as the same figure, so the two can be watched side by side.
//
//   import { loadReplay } from './replay-data.js';
//   import { createReplay } from './figure.js';
//   const replay = await loadReplay();
//   await replay.ready('THANK YOU');
//   const player = createReplay(canvas, replay.clipFrames('THANK YOU'), { fps: replay.fps });
//   player.play();
//
//   createReplay(canvas, attemptFrames, { fps: 25, mirror: true });   // pixel frames
//
// Drawing, back to front: a pale wash behind the figure; the neck and the
// torso as a garment in a cloth wash; the head (hair, ears, the face oval,
// then brows, eyes, nose and lips as ink lines from the face contour, because
// the face carries grammar in SASL); the arms as tapered sleeves, the farther
// arm first; then the hands - a filled palm and tapered, inked fingers,
// depth-ordered from the landmarks' z the way tools/make-hands.py orders the
// alphabet drawings, with fingers folded behind the palm in a shade colour.
//
// A part the tracker lost is held where it was last seen (moved along with the
// body) and faded out, never dropped to the origin: a lost hand becomes a faint
// ghost at the end of its arm, a lost face a blank head.
//
// Colours are CSS custom properties read from the canvas, with fallbacks:
//   --figure-line (the ink round the clothes; else --figure-ink)
//   --figure-light (whites of the eyes, highlights, a palm turned to you)
//   --figure-skin  --figure-skin-line  --figure-skin-shade
//   --figure-cloth  --figure-hair  --figure-lip  --figure-wash (the backdrop)
// (--figure-skin and --figure-skin-shade fall back to the alphabet art's
// --hand-fill and --hand-shade, so the letters and the figure match.)

import { FACE_CONTOUR, N_POINTS, normaliseClip } from './holistic.js';
import { displayFrames, isPixelSpace } from './replay-data.js';

const FACE0 = 33;
const LEFT0 = 161;
const RIGHT0 = 182;
const TAU = Math.PI * 2;

// Face contour slots by MediaPipe face-mesh index.
const slot = (m) => {
  const k = FACE_CONTOUR.indexOf(m);
  if (k < 0) throw new Error(`face mesh point ${m} is not in the contour`);
  return FACE0 + k;
};
const slots = (list) => list.map(slot);
const OVAL = slots([10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]);
const LIP_OUT_UP = slots([61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]);
const LIP_OUT_LO = slots([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]);
const LIP_IN_UP = slots([78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]);
const LIP_IN_LO = slots([78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]);
const EYES = [
  { up: slots([33, 246, 161, 160, 159, 158, 157, 173, 133]), lo: slots([33, 7, 163, 144, 145, 153, 154, 155, 133]) },
  { up: slots([263, 466, 388, 387, 386, 385, 384, 398, 362]), lo: slots([263, 249, 390, 373, 374, 380, 381, 382, 362]) },
];
const BROWS = [
  { up: slots([70, 63, 105, 66, 107]), lo: slots([46, 53, 52, 65, 55]) },
  { up: slots([300, 293, 334, 296, 336]), lo: slots([276, 283, 282, 295, 285]) },
];
const F_TOP = slot(10);
const F_CHIN = slot(152);
const F_RIGHT = slot(234);          // the subject's right cheek edge (image left)
const F_LEFT = slot(454);
const F_JAW_R = slot(136);
const F_JAW_L = slot(365);
const F_EYE_IN = [slot(133), slot(362)];
const F_LIP_TOP = slot(0);

// Hands. Radii are in palm lengths (wrist to middle knuckle): each finger at
// its knuckle, middle joint, end joint and tip, wide enough that fingers held
// together touch. The thumb is drawn from its own knuckle (2) out; its long
// bone (1-2) is the ball of the thumb, part of the palm.
const CHAINS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const RADII = [
  [0.15, 0.135, 0.118, 0.1],
  [0.118, 0.108, 0.096, 0.084],
  [0.122, 0.112, 0.099, 0.086],
  [0.114, 0.104, 0.093, 0.081],
  [0.1, 0.091, 0.082, 0.072],
];
const PALM = [0, 1, 5, 9, 13, 17];
const PALM_R = [0.25, 0.165, 0.108, 0.113, 0.105, 0.09];
const WRIST_R = 0.2;
// A hand at rest, for one the tracker never saw: the median of 3,194 resting
// hands in the gallery, in a palm frame (x from the wrist to the middle
// knuckle, which is 1; y across toward the little finger), then the body
// model's wrist, index, little finger and thumb points in the same frame.
const REST_HAND = [[0, 0], [0.177, -0.417], [0.572, -0.648], [0.964, -0.729], [1.262, -0.802],
  [0.959, -0.233], [1.48, -0.354], [1.723, -0.473], [1.865, -0.542], [1, 0], [1.517, -0.132],
  [1.765, -0.275], [1.873, -0.339], [0.997, 0.129], [1.467, 0.015], [1.694, -0.108], [1.812, -0.184],
  [0.969, 0.183], [1.364, 0.126], [1.566, 0.021], [1.678, -0.058]];
const REST_POSE = { wrist: [-0.172, -0.075], index: [0.802, -0.323], pinky: [0.853, -0.011], thumb: [0.461, -0.445] };
const LIGHT = [-0.6, -0.8];         // light from the upper left, as on the body

// Body landmarks.
const SH = [11, 12];                // the subject's left, right shoulder
const EL = [13, 14];
const WR = [15, 16];
const HIP = [23, 24];
const HAND0 = [LEFT0, RIGHT0];
const POSE_HAND = [[17, 19, 21], [18, 20, 22]];   // pinky, index, thumb per side

/** The part of the figure the default framing shows, in shoulder widths. */
export const VIEW = Object.freeze({ cx: 0, cy: 0.1, w: 3.0, h: 3.0 });
const FADE_TOP = 1.1;               // the figure fades out below the waist
const FADE_BOTTOM = 1.6;
const GHOST = 0.2;                  // opacity of a hand the tracker lost
const DEFAULT_Z = 2400;             // z -> x,y proportion when it cannot be fitted
const HAND_SIZE = 0.26;             // palm length, shoulder widths

// --- colour -----------------------------------------------------------------

const COLOR_VARS = {
  ink: ['--figure-ink', '#1F2A1E'],
  line: ['--figure-line', '--figure-ink', '#1F2A1E'],
  light: ['--figure-light', '#F8F4EA'],
  skin: ['--figure-skin', '--hand-fill', '#D6A27A'],
  skinLine: ['--figure-skin-line', '#5E3A26'],
  shade: ['--figure-skin-shade', '--hand-shade', '#B7815F'],
  cloth: ['--figure-cloth', '#3F5640'],
  hair: ['--figure-hair', '#2A2521'],
  lip: ['--figure-lip', '#B06A5B'],
  wash: ['--figure-wash', '#9FAE8A'],
};

let probe = null;
const colorCache = new Map();

function parseColor(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (colorCache.has(v)) return colorCache.get(v);
  let out = null;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    out = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    out.push(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  } else if (typeof document !== 'undefined') {
    probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (probe) {
      probe.canvas.width = probe.canvas.height = 1;
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#010203';
      probe.fillStyle = v;
      if (probe.fillStyle !== '#010203' || /^#010203$/i.test(v)) {
        probe.fillRect(0, 0, 1, 1);
        const d = probe.getImageData(0, 0, 1, 1).data;
        out = [d[0], d[1], d[2], d[3] / 255];
      }
    }
  }
  colorCache.set(v, out);
  return out;
}

/** The figure's colours for an element (its CSS custom properties, or the defaults). */
export function figureColors(el) {
  const cs = el && typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  const out = {};
  for (const [key, names] of Object.entries(COLOR_VARS)) {
    let c = null;
    for (const n of names.slice(0, -1)) {
      c = parseColor(cs?.getPropertyValue(n));
      if (c) break;
    }
    out[key] = c ?? parseColor(names[names.length - 1]);
  }
  return out;
}

const SHADOW = [22, 26, 20, 1];          // pigment pooling and shade, in any theme
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${+(a * (c[3] ?? 1)).toFixed(3)})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 1];

// --- small geometry ---------------------------------------------------------

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const lerp2 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const add2 = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const sub2 = (p, q) => [p[0] - q[0], p[1] - q[1]];
const len2 = (v) => Math.hypot(v[0], v[1]);
const unit2 = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const dist2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Catmull-Rom through the points, `steps` samples a segment. */
function spline(pts, closed, steps = 5) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const at = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const out = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1); const p1 = at(i); const p2 = at(i + 1); const p3 = at(i + 2);
    for (let k = 0; k < steps; k++) {
      const t = k / steps; const t2 = t * t; const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/** Clockwise on screen (y down), the way capsule() and circle() wind. */
function clockwise(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; const q = pts[(i + 1) % pts.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  return area < 0 ? pts.slice().reverse() : pts;
}

/** Convex hull, clockwise on screen (monotone chain). */
function hull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = []; const upper = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return clockwise(lower.slice(0, -1).concat(upper.slice(0, -1)));
}

function polyPath(pts, closed = true, path = new Path2D()) {
  if (!pts.length) return path;
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  if (closed) path.closePath();
  return path;
}

/**
 * A brush stroke: the polyline widened to width(i, n) at each point, as a
 * filled shape, so a line can swell and taper like ink.
 */
function ribbon(pts, width, closed = false) {
  const n = pts.length;
  const path = new Path2D();
  if (n < 2) return path;
  const L = []; const R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const t = unit2(sub2(b, a));
    const w = width(i, n) / 2;
    L.push([pts[i][0] - t[1] * w, pts[i][1] + t[0] * w]);
    R.push([pts[i][0] + t[1] * w, pts[i][1] - t[0] * w]);
  }
  if (closed) {
    polyPath(L, true, path);
    polyPath(R.reverse(), true, path);
  } else {
    polyPath(L.concat(R.reverse()), true, path);
  }
  return path;
}

/** Ink weight along an open stroke: thin at both ends, full in the middle. */
const taper = (w, lo = 0.15, bias = 0.5) => (i, n) => {
  const t = n > 1 ? i / (n - 1) : 0.5;
  const u = t < bias ? t / bias : (1 - t) / (1 - bias);
  return w * (lo + (1 - lo) * Math.sin((Math.PI / 2) * clamp(u, 0, 1)));
};

/** Hull of two circles (a tapered segment with round ends), added to `path`. */
function capsule(path, x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1; const dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  if (d <= Math.abs(r1 - r2) + 1e-6) {
    const [x, y, r] = r1 >= r2 ? [x1, y1, r1] : [x2, y2, r2];
    path.moveTo(x + r, y);
    path.arc(x, y, r, 0, TAU);
    path.closePath();
    return;
  }
  const th = Math.atan2(dy, dx);
  const ph = Math.acos(clamp((r1 - r2) / d, -1, 1));
  path.moveTo(x1 + r1 * Math.cos(th + ph), y1 + r1 * Math.sin(th + ph));
  path.arc(x1, y1, r1, th + ph, th - ph + TAU);
  path.arc(x2, y2, r2, th - ph, th + ph);
  path.closePath();
}

function circle(path, x, y, r) {
  path.moveTo(x + r, y);
  path.arc(x, y, r, 0, TAU);
  path.closePath();
}

// --- paper texture ----------------------------------------------------------

let grainCanvas = null;

/** A seeded tile of watercolour grain: fine speckle over soft blotches. */
function grainTile() {
  if (grainCanvas || typeof document === 'undefined') return grainCanvas;
  const N = 160;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d');
  if (!g) return null;
  const rnd = mulberry32(20230719);
  const G = 10;
  const lattice = Array.from({ length: G * G }, rnd);
  const smooth = (x, y) => {
    const gx = (x / N) * G; const gy = (y / N) * G;
    const x0 = Math.floor(gx); const y0 = Math.floor(gy);
    const fx = gx - x0; const fy = gy - y0;
    const v = (i, j) => lattice[((j % G) * G + (i % G))];
    const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(v(x0, y0), v(x0 + 1, y0), sx), lerp(v(x0, y0 + 1), v(x0 + 1, y0 + 1), sx), sy);
  };
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = 0.55 * rnd() + 0.45 * smooth(x, y);
      const v = Math.round(255 - n * 70);
      const k = (y * N + x) * 4;
      img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v - 4; img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  grainCanvas = cv;
  return cv;
}

const patterns = new WeakMap();
function grainPattern(g) {
  if (patterns.has(g)) return patterns.get(g);
  const tile = grainTile();
  const p = tile ? g.createPattern(tile, 'repeat') : null;
  patterns.set(g, p);
  return p;
}

// Scratch layers the figure is composed on before it lands on the page.
const layers = new WeakMap();
function layer(canvas, key) {
  let all = layers.get(canvas);
  if (!all) layers.set(canvas, (all = {}));
  let l = all[key];
  if (!l) {
    const cv = document.createElement('canvas');
    l = all[key] = { cv, g: cv.getContext('2d') };
  }
  if (l.cv.width !== canvas.width || l.cv.height !== canvas.height) {
    l.cv.width = canvas.width;
    l.cv.height = canvas.height;
  }
  l.g.setTransform(1, 0, 0, 1, 0, 0);
  l.g.globalAlpha = 1;
  l.g.globalCompositeOperation = 'source-over';
  l.g.clearRect(0, 0, l.cv.width, l.cv.height);
  return l;
}

// --- washes -----------------------------------------------------------------

/** Watercolour on a shape: grain, and pigment pooled a little at the edges. */
function washFinish(g, E, path, base, { grain = 0.22, edge = 0.34, width = 0.05 } = {}) {
  g.save();
  g.clip(path);
  if (E.grain && grain > 0) {
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = grain;
    g.fillStyle = E.grain;
    g.fill(path);
    g.globalCompositeOperation = 'source-over';
  }
  if (edge > 0) {
    const dark = mix(base, SHADOW, 0.35);
    g.globalAlpha = edge * 0.45;
    g.strokeStyle = rgba(dark);
    g.lineWidth = E.s * width * 2;
    g.stroke(path);
    g.globalAlpha = edge;
    g.lineWidth = E.s * width * 0.7;
    g.stroke(path);
  }
  g.restore();
}

/** A faint wash that ran a little past the ink line, as real washes do. */
function bleed(g, E, path, color) {
  g.save();
  g.translate(0.014 * E.s, 0.01 * E.s);
  g.fillStyle = rgba(color, 0.22);
  g.fill(path);
  g.restore();
}

function backdrop(g, E, seed = 11) {
  const rnd = mulberry32(seed);
  const ph = Array.from({ length: 6 }, () => rnd() * TAU);
  const blob = (cx, cy, R, k) => {
    const pts = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      const r = R * (1 + 0.07 * Math.sin(3 * a + ph[k]) + 0.045 * Math.sin(5 * a + ph[k + 1]) + 0.025 * Math.sin(11 * a + ph[k + 2]));
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.04]);
    }
    return polyPath(spline(pts, true, 2));
  };
  const c = E.world(0.02, -0.18);
  const p1 = blob(c[0], c[1], 1.18 * E.s, 0);
  const p2 = blob(c[0] + 0.16 * E.s * E.dir, c[1] - 0.08 * E.s, 0.86 * E.s, 3);
  g.save();
  g.fillStyle = rgba(E.C.wash, 0.16);
  g.fill(p1);
  g.fillStyle = rgba(E.C.wash, 0.1);
  g.fill(p2);
  g.clip(p1);
  if (E.grain) {
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = 0.12;
    g.fillStyle = E.grain;
    g.fill(p1);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }
  g.strokeStyle = rgba(E.C.wash, 0.1);
  g.lineWidth = 0.05 * E.s;
  g.stroke(p1);
  g.strokeStyle = rgba(E.C.wash, 0.12);
  g.lineWidth = 0.012 * E.s;
  g.stroke(p1);
  g.restore();
}

// --- frame -> screen ----------------------------------------------------------

const seen = (f, i) => f[i * 3] !== 0 || f[i * 3 + 1] !== 0 || f[i * 3 + 2] !== 0;

function presence(f) {
  const body = seen(f, 11) && seen(f, 12);
  const face = seen(f, F_TOP) && seen(f, F_CHIN) && seen(f, F_RIGHT) && seen(f, F_LEFT);
  const hand = (h0) => seen(f, h0) && seen(f, h0 + 5) && seen(f, h0 + 9) && seen(f, h0 + 12) && seen(f, h0 + 17);
  return [body ? 1 : 0, face ? 1 : 0, hand(LEFT0) ? 1 : 0, hand(RIGHT0) ? 1 : 0];
}

/** Palm length (wrist to middle knuckle) of one hand, in the frame's units. */
function palmLength(f, h0, zScale) {
  const d = (a, b, k) => Math.hypot(f[(h0 + a) * 3] - f[(h0 + b) * 3], f[(h0 + a) * 3 + 1] - f[(h0 + b) * 3 + 1],
    k * (f[(h0 + a) * 3 + 2] - f[(h0 + b) * 3 + 2]));
  // The rigid bones of the palm, each scaled to a palm length.
  return Math.max(d(0, 9, zScale), d(0, 5, zScale) * 1.06, d(0, 17, zScale) * 1.18, d(5, 17, zScale) * 1.28);
}

// --- hands --------------------------------------------------------------------

function segClosest(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax; const d1y = by - ay; const d2x = dx - cx; const d2y = dy - cy;
  const rx = ax - cx; const ry = ay - cy;
  const a = d1x * d1x + d1y * d1y; const e = d2x * d2x + d2y * d2y; const f = d2x * rx + d2y * ry;
  const EPS = 1e-9;
  if (a <= EPS && e <= EPS) return [0, 0];
  if (a <= EPS) return [0, clamp(f / e, 0, 1)];
  const c = d1x * rx + d1y * ry;
  if (e <= EPS) return [clamp(-c / a, 0, 1), 0];
  const b = d1x * d2x + d1y * d2y;
  const den = a * e - b * b;
  let s = den > EPS ? clamp((b * f - c * e) / den, 0, 1) : 0;
  let t = (b * s + f) / e;
  if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
  return [s, t];
}

/** +1 if part A covers part B where they overlap, -1 if B covers A, 0 if apart. */
function inFront(A, B) {
  let vote = 0;
  for (let i = 0; i + 1 < A.length; i++) {
    const p = A[i]; const q = A[i + 1];
    for (let j = 0; j + 1 < B.length; j++) {
      const u = B[j]; const v = B[j + 1];
      const [s, t] = segClosest(p.x, p.y, q.x, q.y, u.x, u.y, v.x, v.y);
      const gap = Math.hypot(p.x + s * (q.x - p.x) - (u.x + t * (v.x - u.x)), p.y + s * (q.y - p.y) - (u.y + t * (v.y - u.y)));
      const reach = p.r + s * (q.r - p.r) + u.r + t * (v.r - u.r);
      if (gap < reach) {
        const zA = p.z + s * (q.z - p.z); const zB = u.z + t * (v.z - u.z);
        vote += (reach - gap) * Math.sign(zB - zA);
      }
    }
  }
  return Math.sign(vote);
}

/**
 * How far each finger is folded in front of (+) or behind (-) the palm, in
 * palm lengths; `Q` is 21 [x, y, z] with z in the same units as x and y.
 */
function fingerSides(Q, L) {
  const q = Q.map((p) => [(p[0] - Q[0][0]) / L, (p[1] - Q[0][1]) / L, (p[2] - Q[0][2]) / L]);
  const a = q[5]; const b = q[17];
  let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nl = Math.hypot(n[0], n[1], n[2]) || 1;
  n = n.map((v) => v / nl);
  const toward = Math.abs(n[2]) > 0.25 ? -Math.sign(n[2]) : 0;
  const palmZ = (q[0][2] + q[5][2] + q[9][2] + q[13][2] + q[17][2]) / 5;
  return CHAINS.map((chain) => {
    if (toward === 0) {
      let z = 0;
      for (const j of chain.slice(1)) z += q[j][2];
      return palmZ - z / 3;
    }
    let side = 0;
    for (const j of chain.slice(1)) side += q[j][0] * n[0] + q[j][1] * n[1] + q[j][2] * n[2];
    return (side / 3) * toward;
  });
}

function orderParts(list) {
  list.sort((a, b) => b.z - a.z);
  for (let pass = 0; pass < list.length; pass++) {
    let moved = false;
    for (let i = 0; i + 1 < list.length; i++) {
      if (inFront(list[i].joints, list[i + 1].joints) > 0) {
        [list[i], list[i + 1]] = [list[i + 1], list[i]];
        moved = true;
      }
    }
    if (!moved) break;
  }
  return list;
}

/** Union of capsules along the joints, each radius grown by grow(r). */
function chainShape(joints, grow, path = new Path2D()) {
  for (let i = 0; i + 1 < joints.length; i++) {
    const a = joints[i]; const b = joints[i + 1];
    capsule(path, a.x, a.y, a.r + grow(a.r), b.x, b.y, b.r + grow(b.r));
  }
  return path;
}

const NO_GROW = () => 0;

function drawHand(g, E, side) {
  const h0 = HAND0[side];
  const Q = [];
  for (let j = 0; j < 21; j++) Q.push(E.pt3(h0 + j));
  const L = (E.handSize?.[side] ?? palmLength(E.f, h0, E.zScale)) * E.s;
  if (!(L > 1)) return;
  const sides = E.sides?.[side] ?? fingerSides(Q, L);
  const ink = E.C.skinLine;
  const lw = Math.max(0.9, 0.036 * L);
  const outline = (r) => lw * (0.6 + 0.4 * clamp(r / (0.11 * L), 0, 1.3));
  // Which way the palm faces - a sign's orientation - from the knuckles'
  // winding: +1 palm to the viewer, -1 the back of the hand.
  const a = sub2(Q[5], Q[0]); const b = sub2(Q[17], Q[0]);
  const az = Q[5][2] - Q[0][2]; const bz = Q[17][2] - Q[0][2];
  const nx = a[1] * bz - az * b[1]; const ny = az * b[0] - a[0] * bz; const nz = a[0] * b[1] - a[1] * b[0];
  const facing = clamp((-nz / (Math.hypot(nx, ny, nz) || 1)) * (side === 1 ? 1 : -1) * E.dir, -1, 1);
  const light = mix(E.C.skin, E.C.light, 0.3);
  const palmFill = mix(E.C.skin, light, clamp(facing * 1.6, 0, 1));
  const fingerFill = mix(E.C.skin, light, clamp(facing * 0.8, 0, 1));
  // Paint-order outline: the shape grown by the line width in ink, then the
  // shape itself on top, so one line runs round a whole finger.
  const drawPart = (joints, fill, extra) => {
    const outer = chainShape(joints, outline);
    const inner = chainShape(joints, NO_GROW);
    if (extra) {
      // Same winding as the capsules, or the nonzero fill punches holes.
      const cw = clockwise(extra);
      polyPath(cw, true, outer); polyPath(cw, true, inner);
    }
    g.fillStyle = rgba(ink);
    g.fill(outer);
    g.fillStyle = rgba(fill);
    g.fill(inner);
    return inner;
  };

  // Fingers: joints with radii, the tip pulled back so the round cap, not the
  // centre, lands on the fingertip landmark.
  const parts = CHAINS.map((chain, k) => {
    const joints = chain.map((j, m) => ({ x: Q[j][0], y: Q[j][1], z: Q[j][2], r: RADII[k][m] * L }));
    const tip = joints[3]; const prev = joints[2];
    const tx = tip.x - prev.x; const ty = tip.y - prev.y;
    const tl = Math.hypot(tx, ty);
    if (tl > 1e-6) {
      const pull = Math.min(tip.r * 0.85, tl * 0.5);
      tip.x -= (tx / tl) * pull;
      tip.y -= (ty / tl) * pull;
    }
    const s = sides[k];
    return { k, joints, kind: s > 0.2 ? 'front' : s < -0.2 ? 'back' : 'plane', z: (joints[1].z + joints[2].z + joints[3].z) / 3 };
  });
  const behind = orderParts(parts.filter((p) => p.kind === 'back'));
  const rest = orderParts(parts.filter((p) => p.kind !== 'back'));

  // The wrist, from inside the sleeve to the heel of the hand, and the cuff.
  const w = Q[0];
  const cuff = E.cuffs?.[side];
  const heel = { x: w[0], y: w[1], z: w[2], r: PALM_R[0] * L * 0.9 };
  let from;
  if (cuff) {
    from = { x: cuff.x, y: cuff.y, z: w[2], r: Math.min(heel.r * 0.8, cuff.r * 0.9) };
  } else {
    const u = unit2(sub2(w, Q[9]));
    from = { x: w[0] + u[0] * 0.55 * L, y: w[1] + u[1] * 0.55 * L, z: w[2], r: heel.r * 0.78 };
  }
  drawPart([from, heel], E.C.skin);
  if (cuff) drawCuff(g, E, cuff);

  for (const p of behind) {
    const inner = drawPart(p.joints, E.C.shade);
    g.save(); g.clip(inner);
    g.fillStyle = rgba(E.C.skinLine, 0.16); g.fill(inner);
    g.restore();
  }
  // The palm: heel and knuckles joined into one rounded shape.
  const pj = PALM.map((j, m) => ({ x: Q[j][0], y: Q[j][1], z: Q[j][2], r: PALM_R[m] * L }));
  const palm = drawPart(pj.concat([pj[0]]), palmFill, pj.map((p) => [p.x, p.y]));
  // A little shade in the hollow of the hand.
  g.save(); g.clip(palm);
  const mid = [(Q[0][0] * 0.4 + Q[9][0] * 0.6), (Q[0][1] * 0.4 + Q[9][1] * 0.6)];
  const gr = g.createRadialGradient(mid[0], mid[1], 0, mid[0], mid[1], 0.75 * L);
  gr.addColorStop(0, rgba(E.C.shade, 0));
  gr.addColorStop(1, rgba(E.C.shade, 0.55));
  g.fillStyle = gr; g.fill(palm);
  g.restore();

  rest.forEach((p, idx) => {
    // Fingers further back a shade deeper, so overlapping fingers separate.
    const depth = rest.length > 1 ? 1 - idx / (rest.length - 1) : 0;
    drawPart(p.joints, mix(fingerFill, E.C.shade, 0.32 * depth * depth));
    const straight = (() => {
      const [, j1, j2, j3] = p.joints;
      const u1 = unit2([j2.x - j1.x, j2.y - j1.y]); const u2 = unit2([j3.x - j2.x, j3.y - j2.y]);
      return u1[0] * u2[0] + u1[1] * u2[1];
    })();
    // Nails when the back of the hand is to the viewer and the finger is out.
    if (facing < -0.3 && p.k > 0 && p.kind === 'plane' && straight > 0.75) {
      const tip = p.joints[3]; const dip = p.joints[2];
      const segL = Math.hypot(tip.x - dip.x, tip.y - dip.y);
      if (segL > tip.r * 0.8) {
        const c = [lerp(dip.x, tip.x, 0.72), lerp(dip.y, tip.y, 0.72)];
        const nail = new Path2D();
        nail.ellipse(c[0], c[1], Math.min(segL * 0.42, tip.r * 0.95), tip.r * 0.58, Math.atan2(tip.y - dip.y, tip.x - dip.x), 0, TAU);
        g.fillStyle = rgba(mix(E.C.skin, E.C.light, 0.45), clamp(-facing * 1.4, 0, 1));
        g.fill(nail);
        g.strokeStyle = rgba(ink, 0.45 * clamp(-facing * 1.4, 0, 1));
        g.lineWidth = Math.max(0.6, lw * 0.45);
        g.stroke(nail);
      }
    }
    // A crease at a bent middle joint helps a handshape read at a glance.
    const [a, b, c] = p.joints;
    const v1 = unit2([b.x - a.x, b.y - a.y]); const v2 = unit2([c.x - b.x, c.y - b.y]);
    const cos = v1[0] * v2[0] + v1[1] * v2[1];
    if (cos < 0.8 && p.k > 0) {
      const nrm = unit2([v1[0] - v2[0], v1[1] - v2[1]]);
      const r = b.r * 0.6;
      g.fillStyle = rgba(ink, 0.5);
      g.fill(ribbon([add2([b.x, b.y], nrm, r * 0.9), add2([b.x, b.y], nrm, r * 0.2)], taper(lw * 0.7, 0.3)));
    }
  });
}

/** A hand the tracker never saw, sketched from the body's own hand points. */
function drawMitten(g, E, side, alpha) {
  const w = E.pt(WR[side]);
  const [pk, ix, th] = POSE_HAND[side].map((i) => E.pt(i));
  if (!E.has(POSE_HAND[side][0]) || !E.has(POSE_HAND[side][1])) return;
  const L = HAND_SIZE * E.s;
  const tipOf = (p) => add2(p, unit2(sub2(p, w)), 0.35 * L);
  const path = new Path2D();
  capsule(path, w[0], w[1], 0.2 * L, (pk[0] + ix[0]) / 2, (pk[1] + ix[1]) / 2, 0.22 * L);
  const tip = tipOf(lerp2(pk, ix, 0.5));
  capsule(path, (pk[0] + ix[0]) / 2, (pk[1] + ix[1]) / 2, 0.22 * L, tip[0], tip[1], 0.16 * L);
  capsule(path, w[0], w[1], 0.14 * L, th[0], th[1], 0.1 * L);
  g.save();
  g.globalAlpha = alpha;
  g.setLineDash([0.08 * L, 0.08 * L]);
  g.fillStyle = rgba(E.C.skin, 0.6);
  g.fill(path);
  g.strokeStyle = rgba(E.C.skinLine, 0.8);
  g.lineWidth = Math.max(0.8, 0.03 * L);
  g.stroke(path);
  g.restore();
}

// --- body ---------------------------------------------------------------------

function torsoFrame(E) {
  const Ls = E.pt(SH[0]); const Rs = E.pt(SH[1]);
  const M = lerp2(Ls, Rs, 0.5);
  const u = unit2(sub2(Ls, Rs));                  // toward the subject's left
  let d = [-u[1], u[0]];
  if (d[1] < 0) d = [-d[0], -d[1]];               // down the body
  return { Ls, Rs, M, u, d };
}

function drawTorso(g, E) {
  const { Ls, Rs, M, u, d } = torsoFrame(E);
  const s = E.s;
  const at = (p, a, b) => [p[0] + u[0] * a * s + d[0] * b * s, p[1] + u[1] * a * s + d[1] * b * s];
  const hip = (i, side) => (E.has(HIP[i]) ? E.pt(HIP[i]) : at(M, 0.3 * side, 1.45));
  const hL = hip(0, 1); const hR = hip(1, -1);
  const pts = [
    at(M, 0.17, -0.2), at(M, 0.32, -0.15), at(Ls, -0.02, -0.11), at(Ls, 0.11, -0.04), at(Ls, 0.13, 0.12), at(Ls, 0.12, 0.42),
    add2(lerp2(Ls, hL, 0.7), u, 0.04 * s), at(hL, 0.1, 0), at(hL, 0.1, 0.45),
    at(hR, -0.1, 0.45), at(hR, -0.1, 0), add2(lerp2(Rs, hR, 0.7), u, -0.04 * s),
    at(Rs, -0.12, 0.42), at(Rs, -0.13, 0.12), at(Rs, -0.11, -0.04), at(Rs, 0.02, -0.11), at(M, -0.32, -0.15), at(M, -0.17, -0.2),
    at(M, -0.1, -0.08), at(M, 0, -0.05), at(M, 0.1, -0.08),
  ];
  const outline = spline(pts, true, 6);
  const path = polyPath(outline);
  bleed(g, E, path, E.C.cloth);
  g.fillStyle = rgba(E.C.cloth);
  g.fill(path);
  // Light from the upper left: the far side of the body a shade deeper.
  g.save(); g.clip(path);
  const lg = g.createLinearGradient(...at(M, -0.8 * E.dir, 0), ...at(M, 0.8 * E.dir, 0.4));
  lg.addColorStop(0, rgba(E.C.light, 0.1));
  lg.addColorStop(0.6, rgba(E.C.cloth, 0));
  lg.addColorStop(1, rgba(SHADOW, 0.2));
  g.fillStyle = lg; g.fill(path);
  g.restore();
  washFinish(g, E, path, E.C.cloth, { grain: 0.4, edge: 0.4, width: 0.06 });
  // Ink: the shoulders and sides, pressed harder where the body turns.
  g.fillStyle = rgba(E.C.line, 0.88);
  g.fill(ribbon(outline, (i, n) => E.lw * (0.55 + 0.45 * Math.abs(Math.sin((i / n) * TAU * 1.5 + 0.6))), true));
  // A collar seam, drawn lightly.
  g.fillStyle = rgba(E.C.line, 0.45);
  g.fill(ribbon(spline([at(M, -0.21, -0.19), at(M, -0.12, -0.06), at(M, 0, -0.02), at(M, 0.12, -0.06), at(M, 0.21, -0.19)], false, 6), taper(E.lw * 0.8)));
}

function drawNeck(g, E, face) {
  const { M, u, d } = torsoFrame(E);
  const s = E.s;
  let top;
  let axis;
  if (face) {
    const chin = E.pt(F_CHIN); const brow = E.pt(F_TOP);
    // Tucked up behind the face, so the neck comes out from under the jaw.
    top = lerp2(lerp2(chin, brow, 0.42), lerp2(E.pt(F_JAW_R), E.pt(F_JAW_L), 0.5), 0.35);
    axis = unit2(sub2(M, top));
  } else {
    top = add2(M, d, -0.5 * s);
    axis = d;
  }
  const n = [-axis[1], axis[0]];
  const base = add2(M, d, -0.1 * s);
  const len = dist2(top, base);
  const mid = add2(top, axis, len * 0.55);
  const pts = [
    add2(top, n, 0.12 * s), add2(mid, n, 0.125 * s), add2(add2(base, n, 0.2 * s), d, 0.04 * s),
    add2(add2(base, n, -0.2 * s), d, 0.04 * s), add2(mid, n, -0.125 * s), add2(top, n, -0.12 * s),
  ];
  const path = polyPath(spline(pts, true, 4));
  g.fillStyle = rgba(E.C.skin);
  g.fill(path);
  g.save(); g.clip(path);
  // The jaw's shadow on the neck.
  const sg = g.createLinearGradient(top[0], top[1], mid[0], mid[1]);
  sg.addColorStop(0.25, rgba(E.C.shade, 0.85));
  sg.addColorStop(1, rgba(E.C.shade, 0));
  g.fillStyle = sg; g.fill(path);
  g.restore();
  washFinish(g, E, path, E.C.skin, { grain: 0.14, edge: 0.25, width: 0.03 });
  g.fillStyle = rgba(E.C.skinLine, 0.8);
  for (const k of [1, -1]) {
    const side = spline([add2(top, n, 0.12 * k * s), add2(mid, n, 0.123 * k * s), add2(add2(base, n, 0.17 * k * s), d, -0.02 * s)], false, 5);
    g.fill(ribbon(side, taper(E.lw * 0.9, 0.1, 0.35)));
  }
}

/** Points along a straight line, for a brush stroke. */
function along(p, q, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(lerp2(p, q, i / n));
  return out;
}

/** Points along an arc, angles increasing from a0 to a1. */
function arcPts(c, r, a0, a1, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return out;
}

/** The two long sides of a capsule, as tangent angles: [angle +, angle -]. */
function sideAngles(a, ra, b, rb) {
  const d = dist2(a, b);
  const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const ph = Math.acos(clamp((ra - rb) / Math.max(d, 1e-6), -1, 1));
  return { th, ph, d };
}

/**
 * A sleeve segment: a cloth wash with its two sides inked as brush strokes
 * that swell in the middle and lift off at the ends, so the shoulder and elbow
 * run on without a seam.
 */
function sleeve(g, E, a, ra, b, rb, { endCap = false } = {}) {
  const path = new Path2D();
  capsule(path, a[0], a[1], ra, b[0], b[1], rb);
  bleed(g, E, path, E.C.cloth);
  g.fillStyle = rgba(E.C.cloth);
  g.fill(path);
  washFinish(g, E, path, E.C.cloth, { grain: 0.4, edge: 0 });
  const { th, ph, d } = sideAngles(a, ra, b, rb);
  if (d <= Math.abs(ra - rb)) return path;
  // Pigment pooled along the sides (not round the ends, which run on into
  // the shoulder and the elbow).
  g.save(); g.clip(path);
  g.fillStyle = rgba(mix(E.C.cloth, SHADOW, 0.45), 0.3);
  for (const sgn of [1, -1]) {
    const an = th + sgn * ph;
    const p = [a[0] + ra * Math.cos(an), a[1] + ra * Math.sin(an)];
    const q = [b[0] + rb * Math.cos(an), b[1] + rb * Math.sin(an)];
    g.fill(ribbon(along(p, q, 8), taper(0.06 * E.s * (sgn > 0 ? 1 : 0.6), 0.2, 0.5)));
  }
  g.restore();
  g.fillStyle = rgba(E.C.line, 0.88);
  for (const sgn of [1, -1]) {
    const an = th + sgn * ph;
    const p = [a[0] + ra * Math.cos(an), a[1] + ra * Math.sin(an)];
    const q = [b[0] + rb * Math.cos(an), b[1] + rb * Math.sin(an)];
    g.fill(ribbon(along(p, q, 10), taper(E.lw * (sgn > 0 ? 1.05 : 0.85), 0.12, 0.45)));
  }
  if (endCap) g.fill(ribbon(arcPts(b, rb, th - ph, th + ph, 10), taper(E.lw * 0.9, 0.3)));
  return path;
}

function drawArm(g, E, side, handAlpha) {
  const s = E.s;
  const S = E.pt(SH[side]); const El = E.pt(EL[side]);
  let W = E.pt(WR[side]);
  const h0 = HAND0[side];
  // End the forearm at the hand's own wrist when there is one near the body's.
  if (handAlpha > 0 && E.has(h0) && dist2(W, E.pt(h0)) < 0.4 * s) W = lerp2(W, E.pt(h0), clamp(handAlpha * 1.5, 0, 1));
  const fore = sub2(W, El);
  const fl = len2(fore);
  const cuff = fl > 1e-3 ? add2(W, fore, -Math.min(0.1 * s, 0.4 * fl) / fl) : W;
  const rS = 0.12 * s; const rE = 0.1 * s; const rC = 0.082 * s;
  // The sleeve starts a little inside the shoulder, so its round top sits
  // within the torso's shoulder line instead of standing up like a pad.
  const { M } = torsoFrame(E);
  const S0 = lerp2(S, M, 0.08);
  sleeve(g, E, S0, rS, El, rE);
  // The outside of the elbow, where the two segments meet.
  const up = sideAngles(S0, rS, El, rE); const lo = sideAngles(El, rE, cuff, rC);
  let turn = lo.th - up.th;
  while (turn > Math.PI) turn -= TAU;
  while (turn < -Math.PI) turn += TAU;
  sleeve(g, E, El, rE, cuff, rC, { endCap: true });
  if (Math.abs(turn) > 0.12) {
    g.fillStyle = rgba(E.C.line, 0.85);
    const a0 = turn > 0 ? up.th - up.ph : lo.th + lo.ph;
    let a1 = turn > 0 ? lo.th - lo.ph : up.th + up.ph;
    while (a1 < a0) a1 += TAU;
    if (a1 - a0 < Math.PI) g.fill(ribbon(arcPts(El, rE, a0, a1, 8), taper(E.lw, 0.5)));
    // The fold on the inside of the bend.
    if (Math.abs(turn) > 0.5) {
      const inner = turn > 0 ? up.th + up.ph : up.th - up.ph;
      const c0 = [El[0] + Math.cos(inner) * rE * 0.95, El[1] + Math.sin(inner) * rE * 0.95];
      const c1 = [El[0] + Math.cos(inner) * rE * 0.3, El[1] + Math.sin(inner) * rE * 0.3];
      g.fillStyle = rgba(E.C.line, 0.5);
      g.fill(ribbon(along(c0, c1, 5), taper(E.lw * 0.8, 0.2, 0.3)));
    }
  }
  return { x: cuff[0], y: cuff[1], r: rC, dir: fl > 1e-3 ? [fore[0] / fl, fore[1] / fl] : [0, 1] };
}

function drawCuff(g, E, cuff) {
  const back = add2([cuff.x, cuff.y], cuff.dir, -0.07 * E.s);
  const p = new Path2D(); capsule(p, back[0], back[1], cuff.r, cuff.x, cuff.y, cuff.r * 1.04);
  g.fillStyle = rgba(mix(E.C.cloth, SHADOW, 0.1)); g.fill(p);
  const { th, ph } = sideAngles(back, cuff.r, [cuff.x, cuff.y], cuff.r * 1.04);
  g.fillStyle = rgba(E.C.line, 0.88);
  g.fill(ribbon(arcPts([cuff.x, cuff.y], cuff.r * 1.04, th - ph, th + ph, 10), taper(E.lw, 0.35)));
  for (const sgn of [1, -1]) {
    const an = th + sgn * ph;
    g.fill(ribbon(along([back[0] + cuff.r * Math.cos(an), back[1] + cuff.r * Math.sin(an)],
      [cuff.x + cuff.r * 1.04 * Math.cos(an), cuff.y + cuff.r * 1.04 * Math.sin(an)], 4), taper(E.lw * 0.9, 0.5)));
  }
}

// --- head ---------------------------------------------------------------------

function headFromPose(E) {
  // A head sketched from the body model's ears, eyes, nose and mouth.
  if (!E.has(7) || !E.has(8)) return null;
  const eR = E.pt(8); const eL = E.pt(7);
  const across = sub2(eL, eR);
  const w = len2(across) * 1.02;
  const u = unit2(across);
  let up = [u[1], -u[0]];
  if (up[1] > 0) up = [-up[0], -up[1]];
  const c = add2(lerp2(eR, eL, 0.5), up, -0.05 * w);
  const pts = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU;
    const x = Math.cos(a) * w * 0.5;
    const y = Math.sin(a) * w * 0.66 * (Math.sin(a) > 0 ? 1.05 : 1);
    pts.push([c[0] + u[0] * x - up[0] * y, c[1] + u[1] * x - up[1] * y]);
  }
  return { oval: pts, centre: c, up, across: u, fw: w, fh: w * 1.3 };
}

function headFromFace(E) {
  const oval = OVAL.map((i) => E.pt(i));
  const top = E.pt(F_TOP); const chin = E.pt(F_CHIN);
  const right = E.pt(F_RIGHT); const left = E.pt(F_LEFT);
  let cx = 0; let cy = 0;
  for (const p of oval) { cx += p[0]; cy += p[1]; }
  const centre = [cx / oval.length, cy / oval.length];
  return { oval, centre, up: unit2(sub2(top, chin)), across: unit2(sub2(left, right)), fw: dist2(left, right), fh: dist2(top, chin) };
}

function drawHead(g, E, head, featureAlpha) {
  const { oval, centre, up, across, fw, fh } = head;
  const lw = E.lw;
  // Hair: a soft cap behind the head, the upper half of the oval grown outward.
  const hair = [];
  const n = oval.length;
  for (let i = 0; i < n; i++) {
    const p = oval[i];
    const r = sub2(p, centre);
    const h = (r[0] * up[0] + r[1] * up[1]) / (fh / 2);      // -1 chin .. 1 crown
    if (h < 0.1) continue;
    const k = clamp((h - 0.1) / 0.9, 0, 1);
    const grow = 0.2 * Math.pow(k, 0.9);
    hair.push(add2(add2(p, unit2(r), grow * fw * 0.55), up, 0.05 * fh * k));
  }
  // When the head turns, the back of the head comes into view behind the
  // face: the body model's ears say how far round it has gone.
  const ears = E.has(7) && E.has(8) ? [E.pt(8), E.pt(7)] : null;
  if (ears && hair.length) {
    const em = lerp2(ears[0], ears[1], 0.5);
    const off = sub2(em, centre);
    const along = clamp((off[0] * across[0] + off[1] * across[1]) / fw, -0.5, 0.5);
    if (Math.abs(along) > 0.03) {
      const shift = [across[0] * along * fw * 1.1, across[1] * along * fw * 1.1];
      const n0 = hair.length;
      for (let i = 0; i < n0; i++) hair.push(add2(hair[i], shift));
    }
  }
  let hairPath = null;
  if (hair.length > 4) {
    const cap = hull(hair);
    hairPath = polyPath(spline(cap, true, 3));
    g.fillStyle = rgba(mix(E.C.hair, E.C.light, 0.08));
    g.fill(hairPath);
    washFinish(g, E, hairPath, E.C.hair, { grain: 0.35, edge: 0, width: 0.03 });
    g.save(); g.clip(hairPath);
    const hl = g.createRadialGradient(...add2(add2(centre, up, 0.55 * fh), across, -0.25 * fw), 0,
      ...add2(add2(centre, up, 0.55 * fh), across, -0.25 * fw), 0.45 * fw);
    hl.addColorStop(0, rgba(E.C.light, 0.18));
    hl.addColorStop(1, rgba(E.C.light, 0));
    g.fillStyle = hl; g.fill(hairPath);
    g.restore();
    // Its outline; the face, drawn next, hides the part behind it.
    g.fillStyle = rgba(E.C.hair, 0.9);
    g.fill(ribbon(spline(cap, true, 3), () => lw * 0.9, true));
  }
  // Ears, half hidden behind the cheeks.
  for (const k of [-1, 1]) {
    const edge = ears
      ? add2(add2(ears[k < 0 ? 0 : 1], unit2(sub2(ears[k < 0 ? 0 : 1], centre)), 0.05 * fw), up, -0.02 * fh)
      : add2(add2(centre, across, k * fw * 0.47), up, 0.03 * fh);
    const p = new Path2D();
    const a = Math.atan2(up[1], up[0]);
    p.ellipse(edge[0], edge[1], 0.13 * fh, 0.066 * fw, a, 0, TAU);
    const po = new Path2D(); po.ellipse(edge[0], edge[1], 0.13 * fh + lw, 0.066 * fw + lw, a, 0, TAU);
    g.fillStyle = rgba(E.C.skinLine); g.fill(po);
    g.fillStyle = rgba(E.C.skin); g.fill(p);
    g.fillStyle = rgba(E.C.shade, 0.9);
    const ip = new Path2D(); ip.ellipse(edge[0] + across[0] * k * 0.012 * fw, edge[1] + across[1] * k * 0.012 * fw, 0.08 * fh, 0.035 * fw, a, 0, TAU);
    g.fill(ip);
  }
  // The face.
  const faceLine = spline(oval, true, 5);
  const face = polyPath(faceLine);
  g.fillStyle = rgba(E.C.skin);
  g.fill(face);
  g.save(); g.clip(face);
  const lx = add2(centre, across, -0.55 * fw * E.dir); const rx = add2(centre, across, 0.6 * fw * E.dir);
  const sg = g.createLinearGradient(lx[0], lx[1], rx[0], rx[1]);
  sg.addColorStop(0, rgba(E.C.light, 0.12));
  sg.addColorStop(0.55, rgba(E.C.shade, 0));
  sg.addColorStop(1, rgba(E.C.shade, 0.55));
  g.fillStyle = sg; g.fill(face);
  // Under the hairline.
  if (hairPath) {
    const hg = g.createLinearGradient(...add2(centre, up, 0.5 * fh), ...add2(centre, up, 0.25 * fh));
    hg.addColorStop(0, rgba(E.C.shade, 0.55));
    hg.addColorStop(1, rgba(E.C.shade, 0));
    g.fillStyle = hg; g.fill(face);
  }
  g.restore();
  washFinish(g, E, face, E.C.skin, { grain: 0.18, edge: 0.28, width: 0.025 });
  // The hairline over the forehead.
  if (hairPath) {
    const fringe = [];
    for (let i = 0; i < n; i++) {
      const r = sub2(oval[i], centre);
      const h = (r[0] * up[0] + r[1] * up[1]) / (fh / 2);
      if (h > 0.62) fringe.push(add2(oval[i], unit2(r), -0.035 * fh * (h - 0.55)));
    }
    if (fringe.length > 2) {
      const ang = (p) => (p[0] - centre[0]) * across[0] + (p[1] - centre[1]) * across[1];
      fringe.sort((a, b) => ang(a) - ang(b));
      const fp = new Path2D();
      const top = spline(fringe, false, 4);
      polyPath(top.concat(top.slice().reverse().map((p) => add2(p, up, 0.09 * fh))), true, fp);
      g.save(); g.clip(face);
      g.fillStyle = rgba(mix(E.C.hair, E.C.light, 0.08)); g.fill(fp);
      g.restore();
    }
  }
  // Ink round the face: heavier along the jaw on the shaded side.
  g.fillStyle = rgba(E.C.skinLine, 0.95);
  g.fill(ribbon(faceLine, (i, m) => {
    const p = faceLine[i];
    const r = unit2(sub2(p, centre));
    const down = -(r[0] * up[0] + r[1] * up[1]);
    const sideK = (r[0] * across[0] + r[1] * across[1]) * E.dir;
    return lw * (0.55 + 0.45 * clamp(down, 0, 1) + 0.35 * clamp(sideK, 0, 1));
  }, true));

  if (featureAlpha > 0.01 && head.features) {
    g.save();
    g.globalAlpha = featureAlpha;
    head.features(g, E, head);
    g.restore();
  } else if (featureAlpha > 0.01 && head.poseFeatures) {
    g.save();
    g.globalAlpha = featureAlpha;
    head.poseFeatures(g, E, head);
    g.restore();
  }
}

function faceFeatures(g, E, head) {
  const { fw, fh, up, centre } = head;
  const ink = E.C.skinLine;
  const lw = E.lw;
  const P = (i) => E.pt(i);

  // Cheeks: a breath of colour.
  for (const k of [0, 1]) {
    const eye = EYES[k];
    const c = lerp2(P(eye.lo[4]), P(k ? LIP_OUT_UP[10] : LIP_OUT_UP[0]), 0.55);
    const rg = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], 0.16 * fw);
    rg.addColorStop(0, rgba(E.C.lip, 0.2));
    rg.addColorStop(1, rgba(E.C.lip, 0));
    g.fillStyle = rg;
    g.fillRect(c[0] - 0.2 * fw, c[1] - 0.2 * fw, 0.4 * fw, 0.4 * fw);
  }

  // Brows: a tapered stroke of the hair colour between the brow's two edges.
  for (const b of BROWS) {
    const top = b.up.map(P); const bot = b.lo.map(P);
    const mid = top.map((p, i) => lerp2(p, bot[i], 0.45));
    const thick = top.map((p, i) => dist2(p, bot[i]));
    const line = spline(mid, false, 4);
    g.fillStyle = rgba(E.C.hair, 0.92);
    g.fill(ribbon(line, (i, n) => {
      const t = i / (n - 1);
      const w = lerp(thick[0], thick[thick.length - 1], t) * 0.62;
      return Math.max(lw * 0.8, w) * (t < 0.2 ? 0.45 + 2.75 * t : 1) * (t > 0.85 ? 1 - (t - 0.85) * 2.5 : 1);
    }));
  }

  // Eyes: the opening, the iris clipped by the lids, a firm upper lid.
  for (const e of EYES) {
    const upP = e.up.map(P); const loP = e.lo.map(P);
    const width = dist2(upP[0], upP[upP.length - 1]);
    let open = 0;
    for (let i = 2; i < 7; i++) open = Math.max(open, dist2(upP[i], loP[i]));
    const upper = spline(upP, false, 4);
    const lower = spline(loP, false, 4);
    if (open > width * 0.12) {
      const hole = polyPath(upper.concat(lower.slice().reverse()));
      g.fillStyle = rgba(mix(E.C.light, E.C.skin, 0.18));
      g.fill(hole);
      g.save(); g.clip(hole);
      let cx = 0; let cy = 0;
      for (const p of upP.concat(loP)) { cx += p[0]; cy += p[1]; }
      cx /= upP.length + loP.length; cy /= upP.length + loP.length;
      const r = width * 0.2;
      const iris = new Path2D(); circle(iris, cx, cy, r);
      g.fillStyle = rgba(mix(E.C.hair, E.C.skinLine, 0.3)); g.fill(iris);
      g.fillStyle = rgba(E.C.light, 0.85);
      const glint = new Path2D(); circle(glint, cx - r * 0.35, cy - r * 0.4, r * 0.28); g.fill(glint);
      // The lid's shadow on the eyeball.
      g.fillStyle = rgba(E.C.shade, 0.4);
      g.fill(ribbon(upper, () => open * 0.45));
      g.restore();
    }
    g.fillStyle = rgba(ink);
    g.fill(ribbon(upper, taper(Math.max(lw * 1.1, width * 0.1), 0.25, 0.4)));
    g.fillStyle = rgba(ink, 0.45);
    g.fill(ribbon(lower.slice(2, -1), taper(lw * 0.7, 0.1)));
    // A crease above the lid.
    const crease = upper.slice(3, -3).map((p) => add2(p, up, open * 0.55 + width * 0.06));
    g.fillStyle = rgba(ink, 0.35);
    g.fill(ribbon(crease, taper(lw * 0.6, 0.1)));
  }

  // Nose: the body model's nose tip when it sits inside the face, else placed
  // between the eyes and the lip.
  const eyesMid = lerp2(P(F_EYE_IN[0]), P(F_EYE_IN[1]), 0.5);
  const lip = P(F_LIP_TOP);
  let tip = lerp2(eyesMid, lip, 0.66);
  if (E.has(0)) {
    const t = E.pt(0);
    if (dist2(t, tip) < 0.25 * fw) tip = lerp2(tip, t, 0.7);
  }
  const across = head.across;
  const k = E.dir;
  const nose = [
    add2(add2(eyesMid, across, 0.05 * fw * k), up, -0.05 * fh),
    add2(lerp2(eyesMid, tip, 0.55), across, 0.07 * fw * k),
    add2(add2(tip, across, 0.06 * fw * k), up, 0.01 * fh),
    add2(add2(tip, across, 0.02 * fw * k), up, -0.035 * fh),
    add2(add2(tip, across, -0.05 * fw * k), up, -0.02 * fh),
  ];
  g.fillStyle = rgba(ink, 0.6);
  g.fill(ribbon(spline(nose, false, 4), taper(lw * 0.9, 0.1, 0.7)));
  const nost = [add2(add2(tip, across, -0.09 * fw * k), up, -0.005 * fh), add2(add2(tip, across, -0.11 * fw * k), up, -0.04 * fh), add2(add2(tip, across, -0.06 * fw * k), up, -0.05 * fh)];
  g.fillStyle = rgba(ink, 0.45);
  g.fill(ribbon(spline(nost, false, 4), taper(lw * 0.7, 0.1)));
  const ns = new Path2D(); circle(ns, tip[0] + across[0] * 0.02 * fw * k, tip[1] + across[1] * 0.02 * fw * k, 0.06 * fw);
  g.fillStyle = rgba(E.C.shade, 0.25); g.fill(ns);

  // Lips: the outer shape in a warm wash, the opening dark, the line between
  // them inked - an open or pursed mouth is part of many signs.
  const outer = spline(LIP_OUT_UP.map(P), false, 4).concat(spline(LIP_OUT_LO.map(P), false, 4).reverse());
  const lipsPath = polyPath(outer);
  g.fillStyle = rgba(mix(E.C.skin, E.C.lip, 0.7));
  g.fill(lipsPath);
  const iu = spline(LIP_IN_UP.map(P), false, 4);
  const il = spline(LIP_IN_LO.map(P), false, 4);
  let gap = 0;
  for (let i = 3; i < 8; i++) gap = Math.max(gap, dist2(P(LIP_IN_UP[i]), P(LIP_IN_LO[i])));
  const mouthW = dist2(P(LIP_OUT_UP[0]), P(LIP_OUT_UP[10]));
  if (gap > mouthW * 0.06) {
    g.fillStyle = rgba(mix(E.C.hair, E.C.lip, 0.25));
    g.fill(polyPath(iu.concat(il.slice().reverse())));
    if (gap > mouthW * 0.18) {
      g.save(); g.clip(polyPath(iu.concat(il.slice().reverse())));
      g.fillStyle = rgba(E.C.light, 0.85);
      g.fill(ribbon(iu, () => gap * 0.35));
      g.restore();
    }
  }
  // Lower lip catches the light.
  g.save(); g.clip(lipsPath);
  const lc = lerp2(P(LIP_OUT_LO[5]), P(LIP_IN_LO[5]), 0.5);
  const lh = g.createRadialGradient(lc[0], lc[1], 0, lc[0], lc[1], mouthW * 0.3);
  lh.addColorStop(0, rgba(E.C.light, 0.28)); lh.addColorStop(1, rgba(E.C.light, 0));
  g.fillStyle = lh; g.fill(lipsPath);
  g.restore();
  g.fillStyle = rgba(ink, 0.85);
  g.fill(ribbon(iu, taper(Math.max(lw, mouthW * 0.045), 0.2)));
  if (gap > mouthW * 0.06) {
    g.fillStyle = rgba(ink, 0.6);
    g.fill(ribbon(il, taper(lw * 0.8, 0.2)));
  }
  g.fillStyle = rgba(E.C.skinLine, 0.3);
  g.fill(ribbon(spline(LIP_OUT_LO.map(P), false, 4).slice(4, -4), taper(lw * 0.7, 0.1)));
}

function poseFeatures(g, E, head) {
  const ink = E.C.skinLine;
  const lw = E.lw;
  const { across, fw } = head;
  for (const i of [2, 5]) {
    if (!E.has(i)) continue;
    const c = E.pt(i);
    g.fillStyle = rgba(ink, 0.8);
    g.fill(ribbon([add2(c, across, -0.09 * fw), c, add2(c, across, 0.09 * fw)], taper(lw * 1.2, 0.2)));
  }
  if (E.has(9) && E.has(10)) {
    const a = E.pt(9); const b = E.pt(10);
    g.fillStyle = rgba(ink, 0.7);
    g.fill(ribbon([a, lerp2(a, b, 0.5), b], taper(lw, 0.2)));
  }
}

// --- the whole figure ---------------------------------------------------------

/**
 * Draw one frame of the figure.
 *
 * `frame` is a 203-point frame (Float32Array(609)): normalised shoulder-width
 * units (from src/replay-data.js or normaliseClip), or pixels from
 * holisticFrame, which are normalised on the spot from that frame's shoulders.
 *
 * opts:
 *   mirror    draw as in a mirror (x flipped)
 *   box       {x, y, w, h} in canvas pixels to draw into (default: the canvas)
 *   view      {cx, cy, w, h} the part of the figure's space to fit (default VIEW)
 *   colors    from figureColors() (default: read from the canvas's CSS)
 *   alpha     [body, face, left hand, right hand] opacity (default: what is seen)
 *   zScale    how much larger z has to be to match x and y (fitZScale())
 *   handSize  [left, right] palm lengths in shoulder widths (steadier than per frame)
 *   sides     [left, right] finger fold from fingerSides(), to keep it steady
 *   backdrop  a pale watercolour wash behind the figure (default true)
 *   clear     clear the box first (default true)
 *   debug     dot the raw landmarks over the drawing
 */
export function drawFigure(ctx, frame, opts = {}) {
  const canvas = ctx.canvas;
  const box = opts.box ?? { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const view = opts.view ?? VIEW;
  if (opts.clear !== false) ctx.clearRect(box.x, box.y, box.w, box.h);
  if (!frame || box.w < 2 || box.h < 2) return;
  let f = frame;
  if (isPixelSpace([f])) f = withoutShoulders([f])?.[0] ?? normaliseClip([f]);
  const mirror = !!opts.mirror;
  const s = Math.min(box.w / view.w, box.h / view.h);
  const sx = mirror ? -s : s;
  const ox = box.x + box.w / 2 - sx * view.cx;
  const oy = box.y + box.h / 2 - s * view.cy;
  const zScale = opts.zScale ?? DEFAULT_Z;
  const C = opts.colors ?? figureColors(canvas);
  const alpha = opts.alpha ?? presence(f);

  const E = {
    f, C, s, zScale, dir: mirror ? -1 : 1,
    lw: Math.max(0.9, 0.012 * s),
    handSize: opts.handSize, sides: opts.sides, cuffs: [null, null],
    has: (i) => seen(f, i),
    pt: (i) => [ox + sx * f[i * 3], oy + s * f[i * 3 + 1]],
    pt3: (i) => [ox + sx * f[i * 3], oy + s * f[i * 3 + 1], f[i * 3 + 2] * zScale * s],
    world: (x, y) => [ox + sx * x, oy + s * y],
  };

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  E.grain = grainPattern(ctx);
  if (opts.backdrop !== false) backdrop(ctx, E, opts.seed);

  const L = layer(canvas, 'figure');
  const g = L.g;
  E.grain = grainPattern(g);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const aBody = alpha[0];
  const withAlpha = (a, draw) => {
    if (a <= 0.005) return;
    if (a >= 0.995) { draw(g); return; }
    const part = layer(canvas, 'part');
    part.g.lineJoin = 'round';
    part.g.lineCap = 'round';
    draw(part.g);
    g.globalAlpha = a;
    g.drawImage(part.cv, 0, 0);
    g.globalAlpha = 1;
  };

  const faceOk = seen(f, F_TOP) && seen(f, F_CHIN);
  const bodyOk = aBody > 0 && E.has(11) && E.has(12);
  if (bodyOk) {
    withAlpha(aBody, (t) => {
      drawNeck(t, E, faceOk);
      drawTorso(t, E);
    });
  }
  let head = null;
  if (faceOk) {
    head = headFromFace(E);
    head.features = faceFeatures;
  } else if (bodyOk) {
    head = headFromPose(E);
    if (head) head.poseFeatures = poseFeatures;
  }
  if (head) {
    const headAlpha = faceOk ? Math.max(alpha[1], bodyOk ? aBody : 0) : aBody * 0.8;
    const featureAlpha = faceOk ? alpha[1] / Math.max(headAlpha, 1e-3) : 0.6;
    withAlpha(headAlpha, (t) => drawHead(t, E, head, clamp(featureAlpha, 0, 1)));
  }

  // Arms, the farther first, then the hands in the same order.
  const handA = [alpha[2], alpha[3]];
  const handOk = [0, 1].map((k) => handA[k] > 0.005 && seen(f, HAND0[k]) && seen(f, HAND0[k] + 9));
  let order = [1, 0];
  if (bodyOk && E.has(WR[0]) && E.has(WR[1])) {
    order = f[WR[0] * 3 + 2] > f[WR[1] * 3 + 2] ? [0, 1] : [1, 0];
  }
  if (bodyOk) {
    withAlpha(aBody, (t) => {
      for (const k of order) {
        if (!E.has(EL[k]) || !E.has(WR[k])) continue;
        E.cuffs[k] = drawArm(t, E, k, handOk[k] ? handA[k] : 0);
      }
    });
  }
  for (const k of order) {
    if (handOk[k]) {
      withAlpha(handA[k], (t) => drawHand(t, E, k));
    } else if (bodyOk && E.has(WR[k]) && !seen(f, HAND0[k])) {
      drawMitten(g, E, k, GHOST * aBody);
    }
  }

  // The figure fades out below the waist, like a sketch that stops.
  g.globalCompositeOperation = 'destination-in';
  const y0 = oy + s * FADE_TOP; const y1 = oy + s * FADE_BOTTOM;
  const fg = g.createLinearGradient(0, y0, 0, y1);
  fg.addColorStop(0, 'rgba(0,0,0,1)');
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fg;
  g.fillRect(0, 0, L.cv.width, L.cv.height);
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(L.cv, 0, 0);

  if (opts.debug) {
    ctx.fillStyle = 'rgba(200,30,30,0.9)';
    for (let i = 0; i < N_POINTS; i++) {
      if (!seen(f, i) || (i >= 25 && i < 33)) continue;
      const [x, y] = E.pt(i);
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }
  ctx.restore();
}

// --- a whole clip ---------------------------------------------------------------

/**
 * The factor that brings z into proportion with x and y for these frames,
 * fitted from the hands: the palm is rigid, so the right factor is the one
 * that keeps its bones the same length however the hand turns.
 */
export function fitZScale(frames) {
  const bones = [[0, 5], [0, 17], [5, 17], [0, 9], [5, 9], [9, 13], [13, 17]];
  const hands = [];
  for (const f of frames) {
    for (const h0 of HAND0) {
      if (seen(f, h0) && seen(f, h0 + 5) && seen(f, h0 + 9) && seen(f, h0 + 17)) hands.push([f, h0]);
    }
  }
  if (hands.length < 8) return DEFAULT_Z;
  const step = Math.max(1, Math.floor(hands.length / 120));
  let best = DEFAULT_Z; let bestCv = Infinity;
  for (let k = 300; k <= 12000; k *= 1.12) {
    let cv = 0;
    for (const [a, b] of bones) {
      let sum = 0; let sq = 0; let n = 0;
      for (let i = 0; i < hands.length; i += step) {
        const [f, h0] = hands[i];
        const A = (h0 + a) * 3; const B = (h0 + b) * 3;
        const l = Math.hypot(f[A] - f[B], f[A + 1] - f[B + 1], k * (f[A + 2] - f[B + 2]));
        sum += l; sq += l * l; n++;
      }
      const m = sum / n;
      cv += Math.sqrt(Math.max(0, sq / n - m * m)) / (m || 1);
    }
    if (cv < bestCv) { bestCv = cv; best = k; }
  }
  return best;
}

/**
 * Pixel frames in which the shoulders were never seen (a learner sitting too
 * close to the camera) cannot be normalised by them. Scale them by the face
 * instead - a face is about 0.46 shoulder widths across, its centre about 0.75
 * above the shoulders - or failing that by the palm. Null when the shoulders
 * were seen, so the usual normalisation applies.
 */
function withoutShoulders(frames) {
  if (frames.some((f) => seen(f, 11) && seen(f, 12))) return null;
  let unit = 0; let n = 0;
  const centres = [];
  for (const f of frames) {
    if (!seen(f, F_RIGHT) || !seen(f, F_LEFT)) continue;
    let x = 0; let y = 0;
    for (const i of OVAL) { x += f[i * 3]; y += f[i * 3 + 1]; }
    const u = Math.hypot(f[F_LEFT * 3] - f[F_RIGHT * 3], f[F_LEFT * 3 + 1] - f[F_RIGHT * 3 + 1]) / 0.46;
    unit += u; n++;
    centres.push([x / OVAL.length, y / OVAL.length + 0.75 * u]);
  }
  if (!n) {
    for (const f of frames) {
      for (const h0 of HAND0) {
        if (!seen(f, h0) || !seen(f, h0 + 9)) continue;
        const u = Math.hypot(f[(h0 + 9) * 3] - f[h0 * 3], f[(h0 + 9) * 3 + 1] - f[h0 * 3 + 1]) / HAND_SIZE;
        unit += u; n++;
        centres.push([f[h0 * 3], f[h0 * 3 + 1] - 0.5 * u]);
      }
    }
  }
  if (!n) return null;
  unit /= n;
  const cx = centres.reduce((a, c) => a + c[0], 0) / centres.length;
  const cy = centres.reduce((a, c) => a + c[1], 0) / centres.length;
  return frames.map((f) => {
    const o = new Float32Array(f.length);
    for (let i = 33; i < N_POINTS; i++) {
      if (!seen(f, i)) continue;
      o[i * 3] = (f[i * 3] - cx) / unit;
      o[i * 3 + 1] = (f[i * 3 + 1] - cy) / unit;
      o[i * 3 + 2] = f[i * 3 + 2] / unit || 1e-9;
    }
    return o;
  });
}

/**
 * Bodies no signer makes - shoulders standing on end, or suddenly half or
 * twice their usual width (a title card, a cut, a detector gone astray) - are
 * cleared; then the clip is re-centred on the median of the bodies that are
 * left, so every sign is drawn at the same size. In place.
 */
function steadyBodies(frames) {
  const width = (f) => Math.hypot(f[33] - f[36], f[34] - f[37]);
  const upright = (f) => Math.abs(f[34] - f[37]) < 0.8 * Math.abs(f[33] - f[36]);
  const ok = frames.map((f) => seen(f, 11) && seen(f, 12) && upright(f));
  const med = (v) => { const a = v.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1] : NaN; };
  const md = med(frames.filter((_, t) => ok[t]).map(width));
  frames.forEach((f, t) => {
    if (seen(f, 11) && seen(f, 12) && !(ok[t] && width(f) > 0.6 * md && width(f) < 1.6 * md)) {
      ok[t] = false;
      f.fill(0, 0, 33 * 3);
    }
  });
  const valid = frames.filter((_, t) => ok[t]);
  if (!valid.length) return;
  const sc = 1 / Math.max(med(valid.map(width)), 1e-6);
  const cx = med(valid.map((f) => (f[33] + f[36]) / 2));
  const cy = med(valid.map((f) => (f[34] + f[37]) / 2));
  if (Math.abs(sc - 1) < 0.03 && Math.abs(cx) < 0.03 && Math.abs(cy) < 0.03) return;
  for (const f of frames) {
    for (let i = 0; i < N_POINTS; i++) {
      if (!seen(f, i)) continue;
      f[i * 3] = (f[i * 3] - cx) * sc;
      f[i * 3 + 1] = (f[i * 3 + 1] - cy) * sc;
      f[i * 3 + 2] = f[i * 3 + 2] * sc || 1e-9;
    }
  }
}

/**
 * Hands the tracker put in the wrong slot: one whose wrist is far from the
 * body's wrist on that side, or a second copy of the other hand. Cleared in
 * place, so they count as not seen.
 */
function dropStrayHands(f) {
  if (!seen(f, 11) || !seen(f, 12)) return;
  const off = [0, 1].map((h) => {
    const h0 = HAND0[h]; const w = WR[h];
    if (!seen(f, h0) || !seen(f, w)) return -1;
    return Math.hypot(f[h0 * 3] - f[w * 3], f[h0 * 3 + 1] - f[w * 3 + 1]);
  });
  const clear = (h) => f.fill(0, HAND0[h] * 3, (HAND0[h] + 21) * 3);
  if (off[0] >= 0 && off[1] >= 0) {
    const gap = Math.hypot(f[LEFT0 * 3] - f[RIGHT0 * 3], f[LEFT0 * 3 + 1] - f[RIGHT0 * 3 + 1]);
    if (gap < 0.08) clear(off[0] > off[1] ? 0 : 1);
  }
  for (let h = 0; h < 2; h++) if (off[h] > 0.5) clear(h);
}

/**
 * Frames -> everything the player needs, once: implausible bodies and stray
 * hands dropped and the clip re-centred for display (the frames themselves
 * stay in normaliseClip's space; this only steadies the drawing), idle
 * frames before and after the sign trimmed (trim), every part held through
 * the frames the tracker lost it (moved along with the body) with an opacity
 * that fades it, a steady palm size, finger folds smoothed over time, and a
 * view that fits the whole clip.
 */
export function prepareClip(frames, { zScale, fps = 15, trim = false, fadeFrames = 4 } = {}) {
  let src = frames ?? [];
  // A learner's attempt arrives in pixels: normalise it as normaliseClip does
  // (or by the face, if the shoulders were never in view), clean it, then gap
  // fill and smooth it the way tools/pack-replay.py treated the references.
  const pixels = src.length > 0 && isPixelSpace(src);
  if (pixels) {
    src = withoutShoulders(src);
    if (!src) {
      const flat = normaliseClip(frames);
      src = frames.map((_, t) => flat.subarray(t * N_POINTS * 3, (t + 1) * N_POINTS * 3));
    }
  }
  let out = src.map((f) => Float32Array.from(f));
  steadyBodies(out);
  out.forEach(dropStrayHands);
  if (pixels) {
    out = displayFrames(out);
    out.forEach(dropStrayHands);      // a gap filled across a fast move can drift off the arm
  }
  if (trim && out.length > 2) {
    const active = (f) => {
      for (let h = 0; h < 2; h++) {
        if (seen(f, HAND0[h]) && f[HAND0[h] * 3 + 1] < 1.2) return true;
        if (seen(f, 11) && seen(f, WR[h]) && f[WR[h] * 3 + 1] < 1.1) return true;
      }
      return false;
    };
    let first = out.findIndex(active);
    if (first >= 0) {
      let last = out.length - 1;
      while (last > first && !active(out[last])) last--;
      const margin = Math.round(0.4 * fps);
      out = out.slice(Math.max(0, first - margin), Math.min(out.length, last + margin + 1));
    }
  }
  const T = out.length;
  const alpha = new Float32Array(T * 4);
  const empty = { frames: out, alpha, zScale: zScale ?? DEFAULT_Z, handSize: [HAND_SIZE, HAND_SIZE], sides: [null, null], view: VIEW };
  if (!T) return empty;
  const z = zScale ?? fitZScale(out);
  const pres = out.map(presence);
  const PARTS = [[0, 25], [FACE0, LEFT0], [LEFT0, RIGHT0], [RIGHT0, N_POINTS]];
  const anchor = [null, 0, WR[0], WR[1]];       // what a held part moves with
  const orig = out.map((f) => f.slice());
  for (let k = 0; k < 4; k++) {
    const [lo, hi] = PARTS[k];
    let prev = -1;
    const next = new Int32Array(T).fill(-1);
    for (let t = T - 1, n = -1; t >= 0; t--) { if (pres[t][k]) n = t; next[t] = n; }
    for (let t = 0; t < T; t++) {
      if (pres[t][k]) { prev = t; alpha[t * 4 + k] = 1; continue; }
      const nx = next[t];
      const from = prev >= 0 && (nx < 0 || t - prev <= nx - t) ? prev : nx;
      if (from < 0) continue;
      const d = Math.abs(t - from);
      const a = anchor[k];
      let dx = 0; let dy = 0; let dz = 0;
      const moves = a !== null && pres[t][0] && pres[from][0] && seen(orig[t], a) && seen(orig[from], a);
      if (moves) {
        dx = orig[t][a * 3] - orig[from][a * 3];
        dy = orig[t][a * 3 + 1] - orig[from][a * 3 + 1];
        dz = orig[t][a * 3 + 2] - orig[from][a * 3 + 2];
      }
      for (let i = lo; i < hi; i++) {
        if (!seen(orig[from], i)) { out[t].fill(0, i * 3, i * 3 + 3); continue; }
        out[t][i * 3] = orig[from][i * 3] + dx;
        out[t][i * 3 + 1] = orig[from][i * 3 + 1] + dy;
        out[t][i * 3 + 2] = orig[from][i * 3 + 2] + dz;
        if (out[t][i * 3] === 0 && out[t][i * 3 + 1] === 0 && out[t][i * 3 + 2] === 0) out[t][i * 3 + 2] = 1e-9;
      }
      const fade = Math.max(0, 1 - d / fadeFrames);
      alpha[t * 4 + k] = k >= 2 && moves ? Math.max(GHOST, fade) : fade;
    }
  }
  // A steady palm size per hand, and finger folds smoothed over time.
  const handSize = [HAND_SIZE, HAND_SIZE];
  const sides = [null, null];
  for (let h = 0; h < 2; h++) {
    const Ls = []; const flat = [];
    for (let t = 0; t < T; t++) {
      if (!pres[t][2 + h]) continue;
      Ls.push(palmLength(out[t], HAND0[h], z));
      flat.push(palmLength(out[t], HAND0[h], 0));
    }
    if (!Ls.length) continue;
    const pick = (v, q) => v.sort((a, b) => a - b)[Math.floor((v.length - 1) * q)];
    // Depth corrects for a palm turned away, but only within reason: noisy z
    // must not blow a hand up to twice its drawn size.
    const flatL = pick(flat, 0.9);
    handSize[h] = clamp(pick(Ls, 0.7), flatL * 0.8, flatL * 1.3);
    handSize[h] = clamp(handSize[h], 0.12, 0.5);
    const raw = new Float32Array(T * 5);
    for (let t = 0; t < T; t++) {
      const Q = [];
      for (let j = 0; j < 21; j++) {
        const i = (HAND0[h] + j) * 3;
        Q.push([out[t][i], out[t][i + 1], out[t][i + 2] * z]);
      }
      raw.set(fingerSides(Q, handSize[h]), t * 5);
    }
    const sm = new Float32Array(T * 5);
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < 5; k++) {
        let acc = 0; let w = 0;
        for (let d = -2; d <= 2; d++) {
          const u = clamp(t + d, 0, T - 1);
          const wt = [1, 2, 3, 2, 1][d + 2];
          acc += raw[u * 5 + k] * wt; w += wt;
        }
        sm[t * 5 + k] = acc / w;
      }
    }
    sides[h] = sm;
  }
  // Frame the clip: the default view, grown to take in a hand raised high or
  // held out wide, so nothing the signer does leaves the picture.
  let reachX = 0; let top = Infinity;
  const take = (f, i) => {
    reachX = Math.max(reachX, Math.abs(f[i * 3]));
    top = Math.min(top, f[i * 3 + 1]);
  };
  for (let t = 0; t < T; t++) {
    const f = out[t];
    if (alpha[t * 4] > 0.5) for (let i = 0; i <= 16; i++) if (seen(f, i)) take(f, i);
    if (alpha[t * 4 + 1] > 0.5) for (const i of OVAL) take(f, i);
    for (let h = 0; h < 2; h++) {
      if (alpha[t * 4 + 2 + h] < 0.99) continue;
      for (let j = 0; j < 21; j++) if (f[(HAND0[h] + j) * 3 + 1] < FADE_TOP) take(f, HAND0[h] + j);
    }
  }
  const bottom = VIEW.cy + VIEW.h / 2;
  const half = Math.max(VIEW.w / 2, Math.min(3, reachX + 0.14));
  const topY = Math.min(VIEW.cy - VIEW.h / 2, Math.max(-3, (Number.isFinite(top) ? top : 0) - 0.12));
  const view = { cx: VIEW.cx, cy: (topY + bottom) / 2, w: half * 2, h: bottom - topY };
  return { frames: out, alpha, zScale: z, handSize, sides, view };
}

/**
 * A player for one sign on a canvas: createReplay(canvas, frames, opts).
 *
 * frames: decoded reference frames (src/replay-data.js) or a learner's own
 *         pixel frames from holisticFrame; either is normalised the same way.
 * opts:   fps (15), speed (1), mirror (false), loop (true), hold (seconds to
 *         rest on the last frame before looping, 0.6), trim (drop the idle
 *         lead-in and lead-out, true), zScale, view (default: fitted to the
 *         clip), backdrop, onTime(t, duration), onEnd(), onState(playing).
 *
 * Returns { play, pause, toggle, seek(seconds), setSpeed, setMirror, setLoop,
 *           load(frames, {fps, zScale, trim}), redraw, destroy,
 *           duration, currentTime, playing, frameCount }.
 *
 * Give the canvas its size in CSS (a width and an aspect-ratio or height); the
 * player sets its pixel size to match, at the device's pixel ratio, and redraws
 * when it resizes or the theme changes. It never starts on its own: call
 * play() (and leave it paused under prefers-reduced-motion unless asked).
 */
export function createReplay(canvas, frames, opts = {}) {
  const ctx = canvas.getContext('2d');
  let fps = opts.fps ?? 15;
  let speed = opts.speed ?? 1;
  let mirror = !!opts.mirror;
  let loop = opts.loop ?? true;
  const hold = opts.hold ?? 0.6;
  const trim = opts.trim ?? true;
  let clip = prepareClip(frames, { zScale: opts.zScale, fps, trim });
  let T = clip.frames.length;
  let t = 0;
  let playing = false;
  let raf = 0;
  let last = 0;
  let resting = 0;
  let colors = figureColors(canvas);
  const scratch = new Float32Array(N_POINTS * 3);
  const alpha = [0, 0, 0, 0];
  const sides = [new Float32Array(5), new Float32Array(5)];

  const duration = () => Math.max(0, (T - 1) / fps);

  function sample(time) {
    const x = clamp(time * fps, 0, Math.max(0, T - 1));
    const i0 = Math.floor(x);
    const i1 = Math.min(T - 1, i0 + 1);
    const w = x - i0;
    const A = clip.frames[i0]; const B = clip.frames[i1];
    for (let k = 0; k < scratch.length; k++) scratch[k] = A[k] + (B[k] - A[k]) * w;
    for (let k = 0; k < 4; k++) alpha[k] = lerp(clip.alpha[i0 * 4 + k], clip.alpha[i1 * 4 + k], w);
    const sd = [null, null];
    for (let h = 0; h < 2; h++) {
      const S = clip.sides[h];
      if (!S) continue;
      for (let k = 0; k < 5; k++) sides[h][k] = lerp(S[i0 * 5 + k], S[i1 * 5 + k], w);
      sd[h] = sides[h];
    }
    return sd;
  }

  function fit() {
    const r = canvas.getBoundingClientRect?.();
    const dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
    if (r && r.width > 0 && r.height > 0) {
      const w = Math.round(r.width * dpr); const h = Math.round(r.height * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
  }

  function draw() {
    if (!T) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    const sd = sample(t);
    drawFigure(ctx, scratch, {
      mirror, colors, alpha, sides: sd, zScale: clip.zScale, handSize: clip.handSize,
      view: opts.view ?? clip.view, backdrop: opts.backdrop, debug: opts.debug,
    });
    opts.onTime?.(t, duration());
  }

  function tick(now) {
    raf = 0;
    if (!playing) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (resting > 0) {
      resting -= dt;
      if (resting <= 0) t = 0;
    } else {
      t += dt * speed;
      if (t >= duration()) {
        t = duration();
        if (loop) {
          resting = hold;
        } else {
          draw();
          setPlaying(false);
          opts.onEnd?.();
          return;
        }
      }
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function setPlaying(p) {
    if (playing === p) return;
    playing = p;
    if (p) {
      last = 0;
      if (t >= duration() && !loop) t = 0;
      raf ||= requestAnimationFrame(tick);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    opts.onState?.(playing);
  }

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { fit(); draw(); }) : null;
  ro?.observe(canvas);
  const scheme = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const recolour = () => { colors = figureColors(canvas); draw(); };
  scheme?.addEventListener?.('change', recolour);
  const mo = typeof MutationObserver === 'function' ? new MutationObserver(recolour) : null;
  if (mo && typeof document !== 'undefined') {
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  }
  fit();
  draw();

  return {
    play() { setPlaying(true); },
    pause() { setPlaying(false); },
    toggle() { setPlaying(!playing); },
    seek(seconds) { t = clamp(Number(seconds) || 0, 0, duration()); resting = 0; draw(); },
    setSpeed(x) { speed = clamp(Number(x) || 1, 0.1, 4); },
    setMirror(m) { mirror = !!m; draw(); },
    setLoop(l) { loop = !!l; },
    /** Swap in another sign (or attempt) without a new player. */
    load(next, o = {}) {
      if (o.fps) fps = o.fps;
      clip = prepareClip(next, { zScale: o.zScale, fps, trim: o.trim ?? trim });
      T = clip.frames.length;
      t = 0; resting = 0;
      draw();
    },
    redraw() { fit(); colors = figureColors(canvas); draw(); },
    destroy() {
      setPlaying(false);
      ro?.disconnect();
      mo?.disconnect();
      scheme?.removeEventListener?.('change', recolour);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    get duration() { return duration(); },
    get currentTime() { return t; },
    get playing() { return playing; },
    get frameCount() { return T; },
  };
}

// Synthetic hand landmarks for tests.
//
// Fingers are built joint by joint, each segment rotated a little further than
// the last, so "curl" bends the finger rather than just shortening it. Getting
// this wrong makes the extension metric look broken when it is not.

const FINGERS = [
  // angle is the resting direction from the wrist, 0 = straight up, + = right.
  { angle: -1.05, mcp: 0.045, seg: [0.030, 0.024, 0.020], bend: 0.75 }, // thumb
  { angle: -0.26, mcp: 0.078, seg: [0.036, 0.024, 0.018], bend: 1.15 }, // index
  { angle: 0.0, mcp: 0.082, seg: [0.040, 0.026, 0.019], bend: 1.15 },  // middle
  { angle: 0.24, mcp: 0.076, seg: [0.036, 0.024, 0.018], bend: 1.15 }, // ring
  { angle: 0.48, mcp: 0.066, seg: [0.029, 0.019, 0.016], bend: 1.15 }, // pinky
];

/**
 * @param x,y      wrist position in normalised image coords
 * @param curls    per-finger curl 0..1 (thumb, index, middle, ring, pinky),
 *                 or a single number applied to all
 * @param spread   multiplier on the resting finger angles
 */
export function hand(x, y, curls = 0, spread = 1) {
  const c = typeof curls === 'number' ? Array(5).fill(curls) : curls;
  const pts = [{ x, y, z: 0 }];

  FINGERS.forEach((f, i) => {
    const curl = c[i] ?? 0;
    const base = f.angle * spread;
    let px = x + Math.sin(base) * f.mcp;
    let py = y - Math.cos(base) * f.mcp;
    pts.push({ x: px, y: py, z: 0 });

    for (let s = 0; s < 3; s++) {
      const a = base + f.bend * curl * (s + 1);
      px += Math.sin(a) * f.seg[s];
      py -= Math.cos(a) * f.seg[s];
      pts.push({ x: px, y: py, z: 0 });
    }
  });

  return pts;
}

export function handResult(hands, labels) {
  return { landmarks: hands, handedness: labels.map((l) => [{ categoryName: l }]) };
}

/** Rotate a hand about its wrist, for testing orientation detection. */
export function rotate(lms, radians) {
  const [w] = lms;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  return lms.map((p) => {
    const dx = p.x - w.x, dy = p.y - w.y;
    return { x: w.x + dx * cos - dy * sin, y: w.y + dx * sin + dy * cos, z: p.z };
  });
}

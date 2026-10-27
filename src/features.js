// Turns raw MediaPipe landmarks into a compact, comparable feature vector.
//
// The point of this file is invariance. Two people signing the same word sit at
// different distances from the camera, have different hand sizes, and are not
// centred in frame. We strip all of that out and keep only what carries meaning:
// where the hands are relative to the body, and what shape they are in.

export const HAND_SLOTS = 2;          // Left, Right
export const PER_HAND = 1 + 3 + 21 * 3; // presence + wrist offset + 21 relative landmarks
export const DIM = HAND_SLOTS * PER_HAND;
export const SEQ_LEN = 24;            // every recording is resampled to this many frames

// Position relative to the torso matters as much as handshape in sign languages,
// but it is only 3 numbers against 63 shape numbers, so it needs weighting up.
const W_PRESENCE = 2.0;
const W_POSITION = 3.0;
const W_SHAPE = 1.0;

export const WEIGHTS = (() => {
  const w = new Float32Array(DIM);
  for (let h = 0; h < HAND_SLOTS; h++) {
    const base = h * PER_HAND;
    w[base] = W_PRESENCE;
    for (let i = 0; i < 3; i++) w[base + 1 + i] = W_POSITION;
    for (let i = 0; i < 63; i++) w[base + 4 + i] = W_SHAPE;
  }
  return w;
})();

const POSE_LEFT_SHOULDER = 11;
const POSE_RIGHT_SHOULDER = 12;
const WRIST = 0;
const MIDDLE_MCP = 9;

/**
 * Body frame of reference: origin at the midpoint between the shoulders, scale
 * set by shoulder width. Returns null when the pose is not confidently visible,
 * and the caller reuses the last good frame rather than jumping the origin.
 */
export function bodyFrame(poseResult) {
  const pose = poseResult?.landmarks?.[0];
  if (!pose) return null;
  const ls = pose[POSE_LEFT_SHOULDER];
  const rs = pose[POSE_RIGHT_SHOULDER];
  if (!ls || !rs) return null;
  if ((ls.visibility ?? 1) < 0.3 || (rs.visibility ?? 1) < 0.3) return null;

  const scale = Math.hypot(ls.x - rs.x, ls.y - rs.y);
  if (scale < 0.02) return null; // degenerate, usually a bad detection

  return {
    ox: (ls.x + rs.x) / 2,
    oy: (ls.y + rs.y) / 2,
    oz: (ls.z + rs.z) / 2,
    scale,
  };
}

/**
 * One frame -> Float32Array(DIM). Hands that are not on screen contribute zeros,
 * so a one-handed attempt naturally scores badly against a two-handed sign.
 */
export function frameVector(handResult, frame) {
  const out = new Float32Array(DIM);
  if (!frame) return out;

  const hands = handResult?.landmarks ?? [];
  const handedness = handResult?.handedness ?? [];

  for (let i = 0; i < hands.length; i++) {
    const label = handedness[i]?.[0]?.categoryName ?? (i === 0 ? 'Left' : 'Right');
    const slot = label === 'Left' ? 0 : 1;
    const base = slot * PER_HAND;
    if (out[base] === 1) continue; // already filled this slot; ignore the duplicate

    const lms = hands[i];
    const wrist = lms[WRIST];

    // Hand size, used to normalise handshape independently of distance to camera.
    const mcp = lms[MIDDLE_MCP];
    const handScale = Math.max(Math.hypot(wrist.x - mcp.x, wrist.y - mcp.y), 1e-3);

    out[base] = 1;
    out[base + 1] = (wrist.x - frame.ox) / frame.scale;
    out[base + 2] = (wrist.y - frame.oy) / frame.scale;
    out[base + 3] = (wrist.z - frame.oz) / frame.scale;

    for (let j = 0; j < 21; j++) {
      const lm = lms[j];
      const o = base + 4 + j * 3;
      out[o] = (lm.x - wrist.x) / handScale;
      out[o + 1] = (lm.y - wrist.y) / handScale;
      out[o + 2] = (lm.z - wrist.z) / handScale;
    }
  }

  return out;
}

/** True if either hand slot is occupied. */
export function hasHands(vec) {
  return vec[0] === 1 || vec[PER_HAND] === 1;
}

/**
 * Drop the dead air at each end of a recording - the moment before the hands
 * come up and after they drop. Timing varies far more there than in the sign.
 */
export function trim(frames) {
  let start = 0;
  let end = frames.length - 1;
  while (start < frames.length && !hasHands(frames[start])) start++;
  while (end >= 0 && !hasHands(frames[end])) end--;
  if (start > end) return [];
  return frames.slice(start, end + 1);
}

/** Linear resample to SEQ_LEN frames so every recording is directly comparable. */
export function resample(frames, length = SEQ_LEN) {
  if (frames.length === 0) return null;
  if (frames.length === 1) {
    const out = new Float32Array(length * DIM);
    for (let t = 0; t < length; t++) out.set(frames[0], t * DIM);
    return out;
  }

  const out = new Float32Array(length * DIM);
  for (let t = 0; t < length; t++) {
    const pos = (t / (length - 1)) * (frames.length - 1);
    const i = Math.min(Math.floor(pos), frames.length - 2);
    const f = pos - i;
    const a = frames[i];
    const b = frames[i + 1];
    const o = t * DIM;
    for (let d = 0; d < DIM; d++) out[o + d] = a[d] * (1 - f) + b[d] * f;
  }
  return out;
}

/** Full pipeline: raw per-frame vectors -> stored sequence, or null if unusable. */
export function buildSequence(frames) {
  const trimmed = trim(frames);
  if (trimmed.length < 3) return null;
  return resample(trimmed);
}

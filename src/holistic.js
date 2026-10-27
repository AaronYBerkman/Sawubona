// MediaPipe results -> the 203-point pose SignCLIP reads.
//
// Browser twin of tools/holistic.py (frame assembly) and tools/signclip.py
// (normalisation). The reference embeddings were made from exactly this
// layout, so a point in the wrong slot here is a different input to the model,
// not a small error; npm test pins both halves against Python.
//
//   0-32     body          33-160   face contour (128 mesh points)
//   161-181  left hand     182-202  right hand
//
// x and y are pixels, z is MediaPipe's own value, and anything not seen is 0.

export const FACE_CONTOUR = [
  0, 7, 10, 13, 14, 17, 21, 33, 37, 39, 40, 46, 52, 53, 54, 55, 58, 61, 63,
  65, 66, 67, 70, 78, 80, 81, 82, 84, 87, 88, 91, 93, 95, 103, 105, 107, 109,
  127, 132, 133, 136, 144, 145, 146, 148, 149, 150, 152, 153, 154, 155, 157, 158,
  159, 160, 161, 162, 163, 172, 173, 176, 178, 181, 185, 191, 234, 246, 249, 251,
  263, 267, 269, 270, 276, 282, 283, 284, 285, 288, 291, 293, 295, 296, 297, 300,
  308, 310, 311, 312, 314, 317, 318, 321, 323, 324, 332, 334, 336, 338, 356, 361,
  362, 365, 373, 374, 375, 377, 378, 379, 380, 381, 382, 384, 385, 386, 387, 388,
  389, 390, 397, 398, 400, 402, 405, 409, 415, 454, 466,
];
const N_POSE = 33;
const FACE0 = N_POSE;
const LEFT0 = FACE0 + FACE_CONTOUR.length;   // 161
const RIGHT0 = LEFT0 + 21;                   // 182
export const N_POINTS = RIGHT0 + 21;         // 203
export const FRAME_DIM = N_POINTS * 3;       // 609
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEGS = [25, 26, 27, 28, 29, 30, 31, 32];

/**
 * One frame as Float32Array(609).
 *
 * Hands go in the slot of the body wrist they sit on, as Holistic does it; the
 * handedness label is only a fallback when there is no body, and it is read
 * inverted, because it assumes a mirrored selfie image and camera frames are
 * not mirrored.
 */
export function holisticFrame(handResult, poseResult, faceResult, width, height) {
  const out = new Float32Array(FRAME_DIM);
  const put = (slot, p) => {
    out[slot * 3] = p.x * width;
    out[slot * 3 + 1] = p.y * height;
    out[slot * 3 + 2] = p.z;
  };

  const pose = poseResult?.landmarks?.[0];
  if (pose) for (let i = 0; i < N_POSE && i < pose.length; i++) put(i, pose[i]);
  const face = faceResult?.faceLandmarks?.[0];
  if (face) FACE_CONTOUR.forEach((m, k) => put(FACE0 + k, face[m]));

  const hands = (handResult?.landmarks ?? []).slice(0, 2);
  if (!hands.length) return out;

  let slots;
  if (pose) {
    const wl = [out[LEFT_WRIST * 3], out[LEFT_WRIST * 3 + 1]];
    const wr = [out[RIGHT_WRIST * 3], out[RIGHT_WRIST * 3 + 1]];
    const d = hands.map((h) => {
      const x = h[0].x * width;
      const y = h[0].y * height;
      return [Math.hypot(x - wl[0], y - wl[1]), Math.hypot(x - wr[0], y - wr[1])];
    });
    if (hands.length === 1) slots = [d[0][0] < d[0][1] ? LEFT0 : RIGHT0];
    else slots = d[0][0] + d[1][1] <= d[0][1] + d[1][0] ? [LEFT0, RIGHT0] : [RIGHT0, LEFT0];
  } else {
    slots = hands.map((_, i) =>
      handResult.handedness?.[i]?.[0]?.categoryName === 'Left' ? RIGHT0 : LEFT0);
    if (slots.length === 2 && slots[0] === slots[1]) slots[1] = slots[0] === LEFT0 ? RIGHT0 : LEFT0;
  }
  hands.forEach((h, i) => { for (let j = 0; j < 21; j++) put(slots[i] + j, h[j]); });
  return out;
}

/**
 * Frames -> the model input, Float32Array(T * 609).
 *
 * pose-format's normalize(): centre on the shoulder midpoint averaged over every
 * frame where both shoulders were seen, scale by the mean shoulder distance.
 * Missing points stay exactly zero, and the legs are zeroed.
 */
export function normaliseClip(frames) {
  const T = frames.length;
  const present = (f, i) => f[i * 3] !== 0 || f[i * 3 + 1] !== 0 || f[i * 3 + 2] !== 0;
  let cx = 0; let cy = 0; let cz = 0; let dist = 0; let n = 0;
  for (const f of frames) {
    if (!present(f, LEFT_SHOULDER) || !present(f, RIGHT_SHOULDER)) continue;
    const l = LEFT_SHOULDER * 3;
    const r = RIGHT_SHOULDER * 3;
    cx += (f[l] + f[r]) / 2;
    cy += (f[l + 1] + f[r + 1]) / 2;
    cz += (f[l + 2] + f[r + 2]) / 2;
    dist += Math.hypot(f[l] - f[r], f[l + 1] - f[r + 1], f[l + 2] - f[r + 2]);
    n++;
  }
  const out = new Float32Array(T * FRAME_DIM);
  if (!n) return out;
  cx /= n; cy /= n; cz /= n;
  const scale = 1 / Math.max(dist / n, 1e-6);
  frames.forEach((f, t) => {
    for (let i = 0; i < N_POINTS; i++) {
      if (!present(f, i) || LEGS.includes(i)) continue;
      const at = t * FRAME_DIM + i * 3;
      out[at] = (f[i * 3] - cx) * scale;
      out[at + 1] = (f[i * 3 + 1] - cy) * scale;
      out[at + 2] = (f[i * 3 + 2] - cz) * scale;
    }
  });
  return out;
}

/**
 * Frames captured at whatever rate the page managed -> a steady rate.
 *
 * The references were extracted at their source rate, 25 or 30 frames a
 * second, and the model has position embeddings, so an attempt captured at 15
 * frames a second would look like a sign made twice as fast. Nearest frame,
 * not interpolation: a hand that appears between two frames should not be
 * averaged with zeros.
 */
export function resample(frames, times, rate = 25, maxFrames = 256) {
  if (frames.length < 2) return frames.slice();
  const t0 = times[0];
  const span = times[times.length - 1] - t0;
  const requested = Math.max(2, Math.round((span / 1000) * rate) + 1);
  const n = Math.min(maxFrames, requested);
  // A model's frame budget limits resolution, not the duration it can see.
  // Using the nominal rate after capping n silently dropped the clip's tail.
  const step = requested > maxFrames ? span / (n - 1) : 1000 / rate;
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const t = t0 + k * step;
    while (j + 1 < times.length && Math.abs(times[j + 1] - t) <= Math.abs(times[j] - t)) j++;
    out.push(frames[j]);
  }
  return out;
}

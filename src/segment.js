// Splitting a continuous recording into individual signs.
//
// Signing a phrase does not produce neat gaps the way speech does, but there is
// still structure: the hands slow sharply at the boundary between one sign and
// the next, and often drop out of the frame entirely. Tracking that motion
// energy over time gives candidate cut points.
//
// This is genuinely useful for a short practice phrase from a known vocabulary.
// It is NOT sentence translation, and the difference is not one of polish.
// Signed languages carry grammar in space, in facial expression, in eyebrow and
// head position, and in how a sign is modified rather than which sign is used.
// A chain of independently matched words throws all of that away. What comes out
// is a list of best-guess words in the order they were made - useful for
// checking "did I produce the signs I meant to", useless as a translation.

import { DIM, hasHands, resample, SEQ_LEN } from './features.js';

const SMOOTHING = 3;          // frames either side of the moving average
const MIN_SIGN_FRAMES = 8;    // shorter than this is a transition, not a sign
const MIN_GAP_FRAMES = 3;     // frames of stillness needed to call a boundary

/**
 * Frame-to-frame motion, as the distance between consecutive feature vectors.
 *
 * Only meaningful between two frames that both have hands. When a hand enters or
 * leaves the frame, 66 landmark values move away from zero at once and the
 * distance is enormous - not because anything moved fast, but because the vector
 * went from empty to full. Those frames are marked invalid rather than measured,
 * because leaving them in drags the median up far enough that real signing
 * motion falls below the threshold and no boundary is ever found.
 */
export function motionEnergy(frames, times = null) {
  const raw = new Float64Array(frames.length);
  const valid = new Array(frames.length).fill(false);

  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    if (!hasHands(a) || !hasHands(b)) continue;

    let sum = 0;
    for (let d = 0; d < DIM; d++) {
      const diff = b[d] - a[d];
      sum += diff * diff;
    }
    const dt = times ? times[i] - times[i - 1] : 40;
    if (dt <= 0 || dt > 500) continue;
    raw[i] = Math.sqrt(sum) * 40 / dt;
    valid[i] = true;
  }
  motionEnergy.valid = valid;

  // Smooth over valid neighbours only, or every tracking jitter reads as a
  // boundary and every presence change poisons the frames around it.
  const out = new Float64Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    let sum = 0;
    let n = 0;
    for (let j = times ? 0 : Math.max(0, i - SMOOTHING); j <= (times ? raw.length - 1 : Math.min(raw.length - 1, i + SMOOTHING)); j++) {
      if (times && Math.abs(times[j] - times[i]) > SMOOTHING * 40) continue;
      if (!valid[j]) continue;
      sum += raw[j];
      n++;
    }
    out[i] = n ? sum / n : 0;
  }
  out.valid = valid;
  return out;
}

/**
 * Find sign boundaries in a recording.
 *
 * The threshold is relative to the recording's own motion rather than absolute,
 * because how fast someone signs varies enormously between people and moods.
 */
export function findSegments(frames, { sensitivity = 0.35, times = null } = {}) {
  if (times && times.length !== frames.length) throw new Error("One timestamp is required per frame");
  if (frames.length < (times ? 2 : MIN_SIGN_FRAMES)) return [];
  const intervals = times ? times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b) : [];
  if (times && intervals.some((dt) => !Number.isFinite(dt) || dt <= 0)) throw new Error("Timestamps must increase");
  const frameMs = times ? intervals[Math.floor(intervals.length / 2)] : 40;
  const duration = (start, end) => times ? times[end - 1] - times[start] + frameMs : (end - start) * 40;
  const longEnough = (start, end) => end > start && duration(start, end) >= MIN_SIGN_FRAMES * 40;

  const energy = motionEnergy(frames, times);
  const valid = energy.valid;

  // Statistics over genuine hand motion only.
  const moving = [...energy].filter((e, i) => valid[i]);
  if (!moving.length) return [];

  const sorted = [...moving].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1e-6;
  const threshold = median * sensitivity;

  // A frame is "quiet" when the hands are gone, or present but barely moving.
  const quiet = frames.map((f, i) => !hasHands(f) || (valid[i] && energy[i] < threshold));

  const segments = [];
  let start = null;
  let quietRun = 0;

  for (let i = 0; i < frames.length; i++) {
    if (quiet[i]) {
      quietRun++;
      if (start !== null && duration(i - quietRun + 1, i + 1) >= MIN_GAP_FRAMES * 40) {
        const end = i - quietRun + 1;
        if (longEnough(start, end)) segments.push({ start, end });
        start = null;
      }
    } else {
      quietRun = 0;
      if (start === null) start = i;
    }
  }
  if (start !== null && longEnough(start, frames.length)) {
    segments.push({ start, end: frames.length });
  }

  return segments;
}

/** Segment a recording and resample each part into a matchable sequence. */
export function splitIntoSigns(frames, opts) {
  return findSegments(frames, opts)
    .map(({ start, end }) => {
      const slice = frames.slice(start, end);
      const sequence = resample(slice, SEQ_LEN);
      return sequence ? { start, end, frames: slice.length, sequence } : null;
    })
    .filter(Boolean);
}

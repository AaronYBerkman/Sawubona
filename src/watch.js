// Watching a sign in the app: the drawn signer (src/figure.js) performing a
// Real SASL reference on its own, or beside the learner's own last try.
//
//   const ref = await referenceClip('THANK YOU');         // null: no drawing
//   const stage = createStage([canvas], [ref]);
//   stage.play();
//
//   createStage([refCanvas, youCanvas], [ref, attemptClip(rec.holistic, rec.times)]);
//
// A stage is one clock for one or more figures. Every figure is stretched to
// the first one's length, so a try that took twice as long as the reference
// still starts and finishes with it: the two can be watched move for move.
// The drawing is an illustration of the tracked movement, never the video;
// the page always links the Real SASL clip it came from.

import { loadReplay } from './replay-data.js';
import { createReplay } from './figure.js';
import { resample } from './holistic.js';

export const DISPLAY_FPS = 15;          // the rate the replay pack is stored at
const HOLD = 0.7;                       // seconds resting on the last frame before a loop
const MIN_DURATION = 0.4;

/** The reference poses' index, fetched once and shared; shards follow per sign. */
export function replayPack() {
  return loadReplay();
}

let review = null;
let audit = null;

/**
 * The automatic clip audit (data/clip-audit.json, scripts/export-clip-audit.py):
 * each flagged clip's suspicion score and flags, and each sign's preferred clip.
 */
export function clipAudit() {
  audit ??= fetch(new URL('../data/clip-audit.json', import.meta.url))
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((j) => ({ clips: j.clips ?? {}, preferred: j.preferred ?? {} }));
  return audit;
}

/**
 * A sign's clip indices in the order the page offers them: the audit's
 * preferred clip first, then the rest from least to most suspect (ties keep
 * the dictionary's order), leaving out any flagged by eye in review.html.
 */
export function orderClips(replay, label, { flagged = new Set(), clips = {}, preferred = {} } = {}) {
  const key = String(label).trim().toUpperCase();
  const want = Object.entries(preferred).find(([l]) => l.toUpperCase() === key)?.[1];
  const score = (i) => (replay.clips[i].file === want ? -1 : clips[replay.clips[i].file]?.[0] ?? 0);
  return replay.variants(label)
    .filter((i) => !flagged.has(replay.clips[i].file))
    .map((i, n) => ({ i, n, s: score(i) }))
    .sort((a, b) => a.s - b.s || a.n - b.n)
    .map((x) => x.i);
}

/**
 * The drawings checked by eye in review.html, as committed in
 * data/clip-review.json: the set of clip files flagged as badly tracked.
 */
export function flaggedClips() {
  review ??= fetch(new URL('../data/clip-review.json', import.meta.url))
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((j) => new Set(j.flagged ?? []));
  return review;
}

const sourceOf = (file) => (/\[nid\d+\]/i.test(file || '') ? 'NID' : 'Real SASL');

/**
 * { frames, fps, source, url, variants } for one of a sign's reference clips,
 * or null when there is no drawing. Variants flagged in review.html are left
 * out, so a sign whose first clip tracked badly shows its next one, and a sign
 * with no good clip shows none (the page links the video instead). The best
 * clip by the automatic audit comes first (orderClips).
 */
export async function referenceClip(label, variant = 0) {
  const [replay, flagged, checked] = await Promise.all([loadReplay(), flaggedClips(), clipAudit()]);
  const usable = orderClips(replay, label, { flagged, ...checked });
  if (!usable.length) return null;
  const info = replay.clips[usable[Math.min(variant, usable.length - 1)]];
  if (!(await replay.ready(info.file))) return null;
  const frames = replay.clipFrames(info.file);
  const id = /\[(\d+)\]/.exec(info.file)?.[1];
  return frames && frames.length > 1 ? {
    frames, fps: replay.fps, source: sourceOf(info.file),
    url: id ? `https://www.realsasl.com/?vid=${id}` : null,
    variants: usable.map((i) => ({ file: replay.clips[i].file, source: sourceOf(replay.clips[i].file) })),
  } : null;
}

/**
 * A learner's recording (pixel frames from holisticFrame, with their capture
 * times) at the pack's steady rate, ready for the figure.
 */
export function attemptClip(holistic, times) {
  if (!holistic?.length || holistic.length < 2) return null;
  return { frames: resample(holistic, times, DISPLAY_FPS, 400), fps: DISPLAY_FPS };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * One clock for the figures on `canvases`, one clip each ({frames, fps}).
 * opts: mirror [bool per figure], onTime(progress, seconds, duration),
 * onState(playing), makePlayer (createReplay; the tests pass a stand-in).
 */
export function createStage(canvases, clips, opts = {}) {
  const makePlayer = opts.makePlayer ?? createReplay;
  const players = canvases.map((canvas, i) => makePlayer(canvas, clips[i].frames, {
    fps: clips[i].fps, mirror: Boolean(opts.mirror?.[i]), loop: false,
  }));
  const duration = Math.max(MIN_DURATION, players[0]?.duration ?? 0);
  let p = 0;
  let speed = 1;
  let playing = false;
  let raf = 0;
  let last = 0;
  let resting = 0;

  function render() {
    for (const pl of players) pl.seek(p * pl.duration);
    opts.onTime?.(p, p * duration, duration);
  }

  function tick(now) {
    raf = 0;
    if (!playing) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (resting > 0) {
      resting -= dt;
      if (resting <= 0) p = 0;
    } else {
      p += (dt * speed) / duration;
      if (p >= 1) { p = 1; resting = HOLD; }
    }
    render();
    raf = requestAnimationFrame(tick);
  }

  function setPlaying(on) {
    if (on === playing) return;
    playing = on;
    if (on) {
      last = 0;
      resting = 0;
      if (p >= 1) p = 0;
      raf ||= requestAnimationFrame(tick);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    opts.onState?.(playing);
  }

  render();
  return {
    play() { setPlaying(true); },
    pause() { setPlaying(false); },
    toggle() { setPlaying(!playing); },
    /** Jump to a point through the sign, 0 (start) to 1 (end). */
    seek(progress) { p = clamp01(Number(progress) || 0); resting = 0; render(); },
    setSpeed(x) { speed = Math.min(4, Math.max(0.1, Number(x) || 1)); },
    setMirror(i, on) { players[i]?.setMirror(on); },
    redraw() { for (const pl of players) pl.redraw(); render(); },
    destroy() { setPlaying(false); for (const pl of players) pl.destroy(); },
    get playing() { return playing; },
    get progress() { return p; },
    get duration() { return duration; },
  };
}

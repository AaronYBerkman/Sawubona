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

const HANDS = [161, 182];                 // the left and right hands' first points in a frame
const TIPS = [0, 4, 8, 12, 16, 20];       // wrist and fingertips, for how far a hand moved
// summed movement of the wrists and fingertips between frames, in shoulder
// widths, below which a hand is holding still (a presenter's hold: 0.02-0.06)
const STILL_MOVE = 0.08;
const seenAt = (f, i) => f[i * 3] !== 0 || f[i * 3 + 1] !== 0 || f[i * 3 + 2] !== 0;

/**
 * The part of a reference clip where the sign is made. The tracker finds a
 * hand only once it is raised, so the frames with no hand at either end are
 * the signer standing at rest - and a resting presenter's hands, clasped at
 * the waist, can only be drawn as one tangle. Those ends are cut, keeping a
 * short margin for the arm coming up and going down.
 *
 * `maxHold` (seconds) also shortens a long hold in the middle, for signs
 * played one after another: a presenter holding ME for two seconds reads as
 * a pause, not a sentence.
 */
export function signedPart(frames, fps = DISPLAY_FPS, { margin = 0.15, maxHold = Infinity } = {}) {
  if (!frames?.length) return frames;
  const tracked = frames.map((f) => HANDS.some((h) => seenAt(f, h)));
  const first = tracked.indexOf(true);
  if (first < 0) return frames;                               // never tracked: leave it be
  const last = tracked.lastIndexOf(true);
  const m = Math.round(margin * fps);
  let out = frames.slice(Math.max(0, first - m), Math.min(frames.length, last + m + 1));
  if (Number.isFinite(maxHold)) {
    const move = out.map((f, t) => {
      if (!t) return Infinity;
      let d = 0;
      let compared = 0;
      for (const h of HANDS) for (const k of TIPS) {
        const i = h + k;
        if (seenAt(f, i) && seenAt(out[t - 1], i)) { d += Math.hypot(f[i * 3] - out[t - 1][i * 3], f[i * 3 + 1] - out[t - 1][i * 3 + 1]); compared++; }
      }
      return compared ? d : Infinity;          // no hand to compare: the arm coming up or going down, not a hold
    });
    const keep = Math.max(1, Math.round(maxHold * fps));
    let still = 0;
    out = out.filter((_, t) => {
      still = move[t] < STILL_MOVE ? still + 1 : 0;
      return still <= keep;
    });
  }
  return out.length > 1 ? out : frames;
}

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
  const frames = signedPart(replay.clipFrames(info.file), replay.fps);
  const id = /\[(\d+)\]/.exec(info.file)?.[1];
  return frames && frames.length > 1 ? {
    frames, fps: replay.fps, source: sourceOf(info.file),
    url: id ? `https://www.realsasl.com/?vid=${id}` : null,
    variants: usable.map((i) => ({ file: replay.clips[i].file, source: sourceOf(replay.clips[i].file) })),
  } : null;
}

/**
 * A sign as one step of a sentence: its reference clip (the same one Watch
 * shows), cut to the sign with long holds shortened, so signs follow on.
 */
export async function sequenceClip(label) {
  const clip = await referenceClip(label);
  if (!clip) return null;
  return { ...clip, frames: signedPart(clip.frames, clip.fps, { maxHold: 0.5 }) };
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
  let closeUp = false;
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
    setCloseUp(on) { closeUp = !!on; for (const pl of players) pl.setCloseUp(closeUp); },
    step(direction) {
      setPlaying(false);
      const fps = clips[0]?.fps ?? DISPLAY_FPS;
      const frame = Math.round(p * duration * fps) + Math.sign(direction);
      p = clamp01(frame / (duration * fps)); resting = 0; render();
    },
    get closeUp() { return closeUp; },
    redraw() { for (const pl of players) pl.redraw(); render(); },
    destroy() { setPlaying(false); for (const pl of players) pl.destroy(); },
    get playing() { return playing; },
    get progress() { return p; },
    get duration() { return duration; },
  };
}

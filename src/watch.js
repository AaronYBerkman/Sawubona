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

/** { frames, fps } for a sign's first reference clip, or null when there is no drawing. */
export async function referenceClip(label, variant = 0) {
  const replay = await loadReplay();
  if (!(await replay.ready(label, variant))) return null;
  const frames = replay.clipFrames(label, variant);
  const index = replay.indexOf(label, variant);
  const info = replay.clips[index];
  const nid = /\[nid\d+\]/i.test(info?.file || '');
  const id = /\[(\d+)\]/.exec(info?.file || '')?.[1];
  return frames && frames.length > 1 ? {
    frames, fps: replay.fps, source: nid ? 'NID' : 'Real SASL',
    url: id ? `https://www.realsasl.com/?vid=${id}` : null,
    variants: replay.variants(label).map((i) => ({
      file: replay.clips[i].file,
      source: /\[nid\d+\]/i.test(replay.clips[i].file) ? 'NID' : 'Real SASL',
    })),
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

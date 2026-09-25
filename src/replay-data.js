// Reference poses for the illustrated sign replay.
//
// data/replay.json indexes every gallery clip (Real SASL and NID) as 203-point
// frames at 15 a second, already normalised the way normaliseClip in
// src/holistic.js does it (centred on the mean shoulder midpoint, one unit =
// the mean shoulder width), with short hand and face dropouts filled and a
// little smoothing for display. The frames themselves are in shards of 500
// clips (data/replay/NNN.bin, about 5 MB each), fetched the first time a sign
// in them is wanted. tools/pack-replay.py writes them; its docstring has the
// byte layout. An older single data/replay.bin pack still loads.
//
//   const replay = await loadReplay();              // the index only
//   await replay.ready('THANK YOU');                // the shard holding it
//   const frames = replay.clipFrames('THANK YOU');  // Float32Array(609)[]
//
// A frame uses the app's convention: x, y, z per point, exactly 0 where a part
// was not seen. displayFrames() brings a learner's own attempt (pixel frames
// from holisticFrame) into the same space, with the same gap filling and
// smoothing, so the figure can draw both the same way. src/figure.js draws
// them: createReplay(canvas, replay.clipFrames('HELLO'), { fps: replay.fps }).

import { normaliseClip, FRAME_DIM, N_POINTS } from './holistic.js';

const N_BODY = 25;
const FACE0 = 33;
const LEFT0 = 161;
const RIGHT0 = 182;
const N16 = 56;
const N8 = 404;

let loading = null;
let loaded = null;

/**
 * Fetch the index once; later calls share the same promise. Shards come later,
 * through replay.ready(). `base` is the URL of the data directory (default:
 * ../data/ next to src/).
 */
export function loadReplay({ base = new URL('../data/', import.meta.url) } = {}) {
  if (loading) return loading;
  loading = (async () => {
    const get = (name) => fetch(new URL(name, base)).then((r) => {
      if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
      return r;
    });
    const info = await (await get('replay.json')).json();
    const whole = info.shards ? null : await inflate(await (await get('replay.bin')).arrayBuffer());
    loaded = new Replay(info, whole, {
      load: async (shard) => inflate(await (await get(shard.file)).arrayBuffer()),
    });
    return loaded;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

/** Frames of one clip from the pack loadReplay() fetched; see Replay.clipFrames. */
export function clipFrames(which, variant = 0) {
  if (!loaded) throw new Error('clipFrames: await loadReplay() first');
  return loaded.clipFrames(which, variant);
}

async function inflate(buffer) {
  const head = new Uint8Array(buffer, 0, 2);
  // A server that sends Content-Encoding: gzip has already inflated it.
  if (head[0] !== 0x1f || head[1] !== 0x8b) return buffer;
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot inflate the sign replay (no DecompressionStream).');
  }
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

export class Replay {
  /**
   * `info` is replay.json. A sharded pack (version 3) takes `load(shard)`, a
   * function giving one shard's inflated bytes; an older single pack passes its
   * inflated bytes as `buffer`.
   */
  constructor(info, buffer = null, { load = null } = {}) {
    this.info = info;
    this.fps = info.fps;
    this.clips = info.clips;
    const { flags, int16, int8 } = info.layout;
    this.shards = info.shards ?? [{
      clips: [0, info.clips.length], frames: info.totalFrames,
      layout: { flags: flags.offset, int16: int16.offset, int8: int8.offset },
    }];
    this.data = this.shards.map(() => null);
    this.pending = new Map();
    this.load = load;
    if (buffer) this.setShard(0, buffer);
    this.byLabel = new Map();
    this.clips.forEach((c, i) => {
      const key = c.label.toUpperCase();
      if (!this.byLabel.has(key)) this.byLabel.set(key, []);
      this.byLabel.get(key).push(i);
    });
    this.byFile = new Map(this.clips.map((c, i) => [c.file, i]));
  }

  /** Hand over one shard's inflated bytes. */
  setShard(s, buffer) {
    const { frames: n, layout } = this.shards[s];
    this.data[s] = {
      flags: new Uint8Array(buffer, layout.flags, n),
      q16: new Int16Array(buffer, layout.int16, n * N16),
      q8: new Int8Array(buffer, layout.int8, n * N8),
    };
  }

  /**
   * Fetch whatever shards the given clips live in (a label, file name or
   * signs.json index, or a list of them). Resolves true when every one is a
   * known clip, false when one is not; clipFrames() works for them after.
   */
  async ready(which, variant = 0) {
    const list = Array.isArray(which) ? which : [which];
    const found = list.map((w) => this.indexOf(w, variant)).filter((i) => i >= 0);
    const need = [...new Set(found.map((i) => this.clips[i].shard ?? 0))];
    await Promise.all(need.map((s) => this.loadShard(s)));
    return found.length === list.length;
  }

  loadShard(s) {
    if (this.data[s]) return Promise.resolve();
    if (!this.pending.has(s)) {
      if (!this.load) return Promise.reject(new Error(`replay shard ${s} has no loader`));
      const p = this.load(this.shards[s]).then((buf) => { this.setShard(s, buf); });
      p.finally(() => this.pending.delete(s)).catch(() => {});
      this.pending.set(s, p);
    }
    return this.pending.get(s);
  }

  /** Clip index for a signs.json index, a label (with variant) or a file name. */
  indexOf(which, variant = 0) {
    if (typeof which === 'number') return which >= 0 && which < this.clips.length ? which : -1;
    const key = String(which).trim();
    if (this.byFile.has(key)) return this.byFile.get(key);
    const list = this.byLabel.get(key.toUpperCase());
    return list ? list[Math.min(variant, list.length - 1)] : -1;
  }

  /** Every clip index recorded for a label, in signs.json order. */
  variants(label) {
    return this.byLabel.get(String(label).trim().toUpperCase()) ?? [];
  }

  /** Normalised 203-point frames (Float32Array(609) each) for one clip, or null. */
  clipFrames(which, variant = 0) {
    const i = this.indexOf(which, variant);
    if (i < 0) return null;
    const { offset, frames } = this.clips[i];
    const data = this.data[this.clips[i].shard ?? 0];
    if (!data) throw new Error(`clipFrames: await replay.ready(${JSON.stringify(which)}) first`);
    const { body, bodyZ, handZ } = this.info.scale;
    // Version 2 packs give each clip its own face / left / right step.
    const steps = this.clips[i].local ?? [this.info.scale.local, this.info.scale.local, this.info.scale.local];
    const a16 = new Int16Array(N16);       // deltas wrap, exactly as packed
    const a8 = new Int8Array(N8);
    const out = [];
    for (let t = 0; t < frames; t++) {
      const f = offset + t;
      for (let k = 0; k < N16; k++) a16[k] += data.q16[f * N16 + k];
      for (let k = 0; k < N8; k++) a8[k] += data.q8[f * N8 + k];
      const bits = data.flags[f];
      const fr = new Float32Array(FRAME_DIM);
      const put = (i, x, y, z) => {
        // (0,0,0) means "not seen"; a real point that rounds onto the origin
        // is nudged off it rather than lost.
        fr[i * 3] = x; fr[i * 3 + 1] = y; fr[i * 3 + 2] = x === 0 && y === 0 && z === 0 ? 1e-9 : z;
      };
      if (bits & 1) {
        for (let p = 0; p < N_BODY; p++) put(p, a16[2 * p] * body, a16[2 * p + 1] * body, a8[p] * bodyZ);
      }
      if (bits & 2) {
        const cx = a16[50] * body; const cy = a16[51] * body; const cz = a8[25] * bodyZ;
        const local = steps[0];
        for (let p = 0; p < 128; p++) {
          put(FACE0 + p, cx + a8[26 + 2 * p] * local, cy + a8[27 + 2 * p] * local, cz);
        }
      }
      for (let h = 0; h < 2; h++) {
        if (!(bits & (4 << h))) continue;
        const h0 = h ? RIGHT0 : LEFT0;
        const base = 282 + 61 * h;
        const local = steps[1 + h];
        const wx = a16[52 + 2 * h] * body; const wy = a16[53 + 2 * h] * body; const wz = a8[base] * bodyZ;
        put(h0, wx, wy, wz);
        for (let p = 1; p < 21; p++) {
          put(h0 + p,
            wx + a8[base + 1 + 2 * (p - 1)] * local,
            wy + a8[base + 2 + 2 * (p - 1)] * local,
            wz + a8[base + 40 + p] * handZ);
        }
      }
      out.push(fr);
    }
    return out;
  }
}

// --- a learner's attempt -> the same display space --------------------------

const PARTS = [
  { from: 0, to: N_BODY, key: 11, kernel: [1, 4, 6, 4, 1], fill: false },
  { from: FACE0, to: LEFT0, kernel: [1, 4, 6, 4, 1], fill: true },
  { from: LEFT0, to: RIGHT0, kernel: [1, 2, 1], fill: true },
  { from: RIGHT0, to: N_POINTS, kernel: [1, 2, 1], fill: true },
];

const seen = (f, i) => f[i * 3] !== 0 || f[i * 3 + 1] !== 0 || f[i * 3 + 2] !== 0;

/** True when frames are in pixels (holisticFrame) rather than shoulder widths. */
export function isPixelSpace(frames) {
  for (const f of frames) {
    if (!seen(f, 11) || !seen(f, 12)) continue;
    return Math.hypot(f[33] - f[36], f[34] - f[37]) > 4;
  }
  return frames.some((f) => f.some((v) => Math.abs(v) > 12));
}

/**
 * Attempt frames (pixel frames from holisticFrame, or already normalised) ->
 * display frames as the pack makes them: normalised like normaliseClip, face
 * and hand gaps of up to `gap` frames filled, lightly smoothed. Pass a steady
 * frame rate in (resample() in src/holistic.js) if the capture rate wandered.
 */
export function displayFrames(frames, { gap = 8 } = {}) {
  const T = frames.length;
  if (!T) return [];
  let src = frames;
  if (isPixelSpace(frames)) {
    const flat = normaliseClip(frames);
    src = Array.from({ length: T }, (_, t) => flat.subarray(t * FRAME_DIM, (t + 1) * FRAME_DIM));
  }
  const out = src.map((f) => Float32Array.from(f));
  for (const part of PARTS) {
    const ok = out.map((f) => {
      if (part.key !== undefined) return seen(f, 11) && seen(f, 12);
      for (let i = part.from; i < part.to; i++) if (!seen(f, i)) return false;
      return true;
    });
    const lo = part.from * 3;
    const hi = part.to * 3;
    if (part.fill) {
      let last = -1;
      for (let t = 0; t < T; t++) {
        if (!ok[t]) continue;
        if (last >= 0 && t - last > 1 && t - last <= gap + 1) {
          for (let u = last + 1; u < t; u++) {
            const w = (u - last) / (t - last);
            for (let k = lo; k < hi; k++) out[u][k] = out[last][k] + (out[t][k] - out[last][k]) * w;
            ok[u] = true;
          }
        }
        last = t;
      }
    }
    const kern = part.kernel;
    const half = kern.length >> 1;
    const copy = out.map((f) => f.slice(lo, hi));
    for (let t = 0; t < T; t++) {
      if (!ok[t]) {
        out[t].fill(0, lo, hi);
        continue;
      }
      const acc = new Float64Array(hi - lo);
      let wsum = 0;
      for (let j = 0; j < kern.length; j++) {
        const u = t + j - half;
        if (u < 0 || u >= T || !ok[u]) continue;
        wsum += kern[j];
        const c = copy[u];
        for (let k = 0; k < acc.length; k++) acc[k] += c[k] * kern[j];
      }
      for (let k = 0; k < acc.length; k++) out[t][lo + k] = acc[k] / wsum;
    }
  }
  return out;
}

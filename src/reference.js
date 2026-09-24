// The reference dictionary (the "gallery"): every clip we have of a SASL sign,
// from Real SASL and from the National Institute for the Deaf's free
// dictionary, each stored as embeddings rather than video.
//
// Five views of every clip, all unit length and in data/signs.json order
// (tools/build-gallery.py makes them through the page's own encoder code):
//   signs.bin                 OpenHands ensemble (768)
//   signclip.bin              SignCLIP, ASL Citizen fine-tune (768)
//   signclip-mirror.bin       the same of the clip mirrored, so a left-handed
//                             learner meets a left-handed version of each sign
//   signclip-asl3.bin         SignCLIP, asl3 fine-tune (768)
//   signclip-asl3-mirror.bin  likewise mirrored
//
// Ranking fuses the model families the way tools/bench-nid.py measured it:
// each model's similarities to every clip are standardised for this attempt,
// taking the better of plain and mirrored for SignCLIP, then added. The asl3
// view is optional: without its files or its model, ranking uses the others.

import { wantsExtraViews } from './device.js';

const FILES = {
  index: 'data/signs.json',
  openhands: 'data/signs.bin',
  signclip: 'data/signclip.bin',
  mirror: 'data/signclip-mirror.bin',
  asl3: 'data/signclip-asl3.bin',
  asl3Mirror: 'data/signclip-asl3-mirror.bin',
};

let loaded = null;

async function floats(url, count, dim) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const data = new Float32Array(await r.arrayBuffer());
  if (data.length !== count * dim) {
    throw new Error(`${url} holds ${data.length} values, expected ${count * dim}`);
  }
  return data;
}

export async function loadReference() {
  if (loaded) return loaded;
  const index = await fetch(FILES.index).then((r) => {
    if (!r.ok) throw new Error(`reference index: ${r.status}`);
    return r.json();
  });
  // the asl3 view is left out where its model is (phones, src/device.js)
  const optional = (url) => (wantsExtraViews() ? floats(url, index.count, 768).catch(() => null) : Promise.resolve(null));
  const [openhands, signclip, mirror, asl3, asl3Mirror] = await Promise.all([
    floats(FILES.openhands, index.count, index.dim),
    floats(FILES.signclip, index.count, 768),
    floats(FILES.mirror, index.count, 768),
    optional(FILES.asl3),
    optional(FILES.asl3Mirror),
  ]);
  const clips = index.entries.map((e) => ({
    label: e.label, file: e.file, id: realSaslId(e.file), source: e.source ?? sourceOf(e.file),
  }));
  const labels = [...new Set(clips.map((c) => c.label))].sort();
  loaded = {
    clips, labels, openhands, signclip, mirror, dimOpenHands: index.dim,
    asl3: asl3 && asl3Mirror ? asl3 : null, asl3Mirror: asl3 && asl3Mirror ? asl3Mirror : null,
  };
  return loaded;
}

export function reference() {
  return loaded;
}

/** RealSASL's own id for a clip, from its file name: "ABOUT [846].mp4" -> 846. */
export function realSaslId(file) {
  const m = /\[(\d+)\]/.exec(file);
  return m ? Number(m[1]) : null;
}

/** NID's own entry id for a clip: "MOTHER [nid9303].mp4" -> 9303. */
export function nidId(file) {
  const m = /\[nid(\d+)\]/i.exec(file);
  return m ? Number(m[1]) : null;
}

/** Where a clip came from: "nid" or "realsasl". */
export function sourceOf(file) {
  return nidId(file) !== null ? 'nid' : 'realsasl';
}

export function realSaslUrl(label) {
  const clip = loaded?.clips.find((c) => c.label === label && c.id);
  return clip ? `https://www.realsasl.com/?vid=${clip.id}` : null;
}

/**
 * A link to a sign's page in NID's SASL Video Dictionary: null, always, for
 * now. The clips were fetched by NID entry id and Vimeo id (data/nid/*.json),
 * but nothing here records the address of an entry's page on learnsasl.com,
 * and a guessed address would send a learner somewhere wrong. When the pattern
 * is known, build it from nidId() of the label's first NID clip.
 */
export function nidUrl(label) {
  return null;
}

function dots(query, bank, dim) {
  const n = bank.length / dim;
  const out = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    let s = 0;
    const at = j * dim;
    for (let i = 0; i < dim; i++) s += query[i] * bank[at + i];
    out[j] = s;
  }
  return out;
}

function standardise(v) {
  let mean = 0;
  for (const x of v) mean += x;
  mean /= v.length;
  let sq = 0;
  for (const x of v) sq += (x - mean) ** 2;
  const sd = Math.sqrt(sq / v.length) || 1;
  return v.map((x) => (x - mean) / sd);
}

function bestOf(query, bank, mirror) {
  const plain = dots(query, bank, 768);
  const flipped = dots(query, mirror, 768);
  return plain.map((v, j) => Math.max(v, flipped[j]));
}

/**
 * Every sign scored for one attempt, best first: { label, score, clip, source, rank }.
 *
 * `score` is in standard deviations above an average clip, per model, summed;
 * `rank` is the sign's place across the whole dictionary, which the quiz uses
 * to refuse a lesson-only match that is poor against everything else. `clip`
 * and `source` are the sign's best-matching clip. `asl3` defaults to the
 * property embedSignCLIP() puts on its result.
 */
export function rankSigns({ openhands, signclip, asl3 = signclip?.asl3 }) {
  if (!loaded) throw new Error('reference not loaded');
  const views = [
    standardise(dots(openhands, loaded.openhands, loaded.dimOpenHands)),
    standardise(bestOf(signclip, loaded.signclip, loaded.mirror)),
  ];
  if (asl3 && loaded.asl3) views.push(standardise(bestOf(asl3, loaded.asl3, loaded.asl3Mirror)));

  const best = new Map();
  loaded.clips.forEach((c, j) => {
    let s = 0;
    for (const v of views) s += v[j];
    const cur = best.get(c.label);
    if (!cur || s > cur.score) best.set(c.label, { label: c.label, score: s, clip: c.file, source: c.source });
  });
  const ranked = [...best.values()].sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => { r.rank = i; });
  return ranked;
}

/** For tests: install a gallery without fetching one. */
export function setReference(ref) {
  loaded = ref;
}

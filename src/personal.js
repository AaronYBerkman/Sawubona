// Your own signing, as references: "learns your signing".
//
// The models have never seen you, and the dictionary's clips are other people
// signing. When the quiz says a try matched, or you say which sign a guess was,
// that try's embeddings are kept here, on this device only (localStorage),
// never the video. Ranking then counts them beside the dictionary's clips
// (reference.js rankSigns, `personal`).
//
// Where they are used matters. Measured through the page's own code, with NID
// signers as the learner and Real SASL clips as the dictionary (README,
// "Learns your signing"): in the quiz, your earlier try of the word asked
// raises right answers passed from 58% to 70% (a different word wrongly
// passes 3.1% -> 4.5%). In "What did I sign?", tries of every lesson word
// raise the top guess from 60% to 65%, but tries of the other words alone,
// when the word you signed has none, drop it to 52%: your tries resemble each
// other more than they resemble the dictionary. So the quiz uses only the
// asked word's tries, and guesses use them only once every lesson word has one.
//
// Each try is up to three 768-number unit vectors (one per model it had),
// kept as signed bytes: about 3 KB. Two per word, the latest kept.

const KEY = 'personal-signs';
const PER_WORD = 2;
const MAX_WORDS = 400;
const VIEWS = ['openhands', 'signclip', 'asl3'];

// Scaled by the vector's largest component, so the bytes use their whole range;
// the scale need not be kept, as a decoded vector is brought back to unit length.
function encode(vec) {
  let peak = 0;
  for (const x of vec) peak = Math.max(peak, Math.abs(x));
  const k = 127 / (peak || 1);
  const bytes = new Int8Array(vec.length);
  for (let i = 0; i < vec.length; i++) bytes[i] = Math.round(vec[i] * k);
  let s = '';
  const u = new Uint8Array(bytes.buffer);
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

function decode(text) {
  const bin = atob(text);
  const bytes = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = (bin.charCodeAt(i) << 24) >> 24;
  const out = new Float32Array(bytes.length);
  let n = 0;
  for (let i = 0; i < bytes.length; i++) { out[i] = bytes[i] / 127; n += out[i] * out[i]; }
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= n;
  return out;
}

export function createPersonal(storage = globalThis.localStorage) {
  let data = {};
  try { data = JSON.parse(storage?.getItem(KEY) ?? '{}') ?? {}; } catch { data = {}; }
  const cache = new Map();
  const save = () => {
    try { storage?.setItem(KEY, JSON.stringify(data)); } catch { /* full or private: kept for this visit */ }
  };
  return {
    /** Keep a try of `label`: { openhands, signclip, asl3? } unit vectors. */
    add(label, embedding) {
      if (!label || !embedding?.openhands || !embedding?.signclip) return;
      const entry = { t: Date.now() };
      for (const v of VIEWS) if (embedding[v]) entry[v] = encode(embedding[v]);
      data[label] = [...(data[label] ?? []), entry].slice(-PER_WORD);
      cache.delete(label);
      const words = Object.keys(data);
      if (words.length > MAX_WORDS) {
        const oldest = words.sort((a, b) => Math.max(...data[a].map((e) => e.t)) - Math.max(...data[b].map((e) => e.t)));
        for (const w of oldest.slice(0, words.length - MAX_WORDS)) { delete data[w]; cache.delete(w); }
      }
      save();
    },
    has(label) { return Boolean(data[label]?.length); },
    /** The tries of these words, decoded for rankSigns: [{ label, openhands, signclip, asl3? }]. */
    refs(labels) {
      return labels.flatMap((label) => {
        if (!data[label]) return [];
        if (!cache.has(label)) {
          cache.set(label, data[label].map((e) => Object.fromEntries([['label', label],
            ...VIEWS.filter((v) => e[v]).map((v) => [v, decode(e[v])])])));
        }
        return cache.get(label);
      });
    },
    get words() { return Object.keys(data).length; },
    clear() {
      data = {};
      cache.clear();
      try { storage?.removeItem(KEY); } catch { /* nothing kept */ }
    },
  };
}

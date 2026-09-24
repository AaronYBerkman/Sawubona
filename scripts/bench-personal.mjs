// "Learns your signing" and "How sure a guess is", measured through the page's
// own code (reference.js rankSigns, personal.js, confidence.js).
//
//   node scripts/bench-personal.mjs
//
// NID signers stand in for the learner and only Real SASL clips are the
// dictionary, so the right answer is always someone else signing. For words
// with two NID clips, one is the attempt and the other "your earlier try".
// 10-word lessons, fixed seed. The quiz passes as the page does: first in the
// lesson and in the top 100 of the whole dictionary.
import fs from 'node:fs';
import { setReference, rankSigns } from '../src/reference.js';
import { createPersonal } from '../src/personal.js';
import { confidence } from '../src/confidence.js';

const R = new URL('../data/', import.meta.url);
const idx = JSON.parse(fs.readFileSync(new URL('signs.json', R)));
const f32 = (f) => new Float32Array(fs.readFileSync(new URL(f, R)).buffer.slice(0));
const B = { openhands: f32('signs.bin'), signclip: f32('signclip.bin'), mirror: f32('signclip-mirror.bin'), asl3: f32('signclip-asl3.bin'), asl3Mirror: f32('signclip-asl3-mirror.bin') };
const E = idx.entries.map((e, i) => ({ i, label: e.label, file: e.file, nid: /\[nid\d+\]/i.test(e.file) }));
const rs = E.filter((e) => !e.nid);
const pick = (bank, rows, d) => { const out = new Float32Array(rows.length * d); rows.forEach((e, k) => out.set(bank.subarray(e.i * d, (e.i + 1) * d), k * d)); return out; };
setReference({
  clips: rs.map((e) => ({ label: e.label, file: e.file, source: 'realsasl' })), labels: [...new Set(rs.map((e) => e.label))], dimOpenHands: idx.dim,
  openhands: pick(B.openhands, rs, idx.dim), signclip: pick(B.signclip, rs, 768), mirror: pick(B.mirror, rs, 768), asl3: pick(B.asl3, rs, 768), asl3Mirror: pick(B.asl3Mirror, rs, 768),
});
const emb = (i) => {
  const signclip = B.signclip.subarray(i * 768, (i + 1) * 768);
  return { openhands: B.openhands.subarray(i * idx.dim, (i + 1) * idx.dim), signclip, asl3: B.asl3.subarray(i * 768, (i + 1) * 768) };
};
const by = {};
for (const e of E) (by[e.label] ??= { rs: [], nid: [] })[e.nid ? 'nid' : 'rs'].push(e.i);
const two = Object.keys(by).filter((l) => by[l].nid.length >= 2 && by[l].rs.length);
const one = Object.keys(by).filter((l) => by[l].nid.length >= 1 && by[l].rs.length);
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const lessonWith = (T) => { const l = new Set([T]); while (l.size < 10) l.add(one[Math.floor(rnd() * one.length)]); return l; };
const memory = () => { const m = new Map(); return createPersonal({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }); };
const query = (i) => { const e = emb(i); return { openhands: e.openhands, signclip: Object.assign(e.signclip.slice(), { asl3: e.asl3 }) }; };
const pc = (a, n) => `${((100 * a) / n).toFixed(1)}%`;

// --- the quiz: your earlier try of the word asked ---------------------------------
const q = { pass: [0, 0], wrong: [0, 0] };
for (const T of two) {
  const lesson = lessonWith(T);
  const me = memory();
  me.add(T, emb(by[T].nid[1]));
  const passes = (i, withMine) => {
    const x = query(i);
    const judged = withMine ? rankSigns(x, { personal: me.refs([T]) }) : rankSigns(x);
    return judged.filter((r) => lesson.has(r.label))[0]?.label === T && (judged.find((r) => r.label === T)?.rank ?? Infinity) < 100;
  };
  const other = [...lesson].filter((l) => l !== T)[Math.floor(rnd() * 9)];
  q.pass[0] += passes(by[T].nid[0], false); q.pass[1] += passes(by[T].nid[0], true);
  q.wrong[0] += passes(by[other].nid[0], false); q.wrong[1] += passes(by[other].nid[0], true);
}
console.log(`quiz, ${two.length} words asked: right answers pass ${pc(q.pass[0], two.length)} -> ${pc(q.pass[1], two.length)} with your earlier try;`
  + ` another word wrongly passes ${pc(q.wrong[0], two.length)} -> ${pc(q.wrong[1], two.length)}`);

// --- What did I sign?: tries of every lesson word, or of the others only ----------
seed = 7;
const g = { plain: 0, every: 0, others: 0 };
const bands = {};
for (const T of two) {
  const lesson = lessonWith(T);
  const [attempt, earlier] = by[T].nid;
  const every = memory();
  const others = memory();
  for (const l of lesson) {
    const i = l === T ? earlier : by[l].nid.find((j) => j !== attempt);
    if (i == null) continue;
    every.add(l, emb(i));
    if (l !== T) others.add(l, emb(i));
  }
  const x = query(attempt);
  const top = (ranked) => ranked.filter((r) => lesson.has(r.label));
  g.plain += top(rankSigns(x))[0].label === T;
  const withEvery = top(rankSigns(x, { personal: every.refs([...lesson]) }));
  g.every += withEvery[0].label === T;
  g.others += top(rankSigns(x, { personal: others.refs([...lesson]) }))[0].label === T;
  const band = confidence(withEvery, 3, true).band;
  (bands[band] ??= [0, 0])[0] += withEvery[0].label === T;
  bands[band][1] += 1;
}
console.log(`What did I sign?, ${two.length} attempts: top guess right ${pc(g.plain, two.length)};`
  + ` with your tries of every lesson word ${pc(g.every, two.length)}; with tries of the other words only ${pc(g.others, two.length)}`);
for (const [band, [ok, n]] of Object.entries(bands)) console.log(`  "${band}" with your tries: ${n} attempts, right ${pc(ok, n)}`);

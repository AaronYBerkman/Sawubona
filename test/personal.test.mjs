// Learns your signing (src/personal.js), ranking with your tries
// (reference.js rankSigns `personal`), and how sure a guess is (src/confidence.js).
import assert from 'node:assert/strict';
import { createPersonal } from '../src/personal.js';
import { setReference, rankSigns } from '../src/reference.js';
import { confidence } from '../src/confidence.js';
import { unit } from '../src/encoder.js';

const D = 768;
const rand = (seed) => { let a = seed; return () => ((a = (a * 1103515245 + 12345) % 2 ** 31) / 2 ** 31) - 0.5; };
const vec = (seed) => { const r = rand(seed); return unit(Float32Array.from({ length: D }, r)); };
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m }; };
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// --- storage: bytes on this device, near-lossless, two tries a word ---------------
const store = mem();
const me = createPersonal(store);
assert.equal(me.words, 0);
me.add('DOG', { openhands: vec(1), signclip: vec(2) });
assert.ok(me.has('DOG') && !me.has('CAT'));
const [kept] = me.refs(['DOG']);
assert.ok(cos(kept.openhands, vec(1)) > 0.999 && cos(kept.signclip, vec(2)) > 0.999, 'signed bytes keep the direction');
assert.equal(kept.asl3, undefined, 'a model that was not loaded is not stored');
me.add('DOG', { openhands: vec(3), signclip: vec(4) });
me.add('DOG', { openhands: vec(5), signclip: vec(6) });
assert.equal(me.refs(['DOG']).length, 2, 'the latest two tries of a word are kept');
assert.ok(cos(me.refs(['DOG'])[1].openhands, vec(5)) > 0.999);
assert.equal(createPersonal(store).refs(['DOG']).length, 2, 'kept across visits');
assert.ok(store.m.get('personal-signs').length < 2 * 2 * 1200, 'about 1 KB a model a try');
me.add('CAT', { openhands: vec(7) });                      // no SignCLIP: not a usable try
assert.ok(!me.has('CAT'));
me.clear();
assert.equal(me.words, 0);
assert.equal(createPersonal(store).words, 0, 'forgetting is kept too');
const broken = { getItem: () => { throw new Error('private'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
const offline = createPersonal(broken);
offline.add('DOG', { openhands: vec(1), signclip: vec(2) });
assert.ok(offline.has('DOG'), 'storage that fails keeps tries for this visit');

// --- ranking: your try counts on the dictionary's scale ----------------------------
const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
const clips = labels.map((l, i) => ({ label: l, file: `${l} [${i}].mp4`, source: 'realsasl' }));
const bank = (seed0) => { const out = new Float32Array(labels.length * D); labels.forEach((_, i) => out.set(vec(seed0 + i), i * D)); return out; };
setReference({ clips, labels, dimOpenHands: D, openhands: bank(100), signclip: bank(200), mirror: bank(300), asl3: null, asl3Mirror: null });
// an attempt a little like A's clip, and a lot like the learner's earlier try of C
const mix = (a, b, w) => unit(a.map((x, i) => x * (1 - w) + b[i] * w));
const mineC = { label: 'C', openhands: vec(900), signclip: vec(901) };
const attempt = { openhands: mix(vec(100), mineC.openhands, 0.7), signclip: mix(vec(200), mineC.signclip, 0.7) };
const plain = rankSigns(attempt);
assert.equal(plain[0].label, 'A', 'without your tries: the dictionary clip it is nearest');
assert.equal(plain.views, 2, 'the number of models the scores add up');
const withMine = rankSigns(attempt, { personal: [mineC] });
assert.equal(withMine[0].label, 'C', 'your own try of C wins when the attempt is like it');
assert.equal(withMine[0].source, 'you');
assert.equal(withMine.find((r) => r.label === 'A').score, plain.find((r) => r.label === 'A').score, 'other signs keep their scores');
assert.equal(rankSigns(attempt, { personal: [{ ...mineC, label: 'NOT A SIGN' }] })[0].label, 'A', 'a try of an unknown word is ignored');
const unlike = { label: 'F', openhands: vec(950), signclip: vec(951) };
assert.equal(rankSigns(attempt, { personal: [unlike] })[0].label, 'A', 'a try unlike the attempt changes nothing');

// --- how sure: bands from the gap, per three models --------------------------------
const pool = (gap, views = 3) => Object.assign([{ score: 10 }, { score: 10 - gap }], { views });
assert.equal(confidence(pool(3.5), 3, true).band, 'sure');
assert.equal(confidence(pool(2.5), 3, true).band, 'maybe');
assert.equal(confidence(pool(1), 3, true).band, 'unsure');
assert.equal(confidence(pool(2.4), 2, true).band, 'sure', 'two models: the gap is scaled to three');
assert.equal(confidence(pool(9), 3, false).band, 'maybe', 'across the whole dictionary it never says sure');
assert.equal(confidence(pool(1), 3, false).band, 'unsure');
assert.equal(confidence([{ score: 1 }], 3, true), null);

console.log('personal signing and confidence: ok');

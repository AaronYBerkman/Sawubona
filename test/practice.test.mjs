// "Sign it yourself" in Sentences: a signed attempt checked against its plan
// (src/sentence-practice.js). The cases a learner can run into by name, then
// properties on random sentences and rankings with fixed seeds.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  alignAttempt, describeAttempt, planNote, planKey, recordingMs, signText,
} from '../src/sentence-practice.js';
import { buildParagraph, glossKey, makeLexicon } from '../src/grammar.js';

let cases = 0;
const check = (name, fn) => {
  try { fn(); cases++; } catch (err) { err.message = `${name}: ${err.message}`; throw err; }
};

// A made-up dictionary of 400 words, and rankings over it.
const DICT = Array.from({ length: 400 }, (_, k) => `W${k}`);
const WORDS = ['ME', 'YOU', 'EAT', 'APPLE', 'YESTERDAY', 'HOME', 'GO', 'LIKE', 'VERY', 'TIRED', 'NAME', 'MY', 'HAVE', 'CHILDREN', 'BIG', 'HOUSE'];
/** A whole ranking: these labels first, in order, then the rest of the dictionary. */
const ranking = (...lead) => {
  const seen = new Set(lead);
  return [...lead, ...[...DICT, ...WORDS].filter((l) => !seen.has(l))].map((label, i) => ({ label, score: 10 - i / 50 }));
};
/** A ranking with `label` at dictionary rank `rank` (1 = first) and filler around it. */
const rankedAt = (label, rank, ...after) => ranking(...DICT.slice(0, rank - 1), label, ...after);
const junk = () => ranking();
const sign = (gloss, entry = gloss, kind = entry ? 'sign' : 'missing') => ({ gloss, entry, kind });
const statuses = (r) => r.signs.map((x) => x.status);

// --- named cases ---------------------------------------------------------------

check('empty recording', () => {
  const plan = [sign('ME'), sign('SHOP', null), sign('EAT')];
  const r = alignAttempt(plan, []);
  assert.deepEqual(statuses(r), ['missed', 'unchecked', 'missed']);
  assert.equal(r.pieces, 0);
  assert.equal(r.extra, 0);
  assert.equal(r.summary, '0 of 2 signs seen; SHOP has no clip, so was not checked. No separate signs were found in the recording.');
});

check('nothing to align at all', () => {
  assert.equal(alignAttempt([], []).summary, 'There were no signs to check.');
  assert.equal(alignAttempt([], [junk()]).signs.length, 0);
  for (const bad of [null, undefined, 'x', {}]) {
    const r = alignAttempt(bad, bad);
    assert.equal(r.signs.length, 0);
    assert.equal(r.pieces, 0);
  }
});

check('one segment, one sign', () => {
  const r = alignAttempt([sign('ME')], [ranking('ME')]);
  assert.deepEqual(statuses(r), ['seen']);
  assert.equal(r.summary, '1 of 1 sign seen.');
});

check('one segment for a three-sign sentence', () => {
  const r = alignAttempt([sign('ME'), sign('APPLE'), sign('EAT')], [ranking('APPLE')]);
  assert.deepEqual(statuses(r), ['missed', 'seen', 'missed']);
  assert.equal(r.signs[1].piece, 0);
  assert.equal(r.extra, 0);
});

check('a single-sign plan does not pass everything as close', () => {
  // with only one sign in the sentence it is always "first among the sentence";
  // that alone must not make a sign ranked 150th close
  const r = alignAttempt([sign('ME')], [rankedAt('ME', 150)]);
  assert.deepEqual(statuses(r), ['missed']);
  assert.deepEqual(statuses(alignAttempt([sign('ME')], [rankedAt('ME', 40)])), ['close']);
  assert.deepEqual(statuses(alignAttempt([sign('ME')], [rankedAt('ME', 20)])), ['seen']);
  assert.deepEqual(statuses(alignAttempt([sign('ME')], [rankedAt('ME', 21)])), ['close']);
  assert.deepEqual(statuses(alignAttempt([sign('ME')], [rankedAt('ME', 50)])), ['close']);
  assert.deepEqual(statuses(alignAttempt([sign('ME')], [rankedAt('ME', 51)])), ['missed']);
});

check('more segments than signs', () => {
  const r = alignAttempt([sign('ME'), sign('EAT')], [junk(), ranking('ME'), junk(), junk(), ranking('EAT'), junk()]);
  assert.deepEqual(statuses(r), ['seen', 'seen']);
  assert.deepEqual(r.signs.map((x) => x.piece), [1, 4]);
  assert.equal(r.extra, 4);
  assert.equal(r.summary, '2 of 2 signs seen. 4 movements in the recording were not matched to any sign.');
});

check('fewer segments than signs', () => {
  const r = alignAttempt([sign('ME'), sign('APPLE'), sign('LIKE'), sign('EAT')], [ranking('ME'), ranking('EAT')]);
  assert.deepEqual(statuses(r), ['seen', 'missed', 'missed', 'seen']);
  assert.equal(r.extra, 0);
  assert.equal(r.summary, '2 of 4 signs seen.');
});

check('a piece where a missed sign was is not extra', () => {
  const r = alignAttempt([sign('ME'), sign('APPLE'), sign('EAT')], [ranking('ME'), junk(), ranking('EAT')]);
  assert.deepEqual(statuses(r), ['seen', 'missed', 'seen']);
  assert.equal(r.extra, 0);
  // two pieces where one sign should be: one of them is extra
  assert.equal(alignAttempt([sign('ME'), sign('APPLE'), sign('EAT')], [ranking('ME'), junk(), junk(), ranking('EAT')]).extra, 1);
});

check('the same sign twice in a sentence (ME ... ME)', () => {
  const plan = [sign('ME'), sign('APPLE'), sign('LIKE'), sign('ME')];
  assert.deepEqual(statuses(alignAttempt(plan, [ranking('ME'), ranking('APPLE'), ranking('LIKE'), ranking('ME')])), ['seen', 'seen', 'seen', 'seen']);
  // the closing ME left off: the first ME keeps its piece, the second is missed
  const r = alignAttempt(plan, [ranking('ME'), ranking('APPLE'), ranking('LIKE')]);
  assert.deepEqual(statuses(r), ['seen', 'seen', 'seen', 'missed']);
  assert.equal(r.signs[3].why, null);       // not next to the other ME, so no "twice in a row" hint
  // the opening ME left off: the closing one is seen
  assert.deepEqual(statuses(alignAttempt(plan, [ranking('APPLE'), ranking('LIKE'), ranking('ME')])), ['missed', 'seen', 'seen', 'seen']);
  // one ME piece cannot count for both
  assert.equal(alignAttempt(plan, [ranking('ME')]).seen, 1);
});

check('the same sign twice in a row (VERY VERY)', () => {
  const plan = [sign('ME'), sign('TIRED'), sign('VERY'), sign('VERY')];
  assert.equal(alignAttempt(plan, [ranking('ME'), ranking('TIRED'), ranking('VERY'), ranking('VERY')]).seen, 4);
  // signed without a pause, the two are one piece: it counts once, and the learner is told why
  const r = alignAttempt(plan, [ranking('ME'), ranking('TIRED'), ranking('VERY')]);
  assert.equal(r.seen, 3);
  assert.equal(r.missed, 1);
  assert.equal(r.signs.filter((x) => x.why === 'repeat').length, 1);
  assert.equal(r.summary, '3 of 4 signs seen. VERY comes twice in a row: pause briefly between the two so each can be counted.');
});

// The real dictionary and sentence builder, for plans exactly as the page makes them.
const labels = JSON.parse(fs.readFileSync(new URL('../data/signs.json', import.meta.url))).entries.map((e) => e.label);
const lex = makeLexicon(labels);
const planOf = (s) => s.signs.map((x) => ({ gloss: x.gloss, entry: x.entry || null, kind: x.state, spell: x.spell ?? null }));
const built = (text) => planOf(buildParagraph(text, lex)[0]);
const realRanking = (...lead) => {
  const first = new Set(lead);
  return [...lead, ...labels.filter((l) => !first.has(l))].map((label, i) => ({ label, score: 5 - i / 400 }));
};
const junkReal = (seed) => {
  const r = rng(seed);
  return shuffle([...new Set(labels)], r).map((label, i) => ({ label, score: 5 - i / 400 }));
};

check('fingerspelled names are never missed, and their pieces are not extra', () => {
  const plan = built('Tomorrow Alex will go home.');
  const alex = plan.find((p) => p.kind === 'spell');
  assert.ok(alex, 'the builder spells ALEX');
  assert.equal(signText(alex), 'A-L-E-X');
  const pieces = plan.flatMap((p, i) => (p.kind === 'spell' ? [junkReal(i), junkReal(i + 10), junkReal(i + 20)] : p.entry ? [realRanking(p.entry)] : [junkReal(i + 30)]));
  const r = alignAttempt(plan, pieces, { labels });
  const at = plan.indexOf(alex);
  assert.equal(r.signs[at].status, 'unchecked');
  assert.equal(r.signs[at].why, 'spell');
  assert.equal(r.signs[at].note, 'fingerspelled, not checked');
  assert.ok(r.signs.every((x, i) => (plan[i].entry ? x.status === 'seen' : x.status === 'unchecked')));
  assert.equal(r.extra, 0);
  assert.match(r.summary, /A-L-E-X is fingerspelled/);
  assert.doesNotMatch(r.summary, /movement/);
  // nothing signed for the name at all: still not checked, not missed
  const bare = alignAttempt(plan, plan.filter((p) => p.entry).map((p) => realRanking(p.entry)), { labels });
  assert.equal(bare.signs[at].status, 'unchecked');
  // "My name is Thabo": the name is last, so its pieces come after every sign
  const thabo = built('My name is Thabo.');
  const t = alignAttempt(thabo, [...thabo.filter((p) => p.entry).map((p) => realRanking(p.entry)), junkReal(1), junkReal(2), junkReal(3), junkReal(4)], { labels });
  assert.equal(t.extra, 0);
  assert.equal(t.signs.at(-1).status, 'unchecked');
});

check('numbers are not checked, and never missed', () => {
  const plan = built('I have 3 children.');
  const three = plan.findIndex((p) => p.kind === 'number');
  assert.ok(three >= 0);
  const r = alignAttempt(plan, plan.map((p, i) => (p.entry ? realRanking(p.entry) : junkReal(i))), { labels });
  assert.equal(r.signs[three].status, 'unchecked');
  assert.equal(r.signs[three].why, 'number');
  assert.equal(r.extra, 0);
  assert.match(r.summary, /THREE is a number, so was not checked\.$/);
  // a plan from an older caller, with no kinds: a gloss that is a number still reads as one
  assert.equal(alignAttempt([{ gloss: '25', entry: null }], []).signs[0].why, 'number');
});

check('a plan entry with several dictionary variants accepts any of them', () => {
  const plan = [sign('APPLE', 'APPLE (1ST VARIANT)'), sign('EAT')];
  const r = alignAttempt(plan, [ranking('APPLE (2ND VARIANT)', 'APPLE (1ST VARIANT)', 'EAT'), ranking('EAT')]);
  assert.deepEqual(statuses(r), ['seen', 'seen']);
  assert.equal(r.signs[0].rank, 1);
  assert.equal(r.signs[0].other, null);       // never "looked more like" a variant of the same word
  // variants of one word take one place: EAT, behind both APPLEs, is second
  const v = alignAttempt([sign('EAT')], [ranking('APPLE (1ST VARIANT)', 'APPLE (2ND VARIANT)', 'EAT')]);
  assert.equal(v.signs[0].rank, 2);
  // the real builder picks the first label of a word; a learner signing the other variant is still seen
  const plan2 = built('Me, I like apples.');
  const apple = plan2.find((p) => p.gloss === 'APPLE');
  assert.equal(apple.entry, 'APPLE (1ST VARIANT)');
  const pieces = plan2.map((p) => realRanking(p.gloss === 'APPLE' ? 'APPLE (2ND VARIANT)' : p.entry));
  assert.equal(alignAttempt(plan2, pieces, { labels }).seen, plan2.filter((p) => p.entry).length);
});

check('signs only in the NID part of the dictionary', () => {
  // NID labels are checked like any other; spelt differently from Real SASL's, they are still the same word
  const withNid = [...labels, 'NIDONLY', 'Mother'];
  const plan = [sign('ME'), sign('NIDONLY'), sign('MOTHER', 'MOTHER')];
  const r = alignAttempt(plan, [realRanking('ME'), realRanking('NIDONLY'), realRanking('Mother')], { labels: withNid });
  assert.deepEqual(statuses(r), ['seen', 'seen', 'seen']);
  // an entry the dictionary does not have (a stale plan, a gallery rebuilt without it) is not checked, not missed
  const stale = alignAttempt([sign('ME'), sign('GONEAWAY')], [realRanking('ME'), junkReal(5)], { labels });
  assert.deepEqual(statuses(stale), ['seen', 'unchecked']);
  assert.equal(stale.signs[1].why, 'none');
});

check('the same signs in the wrong order are not all seen', () => {
  const plan = [sign('YESTERDAY'), sign('ME'), sign('APPLE'), sign('EAT')];
  const reversed = alignAttempt(plan, ['EAT', 'APPLE', 'ME', 'YESTERDAY'].map((w) => ranking(w)));
  assert.equal(reversed.seen, 1);
  const swapped = alignAttempt(plan, ['YESTERDAY', 'APPLE', 'ME', 'EAT'].map((w) => ranking(w)));
  assert.equal(swapped.seen, 3);
});

check('a sentence signed perfectly is all seen', () => {
  const plan = [sign('YESTERDAY'), sign('ME'), sign('APPLE'), sign('EAT')];
  // each piece ranks its own sign 20th, the sentence's other signs lower still
  const pieces = plan.map((p) => rankedAt(p.entry, 20, ...plan.filter((q) => q !== p).map((q) => q.entry)));
  assert.equal(alignAttempt(plan, pieces).seen, 4);
});

check('ties count against the sign', () => {
  const flat = (...lead) => ranking(...lead).map((x) => ({ ...x, score: 1 }));
  // a ranking that cannot tell any sign apart is evidence for none of them
  const r = alignAttempt([sign('ME'), sign('EAT')], [flat('ME'), flat('EAT')]);
  assert.equal(r.seen + r.close, 0);
  // tied with another of the sentence's signs at the top: close, not seen
  const tie = [{ label: 'ME', score: 3 }, { label: 'EAT', score: 3 }, ...junk().slice(2).map((x) => ({ ...x, score: 1 }))];
  const t = alignAttempt([sign('ME'), sign('EAT')], [tie]);
  assert.deepEqual([t.seen, t.close, t.missed], [0, 1, 1]);
  // tied with a word from outside the sentence: second in the dictionary, still first among the sentence's
  const outside = [{ label: 'W7', score: 3 }, { label: 'ME', score: 3 }, ...junk().map((x) => ({ ...x, score: 1 }))];
  const o = alignAttempt([sign('ME'), sign('EAT')], [outside]);
  assert.equal(o.signs[0].status, 'seen');
  assert.equal(o.signs[0].rank, 2);
  // the order ties were listed in does not decide the result
  const flipped = [outside[1], outside[0], ...outside.slice(2)];
  const f = alignAttempt([sign('ME'), sign('EAT')], [flipped]);
  assert.deepEqual(f.signs.map((x) => [x.status, x.rank]), o.signs.map((x) => [x.status, x.rank]));
});

check('scores that are not numbers', () => {
  const plan = [sign('ME'), sign('EAT')];
  // every score NaN: nothing can be read from the piece
  const nan = ranking('ME').map((x) => ({ ...x, score: NaN }));
  const r = alignAttempt(plan, [nan, ranking('EAT')]);
  assert.deepEqual(statuses(r), ['missed', 'seen']);
  assert.equal(r.signs[0].rank, null);
  // one NaN at the top is left out, not taken as the best
  const oneBad = [{ label: 'EAT', score: NaN }, ...ranking('ME')];
  const b = alignAttempt(plan, [oneBad]);
  assert.equal(b.signs[0].status, 'seen');
  assert.equal(b.signs[0].heard, 'ME');
  // NaN elsewhere leaves the order of the rest as it was, sorted or not
  const scrambled = ranking('ME', 'W1', 'EAT').reverse().map((x, i) => (i % 7 ? x : { ...x, score: NaN }));
  assert.equal(alignAttempt([sign('ME')], [scrambled]).signs[0].rank, 1);
  // no scores at all (labels only): the order given is the ranking
  const unscored = ranking('ME', 'EAT').map(({ label }) => ({ label }));
  assert.deepEqual(statuses(alignAttempt(plan, [unscored])), ['seen', 'missed']);
  // junk in a ranking, or no ranking for a piece
  const messy = [null, {}, { label: 5, score: 9 }, { label: '', score: 9 }, { label: 'ME', score: Infinity }, ...ranking('EAT')];
  const mr = alignAttempt(plan, [undefined, messy, 'nope']);
  assert.deepEqual(statuses(mr), ['missed', 'seen']);
  assert.equal(mr.pieces, 3);
  assert.ok(!/NaN|undefined|null/.test(mr.summary));
});

check('the summary says what was and was not checked', () => {
  const plan = [sign('ME'), sign('HOUSE'), sign('WHITE', null), sign('BIG'), sign('HAVE'), sign('EAT')];
  const pieces = [ranking('ME'), ranking('HOUSE'), junk(), rankedAt('BIG', 30), ranking('HAVE'), junk()];
  const r = alignAttempt(plan, pieces);
  assert.deepEqual(statuses(r), ['seen', 'seen', 'unchecked', 'close', 'seen', 'missed']);
  assert.equal(r.summary, '3 of 5 signs seen, 1 close; WHITE has no clip, so was not checked.');
  assert.equal(r.signs[3].other, 'W0');
  const two = alignAttempt([sign('ME'), { gloss: 'ALEX', entry: null, kind: 'spell', spell: 'ALEX' }, sign('GO', null), sign('HE', null, 'point')], [ranking('ME')]);
  assert.equal(two.summary, '1 of 1 sign seen; A-L-E-X is fingerspelled, HE is shown by pointing and GO has no clip: these 3 were not checked.');
  assert.equal(alignAttempt([{ gloss: 'ALEX', entry: null, kind: 'spell', spell: 'ALEX' }], [junk()]).summary,
    'Nothing here could be checked: A-L-E-X is fingerspelled.');
  const many = alignAttempt(['A', 'B', 'C', 'D', 'E'].map((g) => sign(g, null)).concat([sign('ME')]), [ranking('ME')]);
  assert.match(many.summary, /A, B, C and 2 more have no clip: these 5 were not checked/);
  // describeAttempt agrees with the summary it attached
  assert.equal(describeAttempt(r), r.summary);
});

check('the note before signing', () => {
  assert.equal(planNote([sign('ME'), sign('EAT')]), 'Every sign here has a clip, and each is checked.');
  assert.equal(planNote(built('Tomorrow Alex will go home.'), { labels }), 'A-L-E-X is fingerspelled, so is not checked.');
  assert.equal(planNote([sign('ME'), sign('X', null)]), 'X has no clip, so is not checked.');
  assert.equal(planNote([{ gloss: 'THABO', entry: null, kind: 'spell', spell: 'THABO' }]), 'Nothing here can be checked: T-H-A-B-O is fingerspelled.');
  assert.equal(planNote([sign('ME'), sign('GONEAWAY')], { labels }), 'GONEAWAY has no clip, so is not checked.');
});

check('a try belongs to one sentence', () => {
  const plan = built('Yesterday I went to the shop.');
  assert.equal(planKey(plan, 'Yesterday I went to the shop.'), planKey(built('Yesterday I went to the shop.'), 'Yesterday I went to the shop.'));
  assert.notEqual(planKey(plan, 'Yesterday I went to the shop.'), planKey(plan, 'Yesterday I went to the shops.'));
  assert.notEqual(planKey(plan, 'x'), planKey(plan.slice(1), 'x'));
  assert.notEqual(planKey([sign('ME')], 'x'), planKey([sign('ME', 'ME (2ND VARIANT)')], 'x'));
});

check('recording time grows with the sentence', () => {
  assert.equal(recordingMs([sign('ME'), sign('EAT')]), 15000);
  assert.equal(recordingMs([]), 15000);
  const long = Array.from({ length: 14 }, () => sign('ME'));
  assert.equal(recordingMs(long), 3000 + 14 * 1500);
  assert.equal(recordingMs([...long, { gloss: 'THABO', entry: null, kind: 'spell', spell: 'THABO' }]), 3000 + 14 * 1500 + 5 * 700);
  assert.equal(recordingMs(Array.from({ length: 100 }, () => sign('ME'))), 60000);
});

// --- properties on random sentences --------------------------------------------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(xs, r) {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const key = (label) => glossKey(label) || label;

function lcs(a, b) {
  const t = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
  }
  return t[a.length][b.length];
}

/** A random plan: some signs repeated, some with no clip, spelt or a number. */
function randomPlan(r, len) {
  const vocab = shuffle([...WORDS], r).slice(0, int(r, 1, WORDS.length));
  return Array.from({ length: len }, () => {
    const u = r();
    if (u < 0.1) return { gloss: 'NOCLIP', entry: null, kind: 'missing' };
    if (u < 0.16) return { gloss: 'ZANELE', entry: null, kind: 'spell', spell: 'ZANELE' };
    if (u < 0.2) return { gloss: String(int(r, 1, 99)), entry: null, kind: 'number' };
    const w = vocab[int(r, 0, vocab.length - 1)];
    return sign(w, r() < 0.2 ? `${w} (2ND VARIANT)` : w);
  });
}

/** A random ranking, with the odd NaN, tie, missing score or duplicate label. */
function randomRanking(r, plan) {
  const pool = [...WORDS, ...DICT.slice(0, 120)];
  for (const p of plan) if (p.entry && r() < 0.3) pool.push(`${key(p.entry)} (1ST VARIANT)`);
  const order = shuffle(pool, r);
  const style = r();
  let score = 10;
  return order.map((label) => {
    if (r() > 0.15) score -= r() * 0.2;         // otherwise a tie with the one before
    if (style < 0.1) return { label };         // no scores at all
    if (style < 0.2 && r() < 0.1) return { label, score: NaN };
    return { label, score };
  });
}

/** What a piece ranks its words, independently of the module: word -> [best score, tie-aware rank]. */
function reference(list) {
  const rows = (Array.isArray(list) ? list : []).filter((x) => x && typeof x.label === 'string' && x.label);
  const scored = rows.some((x) => typeof x.score === 'number');
  const kept = scored ? rows.filter((x) => Number.isFinite(x.score)) : rows.map((x, i) => ({ ...x, score: -i }));
  const best = new Map();
  for (const x of kept) if (!best.has(key(x.label)) || best.get(key(x.label)) < x.score) best.set(key(x.label), x.score);
  const scores = [...best.values()];
  const rank = (w) => (best.has(w) ? scores.filter((v) => v >= best.get(w)).length : Infinity);
  return { best, rank };
}

check('invariants on random attempts', () => {
  const r = rng(20260923);
  for (let t = 0; t < 1500; t++) {
    const plan = randomPlan(r, int(r, 0, 12));
    const pieces = Array.from({ length: int(r, 0, 14) }, () => randomRanking(r, plan));
    const a = alignAttempt(plan, pieces);
    assert.deepEqual(alignAttempt(plan, pieces), a, 'deterministic');
    assert.equal(a.signs.length, plan.length);
    assert.equal(a.pieces, pieces.length);
    assert.equal(a.seen + a.close + a.missed, a.checked);
    assert.equal(a.checked + a.unchecked, plan.length);
    let last = -1;
    const used = new Set();
    const own = new Set(plan.filter((p) => p.entry).map((p) => key(p.entry)));
    a.signs.forEach((x, i) => {
      assert.equal(x.gloss, plan[i].gloss);
      assert.ok(['seen', 'close', 'missed', 'unchecked'].includes(x.status));
      assert.equal(x.status === 'unchecked', !plan[i].entry, 'unchecked exactly when there is no clip');
      assert.ok(x.rank === null || (Number.isInteger(x.rank) && x.rank >= 1));
      if (x.piece >= 0) {
        assert.ok(x.piece > last && x.piece < pieces.length, 'pairing keeps the order, one piece per sign');
        assert.ok(!used.has(x.piece));
        used.add(x.piece);
        last = x.piece;
        const ref = reference(pieces[x.piece]);
        assert.equal(x.rank, Number.isFinite(ref.rank(key(plan[i].entry))) ? ref.rank(key(plan[i].entry)) : null);
      }
      if (x.status === 'seen') {
        assert.ok(x.rank <= 20);
        // strictly ahead of every other sign of the sentence on its piece
        const ref = reference(pieces[x.piece]);
        const mine = ref.best.get(key(plan[i].entry));
        for (const o of own) if (o !== key(plan[i].entry) && ref.best.has(o)) assert.ok(ref.best.get(o) < mine);
      }
      if (x.status === 'close') assert.ok(x.rank <= 50);
      if (x.status !== 'unchecked' && x.piece < 0) assert.equal(x.status, 'missed');
    });
    assert.ok(a.extra >= 0 && a.extra <= pieces.length - used.size);
    assert.equal(typeof a.summary, 'string');
    assert.ok(a.summary.length > 0 && !/NaN|undefined|null|Infinity/.test(a.summary), a.summary);
  }
});

// The pairing is the best there is: for small cases, try every order-keeping
// pairing. Best = most signs seen, then most close, then most evidence.
check('the pairing is the best of every order-keeping pairing', () => {
  const r = rng(7);
  const evidence = (rank) => (Number.isFinite(rank) ? Math.max(0, 1 - Math.log2(rank) / Math.log2(100)) : 0);
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const more = (a, b) => a[0] - b[0] || a[1] - b[1] || (Math.abs(a[2] - b[2]) < 1e-4 ? 0 : a[2] - b[2]);
  for (let t = 0; t < 400; t++) {
    const plan = randomPlan(r, int(r, 1, 5)).filter((p) => p.entry);
    const pieces = Array.from({ length: int(r, 1, 5) }, () => randomRanking(r, plan).slice(0, int(r, 5, 140)));
    const refs = pieces.map(reference);
    const own = [...new Set(plan.map((p) => key(p.entry)))];
    const leader = refs.map((ref) => {
      const s = own.filter((w) => ref.best.has(w)).sort((x, y) => ref.best.get(y) - ref.best.get(x));
      return s.length && (s.length === 1 || ref.best.get(s[0]) > ref.best.get(s[1])) ? s[0] : null;
    });
    const worth = (i, j) => {
      const rank = refs[j].rank(key(plan[i].entry));
      const first = leader[j] === key(plan[i].entry);
      const e = evidence(rank) + (first ? 0.25 : 0);
      const seen = first && rank <= 20 ? 1 : 0;
      return e > 0 ? [seen, !seen && rank <= 50 ? 1 : 0, e] : null;
    };
    const memo = new Map();
    const bestFrom = (i, j) => {
      if (i >= plan.length || j >= pieces.length) return [0, 0, 0];
      const id = i * 10 + j;
      if (memo.has(id)) return memo.get(id);
      let top = bestFrom(i + 1, j);
      const skip = bestFrom(i, j + 1);
      if (more(skip, top) > 0) top = skip;
      const w = worth(i, j);
      if (w) { const pair = add(w, bestFrom(i + 1, j + 1)); if (more(pair, top) > 0) top = pair; }
      memo.set(id, top);
      return top;
    };
    const a = alignAttempt(plan, pieces);
    const got = a.signs.reduce((sum, x, i) => (x.piece >= 0 ? add(sum, worth(i, x.piece)) : sum), [0, 0, 0]);
    assert.equal(more(got, bestFrom(0, 0)), 0, `${got} vs ${bestFrom(0, 0)}`);
    assert.equal(got[0], a.seen);
    assert.equal(got[1], a.close);
  }
});

check('a sentence signed in order is always all seen', () => {
  const r = rng(11);
  for (let t = 0; t < 800; t++) {
    const plan = randomPlan(r, int(r, 1, 14));
    const own = [...new Set(plan.filter((p) => p.entry).map((p) => key(p.entry)))];
    const pieces = [];
    for (const p of plan) {
      if (!p.entry) {            // a name spelt, a number, a sign with no clip: anything at all
        for (let k = int(r, 0, p.kind === 'spell' ? 3 : 1); k > 0; k--) pieces.push(randomRanking(r, []));
        continue;
      }
      // its own sign somewhere in the top 20 (under its own label or another variant),
      // every other sign of the sentence lower
      const mine = r() < 0.5 ? p.entry : `${key(p.entry)} (${r() < 0.5 ? '1ST' : '3RD'} VARIANT)`;
      const others = shuffle(own.filter((w) => w !== key(p.entry)), r);
      const rank = int(r, 1, 20);
      const filler = shuffle([...DICT], r);
      const list = [...filler.slice(0, rank - 1), mine, ...filler.slice(rank - 1, rank + 30)];
      for (const o of others) list.splice(int(r, rank, list.length), 0, o);
      pieces.push(list.map((label, i) => ({ label, score: 9 - i * 0.01 })));
      if (r() < 0.2) pieces.push(ranking(...shuffle([...DICT], r).slice(0, 200)).filter((x) => !own.includes(key(x.label))));   // a stray movement
    }
    const a = alignAttempt(plan, pieces);
    assert.equal(a.seen, a.checked, JSON.stringify(a.signs.map((x) => [x.gloss, x.status, x.rank])));
  }
});

check('the same signs in another order are never all seen', () => {
  const r = rng(99);
  let tried = 0;
  for (let t = 0; t < 1500; t++) {
    const words = shuffle([...WORDS], r).slice(0, int(r, 2, 9));
    const plan = words.map((w) => sign(w));
    // with repeats now and then, so that swapping two copies of one word is not a change
    if (r() < 0.3) plan.splice(int(r, 0, plan.length), 0, sign(words[0]));
    const order = shuffle(plan.map((p) => p.entry), r);
    const planned = plan.map((p) => p.entry);
    if (order.join() === planned.join()) continue;
    tried++;
    // each piece clearly the sign it is, at a random rank in the top 20
    const pieces = order.map((w) => rankedAt(w, int(r, 1, 20), ...planned.filter((x) => x !== w)));
    const a = alignAttempt(plan, pieces);
    assert.ok(a.seen < plan.length);
    assert.ok(a.seen <= lcs(planned, order), `${a.seen} seen, but only ${lcs(planned, order)} can be in order`);
  }
  assert.ok(tried > 1000);
});

check('signs that cannot be checked change nothing for those that can', () => {
  const r = rng(5);
  for (let t = 0; t < 600; t++) {
    const plan = randomPlan(r, int(r, 1, 10)).filter((p) => p.entry);
    const pieces = Array.from({ length: int(r, 0, 10) }, () => randomRanking(r, plan));
    const padded = [];
    for (const p of plan) {
      if (r() < 0.3) padded.push({ gloss: 'THABO', entry: null, kind: 'spell', spell: 'THABO' });
      padded.push(p);
    }
    const a = alignAttempt(plan, pieces);
    const b = alignAttempt(padded, pieces);
    const strip = (x) => ({ ...x, why: x.why === 'repeat' ? null : x.why });
    assert.deepEqual(b.signs.filter((x) => x.status !== 'unchecked').map(strip), a.signs.map(strip));
    assert.ok(b.extra <= a.extra);
  }
});

check('which variant a ranking names does not matter', () => {
  const r = rng(3);
  for (let t = 0; t < 400; t++) {
    const plan = randomPlan(r, int(r, 1, 8));
    const pieces = Array.from({ length: int(r, 1, 8) }, () => randomRanking(r, plan).filter((x) => !/VARIANT/.test(x.label)));
    const renamed = pieces.map((list) => list.map((x) => (WORDS.includes(x.label) && r() < 0.5 ? { ...x, label: `${x.label} (2ND VARIANT)` } : x)));
    const strip = (res) => res.signs.map(({ heard, other, ...x }) => x);
    assert.deepEqual(strip(alignAttempt(plan, renamed)), strip(alignAttempt(plan, pieces)));
  }
});

check('long paragraphs, sentence by sentence', () => {
  const paragraph = Array.from({ length: 12 }, () => 'Yesterday I went to the shop. I bought bread and milk. Tomorrow my friend Thabo will come to my house. '
    + 'Where do you live? I don\'t like fish. I have 3 children. Me, I like apples.').join(' ')
    + ' Yesterday my brother and my sister and my mother and my father and my friend Sipho went to the big shop in town and bought bread, milk, apples, fish, eggs and a big white car.';
  const sentences = buildParagraph(paragraph, lex);
  assert.ok(sentences.length > 80);
  const t0 = performance.now();
  for (const s of sentences) {
    const plan = planOf(s);
    const pieces = plan.flatMap((p, i) => (p.entry ? [realRanking(p.entry)] : [junkReal(i)]));
    const a = alignAttempt(plan, pieces, { labels });
    assert.equal(a.seen, a.checked, `${s.text}: ${a.summary}`);
    assert.ok(a.signs.every((x, i) => x.status !== 'missed' || plan[i].entry));
    assert.equal(a.extra, 0, s.text);
  }
  // a huge plan against a long recording stays quick
  const big = Array.from({ length: 300 }, (_, i) => sign(WORDS[i % WORDS.length]));
  const bigPieces = Array.from({ length: 400 }, (_, j) => ranking(WORDS[j % WORDS.length]).slice(0, 200));
  const t1 = performance.now();
  alignAttempt(big, bigPieces);
  assert.ok(performance.now() - t1 < 3000, 'a 300-sign plan against 400 pieces');
  assert.ok(t1 - t0 < 10000);
});

console.log(`sentence practice: ok (${cases} cases)`);

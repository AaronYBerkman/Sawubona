// Checking a signed sentence against the one the learner meant to sign.
//
// Open recognition of a whole sentence is hard (one sign in three is right
// against the full dictionary). Here the app knows what the sentence should
// be, so the question is easier and fairer: for each sign in the plan, did
// something in the recording look like it, in about the right place?
//
// The recording is split where the hands pause (src/segment.js), and every
// piece is ranked against the whole dictionary. alignAttempt then lines the
// planned signs up with the pieces, in order, allowing a piece to be an extra
// movement and a planned sign to be missing, and keeps the pairing with the
// most evidence. Each planned sign comes back as
//
//   seen      its piece ranks it in the dictionary's top 20, and above every
//             other sign of the sentence (a tie with one of them is not enough)
//   close     its piece ranks it in the dictionary's top 50
//   missed    nothing lined up with it, or what did ranks it lower than that
//   unchecked there is nothing to compare it with: a fingerspelled name, a
//             number, a point, or a sign the dictionary has no clip of.
//             Never counted as missed.
//
// Ranks are of words, not labels: the variants of one word ("APPLE (1ST
// VARIANT)", "APPLE (2ND VARIANT)") are the same word, whichever the plan
// names and whichever the learner signed, and count once, at the better of
// them. A tie counts against the sign, so a ranking that cannot tell signs
// apart (every score equal) is no evidence for any of them. Scores that are
// not numbers are left out; a ranking with no scores at all is taken in the
// order given.
//
// Because the pairing keeps the order, the same signs in the wrong order
// cannot all be seen, and a sentence signed in order, each piece ranking its
// own sign first among the sentence's signs and in the top 20, is always all
// seen (test/practice.test.mjs checks both on random sentences).
//
//   alignAttempt(plan, pieces, { labels })
//     plan:   [{ gloss, entry, kind, spell }]  entry = dictionary label or null;
//             kind = the builder's state ('sign', 'spell', 'number', 'point',
//             'missing'), used only to say why a sign is not checked
//     pieces: [[{ label, score }]]  one ranking per recorded piece, best first
//     labels: optional, every label the dictionary has; a plan entry not
//             among them is not checked rather than missed

import { glossKey } from './grammar.js';

const TOP = 20;
const NEAR = 50;
const OWN_BONUS = 0.25;   // the piece looks most like this sign of all the sentence's signs
// Between pairings with equal evidence (a sign said twice, a piece that fits two
// places), prefer the piece in about the same place in the recording as the
// sign is in the sentence. Far too small to outweigh any real evidence.
const NUDGE = 1e-6;

/** The word a label names: variants of one word share it. */
function wordOf(label) {
  const s = String(label);
  return glossKey(s) || s;
}

/** A plan entry as the learner reads it: fingerspelled names letter by letter. */
export function signText(p) {
  if (p?.kind === 'spell' && p.spell) return p.spell.split(' ').map((w) => w.split('').join('-')).join(' ');
  return String(p?.gloss ?? '');
}

/** Why a plan entry cannot be checked, or null when it can. */
function whyUnchecked(p, known) {
  if (p?.entry && (!known || known.has(wordOf(p.entry)))) return null;
  if (p?.kind === 'spell') return 'spell';
  if (p?.kind === 'number' || (!p?.kind && /^\d/.test(String(p?.gloss ?? '')))) return 'number';
  if (p?.kind === 'point') return 'point';
  return 'none';
}

const NOTE = {
  spell: 'fingerspelled, not checked',
  number: 'number, not checked',
  point: 'pointing, not checked',
  none: 'no clip, not checked',
};

// How many pieces of the recording a sign that is not paired may account for
// before the rest count as extra: a fingerspelled name is often several.
function roomFor(p) {
  if (p?.kind === 'spell') return Infinity;
  if (p?.kind === 'number') return Math.max(1, String(p.gloss ?? '').replace(/\D/g, '').length);
  return 1;
}

/** One piece's ranking as distinct words, best first, with tie-aware ranks. */
function readPiece(list) {
  const rows = (Array.isArray(list) ? list : []).filter((r) => r && typeof r.label === 'string' && r.label);
  const scored = rows.some((r) => typeof r.score === 'number');
  const kept = scored ? rows.filter((r) => Number.isFinite(r.score)).sort((a, b) => b.score - a.score) : rows;
  const words = [];
  const at = new Map();
  for (const r of kept) {
    const key = wordOf(r.label);
    if (at.has(key)) continue;       // a variant of a word already placed higher
    at.set(key, words.length);
    words.push({ key, label: r.label, score: scored ? r.score : -words.length });
  }
  // rank = how many words score at least as well, so a tie counts against it
  const rank = new Array(words.length);
  for (let i = words.length - 1; i >= 0; i--) {
    rank[i] = i + 1 < words.length && words[i + 1].score === words[i].score ? rank[i + 1] : i + 1;
  }
  return { words, at, rank };
}

function rankIn(piece, key) {
  const i = piece.at.get(key);
  return i === undefined ? Infinity : piece.rank[i];
}

/** Of the sentence's own words, the one this piece looks most like, if one is ahead of the rest. */
function ownBest(piece, own) {
  let first = null;
  for (const w of piece.words) {
    if (!own.has(w.key)) continue;
    if (!first) { first = w; continue; }
    return w.score === first.score ? null : first.key;
  }
  return first ? first.key : null;
}

function evidence(rank) {
  if (!Number.isFinite(rank)) return 0;
  return Math.max(0, 1 - Math.log2(rank) / Math.log2(NEAR * 2));
}

export function alignAttempt(plan, pieces, { labels = null } = {}) {
  const items = Array.isArray(plan) ? plan : [];
  const known = labels ? new Set([...labels].map(wordOf)) : null;
  const checkable = [];
  const signs = items.map((p, i) => {
    const why = whyUnchecked(p, known);
    if (!why) checkable.push({ i, key: wordOf(p.entry) });
    return {
      gloss: String(p?.gloss ?? ''), text: signText(p), status: why ? 'unchecked' : 'missed', why,
      note: why ? NOTE[why] : null, piece: -1, rank: null, heard: null, other: null,
    };
  });
  const read = (Array.isArray(pieces) ? pieces : []).map(readPiece);
  const own = new Set(checkable.map((c) => c.key));
  const best = read.map((piece) => ownBest(piece, own));
  const n = checkable.length;
  const m = read.length;

  // What pairing sign k with piece j is worth, or null when the piece has no
  // evidence for it: [seen, close, evidence].
  const worth = (k, j) => {
    const r = rankIn(read[j], checkable[k].key);
    const first = best[j] === checkable[k].key;
    const e = evidence(r) + (first ? OWN_BONUS : 0);
    if (!(e > 0)) return null;
    const seen = first && r <= TOP ? 1 : 0;
    return [seen, !seen && r <= NEAR ? 1 : 0, e - NUDGE * Math.abs((k + 0.5) / n - (j + 0.5) / m)];
  };

  // The order-keeping pairing that sees the most signs, then has the most close,
  // then the most evidence. Each "seen" stands on its own piece, so seeing as many
  // as the order allows claims nothing extra - and it keeps a stray movement (a
  // name being spelt) from taking a sign's piece on raw evidence alone.
  // cell (k, j) = the best using the first k signs and the first j pieces.
  const W = m + 1;
  const S = new Float64Array((n + 1) * W);
  const C = new Float64Array((n + 1) * W);
  const E = new Float64Array((n + 1) * W);
  const move = new Uint8Array((n + 1) * W);
  const beats = (s, c, e, at) => s > S[at] || (s === S[at] && (c > C[at] || (c === C[at] && e > E[at])));
  for (let k = 0; k <= n; k++) {
    for (let j = 0; j <= m; j++) {
      if (!k && !j) continue;
      const at = k * W + j;
      let how = 0;
      if (k && j) {
        const w = worth(k - 1, j - 1);
        if (w) {
          const p = at - W - 1;
          S[at] = S[p] + w[0]; C[at] = C[p] + w[1]; E[at] = E[p] + w[2]; how = 1;
        }
      }
      for (const [p, step] of [[at - W, 2], [at - 1, 3]]) {   // sign missing; extra movement
        if ((step === 2 ? !k : !j) || (how && !beats(S[p], C[p], E[p], at))) continue;
        S[at] = S[p]; C[at] = C[p]; E[at] = E[p]; how = step;
      }
      move[at] = how;
    }
  }
  const pairedWith = new Array(n).fill(-1);
  for (let k = n, j = m; k > 0 || j > 0;) {
    const how = move[k * W + j];
    if (how === 1) { pairedWith[k - 1] = j - 1; k--; j--; } else if (how === 2) k--; else j--;
  }

  checkable.forEach((c, k) => {
    const j = pairedWith[k];
    if (j < 0) return;                  // stays missed
    const out = signs[c.i];
    const r = rankIn(read[j], c.key);
    const lead = read[j].words[0];
    out.piece = j;
    out.rank = Number.isFinite(r) ? r : null;
    out.heard = lead?.label ?? null;
    out.other = lead && lead.key !== c.key ? lead.label : null;
    if (best[j] === c.key && r <= TOP) out.status = 'seen';
    else if (r <= NEAR) out.status = 'close';
  });

  // A sign said twice in a row needs a pause between, or the two are one piece.
  checkable.forEach((c) => {
    const out = signs[c.i];
    if (out.status !== 'missed') return;
    const twin = [c.i - 1, c.i + 1].some((i) => signs[i] && !signs[i].why && wordOf(items[i].entry) === c.key
      && (signs[i].status === 'seen' || signs[i].status === 'close'));
    if (twin) out.why = 'repeat';
  });

  // Pieces left between two paired signs are extra only beyond what the
  // unpaired signs between them (missed, or not checkable) could account for.
  const anchors = [{ at: -1, piece: -1 }];
  checkable.forEach((c, k) => { if (pairedWith[k] >= 0) anchors.push({ at: c.i, piece: pairedWith[k] }); });
  anchors.push({ at: items.length, piece: m });
  let extra = 0;
  for (let a = 1; a < anchors.length; a++) {
    const loose = anchors[a].piece - anchors[a - 1].piece - 1;
    let room = 0;
    for (let i = anchors[a - 1].at + 1; i < anchors[a].at; i++) room += roomFor(items[i]);
    extra += Math.max(0, loose - room);
  }

  const count = (st) => signs.filter((s) => s.status === st).length;
  const result = {
    signs,
    pieces: m,
    checked: n,
    seen: count('seen'),
    close: count('close'),
    missed: count('missed'),
    unchecked: count('unchecked'),
    extra,
  };
  result.summary = describeAttempt(result);
  return result;
}

// --- what the learner reads ----------------------------------------------------

function listOf(words, most = 4) {
  const w = words.length > most ? [...words.slice(0, most - 1), `${words.length - most + 1} more`] : words;
  return w.length < 2 ? w.join('') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
}

const pick = (n, one, many) => (n === 1 ? one : many);

/** Why the signs that are not checked are not, as clauses: ["A-L-E-X is fingerspelled", ...]. */
function reasons(skipped) {
  const by = (why) => skipped.filter((x) => x.why === why).map((x) => x.text);
  const out = [];
  const spell = by('spell');
  const number = by('number');
  const point = by('point');
  const none = by('none');
  if (spell.length) out.push(`${listOf(spell)} ${pick(spell.length, 'is', 'are')} fingerspelled`);
  if (number.length) out.push(`${listOf(number)} ${pick(number.length, 'is a number', 'are numbers')}`);
  if (point.length) out.push(`${listOf(point)} ${pick(point.length, 'is', 'are')} shown by pointing`);
  if (none.length) out.push(`${listOf(none)} ${pick(none.length, 'has', 'have')} no clip`);
  return out;
}

/** "3 of 5 signs seen, 1 close; WHITE has no clip, so was not checked." and so on. */
export function describeAttempt(result) {
  const signs = result?.signs ?? [];
  if (!signs.length) return 'There were no signs to check.';
  const skipped = signs.filter((x) => x.status === 'unchecked');
  const why = reasons(skipped);
  const checked = signs.length - skipped.length;
  if (!checked) return `Nothing here could be checked: ${listOf(why)}.`;
  const seen = signs.filter((x) => x.status === 'seen').length;
  const close = signs.filter((x) => x.status === 'close').length;
  let text = `${seen} of ${checked} ${pick(checked, 'sign', 'signs')} seen${close ? `, ${close} close` : ''}`;
  if (why.length) text += `; ${listOf(why)}${skipped.length === 1 ? ', so was not checked' : `: these ${skipped.length} were not checked`}`;
  text += '.';
  if (result.pieces === 0) text += ' No separate signs were found in the recording.';
  const extra = result.extra ?? 0;
  if (extra) text += ` ${extra} ${pick(extra, 'movement', 'movements')} in the recording ${pick(extra, 'was', 'were')} not matched to any sign.`;
  const twice = [...new Set(signs.filter((x) => x.why === 'repeat').map((x) => x.text))];
  if (twice.length) {
    text += ` ${listOf(twice)} ${pick(twice.length, 'comes', 'come')} twice in a row: pause briefly between the two so each can be counted.`;
  }
  return text;
}

/** Before signing: which signs will not be checked, and why. */
export function planNote(plan, { labels = null } = {}) {
  const known = labels ? new Set([...labels].map(wordOf)) : null;
  const skipped = (plan ?? []).map((p) => ({ text: signText(p), why: whyUnchecked(p, known) })).filter((x) => x.why);
  if (!skipped.length) return 'Every sign here has a clip, and each is checked.';
  if (skipped.length === (plan ?? []).length) return `Nothing here can be checked: ${listOf(reasons(skipped))}.`;
  return `${listOf(reasons(skipped))}${skipped.length === 1 ? ', so is not checked' : `: these ${skipped.length} are not checked`}.`;
}

/** What identifies a practised sentence, to tell whether a try still belongs to it. */
export function planKey(plan, text = '') {
  return `${text}\n${(plan ?? []).map((p) => `${p?.gloss ?? ''}=${p?.entry ?? ''}`).join('|')}`;
}

/** How long a recording of this sentence may run: longer sentences get longer. */
export function recordingMs(plan) {
  let ms = 3000;
  for (const p of plan ?? []) ms += p?.kind === 'spell' ? 700 * Math.max(1, String(p.spell ?? p.gloss ?? '').replace(/\s/g, '').length) : 1500;
  return Math.min(60000, Math.max(15000, ms));
}

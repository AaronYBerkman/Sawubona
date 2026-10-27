// How often the builder agrees with how SASL sources sign the same English:
// test/sources/sasl-reference.json (a native signer's phrase book, the DBE
// Grade 12 exam papers and memos, published studies, Real SASL's Deaf
// presenters). Sources are not all literal translations and signers differ,
// so this measures agreement rather than demanding it:
//
//   exact      the builder's signs are the source's (leaving out the
//              builder's optional ME and NOT, as signers often do)
//   order      of the signs both use, the share of pairs in the same order
//   modal last / question last / time first: where the source shows one,
//              does the builder put it there too?
//
// It fails if agreement drops below the floors at the end, so a change that
// makes the builder disagree with the sources more has to say why.
//
//   node test/grammar-agreement.mjs           the summary
//   node test/grammar-agreement.mjs --list    every sentence, worst first
//   node test/grammar-agreement.mjs sources/sasl-heldout-dbe.json
//                                             another set (no floors): the held-out exam
//                                             questions the builder was never tuned on
//   ... --split=dev-2022 | final-2023 | final-2018-2021   one part of that set
import fs from 'node:fs';
import { buildParagraph, glossLine, makeLexicon } from '../src/grammar.js';

const here = (p) => new URL(p, import.meta.url);
const lex = makeLexicon(JSON.parse(fs.readFileSync(here('../data/signs.json'))).entries.map((e) => e.label));
const file = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'sources/sasl-reference.json';
const only = process.argv.find((a) => a.startsWith('--split='))?.slice(8);
const items = JSON.parse(fs.readFileSync(here(file))).items.filter((x) => !only || x.split === only);
const tuned = file === 'sources/sasl-reference.json';
const list = process.argv.includes('--list');

// one name for each sign, whichever word a source glosses it with
const SAME = {
  I: 'ME', INDEX1: 'ME', ILL: 'SICK', SHUT: 'CLOSE', TV: 'TELEVISION', CELLPHONE: 'PHONE', HUNGER: 'HUNGRY',
  CANNOT: "CAN'T", DONE: 'FINISH', NOTHING: 'NOT', NO: 'NOT', "DON'T": 'NOT', NEVER: 'NOT',
  HE: 'IX', SHE: 'IX', IT: 'IX', HIM: 'IX', HER: 'IX', THEY: 'IX', THEM: 'IX', INDEX3: 'IX',
  STAY: 'LIVE', HEALTHY: 'FINE', BYE: 'GOODBYE', 'THANK-YOU': 'THANK',
};
const MARKERS = new Set(['X', 'SJOE', 'THIS', 'THAT', 'THAT-THAT']);   // discourse markers and pointing
const MODALS = new Set(['CAN', 'MUST', 'WILL', "CAN'T", 'SHOULD']);
const WH = new Set(['WHAT', 'WHERE', 'WHO', 'WHEN', 'WHY', 'HOW', 'WHICH', 'HOW-MANY', 'HOW-MUCH', 'HOW-OLD']);
const TIME = new Set(['YESTERDAY', 'TOMORROW', 'TODAY', 'NOW', 'MORNING', 'AFTERNOON', 'NIGHT', 'TONIGHT', 'PAST', 'FUTURE',
  'LAST', 'NEXT', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'TEN', 'TIME', 'AFTER', 'BEFORE']);

const norm = (w) => {
  let x = w.toUpperCase();
  if (/^[A-Z](-[A-Z])+$/.test(x)) return x.replace(/-/g, '');        // K-I-T-A: a fingerspelled name
  x = SAME[x] ?? x;
  if (/^[A-Z]{4,}S$/.test(x) && !/SS$/.test(x)) x = x.slice(0, -1);   // ANIMALS, PLATES
  return SAME[x] ?? x;
};
const words = (glosses) => glosses.flatMap((g) => g.split(/\s+/)).filter(Boolean).map(norm).filter((w) => !MARKERS.has(w));

function orderAgreement(a, b) {
  // first place of each shared word, then pairs that keep their order
  const pos = (arr) => { const m = new Map(); arr.forEach((w, i) => { if (!m.has(w)) m.set(w, i); }); return m; };
  const pa = pos(a), pb = pos(b);
  const shared = [...pa.keys()].filter((w) => pb.has(w));
  let same = 0, all = 0;
  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      all++;
      if (Math.sign(pa.get(shared[i]) - pa.get(shared[j])) === Math.sign(pb.get(shared[i]) - pb.get(shared[j]))) same++;
    }
  }
  return { same, all, shared: shared.length };
}

const rows = [];
const tally = { exact: 0, pairs: 0, same: 0, comparable: 0, modal: [0, 0], wh: [0, 0], time: [0, 0] };
for (const it of items) {
  // the app builds a paragraph sentence by sentence; an item of two sentences is read the same way
  const built = buildParagraph(it.en, lex);
  const s = { signs: built.flatMap((b) => b.signs) };
  const all = words(s.signs.map((x) => (x.spell ? glossLine({ signs: [x] }) : x.gloss)));
  const core = words(s.signs.filter((x) => !x.optional).map((x) => (x.spell ? glossLine({ signs: [x] }) : x.gloss)));
  const refs = it.refs.map((r) => words([r]));
  const exact = refs.some((r) => r.join(' ') === all.join(' ') || r.join(' ') === core.join(' '));
  // against the reference it agrees with most (two signers can differ)
  const best = refs.map((r) => ({ r, ...orderAgreement(all, r) })).sort((a, b) => (b.all ? b.same / b.all : -1) - (a.all ? a.same / a.all : -1))[0];
  if (exact) tally.exact++;
  if (best.all) { tally.comparable++; tally.pairs += best.all; tally.same += best.same; }
  const ref = best.r;
  const lastSign = (arr) => arr.filter((w) => !WH.has(w) && w !== 'NOT').at(-1);
  if (MODALS.has(lastSign(ref)) && all.includes(lastSign(ref))) { tally.modal[1]++; if (lastSign(all) === lastSign(ref)) tally.modal[0]++; }
  if (WH.has(ref.at(-1)) && all.includes(ref.at(-1))) { tally.wh[1]++; if (all.at(-1) === ref.at(-1)) tally.wh[0]++; }
  if (TIME.has(ref[0]) && all.includes(ref[0])) { tally.time[1]++; if (all[0] === ref[0]) tally.time[0]++; }
  rows.push({ en: it.en, got: glossLine(s), refs: it.refs, source: it.source, exact, score: best.all ? best.same / best.all : null, pairs: best.all });
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : 'n/a');
if (list) {
  for (const r of rows.sort((a, b) => (a.score ?? 2) - (b.score ?? 2))) {
    console.log(`${r.exact ? '=' : r.score === null ? ' ' : r.score === 1 ? '+' : r.score >= 0.5 ? '~' : '✗'} ${r.en}\n    builder ${r.got}\n    source  ${r.refs.join('  |  ')}   (${r.source})`);
  }
}
const order = tally.pairs ? tally.same / tally.pairs : 0;
const sentences = { right: 0, partly: 0, wrong: 0 };
for (const r of rows) if (r.score !== null) sentences[r.exact || r.score === 1 ? 'right' : r.score >= 0.5 ? 'partly' : 'wrong']++;
console.log(`grammar agreement${only ? ` (${only})` : ''} with ${items.length} sourced sentences: exact ${tally.exact} (${pct(tally.exact, items.length)}); `
  + `sign order ${pct(tally.same, tally.pairs)} of ${tally.pairs} pairs in ${tally.comparable} sentences; `
  + `modal last ${tally.modal[0]}/${tally.modal[1]}, question word last ${tally.wh[0]}/${tally.wh[1]}, time first ${tally.time[0]}/${tally.time[1]}; `
  + `sentences in order ${sentences.right}, partly ${sentences.partly}, wrong ${sentences.wrong}`);

// floors: raise them as the builder improves; lowering one needs a reason in the commit
// 2026-10-27, after modals, PLEASE and VERY moved last: main had exact 24, order 75%, modal 4/6
const FLOORS = { exact: 33, order: 0.84, modal: 6 };
if (tuned && (tally.exact < FLOORS.exact || order < FLOORS.order || tally.modal[0] < FLOORS.modal)) {
  console.log(`below the floor: ${JSON.stringify(FLOORS)}`);
  process.exitCode = 1;
}

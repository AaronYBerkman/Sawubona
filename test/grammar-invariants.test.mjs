// Rules that must hold for every sentence, not just the checked ones in
// test/corpus/. Each line of test/stress-sentences.txt is built and checked:
//
//   - the rules in src/grammar-check.js, which the app also runs on itself:
//     no English-only word signed, time first, question word last, who before the action
//   - every English word is either signed or dropped by a named rule
//   - a sign the dictionary lacks is still a real English base word (not MOVY)
//
//   node test/grammar-invariants.test.mjs           stop with a count
//   node test/grammar-invariants.test.mjs --list    print every failure
import fs from 'node:fs';
import { buildSentence, glossLine, makeLexicon } from '../src/grammar.js';
import * as W from '../src/grammar-words.js';
import { orderProblems } from '../src/grammar-check.js';

const here = (p) => new URL(p, import.meta.url);
const labels = JSON.parse(fs.readFileSync(here('../data/signs.json'))).entries.map((e) => e.label);
let nid = [];
try { nid = JSON.parse(fs.readFileSync(here('../data/nid/all-free.json'))).map((e) => e.label); } catch { /* no NID index */ }
const lex = makeLexicon(labels);
const known = makeLexicon([...labels, ...nid]);
const list = process.argv.includes('--list');

const sentences = fs.readFileSync(here('stress-sentences.txt'), 'utf8').split('\n')
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

const englishWord = (w) => {
  const x = w.toLowerCase();
  return W.VERBS.has(x) || W.ADJECTIVES.has(x) || W.COMMON.has(x) || W.PLACES.has(x) || W.TIME_NOUNS.has(x)
    || W.PLACE_NAMES.has(x) || x in W.NUMBERS || W.DAYS.includes(x) || W.MONTHS.includes(x) || !!known.find(w);
};

function check(text) {
  const s = buildSentence(text, lex);
  const bad = [];
  const signs = s.signs;
  bad.push(...orderProblems(s));
  for (const x of signs) {
    if (x.state === 'missing') {
      for (const w of x.gloss.split(/[ -]/)) if (w && !/^\d/.test(w) && !englishWord(w)) bad.push(`not a word: ${x.gloss}`);
    }
  }
  for (const w of s.words) if (!w.punct && w.drop === 'kept') bad.push(`"${w.text}" left unexplained`);
  return { s, bad };
}

let failed = 0;
const tally = {};
for (const text of sentences) {
  const { s, bad } = check(text);
  if (!bad.length) continue;
  failed++;
  for (const b of bad) { const k = b.replace(/".*?"|: .*/g, '').trim(); tally[k] = (tally[k] || 0) + 1; }
  if (list) console.log(`${text}\n   ${glossLine(s)}\n   ✗ ${bad.join('; ')}`);
}
console.log(`grammar invariants: ${sentences.length - failed} of ${sentences.length} sentences pass`);
if (failed) {
  console.log(Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${n} × ${k}`).join('\n'));
  process.exitCode = 1;
}
